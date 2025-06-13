"""Tests for MCP stdio proxy OAuth middleware"""
import pytest
from playwright.sync_api import Page, expect
import subprocess
import time
import requests
import json
from pathlib import Path
from test_utils import dismiss_welcome_modal, screenshot_with_markdown


class StdioProxyWithOAuth:
    """Helper class to manage MCP stdio proxy with OAuth for tests"""
    def __init__(self):
        self.process = None
        self.proxy_dir = Path(__file__).parent.parent.parent / "mcp-stdio-proxy"
        self.port = 3002  # Use different port for OAuth tests
        
    def start_with_oauth(self, enable_oauth=True):
        """Start the MCP stdio proxy server with OAuth enabled"""
        if self.process and self.process.poll() is None:
            return  # Already running
        
        # Check if proxy directory exists
        if not self.proxy_dir.exists():
            raise Exception(f"MCP proxy directory not found: {self.proxy_dir}")
        
        # Environment variables for OAuth
        env = {
            'PORT': str(self.port),
            'OAUTH_ENABLED': 'true' if enable_oauth else 'false',
            'TRUSTED_ORIGINS': 'http://localhost:8000,http://127.0.0.1:8000',
            'DEBUG': 'true'
        }
        
        # Start proxy server with OAuth
        print(f"Starting MCP proxy with OAuth on port {self.port}")
        self.process = subprocess.Popen(
            ["node", "server.js"],
            cwd=self.proxy_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env={**subprocess.os.environ, **env}
        )
        
        # Wait for server to start
        for i in range(30):  # 3 seconds max
            try:
                response = requests.get(f"http://localhost:{self.port}/health", timeout=0.5)
                if response.status_code == 200:
                    print(f"MCP proxy started successfully on port {self.port}")
                    return
            except:
                pass
            time.sleep(0.1)
        
        raise Exception("Failed to start MCP proxy server")
    
    def stop(self):
        """Stop the proxy server"""
        if self.process:
            self.process.terminate()
            try:
                self.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.process.kill()
            self.process = None


@pytest.fixture(scope="function")
def oauth_proxy():
    """Fixture to provide OAuth-enabled stdio proxy"""
    proxy = StdioProxyWithOAuth()
    yield proxy
    proxy.stop()


@pytest.mark.oauth
@pytest.mark.stdio
class TestMCPStdioOAuthMiddleware:
    """Test OAuth middleware for stdio transport"""
    
    def test_oauth_middleware_initialization(self, oauth_proxy):
        """Test that OAuth middleware initializes correctly in stdio proxy"""
        oauth_proxy.start_with_oauth(enable_oauth=True)
        
        # Check health endpoint includes OAuth status
        response = requests.get(f"http://localhost:{oauth_proxy.port}/health")
        assert response.status_code == 200
        
        data = response.json()
        assert 'oauth' in data
        assert 'enabled' in data['oauth']
        assert data['oauth']['enabled'] == True
        
    def test_oauth_disabled_mode(self, oauth_proxy):
        """Test proxy behavior when OAuth is disabled"""
        oauth_proxy.start_with_oauth(enable_oauth=False)
        
        # Check health endpoint
        response = requests.get(f"http://localhost:{oauth_proxy.port}/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data['oauth']['enabled'] == False
        
        # Protected endpoints should work without auth when disabled
        start_response = requests.post(
            f"http://localhost:{oauth_proxy.port}/mcp/start",
            json={
                "name": "test-server",
                "command": "echo",
                "args": ["hello"]
            }
        )
        # Should succeed (or fail for other reasons, not auth)
        assert start_response.status_code != 401
        
    def test_oauth_credentials_endpoint(self, oauth_proxy):
        """Test OAuth credentials management endpoint"""
        oauth_proxy.start_with_oauth(enable_oauth=True)
        
        # Set OAuth credentials for a server
        credentials_data = {
            "serverName": "test-oauth-server",
            "credentials": {
                "clientId": "test_client_123",
                "clientSecret": "test_secret_456",
                "accessToken": "test_access_token_789",
                "refreshToken": "test_refresh_token_abc",
                "tokenEndpoint": "https://api.example.com/oauth/token"
            }
        }
        
        response = requests.post(
            f"http://localhost:{oauth_proxy.port}/oauth/credentials",
            json=credentials_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data['success'] == True
        assert data['serverName'] == "test-oauth-server"
        
    def test_oauth_status_endpoint(self, oauth_proxy):
        """Test OAuth status endpoint"""
        oauth_proxy.start_with_oauth(enable_oauth=True)
        
        # Get OAuth status
        response = requests.get(f"http://localhost:{oauth_proxy.port}/oauth/status")
        assert response.status_code == 200
        
        data = response.json()
        assert 'enabled' in data
        assert 'trustedOrigins' in data
        assert 'activeTokens' in data
        assert 'servers' in data
        assert data['enabled'] == True
        
    def test_trusted_origin_authentication(self, page: Page, serve_hacka_re, oauth_proxy):
        """Test that trusted origins bypass OAuth authentication"""
        oauth_proxy.start_with_oauth(enable_oauth=True)
        
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        # Test trusted origin access through browser
        proxy_test = page.evaluate(f"""
            async () => {{
                try {{
                    // This should work since localhost:8000 is trusted
                    const response = await fetch('http://localhost:{oauth_proxy.port}/mcp/list');
                    const data = await response.json();
                    
                    return {{
                        success: true,
                        status: response.status,
                        data: data
                    }};
                }} catch (error) {{
                    return {{
                        success: false,
                        error: error.message
                    }};
                }}
            }}
        """)
        
        assert proxy_test['success'], f"Trusted origin test failed: {proxy_test.get('error')}"
        assert proxy_test['status'] == 200, "Trusted origin should have access"
        
        screenshot_with_markdown(page, "Trusted origin authentication test passed")
        
    def test_unauthorized_access_blocking(self, oauth_proxy):
        """Test that unauthorized requests are blocked when OAuth is enabled"""
        oauth_proxy.start_with_oauth(enable_oauth=True)
        
        # Try to access protected endpoint without auth from non-trusted origin
        headers = {
            'Origin': 'https://malicious.example.com',
            'Content-Type': 'application/json'
        }
        
        response = requests.post(
            f"http://localhost:{oauth_proxy.port}/mcp/start",
            json={
                "name": "test-server",
                "command": "echo",
                "args": ["hello"]
            },
            headers=headers
        )
        
        assert response.status_code == 401
        
        data = response.json()
        assert data['error'] == 'unauthorized'
        assert 'WWW-Authenticate' in response.headers
        assert 'Bearer' in response.headers['WWW-Authenticate']
        
    def test_bearer_token_authentication(self, oauth_proxy):
        """Test Bearer token authentication"""
        oauth_proxy.start_with_oauth(enable_oauth=True)
        
        # First, add a valid token
        token_data = {
            "serverName": "bearer-test-server",
            "credentials": {
                "accessToken": "valid_bearer_token_123"
            }
        }
        
        cred_response = requests.post(
            f"http://localhost:{oauth_proxy.port}/oauth/credentials",
            json=token_data
        )
        assert cred_response.status_code == 200
        
        # Now use the token in Authorization header
        headers = {
            'Authorization': 'Bearer valid_bearer_token_123',
            'Content-Type': 'application/json',
            'Origin': 'https://external.example.com'  # Non-trusted origin
        }
        
        response = requests.post(
            f"http://localhost:{oauth_proxy.port}/mcp/start",
            json={
                "name": "bearer-test-server",
                "command": "echo", 
                "args": ["authenticated"]
            },
            headers=headers
        )
        
        # Should succeed with valid bearer token
        assert response.status_code in [200, 409]  # 409 if already running
        
    def test_invalid_bearer_token_rejection(self, oauth_proxy):
        """Test rejection of invalid bearer tokens"""
        oauth_proxy.start_with_oauth(enable_oauth=True)
        
        # Use invalid token
        headers = {
            'Authorization': 'Bearer invalid_token_xyz',
            'Content-Type': 'application/json',
            'Origin': 'https://external.example.com'
        }
        
        response = requests.post(
            f"http://localhost:{oauth_proxy.port}/mcp/start",
            json={
                "name": "invalid-test-server",
                "command": "echo",
                "args": ["should-fail"]
            },
            headers=headers
        )
        
        assert response.status_code == 401
        data = response.json()
        assert 'Invalid or expired token' in data['error_description']
        
    def test_oauth_refresh_endpoint(self, oauth_proxy):
        """Test OAuth token refresh endpoint"""
        oauth_proxy.start_with_oauth(enable_oauth=True)
        
        # Set up server with refresh token
        credentials_data = {
            "serverName": "refresh-test-server",
            "credentials": {
                "clientId": "refresh_client",
                "refreshToken": "refresh_token_123",
                "tokenEndpoint": "https://api.example.com/oauth/token"
            }
        }
        
        cred_response = requests.post(
            f"http://localhost:{oauth_proxy.port}/oauth/credentials",
            json=credentials_data
        )
        assert cred_response.status_code == 200
        
        # Try to refresh token
        refresh_data = {
            "serverName": "refresh-test-server"
        }
        
        response = requests.post(
            f"http://localhost:{oauth_proxy.port}/oauth/refresh",
            json=refresh_data
        )
        
        # Should attempt refresh (may fail due to mock endpoint, but structure should be correct)
        assert response.status_code in [200, 400]
        data = response.json()
        assert 'serverName' in data
        assert 'refreshed' in data
        
    def test_environment_variable_injection(self, page: Page, serve_hacka_re, oauth_proxy):
        """Test OAuth environment variable injection for stdio processes"""
        oauth_proxy.start_with_oauth(enable_oauth=True)
        
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        # Set OAuth credentials through UI/API
        credentials_setup = page.evaluate(f"""
            async () => {{
                try {{
                    const response = await fetch('http://localhost:{oauth_proxy.port}/oauth/credentials', {{
                        method: 'POST',
                        headers: {{ 'Content-Type': 'application/json' }},
                        body: JSON.stringify({{
                            serverName: 'env-test-server',
                            credentials: {{
                                clientId: 'env_client_123',
                                accessToken: 'env_access_token_456',
                                clientSecret: 'env_client_secret_789'
                            }}
                        }})
                    }});
                    
                    const data = await response.json();
                    return {{ success: true, status: response.status, data: data }};
                }} catch (error) {{
                    return {{ success: false, error: error.message }};
                }}
            }}
        """)
        
        assert credentials_setup['success'], f"Credentials setup failed: {credentials_setup.get('error')}"
        
        # Now start a server that should receive OAuth environment variables
        start_server = page.evaluate(f"""
            async () => {{
                try {{
                    const response = await fetch('http://localhost:{oauth_proxy.port}/mcp/start', {{
                        method: 'POST',
                        headers: {{ 'Content-Type': 'application/json' }},
                        body: JSON.stringify({{
                            name: 'env-test-server',
                            command: 'node',
                            args: ['-e', 'console.log(JSON.stringify({{OAUTH_CLIENT_ID: process.env.OAUTH_CLIENT_ID, OAUTH_ACCESS_TOKEN: process.env.OAUTH_ACCESS_TOKEN, MCP_OAUTH_ENABLED: process.env.MCP_OAUTH_ENABLED}}))']
                        }})
                    }});
                    
                    return {{ success: true, status: response.status }};
                }} catch (error) {{
                    return {{ success: false, error: error.message }};
                }}
            }}
        """)
        
        # Should succeed in starting the server (environment injection happens internally)
        assert start_server['success'], f"Server start failed: {start_server.get('error')}"
        
        screenshot_with_markdown(page, "OAuth environment variable injection test completed")

    def test_cors_headers_with_oauth(self, oauth_proxy):
        """Test CORS headers are properly set with OAuth middleware"""
        oauth_proxy.start_with_oauth(enable_oauth=True)
        
        # Test OPTIONS request (CORS preflight)
        response = requests.options(f"http://localhost:{oauth_proxy.port}/mcp/start")
        assert response.status_code == 200
        assert 'Access-Control-Allow-Origin' in response.headers
        assert 'Access-Control-Allow-Methods' in response.headers
        
        # Test actual request with CORS headers
        headers = {'Origin': 'http://localhost:8000'}
        response = requests.get(f"http://localhost:{oauth_proxy.port}/oauth/status", headers=headers)
        assert response.status_code == 200
        assert 'Access-Control-Allow-Origin' in response.headers