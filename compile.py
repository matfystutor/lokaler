import os
import sys
import argparse
import subprocess

import dukpy
import dukpy.babel


def await_changes(filename, events=()):
    dir, name = os.path.split(filename)
    dir = (dir or '.') + '/'
    cmdline = ['inotifywait', '-m']
    for e in events:
        cmdline.extend(['-e', e])
    cmdline.append(dir)

    p = subprocess.Popen(
        cmdline,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        universal_newlines=True)
    with p:
        for line in p.stdout:
            n = line.split()[2]
            if n == name:
                yield


compilers = {}


def compiler(src_ext, dest_ext):
    def decorator(fn):
        compilers[src_ext] = (dest_ext, fn)
        return fn
    return decorator


def transform_file(input_filename, output_filename, fn):
    prev_source = None

    def transformer():
        nonlocal prev_source

        with open(input_filename) as fp:
            source = fp.read()
        if source == prev_source:
            return
        prev_source = source
        print("Transform %s to %s" % (input_filename, output_filename))
        result = fn(source)
        with open(output_filename, 'w') as fp:
            fp.write(result)

    return transformer


@compiler('.es6', '.js')
def babel_compile(source):
    return dukpy.babel.babel_compile(source)['code']


#@compiler('.js', '.es6')
#def es5to6(source):
#    jsi = dukpy.JSInterpreter()
#    jsi.loader.register_path('./js_modules')
#    return jsi.evaljs(
#        'var convert = require("5to6"); convert(dukpy.jscode)',
#        jscode=source)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('-w', '--watch', action='store_true')
    parser.add_argument('filename')
    args = parser.parse_args()
    base, ext = os.path.splitext(args.filename)
    try:
        dest_ext, fn = compilers[ext]
    except KeyError:
        parser.error("Filename must end with one of: %s" % sorted(compilers))
    output_filename = base + dest_ext
    transformer = transform_file(args.filename, output_filename, fn)
    transformer()
    if args.watch:
        for _ in await_changes(args.filename, ['modify']):
            transformer()


if __name__ == "__main__":
    main()
