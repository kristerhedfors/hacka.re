"""
Test shared link with proper response waiting (based on test_chat.py)
"""

import time
from playwright.sync_api import sync_playwright

def main():
    print("Testing shared link with API key and chat...")
    
    # The shared link with password 'asd'
    shared_link = "file:///Users/user/dev/hacka.re/index.html#gpt=cbn8HL9fs1xxQoKzSMfrOVip62T2TIlnptdgrmNBUdPQSkgb0Yd9ElaGbD45ju_Sa4VoF-Ph28FkX2mgmcsI_4kJmx-fL42bN0O9g2tvHQ26FBM1bWSitQsfKY8X5N9M08Mvifh7ATunzI4P0jd3rrFt6ULzVwChjpcxvUU8iEMhRO-ZIr_iWSosFM8oyL9f1n3_Wv-MSPtuQ6YX4SmuKuGe5g2zDjtxIeDP0vwQpDWSqfoCnS0b7Pe3C6awvcVVThhn6RQkQUpVAw-1fh7yaXo7HZTMC5TiAziHU2uSEFbwhWFAE6bPo0scNdZyHeJdsyeNrUMJDlOlEPpeTcgm-WFBg1eiF8IiCmfC-7k_Z_weEe8GjPKtniBXAstWcY0qNhRoHHg6Zxq2Sla49K-kEyWsxtlum9A_Pvn3ThF7oCDylEBKcWIj4GZsZasBH9ilVSeds7Ilx-sa0KbVRNYs9ZJDz9h8QxNL9J3u4RKYBdKLQmdRI93c-hihOIqj8UhrVfbAo2rpl66F6p63khHSw10d6aG70WPBNJC5Bi3yCRCd3j2U4IgNtC-Bfo96hIS8EJ5sF7IXUFnkqe-wFUsmMv9rb67clemnelSB7zuRQHdOW_gbV9N2d5F891nRuzNVN6USJg"
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        
        # === TAB 1: Open shared link ===
        print("\n=== TAB 1: Opening shared link ===")
        page1 = context.new_page()
        
        # Setup console logging
        console_logs = []
        def log_console(msg):
            timestamp = time.strftime("%H:%M:%S")
            log = f"[{timestamp}] {msg.type}: {msg.text}"
            console_logs.append(log)
            if any(keyword in msg.text.lower() for keyword in ['namespace', 'master key', 'api', 'crypto', 'storage unavailable']):
                print(f"TAB1: {log}")
        page1.on("console", log_console)
        
        page1.goto(shared_link)
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
        
        # Send a test message
        print("\nTAB1: Sending test message...")
        message_input = page1.locator('#message-input')
        test_message = "Hello, please respond with just 'Hi!' and nothing else."
        message_input.fill(test_message)
        page1.locator('#send-btn').click()
        
        # Wait for user message to appear
        try:
            page1.wait_for_selector(".message.user .message-content", state="visible", timeout=5000)
            print("TAB1: User message appeared")
        except Exception as e:
            print(f"TAB1: ERROR - User message did not appear: {e}")
        
        # Check for API key modal
        if page1.locator("#api-key-modal").is_visible():
            print("TAB1: ❌ API key modal appeared - API key not saved!")
            # Try to close it
            if page1.locator('#close-api-key-modal').is_visible():
                page1.locator('#close-api-key-modal').click()
        else:
            print("TAB1: ✓ No API key modal")
            
            # Wait for assistant response (following test_chat.py pattern)
            print("TAB1: Waiting for assistant response...")
            
            try:
                # Wait for assistant message to appear
                page1.wait_for_selector(".message.assistant .message-content", state="visible", timeout=15000)
                print("TAB1: Assistant message appeared")
                
                # Wait for content to fully load
                page1.wait_for_timeout(2000)
                
                # Get the assistant response
                assistant_messages = page1.locator(".message.assistant .message-content")
                response_found = False
                actual_response = ""
                
                for i in range(assistant_messages.count()):
                    msg_content = assistant_messages.nth(i).text_content()
                    if msg_content and msg_content.strip():
                        response_found = True
                        actual_response = msg_content.strip()
                        print(f"TAB1: Found assistant response: {actual_response[:100]}...")
                        break
                
                if response_found:
                    print("TAB1: ✅ Chat working with saved API key!")
                else:
                    print("TAB1: ⚠ No response content found")
                    
            except Exception as e:
                print(f"TAB1: Error waiting for response: {e}")
        
        # Check settings
        print("\nTAB1: Opening settings...")
        page1.locator('#settings-btn').click()
        page1.wait_for_timeout(1000)
        
        api_key_value = page1.locator('#api-key-update').input_value()
        print(f"TAB1: API key in settings: {'[POPULATED]' if api_key_value else '[EMPTY]'}")
        
        page1.locator('#close-settings').click()
        
        # === TAB 2: Open same shared link ===
        print("\n=== TAB 2: Opening same shared link ===")
        page2 = context.new_page()
        
        # Setup console logging for tab 2
        def log_console2(msg):
            timestamp = time.strftime("%H:%M:%S")
            if any(keyword in msg.text.lower() for keyword in ['namespace', 'master key', 'api', 'crypto', 'storage unavailable']):
                print(f"TAB2: [{timestamp}] {msg.type}: {msg.text}")
        page2.on("console", log_console2)
        
        page2.goto(shared_link)
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
        
        # Send a test message from tab 2
        print("\nTAB2: Sending test message...")
        message_input2 = page2.locator('#message-input')
        message_input2.fill("Another test from tab 2")
        page2.locator('#send-btn').click()
        
        # Check for API key modal
        page2.wait_for_timeout(1000)
        if page2.locator("#api-key-modal").is_visible():
            print("TAB2: ❌ API key modal appeared - cross-tab sync failed!")
        else:
            print("TAB2: ✓ No API key modal - API key available from cross-tab sync")
            
            # Wait for response
            try:
                page2.wait_for_selector(".message.assistant .message-content", state="visible", timeout=15000)
                print("TAB2: ✅ Got assistant response - cross-tab sync working!")
            except:
                print("TAB2: ⚠ No assistant response")
        
        # === Check TAB 1 after TAB 2 activity ===
        print("\n=== Checking TAB 1 after TAB 2 activity ===")
        page1.bring_to_front()
        page1.wait_for_timeout(2000)
        
        # Open settings to check if API key is still there
        page1.locator('#settings-btn').click()
        page1.wait_for_timeout(1000)
        
        api_key_value1 = page1.locator('#api-key-update').input_value()
        if api_key_value1:
            print("TAB1: ✅ API key still present after cross-tab activity")
        else:
            print("TAB1: ❌ API key lost after cross-tab activity - BUG!")
        
        print("\n=== Test Summary ===")
        print(f"TAB1 namespace initialized: {state1['hasMasterKey']}")
        print(f"TAB2 namespace initialized: {state2['hasMasterKey']}")
        print(f"TAB1 API key preserved: {bool(api_key_value1)}")
        
        print("\nPress Ctrl+C to close browser...")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nClosing...")
        
        browser.close()

if __name__ == "__main__":
    main()