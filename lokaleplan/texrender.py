import os
import tempfile
import subprocess


def tex_to_pdf(source):
    with tempfile.TemporaryDirectory() as d:
        jobname = 'plans'
        base = os.path.join(d, jobname)
        with open(base + '.tex', 'w') as fp:
            fp.write(source)
        p = subprocess.Popen(
            ('pdflatex', base + '.tex'),
            cwd=d,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True)
        with p:
            stdout, _ = p.communicate()
        if p.returncode != 0:
            raise Exception("pdflatex failed: %s" % p.returncode)
        with open(base + '.pdf', 'rb') as fp:
            return fp.read()
