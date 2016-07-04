from django import template
from django.utils.html import format_html
from django.core.urlresolvers import reverse

from lokaleplan.models import Location, Participant


register = template.Library()


@register.simple_tag
def table_link(day_key, object):
    if isinstance(object, Location):
        url = reverse('locations')
        class_ = 'location-link'
    elif isinstance(object, Participant):
        url = reverse('participants')
        class_ = 'participant-link'
    else:
        raise TypeError(type(object))
    return format_html('<a href="{}#column-{}-{}" class="{}">{}</a>',
                       url, day_key, object.pk, class_, object)
