import http.server
import socketserver
import os

INTERNAL_PORT = int(os.environ.get('APP_INTERNAL_PORT', 8000))
WEB_DIR = os.path.dirname(os.path.abspath(__file__))


class MyHttpRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB_DIR, **kwargs)

    def do_GET(self):
        if self.path == '/':
            self.path = '/index.html'  # CHANGED HERE

        # Add MIME types for .js files if your system doesn't serve them correctly
        # Most modern SimpleHTTPRequestHandler versions handle this.
        if self.path.endswith(".js"):
            self.send_response(200)
            self.send_header("Content-type", "application/javascript")
            self.end_headers()
            with open(self.translate_path(self.path), 'rb') as f:
                self.copyfile(f, self.wfile)
            return

        return http.server.SimpleHTTPRequestHandler.do_GET(self)


Handler = MyHttpRequestHandler

with socketserver.TCPServer(("", INTERNAL_PORT), Handler) as httpd:
    print(f"Serving HTTP on internal port {INTERNAL_PORT} from directory {WEB_DIR}")
    print(f"App will be accessible via the port mapped in Docker/Docker Compose.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
        httpd.shutdown()