import re

from django.views.generic import TemplateView, FormView
from django.shortcuts import redirect, get_object_or_404

from lokaleplan.forms import PerlForm
from lokaleplan.models import Participant, Event, Location


class Home(TemplateView):
    template_name = 'lokaleplan/home.html'

    def get_context_data(self, **kwargs):
        context_data = super().get_context_data(**kwargs)
        context_data['participants'] = Participant.objects.all()
        return context_data


class PerlView(FormView):
    form_class = PerlForm
    template_name = 'lokaleplan/perlform.html'

    def form_valid(self, form):
        form.save()
        return redirect('home')


class ParticipantDetail(TemplateView):
    template_name = 'lokaleplan/participantdetail.html'

    def get_participant(self):
        return get_object_or_404(
            Participant, pk=self.kwargs['pk'])

    def get_context_data(self, **kwargs):
        context_data = super().get_context_data(**kwargs)
        participant = self.get_participant()
        context_data['participant'] = participant

        qs = Event.objects.filter(participants=participant)
        qs = Event.add_parallel_events(qs)
        qs = qs.prefetch_related('locations', 'participants')

        events_by_day = {}
        extra_by_key = {}
        for event in qs:
            if participant not in event.participants.all():
                extra_by_key.setdefault(event.parallel_key(), []).append(event)
            else:
                events_by_day.setdefault(event.day, []).append(event)

        days = []
        for day_key, day_name in Event.DAYS:
            events = events_by_day.pop(day_key, [])
            events.sort(key=lambda event: event.start_time)
            for e in events:
                e.extra = extra_by_key.pop(e.parallel_key(), [])
                e.extra.sort(key=lambda ex: str(ex.participants.all()[0]))
            days.append({
                'key': day_key,
                'name': day_name,
                'events': events,
            })
        assert not extra_by_key, extra_by_key

        context_data['days'] = days
        return context_data


def summarize_participants(participants):
    groups = {}
    for p in participants:
        groups.setdefault(p.name[:-1], []).append(p.name[-1])
    return ' '.join(
        '%s%s' % (k, ','.join(sorted(groups[k])))
        for k in sorted(groups.keys()))


class EventTable(TemplateView):
    template_name = 'lokaleplan/eventtable.html'

    def get_events(self):
        qs = Event.objects.all()
        qs = qs.prefetch_related('locations', 'participants')
        return qs

    def get_cell(self, events):
        mode = self.kwargs.get('mode')
        class_ = ''
        if mode == 'locations':
            participants = set(p for event in events
                               for p in event.participants.all())
            text = summarize_participants(participants)
            if not text:
                class_ = 'empty'
        elif mode == 'participants':
            text = '\n'.join(str(location) for event in events
                             for location in event.locations.all())
            if not text:
                class_ = 'empty'
                if events:
                    text = '(%s)' % ', '.join(str(event) for event in events)
        else:
            raise Exception(mode)
        return text, class_

    def partition_events(self, qs):
        days = Event.DAYS
        event_sets = {}
        mode = self.kwargs.get('mode')
        if mode == 'locations':
            header_sets = self.get_location_sets()
            for event in qs:
                for location in event.locations.all():
                    event_sets.setdefault(
                        event.day, {}).setdefault(location, []).append(event)

        elif mode == 'participants':
            header_sets = self.get_participant_sets()
            for event in qs:
                for p in event.participants.all():
                    event_sets.setdefault(
                        event.day, {}).setdefault(p, []).append(event)
        else:
            raise Exception(mode)

        return event_sets, days, header_sets

    def get_participant_sets(self):
        classes = {}
        other = []
        for p in Participant.objects.all():
            if p.kind != Participant.RUSCLASS:
                other.append(p)
            else:
                classes.setdefault(p.name[0], set()).add(p)
        try:
            classes['fysnan'] = classes.pop('F') | classes.pop('N')
        except KeyError:
            pass
        class_lists = [
            sorted(classes[k], key=str) for k in sorted(classes.keys())]
        n_column = 10
        other = sorted(other, key=str)
        other_lists = [other[i:i+n_column]
                       for i in range(0, len(other), n_column)]
        return class_lists + other_lists

    def get_location_sets(self):
        katrinebjerg = []
        campus = []
        katrinebjerg_pattern = r'^(Ada|Chomsky|IT|Ny|PBA|Stibitz|Turing).*$'
        for l in Location.objects.all():
            if re.match(katrinebjerg_pattern, l.name):
                katrinebjerg.append(l)
            else:
                campus.append(l)
        location_lists = []
        for group in (campus, katrinebjerg):
            group.sort(key=str)
            n_column = 10
            l = [group[i:i+n_column] for i in range(0, len(group), n_column)]
            location_lists.extend(l)
        return location_lists

    def get_time_slices(self, events_by_column, header):
        # Flatten events_by_column.values()
        events = (event for k in header
                  for event in events_by_column.get(k, []))
        # Distinct time points
        times = sorted(set(t for event in events
                           for t in [event.start_time, event.end_time]))
        # Time points to time intervals
        return list(zip(times[:-1], times[1:]))

    def put_events_in_time_slices(self, events, time_slices):
        """
        Compute for each time slice the set of events in the time slice.
        The events will be sorted in-place by start time.
        The time slices must be adjacent and sorted.
        Returns a list with an entry for each time slice with a set of events.
        """
        # All time slices have positive length
        assert all(a < b for a, b in time_slices)
        # All neighboring time slices are adjacent
        assert all(xb == ya for (xa, xb), (ya, yb) in
                   zip(time_slices[:-1], time_slices[1:]))
        events.sort(key=lambda event: event.start_time)
        cells = [set() for time_slice in time_slices]
        done_cells = 0
        for event in events:
            remaining_cells = zip(
                time_slices[done_cells:], cells[done_cells:])
            for (cell_start, cell_end), cell in remaining_cells:
                if cell_end <= event.start_time:
                    # Since events are sorted by start_time, none of the next
                    # events are in this cell, so we are completely done with
                    # it; skip it next time.
                    done_cells += 1
                elif cell_start < event.end_time:
                    # (event.start_time, event.end_time) overlaps
                    # (cell_start, cell_end).
                    cell.add(event)
                else:
                    # Since cells are sorted by time, this event is
                    # not in any of the remaining cells.
                    break
        assert len(cells) == len(time_slices)
        assert all(event.start_time <= end and start <= event.end_time
                   for (start, end), cell in zip(time_slices, cells)
                   for event in cell)
        return cells

    def merge_repeating_cells(self, cells):
        cells = list(cells)
        spans = []
        for i, cell in enumerate(cells):
            if i > 0 and cell == cells[i-1]:
                # This cell is contained in the previous cell,
                # so it should not be output.
                span = 0
            else:
                span = 1
                while i+span < len(cells) and cell == cells[i+span]:
                    span += 1
            spans.append(span)
        assert sum(spans) == len(cells)
        return spans

    def construct_table(self, header, events_by_key, time_slices):
        column_cells = []
        column_rowspans = []
        for key in header:
            events = events_by_key.pop(key, [])
            cells = self.put_events_in_time_slices(events, time_slices)
            column_cells.append(cells)
            column_rowspans.append(self.merge_repeating_cells(cells))

        assert len(column_cells) == len(column_rowspans) == len(header)
        assert all(len(c) == len(time_slices) for c in column_cells)
        assert all(len(c) == len(time_slices) for c in column_rowspans)

        # Transpose columns to get row_cells
        row_cells = list(zip(*column_cells))
        row_rowspans = list(zip(*column_rowspans))
        assert len(row_cells) == len(row_rowspans) == len(time_slices)
        assert all(len(r) == len(header) for r in row_cells)
        assert all(len(r) == len(header) for r in row_rowspans)

        row_colspans = []
        for cells, rowspans in zip(row_cells, row_rowspans):
            row_colspans.append(
                self.merge_repeating_cells(zip(cells, rowspans)))

        # The sum of cell areas should equal the number of cells
        assert sum(
            row_rowspans[i][j] * row_colspans[i][j]
            for i in range(len(time_slices)) for j in range(len(header))
        ) == len(header) * len(time_slices)

        rows = []
        row_data = zip(time_slices, row_cells, row_rowspans, row_colspans)
        for (start, end), cells, rowspans, colspans in row_data:
            row = []
            for events, rowspan, colspan in zip(cells, rowspans, colspans):
                text, class_ = self.get_cell(events)
                row.append({'rowspan': rowspan, 'colspan': colspan,
                            'events': events, 'text': text, 'class': class_})
            time_display = Event.display_time_interval(start, end)
            rows.append(dict(
                time_display=time_display, start=start, end=end, cells=row))
        return rows

    def get_context_data(self, **kwargs):
        context_data = super().get_context_data(**kwargs)

        qs = self.get_events()
        event_sets, days, header_sets = self.partition_events(qs)
        day_keys = set(k for k, v in days)
        all_headers = set(h for header_set in header_sets for h in header_set)

        assert isinstance(event_sets, dict)
        assert all(d in day_keys for d in event_sets.keys())
        assert all(isinstance(v, dict) for v in event_sets.values())
        assert all(h in all_headers for v in event_sets.values()
                   for h in v.keys())
        assert all(isinstance(l, list) for v in event_sets.values()
                   for l in v.values())
        assert all(isinstance(e, Event) for v in event_sets.values()
                   for l in v.values() for e in l)

        tables = []
        for day_key, day_name in days:
            day_events = event_sets.pop(day_key, [])

            for header in header_sets:
                time_slices = self.get_time_slices(day_events, header)
                rows = self.construct_table(header, day_events, time_slices)
                assert all(h not in day_events for h in header)
                tables.append(dict(key=day_key, name=day_name,
                                   header=header, rows=rows))
            assert len(day_events) == 0

        context_data['tables'] = tables
        return context_data
