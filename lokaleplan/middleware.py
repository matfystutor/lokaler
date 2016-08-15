from django.contrib.auth.views import redirect_to_login
from django.shortcuts import render_to_response

from lokaleplan.models import Session


class LokaleplanMiddleware(object):
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        return response

    def process_view(self, request, view_func, view_args, view_kwargs):
        try:
            session_pk = view_kwargs.pop('session')
        except KeyError:
            return
        user = request.user
        if not user:
            return redirect_to_login(request.build_absolute_uri())
        qs = Session.objects.filter(pk=session_pk)
        if not user.is_superuser:
            qs = qs.filter(users=user)
        try:
            session = qs.get()
        except Session.DoesNotExist:
            return render_to_response(
                'lokaleplan/session_404.html', status=404)
        request.lokaleplan_session = session
