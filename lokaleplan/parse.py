from django.core.exceptions import ValidationError
from django.utils.dateparse import parse_time

from lokaleplan.models import Participant, Event, Location


def parse_perl(data, time_slices):
    times = []
    for s in time_slices:
        a, b = s.split('--')
        if times:
            if times[-1] != a:
                raise ValidationError("Invalid time slices: %r != %r" %
                                      (times[-1], a))
        else:
            times.append(a)
        times.append(b)
    times = [parse_time(t.replace('.', ':')) for t in times]

    participants = set()
    participant = None
    locations = set()
    comment = 0
    comments = {}
    days = []
    day = None
    event_parts = {}  # (participant, day) -> list of (location, name)
    for line in data.splitlines():
        line = line.strip()
        if line.startswith('#'):
            continue
        elif line.startswith('HOLD ='):
            if not comment and day is None:
                raise ValidationError(
                    "HOLD but not COMMENT or DAY")
            participant = line.split()[2]
            participants.add(participant)
        elif line == 'COMMENT':
            comment = 1
        elif line == '/COMMENT':
            comment = 0
        elif comment:
            if comment == 2 or '/%/' in line:
                comments.setdefault(participant, []).append(
                    line.replace('/%/', ''))
            if '/%/' in line:
                comment = 1 if comment == 2 else 2
        elif line.startswith('LISTSEPARATOR'):
            raise NotImplementedError('LISTSEPARATOR')
        elif line.startswith('DAG ='):
            day = line.split()[2]
            days.append(day)
        elif line == '/DAG':
            day = None
        elif line and day is not None:
            location, name = line.split(',', 1)
            location = location.strip()
            name = name.strip()
            key = (participant, day)
            event_parts.setdefault(key, []).append((location, name))
            if location:
                locations.add(location)

    comments = {k: '\n'.join(lines) for k, lines in comments.items()}

    # (day, name, location, start_time, end_time) -> list of participants
    events = {}

    for (participant, day), x in event_parts.items():
        i = 0
        while i < len(x):
            location, name = x[i]
            j = i
            # I love half-open intervals
            while j < len(x) and x[i] == x[j]:
                j += 1
            assert 0 <= i < j <= len(x)
            assert all(x[i] == x[k] for k in range(i, j))
            if name or location:
                key = (day, name, location, times[i], times[j])
                events.setdefault(key, []).append(participant)
            i = j

    return participants, comments, locations, events


def make_objects(parser_output):
    participants, messages, locations, events = parser_output

    participant_objects = {}
    for participant in Participant.objects.all():
        participant_objects[participant.name] = participant

    for key in participants:
        if key.startswith('__'):
            continue
        m = messages.get(key, '')
        if external:
            p = participant_objects.setdefault(
                key, Participant(name=key))
            if m:
                p.message = m

    location_objects = {}
    for location in Location.objects.all():
        location_objects[location.name] = location

    for name in locations:
        location_objects.setdefault(name, Location(
            name=name, official_name=name,
            capacity='', kind=Location.CLASSROOM))

    event_objects = []
    event_locations = []
    event_participants = []
    for (day, name, location, start_time, end_time), p_list in events.items():
        day = next(number for number, day_name in Event.DAYS
                   if day_name == day.lower())
        o = Event(name=name, day=day,
                  start_time=start_time, end_time=end_time)
        event_objects.append(o)
        if location:
            event_locations.append(Event.locations.through(
                event=o, location=location_objects[location]))
        for participant in p_list:
            if participant.startswith('__'):
                o.name = participant[2:]
                o.external = True
            else:
                event_participants.append(Event.participants.through(
                    event=o, participant=participant_objects[participant]))

    return (event_objects,
            list(location_objects.values()),
            list(participant_objects.values()),
            event_locations, event_participants)
