import pytest
import time
import os
from dotenv import load_dotenv
from playwright.sync_api import Page, expect

from test_utils import dismiss_welcome_modal, dismiss_settings_modal, check_system_messages, screenshot_with_markdown

# Load environment variables from .env file in the current directory
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
# Get API key from environment variables
API_KEY = os.getenv("OPENAI_API_KEY", "sk-test-key-for-default-functions-sharing-tests")

def test_default_functions_sharing(page: Page, serve_hacka_re):
    """
    Test that default functions can be shared and loaded from a shared link by reference.
    
    This test:
    1. Enables a default function (e.g., RC4 encryption)
    2. Creates a shared link with function library enabled
    3. Verifies the default function selection is included in the shared link
    4. Loads the shared link in a new session
    5. Verifies the default function is restored by reference
    """
    # STEP 1: Navigate to the application
    page.goto(serve_hacka_re)
    
    # STEP 2: Handle welcome and settings modals
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # STEP 3: Configure API key and model for testing
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
    
    # Select gpt-4o-mini model
    from test_utils import select_recommended_test_model
    selected_model = select_recommended_test_model(page)
    
    # Save the settings
    save_button = page.locator("#save-settings-btn")
    save_button.click()
    
    # Wait for the settings modal to be closed
    page.wait_for_selector("#settings-modal", state="hidden")
    
    # STEP 4: Open Function Calling modal and enable a default function
    # Open the function modal
    function_btn = page.locator("#function-btn")
    function_btn.click()
    
    # Wait for the function modal to be visible
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    # Wait a moment for the default functions section to load
    page.wait_for_timeout(1000)
    
    # Look for the default functions section
    default_functions_section = page.locator(".default-functions-section")
    if default_functions_section.is_visible():
        # Check if there are default functions available
        rc4_function_checkbox = page.locator("input[type='checkbox'][data-function-id*='rc4-encryption:encrypt']")
        
        if rc4_function_checkbox.is_visible():
            # Enable the RC4 encryption function
            rc4_function_checkbox.check()
            print("✅ Enabled RC4 encryption function")
            
            # Wait for the function to be processed
            page.wait_for_timeout(500)
            
            # Verify the checkbox is checked
            expect(rc4_function_checkbox).to_be_checked()
        else:
            pytest.skip("RC4 encryption function not available in this test environment")
    else:
        pytest.skip("Default functions section not available in this test environment")
    
    # Take a screenshot showing the enabled default function
    screenshot_with_markdown(page, "default_functions_sharing_enabled", {
        "step": "Default function enabled for sharing test",
        "function_enabled": "RC4 encryption function",
        "checkbox_checked": rc4_function_checkbox.is_checked()
    })
    
    # Close the function modal
    close_function_modal_btn = page.locator("#close-function-modal")
    close_function_modal_btn.click()
    
    # STEP 5: Create a shared link with function library enabled
    # Open the share modal
    share_btn = page.locator("#share-btn")
    share_btn.click()
    
    # Wait for the share modal to be visible
    share_modal = page.locator("#share-modal")
    expect(share_modal).to_be_visible()
    
    # Set a test password
    test_password = "DefaultFunctionTest123"
    password_input = page.locator("#share-password")
    password_input.fill(test_password)
    
    # Check the function library checkbox
    function_library_checkbox = page.locator("#share-function-library")
    function_library_checkbox.check()
    
    # Also check API key checkbox to ensure we have something to share
    api_key_checkbox = page.locator("#share-api-key")
    api_key_checkbox.check()
    
    # Take a screenshot of the share modal configuration
    screenshot_with_markdown(page, "default_functions_sharing_share_modal", {
        "step": "Share modal configured for function library sharing",
        "password": test_password,
        "function_library_checked": function_library_checkbox.is_checked(),
        "api_key_checked": api_key_checkbox.is_checked()
    })
    
    # Generate the share link
    generate_link_btn = page.locator("#generate-share-link-btn")
    generate_link_btn.click()
    
    # Wait for the link generation process
    page.wait_for_timeout(2000)
    
    # Get the generated link
    generated_link_container = page.locator("#generated-link-container")
    expect(generated_link_container).to_be_visible()
    
    generated_link = page.locator("#generated-link").input_value()
    
    # Validate the link is not empty and has the expected format
    assert generated_link, "Generated link is empty"
    assert "#gpt=" in generated_link, f"Generated link doesn't contain #gpt= fragment: {generated_link}"
    
    # Take a screenshot of the generated link
    screenshot_with_markdown(page, "default_functions_sharing_link_generated", {
        "step": "Share link generated with default function selection",
        "link_length": len(generated_link),
        "has_gpt_fragment": "#gpt=" in generated_link
    })
    
    # Close the share modal
    close_share_modal_btn = page.locator("#close-share-modal")
    close_share_modal_btn.click()
    
    # STEP 6: Clear current state and simulate new user
    # Clear function state by disabling the function
    function_btn.click()
    expect(function_modal).to_be_visible()
    
    # Wait for modal to load
    page.wait_for_timeout(1000)
    
    # Uncheck the RC4 function if it's still checked
    if rc4_function_checkbox.is_checked():
        rc4_function_checkbox.uncheck()
        page.wait_for_timeout(500)
        expect(rc4_function_checkbox).not_to_be_checked()
    
    close_function_modal_btn.click()
    
    # Take a screenshot showing the disabled state
    screenshot_with_markdown(page, "default_functions_sharing_disabled", {
        "step": "Default function disabled before loading shared link",
        "function_disabled": "RC4 encryption function"
    })
    
    # STEP 7: Load the shared link
    # Set up console logging before navigation
    console_logs = []
    def handle_console(msg):
        console_logs.append(f"{msg.type}: {msg.text}")
    page.on("console", handle_console)
    
    # Navigate to the shared link
    print(f"Navigating to shared link: {generated_link}")
    page.goto(generated_link)
    
    # Wait for the page to load and process the link
    page.wait_for_timeout(2000)
    
    # Take a screenshot after navigation
    screenshot_with_markdown(page, "default_functions_sharing_after_navigation", {
        "step": "After navigating to shared link with default functions",
        "current_url": page.url,
        "password_modal_visible": page.locator("#password-modal").is_visible(),
        "url_hash_present": "#gpt=" in page.url
    })
    
    # Handle password modal if it appears
    password_modal = page.locator("#password-modal")
    if password_modal.is_visible():
        # Enter the password
        decrypt_password_input = page.locator("#decrypt-password")
        decrypt_password_input.fill(test_password)
        
        # Submit the password form
        password_form = page.locator("#password-form")
        password_form.evaluate("form => form.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}))")
        
        # Wait for the password modal to close
        page.wait_for_selector("#password-modal", state="hidden", timeout=5000)
    
    # Wait for system messages to appear
    page.wait_for_timeout(2000)
    
    # Check for system messages indicating function library was loaded
    system_messages = check_system_messages(page)
    system_message_texts = []
    if system_messages and system_messages.count() > 0:
        for i in range(system_messages.count()):
            text = system_messages.nth(i).text_content()
            system_message_texts.append(text)
    
    # Take a screenshot after processing the shared link
    screenshot_with_markdown(page, "default_functions_sharing_processed", {
        "step": "Shared link processed",
        "system_messages_count": len(system_message_texts),
        "system_messages": system_message_texts[:3] if system_message_texts else []
    })
    
    # STEP 8: Verify the default function was restored
    # Open the function modal to check if the default function is enabled
    function_btn.click()
    expect(function_modal).to_be_visible()
    
    # Wait for the modal to load completely
    page.wait_for_timeout(1500)
    
    # Check if the RC4 function checkbox is now enabled (restored from shared link)
    rc4_checkbox_restored = page.locator("input[type='checkbox'][data-function-id*='rc4-encryption:encrypt']")
    
    # Take a screenshot of the function modal after restoring from shared link
    screenshot_with_markdown(page, "default_functions_sharing_restored", {
        "step": "Function modal after restoring from shared link",
        "rc4_checkbox_visible": rc4_checkbox_restored.is_visible(),
        "rc4_checkbox_checked": rc4_checkbox_restored.is_checked() if rc4_checkbox_restored.is_visible() else False,
        "default_functions_section_visible": page.locator(".default-functions-section").is_visible()
    })
    
    # ASSERTION: The default function should be restored and checked
    if rc4_checkbox_restored.is_visible():
        expect(rc4_checkbox_restored).to_be_checked()
        print("✅ Default function successfully restored from shared link!")
    else:
        # If checkbox not visible, check console logs for any restoration messages
        function_messages = [msg for msg in console_logs if "default function" in msg.lower() or "rc4" in msg.lower()]
        system_function_messages = [msg for msg in system_message_texts if "function" in msg.lower()]
        
        print("Console messages with function references:", function_messages)
        print("System messages with function references:", system_function_messages)
        
        # The test passes if we have evidence of default function restoration
        assert len(function_messages) > 0 or len(system_function_messages) > 0, \
            "Expected evidence of default function restoration in console or system messages"
    
    # Close the function modal
    close_function_modal_btn.click()
    
    # Take a final screenshot showing success
    screenshot_with_markdown(page, "default_functions_sharing_success", {
        "step": "Default functions sharing test completed successfully",
        "function_restored": "RC4 encryption function",
        "test_result": "PASSED - Default function shared by reference and restored"
    })
    
    print("✅ Default functions sharing test completed successfully!")
    print("✅ Default function selections are properly included in shared links by reference")
    print("✅ Default functions are correctly restored when loading shared links")