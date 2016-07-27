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
    name = forms.CharField(label='Navn')
    day = forms.TypedChoiceField(choices=Event.DAYS, coerce=int, label='Dag')
    start_time = MinuteTimeField(label='Start')
    end_time = MinuteTimeField(label='Slut')
    manual_time = forms.CharField(required=False, label='Vist tid')

    participants = forms.TypedMultipleChoiceField(coerce=int, label='Hold')

    def __init__(self, **kwargs):
        self.events = kwargs.pop('events')
        self.locations = kwargs.pop('locations')
        self.participants = kwargs.pop('participants')

        event = self.events[0]
        initial_participants = []
        initial_locations = {}
        for e in self.events:
            event_locations = [l.pk for l in e.locations.all()]
            for p in e.participants.all():
                k = 'locations_%s' % p.pk
                initial_participants.append(p.pk)
                initial_locations[k] = event_locations

        initial = dict(
            name=event.name, day=event.day, start_time=event.start_time,
            end_time=event.end_time, manual_time=event.manual_time,
            participants=initial_participants, **initial_locations)
        initial.update(kwargs.get('initial', {}))
        kwargs['initial'] = initial

        super(EventForm, self).__init__(**kwargs)

        participant_choices = [(p.pk, p.name) for p in self.participants]
        self.fields['participants'].choices = participant_choices

        location_choices = [(l.pk, l.name) for l in self.locations]
        for p in self.participants:
            k = 'locations_%s' % p.pk
            self.fields[k] = forms.TypedMultipleChoiceField(
                coerce=int, choices=location_choices, label=str(p),
                required=False)

    def save(self):
        data = self.cleaned_data
        simple_fields = {k: data[k] for k in
                         'name day start_time end_time manual_time'.split()}
        old_events = {event.pk: event for event in self.events}
        events_by_location_set = {}
        # Invariant: each event in self.events is in either old_events or
        # events_by_location_set

        participants = {}
        for event in self.events:
            for participant in event.participants.all():
                if participant.pk in participants:
                    event.participants.remove(participant)
                else:
                    participants[participant.pk] = event

        # QuerySet of Event-Location edges to remove
        remove_locs_qs = Event.locations.through.objects.none()
        # List of Event-Location edges to add (bulk create)
        add_loc_objects = []
        # List of Events to bulk create
        add_events = []
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
            k = 'locations_%s' % participant_id
            new_locs = frozenset(data[k])
            event = participants.pop(participant_id)
            current_locs = frozenset(
                loc.pk for loc in event.locations.all())
            if new_locs in events_by_location_set:
                # Someone was nice enough to create exactly the event we
                # want to be in.
                new_event = events_by_location_set[new_locs]
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

                remove_locs = current_locs - new_locs
                add_locs = new_locs - current_locs
                if remove_locs:
                    qs = Event.locations.through.objects.filter(
                        event_id=event.pk, location_id__in=remove_locs)
                    remove_locs_qs = remove_locs_qs | qs
                add_loc_objects.extend(
                    Event.locations.through(
                        event=event, location_id=l)
                    for l in add_locs)
                events_by_location_set[new_locs] = event
            else:
                # The event containing this participant was used by another
                # participant. Create a new event.
                new_event = Event(**simple_fields)
                add_events.append(new_event)
                add_loc_objects.extend(
                    Event.locations.through(
                        event=new_event, location_id=l)
                    for l in new_locs)
                events_by_location_set[new_locs] = new_event

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
            k = 'locations_%s' % participant_id
            new_locs = frozenset(data[k])
            if new_locs in events_by_location_set:
                # Someone was nice enough to create exactly the event we
                # want to be in.
                new_event = events_by_location_set[new_locs]
                # Add us to the new one.
                add_part_objects.append(
                    Event.participants.through(
                        event=new_event,
                        participant_id=participant_id))
            else:
                # Create a new event.
                new_event = Event(**simple_fields)
                add_events.append(new_event)
                add_loc_objects.extend(
                    Event.locations.through(
                        event=new_event, location_id=l)
                    for l in new_locs)
                events_by_location_set[new_locs] = new_event
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

        update_event_ids = [
            e.pk for e in events_by_location_set.values()
            if any(getattr(e, k) != v for k, v in simple_fields.items())]
        if update_event_ids:
            update_event_qs = Event.objects.filter(pk__in=update_event_ids)
            update_count = update_event_qs.update(**simple_fields)
            logger.debug("Updated %s Events", update_count)

    def participant_locations(self):
        return [self['locations_%s' % p.pk] for p in self.participants]
