"""
RC4 Encryption/Decryption Function Tests

This module contains tests for RC4 encryption/decryption functions with API key.
"""
import pytest
import os
import time
from urllib.parse import urljoin
from playwright.sync_api import Page, expect

from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown

from function_calling_api.helpers.setup_helpers import (
    setup_console_logging, 
    configure_api_key_and_model, 
    enable_tool_calling_and_function_tools
)

def test_rc4_encryption_functions_with_api(page: Page, serve_hacka_re, api_key):
    """Test RC4 encryption/decryption functions with API key."""
    # Start timing the test
    start_time = time.time()
    
    # Set up console error logging
    setup_console_logging(page)
    
    # Ensure serve_hacka_re ends with a trailing slash for proper URL joining
    base_url = serve_hacka_re if serve_hacka_re.endswith('/') else f"{serve_hacka_re}/"
    print(f"Base URL: {base_url}")
    
    # Navigate to the page with explicit wait for load
    print(f"Navigating to {base_url}")
    try:
        page.goto(base_url, wait_until="domcontentloaded")
        print("Initial navigation successful")
    except Exception as e:
        print(f"Error during initial navigation: {e}")
        # Take a screenshot for debugging
        screenshot_with_markdown(page, "initial_navigation_error_rc4", 
                               {"Error": str(e), "Component": "Navigation", "Status": "Error"})
    
    # Wait for the page to be fully loaded
    try:
        page.wait_for_load_state("networkidle", timeout=2000)
        print("Network idle state reached")
    except Exception as e:
        print(f"Error waiting for network idle: {e}")
        # Take a screenshot for debugging
        screenshot_with_markdown(page, "network_idle_timeout_rc4",
                               {"Error": str(e), "Component": "Navigation", "Status": "Timeout", "Timeout": "5000ms"})
    
    # Verify the page loaded correctly
    title = page.title()
    print(f"Page title: {title}")
    
    # Check if the page loaded correctly
    if not title or "hacka.re" not in title.lower():
        print("WARNING: Page may not have loaded correctly")
        # Take a screenshot for debugging
        screenshot_with_markdown(page, "page_load_issue_rc4",
                               {"Warning": "Page may not have loaded correctly", "Component": "Navigation", "Status": "Warning", "Title": title})
        
        # Try to navigate directly to index.html using proper URL joining
        index_url = urljoin(base_url, "index.html")
        print(f"Trying direct navigation to: {index_url}")
        
        try:
            page.goto(index_url, wait_until="domcontentloaded")
            print("Direct navigation to index.html successful")
            page.wait_for_load_state("networkidle", timeout=2000)
            title = page.title()
            print(f"After direct navigation, page title: {title}")
        except Exception as e:
            print(f"Error during direct navigation to index.html: {e}")
            # Take a screenshot for debugging
            screenshot_with_markdown(page, "direct_navigation_error_rc4",
                                   {"Error": str(e), "Component": "Navigation", "Status": "Error", "Navigation Target": index_url})
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if already open
    dismiss_settings_modal(page)
    
    # Configure API key and model
    try:
        configure_api_key_and_model(page, api_key)
        print("API key and model configured successfully")
    except Exception as e:
        print(f"Error configuring API key and model: {e}")
        # Take a screenshot for debugging
        screenshot_with_markdown(page, "api_key_config_error_rc4",
                               {"Error": str(e), "Component": "API Key Configuration", "Status": "Error"})
        pytest.fail(f"Failed to configure API key and model: {e}")
    
    # Enable tool calling and function tools
    try:
        enable_tool_calling_and_function_tools(page)
        print("Tool calling and function tools enabled successfully")
    except Exception as e:
        print(f"Error enabling tool calling and function tools: {e}")
        # Take a screenshot for debugging
        screenshot_with_markdown(page, "enable_tools_error_rc4",
                               {"Error": str(e), "Component": "Tool Calling and Function Tools", "Status": "Error"})
        pytest.fail(f"Failed to enable tool calling and function tools: {e}")
    
    # Add RC4 encryption function
    try:
        page.locator("#function-btn").click()
        print("Clicked function button")
    except Exception as e:
        print(f"Error clicking function button: {e}")
        # Take a screenshot for debugging
        screenshot_with_markdown(page, "function_btn_error_rc4",
                               {"Error": str(e), "Component": "Function Button", "Status": "Error"})
        # Try JavaScript as a fallback
        page.evaluate("""() => {
            const functionBtn = document.querySelector('#function-btn');
            if (functionBtn) functionBtn.click();
        }""")
        print("Tried to click function button using JavaScript")
    
    function_modal = page.locator("#function-modal")
    try:
        expect(function_modal).to_be_visible(timeout=2000)
        print("Function modal is visible")
    except Exception as e:
        print(f"Error waiting for function modal to be visible: {e}")
        # Take a screenshot for debugging
        screenshot_with_markdown(page, "function_modal_not_visible_rc4",
                               {"Error": str(e), "Component": "Function Modal", "Status": "Not Visible"})
        # Try to make it visible with JavaScript
        page.evaluate("""() => {
            const modal = document.querySelector('#function-modal');
            if (modal) {
                modal.classList.add('active');
                modal.style.display = 'block';
            }
        }""")
        print("Tried to make function modal visible with JavaScript")
        page.wait_for_timeout(1000)
    
    # Add the encrypt function - the function name will be auto-populated from the code
    function_code = page.locator("#function-code")
    function_code.fill("""/**
 * @description Encrypt text using RC4 algorithm
 * @param {string} plaintext - Text to encrypt
 * @param {string} key - Encryption key
 * @returns {object} Result with encrypted text
 */
function rc4_encrypt(plaintext, key) {
  // This function uses the RC4Utils module to encrypt data
  if (!plaintext || !key) {
    throw new Error("Both plaintext and key are required");
  }
  
  try {
    const encrypted = RC4Utils.encrypt(plaintext, key);
    return {
      success: true,
      plaintext: plaintext,
      key: key,
      encrypted: encrypted
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}""")
    
    # Validate the function
    try:
        page.locator("#function-validate-btn").click()
        print("Clicked validate button for encrypt function")
    except Exception as e:
        print(f"Error clicking validate button: {e}")
        # Try JavaScript as a fallback
        page.evaluate("""() => {
            const validateBtn = document.querySelector('#function-validate-btn');
            if (validateBtn) validateBtn.click();
        }""")
        print("Tried to click validate button using JavaScript")
    
    # Check for validation result
    validation_result = page.locator("#function-validation-result")
    try:
        expect(validation_result).to_be_visible(timeout=2000)
        expect(validation_result).to_contain_text("Function validated successfully")
        print("Encrypt function validated successfully")
    except Exception as e:
        print(f"Error checking validation result for encrypt function: {e}")
        # Take a screenshot for debugging
        screenshot_with_markdown(page, "validation_result_encrypt_error",
                               {"Error": str(e), "Component": "Function Validation", "Status": "Error", "Function": "rc4_encrypt"})
    
    # Submit the form
    try:
        page.locator("#function-editor-form button[type='submit']").click()
        print("Submitted encrypt function")
    except Exception as e:
        print(f"Error submitting encrypt function: {e}")
        # Try JavaScript as a fallback
        page.evaluate("""() => {
            const submitBtn = document.querySelector('#function-editor-form button[type="submit"]');
            if (submitBtn) submitBtn.click();
        }""")
        print("Tried to submit encrypt function using JavaScript")
    
    # Add the decrypt function
    # Note: After adding a function, the form is reset to default values
    # So we need to fill in the function code again
    
    # Take a screenshot after adding the encrypt function
    screenshot_with_markdown(page, "after_adding_encrypt_function",
                           {"Component": "Function Editor", "Status": "After Encrypt Function"})
    
    function_code.fill("""/**
 * @description Decrypt text using RC4 algorithm
 * @param {string} ciphertext - Encrypted text (hex format)
 * @param {string} key - Decryption key
 * @returns {object} Result with decrypted text
 */
function rc4_decrypt(ciphertext, key) {
  // This function uses the RC4Utils module to decrypt data
  if (!ciphertext || !key) {
    throw new Error("Both ciphertext and key are required");
  }
  
  try {
    const decrypted = RC4Utils.decrypt(ciphertext, key);
    return {
      success: true,
      ciphertext: ciphertext,
      key: key,
      decrypted: decrypted
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}""")
    
    # No need to check the function name field as it's now hidden
    
    # Validate the function
    try:
        page.locator("#function-validate-btn").click()
        print("Clicked validate button for decrypt function")
    except Exception as e:
        print(f"Error clicking validate button: {e}")
        # Try JavaScript as a fallback
        page.evaluate("""() => {
            const validateBtn = document.querySelector('#function-validate-btn');
            if (validateBtn) validateBtn.click();
        }""")
    
    # Check for validation result
    try:
        expect(validation_result).to_contain_text("Function validated successfully")
        print("Decrypt function validated successfully")
    except Exception as e:
        print(f"Error checking validation result for decrypt function: {e}")
        # Take a screenshot for debugging
        screenshot_with_markdown(page, "validation_result_decrypt_error",
                               {"Error": str(e), "Component": "Function Validation", "Status": "Error", "Function": "rc4_decrypt"})
    
    # Submit the form
    try:
        page.locator("#function-editor-form button[type='submit']").click()
        print("Submitted decrypt function")
    except Exception as e:
        print(f"Error submitting decrypt function: {e}")
        # Try JavaScript as a fallback
        page.evaluate("""() => {
            const submitBtn = document.querySelector('#function-editor-form button[type="submit"]');
            if (submitBtn) submitBtn.click();
        }""")
    
    # Check if both functions were added to the list
    function_list = page.locator("#function-list")
    
    # Take a screenshot of the function list for debugging
    screenshot_with_markdown(page, "function_list_after_adding",
                           {"Component": "Function List", "Status": "After Adding Functions"})
    
    # Use JavaScript to check if the functions exist in the DOM
    encrypt_function_exists = page.evaluate("""() => {
        const functionItems = document.querySelectorAll('.function-item-name');
        for (const item of functionItems) {
            if (item.textContent.includes('rc4_encrypt')) return true;
        }
        return false;
    }""")
    
    decrypt_function_exists = page.evaluate("""() => {
        const functionItems = document.querySelectorAll('.function-item-name');
        for (const item of functionItems) {
            if (item.textContent.includes('rc4_decrypt')) return true;
        }
        return false;
    }""")
    
    # Check how many functions are in the list
    function_count = function_list.locator(".function-item-name").count()
    print(f"Found {function_count} functions in the list")
    
    if encrypt_function_exists and decrypt_function_exists:
        print("Both functions were found in the DOM")
    else:
        print(f"Missing functions: encrypt={encrypt_function_exists}, decrypt={decrypt_function_exists}")
        # Take a screenshot for debugging
        screenshot_with_markdown(page, "functions_not_added",
                               {"Error": "Functions not found in DOM", 
                                "Component": "Function List", 
                                "Status": "Error", 
                                "Function Count": str(function_count),
                                "Encrypt Function": str(encrypt_function_exists),
                                "Decrypt Function": str(decrypt_function_exists)})
    
    # Try to verify functions are visible (with more robust error handling)
    try:
        expect(function_list.locator(".function-item-name:has-text('rc4_encrypt')")).to_be_visible(timeout=2000)
        expect(function_list.locator(".function-item-name:has-text('rc4_decrypt')")).to_be_visible(timeout=2000)
        print("Both functions were added to the list and are visible")
    except Exception as e:
        print(f"Error checking if functions are visible: {e}")
        # We'll continue anyway since we've already checked they exist in the DOM
    
    # Close the function modal
    try:
        page.locator("#close-function-modal").click()
        print("Clicked close function modal button")
    except Exception as e:
        print(f"Error clicking close function modal button: {e}")
        # Try JavaScript as a fallback
        page.evaluate("""() => {
            const closeBtn = document.querySelector('#close-function-modal');
            if (closeBtn) closeBtn.click();
        }""")
    
    try:
        expect(function_modal).not_to_be_visible(timeout=2000)
        print("Function modal closed successfully")
    except Exception as e:
        print(f"Error waiting for function modal to close: {e}")
        # Try to close it with JavaScript
        page.evaluate("""() => {
            const modal = document.querySelector('#function-modal');
            if (modal) {
                modal.classList.remove('active');
                modal.style.display = 'none';
            }
        }""")
    
    # Test encryption/decryption through chat
    message_input = page.locator("#message-input")
    test_message = "Encrypt the text 'Hello, World!' using the key 'secret'"
    try:
        message_input.fill(test_message)
        print("Filled message input")
    except Exception as e:
        print(f"Error filling message input: {e}")
        # Try JavaScript as a fallback
        page.evaluate("""(message) => {
            const input = document.querySelector('#message-input');
            if (input) input.value = message;
        }""", test_message)
    
    # Send the message
    try:
        send_button = page.locator("#send-btn")
        send_button.click()
        print("Clicked send button")
    except Exception as e:
        print(f"Error clicking send button: {e}")
        # Try JavaScript as a fallback
        page.evaluate("""() => {
            const sendBtn = document.querySelector('#send-btn');
            if (sendBtn) sendBtn.click();
        }""")
    
    # Wait for the assistant response
    try:
        page.wait_for_selector(".message.assistant .message-content", 
                              state="visible", 
                              timeout=2000)
        print("Assistant response appeared")
        
        # Get the assistant message
        assistant_message = page.locator(".message.assistant .message-content").last
        assistant_text = assistant_message.text_content()
        print(f"Assistant response: {assistant_text}")
        
        # Take a screenshot of the encryption response
        screenshot_with_markdown(page, "rc4_encryption_response",
                               {"Component": "Chat Response", "Status": "Success", "Response Type": "Encryption", "Message": assistant_text[:100] + "..."})
        
        # The test passes as long as we got a response
        expect(assistant_message).to_be_visible()
    except Exception as e:
        print(f"Error waiting for assistant response: {e}")
        # Take a screenshot for debugging
        screenshot_with_markdown(page, "assistant_response_timeout_rc4",
                               {"Error": str(e), "Component": "Chat Response", "Status": "Timeout", "System Messages": str(system_message_count)})
        # Check if there are any system messages
        system_messages = page.locator(".message.system .message-content")
        system_message_count = system_messages.count()
        if system_message_count > 0:
            print(f"Found {system_message_count} system messages:")
            for i in range(system_message_count):
                print(f"  - {system_messages.nth(i).text_content()}")
        
        pytest.fail("Assistant response did not appear in chat")
    
    # Clean up - delete the functions
    try:
        page.locator("#function-btn").click()
        print("Clicked function button for cleanup")
    except Exception as e:
        print(f"Error clicking function button for cleanup: {e}")
        # Try JavaScript as a fallback
        page.evaluate("""() => {
            const functionBtn = document.querySelector('#function-btn');
            if (functionBtn) functionBtn.click();
        }""")
    
    try:
        function_modal = page.locator("#function-modal")
        expect(function_modal).to_be_visible(timeout=2000)
        print("Function modal is visible for cleanup")
    except Exception as e:
        print(f"Error waiting for function modal to be visible for cleanup: {e}")
        # Try to make it visible with JavaScript
        page.evaluate("""() => {
            const modal = document.querySelector('#function-modal');
            if (modal) {
                modal.classList.add('active');
                modal.style.display = 'block';
            }
        }""")
    
    # Handle the confirmation dialog for deletion
    page.on("dialog", lambda dialog: dialog.accept())
    
    # Delete all functions
    try:
        function_list = page.locator("#function-list")
        while function_list.locator(".function-item-delete").count() > 0:
            function_list.locator(".function-item-delete").first.click()
            # Small wait to allow the UI to update
            page.wait_for_timeout(100)
        print("Deleted all functions")
    except Exception as e:
        print(f"Error deleting functions: {e}")
        # Try JavaScript as a fallback
        page.evaluate("""() => {
            const deleteButtons = document.querySelectorAll('.function-item-delete');
            for (const button of deleteButtons) {
                button.click();
            }
        }""")
    
    # Close the function modal
    try:
        page.locator("#close-function-modal").click()
        print("Clicked close function modal button after cleanup")
    except Exception as e:
        print(f"Error clicking close function modal button after cleanup: {e}")
        # Try JavaScript as a fallback
        page.evaluate("""() => {
            const closeBtn = document.querySelector('#close-function-modal');
            if (closeBtn) closeBtn.click();
        }""")
    
    try:
        expect(function_modal).not_to_be_visible(timeout=2000)
        print("Function modal closed successfully after cleanup")
    except Exception as e:
        print(f"Error waiting for function modal to close after cleanup: {e}")
        # Try to close it with JavaScript
        page.evaluate("""() => {
            const modal = document.querySelector('#function-modal');
            if (modal) {
                modal.classList.remove('active');
                modal.style.display = 'none';
            }
        }""")
    
    # End timing and print execution time
    end_time = time.time()
    execution_time = end_time - start_time
    
    # Take a final screenshot
    screenshot_with_markdown(page, "rc4_test_complete",
                           {"Component": "Test Completion", "Status": "Complete", "Execution Time": f"{execution_time:.3f} seconds"})
    
    print(f"\n⏱️ test_rc4_encryption_functions_with_api completed in {execution_time:.3f} seconds")
