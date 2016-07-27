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
from django.conf.urls import url
from django.contrib import admin

from lokaleplan.views import (
    Home, PerlView, ParticipantDetail,
    EventTable, EventList, EventUpdate,
)


urlpatterns = [
    url(r'^admin/', admin.site.urls),
    url(r'^$', Home.as_view(), name='home'),
    url(r'^import/$', PerlView.as_view(), name='import'),
    url(r'^hold/(?P<pk>[0-9]+)/$', ParticipantDetail.as_view(), name='participant_detail'),
    url(r'^locations/$', EventTable.as_view(),
        name='locations', kwargs=dict(mode='locations')),
    url(r'^participants/$', EventTable.as_view(),
        name='participants', kwargs=dict(mode='participants')),
    url(r'^events/$', EventList.as_view(), name='events'),
    url(r'^event/(?P<pk>\d+)/$', EventUpdate.as_view(), name='event_update'),
]
