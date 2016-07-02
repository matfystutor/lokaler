from django.contrib import admin

from lokaleplan.models import Participant, Location, Event


class ParticipantAdmin(admin.ModelAdmin):
    list_display = ['name', 'kind']
    list_filter = ['kind']
    search_fields = ['name']


class EventAdmin(admin.ModelAdmin):
    list_display = [
        '__str__', 'day', 'start_time', 'end_time',
        'participant_list', 'location_list']

    list_filter = ['day', 'start_time']

    search_fields = ['name']

    filter_horizontal = ['locations', 'participants']

    def participant_list(self, event):
        return ', '.join(map(str, event.participants.all())) or None

    def location_list(self, event):
        return ', '.join(map(str, event.locations.all())) or None


admin.site.register(Participant, ParticipantAdmin)
admin.site.register(Location)
admin.site.register(Event, EventAdmin)
