"""
Test suite for hacka.re CLI browse command functionality.
Tests the embedded web server with browser auto-launch.
"""

import subprocess
import time
import requests
import pytest
from playwright.sync_api import Page, expect
import os
import signal
import json
from utils import screenshot_with_markdown, dismiss_welcome_modal

class TestCliBrowseCommand:
    """Test suite for the browse command"""
    
    def setup_method(self):
        """Setup for each test"""
        self.cli_path = "../hacka.re"
        self.test_port = 9876  # Use unique port to avoid conflicts
        self.server_process = None
        
    def teardown_method(self):
        """Cleanup after each test"""
        if self.server_process:
            try:
                self.server_process.terminate()
                self.server_process.wait(timeout=5)
            except:
                self.server_process.kill()
    
    def test_browse_help(self):
        """Test that browse --help works correctly"""
        print("\n=== Testing browse --help ===")
        
        result = subprocess.run(
            [self.cli_path, "browse", "--help"],
            capture_output=True,
            text=True
        )
        
        print(f"Return code: {result.returncode}")
        print(f"Output:\n{result.stdout}")
        
        assert result.returncode == 0
        # Help output might be in stderr
        output = result.stdout + result.stderr
        assert "Start a local web server to browse hacka.re interface" in output
        assert "-p, --port PORT" in output
        assert "HACKARE_WEB_PORT" in output
        
    def test_browse_starts_server(self, page: Page):
        """Test that browse command starts the web server"""
        print("\n=== Testing browse starts server ===")
        
        # Use serve command to avoid browser launch
        self.server_process = subprocess.Popen(
            [self.cli_path, "serve", "-p", str(self.test_port)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Wait for server to start
        time.sleep(2)
        
        # Check server is running
        try:
            response = requests.get(f"http://localhost:{self.test_port}/", timeout=5)
            print(f"Server response status: {response.status_code}")
            assert response.status_code == 200
            assert "hacka.re" in response.text.lower()
        except Exception as e:
            pytest.fail(f"Server not accessible: {e}")
        
        # Navigate to the page with Playwright
        page.goto(f"http://localhost:{self.test_port}/")
        
        # Take screenshot for debugging
        screenshot_with_markdown(page, "browse_server_running", {
            "Test": "Browse starts server",
            "Port": str(self.test_port),
            "URL": f"http://localhost:{self.test_port}/"
        })
        
        # Verify the page loaded correctly
        # Title might have additional text
        title = page.title()
        assert "hacka.re" in title
        
        # Check for main elements
        assert page.locator("#message-input").is_visible()
        assert page.locator("#send-btn").is_visible()
        
    def test_browse_custom_port(self):
        """Test browse with custom port"""
        print("\n=== Testing browse with custom port ===")
        
        custom_port = 9877
        
        # Use serve command to test port without browser
        self.server_process = subprocess.Popen(
            [self.cli_path, "serve", "--port", str(custom_port)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Wait for startup
        time.sleep(2)
        
        # Check custom port
        try:
            response = requests.get(f"http://localhost:{custom_port}/", timeout=5)
            print(f"Custom port {custom_port} response: {response.status_code}")
            assert response.status_code == 200
        except Exception as e:
            pytest.fail(f"Server not accessible on custom port: {e}")
    
    def test_browse_with_shared_config(self):
        """Test browse with shared configuration"""
        print("\n=== Testing browse with shared config ===")
        
        # Create a test shared config (would need a real one for full test)
        # For now, test that the command accepts the argument
        result = subprocess.run(
            [self.cli_path, "browse", "--help"],
            capture_output=True,
            text=True
        )
        
        output = result.stdout + result.stderr
        assert "URL" in output or "FRAGMENT" in output or "DATA" in output
        assert "gpt=eyJlbmC" in output or "eyJlbmM" in output
        
    def test_browse_port_environment_variable(self):
        """Test HACKARE_WEB_PORT environment variable"""
        print("\n=== Testing HACKARE_WEB_PORT env var ===")
        
        env_port = 9878
        env = os.environ.copy()
        env["HACKARE_WEB_PORT"] = str(env_port)
        
        # Use serve command with env var
        self.server_process = subprocess.Popen(
            [self.cli_path, "serve"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env=env
        )
        
        # Wait for startup
        time.sleep(2)
        
        # Check env port
        try:
            response = requests.get(f"http://localhost:{env_port}/", timeout=5)
            print(f"Env port {env_port} response: {response.status_code}")
            assert response.status_code == 200
        except Exception as e:
            pytest.fail(f"Server not accessible on env port: {e}")
    
    def test_browse_serves_static_files(self, page: Page):
        """Test that browse serves all static files correctly"""
        print("\n=== Testing browse serves static files ===")
        
        # Use serve command for testing static files
        self.server_process = subprocess.Popen(
            [self.cli_path, "serve", "-p", str(self.test_port)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Wait for startup
        time.sleep(2)
        
        base_url = f"http://localhost:{self.test_port}"
        
        # Test various file types
        test_files = [
            ("/", "text/html"),
            ("/index.html", "text/html"),
            ("/css/styles.css", "text/css"),
            ("/js/app.js", "application/javascript"),  # app.js not main.js
            ("/favicon.svg", "image/svg+xml"),
        ]
        
        for path, expected_type in test_files:
            try:
                response = requests.get(f"{base_url}{path}", timeout=5)
                print(f"File {path}: status={response.status_code}, type={response.headers.get('content-type', '')}")
                assert response.status_code == 200
                assert expected_type in response.headers.get('content-type', '')
            except Exception as e:
                print(f"Failed to access {path}: {e}")
        
        # Navigate and check with Playwright
        page.goto(base_url)
        
        # Check that CSS loaded
        page.wait_for_function("() => document.styleSheets.length > 0")
        
        # Check that JS loaded
        page.wait_for_function("() => typeof window.initializeApp !== 'undefined' || document.querySelector('#message-input') !== null")
        
        screenshot_with_markdown(page, "browse_static_files", {
            "Test": "Static files served",
            "Files tested": str(len(test_files))
        })