from http.server import HTTPServer, SimpleHTTPRequestHandler
from socketserver import ThreadingMixIn
from multiprocessing import Process
from subprocess import call


class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    """Handle requests in a separate thread."""


class Compass(Process):
    daemon = True

    def run(self):
        call(['compass', 'watch'])


class CoffeeScript(Process):
    daemon = True

    def run(self):
        call(['./coffee-machine.sh'], shell=True)


print('Lauching compass')
Compass().start()
print('Lauching coffee')
CoffeeScript().start()

print('Lauching http server')
server = ThreadedHTTPServer(('0.0.0.0', 3615), SimpleHTTPRequestHandler)
from wsreload.client import watch
files = ['javascripts/*', 'stylesheets/*', '*.html']
watch({'url': 'http://localhost:3615/*'}, files, unwatch_at_exit=True)
server.serve_forever()
