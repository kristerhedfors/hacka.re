"""
Test suite for hacka.re CLI chat command functionality.
Tests the interactive chat session in terminal.
"""

import subprocess
import time
import pytest
import os
import json
from pathlib import Path

class TestCliChatCommand:
    """Test suite for the chat command"""
    
    def setup_method(self):
        """Setup for each test"""
        self.cli_path = "../hacka.re"
        self.config_path = Path.home() / ".config" / "hacka.re" / "config.json"
        self.original_config = None
        
        # Backup existing config if present
        if self.config_path.exists():
            with open(self.config_path, 'r') as f:
                self.original_config = f.read()
    
    def teardown_method(self):
        """Cleanup after each test"""
        # Restore original config if it existed
        if self.original_config:
            self.config_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.config_path, 'w') as f:
                f.write(self.original_config)
        elif self.config_path.exists():
            # Remove test config if no original existed
            self.config_path.unlink()
    
    def test_chat_help(self):
        """Test that chat --help works correctly"""
        print("\n=== Testing chat --help ===")
        
        result = subprocess.run(
            [self.cli_path, "chat", "--help"],
            capture_output=True,
            text=True
        )
        
        print(f"Return code: {result.returncode}")
        print(f"Output:\n{result.stdout}")
        
        assert result.returncode == 0
        output = result.stdout + result.stderr
        assert "Start an interactive chat session" in output
        assert "URL" in output or "FRAGMENT" in output or "DATA" in output
        assert "If no configuration exists" in output
    
    def test_chat_subcommand_exists(self):
        """Test that chat is recognized as a subcommand"""
        print("\n=== Testing chat subcommand exists ===")
        
        # Test main help shows chat
        result = subprocess.run(
            [self.cli_path, "--help"],
            capture_output=True,
            text=True
        )
        
        output = result.stdout + result.stderr
        assert "chat" in output
        assert "Start interactive chat session" in output
    
    def test_chat_no_config_prompt(self):
        """Test chat prompts for config when none exists"""
        print("\n=== Testing chat no config prompt ===")
        
        # Ensure no config exists
        if self.config_path.exists():
            self.config_path.unlink()
        
        # Run chat command
        result = subprocess.run(
            [self.cli_path, "chat"],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        print(f"Output: {result.stdout}")
        print(f"Error: {result.stderr}")
        
        # Should indicate no config found
        output = result.stdout + result.stderr
        assert "No configuration found" in output or \
               "API key is required" in output or \
               "configure" in output.lower()
    
    def test_chat_with_config(self):
        """Test chat with existing configuration"""
        print("\n=== Testing chat with config ===")
        
        # Create a test config
        test_config = {
            "apiKey": "test-key-123",
            "baseUrl": "https://api.example.com/v1",
            "model": "gpt-4",
            "provider": "openai"
        }
        
        # Write test config
        self.config_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.config_path, 'w') as f:
            json.dump(test_config, f)
        
        # Run chat command (it will fail to connect but should load config)
        process = subprocess.Popen(
            [self.cli_path, "chat"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Send exit command
        try:
            output, error = process.communicate(input="exit\n", timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            output, error = process.communicate()
        
        print(f"Output: {output}")
        print(f"Error: {error}")
        
        # Should have attempted to start chat
        # (will fail with test API key but that's expected)
    
    def test_chat_accepts_shared_link(self):
        """Test that chat accepts shared link arguments"""
        print("\n=== Testing chat accepts shared link ===")
        
        # Test help shows shared link support
        result = subprocess.run(
            [self.cli_path, "chat", "--help"],
            capture_output=True,
            text=True
        )
        
        output = result.stdout + result.stderr
        assert "chat" in output
        assert "Start an interactive chat session" in output
        assert "URL" in output or "FRAGMENT" in output
        assert "gpt=eyJlbmM" in output or "eyJlbmM" in output
    
    def test_legacy_chat_flag_deprecated(self):
        """Test that --chat flag shows deprecation notice"""
        print("\n=== Testing legacy --chat flag ===")
        
        # Ensure no config
        if self.config_path.exists():
            self.config_path.unlink()
        
        # Use legacy flag
        result = subprocess.run(
            [self.cli_path, "--chat"],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        print(f"Output: {result.stdout}")
        print(f"Error: {result.stderr}")
        
        # Should show deprecation notice
        assert "deprecated" in result.stderr.lower() or \
               "Use 'hacka.re chat' instead" in result.stderr
    
    def test_chat_terminal_interaction(self):
        """Test basic terminal interaction with chat"""
        print("\n=== Testing chat terminal interaction ===")
        
        # Create minimal config
        test_config = {
            "apiKey": "test-key",
            "baseUrl": "http://localhost:99999/v1",  # Non-existent server
            "model": "test-model"
        }
        
        self.config_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.config_path, 'w') as f:
            json.dump(test_config, f)
        
        # Start chat process
        process = subprocess.Popen(
            [self.cli_path, "chat"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Try to send a message and exit
        try:
            output, error = process.communicate(
                input="test message\nexit\n",
                timeout=5
            )
        except subprocess.TimeoutExpired:
            process.kill()
            output, error = process.communicate()
        
        print(f"Chat output: {output}")
        print(f"Chat error: {error}")
        
        # Process should have started and accepted input
        # (will fail to connect but that's expected with test config)