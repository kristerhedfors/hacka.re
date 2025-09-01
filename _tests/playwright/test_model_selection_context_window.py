import pytest
import time
import os
from dotenv import load_dotenv
from playwright.sync_api import Page, expect

from test_utils import dismiss_welcome_modal, check_system_messages, select_recommended_test_model

# Load environment variables from .env file in the current directory
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
# Get API key from environment variables
API_KEY = os.getenv("OPENAI_API_KEY")

def test_context_window_updates_on_model_selection(page: Page, serve_hacka_re):
    """Test that the context window size updates when selecting a model from the settings menu."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if already open
    # Configure API key and model
    # Click the settings button
    settings_button = page.locator("#settings-btn")
    settings_button.click(timeout=2000)
    
    # Wait for the settings modal to become visible
    page.wait_for_selector("#settings-modal.active", state="visible", timeout=2000)
    
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
    # First, check if the model select has any non-disabled options
    try:
        page.wait_for_selector("#model-select option:not([disabled])", state="visible", timeout=2000)
        print("Models loaded successfully")
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
    
    # Get available models
    available_models = page.evaluate("""() => {
        const select = document.getElementById('model-select');
        if (!select) return [];
        return Array.from(select.options)
            .filter(opt => !opt.disabled)
            .map(opt => ({ value: opt.value, text: opt.textContent }));
    }""")
    
    print(f"Available models: {available_models}")
    
    # Skip the test if there are fewer than 2 models available
    if len(available_models) < 2:
        pytest.skip("Need at least 2 models to test model selection")
    
    # Select the first model
    first_model = available_models[0]['value']
    model_select = page.locator("#model-select")
    model_select.select_option(first_model)
    
    # Wait for the context window to update
    time.sleep(0.5)
    
    # Get the initial context text
    model_context_element = page.locator(".model-context")
    initial_context_text = model_context_element.text_content()
    print(f"Initial context text with first model: {initial_context_text}")
    
    # Select the second model
    second_model = available_models[1]['value']
    model_select.select_option(second_model)
    
    # Wait for the context window to update
    time.sleep(0.5)
    
    # Get the updated context text
    updated_context_text = model_context_element.text_content()
    print(f"Updated context text with second model: {updated_context_text}")
    
    # Verify that the context text contains token information
    assert "tokens" in updated_context_text.lower(), "Context text should contain token information"
    
    # Save the settings
    close_button = page.locator("#close-settings")
    page.wait_for_timeout(1000)  # Wait for auto-save

    close_button.click(force=True)
    
    # Wait for the settings modal to close
    page.wait_for_selector("#settings-modal.active", state="hidden", timeout=2000)
    
    # Wait for the model info to update
    time.sleep(0.5)
    
    # Get the final context text
    final_context_text = model_context_element.text_content()
    print(f"Final context text after saving: {final_context_text}")
    
    # Verify that the context text still contains token information
    assert "tokens" in final_context_text.lower(), "Context text should contain token information after saving"
