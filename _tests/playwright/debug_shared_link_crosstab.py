"""
Debug test for shared link cross-tab sync issue.
This test opens a shared link in two tabs and checks if the API key is preserved.
"""

import asyncio
import json
import time
from playwright.sync_api import sync_playwright, expect

def setup_console_logging(page, tab_name):
    """Setup console logging for a page"""
    console_messages = []
    
    def log_console_message(msg):
        timestamp = time.strftime("%H:%M:%S.%f")[:-3]
        log_entry = {
            'timestamp': timestamp,
            'tab': tab_name,
            'type': msg.type,
            'text': msg.text
        }
        console_messages.append(log_entry)
        
        # Print important messages
        if any(keyword in msg.text.lower() for keyword in ['master key', 'encryption key', 'storage unavailable', 'model mismatch', 'api']):
            print(f"[{timestamp}] {tab_name} {msg.type.upper()}: {msg.text}")
    
    page.on("console", log_console_message)
    return console_messages

def take_debug_screenshot(page, name, tab_name):
    """Take a screenshot with metadata"""
    screenshot_path = f"screenshots/debug_{tab_name}_{name}.png"
    page.screenshot(path=screenshot_path)
    print(f"Screenshot saved: {screenshot_path}")
    
    # Also capture current state
    state = page.evaluate("""() => {
        return {
            hasApiKey: !!localStorage.getItem('hackare_*_api_key'),
            hasMasterKey: !!(window._sharedLinkMasterKey || window.NamespaceService?.getCurrentMasterKey?.()),
            namespaceId: window.NamespaceService?.getNamespaceId?.(),
            storageType: window.StorageTypeService?.getStorageType?.(),
            model: document.getElementById('model-select')?.value,
            apiKeyFieldEmpty: !document.getElementById('api-key-update')?.value
        };
    }""")
    
    print(f"{tab_name} State: {json.dumps(state, indent=2)}")
    return state

def main():
    print("Starting shared link cross-tab sync debug test...")
    
    # The shared link with password 'asd'
    shared_link = "file:///Users/user/dev/hacka.re/index.html#gpt=cbn8HL9fs1xxQoKzSMfrOVip62T2TIlnptdgrmNBUdPQSkgb0Yd9ElaGbD45ju_Sa4VoF-Ph28FkX2mgmcsI_4kJmx-fL42bN0O9g2tvHQ26FBM1bWSitQsfKY8X5N9M08Mvifh7ATunzI4P0jd3rrFt6ULzVwChjpcxvUU8iEMhRO-ZIr_iWSosFM8oyL9f1n3_Wv-MSPtuQ6YX4SmuKuGe5g2zDjtxIeDP0vwQpDWSqfoCnS0b7Pe3C6awvcVVThhn6RQkQUpVAw-1fh7yaXo7HZTMC5TiAziHU2uSEFbwhWFAE6bPo0scNdZyHeJdsyeNrUMJDlOlEPpeTcgm-WFBg1eiF8IiCmfC-7k_Z_weEe8GjPKtniBXAstWcY0qNhRoHHg6Zxq2Sla49K-kEyWsxtlum9A_Pvn3ThF7oCDylEBKcWIj4GZsZasBH9ilVSeds7Ilx-sa0KbVRNYs9ZJDz9h8QxNL9J3u4RKYBdKLQmdRI93c-hihOIqj8UhrVfbAo2rpl66F6p63khHSw10d6aG70WPBNJC5Bi3yCRCd3j2U4IgNtC-Bfo96hIS8EJ5sF7IXUFnkqe-wFUsmMv9rb67clemnelSB7zuRQHdOW_gbV9N2d5F891nRuzNVN6USJg"
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        
        # === TAB 1: Open shared link ===
        print("\n=== TAB 1: Opening shared link ===")
        page1 = context.new_page()
        console1 = setup_console_logging(page1, "TAB1")
        
        page1.goto(shared_link)
        page1.wait_for_timeout(2000)
        
        # Enter password
        print("TAB1: Entering password...")
        password_input = page1.locator('#early-password-input, #decrypt-password').first
        password_input.fill('asd')
        page1.locator('#early-password-submit').click()
        
        # Wait for app to initialize
        page1.wait_for_timeout(3000)
        take_debug_screenshot(page1, "after_password", "tab1")
        
        # Send a message to test API
        print("TAB1: Sending test message...")
        message_input = page1.locator('#message-input')
        message_input.fill('Hello from tab 1')
        page1.locator('#send-btn').click()
        
        # Wait for response
        page1.wait_for_timeout(5000)
        take_debug_screenshot(page1, "after_message", "tab1")
        
        # Open settings to check API key
        print("TAB1: Opening settings...")
        page1.locator('#settings-btn').click()
        page1.wait_for_timeout(1000)
        
        # Check if API key field is populated
        api_key_field = page1.locator('#api-key-update')
        api_key_value = api_key_field.input_value()
        print(f"TAB1: API key field value: {'[POPULATED]' if api_key_value else '[EMPTY]'}")
        take_debug_screenshot(page1, "settings_open", "tab1")
        
        # Close settings
        page1.locator('#close-settings').click()
        
        # === TAB 2: Open same shared link ===
        print("\n=== TAB 2: Opening same shared link ===")
        page2 = context.new_page()
        console2 = setup_console_logging(page2, "TAB2")
        
        page2.goto(shared_link)
        page2.wait_for_timeout(2000)
        
        # Enter password
        print("TAB2: Entering password...")
        password_input2 = page2.locator('#early-password-input, #decrypt-password').first
        password_input2.fill('asd')
        page2.locator('#early-password-submit').click()
        
        # Wait for initialization and cross-tab sync
        page2.wait_for_timeout(3000)
        take_debug_screenshot(page2, "after_password", "tab2")
        
        # Send a message from tab 2
        print("TAB2: Sending test message...")
        message_input2 = page2.locator('#message-input')
        message_input2.fill('Hello from tab 2')
        page2.locator('#send-btn').click()
        
        # Wait for response
        page2.wait_for_timeout(5000)
        take_debug_screenshot(page2, "after_message", "tab2")
        
        # === Check Tab 1 after Tab 2 activity ===
        print("\n=== Checking TAB 1 after TAB 2 activity ===")
        page1.bring_to_front()
        page1.wait_for_timeout(2000)
        
        # Check if messages synced
        messages1 = page1.locator('.message').count()
        print(f"TAB1: Total messages: {messages1}")
        
        # Open settings again to check API key
        print("TAB1: Opening settings again...")
        page1.locator('#settings-btn').click()
        page1.wait_for_timeout(1000)
        
        api_key_field1 = page1.locator('#api-key-update')
        api_key_value1 = api_key_field1.input_value()
        print(f"TAB1: API key field value after sync: {'[POPULATED]' if api_key_value1 else '[EMPTY - BUG!]'}")
        take_debug_screenshot(page1, "settings_after_sync", "tab1")
        
        # Check for error messages
        if not api_key_value1:
            print("\n🔴 BUG CONFIRMED: API key lost in TAB1 after TAB2 activity!")
            
            # Check console for encryption errors
            print("\n=== Checking console for encryption errors ===")
            encryption_errors = [msg for msg in console1 if 'encryption' in msg['text'].lower() or 'master key' in msg['text'].lower()]
            for error in encryption_errors[-10:]:  # Last 10 relevant messages
                print(f"  {error['timestamp']}: {error['text']}")
        else:
            print("\n✅ API key preserved in TAB1")
        
        # === Check Tab 2 settings ===
        print("\n=== Checking TAB 2 settings ===")
        page2.bring_to_front()
        page2.locator('#settings-btn').click()
        page2.wait_for_timeout(1000)
        
        api_key_field2 = page2.locator('#api-key-update')
        api_key_value2 = api_key_field2.input_value()
        print(f"TAB2: API key field value: {'[POPULATED]' if api_key_value2 else '[EMPTY]'}")
        take_debug_screenshot(page2, "settings", "tab2")
        
        # Save console logs
        print("\n=== Saving console logs ===")
        all_messages = console1 + console2
        all_messages.sort(key=lambda x: x['timestamp'])
        
        with open('screenshots/console_logs_crosstab.json', 'w') as f:
            json.dump(all_messages, f, indent=2)
        print(f"Console logs saved to screenshots/console_logs_crosstab.json")
        
        # Keep browser open for manual inspection
        print("\n=== Test complete. Press Ctrl+C to close browser ===")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nClosing browser...")
        
        browser.close()

if __name__ == "__main__":
    main()