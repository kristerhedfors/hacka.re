"""
Shodan MCP Kernel.org Workflow Tests
Tests DNS resolve and host info lookup for kernel.org domain
"""
import pytest
import time
import os
import re
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

SHODAN_API_KEY = "t2hW0hPlKpQY1KF0bn3kuhp3Mef7hptV"

class TestShodanKernelWorkflow:
    """Test Shodan MCP workflow with kernel.org domain"""
    
    def setup_method(self):
        """Setup for each test method"""
        self.console_messages = []
        self.extracted_ips = []

    def setup_shodan_and_openai(self, page: Page):
        """Setup OpenAI API, enable YOLO mode, and connect to Shodan MCP"""
        # Configure OpenAI API and enable YOLO mode
        settings_btn = page.locator("#settings-btn")
        expect(settings_btn).to_be_visible()
        settings_btn.click()
        
        page.wait_for_selector("#settings-modal", state="visible", timeout=5000)
        
        # Set API key and provider
        api_key_input = page.locator("#api-key-update")
        expect(api_key_input).to_be_visible()
        openai_key = os.getenv("OPENAI_API_KEY", "")
        api_key_input.fill(openai_key)
        
        provider_select = page.locator("#base-url-select")
        provider_select.select_option("openai")
        time.sleep(1)
        
        model_select = page.locator("#model-select")
        model_select.select_option("gpt-4o-mini")
        
        # CRITICAL: Enable YOLO mode for automatic function execution
        yolo_checkbox = page.locator("#yolo-mode")
        expect(yolo_checkbox).to_be_visible()
        
        # Force click to enable if not already enabled
        try:
            if not yolo_checkbox.is_checked():
                yolo_checkbox.click(force=True)
                print("✅ YOLO mode enabled - functions will execute automatically")
                time.sleep(1)  # Give it time to process
            else:
                print("✅ YOLO mode already enabled")
        except Exception as e:
            print(f"⚠️ YOLO mode toggle issue: {e}")
            # Try force click anyway
            yolo_checkbox.click(force=True)
            print("✅ YOLO mode clicked (forced)")
        
        # Close settings
        close_settings = page.locator("#close-settings")
        close_settings.click()
        page.wait_for_selector("#settings-modal", state="hidden", timeout=5000)
        
        time.sleep(2)  # Wait for background operations
        
        # Connect to Shodan MCP
        mcp_btn = page.locator("#mcp-servers-btn")
        expect(mcp_btn).to_be_visible()
        mcp_btn.click()
        
        page.wait_for_selector("#mcp-servers-modal", state="visible", timeout=5000)
        time.sleep(1)
        
        # Click Shodan Connect (3rd button)
        connect_buttons = page.locator("button:has-text('Connect')")
        shodan_connect = connect_buttons.nth(2)
        shodan_connect.click()
        
        time.sleep(2)
        
        # Fill API key in Shodan modal
        shodan_title = page.locator("text=Shodan API Key Setup")
        expect(shodan_title).to_be_visible()
        
        api_input = page.locator("input[placeholder*='Shodan API key']")
        expect(api_input).to_be_visible()
        api_input.fill(SHODAN_API_KEY)
        
        # Click Connect with force to avoid interception
        modal = page.locator("#service-apikey-input-modal")
        connect_btn = modal.locator("button:has-text('Connect')")
        connect_btn.first.click(force=True)
        
        time.sleep(5)  # Wait for connection
        
        # Close MCP modal
        if page.locator("#mcp-servers-modal").is_visible():
            close_mcp = page.locator("#close-mcp-servers-modal")
            if close_mcp.is_visible():
                close_mcp.click()
            else:
                page.keyboard.press("Escape")
            page.wait_for_selector("#mcp-servers-modal", state="hidden", timeout=5000)

    def send_message_and_wait_for_response(self, page: Page, message: str, test_name: str):
        """Send message and wait for complete response"""
        # Clear chat
        clear_btn = page.locator("#clear-chat-btn")
        if clear_btn.is_visible():
            clear_btn.click()
            time.sleep(1)
        
        # Send message
        message_input = page.locator("#message-input")
        expect(message_input).to_be_visible()
        message_input.fill(message)
        
        send_btn = page.locator("#send-btn")
        expect(send_btn).to_be_enabled()
        send_btn.click()
        
        screenshot_with_markdown(page, f"{test_name}_message_sent", {
            "Step": f"{test_name} message sent",
            "Message": message[:50] + "..." if len(message) > 50 else message,
            "Status": "Waiting for response"
        })
        
        # With YOLO mode enabled, functions execute automatically - no modals to handle
        print("⏳ YOLO mode active - waiting for automatic function execution and response...")
        
        # Wait for generation to complete - functions execute automatically
        try:
            page.wait_for_function(
                """() => {
                    const btn = document.querySelector('#send-btn');
                    return btn && !btn.hasAttribute('data-generating');
                }""",
                timeout=60000  # Generous timeout for function execution and response
            )
            print("✅ Generation completed successfully")
        except:
            print("⚠️ Timeout waiting for generation to complete, checking current state...")
            # Give it extra time for function processing
            time.sleep(10)
            
            # Check if we have any assistant response at all
            messages = page.locator(".message.assistant .message-content")
            if messages.count() > 0:
                print("📋 Found assistant messages, continuing with current response")
            else:
                print("❌ No assistant messages found after timeout")
        
        screenshot_with_markdown(page, f"{test_name}_response_complete", {
            "Step": f"{test_name} response complete",
            "YOLO Mode": "Enabled - automatic function execution",
            "Status": "Checking response content"
        })
        
        # Get response text - YOLO mode should provide complete responses
        print("📋 Collecting response content...")
        assistant_messages = page.locator(".message.assistant .message-content")
        
        # Wait for at least one assistant message
        page.wait_for_selector(".message.assistant .message-content", state="visible", timeout=10000)
        
        # With YOLO mode, wait a bit for all content to stream in
        time.sleep(5)
        
        response_text = ""
        for i in range(assistant_messages.count()):
            msg_content = assistant_messages.nth(i).text_content()
            if msg_content and msg_content.strip():
                response_text += msg_content.strip() + "\n"
        
        response_text = response_text.strip()
        print(f"📋 Final response length: {len(response_text)} characters")
        
        # Log a preview of the response for debugging
        preview = response_text[:200] + "..." if len(response_text) > 200 else response_text
        print(f"📋 Response preview: {preview}")
        
        return response_text

    def extract_ip_addresses(self, text: str):
        """Extract IP addresses from response text"""
        # Pattern for IPv4 addresses
        ip_pattern = r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b'
        ips = re.findall(ip_pattern, text)
        
        # Filter out invalid IPs (like 0.0.0.0, 255.255.255.255, etc.)
        valid_ips = []
        for ip in ips:
            parts = ip.split('.')
            if all(0 <= int(part) <= 255 for part in parts):
                # Exclude common invalid/reserved IPs
                if not (ip.startswith('0.') or ip.startswith('127.') or ip == '255.255.255.255'):
                    valid_ips.append(ip)
        
        return list(set(valid_ips))  # Remove duplicates

    def test_shodan_dns_resolve_kernel_org(self, page: Page, serve_hacka_re):
        """Test DNS resolving kernel.org domain"""
        # Setup
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        screenshot_with_markdown(page, "dns_test_start", {
            "Test": "DNS resolve kernel.org",
            "Status": "Starting test"
        })
        
        # Setup Shodan and OpenAI
        self.setup_shodan_and_openai(page)
        
        # Test DNS resolve
        message = "Use Shodan to resolve the DNS for kernel.org domain. Show me all the IP addresses and explain what you found."
        response = self.send_message_and_wait_for_response(page, message, "dns_resolve")
        
        print(f"📋 DNS Response length: {len(response)} characters")
        print(f"📋 DNS Response preview: {response[:300]}...")
        
        # Verify response
        assert len(response) > 0, "❌ Empty response from Shodan DNS resolve"
        
        # Extract IP addresses from response
        extracted_ips = self.extract_ip_addresses(response)
        self.extracted_ips = extracted_ips
        
        # Check for DNS-related content
        dns_keywords = ['ip', 'address', 'dns', 'kernel.org', 'resolve', 'domain']
        found_keywords = [kw for kw in dns_keywords if kw.lower() in response.lower()]
        
        screenshot_with_markdown(page, "dns_resolve_final", {
            "Response Length": f"{len(response)} chars",
            "Keywords Found": str(found_keywords),
            "IPs Extracted": str(extracted_ips),
            "Success": "✅ PASS" if len(found_keywords) >= 3 and len(extracted_ips) > 0 else "⚠️ PARTIAL"
        })
        
        # Assertions
        assert len(found_keywords) >= 3, f"❌ Expected DNS keywords in response, found: {found_keywords}"
        assert len(extracted_ips) > 0, f"❌ No IP addresses found in response: {response[:200]}"
        
        print(f"✅ DNS RESOLVE SUCCESS: Found {len(found_keywords)} keywords: {found_keywords}")
        print(f"✅ EXTRACTED IPs: {extracted_ips}")

    def test_shodan_host_info_lookup(self, page: Page, serve_hacka_re):
        """Test host info lookup for a known IP"""
        # Setup
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        screenshot_with_markdown(page, "hostinfo_test_start", {
            "Test": "Host info lookup",
            "Status": "Starting test"
        })
        
        # Setup Shodan and OpenAI
        self.setup_shodan_and_openai(page)
        
        # Use Google DNS IP (well-known, likely to have Shodan data)
        test_ip = "8.8.8.8"
        message = f"Use Shodan to get detailed host information for IP address {test_ip}. Show me what services are running, open ports, and any other security information."
        response = self.send_message_and_wait_for_response(page, message, "host_info")
        
        print(f"📋 Host Info Response length: {len(response)} characters")
        print(f"📋 Host Info Response preview: {response[:300]}...")
        
        # Verify response
        assert len(response) > 0, "❌ Empty response from Shodan host info"
        
        # Check for host info content
        host_keywords = [test_ip, 'host', 'port', 'service', 'scan', 'information', 'google', 'dns']
        found_keywords = [kw for kw in host_keywords if kw.lower() in response.lower()]
        
        # Look for technical details that indicate successful lookup
        tech_indicators = ['tcp', 'udp', 'http', 'ssl', 'certificate', 'banner', 'protocol']
        found_tech = [kw for kw in tech_indicators if kw.lower() in response.lower()]
        
        screenshot_with_markdown(page, "host_info_final", {
            "IP": test_ip,
            "Response Length": f"{len(response)} chars",
            "Keywords Found": str(found_keywords),
            "Technical Details": str(found_tech),
            "Success": "✅ PASS" if len(found_keywords) >= 3 else "⚠️ PARTIAL"
        })
        
        # Assertions - should either have host info or explanation why not available
        has_meaningful_response = (
            len(found_keywords) >= 3 or
            'no information' in response.lower() or
            'not found' in response.lower() or
            'no data' in response.lower() or
            'error' in response.lower()
        )
        
        assert has_meaningful_response, f"❌ No meaningful host info or explanation: {found_keywords}"
        print(f"✅ HOST INFO SUCCESS: Found {len(found_keywords)} keywords: {found_keywords}")
        if found_tech:
            print(f"✅ TECHNICAL DETAILS: {found_tech}")

    def test_shodan_complete_workflow_kernel_org(self, page: Page, serve_hacka_re):
        """Test complete workflow: DNS resolve kernel.org → host info lookup"""
        # Setup
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        screenshot_with_markdown(page, "workflow_test_start", {
            "Test": "Complete Shodan workflow",
            "Domain": "kernel.org",
            "Status": "Starting complete workflow test"
        })
        
        # Setup Shodan and OpenAI
        self.setup_shodan_and_openai(page)
        
        # Step 1: DNS resolve kernel.org
        print("🔍 STEP 1: DNS resolve kernel.org")
        dns_message = "Use Shodan to resolve DNS for kernel.org and show me the IP addresses."
        dns_response = self.send_message_and_wait_for_response(page, dns_message, "workflow_dns")
        
        # Extract IPs from DNS response
        extracted_ips = self.extract_ip_addresses(dns_response)
        print(f"📋 Extracted IPs from kernel.org: {extracted_ips}")
        
        assert len(extracted_ips) > 0, f"❌ No IPs extracted from DNS response: {dns_response[:200]}"
        
        # Step 2: Host info lookup for first IP
        if extracted_ips:
            target_ip = extracted_ips[0]  # Use first IP found
            print(f"🔍 STEP 2: Host info lookup for {target_ip}")
            
            host_message = f"Now use Shodan to get detailed host information for IP {target_ip} that we just found for kernel.org. Show me what services are running."
            host_response = self.send_message_and_wait_for_response(page, host_message, "workflow_host")
            
            # Verify host response mentions the IP
            assert target_ip in host_response, f"❌ Response doesn't mention target IP {target_ip}"
            
            # Check for meaningful host info
            host_keywords = ['host', 'port', 'service', 'information', target_ip]
            found_host_keywords = [kw for kw in host_keywords if kw.lower() in host_response.lower()]
            
            screenshot_with_markdown(page, "workflow_complete", {
                "Domain": "kernel.org", 
                "IPs Found": str(extracted_ips),
                "Target IP": target_ip,
                "Host Keywords": str(found_host_keywords),
                "DNS Response Length": f"{len(dns_response)} chars",
                "Host Response Length": f"{len(host_response)} chars",
                "Success": "✅ COMPLETE WORKFLOW PASS"
            })
            
            # Final assertions
            assert len(found_host_keywords) >= 2, f"❌ Insufficient host info keywords: {found_host_keywords}"
            
            print(f"✅ COMPLETE WORKFLOW SUCCESS!")
            print(f"✅ DNS: Found {len(extracted_ips)} IPs for kernel.org")
            print(f"✅ HOST INFO: Analyzed {target_ip} with {len(found_host_keywords)} relevant details")
        
        else:
            raise Exception("❌ No IPs found in DNS response to continue workflow")

if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s", "--timeout=600"])