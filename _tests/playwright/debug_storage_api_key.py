"""Debug localStorage and API key storage to understand why no requests are made."""

import pytest
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown
from playwright.sync_api import Page, expect
import time
import json


def test_debug_api_key_storage(page: Page, serve_hacka_re):
    """Debug API key storage and retrieval process."""
    page.goto(serve_hacka_re)
    
    berget_api_key = "sk_ber_3p6tTmkcEdBgEfIbAdU2BDxmyKbXB30RKoVfv_1f097c4eed0dac42"
    
    print(f"\n=== DEBUGGING API KEY STORAGE ===")
    
    # Clear storage and setup
    page.evaluate("() => localStorage.clear()")
    page.reload()
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Check initial localStorage state
    initial_storage = page.evaluate("() => Object.keys(localStorage)")
    print(f"Initial localStorage keys: {initial_storage}")
    
    screenshot_with_markdown(page, "api_key_debug_initial", {
        "Step": "Initial state",
        "LocalStorage Keys": str(initial_storage),
        "LocalStorage Count": str(len(initial_storage))
    })
    
    # Open settings
    settings_button = page.locator("#settings-btn")
    settings_button.click()
    page.wait_for_selector("#settings-modal", state="visible", timeout=5000)
    
    # Fill API key
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill(berget_api_key)
    
    # Wait for auto-detection
    page.wait_for_timeout(2000)
    
    # Check localStorage after entering key but before closing modal
    storage_after_entry = page.evaluate("() => Object.keys(localStorage)")
    storage_values = page.evaluate("() => { const obj = {}; for(let key of Object.keys(localStorage)) { obj[key] = localStorage.getItem(key); } return obj; }")
    
    print(f"Storage after API key entry: {storage_after_entry}")
    print(f"Storage values: {json.dumps(storage_values, indent=2)}")
    
    screenshot_with_markdown(page, "api_key_debug_after_entry", {
        "Step": "After entering API key",
        "LocalStorage Keys": str(storage_after_entry),
        "Has API Key": str("api_key" in str(storage_values).lower()),
        "Provider Detection": str(page.locator("#api-key-update-detection-text").text_content())
    })
    
    # Check if we need to save/submit
    save_button = page.locator("button:has-text('Save'), button[type='submit'], #save-settings")
    if save_button.count() > 0:
        print("Found save button, clicking it")
        save_button.first.click()
        page.wait_for_timeout(1000)
    
    # Close settings
    page.keyboard.press("Escape")
    page.wait_for_selector("#settings-modal", state="hidden", timeout=5000)
    
    # Check localStorage after closing settings
    final_storage = page.evaluate("() => Object.keys(localStorage)")
    final_values = page.evaluate("() => { const obj = {}; for(let key of Object.keys(localStorage)) { obj[key] = localStorage.getItem(key); } return obj; }")
    
    print(f"Final storage keys: {final_storage}")
    print(f"Final storage values: {json.dumps(final_values, indent=2)}")
    
    screenshot_with_markdown(page, "api_key_debug_final", {
        "Step": "After closing settings",
        "LocalStorage Keys": str(final_storage),
        "Has API Key": str("api_key" in str(final_values).lower()),
        "API Key Value": str([v for k, v in final_values.items() if "api" in k.lower() or "key" in k.lower()]),
        "Provider Config": str([v for k, v in final_values.items() if "provider" in k.lower()])
    })
    
    # Test API key retrieval functions
    api_service_check = page.evaluate("""
        () => {
            try {
                // Try to access API configuration
                const hasStorageService = typeof StorageService !== 'undefined';
                const hasApiService = typeof ApiService !== 'undefined';
                
                let apiKey = null;
                let provider = null;
                
                if (hasStorageService) {
                    apiKey = StorageService.getApiKey ? StorageService.getApiKey() : 'getApiKey method not found';
                    provider = StorageService.getApiProvider ? StorageService.getApiProvider() : 'getApiProvider method not found';
                }
                
                return {
                    hasStorageService,
                    hasApiService,
                    apiKey,
                    provider,
                    localStorage: Object.keys(localStorage)
                };
            } catch (error) {
                return { error: error.message };
            }
        }
    """)
    
    print(f"API service check: {json.dumps(api_service_check, indent=2)}")
    
    screenshot_with_markdown(page, "api_key_debug_service_check", {
        "Step": "Service availability check",
        "StorageService Available": str(api_service_check.get('hasStorageService', False)),
        "ApiService Available": str(api_service_check.get('hasApiService', False)),
        "Retrieved API Key": str(api_service_check.get('apiKey', 'None')[:20] + '...' if api_service_check.get('apiKey') else 'None'),
        "Retrieved Provider": str(api_service_check.get('provider', 'None')),
        "Error": str(api_service_check.get('error', 'None'))
    })
    
    # Try to send a message and capture any client-side errors
    console_messages = []
    def log_console_message(msg):
        console_messages.append({
            'type': msg.type,
            'text': msg.text,
            'timestamp': time.strftime("%H:%M:%S")
        })
        print(f"Console {msg.type}: {msg.text}")
    
    page.on("console", log_console_message)
    
    # Send test message
    chat_input = page.locator("#message-input")
    chat_input.fill("Test message")
    
    send_button = page.locator("#send-btn")
    send_button.click()
    
    # Wait for any errors
    page.wait_for_timeout(5000)
    
    screenshot_with_markdown(page, "api_key_debug_after_send", {
        "Step": "After attempting to send message",
        "Console Messages": str(len(console_messages)),
        "Recent Console": str(console_messages[-5:] if console_messages else "None"),
        "User Messages": str(page.locator(".message.user").count()),
        "System Messages": str(page.locator(".message.system").count())
    })
    
    # Save debug data
    debug_data = {
        'test': 'API Key Storage Debug',
        'initial_storage': initial_storage,
        'storage_after_entry': storage_after_entry,
        'final_storage': final_storage,
        'final_values': final_values,
        'api_service_check': api_service_check,
        'console_messages': console_messages
    }
    
    with open('_tests/playwright/api_key_debug.json', 'w') as f:
        json.dump(debug_data, f, indent=2)
    
    print(f"\n=== DEBUG SUMMARY ===")
    print(f"Initial storage keys: {len(initial_storage)}")
    print(f"Final storage keys: {len(final_storage)}")
    print(f"Has API key in storage: {'api_key' in str(final_values).lower()}")
    print(f"Console messages: {len(console_messages)}")
    print(f"Debug data saved to: api_key_debug.json")