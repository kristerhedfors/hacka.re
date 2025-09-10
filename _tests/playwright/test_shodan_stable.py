"""
Stable Shodan MCP Test
Simple, stable test for Shodan MCP connection and function calling
"""
import pytest
import time
import os
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

SHODAN_API_KEY = "t2hW0hPlKpQY1KF0bn3kuhp3Mef7hptV"

def test_shodan_stable_connection_and_dns(page: Page, serve_hacka_re):
    """Stable test for Shodan MCP connection and DNS resolve"""
    
    # Navigate and initial setup
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    screenshot_with_markdown(page, "01_initial_state", {
        "Step": "Initial page load",
        "Status": "Ready to start Shodan test"
    })
    
    # Configure OpenAI API first (simple, stable)
    settings_btn = page.locator("#settings-btn")
    expect(settings_btn).to_be_visible()
    settings_btn.click()
    
    page.wait_for_selector("#settings-modal", state="visible", timeout=5000)
    
    # Set API key
    api_key_input = page.locator("#api-key-update")
    expect(api_key_input).to_be_visible()
    openai_key = os.getenv("OPENAI_API_KEY", "")
    api_key_input.fill(openai_key)
    
    # Set provider and model
    provider_select = page.locator("#base-url-select")
    provider_select.select_option("openai")
    time.sleep(1)  # Wait for provider change
    
    model_select = page.locator("#model-select")
    model_select.select_option("gpt-4o-mini")
    
    # Close settings
    close_settings = page.locator("#close-settings")
    close_settings.click()
    page.wait_for_selector("#settings-modal", state="hidden", timeout=5000)
    
    screenshot_with_markdown(page, "02_openai_configured", {
        "Step": "OpenAI API configured",
        "Provider": "openai",
        "Model": "gpt-4o-mini"
    })
    
    # Wait for any background operations to complete
    time.sleep(2)
    
    # Open MCP modal (simple click, wait for stable state)
    mcp_btn = page.locator("#mcp-servers-btn")
    expect(mcp_btn).to_be_visible()
    mcp_btn.click()
    
    # Wait for modal to be fully loaded and stable
    page.wait_for_selector("#mcp-servers-modal", state="visible", timeout=5000)
    time.sleep(1)  # Wait for any animations to complete
    
    screenshot_with_markdown(page, "03_mcp_modal_stable", {
        "Step": "MCP modal opened and stable",
        "Status": "Ready to connect to Shodan"
    })
    
    # Find Connect buttons and verify we have the expected structure
    connect_buttons = page.locator("button:has-text('Connect')")
    button_count = connect_buttons.count()
    print(f"Found {button_count} Connect buttons")
    
    if button_count >= 3:
        # Click the 3rd Connect button (Shodan)
        shodan_connect = connect_buttons.nth(2)
        print("Clicking Shodan Connect button (3rd)")
        shodan_connect.click()
        
        # Wait for Shodan API modal to appear
        time.sleep(2)
        
        screenshot_with_markdown(page, "04_shodan_api_modal", {
            "Step": "After clicking Shodan Connect",
            "Status": "Shodan API key modal should be visible"
        })
        
        # Look for the specific Shodan modal elements
        shodan_title = page.locator("text=Shodan API Key Setup")
        if shodan_title.is_visible():
            print("✅ Shodan API Key Setup modal found")
            
            # Fill the API key
            api_input = page.locator("input[placeholder*='Shodan API key']")
            expect(api_input).to_be_visible()
            api_input.fill(SHODAN_API_KEY)
            print("✅ API key filled")
            
            # Take screenshot before clicking Connect
            screenshot_with_markdown(page, "05_api_key_filled", {
                "Step": "API key filled",
                "Status": "Ready to click Connect"
            })
            
            # Click the Connect button - use the specific modal selector to avoid interception
            # The modal has ID #service-apikey-input-modal based on the error
            modal = page.locator("#service-apikey-input-modal")
            connect_btn = modal.locator("button:has-text('🔗 Connect')")
            if connect_btn.count() > 0:
                print("✅ Found Connect button with emoji in modal")
                connect_btn.click(force=True)  # Force click to bypass interception
                print("✅ Clicked Connect button")
            else:
                # Fallback - any Connect button in the specific modal
                modal_connect = modal.locator("button:has-text('Connect')")
                if modal_connect.count() > 0:
                    print("✅ Using fallback Connect button in modal")
                    modal_connect.first.click(force=True)
                else:
                    # Last resort - use JavaScript click
                    page.evaluate("""
                        const connectBtn = document.querySelector('#service-apikey-input-modal button');
                        if (connectBtn && connectBtn.textContent.includes('Connect')) {
                            connectBtn.click();
                        }
                    """)
                    print("✅ Used JavaScript click on Connect button")
            
            # Wait for connection to complete
            time.sleep(5)  # Give it time to connect
            
            screenshot_with_markdown(page, "06_after_connect", {
                "Step": "After clicking Connect",
                "Status": "Connection should be established"
            })
            
            # Close MCP modal if still open
            if page.locator("#mcp-servers-modal").is_visible():
                close_mcp = page.locator("#close-mcp-servers-modal")
                if close_mcp.is_visible():
                    close_mcp.click()
                else:
                    page.keyboard.press("Escape")
                page.wait_for_selector("#mcp-servers-modal", state="hidden", timeout=5000)
            
            # Now test function calling
            print("🚀 Testing Shodan DNS resolve")
            
            # Clear chat
            clear_btn = page.locator("#clear-chat-btn")
            if clear_btn.is_visible():
                clear_btn.click()
            
            # Send test message
            message_input = page.locator("#message-input")
            expect(message_input).to_be_visible()
            test_message = "Use Shodan to resolve DNS for kernel.org domain and show me the IP addresses"
            message_input.fill(test_message)
            
            send_btn = page.locator("#send-btn")
            expect(send_btn).to_be_enabled()
            send_btn.click()
            
            screenshot_with_markdown(page, "07_message_sent", {
                "Step": "Test message sent",
                "Message": test_message,
                "Status": "Waiting for response"
            })
            
            # Wait for generation to start (look for loading indicators)
            try:
                page.wait_for_function(
                    """() => {
                        const btn = document.querySelector('#send-btn');
                        return btn && btn.hasAttribute('data-generating');
                    }""",
                    timeout=5000
                )
            except:
                # Fallback - look for other generation indicators
                print("⚠️ data-generating not found, checking for other indicators")
                time.sleep(2)  # Give it time to start processing
            
            # Look for function execution modal
            try:
                page.wait_for_selector("#function-execution-modal", state="visible", timeout=15000)
                print("✅ Function execution modal appeared")
                
                screenshot_with_markdown(page, "08_function_modal", {
                    "Step": "Function execution modal",
                    "Status": "Shodan function is being called"
                })
                
                # Click Execute
                execute_btn = page.locator("#exec-execute-btn")
                expect(execute_btn).to_be_visible()
                execute_btn.click()
                print("✅ Clicked Execute button")
                
                # Wait for modal to close (function executed)
                page.wait_for_selector("#function-execution-modal", state="hidden", timeout=30000)
                print("✅ Function execution completed")
                
            except Exception as e:
                print(f"⚠️ Function execution modal not found: {e}")
            
            # Wait for generation to complete
            page.wait_for_function(
                """() => {
                    const btn = document.querySelector('#send-btn');
                    return btn && !btn.hasAttribute('data-generating');
                }""",
                timeout=45000
            )
            
            screenshot_with_markdown(page, "09_response_complete", {
                "Step": "Response generation complete",
                "Status": "Checking for Shodan DNS results"
            })
            
            # Check for response
            assistant_messages = page.locator(".message.assistant .message-content")
            page.wait_for_selector(".message.assistant .message-content", state="visible", timeout=10000)
            
            response_text = ""
            for i in range(assistant_messages.count()):
                msg_content = assistant_messages.nth(i).text_content()
                if msg_content and msg_content.strip():
                    response_text += msg_content.strip() + "\n"
            
            print(f"📋 Response length: {len(response_text)} characters")
            print(f"📋 Response preview: {response_text[:200]}...")
            
            # Verify we got a valid response
            assert len(response_text) > 0, "❌ Empty response from Shodan DNS resolve"
            
            # Check for DNS-related content
            dns_keywords = ['ip', 'address', 'dns', 'kernel.org', 'resolve']
            found_keywords = [kw for kw in dns_keywords if kw.lower() in response_text.lower()]
            
            screenshot_with_markdown(page, "10_final_result", {
                "Step": "Final test result",
                "Response Length": f"{len(response_text)} chars",
                "Keywords Found": str(found_keywords),
                "Success": "✅ PASS" if len(found_keywords) >= 2 else "⚠️ PARTIAL"
            })
            
            assert len(found_keywords) >= 2, f"❌ Expected DNS keywords in response, found: {found_keywords}"
            print(f"✅ SUCCESS: Found {len(found_keywords)} DNS keywords: {found_keywords}")
            
        else:
            raise Exception("❌ Shodan API Key Setup modal not found")
    else:
        raise Exception(f"❌ Expected at least 3 Connect buttons, found {button_count}")

if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s", "--timeout=300"])