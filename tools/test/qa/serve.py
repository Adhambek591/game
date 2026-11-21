# Static server for local tests: threaded, big listen backlog (python -m http.server drops connections under load on Windows).
# usage: python tools/test/qa/serve.py PORT [DIR] [UPLOAD_DIR]   -- with UPLOAD_DIR, PUT /__rec/<name> saves the body there (previs recordings)
import sys, os, http.server, socketserver, re
port = int(sys.argv[1]); root = sys.argv[2] if len(sys.argv) > 2 else '.'; up = os.path.abspath(sys.argv[3]) if len(sys.argv) > 3 else None
os.chdir(root)
class S(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True; request_queue_size = 256; allow_reuse_address = True
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_PUT(self):
        m = re.match(r'^/__rec/([\w.-]+)$', self.path)
        if not up or not m: self.send_response(403); self.end_headers(); return
        n = int(self.headers.get('Content-Length', 0)); os.makedirs(up, exist_ok=True)
        with open(os.path.join(up, m.group(1)), 'wb') as f: f.write(self.rfile.read(n))
        self.send_response(201); self.end_headers(); self.wfile.write(b'ok')
S(('127.0.0.1', port), H).serve_forever()
