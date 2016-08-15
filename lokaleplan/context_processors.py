def lokaleplan_context(request):
    try:
        return {'session': {'pk': request.session_pk}}
    except AttributeError:
        return {}
