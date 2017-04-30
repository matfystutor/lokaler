import io
import re
import csv
import datetime
import collections
from lokaleplan.models import Event
from django.core.exceptions import ValidationError


DAY_NAMES = dict(Event.DAYS)
PARSE_DAY = {v.lower(): k for k, v in Event.DAYS}


FlatEvent = collections.namedtuple(
    'FlatEvent',
    'day start_time name end_time manual_time participants locations')


def flatten_list(xs):
    xs = sorted(xs)
    for x in xs:
        if ',' in x:
            raise ValidationError('%r må ikke indeholde komma' % x)
        if x != x.strip():
            raise ValidationError('%r har overflødige mellemrum' % x)
    return ','.join(xs)


def clean_list(s, errors):
    return ','.join(sorted(x.strip() for x in s.split(',')))


def flatten_time(t: datetime.time):
    if t.second:
        return t.strftime('%H:%M:%S')
    else:
        return t.strftime('%H:%M')


def clean_time(s, errors):
    mo = re.match(r'^(\d+):(\d+)(?::(\d+))?( [AP]M)?$', s)
    if not mo:
        errors.append('Ugyldigt tidspunkt %r' % (s,))
    else:
        h, m = map(int, mo.group(1, 2))
        s = int(mo.group(3) or '0')
        am_pm = mo.group(4)
        if am_pm:
            if h > 12:
                errors.append('Ugyldigt tidspunkt %r' % (s,))
                return
            am_pm = am_pm.strip().upper()
            if am_pm == 'AM':
                h = h % 12
            elif am_pm == 'PM':
                h = 12 + (h % 12)
            else:
                errors.append('Ugyldigt tidspunkt %r' % (s,))
                return
        if h >= 24 or max(m, s) >= 60:
            errors.append('Ugyldigt tidspunkt %r' % (s,))
        elif s:
            return '%02d:%02d:%02d' % (h, m, s)
        else:
            return '%02d:%02d' % (h, m)


def flatten_event(event: Event):
    return FlatEvent(
        name=event.name,
        day=event.get_day_display(),
        start_time=flatten_time(event.start_time),
        end_time=flatten_time(event.end_time),
        manual_time=event.manual_time,
        participants=flatten_list(map(str, event.participants.all())),
        locations=flatten_list(map(str, event.locations.all())),
    )


HEADER = ['Dag', 'Start', 'Slut', 'Vist tid', 'Navn', 'Hold', 'Lokale']


def events_to_csv(events):
    buf = io.StringIO()
    writer = csv.writer(buf, 'excel-tab', quoting=csv.QUOTE_ALL)
    writer.writerow(HEADER)
    flat_events = list(map(flatten_event, events))
    for event in flat_events:
        writer.writerow([
            event.day,
            event.start_time,
            event.end_time,
            event.manual_time,
            event.name,
            event.participants,
            event.locations,
        ])
    result = buf.getvalue()
    if set(flat_events) != set(parse_csv(result)):
        a = set(flat_events) - set(parse_csv(result))
        b = set(parse_csv(result)) - set(flat_events)
        raise Exception((sorted(a), sorted(b)))
    return result


class CaseCheck:
    def __init__(self):
        # Maps x.lower() to the set of ways in which x has been cased
        self.casing = collections.defaultdict(set)

    def add_cases(self, xs):
        for x in xs:
            self.casing[x.lower()].add(x)

    def add_errors(self, errors):
        for x, cases in self.casing.items():
            if len(cases) > 1:
                errors.append('Inkonsistente store/små bogstaver: %r' %
                              (sorted(cases),))


def parse_csv(text):
    rows = iter(csv.reader(text.splitlines(True),
                           'excel-tab' if '\t' in text else 'excel'))
    header = next(rows)

    errors = []
    result = []
    participants_casing = CaseCheck()
    locations_casing = CaseCheck()
    name_casing = CaseCheck()

    if header != HEADER:
        errors.append('Forkert overskrift: %r != %r' % (header, HEADER))
    for row in rows:
        if not (len(HEADER)-2 <= len(row) <= len(HEADER)):
            errors.append('Forkert antal celler i række: %r' % (row,))
            continue
        row_pad = (row + ['', ''])[:len(HEADER)]
        (day_input, start_time_input, end_time_input, display_time,
         name, participants_input, locations_input) = row_pad
        day = day_input.lower()
        if day not in PARSE_DAY:
            errors.append('Ugyldig dag %r, forventede %r' %
                          (day, list(PARSE_DAY)))
        start_time = clean_time(start_time_input, errors)
        end_time = clean_time(end_time_input, errors)
        participants = clean_list(participants_input, errors)
        locations = clean_list(locations_input, errors)
        participants_casing.add_cases(participants.split(','))
        locations_casing.add_cases(locations.split(','))
        name_casing.add_cases([name])
        if not errors:
            result.append(FlatEvent(
                name=name, day=day, start_time=start_time, end_time=end_time,
                manual_time=display_time, participants=participants,
                locations=locations))

    counter = collections.Counter(result)
    dups = [k for k, v in counter.items() if v > 1]
    if dups:
        errors.append('Dublet: %r' % (dups,))
    participants_casing.add_errors(errors)
    locations_casing.add_errors(errors)
    name_casing.add_errors(errors)

    if errors:
        raise ValidationError(errors)
    else:
        return result
