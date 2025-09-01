import pytest
import time
import os
from dotenv import load_dotenv
from playwright.sync_api import Page, expect

from test_utils import dismiss_welcome_modal, select_recommended_test_model

# Load environment variables from .env file in the current directory
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
# Get API key from environment variables
API_KEY = os.getenv("OPENAI_API_KEY")

def test_context_window_scaling(page: Page, serve_hacka_re):
    """Test that the context window meter scales with the model's context size."""
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
    
    # Select OpenAI as the API provider
    base_url_select = page.locator("#base-url-select")
    base_url_select.select_option("openai")
    
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
    
    # Select the recommended test model
    selected_model = select_recommended_test_model(page)
    
    # Skip the test if no valid model could be selected
    if not selected_model:
        pytest.skip("No valid model could be selected")
    
    # Save the settings
    close_button = page.locator("#close-settings")
    page.wait_for_timeout(1000)  # Wait for auto-save

    close_button.click(force=True)
    
    # Wait for the settings modal to close
    page.wait_for_selector("#settings-modal.active", state="hidden", timeout=2000)
    
    # Wait for the model info to update
    time.sleep(0.5)
    
    # Check if the model context element is displayed
    model_context_element = page.locator(".model-context")
    
    # Wait for the context element to have some content or be visible
    try:
        # Wait for either text content or visibility
        page.wait_for_function("""() => {
            const element = document.querySelector('.model-context');
            return element && (element.textContent.trim() !== '' || element.offsetParent !== null);
        }""", timeout=2000)
    except:
        # If the element doesn't become visible/populated, try triggering the context update manually
        print("Context element not populated, triggering manual update...")
        page.evaluate("""() => {
            // Try to trigger context usage estimation
            const messageInput = document.getElementById('message-input');
            if (messageInput && window.aiHackare && window.aiHackare.chatManager) {
                const currentModel = window.aiHackare.settingsManager ? window.aiHackare.settingsManager.getCurrentModel() : null;
                if (window.aiHackare.chatManager.estimateContextUsage && window.aiHackare.uiManager) {
                    window.aiHackare.chatManager.estimateContextUsage(
                        window.aiHackare.uiManager.updateContextUsage.bind(window.aiHackare.uiManager),
                        currentModel
                    );
                }
            }
        }""")
        time.sleep(0.5)
    
    # Get the initial context text
    initial_context_text = model_context_element.text_content()
    print(f"Initial context text: '{initial_context_text}'")
    
    # Type a message to increase token count
    message_input = page.locator("#message-input")
    test_message = "This is a test message. " * 20  # Create a longer message
    message_input.fill(test_message)
    
    # Wait for the context usage to update
    time.sleep(0.5)
    
    # Get the updated context text
    updated_context_text = model_context_element.text_content()
    
    # Verify that the context text has changed and shows token count
    assert updated_context_text != initial_context_text, f"Context text should change when adding a message. Initial: '{initial_context_text}', Updated: '{updated_context_text}'"
    
    # Check if the context text contains token information (be flexible about format)
    has_token_info = ("tokens" in updated_context_text.lower() or 
                     updated_context_text.strip().isdigit() or  # Just a number
                     "/" in updated_context_text or  # X / Y format
                     any(word.isdigit() for word in updated_context_text.split()))  # Contains numbers
    assert has_token_info, f"Context text should contain token information. Got: '{updated_context_text}'"
    
    # If the model has a context window size, it should show "X / Y tokens"
    if "/" in updated_context_text:
        # Extract token count and context size
        parts = updated_context_text.split("/")
        token_count = parts[0].strip().replace(",", "")
        context_size = parts[1].strip().split(" ")[0].replace(",", "")
        
        # Verify that token count is a number
        assert token_count.isdigit(), f"Token count '{token_count}' should be a number"
        
        # Verify that context size is a number
        assert context_size.isdigit(), f"Context size '{context_size}' should be a number"
        
        # Verify that token count is less than context size
        assert int(token_count) < int(context_size), "Token count should be less than context size"
    else:
        # If no context size is known, it should just show "X tokens"
        token_count = updated_context_text.split(" ")[0].replace(",", "")
        assert token_count.isdigit(), f"Token count '{token_count}' should be a number"
    
    # Check the usage bar
    usage_fill = page.locator(".usage-fill")
    usage_text = page.locator(".usage-text")
    
    # Get the width of the usage fill
    fill_width = usage_fill.evaluate("el => parseFloat(el.style.width)")
    
    # Get the percentage text
    percentage_text = usage_text.text_content()
    
    # Verify that the percentage text matches the fill width
    expected_percentage = f"{int(fill_width)}%"
    assert percentage_text == expected_percentage, f"Percentage text '{percentage_text}' should match fill width '{expected_percentage}'"
    
    # Clear the message
    message_input.fill("")
    
    # Wait for the context usage to update
    time.sleep(0.5)
    
    # Get the final context text
    final_context_text = model_context_element.text_content()
    
    # Verify that the context text has changed back
    assert final_context_text != updated_context_text, "Context text should change when clearing the message"
