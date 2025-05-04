import pytest
import time
import os
from dotenv import load_dotenv
from playwright.sync_api import Page, expect

from test_utils import timed_test, dismiss_welcome_modal, dismiss_settings_modal, check_system_messages

# Load environment variables from .env file in the current directory
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
# Get API key from environment variables
API_KEY = os.getenv("OPENAI_API_KEY")

@timed_test
def test_model_context_window_display(page, serve_hacka_re):
    """Test that the context window size is displayed in the model selection menu."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if already open
    dismiss_settings_modal(page)
    
    # Configure API key and model
    # Click the settings button
    settings_button = page.locator("#settings-btn")
    settings_button.click(timeout=1000)
    
    # Wait for the settings modal to become visible
    page.wait_for_selector("#settings-modal.active", state="visible", timeout=5000)
    
    # Enter the API key
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill(API_KEY)
    
    # Select Groq Cloud as the API provider
    base_url_select = page.locator("#base-url-select")
    base_url_select.select_option("groq")
    
    # Click the reload models button
    reload_button = page.locator("#model-reload-btn")
    reload_button.click()
    
    # Wait for the models to be loaded
    time.sleep(2)
    
    # Print the available options in the model select dropdown
    print("Available options in model select dropdown:")
    options = page.evaluate("""() => {
        const select = document.getElementById('model-select');
        if (!select) return [];
        return Array.from(select.options).map(option => ({
            value: option.value,
            text: option.textContent,
            disabled: option.disabled
        }));
    }""")
    
    for option in options:
        print(f"  Option: {option.get('text', '')} (value: {option.get('value', '')}, disabled: {option.get('disabled', False)})")
    
    # Select a model that is likely to have context window information
    # For Groq, we'll use llama-3.1-8b-instant which has a 8192 token context window
    model_to_select = "llama3-8b-8192"
    
    # Check if the model is available
    model_available = False
    for option in options:
        if option.get('value', '') == model_to_select:
            model_available = True
            break
    
    if not model_available:
        # If the specific model is not available, select the first non-disabled option
        for option in options:
            if not option.get('disabled', False):
                model_to_select = option.get('value', '')
                print(f"Selected alternative model: {model_to_select}")
                break
    
    # Select the model
    model_select = page.locator("#model-select")
    model_select.select_option(model_to_select)
    
    # Save the settings
    save_button = page.locator("#settings-form button[type='submit']")
    save_button.click(force=True)
    
    # Wait for the settings modal to close
    page.wait_for_selector("#settings-modal.active", state="hidden", timeout=5000)
    
    # Click on the model info button to open the model selection menu
    model_info_btn = page.locator("#model-info-btn")
    model_info_btn.click()
    
    # Wait for the model selection menu to appear
    page.wait_for_selector("#model-selection-menu.active", state="visible", timeout=5000)
    
    # Wait for the API call to complete and the context window to be displayed
    time.sleep(2)
    
    # Check if the context window size is displayed
    # First, get all model properties
    model_properties = page.locator(".model-property")
    
    # Print all model properties for debugging
    property_count = model_properties.count()
    print(f"Found {property_count} model properties")
    
    for i in range(property_count):
        property_text = model_properties.nth(i).text_content()
        print(f"Property {i}: {property_text}")
    
    # Check if any property contains "Context Window"
    context_window_found = False
    for i in range(property_count):
        property_text = model_properties.nth(i).text_content()
        if "Context Window" in property_text:
            context_window_found = True
            print(f"Found context window property: {property_text}")
            break
    
    # Assert that the context window property was found
    assert context_window_found, "Context window size not displayed in model selection menu"
    
    # Close the model selection menu
    close_button = page.locator("#close-model-menu")
    close_button.click()
    
    # Wait for the model selection menu to close
    page.wait_for_selector("#model-selection-menu.active", state="hidden", timeout=5000)
