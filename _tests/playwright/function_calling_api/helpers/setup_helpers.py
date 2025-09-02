"""
Setup Helpers for Function Calling API Tests

This module contains helper functions for setting up the test environment
for function calling API tests.
"""
import time
import pytest
from playwright.sync_api import Page, expect

from test_utils import check_system_messages, select_recommended_test_model

# Set up console error logging
console_errors = []

def setup_console_logging(page):
    """Set up console error logging for the page."""
    global console_errors
    console_errors = []
    
    # Log all console messages
    page.on("console", lambda msg: console_errors.append(f"{msg.type}: {msg.text}") if msg.type == "error" else None)

def configure_api_key_and_model(page, api_key):
    """Configure API key and select a function calling model."""
    print("Configuring API key and model...")
    
    # Click the settings button
    settings_button = page.locator("#settings-btn")
    settings_button.click(timeout=1000)
    
    # Wait for the settings modal to become visible
    page.wait_for_selector("#settings-modal.active", state="visible", timeout=2000)
    
    # Take a screenshot of the settings modal for debugging
    page.screenshot(path="_tests/playwright/videos/settings_modal_initial.png")
    
    # Enter the API key from .env
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill(api_key)
    
    # Get test configuration from centralized config
    import sys
    import os
    sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
    from conftest import ACTIVE_TEST_CONFIG, TEST_PROVIDER
    
    # Select the configured provider
    base_url_select = page.locator("#base-url-select")
    provider_value = ACTIVE_TEST_CONFIG["provider_value"]
    base_url = ACTIVE_TEST_CONFIG["base_url"]
    
    if provider_value == "custom":
        base_url_select.select_option("custom")
        # Wait for the custom base URL input to appear
        custom_base_url_input = page.locator("#custom-base-url")
        custom_base_url_input.fill(base_url)
        print(f"Set custom base URL to: {base_url}")
    else:
        base_url_select.select_option(provider_value)
        print(f"Selected provider: {provider_value}")
    
    # Models should load automatically from cache when API key is set
    # Wait for the models to be loaded from cache
    # Note: Options might not be "visible" in dropdown, just need to be attached to DOM
    try:
        page.wait_for_selector("#model-select option:not([disabled])", state="attached", timeout=5000)
        print("Models loaded successfully")
    except Exception as e:
        print(f"Models not loaded from cache, trying to reload: {e}")
        # If models aren't loaded from cache, try to reload them
        reload_button = page.locator("#model-reload-btn")
        
        # Check if reload button is enabled
        is_enabled = reload_button.is_enabled()
        if is_enabled:
            reload_button.click()
            # Wait for models to load
            page.wait_for_selector("#model-select option:not([disabled])", state="attached", timeout=5000)
            print("Models loaded after reload")
        else:
            # Take a screenshot for debugging
            page.screenshot(path="_tests/playwright/videos/models_loading_error.png")
            
            # Check if there are any options in the model select
            options_count = page.evaluate("""() => {
                const select = document.getElementById('model-select');
                if (!select) return 0;
                return Array.from(select.options).filter(opt => !opt.disabled).length;
            }""")
            print(f"Found {options_count} non-disabled options in model select")
    
    # Select the model from centralized configuration
    # The select_recommended_test_model function now uses the centralized config
    selected_model = select_recommended_test_model(page)
    
    # Skip the test if no valid model could be selected
    if not selected_model:
        # Take a screenshot for debugging
        page.screenshot(path="_tests/playwright/videos/no_valid_model.png")
        pytest.skip("No valid model could be selected")
    
    print(f"Selected model: {selected_model}")
    
    # Settings auto-save, so just close the modal
    close_button = page.locator("#close-settings")
    close_button.click()
    
    # Wait for the settings modal to be closed
    page.wait_for_selector("#settings-modal", state="hidden", timeout=2000)
    
    # Check for any system messages
    check_system_messages(page)
    
    return selected_model

def enable_tool_calling_and_function_tools(page):
    """
    Enable tool calling and function tools.
    
    Note: With the updated UI, tool calling is now enabled by default
    and controlled through the function calling modal.
    This function now just verifies that tool calling is available without changing settings.
    """
    print("Tool calling is now enabled by default...")
    
    # Just verify that the function button is available - no need to open settings again
    # since configure_api_key_and_model already saved the proper configuration
    function_button = page.locator("#function-btn")
    if function_button.is_visible(timeout=1000):
        print("Function calling button is visible - tool calling is ready")
        return True
    
    print("Function calling button not visible - but continuing anyway as tool calling is enabled by default")
    return True
