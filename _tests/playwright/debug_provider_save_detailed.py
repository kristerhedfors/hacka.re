"""
Debug provider saving in detail - step by step console logging
"""
import time
from playwright.sync_api import Page
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown

def test_debug_provider_save_step_by_step(page: Page, serve_hacka_re, api_key):
    """Debug provider saving step by step with console logging"""
    
    # Setup console logging
    console_messages = []
    def log_console_message(msg):
        timestamp = time.strftime("%H:%M:%S.%f")[:-3]
        console_messages.append({
            'timestamp': timestamp,
            'type': msg.type,
            'text': msg.text
        })
        print(f"[{timestamp}] Console {msg.type.upper()}: {msg.text}")
    
    page.on("console", log_console_message)
    
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    print("=== STEP BY STEP PROVIDER SAVE DEBUG ===")
    
    # Step 1: Check initial state
    initial_check = page.evaluate("""() => {
        const storage = window.StorageTypeService ? window.StorageTypeService.getStorage() : null;
        const storageType = storage === sessionStorage ? 'sessionStorage' : 'localStorage';
        const currentProvider = window.DataService ? window.DataService.getBaseUrlProvider() : 'unknown';
        const sessionKeys = Object.keys(sessionStorage);
        
        console.log('Initial check:', {
            storageType,
            currentProvider,
            sessionKeys: sessionKeys.length
        });
        
        return {
            storageType,
            currentProvider,
            sessionKeys: sessionKeys.length
        };
    }""")
    
    print(f"Step 1 - Initial state: {initial_check}")
    
    # Step 2: Open settings
    print("\\nStep 2: Opening settings...")
    settings_btn = page.locator('#settings-btn')
    settings_btn.click()
    page.wait_for_timeout(500)
    
    # Step 3: Check provider dropdown current value
    provider_select = page.locator('#base-url-select')
    initial_dropdown_value = provider_select.input_value()
    print(f"Step 3 - Provider dropdown initial value: '{initial_dropdown_value}'")
    
    # Step 4: Select groq and monitor what happens
    print("\\nStep 4: Selecting 'groq' from dropdown...")
    
    # Add detailed logging to monitor the change event
    page.evaluate("""() => {
        const select = document.getElementById('base-url-select');
        if (select) {
            select.addEventListener('change', function(e) {
                console.log('Provider dropdown changed to:', e.target.value);
                console.log('DataService available:', !!window.DataService);
                console.log('BaseUrlManager available:', !!window.BaseUrlManager);
                
                // Check what gets saved
                setTimeout(() => {
                    const savedProvider = window.DataService ? window.DataService.getBaseUrlProvider() : 'unknown';
                    console.log('Provider after change event:', savedProvider);
                }, 100);
            });
        } else {
            console.log('Provider select element not found!');
        }
    }""")
    
    # Now select groq
    provider_select.select_option('groq')
    page.wait_for_timeout(1000)  # Wait for any async operations
    
    # Step 5: Check what was saved immediately after selection
    after_selection = page.evaluate("""() => {
        const currentProvider = window.DataService ? window.DataService.getBaseUrlProvider() : 'unknown';
        const dropdownValue = document.getElementById('base-url-select') ? document.getElementById('base-url-select').value : 'not-found';
        const sessionKeys = Object.keys(sessionStorage);
        
        console.log('After groq selection:', {
            savedProvider: currentProvider,
            dropdownValue: dropdownValue,
            sessionKeys: sessionKeys.length
        });
        
        return {
            savedProvider: currentProvider,
            dropdownValue: dropdownValue,
            sessionKeys: sessionKeys.length
        };
    }""")
    
    print(f"Step 5 - After selecting groq: {after_selection}")
    
    # Step 6: Close settings and reopen to check persistence
    print("\\nStep 6: Closing and reopening settings...")
    close_settings_btn = page.locator('#close-settings')
    close_settings_btn.click()
    page.wait_for_timeout(500)
    
    # Reopen settings
    settings_btn.click()
    page.wait_for_timeout(500)
    
    # Step 7: Check what the dropdown shows after reopening
    final_dropdown_value = provider_select.input_value()
    
    final_check = page.evaluate("""() => {
        const currentProvider = window.DataService ? window.DataService.getBaseUrlProvider() : 'unknown';
        const dropdownValue = document.getElementById('base-url-select') ? document.getElementById('base-url-select').value : 'not-found';
        
        console.log('Final check after reopen:', {
            savedProvider: currentProvider,
            dropdownValue: dropdownValue
        });
        
        return {
            savedProvider: currentProvider,
            dropdownValue: dropdownValue
        };
    }""")
    
    print(f"Step 7 - After reopening settings: {final_check}")
    print(f"Final dropdown value: '{final_dropdown_value}'")
    
    # Generate detailed screenshot
    screenshot_with_markdown(page, "provider_save_debug", {
        "Initial Provider": initial_check['currentProvider'],
        "After Selection Saved": after_selection['savedProvider'],
        "After Selection Dropdown": after_selection['dropdownValue'],
        "Final Saved": final_check['savedProvider'],
        "Final Dropdown": final_check['dropdownValue'],
        "Storage Type": initial_check['storageType'],
        "Console Messages": str(len(console_messages))
    })
    
    # Save console messages for analysis
    with open('debug_console_provider.json', 'w') as f:
        import json
        json.dump(console_messages, f, indent=2)
    
    print(f"\\n=== SUMMARY ===")
    print(f"Expected: groq")
    print(f"Got: {final_dropdown_value}")
    print(f"Success: {final_dropdown_value == 'groq'}")
    print(f"Console messages saved to: debug_console_provider.json")

if __name__ == "__main__":
    # For manual testing
    from playwright.sync_api import sync_playwright
    import os
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()
        
        api_key = os.getenv('OPENAI_API_KEY', 'test-key')
        
        test_debug_provider_save_step_by_step(page, 'http://localhost:8000', api_key)
        
        input("Press Enter to close browser...")
        browser.close()