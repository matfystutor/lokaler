from django.views.generic import TemplateView, FormView
from django.shortcuts import redirect, get_object_or_404

from lokaleplan.forms import PerlForm
from lokaleplan.models import Participant, Event, Location


class Home(TemplateView):
    template_name = 'home.html'


class PerlView(FormView):
    form_class = PerlForm
    template_name = 'perlform.html'

    def form_valid(self, form):
        form.save()
        return redirect('home')


class ParticipantDetail(TemplateView):
    template_name = 'participantdetail.html'

    def get_participant(self):
        return get_object_or_404(
            Participant, pk=self.kwargs['pk'])

    def get_context_data(self, **kwargs):
        context_data = super().get_context_data(**kwargs)
        participant = self.get_participant()
        context_data['participant'] = participant

        events_by_day = {}
        qs = Event.objects.filter(participants=participant)
        qs = qs.prefetch_related('locations', 'participants')
        for event in qs:
            events_by_day.setdefault(
                event.day, []).append(event)

        days = []
        for day_key, day_name in Event.DAYS:
            events = events_by_day.pop(day_key, [])
            events.sort(key=lambda event: event.start_time)
            days.append({
                'name': day_name,
                'events': events,
            })

        context_data['days'] = days
        return context_data


def summarize_participants(participants):
    groups = {}
    for p in participants:
        groups.setdefault(p.name[:-1], []).append(p.name[-1])
    return ' '.join(
        '%s%s' % (k, ','.join(sorted(groups[k])))
        for k in sorted(groups.keys()))


class EventsByLocation(TemplateView):
    template_name = 'by_location.html'

    def get_events(self):
        qs = Event.objects.all()
        qs = qs.prefetch_related('locations', 'participants')
        return qs

    def partition_events(self, qs):
        header = list(Location.objects.all())
        days = Event.DAYS
        event_sets = {}
        for event in qs:
            for location in event.locations.all():
                event_sets.setdefault(
                    event.day, {}).setdefault(location, []).append(event)

        assert all(isinstance(v, dict) for v in event_sets.values())
        assert all(isinstance(l, list) for v in event_sets.values()
                   for l in v.values())
        assert all(isinstance(e, Event) for v in event_sets.values()
                   for l in v.values() for e in l)

        return event_sets, days, header

    def get_time_slices(self, events_by_column):
        # Flatten events_by_column.values()
        events = (event for events in events_by_column.values()
                  for event in events)
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
                    # Since events are sorted by start_time, none
                    # of the next events are in this cell, so we
                    # are completely done with it; skip it next
                    # time.
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
        column = []
        for i, cell in enumerate(cells):
            if i > 0 and cell == cells[i-1]:
                # This cell is contained in the previous cell
                # so it should not be output
                span = 0
            else:
                span = 1
                while i+span < len(cells) and cell == cells[i+span]:
                    span += 1
            column.append({'span': span,
                           'events': list(cell)})
        assert len(column) == len(cells)
        assert sum(c['span'] for c in column) == len(cells)
        return column

    def construct_table(self, header, events_by_key, time_slices):
        columns = []
        for key in header:
            events = events_by_key.pop(key, [])
            cells = self.put_events_in_time_slices(events, time_slices)
            column = self.merge_repeating_cells(cells)
            for cell in column:
                # cell['location'] = location
                participants = set(p for event in cell['events']
                                   for p in event.participants.all())
                cell['participants'] = summarize_participants(participants)
            columns.append(column)
        # Transpose columns to get row_cells
        row_cells = list(zip(*columns))
        rows = []
        for (start, end), row in zip(time_slices, row_cells):
            time_display = Event.display_time_interval(start, end)
            rows.append(dict(
                time_display=time_display, start=start, end=end, cells=row))
        return rows

    def get_context_data(self, **kwargs):
        context_data = super().get_context_data(**kwargs)

        qs = self.get_events()
        event_sets, days, header = self.partition_events(qs)
        n_columns = 10
        header_sets = [header[i:i+n_columns]
                       for i in range(0, len(header), n_columns)]

        tables = []
        for day_key, day_name in days:
            day_events = event_sets.pop(day_key, [])
            time_slices = self.get_time_slices(day_events)

            assert len(day_events) > 0
            for header in header_sets:
                rows = self.construct_table(header, day_events, time_slices)
                assert all(h not in day_events for h in header)
                tables.append(dict(key=day_key, name=day_name,
                                   header=header, rows=rows))
            assert len(day_events) == 0

        context_data['tables'] = tables
        return context_data
