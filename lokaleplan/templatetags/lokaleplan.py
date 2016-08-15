from django import template
from django.utils.html import format_html
from django.core.urlresolvers import reverse
from django.template.defaulttags import URLNode

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


@register.tag
def lokaleplan_url(parser, token):
    bits = token.split_contents()
    viewname = parser.compile_filter(bits[1])
    bits = bits[2:]
    bits.append('session=session.pk')
    args = []
    kwargs = {k: parser.compile_filter(v)
              for (k, v) in (bit.split('=') for bit in bits)}
    asvar = None
    return URLNode(viewname, args, kwargs, asvar)
