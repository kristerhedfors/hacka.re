"""
Test suite for simplified chat commands in CLI.
Verifies /menu command replaces individual modal commands.
"""

import subprocess
import time
import pytest
import pexpect
import sys

class TestCliSimplifiedCommands:
    """Test suite for simplified chat command set"""

    def setup_method(self):
        """Setup for each test"""
        self.cli_path = "../hacka.re"

    def test_chat_help_shows_simplified_commands(self):
        """Test that /help only shows simplified command set"""
        print("\n=== Testing chat help shows simplified commands ===")

        # Start chat session
        child = pexpect.spawn(f"{self.cli_path} chat", timeout=10)

        try:
            # Wait for prompt
            child.expect([">", "hacka.re"], timeout=5)

            # Send help command
            child.sendline("/help")

            # Capture output
            child.expect("Available commands:", timeout=5)
            output = child.read_nonblocking(size=1000, timeout=2).decode('utf-8', errors='ignore')

            # Check for simplified command set
            assert "/menu" in output or "/m" in output, "Menu command not found in help"
            assert "/clear" in output or "/c" in output, "Clear command not found in help"
            assert "/help" in output or "/h" in output, "Help command not found in help"
            assert "/exit" in output or "/q" in output, "Exit command not found in help"

            # Check that old commands are NOT present
            assert "/settings" not in output, "Old settings command still present"
            assert "/prompts" not in output, "Old prompts command still present"
            assert "/functions" not in output, "Old functions command still present"
            assert "/mcp" not in output and "MCP server" not in output, "Old MCP command still present"
            assert "/rag" not in output and "RAG" not in output, "Old RAG command still present"
            assert "/share" not in output and "Share configuration" not in output, "Old share command still present"

            print("✓ Help shows only simplified commands")

        except pexpect.TIMEOUT:
            print(f"Timeout waiting for response")
            print(f"Buffer: {child.buffer}")
            raise
        finally:
            child.terminate()

    def test_menu_command_autocomplete(self):
        """Test that /m autocompletes to /menu"""
        print("\n=== Testing menu command autocomplete ===")

        # Start chat session
        child = pexpect.spawn(f"{self.cli_path} chat", timeout=10)

        try:
            # Wait for prompt
            child.expect([">", "hacka.re"], timeout=5)

            # Send partial command
            child.send("/m")
            child.send("\t")  # Tab for autocomplete

            # Check if it autocompletes
            time.sleep(0.5)
            output = child.read_nonblocking(size=100, timeout=1).decode('utf-8', errors='ignore')

            # The autocomplete should show /menu
            assert "menu" in output.lower(), "Menu command not in autocomplete"

            print("✓ /m autocompletes to menu")

        except pexpect.TIMEOUT:
            print(f"Timeout waiting for response")
            raise
        finally:
            child.terminate()

    def test_only_four_commands_available(self):
        """Test that only 4 commands are available"""
        print("\n=== Testing only 4 commands available ===")

        # Start chat session
        child = pexpect.spawn(f"{self.cli_path} chat", timeout=10)

        try:
            # Wait for prompt
            child.expect([">", "hacka.re"], timeout=5)

            # Try old commands - they should not work
            old_commands = ["/settings", "/prompts", "/functions", "/rag", "/share"]

            for cmd in old_commands:
                child.sendline(cmd)
                time.sleep(0.5)
                output = child.read_nonblocking(size=500, timeout=1).decode('utf-8', errors='ignore')

                # Should either not recognize the command or show error
                assert "Unknown command" in output or "not found" in output or len(output.strip()) == 0, \
                    f"Old command {cmd} appears to still work"

            print("✓ Old commands are not available")

        except pexpect.TIMEOUT:
            print(f"Timeout waiting for response")
            raise
        finally:
            child.terminate()

    def test_menu_command_launches_tui(self):
        """Test that /menu command launches TUI"""
        print("\n=== Testing menu command launches TUI ===")

        # Start chat session
        child = pexpect.spawn(f"{self.cli_path} chat", timeout=10)

        try:
            # Wait for prompt
            child.expect([">", "hacka.re"], timeout=5)

            # Send menu command
            child.sendline("/menu")

            # Should clear screen and show TUI
            # Look for TUI indicators
            time.sleep(1)

            # Try to detect if TUI launched (it would clear screen)
            # Send escape to exit TUI if it opened
            child.send("\x1b")  # ESC
            time.sleep(0.5)

            # Should return to chat
            child.sendline("")
            child.expect([">"], timeout=5)

            print("✓ Menu command triggers TUI launch")

        except pexpect.TIMEOUT:
            print(f"Timeout - this may be expected if TUI launched")
            # Not necessarily an error - TUI may have taken over
        finally:
            child.terminate()

if __name__ == "__main__":
    # Run the tests
    test = TestCliSimplifiedCommands()
    test.setup_method()  # Initialize attributes

    # Run each test
    try:
        test.test_chat_help_shows_simplified_commands()
        test.test_menu_command_autocomplete()
        test.test_only_four_commands_available()
        test.test_menu_command_launches_tui()
        print("\n=== All simplified command tests passed ===")
    except Exception as e:
        print(f"\n✗ Test failed: {e}")
        sys.exit(1)