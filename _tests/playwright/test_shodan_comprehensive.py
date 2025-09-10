"""
Comprehensive Shodan MCP Integration Test
Tests Shodan MCP functionality across multiple LLM providers with real API calls
"""
import pytest
import time
from playwright.sync_api import Page, expect
from test_utils import (
    dismiss_welcome_modal, 
    screenshot_with_markdown,
    setup_console_logging,
    configure_api_key_via_ui,
    select_provider_and_model,
    wait_for_generation_complete
)

# Test data
SHODAN_API_KEY = "t2hW0hPlKpQY1KF0bn3kuhp3Mef7hptV"  # From .env file
TEST_DOMAIN = "kernel.org"
TEST_PROVIDERS = [
    {"provider": "openai", "model": "gpt-4o-mini"},
    {"provider": "groq", "model": "llama-3.1-70b-versatile"}, 
    {"provider": "berget", "model": "mistralai/Devstral-Small-2505"}
]

class TestShodanComprehensive:
    """Comprehensive Shodan MCP integration tests across multiple providers"""
    
    def setup_method(self):
        """Setup for each test method"""
        self.console_messages = []
        
    def configure_shodan_mcp(self, page: Page):
        """Connect to Shodan MCP server"""
        # Open MCP servers modal
        mcp_btn = page.locator("#mcp-servers-btn")
        expect(mcp_btn).to_be_visible()
        mcp_btn.click()
        
        # Wait for modal to be visible
        page.wait_for_selector("#mcp-servers-modal", state="visible", timeout=5000)
        
        # Look for Shodan quick connector
        shodan_connector = page.locator("button:has-text('Connect to Shodan')")
        if shodan_connector.count() > 0:
            shodan_connector.click()
            
            # Wait for API key modal if it appears
            time.sleep(1)
            api_key_input = page.locator("#shodan-api-key")
            if api_key_input.count() > 0:
                api_key_input.fill(SHODAN_API_KEY)
                page.locator("button:has-text('Connect')").click()
        
        # Wait for connection to complete
        page.wait_for_timeout(3000)
        
        # Close MCP modal
        close_btn = page.locator("#close-mcp-servers-modal")
        if close_btn.count() > 0:
            close_btn.click()
        
        # Wait for modal to close
        page.wait_for_selector("#mcp-servers-modal", state="hidden", timeout=5000)
        
        screenshot_with_markdown(page, "shodan_mcp_configured", {
            "Status": "Shodan MCP configured",
            "Domain": TEST_DOMAIN,
            "API Key": "Configured" if SHODAN_API_KEY != "PUT_YOUR_SHODAN_API_KEY_HERE" else "NEEDS REPLACEMENT"
        })

    def send_message_and_wait(self, page: Page, message: str, provider_info: dict):
        """Send message and wait for complete response"""
        # Clear any existing messages for clean test
        clear_btn = page.locator("#clear-chat-btn")
        if clear_btn.count() > 0:
            clear_btn.click()
            page.wait_for_timeout(500)
        
        # Send message
        message_input = page.locator("#message-input")
        expect(message_input).to_be_visible()
        message_input.fill(message)
        
        # Click send button
        send_btn = page.locator("#send-btn")
        expect(send_btn).to_be_enabled()
        send_btn.click()
        
        # Wait for generation to complete
        wait_for_generation_complete(page)
        
        # Wait for function execution modal if it appears
        exec_modal = page.locator("#function-execution-modal")
        if exec_modal.count() > 0 and exec_modal.is_visible():
            execute_btn = page.locator("#exec-execute-btn")
            if execute_btn.count() > 0:
                execute_btn.click()
                # Wait for modal to close
                page.wait_for_selector("#function-execution-modal", state="hidden", timeout=15000)
                # Wait for generation to complete after function execution
                wait_for_generation_complete(page)
        
        # Capture response
        assistant_messages = page.locator(".message.assistant .message-content")
        page.wait_for_selector(".message.assistant .message-content", state="visible", timeout=15000)
        
        response_text = ""
        for i in range(assistant_messages.count()):
            msg_content = assistant_messages.nth(i).text_content()
            if msg_content and msg_content.strip():
                response_text += msg_content.strip() + "\n"
        
        screenshot_with_markdown(page, f"shodan_response_{provider_info['provider']}", {
            "Provider": f"{provider_info['provider']} - {provider_info['model']}",
            "Message": message,
            "Response Length": f"{len(response_text)} characters",
            "Has Response": "Yes" if response_text else "No",
            "Console Messages": f"{len(self.console_messages)} captured"
        })
        
        return response_text

    @pytest.mark.parametrize("provider_info", TEST_PROVIDERS)
    def test_shodan_dns_resolve_comprehensive(self, page: Page, serve_hacka_re, provider_info):
        """Test Shodan DNS resolve across multiple providers"""
        # Setup console logging
        setup_console_logging(page, self.console_messages)
        
        # Navigate and setup
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        # Configure API key and provider
        configure_api_key_via_ui(page, provider_info["provider"])
        select_provider_and_model(page, provider_info["provider"], provider_info["model"])
        
        # Configure Shodan MCP
        self.configure_shodan_mcp(page)
        
        # Test DNS resolve
        message = f"Use Shodan to resolve the DNS for {TEST_DOMAIN} domain"
        response = self.send_message_and_wait(page, message, provider_info)
        
        # Verify response contains DNS information
        assert len(response) > 0, f"Empty response from {provider_info['provider']}"
        assert TEST_DOMAIN.lower() in response.lower(), f"Domain {TEST_DOMAIN} not found in response"
        
        # Look for common DNS resolve indicators
        dns_indicators = ['ip', 'address', 'resolve', 'dns', 'record']
        found_indicators = [indicator for indicator in dns_indicators if indicator in response.lower()]
        assert len(found_indicators) > 0, f"No DNS indicators found in response: {found_indicators}"

    @pytest.mark.parametrize("provider_info", TEST_PROVIDERS)
    def test_shodan_host_info_comprehensive(self, page: Page, serve_hacka_re, provider_info):
        """Test Shodan host info across multiple providers"""
        # Setup console logging
        setup_console_logging(page, self.console_messages)
        
        # Navigate and setup
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        # Configure API key and provider
        configure_api_key_via_ui(page, provider_info["provider"])
        select_provider_and_model(page, provider_info["provider"], provider_info["model"])
        
        # Configure Shodan MCP
        self.configure_shodan_mcp(page)
        
        # First get IP of kernel.org for host info
        message = f"Use Shodan to get host information for IP address of {TEST_DOMAIN}"
        response = self.send_message_and_wait(page, message, provider_info)
        
        # Verify response contains host information
        assert len(response) > 0, f"Empty response from {provider_info['provider']}"
        
        # Look for common host info indicators
        host_indicators = ['port', 'service', 'banner', 'host', 'scan', 'protocol']
        found_indicators = [indicator for indicator in host_indicators if indicator in response.lower()]
        
        # Should have either host info or explanation why it couldn't get it
        has_info_or_explanation = (
            len(found_indicators) > 0 or 
            'no information' in response.lower() or 
            'not found' in response.lower() or
            'error' in response.lower()
        )
        assert has_info_or_explanation, f"No host info or explanation in response"

    @pytest.mark.parametrize("provider_info", TEST_PROVIDERS)
    def test_shodan_additional_functions_comprehensive(self, page: Page, serve_hacka_re, provider_info):
        """Test additional Shodan read-only functions"""
        # Setup console logging  
        setup_console_logging(page, self.console_messages)
        
        # Navigate and setup
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        # Configure API key and provider
        configure_api_key_via_ui(page, provider_info["provider"])
        select_provider_and_model(page, provider_info["provider"], provider_info["model"])
        
        # Configure Shodan MCP
        self.configure_shodan_mcp(page)
        
        # Test account profile (read-only, safe)
        message = "Use Shodan to check my account profile information"
        response = self.send_message_and_wait(page, message, provider_info)
        
        # Verify response
        assert len(response) > 0, f"Empty response from {provider_info['provider']}"
        
        # Should contain account info or error message
        account_indicators = ['account', 'profile', 'credits', 'plan', 'api', 'member']
        found_indicators = [indicator for indicator in account_indicators if indicator in response.lower()]
        
        has_account_info = (
            len(found_indicators) > 0 or
            'error' in response.lower() or
            'invalid' in response.lower()
        )
        assert has_account_info, "No account info or error explanation found"

    def test_shodan_function_availability(self, page: Page, serve_hacka_re):
        """Test that Shodan functions are properly registered"""
        # Navigate and setup
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        # Configure Shodan MCP
        self.configure_shodan_mcp(page)
        
        # Open function calling modal to verify functions are available
        function_btn = page.locator("#function-btn")
        expect(function_btn).to_be_visible()
        function_btn.click()
        
        page.wait_for_selector("#function-modal", state="visible", timeout=5000)
        
        # Check that Shodan functions are listed
        function_list = page.locator("#function-list")
        page.wait_for_selector("#function-list", state="visible", timeout=5000)
        
        # Look for common Shodan function names
        shodan_functions = [
            "shodan_dns_resolve",
            "shodan_host_info", 
            "shodan_account_profile",
            "shodan_api_info",
            "shodan_tools_myip"
        ]
        
        functions_found = []
        for func_name in shodan_functions:
            if page.locator(f"text={func_name}").count() > 0:
                functions_found.append(func_name)
        
        # Close modal
        close_btn = page.locator("#close-function-modal")
        if close_btn.count() > 0:
            close_btn.click()
        
        screenshot_with_markdown(page, "shodan_functions_available", {
            "Functions Found": str(functions_found),
            "Total Found": str(len(functions_found)),
            "Expected Functions": str(shodan_functions)
        })
        
        assert len(functions_found) >= 3, f"Expected at least 3 Shodan functions, found: {functions_found}"

    def test_shodan_error_handling(self, page: Page, serve_hacka_re):
        """Test Shodan error handling with invalid requests"""
        # Navigate and setup
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        # Configure with OpenAI for this test
        configure_api_key_via_ui(page, "openai")
        select_provider_and_model(page, "openai", "gpt-4o-mini")
        
        # Configure Shodan MCP
        self.configure_shodan_mcp(page)
        
        # Test with invalid IP address
        message = "Use Shodan to get host information for IP address 999.999.999.999"
        response = self.send_message_and_wait(page, message, {"provider": "openai", "model": "gpt-4o-mini"})
        
        # Should contain error message about invalid IP
        assert len(response) > 0, "Empty response for invalid IP test"
        
        error_indicators = ['invalid', 'error', 'incorrect', 'wrong', 'format']
        found_indicators = [indicator for indicator in error_indicators if indicator in response.lower()]
        assert len(found_indicators) > 0, f"No error handling detected for invalid IP: {response[:200]}"

if __name__ == "__main__":
    # Run specific tests
    pytest.main([__file__, "-v", "-s", "--timeout=300"])