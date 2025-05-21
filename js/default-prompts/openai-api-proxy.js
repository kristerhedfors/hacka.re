/**
 * OpenAI API Proxy Default Prompt
 * A lightweight, dependency-free Python implementation of an OpenAI API proxy without external dependencies
 */

window.OpenAIApiProxyPrompt = {
    id: 'openai-api-proxy',
    name: 'Pure Python OpenAI API Proxy',
    content: `# Pure Python OpenAI API Proxy

A lightweight, dependency-free Python implementation of an OpenAI API proxy. This script implements a subset of the OpenAI API interface without using any external libraries - not even requests or httpx.

## Features

- Pure Python implementation (no external dependencies)
- Implements core OpenAI API endpoints (completions, chat completions)
- Supports streaming responses
- Handles authentication and error responses
- Configurable via environment variables or command-line arguments

## Usage

1. Save the code to a file named \`api-proxy.py\`
2. Run with \`python api-proxy.py\`
3. Configure your OpenAI client to use \`http://localhost:8000\` as the base URL

\`\`\`python
#!/usr/bin/env python3
"""
OpenAI API Proxy - Pure Python Implementation

This script implements a lightweight HTTP server that proxies requests to the OpenAI API.
It uses only the Python standard library - no external dependencies required.

Features:
- Implements core OpenAI API endpoints (completions, chat completions)
- Supports streaming responses
- Handles authentication and error responses
- Configurable via environment variables or command-line arguments

Usage:
    python api-proxy.py [--port PORT] [--host HOST] [--api-key API_KEY] [--base-url BASE_URL]

Environment variables:
    OPENAI_API_KEY: Your OpenAI API key
    OPENAI_BASE_URL: Base URL for OpenAI API (default: https://api.openai.com)
    PROXY_HOST: Host to bind the proxy server (default: localhost)
    PROXY_PORT: Port to bind the proxy server (default: 8000)
"""

import argparse
import http.server
import json
import os
import socket
import ssl
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from http import HTTPStatus
from typing import Any, Dict, List, Optional, Tuple, Union


# Configuration and constants
DEFAULT_PORT = 8000
DEFAULT_HOST = "localhost"
DEFAULT_BASE_URL = "https://api.openai.com"
VERSION = "1.0.0"

# Global configuration (will be updated from command line args or env vars)
config = {
    "api_key": os.environ.get("OPENAI_API_KEY", ""),
    "base_url": os.environ.get("OPENAI_BASE_URL", DEFAULT_BASE_URL),
    "host": os.environ.get("PROXY_HOST", DEFAULT_HOST),
    "port": int(os.environ.get("PROXY_PORT", DEFAULT_PORT)),
    "debug": os.environ.get("PROXY_DEBUG", "").lower() in ("true", "1", "yes"),
}


class OpenAIError(Exception):
    """Base exception for OpenAI API errors."""
    def __init__(self, message: str, status_code: int = 500, headers: Dict = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.headers = headers or {}


def debug_print(*args, **kwargs):
    """Print debug information if debug mode is enabled."""
    if config["debug"]:
        print("[DEBUG]", *args, **kwargs)


def make_request(
    method: str,
    url: str,
    headers: Dict[str, str] = None,
    data: Dict[str, Any] = None,
    stream: bool = False,
) -> Union[Tuple[Dict[str, Any], Dict[str, str]], Tuple[bytes, Dict[str, str]]]:
    """
    Make an HTTP request to the specified URL.
    
    Args:
        method: HTTP method (GET, POST, etc.)
        url: URL to request
        headers: HTTP headers
        data: Request body data (will be JSON-encoded)
        stream: Whether to return the raw response instead of parsing JSON
        
    Returns:
        Tuple of (response_data, response_headers)
        
    Raises:
        OpenAIError: If the request fails
    """
    headers = headers or {}
    
    # Prepare request
    if data is not None:
        data = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
    
    # Create request object
    req = urllib.request.Request(
        url=url,
        data=data,
        headers=headers,
        method=method
    )
    
    try:
        # Send request
        with urllib.request.urlopen(req) as response:
            response_headers = dict(response.getheaders())
            
            if stream:
                # Return raw response for streaming
                return response.read(), response_headers
            else:
                # Parse JSON response
                response_data = response.read().decode("utf-8")
                try:
                    return json.loads(response_data), response_headers
                except json.JSONDecodeError:
                    return {"error": "Invalid JSON response"}, response_headers
    
    except urllib.error.HTTPError as e:
        # Handle HTTP errors
        error_body = e.read().decode("utf-8")
        try:
            error_json = json.loads(error_body)
            error_message = error_json.get("error", {}).get("message", error_body)
        except json.JSONDecodeError:
            error_message = error_body
        
        raise OpenAIError(
            message=error_message,
            status_code=e.code,
            headers=dict(e.headers)
        )
    
    except (urllib.error.URLError, socket.error) as e:
        # Handle connection errors
        raise OpenAIError(
            message=f"Connection error: {str(e)}",
            status_code=HTTPStatus.BAD_GATEWAY
        )


class OpenAIProxyHandler(http.server.BaseHTTPRequestHandler):
    """HTTP request handler for the OpenAI API proxy."""
    
    def _send_response(self, status_code: int, body: Union[str, bytes], headers: Dict[str, str] = None):
        """Send an HTTP response with the specified status code, body, and headers."""
        self.send_response(status_code)
        
        # Set headers
        headers = headers or {}
        for name, value in headers.items():
            self.send_header(name, value)
        
        # Set content type if not already set
        if "Content-Type" not in headers:
            self.send_header("Content-Type", "application/json")
        
        # Set content length if body is provided
        if body:
            if isinstance(body, str):
                body = body.encode("utf-8")
            self.send_header("Content-Length", str(len(body)))
        
        self.end_headers()
        
        # Send body if provided
        if body:
            self.wfile.write(body)
    
    def _send_error_response(self, error: OpenAIError):
        """Send an error response with the specified error."""
        error_json = {
            "error": {
                "message": error.message,
                "type": "proxy_error",
                "code": error.status_code
            }
        }
        
        self._send_response(
            status_code=error.status_code,
            body=json.dumps(error_json),
            headers=error.headers
        )
    
    def _get_request_body(self) -> Dict[str, Any]:
        """Get the request body as a JSON object."""
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length == 0:
            return {}
        
        body = self.rfile.read(content_length)
        try:
            return json.loads(body.decode("utf-8"))
        except json.JSONDecodeError:
            raise OpenAIError(
                message="Invalid JSON in request body",
                status_code=HTTPStatus.BAD_REQUEST
            )
    
    def _proxy_request(self, target_path: str, streaming: bool = False):
        """Proxy a request to the OpenAI API."""
        # Get request body
        try:
            body = self._get_request_body()
        except OpenAIError as e:
            return self._send_error_response(e)
        
        # Check if streaming is requested
        if "stream" in body and body["stream"] and not streaming:
            streaming = True
        
        # Prepare headers
        headers = {
            "Authorization": f"Bearer {config['api_key']}",
            "User-Agent": f"OpenAI-API-Proxy/{VERSION}",
        }
        
        # Copy relevant headers from the original request
        for header in ["Content-Type", "OpenAI-Organization", "OpenAI-Beta"]:
            if header in self.headers:
                headers[header] = self.headers[header]
        
        # Construct target URL
        target_url = f"{config['base_url']}{target_path}"
        
        debug_print(f"Proxying request to {target_url}")
        debug_print(f"Headers: {headers}")
        debug_print(f"Body: {body}")
        
        try:
            if streaming:
                self._handle_streaming_request(target_url, headers, body)
            else:
                self._handle_regular_request(target_url, headers, body)
        except OpenAIError as e:
            self._send_error_response(e)
        except Exception as e:
            self._send_error_response(OpenAIError(
                message=f"Proxy error: {str(e)}",
                status_code=HTTPStatus.INTERNAL_SERVER_ERROR
            ))
    
    def _handle_regular_request(self, target_url: str, headers: Dict[str, str], body: Dict[str, Any]):
        """Handle a regular (non-streaming) request."""
        response_data, response_headers = make_request(
            method=self.command,
            url=target_url,
            headers=headers,
            data=body if self.command in ["POST", "PUT", "PATCH"] else None
        )
        
        self._send_response(
            status_code=HTTPStatus.OK,
            body=json.dumps(response_data),
            headers=response_headers
        )
    
    def _handle_streaming_request(self, target_url: str, headers: Dict[str, str], body: Dict[str, Any]):
        """Handle a streaming request."""
        # Ensure stream is set to True in the request body
        body["stream"] = True
        
        # Make request to OpenAI API
        try:
            # For streaming, we need to make a custom request to handle the SSE format
            req = urllib.request.Request(
                url=target_url,
                data=json.dumps(body).encode("utf-8"),
                headers=headers,
                method="POST"
            )
            
            with urllib.request.urlopen(req) as response:
                # Send initial response headers
                self.send_response(HTTPStatus.OK)
                self.send_header("Content-Type", "text/event-stream")
                self.send_header("Cache-Control", "no-cache")
                self.send_header("Connection", "keep-alive")
                self.end_headers()
                
                # Stream the response
                buffer = b""
                while True:
                    chunk = response.read(1)
                    if not chunk:
                        break
                    
                    buffer += chunk
                    if buffer.endswith(b"\n\n"):
                        # Forward the event to the client
                        self.wfile.write(buffer)
                        self.wfile.flush()
                        buffer = b""
                
                # Send any remaining data
                if buffer:
                    self.wfile.write(buffer)
                    self.wfile.flush()
        
        except urllib.error.HTTPError as e:
            # Handle HTTP errors
            error_body = e.read().decode("utf-8")
            try:
                error_json = json.loads(error_body)
                error_message = error_json.get("error", {}).get("message", error_body)
            except json.JSONDecodeError:
                error_message = error_body
            
            # For streaming, we need to send the error as an SSE event
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/event-stream")
            self.end_headers()
            
            error_event = f"data: {json.dumps({'error': {'message': error_message}})}\n\n"
            self.wfile.write(error_event.encode("utf-8"))
            self.wfile.flush()
        
        except Exception as e:
            # For streaming, we need to send the error as an SSE event
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/event-stream")
            self.end_headers()
            
            error_event = f"data: {json.dumps({'error': {'message': str(e)}})}\n\n"
            self.wfile.write(error_event.encode("utf-8"))
            self.wfile.flush()
    
    def do_GET(self):
        """Handle GET requests."""
        if self.path == "/v1/models":
            self._proxy_request(self.path)
        elif self.path == "/health":
            self._send_response(
                status_code=HTTPStatus.OK,
                body=json.dumps({"status": "ok"})
            )
        else:
            self._send_response(
                status_code=HTTPStatus.NOT_FOUND,
                body=json.dumps({"error": {"message": "Not found"}})
            )
    
    def do_POST(self):
        """Handle POST requests."""
        if self.path.startswith("/v1/"):
            # Check if this is a streaming endpoint
            streaming = False
            if self.path in ["/v1/chat/completions", "/v1/completions"]:
                # These endpoints support streaming
                streaming = True
            
            self._proxy_request(self.path, streaming=streaming)
        else:
            self._send_response(
                status_code=HTTPStatus.NOT_FOUND,
                body=json.dumps({"error": {"message": "Not found"}})
            )
    
    def log_message(self, format, *args):
        """Override log_message to use our debug_print function."""
        if config["debug"]:
            super().log_message(format, *args)


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="OpenAI API Proxy")
    parser.add_argument("--port", type=int, default=config["port"],
                        help=f"Port to listen on (default: {DEFAULT_PORT})")
    parser.add_argument("--host", type=str, default=config["host"],
                        help=f"Host to listen on (default: {DEFAULT_HOST})")
    parser.add_argument("--api-key", type=str, default=config["api_key"],
                        help="OpenAI API key (default: from OPENAI_API_KEY env var)")
    parser.add_argument("--base-url", type=str, default=config["base_url"],
                        help=f"OpenAI API base URL (default: {DEFAULT_BASE_URL})")
    parser.add_argument("--debug", action="store_true", default=config["debug"],
                        help="Enable debug output")
    
    args = parser.parse_args()
    
    # Update config with parsed arguments
    config["port"] = args.port
    config["host"] = args.host
    config["api_key"] = args.api_key
    config["base_url"] = args.base_url
    config["debug"] = args.debug


def main():
    """Main entry point."""
    parse_args()
    
    # Check if API key is provided
    if not config["api_key"]:
        print("Warning: No OpenAI API key provided. Set OPENAI_API_KEY environment variable or use --api-key.")
    
    # Create and start the server
    server = http.server.ThreadingHTTPServer((config["host"], config["port"]), OpenAIProxyHandler)
    
    print(f"Starting OpenAI API Proxy on http://{config['host']}:{config['port']}")
    print(f"Proxying requests to {config['base_url']}")
    print("Press Ctrl+C to stop the server")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
        server.server_close()


if __name__ == "__main__":
    main()
\`\`\`

## Example Usage

### Basic Usage

1. Save the script to a file named \`api-proxy.py\`
2. Set your OpenAI API key as an environment variable:
   \`\`\`bash
   export OPENAI_API_KEY=your_api_key_here
   \`\`\`
3. Run the proxy server:
   \`\`\`bash
   python api-proxy.py
   \`\`\`
4. The proxy will be available at \`http://localhost:8000\`

### Using with OpenAI Python Client

\`\`\`python
from openai import OpenAI

# Configure the client to use the proxy
client = OpenAI(
    api_key="your_api_key_here",  # Will be replaced by the proxy
    base_url="http://localhost:8000"
)

# Use the client as usual
response = client.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Hello, world!"}
    ]
)

print(response.choices[0].message.content)
\`\`\`

### Using with curl

\`\`\`bash
curl http://localhost:8000/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Hello, world!"}
    ]
  }'
\`\`\`

## Advanced Configuration

### Command Line Arguments

\`\`\`bash
python api-proxy.py --port 9000 --host 0.0.0.0 --api-key your_api_key_here --base-url https://api.openai.com --debug
\`\`\`

### Environment Variables

- \`OPENAI_API_KEY\`: Your OpenAI API key
- \`OPENAI_BASE_URL\`: Base URL for OpenAI API (default: https://api.openai.com)
- \`PROXY_HOST\`: Host to bind the proxy server (default: localhost)
- \`PROXY_PORT\`: Port to bind the proxy server (default: 8000)
- \`PROXY_DEBUG\`: Enable debug output (set to "true", "1", or "yes")

## Supported Endpoints

- \`/v1/chat/completions\`: Chat completions API (including streaming)
- \`/v1/completions\`: Completions API (including streaming)
- \`/v1/models\`: List available models
- \`/health\`: Health check endpoint

## Security Considerations

- This proxy forwards your API key to OpenAI
- It's recommended to run this proxy on localhost only
- For production use, consider adding authentication and TLS
`
};
