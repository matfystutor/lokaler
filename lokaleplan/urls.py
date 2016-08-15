"""lokaleplan URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/1.9/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  url(r'^$', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  url(r'^$', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.conf.urls import url, include
    2. Add a URL to urlpatterns:  url(r'^blog/', include('blog.urls'))
"""
from django.conf.urls import url, include
from django.contrib import admin

from lokaleplan.views import (
    SessionList, SessionDelete, Home, PerlView, AddUser,
    ParticipantDetail, ParticipantPlans,
    EventTable, EventList, EventDelete, LocationList,
    EventUpdate, EventUpdateExternal, EventCreate, EventCreateExternal,
)


sessions = [
    url(r'^$', Home.as_view(), name='home'),
    url(r'^delete/$', SessionDelete.as_view(), name='session_delete'),
    url(r'^import/$', PerlView.as_view(), name='import'),
    url(r'^adduser/$', AddUser.as_view(), name='add_user'),
    url(r'^hold/(?P<pk>[0-9]+)/$', ParticipantDetail.as_view(), name='participant_detail'),
    url(r'^lokaleplan-(?P<pk>[0-9]+)\.tex$', ParticipantPlans.as_view(),
        name='participant-tex', kwargs=dict(mode='source')),
    url(r'^lokaleplan-(?P<pk>[0-9]+)\.pdf$', ParticipantPlans.as_view(),
        name='participant-pdf', kwargs=dict(mode='pdf')),
    url(r'^locations/$', LocationList.as_view(), name='location_list'),
    url(r'^events/$', EventList.as_view(), name='events'),
    url(r'^events/locations/$', EventTable.as_view(),
        name='locations', kwargs=dict(mode='locations')),
    url(r'^events/participants/$', EventTable.as_view(),
        name='participants', kwargs=dict(mode='participants')),
    url(r'^event/(?P<pk>\d+)/$', EventUpdate.as_view(), name='event_update'),
    url(r'^event/(?P<pk>\d+)/delete/$', EventDelete.as_view(), name='event_delete'),
    url(r'^event/external/new/$', EventCreateExternal.as_view(),
        name='event_create_external'),
    url(r'^event/external/(?P<pk>\d+)/$', EventUpdateExternal.as_view(),
        name='event_update_external'),
    url(r'^event/new/$', EventCreate.as_view(), name='event_create'),
    url(r'^lokaleplan\.tex$', ParticipantPlans.as_view(),
        name='participants-tex', kwargs=dict(mode='source')),
    url(r'^lokaleplan\.pdf$', ParticipantPlans.as_view(),
        name='participants-pdf', kwargs=dict(mode='pdf')),
]

urlpatterns = [
    url(r'^admin/', admin.site.urls),
    url('^', include('django.contrib.auth.urls')),
    url(r'^$', SessionList.as_view(), name='session_list'),
    url(r'^session/(?P<session>\d+)/', include(sessions)),
]
