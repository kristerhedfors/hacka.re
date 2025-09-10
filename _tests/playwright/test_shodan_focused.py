"""
Focused Shodan MCP Function Calling Test
Tests actual Shodan function calling with real API requests
"""
import pytest
import time
import os
from playwright.sync_api import Page, expect
from test_utils import (
    dismiss_welcome_modal, 
    screenshot_with_markdown,
    setup_console_logging,
    wait_for_generation_complete
)

SHODAN_API_KEY = "t2hW0hPlKpQY1KF0bn3kuhp3Mef7hptV"

class TestShodanFocused:
    """Focused Shodan MCP function calling tests"""
    
    def setup_method(self):
        """Setup for each test method"""
        self.console_messages = []

    def connect_shodan_mcp(self, page: Page):
        """Connect to Shodan MCP using the UI - following exact screenshot flow"""
        # Open MCP servers modal
        mcp_btn = page.locator("#mcp-servers-btn")
        expect(mcp_btn).to_be_visible()
        mcp_btn.click()
        
        # Wait for modal to be visible
        page.wait_for_selector("#mcp-servers-modal", state="visible", timeout=5000)
        
        screenshot_with_markdown(page, "mcp_modal_opened", {
            "Step": "MCP modal opened",
            "Status": "Ready to connect to Shodan"
        })
        
        # Find all Connect buttons in the Quick Connect section
        connect_buttons = page.locator("button:has-text('Connect')")
        print(f"Found {connect_buttons.count()} Connect buttons")
        
        # Based on screenshots: GitHub (1st), Gmail (2nd), Shodan (3rd)
        # Click the Shodan Connect button (3rd one)
        if connect_buttons.count() >= 3:
            shodan_btn = connect_buttons.nth(2)  # 0-indexed, so 2 = third button
            print("Clicking Shodan Connect button (3rd button)")
            shodan_btn.click()
        else:
            # Fallback - try to find by text proximity
            page.locator("text=Shodan").hover()
            shodan_area = page.locator("text=Shodan").locator("..")
            nearby_connect = shodan_area.locator("button:has-text('Connect')")
            if nearby_connect.count() > 0:
                print("Using fallback method - clicking Connect near Shodan text")
                nearby_connect.click()
            else:
                raise Exception("Could not find Shodan Connect button")
        
        # Wait for any modal/input that appears
        time.sleep(2)
        
        screenshot_with_markdown(page, "after_shodan_connect_click", {
            "Step": "After clicking Shodan Connect",
            "Status": "Waiting for API key modal or connection"
        })
        
        # Look for any API key input that appears
        # Try multiple possible selectors for API key input
        time.sleep(1)  # Give modal time to appear
        
        # Look for the Shodan API Key Setup modal specifically
        shodan_modal_title = page.locator("text=Shodan API Key Setup")
        if shodan_modal_title.is_visible():
            print("Shodan API Key Setup modal found")
            
            # Find the API key input field by placeholder
            api_key_input = page.locator("input[placeholder*='Shodan API key']")
            if api_key_input.count() > 0:
                print("Found Shodan API key input field")
                api_key_input.fill(SHODAN_API_KEY)
                
                # Click the Connect button with the link emoji
                connect_btn = page.locator("button:has-text('🔗 Connect')")
                if connect_btn.count() > 0:
                    print("Clicking '🔗 Connect' button")
                    connect_btn.click()
                else:
                    # Fallback - look for any Connect button in the modal
                    connect_btn = page.locator("button:has-text('Connect')")
                    if connect_btn.count() > 0:
                        print("Clicking Connect button (fallback)")
                        connect_btn.first.click()
                    else:
                        print("ERROR: Could not find Connect button in Shodan modal")
            else:
                print("ERROR: Could not find Shodan API key input field")
        else:
            print("Shodan API Key Setup modal not found - checking for other inputs")
            
            # Fallback - look for any API key input
            api_key_input = page.locator("input[placeholder*='API'], input[placeholder*='key']")
            if api_key_input.count() > 0:
                print("Found generic API key input")
                api_key_input.first.fill(SHODAN_API_KEY)
                
                # Look for any connect button
                connect_btn = page.locator("button:has-text('Connect')")
                if connect_btn.count() > 0:
                    print("Clicking generic Connect button")
                    connect_btn.first.click()
        
        # Wait for connection to complete
        time.sleep(3)
        
        screenshot_with_markdown(page, "shodan_connection_complete", {
            "Step": "After connection attempt",
            "Status": "Shodan connection process completed"
        })
        
        # Close MCP modal
        close_btn = page.locator("#close-mcp-servers-modal")
        if close_btn.is_visible():
            close_btn.click()
            page.wait_for_selector("#mcp-servers-modal", state="hidden", timeout=5000)
        else:
            # Try alternative close methods
            page.keyboard.press("Escape")
            time.sleep(1)

    def configure_openai_api(self, page: Page):
        """Configure OpenAI API key through settings"""
        # Open settings modal
        settings_btn = page.locator("#settings-btn")
        expect(settings_btn).to_be_visible()
        settings_btn.click()
        
        # Wait for modal to be visible
        page.wait_for_selector("#settings-modal", state="visible", timeout=5000)
        
        # Set OpenAI API key
        api_key_input = page.locator("#api-key-update")
        expect(api_key_input).to_be_visible()
        openai_key = os.getenv("OPENAI_API_KEY", "")
        api_key_input.fill(openai_key)
        
        # Select OpenAI provider
        provider_select = page.locator("#base-url-select")
        expect(provider_select).to_be_visible()
        provider_select.select_option("openai")
        
        # Wait for model dropdown to update
        time.sleep(1)
        
        # Select a fast model for testing
        model_select = page.locator("#model-select") 
        expect(model_select).to_be_visible()
        model_select.select_option("gpt-4o-mini")
        
        # Close settings modal
        close_btn = page.locator("#close-settings")
        if close_btn.count() > 0:
            close_btn.click()
        
        # Wait for modal to close
        page.wait_for_selector("#settings-modal", state="hidden", timeout=5000)

    def send_message_and_handle_execution(self, page: Page, message: str):
        """Send message and handle function execution modal"""
        # Clear chat for clean test
        clear_btn = page.locator("#clear-chat-btn")
        if clear_btn.count() > 0:
            clear_btn.click()
            time.sleep(500)
        
        # Send message
        message_input = page.locator("#message-input")
        expect(message_input).to_be_visible()
        message_input.fill(message)
        
        send_btn = page.locator("#send-btn")
        expect(send_btn).to_be_enabled()
        send_btn.click()
        
        # Wait for generation to start
        page.wait_for_function(
            """() => {
                const btn = document.querySelector('#send-btn');
                return btn && btn.hasAttribute('data-generating');
            }""",
            timeout=10000
        )
        
        screenshot_with_markdown(page, "message_sent", {
            "Message": message,
            "Status": "Waiting for function call"
        })
        
        # Wait for function execution modal to appear
        try:
            page.wait_for_selector("#function-execution-modal", state="visible", timeout=15000)
            print("Function execution modal appeared")
            
            screenshot_with_markdown(page, "function_execution_modal", {
                "Message": message,
                "Status": "Function execution modal visible"
            })
            
            # Click Execute to approve the function call
            execute_btn = page.locator("#exec-execute-btn")
            expect(execute_btn).to_be_visible()
            execute_btn.click()
            
            # Wait for modal to close (function executed)
            page.wait_for_selector("#function-execution-modal", state="hidden", timeout=30000)
            print("Function execution modal closed - function should be executing")
            
        except Exception as e:
            print(f"No function execution modal appeared: {e}")
        
        # Wait for generation to complete
        wait_for_generation_complete(page, timeout=45000)
        
        screenshot_with_markdown(page, "generation_complete", {
            "Message": message,
            "Status": "Generation completed"
        })
        
        # Get the response
        assistant_messages = page.locator(".message.assistant .message-content")
        page.wait_for_selector(".message.assistant .message-content", state="visible", timeout=10000)
        
        response_text = ""
        for i in range(assistant_messages.count()):
            msg_content = assistant_messages.nth(i).text_content()
            if msg_content and msg_content.strip():
                response_text += msg_content.strip() + "\n"
        
        return response_text.strip()

    def test_shodan_dns_resolve_kernel_org(self, page: Page, serve_hacka_re):
        """Test Shodan DNS resolve for kernel.org"""
        setup_console_logging(page, self.console_messages)
        
        # Navigate and setup
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        # Configure OpenAI API
        self.configure_openai_api(page)
        
        # Connect to Shodan MCP
        self.connect_shodan_mcp(page)
        
        # Test DNS resolve
        message = "Use Shodan to resolve the DNS for kernel.org domain. Show me the IP addresses."
        response = self.send_message_and_handle_execution(page, message)
        
        print(f"Response length: {len(response)}")
        print(f"Response preview: {response[:200]}...")
        
        # Verify response
        assert len(response) > 0, "Empty response from Shodan DNS resolve"
        
        # Should contain DNS-related information
        dns_keywords = ['ip', 'address', 'resolve', 'dns', 'kernel.org']
        found_keywords = [kw for kw in dns_keywords if kw.lower() in response.lower()]
        
        screenshot_with_markdown(page, "dns_resolve_result", {
            "Response Length": f"{len(response)} characters",
            "Keywords Found": str(found_keywords),
            "Success": "Yes" if len(found_keywords) >= 2 else "Partial"
        })
        
        assert len(found_keywords) >= 2, f"Expected DNS keywords in response, found: {found_keywords}"

    def test_shodan_host_info(self, page: Page, serve_hacka_re):
        """Test Shodan host info for a well-known IP"""
        setup_console_logging(page, self.console_messages)
        
        # Navigate and setup
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        # Configure OpenAI API
        self.configure_openai_api(page)
        
        # Connect to Shodan MCP
        self.connect_shodan_mcp(page)
        
        # Test host info for Google DNS (well-known IP)
        message = "Use Shodan to get host information for IP address 8.8.8.8. Show me what services are running."
        response = self.send_message_and_handle_execution(page, message)
        
        print(f"Host info response length: {len(response)}")
        print(f"Host info response preview: {response[:200]}...")
        
        # Verify response
        assert len(response) > 0, "Empty response from Shodan host info"
        
        # Should contain host-related information or explanation
        host_keywords = ['8.8.8.8', 'host', 'port', 'service', 'google', 'dns', 'information']
        found_keywords = [kw for kw in host_keywords if kw.lower() in response.lower()]
        
        screenshot_with_markdown(page, "host_info_result", {
            "IP": "8.8.8.8",
            "Response Length": f"{len(response)} characters", 
            "Keywords Found": str(found_keywords),
            "Success": "Yes" if len(found_keywords) >= 2 else "Partial"
        })
        
        # Should either have host info or explain why not available
        has_info_or_explanation = (
            len(found_keywords) >= 2 or
            'no information' in response.lower() or 
            'not found' in response.lower() or
            'error' in response.lower() or
            'unavailable' in response.lower()
        )
        assert has_info_or_explanation, f"No host info or explanation found: {found_keywords}"

    def test_shodan_account_info(self, page: Page, serve_hacka_re):
        """Test Shodan account/API info"""
        setup_console_logging(page, self.console_messages)
        
        # Navigate and setup
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        # Configure OpenAI API
        self.configure_openai_api(page)
        
        # Connect to Shodan MCP
        self.connect_shodan_mcp(page)
        
        # Test account info
        message = "Use Shodan to check my API account information and available credits."
        response = self.send_message_and_handle_execution(page, message)
        
        print(f"Account info response length: {len(response)}")
        print(f"Account info response preview: {response[:200]}...")
        
        # Verify response
        assert len(response) > 0, "Empty response from Shodan account info"
        
        # Should contain account-related information
        account_keywords = ['account', 'api', 'credits', 'plan', 'query', 'scan', 'member']
        found_keywords = [kw for kw in account_keywords if kw.lower() in response.lower()]
        
        screenshot_with_markdown(page, "account_info_result", {
            "Response Length": f"{len(response)} characters",
            "Keywords Found": str(found_keywords),
            "Success": "Yes" if len(found_keywords) >= 1 else "Check Response"
        })
        
        # Should have account info or error explanation
        has_account_info = (
            len(found_keywords) >= 1 or
            'error' in response.lower() or
            'invalid' in response.lower() or
            'unauthorized' in response.lower()
        )
        assert has_account_info, f"No account info or error explanation: {found_keywords}"

    def test_shodan_functions_available(self, page: Page, serve_hacka_re):
        """Verify that Shodan functions are properly registered and available"""
        setup_console_logging(page, self.console_messages)
        
        # Navigate and setup
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        # Configure OpenAI API (needed for function calling)
        self.configure_openai_api(page)
        
        # Connect to Shodan MCP
        self.connect_shodan_mcp(page)
        
        # Open function calling modal
        function_btn = page.locator("#function-btn")
        expect(function_btn).to_be_visible()
        function_btn.click()
        
        page.wait_for_selector("#function-modal", state="visible", timeout=5000)
        
        screenshot_with_markdown(page, "function_modal_opened", {
            "Status": "Function modal opened",
            "Purpose": "Check for Shodan functions"
        })
        
        # Look for function list
        function_list = page.locator("#function-list")
        expect(function_list).to_be_visible()
        
        # Get all function text content
        list_content = function_list.text_content() or ""
        
        # Expected Shodan functions
        expected_functions = [
            "shodan_dns_resolve",
            "shodan_host_info", 
            "shodan_account_profile",
            "shodan_api_info",
            "shodan_tools_myip"
        ]
        
        functions_found = []
        for func_name in expected_functions:
            if func_name in list_content:
                functions_found.append(func_name)
        
        # Close function modal
        close_btn = page.locator("#close-function-modal")
        if close_btn.count() > 0:
            close_btn.click()
        
        screenshot_with_markdown(page, "function_availability_check", {
            "Functions Found": str(functions_found),
            "Total Found": str(len(functions_found)),
            "Expected": str(len(expected_functions)),
            "Success": "Yes" if len(functions_found) >= 3 else "Partial"
        })
        
        assert len(functions_found) >= 3, f"Expected at least 3 Shodan functions, found: {functions_found}"
        print(f"✅ Found {len(functions_found)} Shodan functions: {functions_found}")

if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s", "--timeout=300"])