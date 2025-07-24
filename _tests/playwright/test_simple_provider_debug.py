"""
Simple debug test for groq provider selection persistence.

This test focuses specifically on the groq provider selection issue by:
1. Opening settings modal
2. Changing provider to 'groq' with detailed logging
3. Verifying DataService.saveBaseUrlProvider calls
4. Checking storage persistence
5. Confirming selection persists after modal close/reopen

Uses the standard element IDs from the existing test suite.
"""

import json
import time
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown


def setup_console_logging(page: Page):
    """Setup console logging to capture DataService calls"""
    console_messages = []
    
    def log_console_message(msg):
        timestamp = time.strftime("%H:%M:%S.%f")[:-3]
        message_data = {
            'timestamp': timestamp,
            'type': msg.type,
            'text': msg.text
        }
        console_messages.append(message_data)
        print(f"[{timestamp}] Console {msg.type.upper()}: {msg.text}")
    
    page.on("console", log_console_message)
    return console_messages


def intercept_dataservice_calls(page: Page):
    """Add interceptors to monitor DataService method calls"""
    return page.evaluate("""
        () => {
            const interceptedCalls = [];
            
            if (window.DataService && typeof window.DataService.saveBaseUrlProvider === 'function') {
                const originalSaveProvider = window.DataService.saveBaseUrlProvider;
                window.DataService.saveBaseUrlProvider = function(provider) {
                    const callInfo = {
                        method: 'saveBaseUrlProvider',
                        provider: provider,
                        timestamp: new Date().toISOString()
                    };
                    interceptedCalls.push(callInfo);
                    console.log('DATASERVICE_SAVE_PROVIDER:', JSON.stringify(callInfo));
                    return originalSaveProvider.call(this, provider);
                };
                
                window.interceptedCalls = interceptedCalls;
                console.log('DATASERVICE_INTERCEPTED: saveBaseUrlProvider method hooked');
                return true;
            } else {
                console.log('DATASERVICE_NOT_FOUND: saveBaseUrlProvider method not available');
                return false;
            }
        }
    """)


def get_provider_state(page: Page):
    """Get current provider state from various sources"""
    return page.evaluate("""
        () => {
            const baseUrlSelect = document.getElementById('base-url-select');
            const currentProvider = baseUrlSelect ? baseUrlSelect.value : null;
            
            // Check storage
            const sessionValue = sessionStorage.getItem('currentProvider') || 
                                sessionStorage.getItem('baseUrlProvider') ||
                                sessionStorage.getItem('selected_provider');
            const localValue = localStorage.getItem('currentProvider') || 
                             localStorage.getItem('baseUrlProvider') ||
                             localStorage.getItem('selected_provider');
            
            // Check DataService if available
            let dataServiceValue = null;
            if (window.DataService) {
                try {
                    dataServiceValue = window.DataService.get('currentProvider') || 
                                     window.DataService.get('baseUrlProvider') ||
                                     window.DataService.get('selected_provider');
                } catch (e) {
                    console.log('Error getting DataService value:', e.message);
                }
            }
            
            // Get intercepted calls if available
            const interceptedCalls = window.interceptedCalls || [];
            
            return {
                domValue: currentProvider,
                sessionStorage: sessionValue,
                localStorage: localValue,
                dataService: dataServiceValue,
                interceptedCalls: interceptedCalls,
                timestamp: new Date().toISOString()
            };
        }
    """)


def test_simple_provider_debug(page: Page, serve_hacka_re):
    """Simple focused test for groq provider selection persistence"""
    console_messages = setup_console_logging(page)
    
    print("\n=== SIMPLE GROQ PROVIDER DEBUG TEST ===")
    
    # Step 1: Navigate and setup
    print("\n--- Step 1: Navigate to page ---")
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    screenshot_with_markdown(page, "initial_page_load", {
        "Step": "Initial navigation completed",
        "Welcome Modal": "Dismissed"
    })
    
    # Step 2: Check if settings modal is already open or open it
    print("\n--- Step 2: Handle settings modal ---")
    settings_modal = page.locator("#settings-modal")
    
    modal_is_active = page.evaluate("document.getElementById('settings-modal').classList.contains('active')")
    if modal_is_active or settings_modal.is_visible():
        print("Settings modal is already open")
    else:
        print("Opening settings modal")
        settings_button = page.locator("#settings-btn")
        expect(settings_button).to_be_visible()
        print(f"Settings button visible: {settings_button.is_visible()}")
        
        settings_button.click()
        
        # Wait for modal to be active
        page.wait_for_selector("#settings-modal.active", state="visible", timeout=3000)
    
    expect(settings_modal).to_be_visible()
    print("Settings modal is now accessible")
    
    screenshot_with_markdown(page, "settings_modal_opened", {
        "Step": "Settings modal opened",
        "Modal State": "Active and visible"
    })
    
    # Step 3: Setup DataService interception
    print("\n--- Step 3: Setup DataService interception ---")
    interception_success = intercept_dataservice_calls(page)
    print(f"DataService interception setup: {interception_success}")
    
    # Step 4: Check initial provider state
    print("\n--- Step 4: Check initial provider state ---")
    initial_state = get_provider_state(page)
    print(f"Initial provider state: {json.dumps(initial_state, indent=2)}")
    
    # Step 5: Locate provider select element
    print("\n--- Step 5: Locate provider select element ---")
    base_url_select = page.locator("#base-url-select")
    expect(base_url_select).to_be_attached()
    expect(base_url_select).to_be_visible()
    
    current_value = base_url_select.input_value()
    print(f"Current provider select value: {current_value}")
    
    # Verify groq option exists
    groq_option = page.locator("#base-url-select option[value='groq']")
    expect(groq_option).to_be_attached()
    print("Groq option found in select")
    
    screenshot_with_markdown(page, "before_provider_change", {
        "Step": "Before changing provider",
        "Current Provider": current_value,
        "Groq Option Available": "Yes",
        "DataService Intercepted": str(interception_success)
    })
    
    # Step 6: Change provider to groq
    print("\n--- Step 6: Change provider to groq ---")
    print("Selecting groq option...")
    base_url_select.select_option("groq")
    
    # Wait a moment for change events to process
    page.wait_for_timeout(1000)
    
    # Check state immediately after change
    after_change_state = get_provider_state(page)
    print(f"State after change: {json.dumps(after_change_state, indent=2)}")
    
    screenshot_with_markdown(page, "after_provider_change", {
        "Step": "After selecting groq",
        "DOM Value": str(after_change_state['domValue']),
        "Session Storage": str(after_change_state['sessionStorage']),
        "Local Storage": str(after_change_state['localStorage']),
        "DataService": str(after_change_state['dataService']),
        "Intercepted Calls": str(len(after_change_state['interceptedCalls']))
    })
    
    # Step 7: Verify DataService.saveBaseUrlProvider was called
    print("\n--- Step 7: Verify DataService calls ---")
    intercepted_calls = after_change_state['interceptedCalls']
    save_provider_calls = [call for call in intercepted_calls if call['method'] == 'saveBaseUrlProvider']
    
    print(f"Total intercepted calls: {len(intercepted_calls)}")
    print(f"saveBaseUrlProvider calls: {len(save_provider_calls)}")
    
    for call in save_provider_calls:
        print(f"  Call: {call['method']} with provider='{call['provider']}' at {call['timestamp']}")
    
    # Step 8: Close modal
    print("\n--- Step 8: Close settings modal ---")
    close_button = page.locator("#close-settings")
    if close_button.is_visible():
        close_button.click()
    else:
        # Try alternative close method
        page.keyboard.press("Escape")
    
    # Check if modal closed
    page.wait_for_timeout(1000)  # Wait for close animation
    modal_is_closed = not page.evaluate("document.getElementById('settings-modal').classList.contains('active')")
    print(f"Settings modal closed: {modal_is_closed}")
    
    # Check state after modal close
    after_close_state = get_provider_state(page)
    print(f"State after modal close: {json.dumps(after_close_state, indent=2)}")
    
    # Step 9: Reopen modal to check persistence
    print("\n--- Step 9: Reopen modal to check persistence ---")
    settings_button = page.locator("#settings-btn")
    settings_button.click()
    page.wait_for_selector("#settings-modal.active", state="visible", timeout=3000)
    expect(settings_modal).to_be_visible()
    
    # Wait a moment for modal to fully load
    page.wait_for_timeout(500)
    
    # Check final state
    final_state = get_provider_state(page)
    print(f"Final state after reopening: {json.dumps(final_state, indent=2)}")
    
    screenshot_with_markdown(page, "final_persistence_check", {
        "Step": "Modal reopened - checking persistence",
        "DOM Value": str(final_state['domValue']),
        "Session Storage": str(final_state['sessionStorage']),
        "Expected": "groq",
        "Persistence Test": "Pass" if final_state['domValue'] == 'groq' else "FAIL"
    })
    
    # Step 10: Analysis and results
    print("\n--- Step 10: Analysis ---")
    
    # Check console messages for relevant events
    dataservice_messages = [msg for msg in console_messages if 'DATASERVICE' in msg['text']]
    error_messages = [msg for msg in console_messages if msg['type'] == 'error']
    
    print(f"DataService-related console messages: {len(dataservice_messages)}")
    for msg in dataservice_messages:
        print(f"  {msg['timestamp']}: {msg['text']}")
    
    print(f"Error messages: {len(error_messages)}")
    for msg in error_messages:
        print(f"  {msg['timestamp']}: {msg['text']}")
    
    # Final results
    print(f"\n=== RESULTS ===")
    print(f"Initial provider: {initial_state['domValue']}")
    print(f"After change: {after_change_state['domValue']}")
    print(f"After modal close: {after_close_state['domValue']}")
    print(f"After reopen: {final_state['domValue']}")
    print(f"saveBaseUrlProvider calls: {len(save_provider_calls)}")
    
    # Check if the issue is reproduced
    if final_state['domValue'] == 'groq':
        print("✅ SUCCESS: Provider selection persisted correctly")
    else:
        print("❌ BUG REPRODUCED: Provider selection did not persist")
        print(f"   Expected: groq, Got: {final_state['domValue']}")
    
    # Check if storage was updated
    if final_state['sessionStorage'] == 'groq' or final_state['localStorage'] == 'groq':
        print("✅ Storage updated correctly")
    else:
        print("❌ Storage not updated correctly")
        print(f"   Session: {final_state['sessionStorage']}")
        print(f"   Local: {final_state['localStorage']}")
    
    # Check if DataService method was called
    if len(save_provider_calls) > 0:
        print("✅ DataService.saveBaseUrlProvider was called")
    else:
        print("❌ DataService.saveBaseUrlProvider was NOT called")
    
    # Save debug data
    debug_data = {
        'test_name': 'simple_provider_debug',
        'timestamp': time.strftime("%Y-%m-%d %H:%M:%S"),
        'states': {
            'initial': initial_state,
            'after_change': after_change_state,
            'after_close': after_close_state,
            'final': final_state
        },
        'dataservice_calls': save_provider_calls,
        'console_messages': console_messages,
        'test_result': {
            'persistence_success': final_state['domValue'] == 'groq',
            'storage_updated': final_state['sessionStorage'] == 'groq' or final_state['localStorage'] == 'groq',
            'dataservice_called': len(save_provider_calls) > 0
        }
    }
    
    with open('/Users/user/dev/hacka.re/_tests/playwright/debug_simple_provider.json', 'w') as f:
        json.dump(debug_data, f, indent=2)
    
    print(f"\nDebug data saved to: debug_simple_provider.json")
    print("=== TEST COMPLETE ===")


if __name__ == "__main__":
    # Allow running as standalone script for debugging
    import subprocess
    import sys
    
    result = subprocess.run([
        sys.executable, "-m", "pytest", 
        "/Users/user/dev/hacka.re/_tests/playwright/test_simple_provider_debug.py",
        "-v", "-s"
    ], cwd="/Users/user/dev/hacka.re/_tests/playwright")
    
    sys.exit(result.returncode)