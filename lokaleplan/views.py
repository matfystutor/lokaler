from django.views.generic import TemplateView, FormView
from django.shortcuts import redirect

from lokaleplan.forms import PerlForm


class Home(TemplateView):
    template_name = 'home.html'


class PerlView(FormView):
    form_class = PerlForm
    template_name = 'perlform.html'

    def form_valid(self, form):
        form.save()
        return redirect('home')
