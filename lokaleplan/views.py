import re
import functools
import itertools

from django.views.generic import (
    TemplateView, ListView, View, FormView, UpdateView, CreateView, DeleteView,
)
from django.http import HttpResponse, HttpResponseBadRequest
from django.shortcuts import redirect, get_object_or_404
from django.core.urlresolvers import reverse
from django.template.loader import render_to_string
from django.utils.decorators import method_decorator
from django.contrib.auth.views import redirect_to_login
from django.db.models import Count

from lokaleplan.forms import PerlForm, EventForm, EventModelForm, AddUserForm
from lokaleplan.models import Participant, Event, Location, Session
from lokaleplan.texrender import tex_to_pdf, RenderError


class SessionMixin(object):
    def lokaleplan_reverse(self, *args, **kwargs):
        kwargs['session'] = self.request.lokaleplan_session.pk
        return reverse(*args, kwargs=kwargs)

    def lokaleplan_redirect(self, *args, **kwargs):
        kwargs['session'] = self.request.lokaleplan_session.pk
        return redirect(*args, **kwargs)

    def lokaleplan_filter(self, qs):
        return qs.filter(session_id=self.request.lokaleplan_session.pk)


class SessionList(TemplateView):
    template_name = 'lokaleplan/session_list.html'

    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect_to_login(request.build_absolute_uri())
        return super(SessionList, self).dispatch(request, *args, **kwargs)

    def get_context_data(self, **kwargs):
        data = super(SessionList, self).get_context_data(**kwargs)
        if self.request.user.is_superuser:
            qs = Session.objects.all()
        else:
            qs = Session.objects.filter(users=self.request.user)
        qs = qs.annotate(user_count=Count('users', distinct=True),
                         participant_count=Count('participant', distinct=True),
                         location_count=Count('location', distinct=True),
                         event_count=Count('event', distinct=True))
        data['sessions'] = qs
        return data

    def post(self, request):
        s = Session()
        s.save()
        s.users.add(request.user)
        return redirect('home', session=s.pk)


class SessionDelete(View):
    def post(self, request):
        request.lokaleplan_session.users.remove(request.user)
        return redirect('session_list')


class Home(TemplateView, SessionMixin):
    template_name = 'lokaleplan/home.html'

    def get_context_data(self, **kwargs):
        context_data = super().get_context_data(**kwargs)
        groups = {}
        for p in self.lokaleplan_filter(Participant.objects.all()):
            k = p.name[0:2]
            groups.setdefault(k, []).append(p)
        context_data['groups'] = [groups[k] for k in sorted(groups)]
        context_data['add_user_form'] = AddUserForm()
        context_data['users'] = self.request.lokaleplan_session.users.all()
        return context_data


class PerlView(FormView, SessionMixin):
    form_class = PerlForm
    template_name = 'lokaleplan/perlform.html'

    def get_form_kwargs(self, **kwargs):
        a = super(PerlView, self).get_form_kwargs(**kwargs)
        a['session'] = self.request.lokaleplan_session
        return a

    def form_valid(self, form):
        form.save()
        return self.lokaleplan_redirect('home')


class ParticipantDetail(TemplateView, SessionMixin):
    template_name = 'lokaleplan/participantdetail.html'

    def get_participant(self):
        return get_object_or_404(
            self.lokaleplan_filter(Participant.objects.all()),
            pk=self.kwargs['pk'])

    def get_context_data(self, **kwargs):
        context_data = super().get_context_data(**kwargs)
        participant = self.get_participant()
        context_data['participant'] = participant

        qs = Event.objects.filter(participants=participant)
        qs = qs.prefetch_related('locations')

        events_by_day = {}
        for event in qs:
            events_by_day.setdefault(event.day, []).append(event)

        days = []
        for day_key, day_name in Event.DAYS:
            events = events_by_day.pop(day_key, [])
            events.sort(key=lambda event: event.start_time)
            days.append({
                'key': day_key,
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


def get_plans_tex(participants):
    template_name = 'lokaleplan/participant_plans.tex'

    participant_dicts = []
    for p in participants:
        days = []
        p_events = p.event_set.all()
        p_events = p_events.order_by('day', 'start_time')
        events_by_day = itertools.groupby(p_events, lambda e: e.day)
        for d, events in events_by_day:
            events = list(events)
            day_name = events[0].get_day_display()
            event_dicts = []
            for e in events:
                tex_time = e.get_display_time()
                tex_time = tex_time.replace('\N{INFINITY}', r'$\infty$')
                tex_time = tex_time.replace('-', '--')
                event_dicts.append(dict(
                    time=tex_time,
                    location=', '.join(l.name for l in e.locations.all()),
                    name=e.name))
            days.append(
                dict(name=day_name, events=event_dicts))
        participant_dicts.append(
            dict(name=p.name, message=p.message, days=days))

    return render_to_string(template_name, {'participants': participant_dicts})


class ParticipantPlans(View, SessionMixin):
    def get(self, request, mode, pk=None):
        participants = Participant.objects.all()
        participants = self.lokaleplan_filter(participants)
        if pk is None:
            participants = participants.prefetch_related('event_set')
        else:
            participants = [get_object_or_404(participants, pk=pk)]
        source = get_plans_tex(participants)
        if mode == 'source':
            return HttpResponse(source,
                                content_type='text/plain; charset=utf8')
        elif mode == 'pdf':
            try:
                pdf = tex_to_pdf(source)
            except RenderError as exn:
                return HttpResponse(
                    exn.output, content_type='text/plain', status=500)
            return HttpResponse(pdf, content_type='application/pdf')
        else:
            raise ValueError(mode)


class EventTableCell(object):
    def __init__(self, text, class_, events):
        self.text = text
        self.class_ = class_
        self.events = events

    def __iter__(self):
        return iter((self.text, self.class_, self.events))

    @property
    def key(self):
        return self.text, self.class_

    def __eq__(self, other):
        return self.key == other.key

    def __lt__(self, other):
        return self.key < other.key

    def __hash__(self):
        return hash(self.key)

    def __bool__(self):
        return bool(self.events)


class EventTable(TemplateView, SessionMixin):
    template_name = 'lokaleplan/eventtable.html'

    def get_events(self):
        qs = Event.objects.all()
        qs = self.lokaleplan_filter(qs)
        qs = qs.prefetch_related('locations', 'participants')
        return qs

    def get_cell(self, events):
        mode = self.kwargs.get('mode')
        class_ = ''
        if mode == 'locations':
            participants = set(p for event in events
                               for p in event.participants.all())
            if participants:
                text = summarize_participants(participants)
            else:
                text = ' '.join(event.name for event in events)
                class_ = 'external'
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
        return EventTableCell(text, class_, events)

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
        qs = Participant.objects.all()
        qs = self.lokaleplan_filter(qs)
        for p in qs:
            classes.setdefault(p.name[0], set()).add(p)
        try:
            classes['fysnan'] = classes.pop('F') | classes.pop('N')
        except KeyError:
            pass
        class_lists = [
            sorted(classes[k], key=str) for k in sorted(classes.keys())]
        return class_lists

    def get_location_sets(self):
        katrinebjerg = []
        campus = []
        katrinebjerg_pattern = r'^(Ada|Chomsky|IT|Ny|PBA|Stibitz|Turing).*$'
        qs = Location.objects.all()
        qs = self.lokaleplan_filter(qs)
        for l in qs:
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

    def collapse_equal_rows(self, row_cells, time_slices):
        # This transformation only makes sense if time slices are adjacent.
        assert all(xb == ya for (xa, xb), (ya, yb) in
                   zip(time_slices[:-1], time_slices[1:]))
        spans = self.merge_repeating_cells(row_cells)
        row_cells_and_times = [
            (cells, (time_slices[i][0], time_slices[i + span - 1][1]))
            for i, (cells, span) in enumerate(zip(row_cells, spans))
            if span > 0
        ]
        row_cells, time_slices = zip(*row_cells_and_times)
        return row_cells, time_slices

    def compute_interesting_rows(self, row_cells):
        # A row is uninteresting if no event starts or ends in it.
        # Compute a list u such that u[i] is False iff row i is uninteresting.
        if len(row_cells) < 2:
            return [True] * len(row_cells)
        first = [any(row_cells[0])]
        last = [any(row_cells[-1])]
        prev_cur_next = zip(row_cells[:-2], row_cells[1:-1], row_cells[2:])
        mid = [
            any(c and (c != p or c != n)
                for p, c, n in zip(prev, cur, next))
            for prev, cur, next in prev_cur_next
        ]
        return first + mid + last

    def construct_table(self, header, events_by_key, time_slices):
        column_cells = []
        for key in header:
            events = events_by_key.pop(key, [])
            cells = self.put_events_in_time_slices(events, time_slices)
            cells = list(map(self.get_cell, cells))
            column_cells.append(cells)

        if not any(any(cells) for cells in column_cells):
            # Handle this specially to avoid zipping an empty list below
            return []

        assert len(column_cells) == len(header)
        assert all(len(c) == len(time_slices) for c in column_cells)

        # Transpose columns to get rows
        row_cells = list(zip(*column_cells))

        row_cells, time_slices = self.collapse_equal_rows(
            row_cells, time_slices)
        interesting = self.compute_interesting_rows(row_cells)

        # Transpose rows to get columns
        column_cells = list(zip(*row_cells))

        column_rowspans = []
        for cells in column_cells:
            column_rowspans.append(self.merge_repeating_cells(cells))

        assert len(column_rowspans) == len(column_cells)
        assert all(len(c) == len(time_slices) for c in column_rowspans)

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
        row_data = zip(time_slices, row_cells, row_rowspans, row_colspans,
                       interesting)
        for (start, end), cells, rowspans, colspans, i in row_data:
            row = []
            for cell, rowspan, colspan in zip(cells, rowspans, colspans):
                text, class_, events = cell
                row.append({'rowspan': rowspan, 'colspan': colspan,
                            'events': events, 'text': text, 'class': class_})
            if i:
                time_display = Event.display_time_interval(start, end)
                row_class = ''
            else:
                time_display = ''
                row_class = 'uninteresting'
            rows.append({
                'class': row_class, 'time_display': time_display,
                'start': start, 'end': end, 'cells': row})
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


class EventList(TemplateView, SessionMixin):
    template_name = 'lokaleplan/event_list.html'

    def get_context_data(self, **kwargs):
        data = super(EventList, self).get_context_data(**kwargs)

        def sort_key(event):
            return (event.day, event.start_time,
                    event.name, event.end_time,
                    event.manual_time,
                    ' '.join(map(str, event.participants.all())))

        qs = Event.objects.all()
        qs = self.lokaleplan_filter(qs)
        events = sorted(qs, key=sort_key)
        data['event_list'] = events
        return data


class EventUpdate(FormView, SessionMixin):
    form_class = EventForm
    template_name = 'lokaleplan/event_form.html'

    def dispatch(self, request, *args, **kwargs):
        qs = Event.objects.all()
        qs = self.lokaleplan_filter(qs)
        event = get_object_or_404(qs, pk=self.kwargs['pk'])
        events = sorted(event.get_parallel_events(), key=lambda e: e.pk)
        if event != events[0]:
            return self.lokaleplan_redirect('event_update', pk=events[0].pk)
        self.events = events
        return super(EventUpdate, self).dispatch(request, *args, **kwargs)

    def get_form_kwargs(self):
        kwargs = super(EventUpdate, self).get_form_kwargs()
        kwargs['events'] = self.events
        kwargs['locations'] = self.lokaleplan_filter(Location.objects.all())
        kwargs['participants'] = self.lokaleplan_filter(
            Participant.objects.all())
        return kwargs

    def form_valid(self, form):
        form.save(self.request.lokaleplan_session)
        return self.lokaleplan_redirect('events')


class EventUpdateExternal(UpdateView, SessionMixin):
    form_class = EventModelForm
    template_name = 'lokaleplan/event_model_form.html'
    model = Event

    def get_success_url(self):
        return self.lokaleplan_reverse('events')

    def get_form_kwargs(self, **kwargs):
        a = super(EventUpdateExternal, self).get_form_kwargs(**kwargs)
        a['session'] = self.request.lokaleplan_session
        return a


class EventDelete(DeleteView, SessionMixin):
    model = Event

    def get_success_url(self):
        return self.lokaleplan_reverse('events')


class EventCreate(FormView, SessionMixin):
    form_class = EventForm
    template_name = 'lokaleplan/event_form.html'

    def get_form_kwargs(self):
        kwargs = super(EventCreate, self).get_form_kwargs()
        kwargs['events'] = []
        kwargs['locations'] = self.lokaleplan_filter(Location.objects.all())
        kwargs['participants'] = self.lokaleplan_filter(
            Participant.objects.all())
        return kwargs

    def form_valid(self, form):
        form.save()
        return self.lokaleplan_redirect('events')


class EventCreateExternal(CreateView, SessionMixin):
    form_class = EventModelForm
    template_name = 'lokaleplan/event_model_form.html'
    model = Event

    def get_success_url(self):
        return self.lokaleplan_reverse('events')

    def get_form_kwargs(self, **kwargs):
        a = super(EventCreateExternal, self).get_form_kwargs(**kwargs)
        a['session'] = self.request.lokaleplan_session
        return a


class LocationDelete(DeleteView, SessionMixin):
    def get_queryset(self):
        qs = Location.objects.filter(event__isnull=True)
        qs = self.lokaleplan_filter(qs)
        return qs

    def get_success_url(self):
        return self.lokaleplan_reverse('location_list')


class LocationList(ListView, SessionMixin):
    template_name = 'lokaleplan/location_list.html'

    def get_queryset(self):
        qs = Location.objects.all()
        qs = self.lokaleplan_filter(qs)
        qs = qs.prefetch_related('event_set')
        return qs

    def post(self, request):
        self.object_list = self.get_queryset()
        for k in request.POST:
            mo = re.match(r'(rename|delete)-location-(\d+)', k)
            if mo is not None:
                method = getattr(self, 'do_%s' % mo.group(1))
                location = get_object_or_404(Location, pk=mo.group(2))
                name = request.POST.get('location-%s' % mo.group(2))
                return method(location, name)
            if k == 'create-location-new':
                name = request.POST.get('location-new')
                return self.do_create(name)
        return self.render_to_response(
            self.get_context_data(error='No action specified'))

    def do_delete(self, location, name):
        if location.event_set.all():
            return self.render_to_response(
                self.get_context_data(
                    error='Der er programpunkter der bruger dette lokale'))
        location.delete()
        return self.lokaleplan_redirect('location_list')

    def do_rename(self, location, name):
        if not name:
            return self.render_to_response(
                self.get_context_data(
                    error='Navnet må ikke være tomt'))
        location.name = name
        location.save()
        return self.lokaleplan_redirect('location_list')

    def do_create(self, name):
        if not name:
            return self.render_to_response(
                self.get_context_data(
                    error='Navnet må ikke være tomt'))
        location = Location(name=name, session=self.request.lokaleplan_session)
        location.save()
        return self.lokaleplan_redirect('location_list')


class AddUser(FormView, SessionMixin):
    form_class = AddUserForm

    def form_valid(self, form):
        self.request.lokaleplan_session.users.add(form.cleaned_data['user'])
        return self.lokaleplan_redirect('home')

    def form_invalid(self, form):
        return self.lokaleplan_redirect('home')
