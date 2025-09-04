"""Debug script to check what's creating the unencrypted sync keys"""

from playwright.sync_api import sync_playwright
import time
import json

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()
    
    # Setup console logging
    def log_console(msg):
        print(f"[CONSOLE {msg.type}]: {msg.text}")
    page.on("console", log_console)
    
    # Navigate to shared link
    shared_link = "http://localhost:8000/#gpt=uEQ0lwn_trMbLfFfwmENtqzQhp9569Y4-57QLN0Tuw3A1Wdld3wqLz6FD5TZ10WoxEe45wZArWNOVU-JO_7z3kaQpEum0wwfXrQoXvatlPCcUG_hcllnMOy8RCpJ_Y7zgsYldEkJa5vZ2EwOhA6kNFIyWetCIuuJ_xqsqqrOGMMLmh4aRitjEGYuSsTErBk5IP-8CRbcCbwYug-IJfOu7wzYdsLD5jUQYgNYpkjSURDen8ae6ghSwyn1KJ_5cio9Kyh6OkMKfjZozLLeOkW6wliugEKY_IOa7qv7-Z2WN4d8vs5WztfhXcFb5Xhz-ccRWimAt-O61W1LWWVSxHpiausFsoEXzaB3SMRJnSwvs4KWF4U69x-AoksrRUcPCK45sa_hr-mMnBjJKm9sdRNWulcJlZPGRzxdej2nj_ao91-fOOIb3Z7pWhs0JQZmSUobSl-BUpnq0oIrasz5PHl2z7i3wJDB880PhpPcj_SZWpBzYFYI7mo2-oRzbiQPmrNdh6Rx4iFxEAMdhWMGVkaFCXV3N0-vWVBEOLDIL1o8U8h-9qM3WmLdMyCRqhAjy2fqLJJKf_v-UZFvrDzxOmDlrEHFFtf_WgoU1AodN60belmsiY76hGvOWa2m"
    
    print("Navigating to shared link...")
    page.goto(shared_link)
    
    # Enter password
    time.sleep(1)
    password_input = page.locator('#early-password-input, #decrypt-password').first
    password_input.fill('asd')
    page.keyboard.press('Enter')
    
    # Wait for initialization
    time.sleep(3)
    
    # Check localStorage for all keys
    storage_keys = page.evaluate("""() => {
        const allKeys = Object.keys(localStorage);
        const result = {};
        allKeys.forEach(key => {
            result[key] = localStorage.getItem(key);
        });
        return result;
    }""")
    
    print("\n=== All localStorage Keys ===")
    for key in sorted(storage_keys.keys()):
        if 'sync' in key.lower():
            value = storage_keys[key]
            # Truncate long values
            if len(value) > 100:
                value = value[:100] + "..."
            print(f"  {key}: {value}")
    
    # Check who's writing the hackare_ prefixed sync key
    print("\n=== Checking CrossTabSyncService code ===")
    service_check = page.evaluate("""() => {
        // Get the updateHistoryHash function code
        const funcCode = CrossTabSyncService.toString();
        
        // Check for any hardcoded prefixes
        const hasHackarePrefixes = funcCode.includes('hackare_');
        const hasDirectLocalStorage = funcCode.includes('localStorage.setItem');
        
        return {
            hasHackarePrefixes: hasHackarePrefixes,
            hasDirectLocalStorage: hasDirectLocalStorage,
            serviceAvailable: typeof CrossTabSyncService !== 'undefined'
        };
    }""")
    
    print(f"Service check: {json.dumps(service_check, indent=2)}")
    
    # Try to trace where the key is coming from
    print("\n=== Setting localStorage proxy to trace writes ===")
    page.evaluate("""() => {
        const originalSetItem = localStorage.setItem;
        localStorage.setItem = function(key, value) {
            if (key.includes('sync')) {
                console.error('localStorage.setItem called with sync key:', key);
                console.trace();
            }
            return originalSetItem.call(this, key, value);
        };
    }""")
    
    # Trigger a sync event
    print("\n=== Triggering sync by adding a message ===")
    message_input = page.locator("#message-input")
    message_input.fill("Test message to trigger sync")
    page.locator("#send-btn").click()
    
    time.sleep(3)
    
    # Check again
    print("\n=== Checking localStorage after message ===")
    storage_keys_after = page.evaluate("""() => {
        const allKeys = Object.keys(localStorage);
        return allKeys.filter(key => key.includes('sync'));
    }""")
    
    print("Sync-related keys:", storage_keys_after)
    
    page.pause()  # Keep browser open for inspection
    browser.close()