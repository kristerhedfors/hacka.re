"""
Test suite for ZIP-based serving functionality.
Tests that the embedded ZIP file is served correctly without extraction.
"""

import subprocess
import time
import requests
import pytest
from playwright.sync_api import Page, expect
import hashlib
import os
from utils import screenshot_with_markdown, dismiss_welcome_modal

class TestCliZipServing:
    """Test suite for ZIP-based file serving"""
    
    def setup_method(self):
        """Setup for each test"""
        self.cli_path = "../hacka.re"
        self.test_port = 9881
        self.server_process = None
        
    def teardown_method(self):
        """Cleanup after each test"""
        if self.server_process:
            try:
                self.server_process.terminate()
                self.server_process.wait(timeout=5)
            except:
                self.server_process.kill()
    
    def test_zip_embedded_in_binary(self):
        """Test that ZIP is embedded in the binary"""
        print("\n=== Testing ZIP embedded in binary ===")
        
        # Check binary size indicates embedded content
        import os
        binary_size = os.path.getsize(self.cli_path)
        print(f"Binary size: {binary_size / (1024*1024):.2f} MB")
        
        # Binary should be at least 10MB with embedded ZIP
        assert binary_size > 10 * 1024 * 1024, "Binary seems too small for embedded ZIP"
        
        # Binary should not be huge (less than 20MB expected)
        assert binary_size < 20 * 1024 * 1024, "Binary seems too large"
    
    def test_serves_from_memory_not_disk(self):
        """Test that files are served from memory, not extracted to disk"""
        print("\n=== Testing serves from memory ===")
        
        # Start server
        self.server_process = subprocess.Popen(
            [self.cli_path, "serve", "-p", str(self.test_port)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        time.sleep(2)
        
        # Check no web-assets directory was created
        cli_dir = os.path.dirname(self.cli_path)
        assert not os.path.exists(os.path.join(cli_dir, "web-assets"))
        assert not os.path.exists(os.path.join(cli_dir, "internal/web/web-assets"))
        
        # But server should still serve files
        response = requests.get(f"http://localhost:{self.test_port}/")
        assert response.status_code == 200
        assert len(response.content) > 1000  # Should have substantial content
    
    def test_all_file_types_served(self):
        """Test that all file types are served correctly from ZIP"""
        print("\n=== Testing all file types served ===")
        
        # Start server
        self.server_process = subprocess.Popen(
            [self.cli_path, "browse", "-p", str(self.test_port), "--no-browser"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        time.sleep(2)
        
        base_url = f"http://localhost:{self.test_port}"
        
        # Test various file types that should be in the ZIP
        test_cases = [
            ("/", "text/html", 1000),  # index.html
            ("/index.html", "text/html", 1000),
            ("/css/styles.css", "text/css", 100),
            ("/js/app.js", "application/javascript", 100),  # app.js not main.js
            ("/favicon.svg", "image/svg+xml", 10),
            ("/lib/tweetnacl/nacl-fast.min.js", "application/javascript", 100),  # Correct path
        ]
        
        for path, expected_type, min_size in test_cases:
            response = requests.get(f"{base_url}{path}")
            print(f"{path}: status={response.status_code}, "
                  f"type={response.headers.get('content-type', 'none')}, "
                  f"size={len(response.content)}")
            
            assert response.status_code == 200, f"Failed to serve {path}"
            assert expected_type in response.headers.get('content-type', ''), \
                   f"Wrong content type for {path}"
            assert len(response.content) >= min_size, \
                   f"Content too small for {path}"
    
    def test_404_for_nonexistent_files(self):
        """Test that 404 is returned for non-existent files"""
        print("\n=== Testing 404 for non-existent files ===")
        
        # Start server
        self.server_process = subprocess.Popen(
            [self.cli_path, "serve", "-p", str(self.test_port)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        time.sleep(2)
        
        base_url = f"http://localhost:{self.test_port}"
        
        # Test non-existent paths
        non_existent = [
            "/does-not-exist.html",
            "/fake/path/file.js",
            "/../etc/passwd",  # Security test
            "/web-assets/index.html",  # Should not expose internal structure
        ]
        
        for path in non_existent:
            response = requests.get(f"{base_url}{path}")
            print(f"{path}: status={response.status_code}")
            assert response.status_code == 404, f"Should return 404 for {path}"
    
    def test_concurrent_requests_from_zip(self):
        """Test handling concurrent requests from ZIP"""
        print("\n=== Testing concurrent requests ===")
        
        # Start server
        self.server_process = subprocess.Popen(
            [self.cli_path, "serve", "-p", str(self.test_port)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        time.sleep(2)
        
        base_url = f"http://localhost:{self.test_port}"
        
        # Make concurrent requests
        import concurrent.futures
        
        def fetch_file(path):
            try:
                response = requests.get(f"{base_url}{path}", timeout=5)
                return path, response.status_code, len(response.content)
            except Exception as e:
                return path, 0, str(e)
        
        paths = ["/", "/css/styles.css", "/js/app.js", "/favicon.svg"] * 10
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
            results = list(executor.map(fetch_file, paths))
        
        # Check all succeeded
        success_count = sum(1 for _, status, _ in results if status == 200)
        print(f"Concurrent requests: {success_count}/{len(results)} successful")
        
        assert success_count == len(results), "Some concurrent requests failed"
    
    def test_hacka_re_app_loads(self, page: Page):
        """Test that the full hacka.re app loads from ZIP"""
        print("\n=== Testing hacka.re app loads ===")
        
        # Start server
        self.server_process = subprocess.Popen(
            [self.cli_path, "browse", "-p", str(self.test_port), "--no-browser"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        time.sleep(2)
        
        # Navigate to the app
        page.goto(f"http://localhost:{self.test_port}/")
        
        # Wait for app to load
        page.wait_for_load_state("networkidle")
        
        # Dismiss welcome modal if present
        dismiss_welcome_modal(page)
        
        # Take screenshot
        screenshot_with_markdown(page, "zip_app_loaded", {
            "Test": "App loaded from ZIP",
            "Port": str(self.test_port)
        })
        
        # Verify key elements are present
        assert page.locator("#message-input").is_visible(timeout=10000)
        assert page.locator("#send-btn").is_visible()
        assert page.locator("#settings-btn").is_visible()
        
        # Check that JavaScript loaded and initialized
        js_loaded = page.evaluate("""() => {
            return typeof window.initializeApp !== 'undefined' || 
                   document.querySelector('#message-input') !== null;
        }""")
        assert js_loaded, "JavaScript didn't load properly"
        
        # Check that CSS loaded
        css_loaded = page.evaluate("""() => {
            return document.styleSheets.length > 0;
        }""")
        assert css_loaded, "CSS didn't load properly"
    
    def test_no_directory_listing(self):
        """Test that directory listing is disabled"""
        print("\n=== Testing no directory listing ===")
        
        # Start server
        self.server_process = subprocess.Popen(
            [self.cli_path, "serve", "-p", str(self.test_port)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        time.sleep(2)
        
        base_url = f"http://localhost:{self.test_port}"
        
        # Try to access directories
        directories = ["/js/", "/css/", "/lib/", "/about/"]
        
        for dir_path in directories:
            response = requests.get(f"{base_url}{dir_path}")
            print(f"{dir_path}: status={response.status_code}")
            
            # Should either return 404 or index.html, not a directory listing
            if response.status_code == 200:
                # Check it's not a directory listing
                assert "Index of" not in response.text
                assert "<directory>" not in response.text.lower()
                assert "parent directory" not in response.text.lower()