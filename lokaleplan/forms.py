import logging
from django import forms
from django.db.models.sql.datastructures import EmptyResultSet

from lokaleplan.parse import parse_perl, make_objects
from lokaleplan.models import Event
from lokaleplan.fields import MinuteTimeField


logger = logging.getLogger('lokaleplan')


class PerlForm(forms.Form):
    TIME_SLICES = [
        (0, 'Formiddag (08:30-12:00)'),
        (1, 'Eftermiddag (12:00-17:00)'),
    ]

    data = forms.CharField(widget=forms.Textarea)
    time_slices = forms.ChoiceField(required=True, choices=TIME_SLICES)

    def clean_time_slices(self):
        i = int(self.cleaned_data['time_slices'])
        slices = [
            ('08.30--09.00', '09.00--09.30', '09.30--10.00', '10.00--10.30',
             '10.30--11.00', '11.00--11.30', '11.30--12.00'),
            ('12.00--12.30', '12.30--13.00', '13.00--13.30', '13.30--14.00',
             '14.00--14.30', '14.30--15.00', '15.00--15.30', '15.30--16.00',
             '16.00--17.00'),
        ]
        self.cleaned_data['time_slices'] = slices[i]
        return self.cleaned_data['time_slices']

    def clean(self):
        data = self.cleaned_data['data']
        time_slices = self.cleaned_data['time_slices']
        parser_output = parse_perl(data, time_slices)
        objects = make_objects(parser_output)
        return {
            'data': data,
            'time_slices': time_slices,
            'objects': objects,
        }

    def save(self):
        objects = self.cleaned_data['objects']
        (events, locations, participants,
         event_locations, event_participants) = objects
        # We need the ids of the events, locations and participants we create
        # so we can set up the proper many-to-many relations,
        # so we cannot use bulk_create.
        for event in events:
            event.save()
        for location in locations:
            location.save()
        for participant in participants:
            participant.save()
        for event_location in event_locations:
            # Update event_id, location_id
            event_location.event = event_location.event
            event_location.location = event_location.location
        Event.locations.through.objects.bulk_create(event_locations)
        for event_participant in event_participants:
            # Update event_id, participant_id
            event_participant.event = event_participant.event
            event_participant.participant = event_participant.participant
        Event.participants.through.objects.bulk_create(event_participants)


class EventForm(forms.Form):
    def __init__(self, **kwargs):
        self.events = kwargs.pop('events')
        self.locations = kwargs.pop('locations')
        self.participants = kwargs.pop('participants')
        super(EventForm, self).__init__(**kwargs)

        participant_events = {}
        for e in self.events:
            for p in e.participants.all():
                participant_events[p.pk] = e
        initial_participants = sorted(participant_events.keys())
        participant_choices = [(p.pk, p.name) for p in self.participants]
        self.fields['participants'] = forms.TypedMultipleChoiceField(
            coerce=int, label='Hold', choices=participant_choices,
            initial=initial_participants, required=False)

        location_choices = [(l.pk, l.name) for l in self.locations]
        for p in self.participants:
            if p.pk in participant_events:
                event = participant_events[p.pk]
                event_locations = [l.pk for l in event.locations.all()]
            elif self.events:
                event = self.events[0]
                event_locations = []
            else:
                event = Event()
                event_locations = []
            prefix = 'p%s-' % p.pk
            self.fields[prefix + 'name'] = forms.CharField(
                required=False, label='Navn', initial=event.name)
            self.fields[prefix + 'day'] = forms.TypedChoiceField(
                choices=Event.DAYS, coerce=int, label='Dag', initial=event.day)
            self.fields[prefix + 'start_time'] = MinuteTimeField(
                label='Start', initial=event.start_time)
            self.fields[prefix + 'end_time'] = MinuteTimeField(
                label='Slut', initial=event.end_time)
            self.fields[prefix + 'manual_time'] = forms.CharField(
                required=False, label='Særligt tidsinterval',
                initial=event.manual_time)
            self.fields[prefix + 'locations'] = forms.TypedMultipleChoiceField(
                coerce=int, choices=location_choices, label=str(p),
                required=False, initial=event_locations)

    def clean(self):
        data = self.cleaned_data
        if self.errors:
            return
        qs = Event.objects.none()
        chosen_participants = [p for p in self.participants
                               if p.pk in data['participants']]
        for p in chosen_participants:
            prefix = 'p%s-' % p.pk
            qs = qs | Event.objects.filter(
                participants__pk=p.pk,
                name=data[prefix + 'name'], day=data[prefix + 'day'],
                start_time=data[prefix + 'start_time'],
                end_time=data[prefix + 'end_time'],
                manual_time=data[prefix + 'manual_time'])
        my_ids = [e.pk for e in self.events]
        qs = qs.exclude(pk__in=my_ids)
        if qs.exists():
            # Saving this form would create two parallel Events with the same
            # participant.
            self.add_error(None,
                           "Programpunktets navn er allerede i brug " +
                           "på det valgte tidspunkt.")

    def save(self):
        data = self.cleaned_data
        simple_fields = 'name day start_time end_time manual_time'.split()
        # old_event maps event pk to event
        old_events = {event.pk: event for event in self.events}
        # new_events maps (name, day, start_time, end_time, manual_time, loc)
        # to event
        new_events = {}

        participants = {}
        for event in self.events:
            for participant in event.participants.all():
                if participant.pk in participants:
                    # Participant in multiple events -- this is bad.
                    event.participants.remove(participant)
                else:
                    participants[participant.pk] = event

        # QuerySet of Event-Location edges to remove
        remove_locs_qs = Event.locations.through.objects.none()
        # List of Event-Location edges to add (bulk create)
        add_loc_objects = []
        # List of Events to create
        add_events = []
        # List of Events to save
        update_events = []
        # QuerySet of Event-Participant edges to remove
        remove_parts_qs = Event.participants.through.objects.none()
        # List of Event-Participant edges to add (bulk create)
        add_part_objects = []

        old_participants = frozenset(participants.keys())
        new_participants = frozenset(data['participants'])

        # First, we disassociate any participants that are no longer part of
        # the event.
        if old_participants - new_participants:
            logger.debug("Remove old participants: %s",
                         sorted(old_participants - new_participants))
            qs = Event.participants.through.objects.filter(
                event_id__in=old_events.keys(),
                participant_id__in=old_participants - new_participants)
            remove_parts_qs = remove_parts_qs | qs

        # Then, we update events for the participants that were already part of
        # the event.
        for participant_id in old_participants & new_participants:
            prefix = 'p%s-' % participant_id
            new_locs = frozenset(data[prefix + 'locations'])
            new_key = tuple(data[prefix + k]
                            for k in simple_fields) + (new_locs,)
            event = participants.pop(participant_id)
            cur_locs = frozenset(loc.pk for loc in event.locations.all())
            cur_key = tuple(getattr(event, k)
                            for k in simple_fields) + (cur_locs,)
            if new_key in new_events:
                # Someone was nice enough to create exactly the event we
                # want to be in.
                new_event = new_events[new_key]
                if new_event != event:
                    # Remove us from the old event.
                    qs = Event.participants.through.objects.filter(
                        event_id=event.pk, participant_id=participant_id)
                    remove_parts_qs = remove_parts_qs | qs
                    # Add us to the new one.
                    add_part_objects.append(
                        Event.participants.through(
                            event=new_event,
                            participant_id=participant_id))
            elif event.pk in old_events:
                # This event has not been used yet;
                # use it for this participant
                old_events.pop(event.pk)
                if new_key != cur_key:
                    for k in simple_fields:
                        setattr(event, k, data[prefix + k])
                    update_events.append(event)

                remove_locs = cur_locs - new_locs
                add_locs = new_locs - cur_locs
                if remove_locs:
                    qs = Event.locations.through.objects.filter(
                        event_id=event.pk, location_id__in=remove_locs)
                    remove_locs_qs = remove_locs_qs | qs
                add_loc_objects.extend(
                    Event.locations.through(
                        event=event, location_id=l)
                    for l in add_locs)
                new_events[new_key] = event
            else:
                # The event containing this participant was used by another
                # participant. Create a new event.
                new_event = Event()
                for k in simple_fields:
                    setattr(new_event, k, data[prefix + k])
                add_events.append(new_event)
                add_loc_objects.extend(
                    Event.locations.through(
                        event=new_event, location_id=l)
                    for l in new_locs)
                new_events[new_key] = new_event

                # Remove us from the old event.
                qs = Event.participants.through.objects.filter(
                    event_id=event.pk, participant_id=participant_id)
                remove_parts_qs = remove_parts_qs | qs
                # Add us to the new one.
                add_part_objects.append(
                    Event.participants.through(
                        event=new_event,
                        participant_id=participant_id))

        # Finally, we add new participants to the event.
        if new_participants - old_participants:
            logger.debug("Add new participants: %s",
                         sorted(new_participants - old_participants))
        for participant_id in new_participants - old_participants:
            prefix = 'p%s-' % participant_id
            new_locs = frozenset(data[prefix + 'locations'])
            new_key = tuple(data[prefix + k]
                            for k in simple_fields) + (new_locs,)
            if new_key in new_events:
                # Someone was nice enough to create exactly the event we
                # want to be in.
                new_event = new_events[new_key]
                # Add us to the new one.
                add_part_objects.append(
                    Event.participants.through(
                        event=new_event,
                        participant_id=participant_id))
            else:
                # Create a new event.
                new_event = Event()
                for k in simple_fields:
                    setattr(new_event, k, data[prefix + k])
                add_events.append(new_event)
                add_loc_objects.extend(
                    Event.locations.through(
                        event=new_event, location_id=l)
                    for l in new_locs)
                new_events[new_key] = new_event
                # Add us to the new event.
                add_part_objects.append(
                    Event.participants.through(
                        event=new_event,
                        participant_id=participant_id))

        try:
            str(remove_locs_qs.query)
        except EmptyResultSet:
            pass
        else:
            logger.debug("Remove Event-Location edges: %s",
                         remove_locs_qs.query)
            remove_locs_qs.delete()
        try:
            str(remove_parts_qs.query)
        except EmptyResultSet:
            pass
        else:
            logger.debug("Remove Event-Participant edges: %s",
                         remove_parts_qs.query)
            remove_parts_qs.delete()

        if add_events:
            for event in add_events:
                event.save()
            logger.debug("Added events: %s",
                         [(e.pk, e.name) for e in add_events])

        if update_events:
            for event in update_events:
                event.save()
            logger.debug("Updated events: %s",
                         [(e.pk, e.name) for e in update_events])

        for edge in add_loc_objects + add_part_objects:
            edge.event = edge.event  # Update edge.event_id

        if add_loc_objects:
            logger.debug("Add Event-Location edges: %s",
                         [(e.event_id, e.location_id)
                          for e in add_loc_objects])
            Event.locations.through.objects.bulk_create(add_loc_objects)

        if add_part_objects:
            logger.debug("Add Event-Participant edges: %s",
                         [(e.event_id, e.participant_id)
                          for e in add_part_objects])
            Event.participants.through.objects.bulk_create(add_part_objects)

        if old_events:
            n, o = Event.objects.filter(id__in=old_events.keys()).delete()
            logger.debug("Deleted %s objects: %s %s", n, old_events, o)

    def participant_fields(self):
        fields = 'name day start_time end_time manual_time locations'.split()
        for p in self.participants:
            prefix = 'p%s-' % p.pk
            yield dict([('participant', p)] +
                       [(key, self[prefix + key]) for key in fields])
