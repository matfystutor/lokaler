def lokaleplan_context(request):
    try:
        return {'session': request.lokaleplan_session}
    except AttributeError:
        return {}
