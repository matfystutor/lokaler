# -*- coding: utf-8 -*-
# Generated by Django 1.10 on 2016-08-15 21:35
from __future__ import unicode_literals

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('lokaleplan', '0009_set_session'),
    ]

    operations = [
        migrations.AlterField(
            model_name='event',
            name='session',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='lokaleplan.Session'),
        ),
        migrations.AlterField(
            model_name='location',
            name='session',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='lokaleplan.Session'),
        ),
        migrations.AlterField(
            model_name='participant',
            name='session',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='lokaleplan.Session'),
        ),
    ]
