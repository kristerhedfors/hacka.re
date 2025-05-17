import pytest
import time
import os
from dotenv import load_dotenv
from playwright.sync_api import Page, expect

from test_utils import dismiss_welcome_modal, dismiss_settings_modal, check_system_messages, screenshot_with_markdown

# Load environment variables from .env file in the current directory
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
# Get API key from environment variables
API_KEY = os.getenv("OPENAI_API_KEY")

def test_model_context_window_after_clear_chat(page: Page, serve_hacka_re):
    """Test that the model context window size is correctly displayed after clearing chat history."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if already open
    dismiss_settings_modal(page)
    
    # Take a screenshot at the start
    screenshot_with_markdown(page, "model_context_window_clear_chat_start.png", {
        "Status": "Test started",
        "Test Name": "Model Context Window After Clear Chat Test",
        "Description": "Verifying that model context window size doesn't fall back to 8192 after clearing chat"
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
    
    # Test model with a large context window size
    test_model = 'o4-mini'  # 128k tokens
    expected_context_size = 128000
    
    # Check if the test model is available
    available_model_ids = [model['value'] for model in available_models]
    if test_model not in available_model_ids:
        # Try to manually add the test model for testing
        page.evaluate(f"""() => {{
            const select = document.getElementById('model-select');
            if (!select) return;
            
            // Create a new option for {test_model}
            const option = document.createElement('option');
            option.value = '{test_model}';
            option.textContent = 'O4 Mini';
            
            // Add it to the select
            select.appendChild(option);
        }}""")
        
        # Check if we successfully added the test model
        test_model_available = page.evaluate(f"""() => {{
            const select = document.getElementById('model-select');
            if (!select) return false;
            return Array.from(select.options).some(opt => opt.value === '{test_model}');
        }}""")
        
        if not test_model_available:
            pytest.skip(f"Test model {test_model} is not available for testing")
    
    # Select the test model
    model_select = page.locator("#model-select")
    model_select.select_option(test_model)
    
    # Save the settings
    save_button = page.locator("#settings-form button[type='submit']")
    save_button.click(force=True)
    
    # Wait for the settings modal to close
    page.wait_for_selector("#settings-modal.active", state="hidden", timeout=2000)
    
    # Wait for the context window to update
    time.sleep(0.5)
    
    # Get the context text before clearing chat
    model_context_element = page.locator(".model-context")
    context_text_before = model_context_element.text_content()
    print(f"Context text before clearing chat: {context_text_before}")
    
    # Take a screenshot before clearing chat
    screenshot_with_markdown(page, "model_context_window_before_clear.png", {
        "Status": "Before clearing chat",
        "Model": test_model,
        "Expected Context Size": str(expected_context_size),
        "Actual Context Text": context_text_before
    })
    
    # Verify that the context text contains token information
    assert "tokens" in context_text_before.lower(), "Context text should contain token information before clearing chat"
    
    # Verify that the context text reflects the correct context window size
    expected_size_str = str(expected_context_size)
    expected_size_formatted = "{:,}".format(expected_context_size)
    
    has_correct_size_before = (
        expected_size_str in context_text_before or 
        expected_size_formatted in context_text_before or
        # Also check for abbreviated formats like "128k" for 128000
        f"{expected_context_size // 1000}k" in context_text_before.lower()
    )
    
    # If the assertion fails, print the actual context text for debugging
    if not has_correct_size_before:
        print(f"ERROR: Context text before clearing chat does not contain the expected {expected_context_size} token size: {context_text_before}")
        
    assert has_correct_size_before, f"Context text should show {expected_context_size} tokens for {test_model} model before clearing chat, but got: {context_text_before}"
    
    # Click the clear chat button (trash icon)
    clear_chat_button = page.locator("#clear-chat-btn")
    clear_chat_button.click()
    
    # Confirm the clear chat dialog
    page.on("dialog", lambda dialog: dialog.accept())
    
    # Wait for the chat to be cleared
    time.sleep(1)
    
    # Get the context text after clearing chat
    context_text_after = model_context_element.text_content()
    print(f"Context text after clearing chat: {context_text_after}")
    
    # Take a screenshot after clearing chat
    screenshot_with_markdown(page, "model_context_window_after_clear.png", {
        "Status": "After clearing chat",
        "Model": test_model,
        "Expected Context Size": str(expected_context_size),
        "Actual Context Text": context_text_after
    })
    
    # Verify that the context text contains token information
    assert "tokens" in context_text_after.lower(), "Context text should contain token information after clearing chat"
    
    # Verify that the context text still reflects the correct context window size
    has_correct_size_after = (
        expected_size_str in context_text_after or 
        expected_size_formatted in context_text_after or
        # Also check for abbreviated formats like "128k" for 128000
        f"{expected_context_size // 1000}k" in context_text_after.lower()
    )
    
    # If the assertion fails, print the actual context text for debugging
    if not has_correct_size_after:
        print(f"ERROR: Context text after clearing chat does not contain the expected {expected_context_size} token size: {context_text_after}")
        
    assert has_correct_size_after, f"Context text should show {expected_context_size} tokens for {test_model} model after clearing chat, but got: {context_text_after}"
    
    # Take a final screenshot
    screenshot_with_markdown(page, "model_context_window_clear_chat_end.png", {
        "Status": "Test completed",
        "Test Name": "Model Context Window After Clear Chat Test",
        "Result": "Model displayed correct context window size after clearing chat"
    })
    
    # Check for any system messages or errors
    check_system_messages(page)
