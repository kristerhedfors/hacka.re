#!/usr/bin/env python3
"""
API Key Persistence Debugging Test

This test systematically debugs the API key persistence issue that's causing
function_calling_api tests to fail. It runs multiple scenarios to identify
the exact failure pattern.
"""

import pytest
import time
import os
from dotenv import load_dotenv
from playwright.sync_api import Page, expect

from test_utils import dismiss_welcome_modal, dismiss_settings_modal, setup_test_environment
from test_helpers.api_key_fix import ensure_api_key_persisted, configure_api_key_with_retry, wait_for_api_ready

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
API_KEY = os.getenv("OPENAI_API_KEY")

def capture_storage_state(page: Page) -> dict:
    """Capture complete storage state for debugging"""
    return page.evaluate("""() => {
        const result = {
            localStorage: {},
            sessionStorage: {},
            apiKeyDetected: false,
            apiKeyValue: null,
            namespaceValue: null,
            servicesLoaded: {
                StorageService: !!window.StorageService,
                ApiService: !!window.ApiService,
                NamespaceService: !!window.NamespaceService
            }
        };
        
        // Get all localStorage
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            result.localStorage[key] = localStorage.getItem(key);
        }
        
        // Get all sessionStorage
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            result.sessionStorage[key] = sessionStorage.getItem(key);
        }
        
        // Try to get API key through service
        if (window.StorageService && window.StorageService.getApiKey) {
            try {
                result.apiKeyValue = window.StorageService.getApiKey();
                result.apiKeyDetected = !!result.apiKeyValue;
            } catch (e) {
                result.apiKeyError = e.message;
            }
        }
        
        // Get namespace
        result.namespaceValue = localStorage.getItem('namespace') || 'default';
        
        return result;
    }""")

def test_api_key_persistence_scenario_1_basic(page: Page, serve_hacka_re):
    """Test 1: Basic API key configuration through settings modal"""
    print("\n=== TEST 1: Basic API Key Configuration ===")
    
    page.goto(serve_hacka_re)
    setup_test_environment(page)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    print("Initial storage state:")
    initial_state = capture_storage_state(page)
    print(f"Services loaded: {initial_state['servicesLoaded']}")
    print(f"Initial API key: {initial_state['apiKeyValue']}")
    print(f"LocalStorage keys: {list(initial_state['localStorage'].keys())}")
    
    # Open settings modal
    settings_button = page.locator("#settings-btn")
    settings_button.click()
    page.wait_for_selector("#settings-modal.active", state="visible", timeout=2000)
    
    # Fill API key
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill(API_KEY)
    
    print(f"Filled API key (length: {len(API_KEY)})")
    
    # Save settings
    close_button = page.locator("#close-settings")
    page.wait_for_timeout(1000)  # Wait for auto-save    close_button.click()
    
    # Wait for modal to close
    page.wait_for_selector("#settings-modal", state="hidden", timeout=3000)
    
    # Check storage state after save
    print("Storage state after save:")
    after_save_state = capture_storage_state(page)
    print(f"API key detected: {after_save_state['apiKeyDetected']}")
    print(f"API key value: {after_save_state['apiKeyValue']}")
    print(f"LocalStorage keys: {list(after_save_state['localStorage'].keys())}")
    
    # Test if we can make an API call indicator
    can_make_api_call = page.evaluate("""() => {
        const messageInput = document.getElementById('message-input');
        const sendButton = document.getElementById('send-btn');
        return messageInput && !messageInput.disabled && sendButton && !sendButton.disabled;
    }""")
    
    print(f"Chat interface enabled: {can_make_api_call}")
    
    if not after_save_state['apiKeyDetected']:
        pytest.fail(f"API key not detected after basic configuration. Storage: {after_save_state}")

def test_api_key_persistence_scenario_2_retry_helper(page: Page, serve_hacka_re):
    """Test 2: API key configuration using the retry helper"""
    print("\n=== TEST 2: API Key Configuration with Retry Helper ===")
    
    page.goto(serve_hacka_re)
    setup_test_environment(page)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Wait for API system to be ready
    api_ready = wait_for_api_ready(page, timeout=5000)
    print(f"API system ready: {api_ready}")
    
    # Use the retry helper
    success = configure_api_key_with_retry(page, API_KEY, use_modal=False)
    print(f"Retry helper success: {success}")
    
    # Check final state
    final_state = capture_storage_state(page)
    print(f"Final API key detected: {final_state['apiKeyDetected']}")
    print(f"Final API key value: {final_state['apiKeyValue']}")
    
    if not success:
        pytest.fail(f"Retry helper failed. Final state: {final_state}")

def test_api_key_persistence_scenario_3_multiple_attempts(page: Page, serve_hacka_re):
    """Test 3: Multiple attempts to see intermittency pattern"""
    print("\n=== TEST 3: Multiple Configuration Attempts ===")
    
    page.goto(serve_hacka_re)
    setup_test_environment(page)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    results = []
    
    for attempt in range(3):
        print(f"\n--- Attempt {attempt + 1} ---")
        
        # Clear any existing API key
        page.evaluate("""() => {
            if (window.StorageService && window.StorageService.clearApiKey) {
                window.StorageService.clearApiKey();
            }
            // Also clear from localStorage directly
            const namespace = localStorage.getItem('namespace') || 'default';
            const key = namespace + '_openai_api_key';
            localStorage.removeItem(key);
        }""")
        
        time.sleep(0.5)
        
        # Open settings
        settings_button = page.locator("#settings-btn")
        settings_button.click()
        page.wait_for_selector("#settings-modal.active", state="visible", timeout=2000)
        
        # Fill and save
        api_key_input = page.locator("#api-key-update")
        api_key_input.fill(API_KEY)
        close_button = page.locator("#close-settings")
        page.wait_for_timeout(1000)  # Wait for auto-save
        close_button.click()
        
        # Close modal
        page.wait_for_selector("#settings-modal", state="hidden", timeout=3000)
        
        # Check result
        state = capture_storage_state(page)
        success = state['apiKeyDetected']
        results.append(success)
        
        print(f"Attempt {attempt + 1} success: {success}")
        if success:
            print(f"API key value present: {bool(state['apiKeyValue'])}")
        else:
            print(f"LocalStorage keys: {list(state['localStorage'].keys())}")
    
    success_rate = sum(results) / len(results)
    print(f"\nSuccess rate: {success_rate * 100}% ({sum(results)}/{len(results)})")
    
    if success_rate < 1.0:
        pytest.fail(f"API key persistence is intermittent. Success rate: {success_rate * 100}%. Results: {results}")

def test_api_key_persistence_scenario_4_timing_analysis(page: Page, serve_hacka_re):
    """Test 4: Analyze timing issues in the save process"""
    print("\n=== TEST 4: Timing Analysis ===")
    
    page.goto(serve_hacka_re)
    setup_test_environment(page)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Set up timing monitoring
    page.evaluate("""() => {
        window.timingLog = [];
        window.originalSetItem = localStorage.setItem;
        localStorage.setItem = function(key, value) {
            window.timingLog.push({
                type: 'setItem',
                key: key,
                value: value ? value.substring(0, 20) + '...' : null,
                timestamp: Date.now()
            });
            return window.originalSetItem.call(this, key, value);
        };
    }""")
    
    # Record start time
    start_time = time.time()
    
    # Open settings and configure
    settings_button = page.locator("#settings-btn")
    settings_button.click()
    page.wait_for_selector("#settings-modal.active", state="visible", timeout=2000)
    
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill(API_KEY)
    
    # Add timing marker before save
    page.evaluate("""() => {
        window.timingLog.push({type: 'before_save', timestamp: Date.now()});
    }""")
    
    close_button = page.locator("#close-settings")
    page.wait_for_timeout(1000)  # Wait for auto-save    close_button.click()
    
    # Add timing marker after save
    page.evaluate("""() => {
        window.timingLog.push({type: 'after_save', timestamp: Date.now()});
    }""")
    
    # Wait for modal close with timing
    page.wait_for_selector("#settings-modal", state="hidden", timeout=3000)
    
    page.evaluate("""() => {
        window.timingLog.push({type: 'modal_closed', timestamp: Date.now()});
    }""")
    
    end_time = time.time()
    
    # Get timing log
    timing_log = page.evaluate("() => window.timingLog")
    
    print(f"Total process time: {(end_time - start_time) * 1000:.2f}ms")
    print("Storage operations timeline:")
    for entry in timing_log:
        print(f"  {entry['type']}: {entry['timestamp']} - {entry.get('key', '')} {entry.get('value', '')}")
    
    # Check final state
    final_state = capture_storage_state(page)
    success = final_state['apiKeyDetected']
    
    print(f"Final success: {success}")
    
    if not success:
        pytest.fail(f"Configuration failed. Timing log: {timing_log}")

if __name__ == "__main__":
    # Run individual tests for debugging
    pytest.main([__file__ + "::test_api_key_persistence_scenario_1_basic", "-v", "-s"])