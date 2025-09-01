"""
Debug test for provider selection persistence issue.

This test investigates why provider selection isn't persisting when changed 
from 'openai' to 'groq' in the settings modal by:
1. Checking initial provider state
2. Changing provider step by step with detailed logging
3. Verifying DataService methods are called correctly
4. Checking sessionStorage contents before and after
5. Verifying change events are firing
6. Adding comprehensive console logging
"""

import json
import time
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown


def setup_debug_console_logging(page: Page):
    """Setup comprehensive console logging for debugging"""
    console_messages = []
    
    def log_console_message(msg):
        timestamp = time.strftime("%H:%M:%S.%f")[:-3]
        message_data = {
            'timestamp': timestamp,
            'type': msg.type,
            'text': msg.text,
            'location': getattr(msg, 'location', None)
        }
        console_messages.append(message_data)
        print(f"[{timestamp}] Console {msg.type.upper()}: {msg.text}")
    
    page.on("console", log_console_message)
    return console_messages


def get_storage_debug_info(page: Page):
    """Get comprehensive storage debug information"""
    return page.evaluate("""
        () => {
            const sessionKeys = Object.keys(sessionStorage);
            const localKeys = Object.keys(localStorage);
            
            const sessionData = {};
            sessionKeys.forEach(key => {
                try {
                    sessionData[key] = sessionStorage.getItem(key);
                } catch (e) {
                    sessionData[key] = `Error reading: ${e.message}`;
                }
            });
            
            const localData = {};
            localKeys.forEach(key => {
                try {
                    const value = localStorage.getItem(key);
                    // Truncate long values for readability
                    localData[key] = value && value.length > 100 ? 
                        value.substring(0, 100) + '...[truncated]' : value;
                } catch (e) {
                    localData[key] = `Error reading: ${e.message}`;
                }
            });
            
            return {
                sessionStorage: sessionData,
                localStorage: localData,
                sessionCount: sessionKeys.length,
                localCount: localKeys.length
            };
        }
    """)


def get_provider_debug_info(page: Page): 
    """Get detailed provider-related debug information"""
    return page.evaluate("""
        () => {
            // Check DOM elements
            const providerSelect = document.getElementById('provider-select');
            const settingsModal = document.getElementById('settings-modal');
            
            // Check if DataService exists and its methods
            const dataServiceExists = typeof window.DataService !== 'undefined';
            const dataServiceMethods = dataServiceExists ? Object.getOwnPropertyNames(window.DataService) : [];
            
            // Check current provider value from different sources
            let currentProviderSources = {};
            
            if (providerSelect) {
                currentProviderSources.domValue = providerSelect.value;
                currentProviderSources.domOptions = Array.from(providerSelect.options).map(opt => ({
                    value: opt.value,
                    text: opt.textContent,
                    selected: opt.selected
                }));
            }
            
            // Try to get provider from DataService if available
            if (dataServiceExists && typeof window.DataService.get === 'function') {
                try {
                    currentProviderSources.dataServiceValue = window.DataService.get('currentProvider');
                } catch (e) {
                    currentProviderSources.dataServiceError = e.message;
                }
            }
            
            // Check sessionStorage directly
            currentProviderSources.sessionStorageDirect = sessionStorage.getItem('currentProvider');
            
            return {
                providerSelectExists: !!providerSelect,
                settingsModalExists: !!settingsModal,
                dataServiceExists,
                dataServiceMethods,
                currentProviderSources,
                timestamp: new Date().toISOString()
            };
        }
    """)


def test_debug_provider_persistence(page: Page, serve_hacka_re):
    """Debug test for provider selection persistence issue"""
    console_messages = setup_debug_console_logging(page)
    
    print("\n=== STARTING PROVIDER PERSISTENCE DEBUG TEST ===")
    
    # Step 1: Navigate and setup
    print("\n--- Step 1: Initial Navigation ---")
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    # Get initial state
    initial_storage = get_storage_debug_info(page)
    initial_provider = get_provider_debug_info(page)
    
    screenshot_with_markdown(page, "initial_state", {
        "Step": "Initial page load",
        "Session Storage Keys": str(initial_storage['sessionCount']),
        "Local Storage Keys": str(initial_storage['localCount']),
        "Provider Select Exists": str(initial_provider['providerSelectExists']),
        "DataService Exists": str(initial_provider['dataServiceExists']),
        "Current Provider (DOM)": str(initial_provider['currentProviderSources'].get('domValue', 'N/A')),
        "Current Provider (DataService)": str(initial_provider['currentProviderSources'].get('dataServiceValue', 'N/A')),
        "Current Provider (SessionStorage)": str(initial_provider['currentProviderSources'].get('sessionStorageDirect', 'N/A'))
    })
    
    print(f"Initial storage state: {json.dumps(initial_storage, indent=2)}")
    print(f"Initial provider state: {json.dumps(initial_provider, indent=2)}")
    
    # Step 2: Open settings modal
    print("\n--- Step 2: Opening Settings Modal ---")
    settings_button = page.locator("#settings-button")
    expect(settings_button).to_be_visible()
    settings_button.click()
    
    # Wait for modal to be fully visible
    settings_modal = page.locator("#settings-modal")
    expect(settings_modal).to_be_visible()
    # page.wait_for_timeout(500)  # TODO: Replace with proper wait condition  # Brief wait for modal animations
    
    modal_open_provider = get_provider_debug_info(page)
    screenshot_with_markdown(page, "modal_opened", {
        "Step": "Settings modal opened",
        "Modal Visible": str(settings_modal.is_visible()),
        "Provider Select Value": str(modal_open_provider['currentProviderSources'].get('domValue', 'N/A')),
        "Available Options": str(len(modal_open_provider['currentProviderSources'].get('domOptions', [])))
    })
    
    print(f"Modal open provider state: {json.dumps(modal_open_provider, indent=2)}")
    
    # Step 3: Locate and examine provider select
    print("\n--- Step 3: Examining Provider Select ---")
    provider_select = page.locator("#provider-select")
    expect(provider_select).to_be_visible()
    
    # Get current value and available options
    current_value = provider_select.input_value()
    options = page.locator("#provider-select option").all()
    option_values = [opt.get_attribute("value") for opt in options]
    option_texts = [opt.text_content() for opt in options]
    
    print(f"Current provider value: {current_value}")
    print(f"Available options: {list(zip(option_values, option_texts))}")
    
    # Step 4: Add event listeners for debugging
    print("\n--- Step 4: Adding Debug Event Listeners ---")
    page.evaluate("""
        () => {
            const providerSelect = document.getElementById('provider-select');
            if (providerSelect) {
                // Add change event listener
                providerSelect.addEventListener('change', function(e) {
                    console.log('PROVIDER_CHANGE_EVENT:', {
                        oldValue: e.target.dataset.oldValue || 'unknown',
                        newValue: e.target.value,
                        timestamp: new Date().toISOString()
                    });
                    e.target.dataset.oldValue = e.target.value;
                });
                
                // Add input event listener
                providerSelect.addEventListener('input', function(e) {
                    console.log('PROVIDER_INPUT_EVENT:', {
                        value: e.target.value,
                        timestamp: new Date().toISOString()
                    });
                });
                
                // Set initial old value
                providerSelect.dataset.oldValue = providerSelect.value;
                
                console.log('DEBUG_LISTENERS_ADDED:', {
                    initialValue: providerSelect.value,
                    hasChangeListener: true,
                    hasInputListener: true
                });
            }
        }
    """)
    
    # Step 5: Check storage before change
    print("\n--- Step 5: Storage State Before Change ---")
    before_change_storage = get_storage_debug_info(page)
    before_change_provider = get_provider_debug_info(page)
    
    print(f"Storage before change: {json.dumps(before_change_storage, indent=2)}")
    print(f"Provider state before change: {json.dumps(before_change_provider, indent=2)}")
    
    # Step 6: Change provider to groq
    print("\n--- Step 6: Changing Provider to Groq ---")
    
    # First, verify groq is available as an option
    groq_option = page.locator("#provider-select option[value='groq']")
    expect(groq_option).to_be_attached()
    
    # Monitor DataService calls
    page.evaluate("""
        () => {
            if (window.DataService && typeof window.DataService.set === 'function') {
                const originalSet = window.DataService.set;
                window.DataService.set = function(key, value) {
                    console.log('DATASERVICE_SET_CALLED:', {
                        key: key,
                        value: value,
                        timestamp: new Date().toISOString(),
                        stackTrace: new Error().stack.split('\\n').slice(1, 4)
                    });
                    return originalSet.call(this, key, value);
                };
                console.log('DATASERVICE_SET_INTERCEPTED');
            } else {
                console.log('DATASERVICE_NOT_AVAILABLE_FOR_INTERCEPTION');
            }
        }
    """)
    
    # Perform the selection change
    provider_select.select_option("groq")
    
    # Wait a moment for events to process
    # page.wait_for_timeout(1000)  # TODO: Replace with proper wait condition
    
    # Step 7: Check immediate state after change
    print("\n--- Step 7: State Immediately After Change ---")
    after_change_provider = get_provider_debug_info(page)
    after_change_storage = get_storage_debug_info(page)
    
    screenshot_with_markdown(page, "after_provider_change", {
        "Step": "After changing provider to groq",
        "Provider Select Value": str(after_change_provider['currentProviderSources'].get('domValue', 'N/A')),
        "DataService Value": str(after_change_provider['currentProviderSources'].get('dataServiceValue', 'N/A')),
        "SessionStorage Value": str(after_change_provider['currentProviderSources'].get('sessionStorageDirect', 'N/A')),
        "Console Messages": str(len(console_messages))
    })
    
    print(f"Provider state after change: {json.dumps(after_change_provider, indent=2)}")
    print(f"Storage after change: {json.dumps(after_change_storage, indent=2)}")
    
    # Step 8: Close modal and check persistence
    print("\n--- Step 8: Closing Modal and Checking Persistence ---")
    close_button = page.locator("#settings-modal .modal-close")
    close_button.click()
    
    # Wait for modal to close
    expect(settings_modal).not_to_be_visible()
    # page.wait_for_timeout(500)  # TODO: Replace with proper wait condition
    
    # Check state after modal close
    after_close_provider = get_provider_debug_info(page)
    after_close_storage = get_storage_debug_info(page)
    
    print(f"Provider state after modal close: {json.dumps(after_close_provider, indent=2)}")
    print(f"Storage after modal close: {json.dumps(after_close_storage, indent=2)}")
    
    # Step 9: Reopen modal to check if selection persisted
    print("\n--- Step 9: Reopening Modal to Check Persistence ---")
    settings_button.click()
    expect(settings_modal).to_be_visible()
    # page.wait_for_timeout(500)  # TODO: Replace with proper wait condition
    
    # Check final state
    final_provider = get_provider_debug_info(page)
    final_storage = get_storage_debug_info(page)
    
    screenshot_with_markdown(page, "final_state", {
        "Step": "Modal reopened - checking persistence",
        "Provider Select Value": str(final_provider['currentProviderSources'].get('domValue', 'N/A')),
        "DataService Value": str(final_provider['currentProviderSources'].get('dataServiceValue', 'N/A')),
        "SessionStorage Value": str(final_provider['currentProviderSources'].get('sessionStorageDirect', 'N/A')),
        "Expected": "groq",
        "Persistence Success": str(final_provider['currentProviderSources'].get('domValue') == 'groq')
    })
    
    print(f"Final provider state: {json.dumps(final_provider, indent=2)}")
    print(f"Final storage state: {json.dumps(final_storage, indent=2)}")
    
    # Step 10: Analyze console messages
    print("\n--- Step 10: Console Message Analysis ---")
    provider_events = [msg for msg in console_messages if 'PROVIDER_' in msg['text']]
    dataservice_events = [msg for msg in console_messages if 'DATASERVICE_' in msg['text']]
    error_messages = [msg for msg in console_messages if msg['type'] == 'error']
    
    print(f"Provider-related events: {len(provider_events)}")
    for event in provider_events:
        print(f"  {event['timestamp']}: {event['text']}")
    
    print(f"DataService events: {len(dataservice_events)}")
    for event in dataservice_events:
        print(f"  {event['timestamp']}: {event['text']}")
    
    print(f"Error messages: {len(error_messages)}")
    for error in error_messages:
        print(f"  {error['timestamp']}: {error['text']}")
    
    # Save detailed debug information to file
    debug_data = {
        'test_timestamp': time.strftime("%Y-%m-%d %H:%M:%S"),
        'initial_state': {
            'storage': initial_storage,
            'provider': initial_provider
        },
        'after_change_state': {
            'storage': after_change_storage,
            'provider': after_change_provider
        },
        'final_state': {
            'storage': final_storage,
            'provider': final_provider
        },
        'console_messages': console_messages,
        'provider_events': provider_events,
        'dataservice_events': dataservice_events,
        'error_messages': error_messages
    }
    
    with open('/Users/user/dev/hacka.re/_tests/playwright/debug_provider_persistence.json', 'w') as f:
        json.dump(debug_data, f, indent=2)
    
    print("\n=== DEBUG ANALYSIS COMPLETE ===")
    print(f"Debug data saved to: debug_provider_persistence.json")
    print(f"Total console messages captured: {len(console_messages)}")
    print(f"Provider-related events: {len(provider_events)}")
    print(f"DataService events: {len(dataservice_events)}")
    print(f"Error messages: {len(error_messages)}")
    
    # Final assertions to verify the bug
    final_dom_value = final_provider['currentProviderSources'].get('domValue')
    final_session_value = final_provider['currentProviderSources'].get('sessionStorageDirect')
    final_dataservice_value = final_provider['currentProviderSources'].get('dataServiceValue')
    
    print(f"\nFINAL VALUES:")
    print(f"DOM Value: {final_dom_value}")
    print(f"SessionStorage Value: {final_session_value}")
    print(f"DataService Value: {final_dataservice_value}")
    
    # Check if persistence worked
    if final_dom_value == 'groq':
        print("✅ Provider selection persisted correctly in DOM")
    else:
        print(f"❌ Provider selection did NOT persist in DOM (expected: groq, got: {final_dom_value})")
    
    if final_session_value == 'groq':
        print("✅ Provider selection persisted correctly in SessionStorage")
    else:
        print(f"❌ Provider selection did NOT persist in SessionStorage (expected: groq, got: {final_session_value})")
    
    if final_dataservice_value == 'groq':
        print("✅ Provider selection persisted correctly in DataService")
    else:
        print(f"❌ Provider selection did NOT persist in DataService (expected: groq, got: {final_dataservice_value})")


if __name__ == "__main__":
    # Allow running as standalone script for debugging
    import subprocess
    import sys
    
    # Run the test
    result = subprocess.run([
        sys.executable, "-m", "pytest", 
        "/Users/user/dev/hacka.re/_tests/playwright/test_debug_provider_persistence.py",
        "-v", "-s"
    ], cwd="/Users/user/dev/hacka.re/_tests/playwright")
    
    sys.exit(result.returncode)