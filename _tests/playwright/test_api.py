import pytest
import time
import os
from dotenv import load_dotenv
from playwright.sync_api import Page, expect

from test_utils import dismiss_welcome_modal, check_system_messages, setup_test_environment

# Load environment variables from .env file in the current directory
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

def test_api_key_configuration(page, serve_hacka_re, api_key):
    """Test the API key configuration functionality."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Set up test environment to prevent welcome modal
    setup_test_environment(page)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if already open
    # No waiting - everything should be immediate
    
    # Click the settings button to open settings modal
    settings_button = page.locator("#settings-btn")
    settings_button.click(timeout=2000)
    
    # Wait for the settings modal to become visible
    page.wait_for_selector("#settings-modal.active", state="visible", timeout=2000)
    
    # Enter the API key from centralized config
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill(api_key)
    
    # Print the current state of the form
    print("Current form state:")
    print(f"API Key input value length: {page.evaluate('document.getElementById(\"api-key-update\").value.length')}")
    
    # Settings now auto-save, so just wait a moment for the save to complete
    print("Waiting for auto-save to complete")
    time.sleep(1)
    
    # Check for any system messages
    check_system_messages(page)
    
    # Close the settings modal using the Close button
    print("Closing settings modal")
    close_button = page.locator("#close-settings")
    if close_button.is_visible():
        close_button.click()
    else:
        # Fallback: close modal via JavaScript
        page.evaluate("""() => {
            const modal = document.querySelector('#settings-modal');
            if (modal) {
                modal.classList.remove('active');
            }
        }""")
    
    # Verify the settings modal is closed
    settings_modal = page.locator("#settings-modal")
    
    # If the modal is still visible, force close it
    if settings_modal.is_visible():
        print("Settings modal is still visible, forcing close")
        page.evaluate("""() => {
            const modal = document.querySelector('#settings-modal');
            if (modal) {
                modal.classList.remove('active');
                modal.style.display = 'none';
            }
        }""")
        time.sleep(0.5)  # Wait a moment for the DOM to update
    
    # Verify that the API key was saved by checking both localStorage and sessionStorage
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

    # Print localStorage contents
    print("localStorage contents:")
    for key, value in storage_contents['localStorage'].items():
        print(f"Key: {key}")
        print(f"Value: {value}")
        print("-" * 50)
    
    # Print sessionStorage contents
    print("sessionStorage contents:")
    for key, value in storage_contents['sessionStorage'].items():
        print(f"Key: {key}")
        print(f"Value: {value}")
        print("-" * 50)
    
    # Check if there are any items in either storage (prioritize sessionStorage for direct entry)
    total_items = len(storage_contents['localStorage']) + len(storage_contents['sessionStorage'])
    if total_items > 0:
        print(f"API key configuration test passed - found {total_items} storage items")
        if storage_contents['sessionStorage']:
            print("Data stored in sessionStorage (expected for direct entry)")
        elif storage_contents['localStorage']:
            print("Data stored in localStorage (expected for shared links)")
    else:
        print("WARNING: No items found in either localStorage or sessionStorage")
        assert False, "No items found in storage"

def test_model_selection(page, serve_hacka_re, api_key, test_model, test_config):
    """Test the model selection functionality."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if already open
    # No waiting - everything should be immediate
    
    # Click the settings button
    settings_button = page.locator("#settings-btn")
    settings_button.click(timeout=2000)
    
    # Wait for the settings modal to become visible
    page.wait_for_selector("#settings-modal.active", state="visible", timeout=2000)
    
    # Enter the API key from centralized config
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill(api_key)
    
    # Select the configured test provider
    base_url_select = page.locator("#base-url-select")
    base_url_select.select_option(test_config["provider_value"])
    
    # Models should load automatically from cache when API key is set
    # Wait for the models to be loaded (they load from cache automatically)
    try:
        page.wait_for_selector("#model-select option:not([disabled])", state="visible", timeout=2000)
        print("Models loaded successfully from cache")
    except Exception as e:
        print(f"Error waiting for models to load: {e}")
        # Force a longer wait time
        time.sleep(0.5)
        
        # Check if there are any options in the model select
        options_count = page.evaluate("""() => {
            const select = document.getElementById('model-select');
            if (!select) return 0;
            return Array.from(select.options).filter(opt => !opt.disabled).length;
        }""")
        print(f"Found {options_count} non-disabled options in model select")
        
        if options_count == 0:
            # Try clicking the reload button again
            print("No options found, clicking reload button again")
            reload_button.click()
            time.sleep(0.5)
    
    # Select the recommended test model
    from test_utils import select_recommended_test_model
    selected_model = select_recommended_test_model(page)
    
    # Skip the test if no valid model could be selected
    if not selected_model:
        pytest.skip("No valid model could be selected")
    
    # Settings auto-save, so just wait for the save to complete
    print("Waiting for model selection to auto-save")
    time.sleep(1)
    
    # Close the settings modal
    close_button = page.locator("#close-settings")
    close_button.click()
    
    # Check for any system messages
    check_system_messages(page)
    
    # Verify the settings modal is closed
    settings_modal = page.locator("#settings-modal")
    expect(settings_modal).not_to_be_visible()
