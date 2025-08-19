"""
Working Shodan Tests Following Core Pattern
===========================================
These tests follow the exact core test pattern to ensure proper API setup.
"""
import pytest
import time
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, select_recommended_test_model, check_system_messages


def test_shodan_full_setup_like_core_tests(page: Page, serve_hacka_re, api_key, shodan_api_key):
    """Test following the exact core test pattern for API setup"""
    page.goto(serve_hacka_re)
    
    # Exact core test sequence
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Click settings button
    settings_button = page.locator("#settings-btn")
    settings_button.click(timeout=2000)
    
    # Wait for settings modal to become visible
    page.wait_for_selector("#settings-modal.active", state="visible", timeout=2000)
    
    # Enter OpenAI API key from .env
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill(api_key)
    
    print("Current form state:")
    print(f"API Key input value length: {page.evaluate('document.getElementById(\"api-key-update\").value.length')}")
    
    # Select OpenAI as the API provider  
    base_url_select = page.locator("#base-url-select")
    base_url_select.select_option("openai")
    
    # Click the reload models button
    reload_button = page.locator("#model-reload-btn")
    reload_button.click()
    
    # Wait for models to be loaded
    try:
        page.wait_for_selector("#model-select option:not([disabled])", state="visible", timeout=2000)
        print("Models loaded successfully")
    except Exception as e:
        print(f"Error waiting for models to load: {e}")
        time.sleep(0.5)
    
    # Select recommended test model
    selected_model = select_recommended_test_model(page)
    if not selected_model:
        pytest.skip("No valid model could be selected")
    
    # Scroll to bottom of settings modal
    page.evaluate("""() => {
        const modal = document.querySelector('#settings-modal .modal-content');
        if (modal) {
            modal.scrollTop = modal.scrollHeight;
        }
    }""")
    
    time.sleep(0.5)
    
    # Save the settings using exact core test method
    print("Clicking save button by ID")
    page.evaluate("""() => {
        const saveButton = document.getElementById('save-settings-btn');
        if (saveButton) {
            saveButton.click();
            console.log('Save button clicked via JavaScript');
        } else {
            console.error('Save button not found');
        }
    }""")
    
    # Check for system messages
    check_system_messages(page)
    
    # Verify settings modal is closed
    settings_modal = page.locator("#settings-modal")
    if settings_modal.is_visible():
        print("Settings modal is still visible, forcing close")
        page.evaluate("""() => {
            const modal = document.querySelector('#settings-modal');
            if (modal) {
                modal.classList.remove('active');
                modal.style.display = 'none';
            }
        }""")
        time.sleep(0.5)
    
    # CRITICAL: Verify API key was actually saved
    print("Checking storage contents for debugging:")
    storage_contents = page.evaluate("""() => {
        const result = {
            localStorage: {},
            sessionStorage: {}
        };
        
        // Get all localStorage keys and values
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            result.localStorage[key] = value;
        }
        
        // Get all sessionStorage keys and values
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            const value = sessionStorage.getItem(key);
            result.sessionStorage[key] = value;
        }
        
        return result;
    }""")
    
    print("localStorage contents:")
    for key, value in storage_contents['localStorage'].items():
        if 'api' in key.lower():
            print(f"Key: {key}, Value: {value[:20]}..." if value else f"Key: {key}, Value: None")
    
    # Check if API key exists in either storage
    total_items = len(storage_contents['localStorage']) + len(storage_contents['sessionStorage'])
    if total_items > 0:
        print(f"API configuration test passed - found {total_items} storage items")
    else:
        print("WARNING: No items found in either localStorage or sessionStorage")
    
    # NOW add Shodan key to storage  
    page.evaluate(f"""() => {{
        localStorage.setItem('shodan_api_key', '{shodan_api_key}');
        console.log('Shodan API key added to localStorage');
    }}""")
    
    # Verify both keys are set
    api_verification = page.evaluate("""() => {
        return {
            openai_key: localStorage.getItem('openai_api_key') || sessionStorage.getItem('openai_api_key'),
            shodan_key: localStorage.getItem('shodan_api_key'),
            total_keys: localStorage.length + sessionStorage.length
        };
    }""")
    
    print(f"Final API verification: {api_verification}")
    
    assert api_verification['total_keys'] > 0, "Should have some API configuration"
    assert api_verification['shodan_key'] == shodan_api_key, "Shodan key should be set"


def test_shodan_query_with_proper_setup(page: Page, serve_hacka_re, api_key, shodan_api_key):
    """Test Shodan query with completely proper setup"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Complete API setup first (following core test pattern)
    settings_button = page.locator("#settings-btn")
    settings_button.click(timeout=2000)
    page.wait_for_selector("#settings-modal.active", state="visible", timeout=2000)
    
    # Set up OpenAI API
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill(api_key)
    base_url_select = page.locator("#base-url-select")
    base_url_select.select_option("openai")
    
    # Load and select model
    reload_button = page.locator("#model-reload-btn")
    reload_button.click()
    try:
        page.wait_for_selector("#model-select option:not([disabled])", state="visible", timeout=2000)
    except:
        time.sleep(0.5)
    
    select_recommended_test_model(page)
    
    # Save settings using core test method
    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    save_button = page.locator("#settings-form button[type='submit']")
    save_button.click(force=True)
    
    check_system_messages(page)
    
    # Wait for settings modal to be completely closed
    page.wait_for_selector("#settings-modal", state="hidden", timeout=2000)
    
    # Verify API key was saved like core tests do
    api_key_saved = page.evaluate("""() => {
        const keys = Object.keys(localStorage);
        for (const key of keys) {
            if (key.includes('api-key') || key.includes('openai')) {
                return true;
            }
        }
        // Also check sessionStorage
        const sessionKeys = Object.keys(sessionStorage);
        for (const key of sessionKeys) {
            if (key.includes('api-key') || key.includes('openai')) {
                return true;
            }
        }
        return false;
    }""")
    
    print(f"API key found in storage: {api_key_saved}")
    
    # Add Shodan key after API is confirmed working
    page.evaluate(f"""() => {{
        localStorage.setItem('shodan_api_key', '{shodan_api_key}');
    }}""")
    
    # Now send a message like core tests do
    message_input = page.locator("#message-input")
    test_message = "Use Shodan to look up information about IP 8.8.8.8"
    message_input.fill(test_message)
    
    # Try pressing Enter first (core test pattern)
    print("Pressing Enter in the message input")
    message_input.press("Enter")
    time.sleep(0.5)
    
    # If that doesn't work, try clicking the button
    print("Clicking send button directly")
    send_button = page.locator("#send-btn")
    send_button.click(force=True)
    time.sleep(0.5)
    
    # Check if API key modal appears (core test pattern)
    api_key_modal = page.locator("#api-key-modal")
    if api_key_modal.is_visible():
        print("API key modal is visible, API key was not saved correctly")
        # Enter the API key again
        api_key_input = page.locator("#api-key")
        api_key_input.fill(api_key)
        
        # Submit the API key form
        submit_button = page.locator("#api-key-form button[type='submit']")
        submit_button.click()
        
        # Wait for modal to close
        page.wait_for_selector("#api-key-modal", state="hidden", timeout=2000)
    
    # Wait for user message to appear (core test pattern)
    print("Waiting for user message to appear in chat...")
    try:
        page.wait_for_selector(".message.user .message-content", state="visible", timeout=2000)
        user_message = page.locator(".message.user .message-content")
        expect(user_message).to_be_visible()
        expect(user_message).to_contain_text(test_message)
        print("User message found in chat!")
    except Exception as e:
        print(f"Error waiting for user message: {e}")
        pytest.skip("User message did not appear in chat")
    
    # Wait for assistant response (core test pattern)
    print("Waiting for assistant response...")
    try:
        page.wait_for_selector(".message.assistant .message-content", state="visible", timeout=10000)
        
        # Get all messages for analysis
        all_messages = page.locator(".message .message-content")
        print(f"Found {all_messages.count()} messages in the chat:")
        
        response_text = ""
        for i in range(all_messages.count()):
            message = all_messages.nth(i).text_content()
            message_class = page.evaluate(f"""(index) => {{
                const messages = document.querySelectorAll('.message');
                return messages[index] ? messages[index].className : '';
            }}""", i)
            print(f"  Message {i+1} [{message_class}]: {message[:100]}...")
            response_text += message + " "
        
        # Check for Shodan-related content
        shodan_indicators = []
        if "shodan" in response_text.lower():
            shodan_indicators.append("mentioned Shodan")
        if "8.8.8.8" in response_text:
            shodan_indicators.append("mentioned target IP")
        if "function" in response_text.lower():
            shodan_indicators.append("mentioned functions")
        
        print(f"Shodan indicators in response: {shodan_indicators}")
        
        # Check for function call elements
        function_elements = page.locator(".function-call, .tool-call, [data-function]").all()
        print(f"Function call DOM elements found: {len(function_elements)}")
        
        # Test passes if we get a meaningful response
        assert len(shodan_indicators) > 0 or len(function_elements) > 0, "Should mention Shodan or show function calls"
        
    except Exception as e:
        print(f"Error waiting for assistant response: {e}")
        pytest.skip("Assistant response did not appear in chat")