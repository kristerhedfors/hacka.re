import pytest
import time
import os
from dotenv import load_dotenv
from playwright.sync_api import Page, expect

from test_utils import dismiss_welcome_modal, dismiss_settings_modal, check_system_messages, screenshot_with_markdown

# Load environment variables from .env file in the current directory
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
# Get API key from environment variables
API_KEY = os.getenv("OPENAI_API_KEY", "sk-test-key-for-function-library-sharing-tests")

def test_function_library_sharing(page: Page, serve_hacka_re):
    """
    Test that function library can be shared and loaded from a shared link.
    
    This test:
    1. Creates a test function
    2. Shares it using the function library option
    3. Deletes the function
    4. Loads the shared link
    5. Verifies the function is restored
    """
    # STEP 1: Navigate to the application
    page.goto(serve_hacka_re)
    
    # STEP 2: Handle welcome and settings modals
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # STEP 3: Configure API key and model
    # Click the settings button
    settings_button = page.locator("#settings-btn")
    settings_button.click()
    
    # Wait for the settings modal to become visible
    page.wait_for_selector("#settings-modal.active", state="visible")
    
    # Enter the API key
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill(API_KEY)
    
    # Select OpenAI as the API provider
    base_url_select = page.locator("#base-url-select")
    base_url_select.select_option("openai")
    
    # Select a model
    from test_utils import select_recommended_test_model
    selected_model = select_recommended_test_model(page)
    
    # Save the settings
    save_button = page.locator("#save-settings-btn")
    save_button.click()
    
    # Wait for the settings modal to be closed
    page.wait_for_selector("#settings-modal", state="hidden")
    
    # STEP 4: Create a test function
    # Open the function modal
    function_btn = page.locator("#function-btn")
    function_btn.click()
    
    # Wait for the function modal to be visible
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    # Fill in the function name
    function_name = "test_shared_function"
    function_name_input = page.locator("#function-name")
    function_name_input.fill(function_name)
    
    # Fill in the function code
    function_code = """function test_shared_function(text) {
  return {
    message: "You said: " + text,
    timestamp: new Date().toISOString()
  };
}"""
    function_code_input = page.locator("#function-code")
    function_code_input.fill(function_code)
    
    # Validate the function
    validate_btn = page.locator("#function-validate-btn")
    validate_btn.click()
    
    # Wait for validation result
    validation_result = page.locator("#function-validation-result")
    expect(validation_result).to_contain_text("Function validated successfully")
    
    # Save the function
    save_btn = page.locator("#function-editor-form button[type='submit']")
    save_btn.click()
    
    # Verify the function was added to the list
    function_list = page.locator("#function-list")
    expect(function_list.locator(f".function-item-name:has-text('{function_name}')")).to_be_visible()
    
    # Take a screenshot after adding the function
    screenshot_with_markdown(page, "function_library_sharing_function_added", {
        "step": "Added test function for sharing",
        "function_name": function_name
    })
    
    # Close the function modal
    close_function_modal_btn = page.locator("#close-function-modal")
    close_function_modal_btn.click()
    
    # STEP 5: Share the function library
    # Open the share modal
    share_btn = page.locator("#share-btn")
    share_btn.click()
    
    # Wait for the share modal to be visible
    share_modal = page.locator("#share-modal")
    expect(share_modal).to_be_visible()
    
    # Set a test password
    test_password = "TestPassword123"
    password_input = page.locator("#share-password")
    password_input.fill(test_password)
    
    # Check the function library checkbox
    function_library_checkbox = page.locator("#share-function-library")
    function_library_checkbox.check()
    
    # Take a screenshot of the share modal
    screenshot_with_markdown(page, "function_library_sharing_share_modal", {
        "step": "Share modal with function library option checked",
        "password": test_password
    })
    
    # Generate the share link
    generate_link_btn = page.locator("#generate-share-link-btn")
    generate_link_btn.click()
    
    # Wait for the link to be generated
    generated_link_container = page.locator("#generated-link-container")
    expect(generated_link_container).to_be_visible()
    
    # Get the generated link
    generated_link = page.locator("#generated-link").input_value()
    
    # Take a screenshot of the generated link
    screenshot_with_markdown(page, "function_library_sharing_generated_link", {
        "step": "Generated share link",
        "link_length": len(generated_link)
    })
    
    # Close the share modal
    close_share_modal_btn = page.locator("#close-share-modal")
    close_share_modal_btn.click()
    
    # STEP 6: Delete the function
    # Open the function modal again
    function_btn.click()
    expect(function_modal).to_be_visible()
    
    # Delete the function
    # Handle the confirmation dialog
    page.on("dialog", lambda dialog: dialog.accept())
    
    # Click the delete button for the function
    delete_btn = page.locator(f"#function-list .function-item[data-function-name='{function_name}'] .function-item-delete")
    delete_btn.click()
    
    # Verify the function was deleted
    expect(page.locator(f"#function-list .function-item[data-function-name='{function_name}']")).to_have_count(0)
    
    # Take a screenshot after deleting the function
    screenshot_with_markdown(page, "function_library_sharing_function_deleted", {
        "step": "Function deleted",
        "function_name": function_name
    })
    
    # Close the function modal
    close_function_modal_btn.click()
    
    # STEP 7: Load the shared link
    # Navigate to the shared link
    page.goto(generated_link)
    
    # Wait for the password modal
    password_modal = page.locator("#password-modal")
    expect(password_modal).to_be_visible()
    
    # Enter the password
    decrypt_password_input = page.locator("#decrypt-password")
    decrypt_password_input.fill(test_password)
    
    # Submit the password form
    password_form = page.locator("#password-form")
    password_form.evaluate("form => form.dispatchEvent(new Event('submit'))")
    
    # Wait for the password modal to close
    page.wait_for_selector("#password-modal", state="detached")
    
    # Wait for the system message indicating the function library was loaded
    system_messages = check_system_messages(page)
    
    # Take a screenshot after loading the shared link
    screenshot_with_markdown(page, "function_library_sharing_link_loaded", {
        "step": "Shared link loaded",
        "system_messages_count": system_messages.count()
    })
    
    # STEP 8: Verify the function was restored
    # Open the function modal
    function_btn.click()
    expect(function_modal).to_be_visible()
    
    # Verify the function exists
    expect(function_list.locator(f".function-item-name:has-text('{function_name}')")).to_be_visible()
    
    # Take a screenshot showing the restored function
    screenshot_with_markdown(page, "function_library_sharing_function_restored", {
        "step": "Function restored from shared link",
        "function_name": function_name
    })
    
    # Close the function modal
    close_function_modal_btn.click()
    
    # STEP 9: Clean up
    # Delete the restored function
    function_btn.click()
    expect(function_modal).to_be_visible()
    
    # Click the delete button for the function
    delete_btn = page.locator(f"#function-list .function-item[data-function-name='{function_name}'] .function-item-delete")
    delete_btn.click()
    
    # Close the function modal
    close_function_modal_btn.click()
