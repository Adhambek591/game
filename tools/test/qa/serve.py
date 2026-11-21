# Static server for local tests: threaded, big listen backlog (python -m http.server drops connections under load on Windows).
# usage: python tools/test/qa/serve.py PORT [DIR]
import sys, os, http.server, socketserver
port = int(sys.argv[1]); os.chdir(sys.argv[2] if len(sys.argv) > 2 else '.')
class S(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True; request_queue_size = 256; allow_reuse_address = True
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
S(('127.0.0.1', port), H).serve_forever()
