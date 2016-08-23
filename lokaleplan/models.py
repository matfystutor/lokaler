from django.db import models
from django.db.models import Q
from django.core.urlresolvers import reverse
from django.contrib.auth.models import User


class Session(models.Model):
    users = models.ManyToManyField(User, blank=True)


class Participant(models.Model):
    session = models.ForeignKey(Session)
    name = models.CharField(max_length=50)
    message = models.TextField(blank=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']


class Location(models.Model):
    AUDITORIUM = 'auditorium'
    CLASSROOM = 'classroom'
    HALL = 'hall'

    KIND = [
        (AUDITORIUM, 'auditorium'),
        (CLASSROOM, 'classroom'),
        (HALL, 'hall'),
    ]

    session = models.ForeignKey(Session)
    name = models.CharField(
        max_length=50,
        verbose_name='internt navn',
        help_text='Internt navn, f.eks. Aud. E')
    official_name = models.CharField(
        max_length=50,
        verbose_name='officielt navn',
        help_text='Officiel lokalebetegnelse, f.eks. 1535-128')
    capacity = models.CharField(
        max_length=100,
        verbose_name='kapacitet',
        help_text='Kapacitetsbegrænsning')
    kind = models.CharField(max_length=10, choices=KIND)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']


class Event(models.Model):
    """
    Represents an event in the calendar in which one or more participants
    together use zero or more locations.

    Two events are parallel if they have the same name and occur at the same
    time (that is, if e1.parallel_key() == e2.parallel_key()).

    A participant must not be in two parallel events.
    """
    WEDNESDAY = 3
    THURSDAY = 4
    FRIDAY = 5
    DAYS = [
        (WEDNESDAY, 'onsdag'),
        (THURSDAY, 'torsdag'),
        (FRIDAY, 'fredag'),
    ]

    session = models.ForeignKey(Session)
    name = models.CharField(max_length=50, verbose_name='navn')
    day = models.IntegerField(choices=DAYS, verbose_name='dag')
    start_time = models.TimeField(verbose_name='starttid')
    end_time = models.TimeField(verbose_name='sluttid')
    manual_time = models.CharField(
        max_length=100, blank=True, verbose_name='vist tid')
    locations = models.ManyToManyField(
        Location, blank=True, verbose_name='lokaler')
    participants = models.ManyToManyField(
        Participant, blank=True, verbose_name='deltagere')

    def __str__(self):
        if self.name:
            return self.name
        else:
            return "(%s i %s)" % (
                ', '.join(map(str, self.participants.all())),
                ', '.join(map(str, self.locations.all())),
            )

    def get_display_time(self):
        if self.manual_time:
            return self.manual_time
        else:
            return self.display_time_interval(
                self.start_time, self.end_time)

    def edit_link(self):
        if self.participants.all():
            return reverse('event_update',
                           kwargs=dict(session=self.session_id, pk=self.pk))
        else:
            return reverse('event_update_external',
                           kwargs=dict(session=self.session_id, pk=self.pk))

    @staticmethod
    def display_time_interval(start_time, end_time):
        h1 = start_time.hour
        m1 = start_time.minute
        h2 = end_time.hour
        m2 = end_time.minute
        return '%02d:%02d-%02d:%02d' % (h1, m1, h2, m2)

    def parallel_key(self):
        if self.participants.all():
            return (1, self.name, self.day, self.start_time, self.end_time,
                    self.manual_time)
        else:
            return (0, self.pk)

    @classmethod
    def overlapping(cls, day, start_time, end_time):
        return cls.objects.filter(
            day=day, start_time__lt=end_time, end_time__gt=start_time)

    @classmethod
    def add_parallel_events(cls, qs):
        """
        Given a QuerySet over Event objects, construct a new QuerySet
        containing the same Event objects as well as any Events that have
        the same name and time.
        """
        res = cls.objects.none()
        values = qs.values_list(
            'name', 'day', 'start_time', 'end_time', 'manual_time')
        for name, day, start_time, end_time, manual_time in values:
            res = res | cls.objects.filter(
                name=name, day=day, start_time=start_time, end_time=end_time,
                manual_time=manual_time)
        res = res.exclude(participants__isnull=True)
        return res

    def get_parallel_events(self):
        """
        Return a QuerySet containing Event objects parallel with self.
        """
        return type(self).objects.filter(
            session=self.session, name=self.name, day=self.day, start_time=self.start_time,
            end_time=self.end_time, manual_time=self.manual_time).exclude(
                participants__isnull=True)

    class Meta:
        ordering = ['day', 'start_time', 'name', 'end_time']
