# -*- coding: utf-8 -*-
# Generated by Django 1.10 on 2016-08-15 21:33
from __future__ import unicode_literals

from django.db import migrations


def set_session(apps, schema_editor):
    Session = apps.get_model('lokaleplan', 'Session')
    Participant = apps.get_model('lokaleplan', 'Participant')
    Location = apps.get_model('lokaleplan', 'Location')
    Event = apps.get_model('lokaleplan', 'Event')
    s = Session()
    s.save()
    Participant.objects.filter(session=None).update(session=s)
    Location.objects.filter(session=None).update(session=s)
    Event.objects.filter(session=None).update(session=s)


class Migration(migrations.Migration):

    dependencies = [
        ('lokaleplan', '0008_create_session'),
    ]

    operations = [
        migrations.RunPython(set_session),
    ]
