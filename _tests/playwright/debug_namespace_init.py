"""
Quick test to verify namespace initialization with shared link master key
"""

import time
from playwright.sync_api import sync_playwright

def main():
    print("Testing namespace initialization...")
    
    # The shared link with password 'asd'
    shared_link = "file:///Users/user/dev/hacka.re/index.html#gpt=cbn8HL9fs1xxQoKzSMfrOVip62T2TIlnptdgrmNBUdPQSkgb0Yd9ElaGbD45ju_Sa4VoF-Ph28FkX2mgmcsI_4kJmx-fL42bN0O9g2tvHQ26FBM1bWSitQsfKY8X5N9M08Mvifh7ATunzI4P0jd3rrFt6ULzVwChjpcxvUU8iEMhRO-ZIr_iWSosFM8oyL9f1n3_Wv-MSPtuQ6YX4SmuKuGe5g2zDjtxIeDP0vwQpDWSqfoCnS0b7Pe3C6awvcVVThhn6RQkQUpVAw-1fh7yaXo7HZTMC5TiAziHU2uSEFbwhWFAE6bPo0scNdZyHeJdsyeNrUMJDlOlEPpeTcgm-WFBg1eiF8IiCmfC-7k_Z_weEe8GjPKtniBXAstWcY0qNhRoHHg6Zxq2Sla49K-kEyWsxtlum9A_Pvn3ThF7oCDylEBKcWIj4GZsZasBH9ilVSeds7Ilx-sa0KbVRNYs9ZJDz9h8QxNL9J3u4RKYBdKLQmdRI93c-hihOIqj8UhrVfbAo2rpl66F6p63khHSw10d6aG70WPBNJC5Bi3yCRCd3j2U4IgNtC-Bfo96hIS8EJ5sF7IXUFnkqe-wFUsmMv9rb67clemnelSB7zuRQHdOW_gbV9N2d5F891nRuzNVN6USJg"
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        
        # Setup console logging
        def log_console_message(msg):
            print(f"Console {msg.type}: {msg.text}")
        page.on("console", log_console_message)
        
        # Navigate to shared link
        page.goto(shared_link)
        page.wait_for_timeout(2000)
        
        # Enter password
        print("\nEntering password...")
        password_input = page.locator('#early-password-input, #decrypt-password').first
        password_input.fill('asd')
        page.locator('#early-password-submit').click()
        
        # Wait for initialization
        page.wait_for_timeout(3000)
        
        # Check namespace state
        print("\nChecking namespace state...")
        namespace_state = page.evaluate("""() => {
            const ns = window.NamespaceService?.getNamespace?.();
            return {
                namespaceId: ns?.namespaceId,
                hasMasterKey: !!ns?.masterKey,
                masterKeyLength: ns?.masterKey?.length,
                isSharedLink: window.NamespaceService?.state?.current?.isSharedLink,
                globalMasterKey: !!window._sharedLinkMasterKey
            };
        }""")
        
        print(f"Namespace state: {namespace_state}")
        
        # Check if API key was saved
        has_api_key = page.evaluate("() => !!localStorage.getItem('hackare_*_api_key')")
        print(f"API key in storage: {has_api_key}")
        
        # Try to send a message
        print("\nSending test message...")
        message_input = page.locator('#message-input')
        message_input.fill('Test message')
        page.locator('#send-btn').click()
        
        # Check for API key modal immediately
        page.wait_for_timeout(1000)
        api_key_modal_visible = page.locator('#api-key-modal').is_visible()
        
        if api_key_modal_visible:
            print("ERROR: API key modal appeared - API key was not properly saved!")
            # Close the modal if it appears
            if page.locator('#close-api-key-modal').is_visible():
                page.locator('#close-api-key-modal').click()
        else:
            print("Good: API key modal not shown - waiting for response...")
            
            # Wait for assistant response (up to 30 seconds)
            try:
                # Wait for the send button to stop showing "generating" state
                page.wait_for_function(
                    """() => {
                        const btn = document.querySelector('#send-btn');
                        return btn && !btn.hasAttribute('data-generating');
                    }""",
                    timeout=30000
                )
                print("Response generation completed")
                
                # Check for assistant messages
                assistant_messages = page.locator(".message.assistant")
                count = assistant_messages.count()
                print(f"Assistant messages found: {count}")
                
                if count > 0:
                    # Get the last assistant message
                    last_message = assistant_messages.nth(count - 1).text_content()
                    print(f"Last assistant response: {last_message[:100]}...")
                    print("SUCCESS: Chat is working with saved API key!")
                else:
                    print("WARNING: No assistant response received")
                    
            except Exception as e:
                print(f"Timeout waiting for response: {e}")
                print("This might mean the API key is invalid or there's a connection issue")
        
        # Keep browser open for inspection
        print("\nPress Ctrl+C to close browser...")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            pass
        
        browser.close()

if __name__ == "__main__":
    main()