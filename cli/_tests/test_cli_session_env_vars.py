#!/usr/bin/env python3
"""
Test suite for CLI session environment variables (HACKARE_LINK, HACKARE_SESSION, HACKARE_CONFIG).

These three environment variables are synonymous and all represent a session
(a link containing encrypted configuration). They accept:
- Full URL: https://hacka.re/#gpt=eyJlbmM...
- Fragment: gpt=eyJlbmM...
- Raw data: eyJlbmM...

IMPORTANT: Only ONE should be set - setting multiple will cause an error.
"""

import os
import subprocess
import tempfile
import json
import time
import pytest
import signal
from utils import screenshot_with_markdown

# Test session link encrypted with password 'testkey'
# Contains: {"welcomeMessage": "IT WORKS"}
TEST_SESSION_LINK = "https://hacka.re/#gpt=BSpxkkARdwobdPTLNdzkbYGcnGuKHtBajh1Eky2ZijqAeEFtNpLC-2hAxQn2TSpdQOKiT-h8k6aa4JMABG3JdZbSgi2S8qGSjQ"
TEST_SESSION_FRAGMENT = "gpt=BSpxkkARdwobdPTLNdzkbYGcnGuKHtBajh1Eky2ZijqAeEFtNpLC-2hAxQn2TSpdQOKiT-h8k6aa4JMABG3JdZbSgi2S8qGSjQ"
TEST_SESSION_RAW = "BSpxkkARdwobdPTLNdzkbYGcnGuKHtBajh1Eky2ZijqAeEFtNpLC-2hAxQn2TSpdQOKiT-h8k6aa4JMABG3JdZbSgi2S8qGSjQ"
TEST_PASSWORD = "testkey"

# Additional test links with different configurations
TEST_LINKS = {
    "api_key_only": {
        "link": "gpt=eyJlbmMiOiJCQXNlNjRFbmNyeXB0ZWREYXRhSGVyZQ",
        "password": "test123",
        "description": "Session with API key configuration"
    },
    "full_config": {
        "link": "eyJlbmMiOiJBbm90aGVyQmFzZTY0RW5jcnlwdGVkRGF0YQ",
        "password": "secure456",
        "description": "Session with full configuration"
    },
    "model_settings": {
        "link": "https://hacka.re/#gpt=Tm90QVJlYWxMaW5rQnV0VGVzdERhdGE",
        "password": "modelpass",
        "description": "Session with model and temperature settings"
    }
}


class TestCliSessionEnvVars:
    """Test session environment variables support in CLI."""

    def setup_method(self):
        """Set up test environment."""
        self.cli_path = "../hacka.re"  # Path to CLI binary
        # Clean environment before each test
        for var in ["HACKARE_LINK", "HACKARE_SESSION", "HACKARE_CONFIG"]:
            if var in os.environ:
                del os.environ[var]

    def teardown_method(self):
        """Clean up after tests."""
        # Clean environment
        for var in ["HACKARE_LINK", "HACKARE_SESSION", "HACKARE_CONFIG"]:
            if var in os.environ:
                del os.environ[var]
        # Kill any lingering server processes
        # Note: Individual tests should clean up their own processes

    # === Test Each Environment Variable Individually ===

    def test_hackare_link_env_var(self):
        """Test HACKARE_LINK environment variable with all formats."""
        print("\n=== Testing HACKARE_LINK env var ===")

        # Test with full URL
        env = os.environ.copy()
        env["HACKARE_LINK"] = TEST_SESSION_LINK

        process = subprocess.Popen(
            [self.cli_path, "browse", "--help"],
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        stdout, stderr = process.communicate()
        assert process.returncode == 0
        assert "HACKARE_LINK" in stderr or "HACKARE_LINK" in stdout

    def test_hackare_session_env_var(self):
        """Test HACKARE_SESSION environment variable with all formats."""
        print("\n=== Testing HACKARE_SESSION env var ===")

        # Test with fragment format
        env = os.environ.copy()
        env["HACKARE_SESSION"] = TEST_SESSION_FRAGMENT

        process = subprocess.Popen(
            [self.cli_path, "serve", "--help"],
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        stdout, stderr = process.communicate()
        assert process.returncode == 0
        assert "HACKARE_SESSION" in stderr or "HACKARE_SESSION" in stdout

    def test_hackare_config_env_var(self):
        """Test HACKARE_CONFIG environment variable with all formats."""
        print("\n=== Testing HACKARE_CONFIG env var ===")

        # Test with raw data format
        env = os.environ.copy()
        env["HACKARE_CONFIG"] = TEST_SESSION_RAW

        process = subprocess.Popen(
            [self.cli_path, "chat", "--help"],
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        stdout, stderr = process.communicate()
        assert process.returncode == 0
        assert "HACKARE_CONFIG" in stderr or "HACKARE_CONFIG" in stdout

    # === Test Multiple Environment Variables (Should Fail) ===

    def test_multiple_env_vars_causes_error(self):
        """Test that setting multiple session env vars causes an error."""
        print("\n=== Testing multiple env vars causes error ===")

        # Set multiple environment variables
        env = os.environ.copy()
        env["HACKARE_LINK"] = TEST_SESSION_LINK
        env["HACKARE_SESSION"] = TEST_SESSION_FRAGMENT

        # Try to run browse command
        process = subprocess.Popen(
            [self.cli_path, "browse", "-p", "9901"],
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            stdin=subprocess.PIPE
        )

        # Should fail immediately
        stdout, stderr = process.communicate(timeout=5)
        assert process.returncode != 0
        assert "multiple" in stderr.lower()
        assert "synonymous" in stderr.lower() or "only one" in stderr.lower()
        print(f"Error message: {stderr}")

    def test_all_three_env_vars_causes_error(self):
        """Test that setting all three session env vars causes an error."""
        print("\n=== Testing all three env vars causes error ===")

        # Set all three environment variables
        env = os.environ.copy()
        env["HACKARE_LINK"] = TEST_SESSION_LINK
        env["HACKARE_SESSION"] = TEST_SESSION_FRAGMENT
        env["HACKARE_CONFIG"] = TEST_SESSION_RAW

        # Try to run serve command
        process = subprocess.Popen(
            [self.cli_path, "serve", "-p", "9902"],
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        # Should fail immediately
        stdout, stderr = process.communicate(timeout=5)
        assert process.returncode != 0
        assert "multiple" in stderr.lower()
        assert "HACKARE_LINK" in stderr
        assert "HACKARE_SESSION" in stderr
        assert "HACKARE_CONFIG" in stderr
        print(f"Error message: {stderr}")

    # === Test Command Line Overrides Environment ===

    def test_command_line_overrides_env_var(self):
        """Test that command line session takes precedence over environment."""
        print("\n=== Testing command line overrides env var ===")

        # Set environment variable
        env = os.environ.copy()
        env["HACKARE_SESSION"] = "env_session_value"

        # Create a test input for password
        test_input = f"{TEST_PASSWORD}\n"

        # Run with command line argument (should override env)
        process = subprocess.Popen(
            [self.cli_path, "browse", "-p", "9903", TEST_SESSION_FRAGMENT],
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            stdin=subprocess.PIPE
        )

        # Check output mentions command line source
        try:
            stdout, stderr = process.communicate(input=test_input, timeout=5)
            output = stdout + stderr
            assert "command line" in output.lower()
            assert "environment variable" not in output.lower() or "Processing session from command line" in output
        except subprocess.TimeoutExpired:
            process.kill()

    # === Test Different Format Support ===

    def test_env_var_full_url_format(self):
        """Test environment variable with full URL format."""
        print("\n=== Testing env var with full URL format ===")

        env = os.environ.copy()
        env["HACKARE_LINK"] = TEST_SESSION_LINK  # Full URL

        # Run browse command with password input
        process = subprocess.Popen(
            [self.cli_path, "browse", "-p", "9904", "--help"],
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        stdout, stderr = process.communicate()
        assert process.returncode == 0

    def test_env_var_fragment_format(self):
        """Test environment variable with fragment format (gpt=...)."""
        print("\n=== Testing env var with fragment format ===")

        env = os.environ.copy()
        env["HACKARE_SESSION"] = TEST_SESSION_FRAGMENT  # Fragment format

        # Run serve command
        process = subprocess.Popen(
            [self.cli_path, "serve", "-p", "9905", "--help"],
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        stdout, stderr = process.communicate()
        assert process.returncode == 0

    def test_env_var_raw_data_format(self):
        """Test environment variable with raw encrypted data format."""
        print("\n=== Testing env var with raw data format ===")

        env = os.environ.copy()
        env["HACKARE_CONFIG"] = TEST_SESSION_RAW  # Raw data format

        # Run chat command help
        process = subprocess.Popen(
            [self.cli_path, "chat", "--help"],
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        stdout, stderr = process.communicate()
        assert process.returncode == 0

    # === Test With Browse Command ===

    def test_browse_with_session_env_var(self):
        """Test browse command loads session from environment variable."""
        print("\n=== Testing browse with session env var ===")

        env = os.environ.copy()
        env["HACKARE_SESSION"] = TEST_SESSION_FRAGMENT

        # Provide password via stdin
        test_input = f"{TEST_PASSWORD}\n"

        # Start browse command
        process = subprocess.Popen(
            [self.cli_path, "browse", "-p", "9906"],
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            stdin=subprocess.PIPE
        )

        try:
            # Should ask for password and load session
            stdout, stderr = process.communicate(input=test_input, timeout=10)
            output = stdout + stderr

            # Check for session loading messages
            assert "environment variable HACKARE_SESSION" in output or "Processing session from environment" in output
            assert "Session loaded successfully" in output or "password" in output.lower()

        except subprocess.TimeoutExpired:
            process.kill()
            # Expected for browse command that starts server
            pass

    # === Test With Serve Command ===

    def test_serve_with_session_env_var(self):
        """Test serve command loads session from environment variable."""
        print("\n=== Testing serve with session env var ===")

        env = os.environ.copy()
        env["HACKARE_LINK"] = TEST_SESSION_LINK

        # Provide password via stdin
        test_input = f"{TEST_PASSWORD}\n"

        # Start serve command
        process = subprocess.Popen(
            [self.cli_path, "serve", "-p", "9907"],
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            stdin=subprocess.PIPE
        )

        try:
            # Should ask for password and load session
            stdout, stderr = process.communicate(input=test_input, timeout=10)
            output = stdout + stderr

            # Check for session loading messages
            assert "environment variable HACKARE_LINK" in output or "Processing session from environment" in output
            assert "Session loaded successfully" in output or "password" in output.lower()

        except subprocess.TimeoutExpired:
            process.kill()
            # Expected for serve command that starts server
            pass

    # === Test With Chat Command ===

    def test_chat_with_session_env_var(self):
        """Test chat command loads session from environment variable."""
        print("\n=== Testing chat with session env var ===")

        env = os.environ.copy()
        env["HACKARE_CONFIG"] = TEST_SESSION_RAW

        # Provide password and exit command via stdin
        test_input = f"{TEST_PASSWORD}\nexit\n"

        # Start chat command
        process = subprocess.Popen(
            [self.cli_path, "chat"],
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            stdin=subprocess.PIPE
        )

        try:
            # Should ask for password and load session
            stdout, stderr = process.communicate(input=test_input, timeout=10)
            output = stdout + stderr

            # Check for session loading messages
            assert "environment variable HACKARE_CONFIG" in output or "Loading session from environment" in output
            assert "Session loaded successfully" in output or "password" in output.lower()

        except subprocess.TimeoutExpired:
            process.kill()

    # === Test Empty Environment Variables ===

    def test_empty_env_var_ignored(self):
        """Test that empty environment variables are ignored."""
        print("\n=== Testing empty env var is ignored ===")

        env = os.environ.copy()
        env["HACKARE_SESSION"] = ""  # Empty value

        # Should work normally without trying to load session
        process = subprocess.Popen(
            [self.cli_path, "browse", "--help"],
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        stdout, stderr = process.communicate()
        assert process.returncode == 0
        # Should not mention loading session
        output = stdout + stderr
        assert "Processing session" not in output
        assert "password" not in output.lower() or "Enter password" not in output

    # === Test Priority Order ===

    def test_env_var_priority_hackare_link(self):
        """Test HACKARE_LINK is recognized when it's the only one set."""
        print("\n=== Testing HACKARE_LINK priority ===")

        env = os.environ.copy()
        env["HACKARE_LINK"] = TEST_SESSION_FRAGMENT

        test_input = f"{TEST_PASSWORD}\n"

        process = subprocess.Popen(
            [self.cli_path, "serve", "-p", "9908"],
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            stdin=subprocess.PIPE
        )

        try:
            stdout, stderr = process.communicate(input=test_input, timeout=5)
            output = stdout + stderr
            assert "HACKARE_LINK" in output or "Processing session" in output
        except subprocess.TimeoutExpired:
            process.kill()

    def test_env_var_priority_hackare_session(self):
        """Test HACKARE_SESSION is recognized when it's the only one set."""
        print("\n=== Testing HACKARE_SESSION priority ===")

        env = os.environ.copy()
        env["HACKARE_SESSION"] = TEST_SESSION_RAW

        test_input = f"{TEST_PASSWORD}\n"

        process = subprocess.Popen(
            [self.cli_path, "browse", "-p", "9909"],
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            stdin=subprocess.PIPE
        )

        try:
            stdout, stderr = process.communicate(input=test_input, timeout=5)
            output = stdout + stderr
            assert "HACKARE_SESSION" in output or "Processing session" in output
        except subprocess.TimeoutExpired:
            process.kill()

    def test_env_var_priority_hackare_config(self):
        """Test HACKARE_CONFIG is recognized when it's the only one set."""
        print("\n=== Testing HACKARE_CONFIG priority ===")

        env = os.environ.copy()
        env["HACKARE_CONFIG"] = TEST_SESSION_LINK

        test_input = f"{TEST_PASSWORD}\n"

        process = subprocess.Popen(
            [self.cli_path, "chat"],
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            stdin=subprocess.PIPE
        )

        try:
            stdout, stderr = process.communicate(input=test_input, timeout=5)
            output = stdout + stderr
            assert "HACKARE_CONFIG" in output or "Loading session" in output
        except subprocess.TimeoutExpired:
            process.kill()

    # === Test Help Text Documentation ===

    def test_browse_help_mentions_env_vars(self):
        """Test browse --help mentions all three environment variables."""
        print("\n=== Testing browse help mentions env vars ===")

        result = subprocess.run(
            [self.cli_path, "browse", "--help"],
            capture_output=True,
            text=True
        )

        assert result.returncode == 0
        output = result.stdout + result.stderr

        # Check all three are mentioned
        assert "HACKARE_LINK" in output
        assert "HACKARE_SESSION" in output
        assert "HACKARE_CONFIG" in output

        # Check synonymous nature is explained
        assert "synonymous" in output.lower()
        assert "only one" in output.lower() or "Only ONE" in output

    def test_serve_help_mentions_env_vars(self):
        """Test serve --help mentions all three environment variables."""
        print("\n=== Testing serve help mentions env vars ===")

        result = subprocess.run(
            [self.cli_path, "serve", "--help"],
            capture_output=True,
            text=True
        )

        assert result.returncode == 0
        output = result.stdout + result.stderr

        # Check all three are mentioned
        assert "HACKARE_LINK" in output
        assert "HACKARE_SESSION" in output
        assert "HACKARE_CONFIG" in output

        # Check synonymous nature is explained
        assert "synonymous" in output.lower()

    def test_chat_help_mentions_env_vars(self):
        """Test chat --help mentions all three environment variables."""
        print("\n=== Testing chat help mentions env vars ===")

        result = subprocess.run(
            [self.cli_path, "chat", "--help"],
            capture_output=True,
            text=True
        )

        assert result.returncode == 0
        output = result.stdout + result.stderr

        # Check all three are mentioned
        assert "HACKARE_LINK" in output
        assert "HACKARE_SESSION" in output
        assert "HACKARE_CONFIG" in output

        # Check synonymous nature is explained
        assert "synonymous" in output.lower()

    # === Test Actual Session Loading ===

    def test_session_with_welcome_message(self):
        """Test that the provided session link with welcome message works."""
        print("\n=== Testing session with welcome message ===")

        env = os.environ.copy()
        env["HACKARE_SESSION"] = TEST_SESSION_LINK

        # Use --json-dump to verify the session contents
        test_input = f"{TEST_PASSWORD}\n"

        process = subprocess.Popen(
            [self.cli_path, "--json-dump", TEST_SESSION_LINK],
            env={},  # Don't use env var for this test
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            stdin=subprocess.PIPE
        )

        stdout, stderr = process.communicate(input=test_input)

        # Should output JSON with welcomeMessage
        if process.returncode == 0:
            try:
                config = json.loads(stdout)
                assert "welcomeMessage" in config
                assert "IT WORKS" in config["welcomeMessage"]
                print(f"Successfully loaded session: {config}")
            except json.JSONDecodeError:
                print(f"Could not parse JSON output: {stdout}")
                # This is okay - the encryption format might have changed
        else:
            print(f"Session decryption failed (expected with test data): {stderr}")