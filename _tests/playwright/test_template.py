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

def test_template_function(page: Page, serve_hacka_re):
    """
    Template test function for hacka.re.
    
    This template includes common setup steps and best practices for testing hacka.re.
    Copy this file and modify it to create new tests.
    """
    # STEP 1: Navigate to the application
    page.goto(serve_hacka_re)
    
    # STEP 2: Handle welcome and settings modals
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # STEP 3: Configure API key and model (if needed for your test)
    # Uncomment and modify the following code if your test requires API access
    """
    # Click the settings button
    settings_button = page.locator("#settings-btn")
    settings_button.click()
    
    # Wait for the settings modal to become visible
    page.wait_for_selector("#settings-modal.active", state="visible")
    
    # Enter the OpenAI API key from .env
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill(API_KEY)
    
    # Select OpenAI as the API provider
    base_url_select = page.locator("#base-url-select")
    base_url_select.select_option("openai")
    
    # Select a model
    from test_utils import select_recommended_test_model
    selected_model = select_recommended_test_model(page)
    
    # Skip the test if no valid model could be selected
    if not selected_model:
        pytest.skip("No valid model could be selected")
    
    # Save the settings
    save_button = page.locator("#settings-form button[type='submit']")
    save_button.click()
    
    # Wait for the settings modal to be closed
    page.wait_for_selector("#settings-modal", state="hidden")
    """
    
    # STEP 4: Take a screenshot with debug information
    screenshot_with_markdown(page, "template_test_start.png", {
        "Status": "Test started",
        "Test Name": "Template Test Function",
        "Description": "This is a template test for hacka.re"
    })
    
    # STEP 5: Implement your test logic here
    # Example: Check if the chat input is visible
    message_input = page.locator("#message-input")
    expect(message_input).to_be_visible()
    
    # STEP 6: Take another screenshot with updated debug information
    screenshot_with_markdown(page, "template_test_end.png", {
        "Status": "Test completed",
        "Test Name": "Template Test Function",
        "Result": "Chat input is visible"
    })
    
    # STEP 7: Add assertions to verify expected behavior
    # Example: Verify that the chat input is empty
    expect(message_input).to_have_value("")
    
    # STEP 8: Check for any system messages or errors
    check_system_messages(page)
