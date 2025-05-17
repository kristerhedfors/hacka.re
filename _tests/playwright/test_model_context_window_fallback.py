import pytest
import time
import os
from dotenv import load_dotenv
from playwright.sync_api import Page, expect

from test_utils import timed_test, dismiss_welcome_modal, dismiss_settings_modal, check_system_messages, screenshot_with_markdown

# Load environment variables from .env file in the current directory
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
# Get API key from environment variables
API_KEY = os.getenv("OPENAI_API_KEY")

def test_model_context_window_fallback(page: Page, serve_hacka_re):
    """Test that the model context window size is correctly displayed and doesn't fall back to 8192."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if already open
    dismiss_settings_modal(page)
    
    # Take a screenshot at the start
    screenshot_with_markdown(page, "model_context_window_fallback_start.png", {
        "Status": "Test started",
        "Test Name": "Model Context Window Fallback Test",
        "Description": "Verifying that model context window size doesn't fall back to 8192"
    })
    
    # Configure API key and model
    # Click the settings button
    settings_button = page.locator("#settings-btn")
    settings_button.click(timeout=1000)
    
    # Wait for the settings modal to become visible
    page.wait_for_selector("#settings-modal.active", state="visible", timeout=2000)
    
    # Enter the API key
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill(API_KEY)
    
    # Select OpenAI as the API provider
    base_url_select = page.locator("#base-url-select")
    base_url_select.select_option("openai")
    
    # Click the reload models button
    reload_button = page.locator("#model-reload-btn")
    reload_button.click()
    
    # Wait for the models to be loaded
    try:
        page.wait_for_selector("#model-select option:not([disabled])", state="visible", timeout=2000)
        print("Models loaded successfully")
    except Exception as e:
        print(f"Error waiting for models to load: {e}")
        # Force a longer wait time
        time.sleep(1)
        
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
            time.sleep(1)
    
    # Get available models
    available_models = page.evaluate("""() => {
        const select = document.getElementById('model-select');
        if (!select) return [];
        return Array.from(select.options)
            .filter(opt => !opt.disabled)
            .map(opt => ({ value: opt.value, text: opt.textContent }));
    }""")
    
    print(f"Available models: {available_models}")
    
    # Test multiple models with different context window sizes
    test_models = [
        # Model ID, Expected context window size (approximate)
        ('o4-mini', 128000),
        ('gpt-4', 8192),
        ('gpt-4-32k', 32768),
        ('gpt-3.5-turbo', 4096)
    ]
    
    # Filter test_models to only include available models
    available_model_ids = [model['value'] for model in available_models]
    test_models = [model for model in test_models if model[0] in available_model_ids]
    
    # Skip the test if none of our test models are available
    if not test_models:
        # Try to manually add a test model for testing
        page.evaluate("""() => {
            const select = document.getElementById('model-select');
            if (!select) return;
            
            // Create a new option for o4-mini
            const option = document.createElement('option');
            option.value = 'o4-mini';
            option.textContent = 'O4 Mini';
            
            // Add it to the select
            select.appendChild(option);
        }""")
        
        # Check if we successfully added o4-mini
        o4_mini_available = page.evaluate("""() => {
            const select = document.getElementById('model-select');
            if (!select) return false;
            return Array.from(select.options).some(opt => opt.value === 'o4-mini');
        }""")
        
        if o4_mini_available:
            test_models = [('o4-mini', 128000)]
        else:
            pytest.skip("None of the test models are available for testing")
    
    # Test each model
    for model_id, expected_context_size in test_models:
        print(f"Testing model: {model_id} with expected context size: {expected_context_size}")
        
        # Select the model
        model_select = page.locator("#model-select")
        model_select.select_option(model_id)
        
        # Wait for the context window to update
        time.sleep(0.5)
        
        # Get the context text
        model_context_element = page.locator(".model-context")
        context_text = model_context_element.text_content()
        print(f"Context text with {model_id} model: {context_text}")
        
        # Take a screenshot for this model
        screenshot_with_markdown(page, f"model_context_window_{model_id}.png", {
            "Status": f"Testing model {model_id}",
            "Model": model_id,
            "Expected Context Size": str(expected_context_size),
            "Actual Context Text": context_text
        })
        
        # Verify that the context text contains token information
        assert "tokens" in context_text.lower(), f"Context text should contain token information for model {model_id}"
        
        # Verify that the context text reflects the correct context window size
        # We'll check for either the exact number or a formatted version
        expected_size_str = str(expected_context_size)
        expected_size_formatted = "{:,}".format(expected_context_size)
        
        has_correct_size = (
            expected_size_str in context_text or 
            expected_size_formatted in context_text or
            # Also check for abbreviated formats like "128k" for 128000
            f"{expected_context_size // 1000}k" in context_text.lower()
        )
        
        # If the assertion fails, print the actual context text for debugging
        if not has_correct_size:
            print(f"ERROR: Context text does not contain the expected {expected_context_size} token size: {context_text}")
            
        assert has_correct_size, f"Context text should show {expected_context_size} tokens for {model_id} model, but got: {context_text}"
    
    # Save the settings
    save_button = page.locator("#settings-form button[type='submit']")
    save_button.click(force=True)
    
    # Wait for the settings modal to close
    page.wait_for_selector("#settings-modal.active", state="hidden", timeout=2000)
    
    # Take a final screenshot
    screenshot_with_markdown(page, "model_context_window_fallback_end.png", {
        "Status": "Test completed",
        "Test Name": "Model Context Window Fallback Test",
        "Result": "All models displayed correct context window sizes"
    })
    
    # Check for any system messages or errors
    check_system_messages(page)
