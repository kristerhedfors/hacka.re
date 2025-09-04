"""
Test shared link settings modal API key display
"""

import pytest
import time
from playwright.sync_api import Page, expect
from test_utils import screenshot_with_markdown

# The shared link with password 'asd'
SHARED_LINK = "http://localhost:8000/#gpt=cbn8HL9fs1xxQoKzSMfrOVip62T2TIlnptdgrmNBUdPQSkgb0Yd9ElaGbD45ju_Sa4VoF-Ph28FkX2mgmcsI_4kJmx-fL42bN0O9g2tvHQ26FBM1bWSitQsfKY8X5N9M08Mvifh7ATunzI4P0jd3rrFt6ULzVwChjpcxvUU8iEMhRO-ZIr_iWSosFM8oyL9f1n3_Wv-MSPtuQ6YX4SmuKuGe5g2zDjtxIeDP0vwQpDWSqfoCnS0b7Pe3C6awvcVVThhn6RQkQUpVAw-1fh7yaXo7HZTMC5TiAziHU2uSEFbwhWFAE6bPo0scNdZyHeJdsyeNrUMJDlOlEPpeTcgm-WFBg1eiF8IiCmfC-7k_Z_weEe8GjPKtniBXAstWcY0qNhRoHHg6Zxq2Sla49K-kEyWsxtlum9A_Pvn3ThF7oCDylEBKcWIj4GZsZasBH9ilVSeds7Ilx-sa0KbVRNYs9ZJDz9h8QxNL9J3u4RKYBdKLQmdRI93c-hihOIqj8UhrVfbAo2rpl66F6p63khHSw10d6aG70WPBNJC5Bi3yCRCd3j2U4IgNtC-Bfo96hIS8EJ5sF7IXUFnkqe-wFUsmMv9rb67clemnelSB7zuRQHdOW_gbV9N2d5F891nRuzNVN6USJg"

def test_shared_link_settings_api_key(serve_hacka_re, page):
    """Test that API key is displayed in settings when opening shared link"""
    
    # Track console messages for debugging
    console_messages = []
    
    def log_console_message(msg):
        timestamp = time.strftime("%H:%M:%S")
        if any(keyword in msg.text.lower() for keyword in ['namespace', 'master key', 'api', 'dataservice', 'aihackare']):
            message = f"[{timestamp}]: {msg.text}"
            console_messages.append(message)
            print(message)
    page.on("console", log_console_message)
    
    # Open shared link
    print("\n=== Opening shared link ===")
    page.goto(SHARED_LINK)
    page.wait_for_timeout(2000)
    
    # Enter password
    print("Entering password...")
    password_input = page.locator('#early-password-input, #decrypt-password').first
    password_input.fill('asd')
    page.locator('#early-password-submit').click()
    
    # Wait for app to initialize
    page.wait_for_timeout(3000)
    
    # Check namespace state
    state = page.evaluate("""() => {
        const ns = window.NamespaceService?.getNamespace?.();
        return {
            namespaceId: ns?.namespaceId,
            hasMasterKey: !!ns?.masterKey,
            masterKeyLength: ns?.masterKey?.length,
            globalMasterKey: !!window._sharedLinkMasterKey,
            isSharedLink: ns?.isSharedLink
        };
    }""")
    print(f"Namespace state: {state}")
    assert state['hasMasterKey'], "Namespace should have master key"
    
    # Send a test message to verify API key works
    print("\nSending test message...")
    message_input = page.locator('#message-input')
    message_input.fill("Test message")
    page.locator('#send-btn').click()
    
    # Wait for user message to appear
    page.wait_for_selector(".message.user .message-content", state="visible", timeout=5000)
    
    # Check for API key modal (should NOT appear)
    api_modal_visible = page.locator("#api-key-modal").is_visible()
    assert not api_modal_visible, "API key modal should not appear - API key should be available"
    
    # Wait for assistant response
    print("Waiting for assistant response...")
    page.wait_for_selector(".message.assistant .message-content", state="visible", timeout=15000)
    print("Got assistant response - API key is working")
    
    # Now open settings modal
    print("\n=== Opening settings modal ===")
    page.locator('#settings-btn').click()
    page.wait_for_selector("#settings-modal", state="visible", timeout=2000)
    
    # Check namespace state again
    state2 = page.evaluate("""() => {
        const ns = window.NamespaceService?.getNamespace?.();
        return {
            namespaceId: ns?.namespaceId,
            hasMasterKey: !!ns?.masterKey,
            masterKeyFromGlobal: !!window._sharedLinkMasterKey,
            currentMasterKey: !!window.NamespaceService?.getCurrentMasterKey?.()
        };
    }""")
    print(f"Namespace state after opening settings: {state2}")
    
    # Get API key field value
    api_key_field = page.locator('#api-key-update')
    api_key_value = api_key_field.input_value()
    
    # Take screenshot
    screenshot_with_markdown(page, "settings_api_key", {
        "Status": "Settings modal open",
        "API Key Present": str(bool(api_key_value)),
        "Has Master Key": str(state2['hasMasterKey']),
        "Current Master Key": str(state2['currentMasterKey'])
    })
    
    print(f"API key field value: {'[POPULATED]' if api_key_value else '[EMPTY]'}")
    
    # Print recent console messages for debugging
    if not api_key_value and console_messages:
        print("\nRecent console messages:")
        for msg in console_messages[-10:]:
            print(f"  {msg}")
    
    assert api_key_value, "API key should be displayed in settings modal"
    
    print("\n✅ Test passed: API key is displayed in settings")