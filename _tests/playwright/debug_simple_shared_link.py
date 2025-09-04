"""
Simple test to check if shared link works properly
"""

import time
from playwright.sync_api import sync_playwright

def main():
    print("Testing shared link with API key...")
    
    # The shared link with password 'asd'
    shared_link = "file:///Users/user/dev/hacka.re/index.html#gpt=cbn8HL9fs1xxQoKzSMfrOVip62T2TIlnptdgrmNBUdPQSkgb0Yd9ElaGbD45ju_Sa4VoF-Ph28FkX2mgmcsI_4kJmx-fL42bN0O9g2tvHQ26FBM1bWSitQsfKY8X5N9M08Mvifh7ATunzI4P0jd3rrFt6ULzVwChjpcxvUU8iEMhRO-ZIr_iWSosFM8oyL9f1n3_Wv-MSPtuQ6YX4SmuKuGe5g2zDjtxIeDP0vwQpDWSqfoCnS0b7Pe3C6awvcVVThhn6RQkQUpVAw-1fh7yaXo7HZTMC5TiAziHU2uSEFbwhWFAE6bPo0scNdZyHeJdsyeNrUMJDlOlEPpeTcgm-WFBg1eiF8IiCmfC-7k_Z_weEe8GjPKtniBXAstWcY0qNhRoHHg6Zxq2Sla49K-kEyWsxtlum9A_Pvn3ThF7oCDylEBKcWIj4GZsZasBH9ilVSeds7Ilx-sa0KbVRNYs9ZJDz9h8QxNL9J3u4RKYBdKLQmdRI93c-hihOIqj8UhrVfbAo2rpl66F6p63khHSw10d6aG70WPBNJC5Bi3yCRCd3j2U4IgNtC-Bfo96hIS8EJ5sF7IXUFnkqe-wFUsmMv9rb67clemnelSB7zuRQHdOW_gbV9N2d5F891nRuzNVN6USJg"
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        
        # Setup console logging
        console_logs = []
        def log_console_message(msg):
            timestamp = time.strftime("%H:%M:%S")
            log = f"[{timestamp}] {msg.type}: {msg.text}"
            console_logs.append(log)
            if 'namespace' in msg.text.lower() or 'master key' in msg.text.lower() or 'api' in msg.text.lower():
                print(log)
        page.on("console", log_console_message)
        
        print("\n=== Opening shared link ===")
        page.goto(shared_link)
        page.wait_for_timeout(2000)
        
        print("\n=== Entering password ===")
        password_input = page.locator('#early-password-input, #decrypt-password').first
        password_input.fill('asd')
        page.locator('#early-password-submit').click()
        
        # Wait for app to initialize
        page.wait_for_timeout(3000)
        
        print("\n=== Checking state after password ===")
        
        # Check namespace state
        state = page.evaluate("""() => {
            const ns = window.NamespaceService?.getNamespace?.();
            return {
                namespace: {
                    id: ns?.namespaceId,
                    hasMasterKey: !!ns?.masterKey,
                    keyLength: ns?.masterKey?.length
                },
                storage: {
                    hasApiKey: !!localStorage.getItem('hackare_*_api_key'),
                    keys: Object.keys(localStorage).filter(k => k.includes('api'))
                },
                globals: {
                    hasMasterKey: !!window._sharedLinkMasterKey,
                    waitingForPassword: !!window._waitingForSharedLinkPassword
                }
            };
        }""")
        
        print(f"State: {state}")
        
        print("\n=== Sending test message ===")
        message_input = page.locator('#message-input')
        message_input.fill('Say "Hello"')
        page.locator('#send-btn').click()
        
        # Wait a bit and check for API key modal
        page.wait_for_timeout(2000)
        
        if page.locator('#api-key-modal').is_visible():
            print("❌ ERROR: API key modal is visible!")
            print("This means the API key was not properly saved/retrieved")
        else:
            print("✓ API key modal not shown")
            
            # Wait for response (with timeout)
            print("Waiting for response...")
            for i in range(15):  # Wait up to 15 seconds
                assistant_messages = page.locator(".message.assistant")
                if assistant_messages.count() > 0:
                    print(f"✓ Got {assistant_messages.count()} assistant message(s)")
                    last_msg = assistant_messages.last.text_content()
                    print(f"Response preview: {last_msg[:100] if last_msg else 'empty'}...")
                    break
                page.wait_for_timeout(1000)
                print(f"  Waiting... {i+1}s")
            else:
                print("⚠ No response after 15 seconds")
        
        print("\n=== Opening settings to check API key ===")
        page.locator('#settings-btn').click()
        page.wait_for_timeout(1000)
        
        api_key_field = page.locator('#api-key-update')
        has_value = api_key_field.input_value() != ""
        print(f"API key field populated: {has_value}")
        
        # Close settings
        page.locator('#close-settings').click()
        
        print("\n=== Test complete ===")
        print("Press Ctrl+C to close browser...")
        
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nClosing...")
        
        browser.close()

if __name__ == "__main__":
    main()