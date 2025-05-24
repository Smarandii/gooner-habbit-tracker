import http.server
import socketserver
import os
import json
import requests

INTERNAL_PORT = int(os.environ.get('APP_INTERNAL_PORT', 8000))
WEB_DIR = os.path.dirname(os.path.abspath(__file__))

def build_gemini_url(model):
    return f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

class MyHttpRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB_DIR, **kwargs)

    def do_GET(self):
        if self.path == '/':
            self.path = '/index.html'
        return super().do_GET()

    def do_POST(self):
        if self.path == '/ai-proxy':
            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length)
            data = json.loads(body)

            api_key = data.get("apiKey")
            prompt = data.get("prompt")
            model = data.get("model", "gemini-2.0-flash")

            if not api_key or not prompt:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b"Missing apiKey or prompt")
                return

            try:
                print("[ai-proxy] Sending prompt through model:", model)
                print("Prompt:", prompt)

                response = requests.post(
                    f"{build_gemini_url(model)}?key={api_key}",
                    json={
                        "contents": [{ "parts": [{ "text": prompt }] }],
                        "generationConfig": {
                            "temperature": 1,
                            "topK": 1,
                            "topP": 1,
                            "maxOutputTokens": 600,
                        },
                        "safetySettings": [
                            { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE" },
                            { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE" },
                            { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE" },
                            { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE" }
                        ]
                    },
                    timeout=30
                )
                self.send_response(response.status_code)

                if response.status_code != 200:
                    print("[Gemini API Error]", response.status_code, response.text)

                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(response.content)
                print(response.json())
            except Exception as e:
                import traceback
                traceback.print_exc()

                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                error_response = {"error": f"Server error: {str(e)}"}
                self.wfile.write(json.dumps(error_response).encode())

Handler = MyHttpRequestHandler

with socketserver.TCPServer(("", INTERNAL_PORT), Handler) as httpd:
    print(f"Serving HTTP on internal port {INTERNAL_PORT} from directory {WEB_DIR}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
        httpd.shutdown()
