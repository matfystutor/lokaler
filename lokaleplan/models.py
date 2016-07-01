from django.db import models


class Participant(models.Model):
    RUSCLASS = 'rusclass'
    PARTNER = 'partner'

    KIND = [
        (RUSCLASS, 'rusclass'),
        (PARTNER, 'partner'),
    ]

    name = models.CharField(max_length=50)
    kind = models.CharField(max_length=10, choices=KIND)
    message = models.TextField(blank=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['kind', 'name']


class Location(models.Model):
    AUDITORIUM = 'auditorium'
    CLASSROOM = 'classroom'
    HALL = 'hall'

    KIND = [
        (AUDITORIUM, 'auditorium'),
        (CLASSROOM, 'classroom'),
        (HALL, 'hall'),
    ]

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
    WEDNESDAY = 3
    THURSDAY = 4
    FRIDAY = 5
    DAYS = [
        (WEDNESDAY, 'onsdag'),
        (THURSDAY, 'torsdag'),
        (FRIDAY, 'fredag'),
    ]

    name = models.CharField(max_length=50)
    day = models.IntegerField(choices=DAYS)
    start_time = models.TimeField()
    end_time = models.TimeField()
    manual_time = models.CharField(max_length=100, blank=True)
    locations = models.ManyToManyField(Location, blank=True)
    participants = models.ManyToManyField(Participant, blank=True)

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
            return '%s-%s' % (self.start_time, self.end_time)

    class Meta:
        ordering = ['day', 'start_time', 'name']
