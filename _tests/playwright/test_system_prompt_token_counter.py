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

def test_system_prompt_token_counter_updates_with_model(page: Page, serve_hacka_re):
    """Test that the token counter in the system prompt menu updates when a model is selected."""
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
    
    # Skip the test if there are fewer than 2 models available
    if len(available_models) < 2:
        pytest.skip("Need at least 2 models to test model selection")
    
    # Select a model with a smaller context window first (e.g., gpt-3.5-turbo)
    small_model = None
    for model in available_models:
        if model['value'] in ['gpt-3.5-turbo', 'gpt-4']:
            small_model = model['value']
            break
    
    if not small_model:
        # If no specific small model is found, use the first available model
        small_model = available_models[0]['value']
    
    # Select the small model
    model_select = page.locator("#model-select")
    model_select.select_option(small_model)
    
    # Save the settings
    save_button = page.locator("#settings-form button[type='submit']")
    save_button.click(force=True)
    
    # Wait for the settings modal to close
    page.wait_for_selector("#settings-modal.active", state="hidden", timeout=2000)
    
    # Open the prompts modal by clicking the prompts button
    page.click("#prompts-btn")
    
    # Wait for the prompts modal to be visible
    page.wait_for_selector("#prompts-modal.active", state="visible", timeout=2000)
    
    # Get the initial token counter value in the system prompt menu
    token_counter = page.locator(".prompts-usage-text")
    initial_token_counter_text = token_counter.text_content()
    print(f"Initial token counter with small model: {initial_token_counter_text}")
    
    # Check if there are any prompts available
    prompt_checkboxes = page.locator(".prompt-item-checkbox")
    checkbox_count = prompt_checkboxes.count()
    print(f"Found {checkbox_count} prompt checkboxes")
    
    # If there are prompts, check the first one to trigger token counter update
    if checkbox_count > 0:
        # Wait for the checkbox to be visible
        try:
            # Force the checkbox to be visible using JavaScript
            page.evaluate("""() => {
                const checkboxes = document.querySelectorAll('.prompt-item-checkbox');
                if (checkboxes.length > 0) {
                    checkboxes[0].style.display = 'block';
                    checkboxes[0].style.opacity = '1';
                    checkboxes[0].style.visibility = 'visible';
                    checkboxes[0].style.position = 'static';
                    
                    // Also make the parent visible
                    const parent = checkboxes[0].closest('.prompt-item');
                    if (parent) {
                        parent.style.display = 'block';
                        parent.style.opacity = '1';
                        parent.style.visibility = 'visible';
                    }
                }
            }""")
            
            # Now try to check the checkbox
            first_checkbox = prompt_checkboxes.first
            if not first_checkbox.is_checked():
                # Use JavaScript to check the checkbox directly
                page.evaluate("""() => {
                    const checkboxes = document.querySelectorAll('.prompt-item-checkbox');
                    if (checkboxes.length > 0) {
                        checkboxes[0].checked = true;
                        
                        // Dispatch change event to trigger any event listeners
                        const event = new Event('change', { bubbles: true });
                        checkboxes[0].dispatchEvent(event);
                        
                        // Also dispatch click event
                        const clickEvent = new MouseEvent('click', { bubbles: true });
                        checkboxes[0].dispatchEvent(clickEvent);
                    }
                }""")
                print("Checked the first prompt checkbox using JavaScript")
            
            # Wait a moment for the token counter to update
            time.sleep(1)
            
            # Get the updated token counter value
            initial_token_counter_text = token_counter.text_content()
            print(f"Updated token counter after checking prompt: {initial_token_counter_text}")
        except Exception as e:
            print(f"Error checking checkbox: {e}")
            # Continue with the test even if we couldn't check the checkbox
    
    # Close the prompts modal
    page.click("#close-prompts-modal")
    
    # Wait for the prompts modal to close
    page.wait_for_selector("#prompts-modal.active", state="hidden", timeout=2000)
    
    # Open settings again
    settings_button.click(timeout=1000)
    
    # Wait for the settings modal to become visible
    page.wait_for_selector("#settings-modal.active", state="visible", timeout=2000)
    
    # Select a model with a larger context window (e.g., o4-mini or gpt-4-turbo)
    large_model = None
    for model in available_models:
        if model['value'] in ['o4-mini', 'gpt-4-turbo', 'gpt-4.1']:
            large_model = model['value']
            break
    
    if not large_model:
        # If no specific large model is found, use the last available model
        large_model = available_models[-1]['value']
        
        # If the last model is the same as the small model, try to add o4-mini manually
        if large_model == small_model:
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
            
            large_model = 'o4-mini'
    
    # Select the large model
    model_select.select_option(large_model)
    
    # Save the settings
    save_button.click(force=True)
    
    # Wait for the settings modal to close
    page.wait_for_selector("#settings-modal.active", state="hidden", timeout=2000)
    
    # Open the prompts modal again by clicking the prompts button
    page.click("#prompts-btn")
    
    # Wait for the prompts modal to be visible
    page.wait_for_selector("#prompts-modal.active", state="visible", timeout=2000)
    
    # Get the updated token counter value in the system prompt menu
    updated_token_counter_text = token_counter.text_content()
    print(f"Updated token counter with large model: {updated_token_counter_text}")
    
    # Check if there are any prompts available
    prompt_checkboxes = page.locator(".prompt-item-checkbox")
    checkbox_count = prompt_checkboxes.count()
    print(f"Found {checkbox_count} prompt checkboxes")
    
    # If there are prompts, check the first one to trigger token counter update
    if checkbox_count > 0:
        # Use the same approach as before to make the checkbox visible and check it
        try:
            # Force the checkbox to be visible using JavaScript
            page.evaluate("""() => {
                const checkboxes = document.querySelectorAll('.prompt-item-checkbox');
                if (checkboxes.length > 0) {
                    checkboxes[0].style.display = 'block';
                    checkboxes[0].style.opacity = '1';
                    checkboxes[0].style.visibility = 'visible';
                    checkboxes[0].style.position = 'static';
                    
                    // Also make the parent visible
                    const parent = checkboxes[0].closest('.prompt-item');
                    if (parent) {
                        parent.style.display = 'block';
                        parent.style.opacity = '1';
                        parent.style.visibility = 'visible';
                    }
                }
            }""")
            
            # Now try to check the checkbox
            first_checkbox = prompt_checkboxes.first
            if not first_checkbox.is_checked():
                # Use JavaScript to check the checkbox directly
                page.evaluate("""() => {
                    const checkboxes = document.querySelectorAll('.prompt-item-checkbox');
                    if (checkboxes.length > 0) {
                        checkboxes[0].checked = true;
                        
                        // Dispatch change event to trigger any event listeners
                        const event = new Event('change', { bubbles: true });
                        checkboxes[0].dispatchEvent(event);
                        
                        // Also dispatch click event
                        const clickEvent = new MouseEvent('click', { bubbles: true });
                        checkboxes[0].dispatchEvent(clickEvent);
                    }
                }""")
                print("Checked the first prompt checkbox using JavaScript")
            
            # Wait a moment for the token counter to update
            time.sleep(1)
            
            # Get the updated token counter value
            updated_token_counter_text = token_counter.text_content()
            print(f"Updated token counter after checking prompt: {updated_token_counter_text}")
        except Exception as e:
            print(f"Error checking checkbox: {e}")
            # Continue with the test even if we couldn't check the checkbox
    
    # Verify that the token counter text has changed
    assert initial_token_counter_text != updated_token_counter_text, "Token counter should update when model is changed"
    
    # If the large model is o4-mini, verify that the token counter reflects the 128k context window
    if large_model == 'o4-mini':
        # Check for either "128,000" or "128000" or "128k" in the text
        has_correct_size = any(size_str in updated_token_counter_text for size_str in ["128,000", "128000", "128k"])
        
        # If the assertion fails, print the actual token counter text for debugging
        if not has_correct_size:
            print(f"ERROR: Token counter does not contain the expected 128k token size: {updated_token_counter_text}")
            
        assert has_correct_size, f"Token counter should show 128k tokens for o4-mini model, but got: {updated_token_counter_text}"
    
    # Close the prompts modal
    page.click("#close-prompts-modal")
