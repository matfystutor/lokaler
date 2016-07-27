from django.forms.widgets import TimeInput
from django.forms.fields import TimeField


class MinuteTimeField(TimeField):
    def __init__(self, **kwargs):
        kwargs.setdefault('widget', TimeInput(format='%H:%M'))
        super(MinuteTimeField, self).__init__(**kwargs)
