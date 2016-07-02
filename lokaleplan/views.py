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


class EventsByLocation(TemplateView):
    template_name = 'by_location.html'

    def get_context_data(self, **kwargs):
        context_data = super().get_context_data(**kwargs)

        locations = Location.objects.all()

        events_by_location_by_day = {}
        qs = Event.objects.all()
        qs = qs.prefetch_related('locations', 'participants')
        for event in qs:
            for location in event.locations.all():
                events_by_location_by_day.setdefault(
                    event.day, {}).setdefault(location, []).append(event)

        days = []
        for day_key, day_name in Event.DAYS:
            events_by_location = events_by_location_by_day.pop(day_key, [])
            events = [event for location_events in events_by_location.values()
                      for event in location_events]
            times = sorted(set(t for event in events
                               for t in [event.start_time, event.end_time]))
            time_slices = list(zip(times[:-1], times[1:]))

            columns = []
            for location in locations:
                location_events = events_by_location.pop(location, [])
                location_events.sort(key=lambda event: event.start_time)
                done_cells = 0
                cells = [set() for time_slice in time_slices]
                for event in location_events:
                    remaining_cells = zip(
                        time_slices[done_cells:], cells[done_cells:])
                    for (cell_start, cell_end), cell in remaining_cells:
                        if cell_end <= event.start_time:
                            # Since events are sorted by start_time, none of
                            # the next events are in this cell, so we are
                            # completely done with it; skip it next time.
                            done_cells += 1
                        elif cell_start < event.end_time:
                            # (event.start_time, event.end_time) overlaps
                            # (cell_start, cell_end).
                            cell.add(event)
                        else:
                            # Since cells are sorted by time, this event is
                            # not in any of the remaining cells.
                            break
                column = []
                for i, cell in enumerate(cells):
                    if i > 0 and cell == cells[i-1]:
                        span = 0
                    else:
                        span = 1
                        while i+span < len(cells) and cell == cells[i+span]:
                            span += 1
                    column.append({'location': location,
                                   'span': span,
                                   'events': list(cell)})
                columns.append(column)
            # Transpose columns to get row_cells
            row_cells = list(zip(*columns))
            rows = []
            for (start, end), row in zip(time_slices, row_cells):
                time_display = Event.display_time_interval(start, end)
                rows.append(
                    {'time_display': time_display,
                     'start': start, 'end': end, 'cells': row})
            days.append(
                {'key': day_key,
                 'name': day_name,
                 'locations': locations,
                 'rows': rows})

        context_data['days'] = days
        return context_data
