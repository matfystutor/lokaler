from django import forms

from lokaleplan.parse import parse_perl, make_objects
from lokaleplan.models import Event


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
    name = forms.CharField()
    day = forms.ChoiceField(choices=Event.DAYS)
    start_time = forms.TimeField()
    end_time = forms.TimeField()
    manual_time = forms.CharField(required=False)

    participants = forms.TypedMultipleChoiceField(coerce=int)

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
                coerce=int, choices=location_choices, label=str(p))

    def save(self):
        data = self.cleaned_data
        pks = [event.pk for event in self.events]
        qs = Event.objects.filter(pk__in=pks)
        qs.update(name=data['name'], day=data['day'],
                  start_time=data['start_time'], end_time=data['end_time'],
                  manual_time=data['manual_time'])
