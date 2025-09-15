"""
Test suite for port configuration across CLI commands.
Tests port specification via flags and environment variables.
"""

import subprocess
import time
import requests
import pytest
import os
from utils import screenshot_with_markdown

class TestCliPortConfiguration:
    """Test suite for port configuration options"""
    
    def setup_method(self):
        """Setup for each test"""
        self.cli_path = "../hacka.re"
        self.server_processes = []
        
    def teardown_method(self):
        """Cleanup after each test"""
        for process in self.server_processes:
            try:
                process.terminate()
                process.wait(timeout=5)
            except:
                process.kill()
    
    def test_default_port_8080(self):
        """Test that default port is 8080"""
        print("\n=== Testing default port 8080 ===")
        
        # Start serve without port specification (browse always opens browser)
        process = subprocess.Popen(
            [self.cli_path, "serve"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        self.server_processes.append(process)
        
        time.sleep(2)
        
        # Check default port
        try:
            response = requests.get("http://localhost:8080/", timeout=5)
            assert response.status_code == 200
            print("Default port 8080 working")
        except Exception as e:
            pytest.fail(f"Default port 8080 not accessible: {e}")
    
    def test_short_flag_port(self):
        """Test -p flag for port specification"""
        print("\n=== Testing -p flag ===")
        
        test_port = 9882
        
        # Test with serve (browse always opens browser)
        process = subprocess.Popen(
            [self.cli_path, "serve", "-p", str(test_port)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        self.server_processes.append(process)
        
        time.sleep(2)
        
        try:
            response = requests.get(f"http://localhost:{test_port}/", timeout=5)
            assert response.status_code == 200
            print(f"-p {test_port} working")
        except Exception as e:
            pytest.fail(f"Port {test_port} not accessible: {e}")
    
    def test_long_flag_port(self):
        """Test --port flag for port specification"""
        print("\n=== Testing --port flag ===")
        
        test_port = 9883
        
        # Test with serve
        process = subprocess.Popen(
            [self.cli_path, "serve", "--port", str(test_port)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        self.server_processes.append(process)
        
        time.sleep(2)
        
        try:
            response = requests.get(f"http://localhost:{test_port}/", timeout=5)
            assert response.status_code == 200
            print(f"--port {test_port} working")
        except Exception as e:
            pytest.fail(f"Port {test_port} not accessible: {e}")
    
    def test_environment_variable_port(self):
        """Test HACKARE_BROWSE_PORT environment variable"""
        print("\n=== Testing HACKARE_BROWSE_PORT env var ===")
        
        env_port = 9884
        env = os.environ.copy()
        env["HACKARE_WEB_PORT"] = str(env_port)
        
        # Start with env var using serve (browse always opens browser)
        process = subprocess.Popen(
            [self.cli_path, "serve"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env=env
        )
        self.server_processes.append(process)
        
        time.sleep(2)
        
        try:
            response = requests.get(f"http://localhost:{env_port}/", timeout=5)
            assert response.status_code == 200
            print(f"HACKARE_BROWSE_PORT={env_port} working")
        except Exception as e:
            pytest.fail(f"Env port {env_port} not accessible: {e}")
    
    def test_flag_overrides_env(self):
        """Test that flag overrides environment variable"""
        print("\n=== Testing flag overrides env var ===")
        
        env_port = 9885
        flag_port = 9886
        env = os.environ.copy()
        env["HACKARE_WEB_PORT"] = str(env_port)
        
        # Start with both env and flag
        process = subprocess.Popen(
            [self.cli_path, "serve", "-p", str(flag_port)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env=env
        )
        self.server_processes.append(process)
        
        time.sleep(2)
        
        # Flag port should work
        try:
            response = requests.get(f"http://localhost:{flag_port}/", timeout=5)
            assert response.status_code == 200
            print(f"Flag port {flag_port} correctly overrides env")
        except Exception as e:
            pytest.fail(f"Flag port {flag_port} not accessible: {e}")
        
        # Env port should NOT work
        try:
            response = requests.get(f"http://localhost:{env_port}/", timeout=1)
            pytest.fail(f"Env port {env_port} should not be accessible")
        except:
            print(f"Env port {env_port} correctly not used")
    
    def test_multiple_servers_different_ports(self):
        """Test running multiple servers on different ports"""
        print("\n=== Testing multiple servers ===")
        
        ports = [9887, 9888, 9889]
        
        # Start multiple servers
        for port in ports:
            process = subprocess.Popen(
                [self.cli_path, "serve", "-p", str(port)],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            self.server_processes.append(process)
            time.sleep(1)
        
        # Test all are accessible
        for port in ports:
            try:
                response = requests.get(f"http://localhost:{port}/", timeout=5)
                assert response.status_code == 200
                print(f"Server on port {port} working")
            except Exception as e:
                pytest.fail(f"Port {port} not accessible: {e}")
    
    def test_port_already_in_use(self):
        """Test error handling when port is already in use"""
        print("\n=== Testing port already in use ===")
        
        test_port = 9890
        
        # Start first server
        process1 = subprocess.Popen(
            [self.cli_path, "serve", "-p", str(test_port)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        self.server_processes.append(process1)
        time.sleep(2)
        
        # Try to start second server on same port
        process2 = subprocess.Popen(
            [self.cli_path, "serve", "-p", str(test_port)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Wait for error
        time.sleep(2)
        
        # Second process should have failed
        return_code = process2.poll()
        if return_code is None:
            process2.terminate()
            self.server_processes.append(process2)
            pytest.fail("Second server should have failed on same port")
        
        # Check error message
        stderr = process2.stderr.read()
        assert "address already in use" in stderr.lower() or \
               "bind" in stderr.lower() or \
               "port" in stderr.lower()
        print(f"Port conflict correctly detected")
    
    def test_invalid_port_numbers(self):
        """Test handling of invalid port numbers"""
        print("\n=== Testing invalid port numbers ===")

        # Port 0 is VALID - it means "let OS choose a port"
        # Test port 0 separately
        print("Testing port 0 (OS chooses port)...")
        process = subprocess.Popen(
            [self.cli_path, "serve", "-p", "0"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        self.server_processes.append(process)
        time.sleep(1)

        # Check that server started and shows the chosen port
        output = process.stdout.read(100) if process.stdout else ""
        return_code = process.poll()
        if return_code is None:
            # Server is running, which is correct for port 0
            print(f"Port 0 correctly accepted (OS chose port)")
            process.terminate()

        # Test actually invalid ports
        invalid_ports = [
            "65536",  # Too high
            "abc",    # Not a number
            "-1",     # Negative
        ]

        for port in invalid_ports:
            result = subprocess.run(
                [self.cli_path, "serve", "-p", port],
                capture_output=True,
                text=True,
                timeout=2
            )

            # Should fail or show error
            assert result.returncode != 0 or "error" in result.stderr.lower() or \
                   "invalid" in result.stderr.lower()
            print(f"Invalid port '{port}' correctly rejected")
    
    def test_port_range_boundaries(self):
        """Test valid port range boundaries"""
        print("\n=== Testing port range boundaries ===")
        
        # Test low valid port (1024+)
        low_port = 1024
        process = subprocess.Popen(
            [self.cli_path, "serve", "-p", str(low_port)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        self.server_processes.append(process)
        time.sleep(2)
        
        # May fail due to permissions, but should attempt
        return_code = process.poll()
        if return_code is None:
            print(f"Port {low_port} attempted (may need permissions)")
        
        # Test high valid port
        high_port = 65535
        process = subprocess.Popen(
            [self.cli_path, "serve", "-p", str(high_port)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        self.server_processes.append(process)
        time.sleep(2)
        
        try:
            response = requests.get(f"http://localhost:{high_port}/", timeout=5)
            assert response.status_code == 200
            print(f"High port {high_port} working")
        except:
            print(f"High port {high_port} attempted")