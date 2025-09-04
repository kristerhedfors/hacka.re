"""
Test shared link cross-tab synchronization
"""

import pytest
import time
from playwright.sync_api import Page, expect
from test_utils import screenshot_with_markdown

# The shared link with password 'asd'
SHARED_LINK = "http://localhost:8000/#gpt=cbn8HL9fs1xxQoKzSMfrOVip62T2TIlnptdgrmNBUdPQSkgb0Yd9ElaGbD45ju_Sa4VoF-Ph28FkX2mgmcsI_4kJmx-fL42bN0O9g2tvHQ26FBM1bWSitQsfKY8X5N9M08Mvifh7ATunzI4P0jd3rrFt6ULzVwChjpcxvUU8iEMhRO-ZIr_iWSosFM8oyL9f1n3_Wv-MSPtuQ6YX4SmuKuGe5g2zDjtxIeDP0vwQpDWSqfoCnS0b7Pe3C6awvcVVThhn6RQkQUpVAw-1fh7yaXo7HZTMC5TiAziHU2uSEFbwhWFAE6bPo0scNdZyHeJdsyeNrUMJDlOlEPpeTcgm-WFBg1eiF8IiCmfC-7k_Z_weEe8GjPKtniBXAstWcY0qNhRoHHg6Zxq2Sla49K-kEyWsxtlum9A_Pvn3ThF7oCDylEBKcWIj4GZsZasBH9ilVSeds7Ilx-sa0KbVRNYs9ZJDz9h8QxNL9J3u4RKYBdKLQmdRI93c-hihOIqj8UhrVfbAo2rpl66F6p63khHSw10d6aG70WPBNJC5Bi3yCRCd3j2U4IgNtC-Bfo96hIS8EJ5sF7IXUFnkqe-wFUsmMv9rb67clemnelSB7zuRQHdOW_gbV9N2d5F891nRuzNVN6USJg"

def test_shared_link_crosstab_sync(serve_hacka_re, browser):
    """Test that API key is preserved when opening shared link in multiple tabs"""
    
    context = browser.new_context()
    
    # Track console messages for debugging
    console_messages = []
    
    def setup_console_logging(page, tab_name):
        def log_console_message(msg):
            timestamp = time.strftime("%H:%M:%S")
            if any(keyword in msg.text.lower() for keyword in ['namespace', 'master key', 'api', 'crypto', 'storage unavailable']):
                message = f"[{timestamp}] {tab_name}: {msg.text}"
                console_messages.append(message)
                print(message)
        page.on("console", log_console_message)
    
    # === TAB 1: Open shared link ===
    print("\n=== TAB 1: Opening shared link ===")
    page1 = context.new_page()
    setup_console_logging(page1, "TAB1")
    
    page1.goto(SHARED_LINK)
    page1.wait_for_timeout(2000)
    
    # Enter password
    print("TAB1: Entering password...")
    password_input = page1.locator('#early-password-input, #decrypt-password').first
    password_input.fill('asd')
    page1.locator('#early-password-submit').click()
    
    # Wait for app to initialize
    page1.wait_for_timeout(3000)
    
    # Check namespace state
    state1 = page1.evaluate("""() => {
        const ns = window.NamespaceService?.getNamespace?.();
        return {
            namespaceId: ns?.namespaceId,
            hasMasterKey: !!ns?.masterKey,
            hasApiKeyInStorage: !!localStorage.getItem('hackare_*_api_key')
        };
    }""")
    print(f"TAB1 State: {state1}")
    assert state1['hasMasterKey'], "TAB1: Namespace should have master key"
    
    # Send a test message
    print("TAB1: Sending test message...")
    message_input = page1.locator('#message-input')
    test_message = "Hello, please respond with just 'Hi!' and nothing else."
    message_input.fill(test_message)
    page1.locator('#send-btn').click()
    
    # Wait for user message to appear
    page1.wait_for_selector(".message.user .message-content", state="visible", timeout=5000)
    print("TAB1: User message appeared")
    
    # Check for API key modal
    api_modal_visible = page1.locator("#api-key-modal").is_visible()
    assert not api_modal_visible, "TAB1: API key modal should not appear"
    
    # Wait for assistant response
    print("TAB1: Waiting for assistant response...")
    page1.wait_for_selector(".message.assistant .message-content", state="visible", timeout=15000)
    
    # Verify response
    assistant_messages = page1.locator(".message.assistant .message-content")
    assert assistant_messages.count() > 0, "TAB1: Should have assistant response"
    
    response = assistant_messages.last.text_content()
    print(f"TAB1: Got response: {response[:50]}...")
    
    screenshot_with_markdown(page1, "tab1_working", {
        "Tab": "TAB1",
        "Status": "Chat working",
        "Response": response[:50] if response else "None"
    })
    
    # === TAB 2: Open same shared link ===
    print("\n=== TAB 2: Opening same shared link ===")
    page2 = context.new_page()
    setup_console_logging(page2, "TAB2")
    
    page2.goto(SHARED_LINK)
    page2.wait_for_timeout(2000)
    
    # Enter password
    print("TAB2: Entering password...")
    password_input2 = page2.locator('#early-password-input, #decrypt-password').first
    password_input2.fill('asd')
    page2.locator('#early-password-submit').click()
    
    # Wait for initialization
    page2.wait_for_timeout(3000)
    
    # Check namespace state
    state2 = page2.evaluate("""() => {
        const ns = window.NamespaceService?.getNamespace?.();
        return {
            namespaceId: ns?.namespaceId,
            hasMasterKey: !!ns?.masterKey,
            hasApiKeyInStorage: !!localStorage.getItem('hackare_*_api_key')
        };
    }""")
    print(f"TAB2 State: {state2}")
    assert state2['hasMasterKey'], "TAB2: Namespace should have master key"
    
    # Send a test message from tab 2
    print("TAB2: Sending test message...")
    message_input2 = page2.locator('#message-input')
    message_input2.fill("Another test from tab 2")
    page2.locator('#send-btn').click()
    
    # Check for API key modal
    page2.wait_for_timeout(1000)
    api_modal_visible2 = page2.locator("#api-key-modal").is_visible()
    assert not api_modal_visible2, "TAB2: API key modal should not appear - cross-tab sync should work"
    
    # Wait for response
    page2.wait_for_selector(".message.assistant .message-content", state="visible", timeout=15000)
    print("TAB2: Got assistant response - cross-tab sync working!")
    
    screenshot_with_markdown(page2, "tab2_working", {
        "Tab": "TAB2",
        "Status": "Cross-tab sync working",
        "HasMasterKey": str(state2['hasMasterKey'])
    })
    
    # === Check TAB 1 after TAB 2 activity ===
    print("\n=== Checking TAB 1 after TAB 2 activity ===")
    page1.bring_to_front()
    page1.wait_for_timeout(2000)
    
    # Check messages synced
    messages1 = page1.locator('.message').count()
    print(f"TAB1: Total messages after sync: {messages1}")
    
    # Open settings to check if API key is still there
    page1.locator('#settings-btn').click()
    page1.wait_for_selector("#settings-modal", state="visible", timeout=2000)
    
    api_key_field = page1.locator('#api-key-update')
    api_key_value = api_key_field.input_value()
    
    screenshot_with_markdown(page1, "tab1_final_state", {
        "Tab": "TAB1",
        "Status": "After cross-tab activity",
        "API Key Present": str(bool(api_key_value)),
        "Message Count": str(messages1)
    })
    
    assert api_key_value, "TAB1: API key should still be present after cross-tab activity"
    
    # Close settings
    page1.locator('#close-settings').click()
    
    print("\n=== Test Summary ===")
    print(f"✅ TAB1 namespace initialized: {state1['hasMasterKey']}")
    print(f"✅ TAB2 namespace initialized: {state2['hasMasterKey']}")
    print(f"✅ TAB1 API key preserved: {bool(api_key_value)}")
    print(f"✅ Cross-tab sync working")
    
    # Cleanup
    page1.close()
    page2.close()
    context.close()