import pytest
import time
import os
from dotenv import load_dotenv
from playwright.sync_api import Page, expect

from test_utils import dismiss_welcome_modal, dismiss_settings_modal, check_system_messages

# Load environment variables from .env file in the current directory
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
# Get API key from environment variables
API_KEY = os.getenv("OPENAI_API_KEY")

def test_o4_mini_context_window_display(page: Page, serve_hacka_re):
    """Test that the o4-mini model's context window size (200k tokens) is correctly displayed."""
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
    
    # Check if o4-mini is available
    o4_mini_available = False
    for model in available_models:
        if model['value'] == 'o4-mini':
            o4_mini_available = True
            break
    
    # Skip the test if o4-mini is not available
    if not o4_mini_available:
        # Try to manually add o4-mini to the model select for testing
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
        
        if not o4_mini_available:
            pytest.skip("o4-mini model is not available for testing")
    
    # Select the o4-mini model
    model_select = page.locator("#model-select")
    model_select.select_option('o4-mini')
    
    # Wait for the context window to update
    time.sleep(0.5)
    
    # Get the context text
    model_context_element = page.locator(".model-context")
    context_text = model_context_element.text_content()
    print(f"Context text with o4-mini model: {context_text}")
    
    # Verify that the context text contains token information
    assert "tokens" in context_text.lower(), "Context text should contain token information"
    
    # Verify that the context text reflects the correct context window size (200k)
    # We'll check for either "200,000" or "200000" or "200k" in the text
    has_correct_size = any(size_str in context_text for size_str in ["200,000", "200000", "200k"])
    
    # If the assertion fails, print the actual context text for debugging
    if not has_correct_size:
        print(f"ERROR: Context text does not contain the expected 200k token size: {context_text}")
        
    assert has_correct_size, f"Context text should show 200k tokens for o4-mini model, but got: {context_text}"
    
    # Save the settings
    save_button = page.locator("#settings-form button[type='submit']")
    save_button.click(force=True)
    
    # Wait for the settings modal to close
    page.wait_for_selector("#settings-modal.active", state="hidden", timeout=2000)
    
    # Wait for the model info to update
    time.sleep(0.5)
    
    # Get the final context text
    final_context_text = model_context_element.text_content()
    print(f"Final context text after saving: {final_context_text}")
    
    # Verify that the context text still contains token information
    assert "tokens" in final_context_text.lower(), "Context text should contain token information after saving"
    
    # Verify that the final context text still reflects the correct context window size (200k)
    has_correct_size = any(size_str in final_context_text for size_str in ["200,000", "200000", "200k"])
    
    # If the assertion fails, print the actual context text for debugging
    if not has_correct_size:
        print(f"ERROR: Final context text does not contain the expected 200k token size: {final_context_text}")
        
    assert has_correct_size, f"Final context text should show 200k tokens for o4-mini model, but got: {final_context_text}"
