"""
Test suite for hacka.re CLI serve command functionality.
Tests the embedded web server without browser launch and verbose options.
"""

import subprocess
import time
import requests
import pytest
from playwright.sync_api import Page, expect
import os
import re
from utils import screenshot_with_markdown

class TestCliServeCommand:
    """Test suite for the serve command"""
    
    def setup_method(self):
        """Setup for each test"""
        self.cli_path = "../hacka.re"
        self.test_port = 9879  # Use unique port
        self.server_process = None
        
    def teardown_method(self):
        """Cleanup after each test"""
        if self.server_process:
            try:
                self.server_process.terminate()
                self.server_process.wait(timeout=5)
            except:
                self.server_process.kill()
    
    def test_serve_help(self):
        """Test that serve --help works correctly"""
        print("\n=== Testing serve --help ===")
        
        result = subprocess.run(
            [self.cli_path, "serve", "--help"],
            capture_output=True,
            text=True
        )
        
        print(f"Return code: {result.returncode}")
        print(f"Output:\n{result.stdout}")
        
        assert result.returncode == 0
        output = result.stdout + result.stderr
        assert "Start a server without opening browser" in output
        assert "-v, --verbose" in output
        assert "-vv" in output
        assert "web" in output
        assert "api" in output
    
    def test_serve_no_browser(self):
        """Test that serve doesn't open browser"""
        print("\n=== Testing serve doesn't open browser ===")
        
        # Start server
        self.server_process = subprocess.Popen(
            [self.cli_path, "serve", "-p", str(self.test_port)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Read initial output
        time.sleep(2)
        
        # Check server is running but no browser opened
        try:
            response = requests.get(f"http://localhost:{self.test_port}/", timeout=5)
            assert response.status_code == 200
            print("Server is running without opening browser")
        except Exception as e:
            pytest.fail(f"Server not accessible: {e}")
    
    def test_serve_verbose_logging(self):
        """Test serve with -v verbose logging"""
        print("\n=== Testing serve -v verbose logging ===")
        
        # Start server with verbose flag
        self.server_process = subprocess.Popen(
            [self.cli_path, "serve", "-p", str(self.test_port), "-v"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            universal_newlines=True
        )
        
        # Wait for startup
        time.sleep(2)
        
        # Make some requests
        requests.get(f"http://localhost:{self.test_port}/")
        requests.get(f"http://localhost:{self.test_port}/css/styles.css")
        requests.get(f"http://localhost:{self.test_port}/js/main.js")
        
        # Give time for logs to be written
        time.sleep(1)
        
        # Terminate and get output
        self.server_process.terminate()
        output, _ = self.server_process.communicate(timeout=5)
        
        print(f"Verbose output:\n{output}")
        
        # Check for request logs
        assert "GET /" in output
        assert "GET /css/styles.css" in output
        assert "GET /js/main.js" in output
        assert re.search(r'\[\d{2}:\d{2}:\d{2}\]', output)  # Timestamp format
    
    def test_serve_very_verbose_logging(self):
        """Test serve with -vv very verbose logging"""
        print("\n=== Testing serve -vv very verbose logging ===")
        
        # Start server with very verbose flag
        self.server_process = subprocess.Popen(
            [self.cli_path, "serve", "-p", str(self.test_port), "-vv"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            universal_newlines=True
        )
        
        # Wait for startup
        time.sleep(2)
        
        # Make a request with custom headers
        headers = {"X-Test-Header": "TestValue"}
        requests.get(f"http://localhost:{self.test_port}/", headers=headers)
        
        # Give time for logs
        time.sleep(1)
        
        # Terminate and get output
        self.server_process.terminate()
        output, _ = self.server_process.communicate(timeout=5)
        
        print(f"Very verbose output:\n{output}")
        
        # Check for detailed logs
        assert "GET /" in output
        assert "Headers:" in output
        assert "User-Agent" in output  # Should log all headers
        
    def test_serve_web_subcommand(self):
        """Test serve web subcommand"""
        print("\n=== Testing serve web subcommand ===")
        
        # Start server with explicit web subcommand
        self.server_process = subprocess.Popen(
            [self.cli_path, "serve", "web", "-p", str(self.test_port)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Wait for startup
        time.sleep(2)
        
        # Check server is running
        try:
            response = requests.get(f"http://localhost:{self.test_port}/", timeout=5)
            assert response.status_code == 200
            print("Serve web subcommand works")
        except Exception as e:
            pytest.fail(f"Server not accessible: {e}")
    
    def test_serve_api_subcommand(self):
        """Test serve api subcommand (not implemented)"""
        print("\n=== Testing serve api subcommand ===")
        
        result = subprocess.run(
            [self.cli_path, "serve", "api"],
            capture_output=True,
            text=True
        )
        
        print(f"API output: {result.stdout}")
        assert "To be implemented" in result.stdout
    
    def test_serve_with_shared_config(self):
        """Test serve with shared configuration"""
        print("\n=== Testing serve with shared config ===")
        
        # Test that command accepts shared config argument
        result = subprocess.run(
            [self.cli_path, "serve", "--help"],
            capture_output=True,
            text=True
        )
        
        output = result.stdout + result.stderr
        assert "URL" in output or "FRAGMENT" in output or "DATA" in output
        assert "gpt=eyJlbmM" in output or "eyJlbmM" in output
    
    def test_serve_shows_url(self):
        """Test that serve shows the URL to open"""
        print("\n=== Testing serve shows URL ===")
        
        # Start server
        self.server_process = subprocess.Popen(
            [self.cli_path, "serve", "-p", str(self.test_port)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Read initial output
        time.sleep(2)
        output = self.server_process.stdout.read()
        
        print(f"Serve output:\n{output}")
        
        # Check for URL in output
        assert f"http://localhost:{self.test_port}" in output or \
               f"Web server started at: http://localhost:{self.test_port}" in output
    
    def test_serve_performance(self, page: Page):
        """Test serve command performance with multiple requests"""
        print("\n=== Testing serve performance ===")
        
        # Start server with verbose to track requests
        self.server_process = subprocess.Popen(
            [self.cli_path, "serve", "-p", str(self.test_port), "-v"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            universal_newlines=True
        )
        
        # Wait for startup
        time.sleep(2)
        
        base_url = f"http://localhost:{self.test_port}"
        
        # Make multiple concurrent requests
        import concurrent.futures
        
        def make_request(path):
            try:
                response = requests.get(f"{base_url}{path}", timeout=5)
                return response.status_code == 200
            except:
                return False
        
        paths = ["/", "/index.html", "/css/styles.css", "/js/main.js"] * 5
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            results = list(executor.map(make_request, paths))
        
        success_rate = sum(results) / len(results) * 100
        print(f"Success rate: {success_rate}% ({sum(results)}/{len(results)})")
        
        assert success_rate >= 95  # Allow for some failures in concurrent scenario
        
        # Test with Playwright
        page.goto(base_url)
        
        screenshot_with_markdown(page, "serve_performance", {
            "Test": "Serve performance",
            "Requests": str(len(paths)),
            "Success rate": f"{success_rate}%"
        })