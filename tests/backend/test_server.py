import pytest
import subprocess
import time
import requests
import os
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from threading import Thread
import socket

# Assuming server.py is in the root directory
SERVER_FILE_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'server.py')
# Port for the main server under test
SERVER_PORT = 8001 
BASE_URL = f"http://localhost:{SERVER_PORT}"

# Port for the mock Gemini server will be dynamically assigned
# MOCK_GEMINI_URL will be set in the mock_gemini_server fixture

from urllib.parse import urlparse

class MockGeminiRequestHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        # Parse the path to ignore query parameters
        parsed_path = urlparse(self.path).path
        # The path for Gemini includes the model, e.g., /gemini-test-model:generateContent
        if parsed_path.endswith(":generateContent"):
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            mock_response_content = {"candidates": [{"content": {"parts": [{"text": "Mocked AI response from internal mock server"}]}}]}
            self.wfile.write(json.dumps(mock_response_content).encode('utf-8'))
        else:
            self.send_response(404)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(b"Mock Gemini: Not Found")
    
    def log_message(self, format, *args):
        # Optionally silence log messages for cleaner test output
        # super().log_message(format, *args)
        return

@pytest.fixture(scope="module")
def mock_gemini_server():
    # Find an available port for the mock Gemini server
    temp_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    temp_sock.bind(('localhost', 0)) # 0 means OS assigns a free port
    actual_mock_gemini_port = temp_sock.getsockname()[1]
    temp_sock.close()
    
    mock_server_url = f"http://localhost:{actual_mock_gemini_port}"
    
    httpd = None
    thread = None
    try:
        httpd = HTTPServer(("localhost", actual_mock_gemini_port), MockGeminiRequestHandler)
        thread = Thread(target=httpd.serve_forever, daemon=True)
        thread.start()
        print(f"Mock Gemini server started on {mock_server_url}")
        yield mock_server_url # Provide the base URL (without model/generateContent)
    finally:
        if httpd:
            print("Shutting down mock Gemini server...")
            httpd.shutdown()
            httpd.server_close()
        if thread:
            thread.join(timeout=5)
        print("Mock Gemini server shut down.")

@pytest.fixture(scope="module")
def server(mock_gemini_server): # Depends on the mock_gemini_server fixture
    print(f"Starting main server on port {SERVER_PORT} using {SERVER_FILE_PATH}...")
    env = os.environ.copy()
    env['APP_INTERNAL_PORT'] = str(SERVER_PORT)
    # Key change: Set the env var for server.py to use the mock Gemini
    # server.py's build_gemini_url will use this as the base, then append "/{model}:generateContent"
    env['TEST_GEMINI_API_ENDPOINT'] = mock_gemini_server 
    
    process = subprocess.Popen(
        ["python", SERVER_FILE_PATH],
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    
    # Robust startup check for the main server
    retries = 20 
    server_started_successfully = False
    for i in range(retries):
        try:
            health_check_url = f"{BASE_URL}/" 
            response = requests.get(health_check_url, timeout=2.0) # Increased timeout
            # We expect 200 if index.html is served, or another success/redirect code.
            # A 404 could also mean the server is up but index.html is not at WEB_DIR root.
            # For this health check, any response that isn't a connection error or hard timeout implies the server is listening.
            print(f"Main server health check: Status {response.status_code} on attempt {i+1} of {retries}.")
            server_started_successfully = True
            break 
        except requests.ConnectionError:
            print(f"Main server health check: Connection error on attempt {i+1} of {retries}. Retrying...")
            time.sleep(1.5) 
        except requests.Timeout: 
            print(f"Main server health check: Timeout on attempt {i+1} of {retries}. Assuming server is up but slow.")
            server_started_successfully = True # If it times out, it's listening but slow
            break
        except requests.RequestException as e: 
            print(f"Main server health check: Request exception '{type(e).__name__}' on attempt {i+1} of {retries}. Assuming server started.")
            server_started_successfully = True 
            break
            
    if not server_started_successfully:
        stdout, stderr = process.communicate(timeout=5)
        print("Main server stdout upon startup failure:\n", stdout.decode(errors='ignore'))
        print("Main server stderr upon startup failure:\n", stderr.decode(errors='ignore'))
        process.terminate()
        process.wait(timeout=5)
        raise RuntimeError(f"Main server failed to start or become responsive at {BASE_URL} after {retries} retries.")
    
    print(f"Main server started and responded to health check at {BASE_URL}/.")
    yield process
    
    print("Terminating main server...")
    process.terminate()
    try:
        process.wait(timeout=10) 
    except subprocess.TimeoutExpired:
        print("Main server did not terminate in time, killing.")
        process.kill()
        process.wait()
    print("Main server terminated.")


def test_server_serves_index_html(server):
    """Test that the server serves index.html at the root path."""
    try:
        response = requests.get(BASE_URL + "/")
        assert response.status_code == 200
        assert "text/html" in response.headers.get("Content-Type", "")
    except requests.RequestException as e:
        pytest.fail(f"Request to server failed: {e}")

def test_ai_proxy_missing_params(server):
    """Test /ai-proxy endpoint for missing parameters."""
    try:
        response = requests.post(BASE_URL + "/ai-proxy", json={})
        assert response.status_code == 400
        assert response.text == "Missing apiKey or prompt"
    except requests.RequestException as e:
        pytest.fail(f"Request to /ai-proxy failed: {e}")

def test_ai_proxy_mocked_success(server): # No longer needs monkeypatch
    """Test /ai-proxy endpoint with the internal mock Gemini server."""
    try:
        payload = {
            "apiKey": "fake-api-key", # This key is now effectively ignored by the mock path
            "prompt": "Hello AI",
            "model": "gemini-test-model" # This model name will be part of the path to the mock server
        }
        # The main server (server fixture) is now configured to talk to mock_gemini_server
        response = requests.post(BASE_URL + "/ai-proxy", json=payload) 
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}. Response: {response.text}"
        response_json = response.json()
        assert "candidates" in response_json
        assert response_json["candidates"][0]["content"]["parts"][0]["text"] == "Mocked AI response from internal mock server"
        
    except requests.RequestException as e:
        pytest.fail(f"Request to /ai-proxy with mock failed: {e}")
    except json.JSONDecodeError:
        pytest.fail(f"Failed to decode JSON response from /ai-proxy: {response.text} (Status: {response.status_code})")

# A simple standalone test that doesn't require the server
def test_example_addition():
    assert 1 + 1 == 2
