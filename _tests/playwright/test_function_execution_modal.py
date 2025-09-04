"""
Test Function Execution Modal
Tests the human-in-the-loop function execution approval system
Includes tests for YOLO mode memory features
"""

import json
import time
import pytest
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown


def handle_any_function_modal(page, max_modals=5):
    """
    Handle ALL function execution modals that appear.
    Just keeps clicking Execute until no more modals appear.
    
    Returns the number of modals handled.
    """
    handled = 0
    for i in range(max_modals):
        try:
            # Check if modal is visible
            if not page.locator("#function-execution-modal").is_visible():
                # Wait a bit to see if one appears
                page.wait_for_selector("#function-execution-modal", state="visible", timeout=2000)
            
            print(f"Function modal {handled + 1} detected")
            
            # Wait for it to be ready
            page.wait_for_timeout(500)
            
            # Force click Execute using JavaScript
            page.evaluate("""() => {
                const btn = document.querySelector('#exec-execute-btn');
                if (btn) {
                    btn.click();
                    console.log('Clicked execute button');
                } else {
                    console.log('Execute button not found');
                }
            }""")
            
            # Wait for modal to close
            page.wait_for_selector("#function-execution-modal", state="hidden", timeout=5000)
            handled += 1
            print(f"Handled modal {handled}")
            
        except Exception as e:
            # No more modals
            print(f"No more modals after handling {handled}")
            break
            
    return handled


def setup_api_and_functions(page: Page, api_key: str):
    """Helper to set up API key and add a test function"""
    if not api_key:
        pytest.skip("API key required for function execution tests")
    
    # Configure API key through UI
    settings_btn = page.locator("#settings-btn")
    settings_btn.click()
    page.wait_for_selector("#settings-modal", state="visible")
    
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill(api_key)
    
    provider_select = page.locator("#base-url-select")
    provider_select.select_option(value="openai")
    
    page.wait_for_timeout(1000)
    
    # Select gpt-5-nano model
    model_select = page.locator("#model-select")
    model_select.select_option(value="gpt-5-nano")
    
    page.wait_for_timeout(500)
    
    close_settings = page.locator("#close-settings")
    close_settings.click()
    page.wait_for_selector("#settings-modal", state="hidden")
    
    # Add a simple test function
    function_btn = page.locator("#function-btn")
    function_btn.click()
    page.wait_for_selector("#function-modal", state="visible")
    
    # Add a simple encryption function
    function_code = page.locator("#function-code")
    function_code.fill("""/**
 * Simple encrypt function for testing
 * @param {string} text - Text to encrypt
 * @param {string} key - Encryption key
 * @returns {object} Encrypted result
 */
function encrypt(text, key) {
  // Simple XOR encryption for testing
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return {
    encrypted: btoa(result),
    method: 'XOR',
    key_used: key
  };
}""")
    
    # Validate the function
    validate_btn = page.locator("#function-validate-btn")
    validate_btn.click()
    page.wait_for_timeout(1000)
    
    # Submit the function
    submit_btn = page.locator("#function-editor-form button[type='submit']")
    submit_btn.click()
    page.wait_for_timeout(1000)
    
    close_function = page.locator("#close-function-modal")
    close_function.click()
    page.wait_for_selector("#function-modal", state="hidden")


def handle_execution_modal_if_appears(page: Page, action="execute"):
    """Helper to handle execution modal if it appears (for non-YOLO mode)
    
    Args:
        page: Playwright page object
        action: "execute", "block", or "edit" - what to do with the modal
    """
    try:
        # Check if execution modal appears
        modal = page.locator("#function-execution-modal")
        if modal.is_visible(timeout=2000):
            if action == "execute":
                execute_btn = modal.locator("#exec-execute-btn")
                execute_btn.click()
            elif action == "block":
                block_btn = modal.locator("#exec-block-btn")
                block_btn.click()
            # Wait for modal to close
            page.wait_for_selector("#function-execution-modal", state="hidden", timeout=5000)
            return True
        return False
    except:
        return False


def set_yolo_mode(page: Page, enabled: bool):
    """Helper to set YOLO mode to specific state"""
    settings_btn = page.locator("#settings-btn")
    settings_btn.click()
    page.wait_for_selector("#settings-modal", state="visible", timeout=5000)
    
    yolo_checkbox = page.locator("#yolo-mode-checkbox")
    if yolo_checkbox.count() > 0:
        is_checked = yolo_checkbox.is_checked()
        if is_checked != enabled:
            yolo_checkbox.click()
            page.wait_for_timeout(500)  # Wait for setting to save
    
    # Close settings
    close_settings = page.locator("#close-settings")
    close_settings.click()
    page.wait_for_selector("#settings-modal", state="hidden", timeout=5000)


def test_basic_function_approval(page: Page, serve_hacka_re, api_key):
    """Test basic function approval flow - works with or without YOLO"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Set up API and functions
    setup_api_and_functions(page, api_key)
    
    # Send a message that will trigger function call
    chat_input = page.locator("#message-input")
    chat_input.fill("encrypt 'test' with key 'secret'")
    chat_input.press("Enter")
    
    # Wait for and handle execution modal if it appears
    modal = page.locator("#function-execution-modal")
    
    try:
        # Wait for modal to appear
        page.wait_for_selector("#function-execution-modal", state="visible", timeout=5000)
        print("Function execution modal appeared")
        
        # Check that parameters are shown
        params_textarea = modal.locator("#exec-args-textarea")
        expect(params_textarea).to_be_visible()
        params_text = params_textarea.input_value()
        assert "test" in params_text
        assert "secret" in params_text
        
        screenshot_with_markdown(page, "function_approval_modal", {
            "Test": "Basic function approval",
            "Status": "Modal shown with parameters",
            "Mode": "Non-YOLO"
        })
        
        # Click Execute
        execute_btn = modal.locator("#exec-execute-btn")
        expect(execute_btn).to_be_visible()
        execute_btn.click()
        print("Clicked Execute button")
        
        # Modal should close
        page.wait_for_selector("#function-execution-modal", state="hidden", timeout=5000)
        print("Modal closed after execution")
    except TimeoutError:
        # Modal didn't appear - likely YOLO mode is on
        print("Modal didn't appear - YOLO mode may be enabled")
        screenshot_with_markdown(page, "function_auto_executed", {
            "Test": "Basic function approval",
            "Status": "Function auto-executed",
            "Mode": "YOLO"
        })
    
    # Wait for response generation to complete
    # The send button gets data-generating="true" during generation
    send_button = page.locator("#send-btn")
    
    print("Waiting for response generation to complete...")
    
    # Wait for generation to finish (data-generating attribute removed)
    # First wait a moment for generation to start
    page.wait_for_timeout(1000)
    
    # Then wait for the data-generating attribute to be removed (generation complete)
    # Also handle case where element might not exist yet
    page.wait_for_function(
        """() => {
            const btn = document.querySelector('#send-btn');
            return btn && !btn.hasAttribute('data-generating');
        }""",
        timeout=30000
    )
    print("Generation complete")
    
    # Wait for assistant response with content - based on test_chat.py approach
    print("Waiting for assistant response with content...")
    
    try:
        # Wait for assistant message content to be visible
        page.wait_for_selector(".message.assistant .message-content", state="visible", timeout=15000)
        print("Assistant message content visible")
        
        # Get the assistant response messages
        assistant_messages = page.locator(".message.assistant .message-content")
        
        # Find non-empty assistant response
        actual_response = None
        for i in range(assistant_messages.count()):
            msg_content = assistant_messages.nth(i).text_content()
            if msg_content and msg_content.strip():
                actual_response = msg_content.strip()
                print(f"Found assistant response in message {i+1}: {actual_response[:100]}...")
                break
        
        assert actual_response, "No assistant response with content found"
        
    except Exception as e:
        print(f"Error waiting for assistant response: {e}")
        # Take screenshot for debugging
        screenshot_with_markdown(page, "no_assistant_response", {
            "Test": "Basic function approval",
            "Status": "No assistant response",
            "Error": str(e)
        })
        raise
    
    screenshot_with_markdown(page, "function_approved_result", {
        "Test": "Basic function approval",
        "Status": "Function executed and result shown",
        "Response": actual_response[:100] if actual_response else "None"
    })


def test_function_block(page: Page, serve_hacka_re, api_key):
    """Test blocking function execution - requires non-YOLO mode"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Set up API and functions
    setup_api_and_functions(page, api_key)
    
    # Ensure YOLO is disabled for this test
    set_yolo_mode(page, False)
    
    # Clear chat first
    clear_btn = page.locator("#clear-chat-btn")
    clear_btn.click()
    page.wait_for_timeout(500)
    
    # Send a message that will trigger function call
    chat_input = page.locator("#message-input")
    chat_input.fill("encrypt 'blocked' with key 'test'")
    chat_input.press("Enter")
    
    # Wait for function execution modal
    modal = page.locator("#function-execution-modal")
    page.wait_for_selector("#function-execution-modal", state="visible", timeout=10000)
    
    # Click Block
    block_btn = modal.locator("#exec-block-btn")
    block_btn.click()
    
    # Modal should close
    page.wait_for_selector("#function-execution-modal", state="hidden", timeout=5000)
    
    # Check that error message appears in chat
    page.wait_for_selector(".message.system", timeout=10000)
    system_msg = page.locator(".message.system").last
    expect(system_msg).to_contain_text("Error")
    
    screenshot_with_markdown(page, "function_blocked", {
        "Test": "Function block",
        "Status": "Function blocked and error shown"
    })


def test_execute_with_intercept(page: Page, serve_hacka_re, api_key):
    """Test execute with result interception"""
    pytest.skip("Skipping intercept test - too unreliable with AI behavior")
    return
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Set up API and functions
    setup_api_and_functions(page, api_key)
    
    # Ensure YOLO is disabled for this test
    set_yolo_mode(page, False)
    
    # Clear chat
    clear_btn = page.locator("#clear-chat-btn")
    clear_btn.click()
    page.wait_for_timeout(500)
    
    # Send a message that will trigger function call
    chat_input = page.locator("#message-input")
    chat_input.fill("encrypt 'intercept' with key 'key123'")
    chat_input.press("Enter")
    
    # Wait for function execution modal
    modal = page.locator("#function-execution-modal")
    page.wait_for_selector("#function-execution-modal", state="visible", timeout=10000)
    
    # Click Execute + Intercept
    intercept_btn = modal.locator("#exec-intercept-btn")
    print("Clicking Execute + Intercept button...")
    intercept_btn.click()
    
    # The function execution happens and modal switches to result tab
    # But we need to wait for the execution to complete
    print("Waiting for function execution to complete...")
    
    # Poll for the result tab OR handle any new modals that appear
    max_wait = 10
    for i in range(max_wait):
        # First check if a NEW modal has appeared (modal closed and reopened)
        modal_closed = not page.locator("#function-execution-modal").is_visible()
        if modal_closed:
            print("Modal closed - checking for new one...")
            try:
                page.wait_for_selector("#function-execution-modal", state="visible", timeout=1000)
                print("NEW modal appeared! Handling it first...")
                page.locator("#exec-execute-btn").click(force=True)
                page.wait_for_selector("#function-execution-modal", state="hidden", timeout=3000)
                print("Handled intermediate modal, continuing...")
                # Now wait for original modal to come back
                page.wait_for_selector("#function-execution-modal", state="visible", timeout=3000)
            except:
                pass
        
        # Now check for result tab
        result_tab_active = page.evaluate("""() => {
            const tab = document.querySelector('#exec-result-tab');
            return tab && tab.classList.contains('active');
        }""")
        
        if result_tab_active:
            print(f"Result tab became active after {i+1} seconds")
            break
        
        print(f"Waiting for result tab... ({i+1}/{max_wait})")
        page.wait_for_timeout(1000)
    
    # Now wait for the textarea to have content
    page.wait_for_selector("#exec-result-textarea", state="visible", timeout=10000)
    print("Result textarea is visible")
    
    # Wait for it to have a value
    page.wait_for_function(
        """() => {
            const textarea = document.querySelector('#exec-result-textarea');
            return textarea && textarea.value && textarea.value.length > 0;
        }""",
        timeout=10000
    )
    print("Result textarea has content")
    
    # Result textarea should be visible with result
    result_textarea = modal.locator("#exec-result-textarea")
    expect(result_textarea).to_be_visible()
    
    # Get the original result
    original_result = result_textarea.input_value()
    
    screenshot_with_markdown(page, "intercept_result_shown", {
        "Test": "Execute with intercept",
        "Status": "Result shown in Result tab"
    })
    
    # Modify the result
    modified_result = json.dumps({"modified": True, "original_length": len(original_result)})
    result_textarea.fill(modified_result)
    
    # Click Return
    return_btn = modal.locator("#exec-return-btn")
    return_btn.click()
    
    # Modal should close
    page.wait_for_selector("#function-execution-modal", state="hidden", timeout=5000)
    
    # Handle any additional function calls that might occur
    # The AI might decide to call the function again or call other functions
    print("Checking for additional function calls...")
    
    # Handle any additional function calls that might occur
    print("Checking for additional function calls after intercept...")
    
    for i in range(5):
        try:
            # Wait for modal to appear
            page.wait_for_selector("#function-execution-modal", state="visible", timeout=2000)
            print(f"Additional function call {i+1} appeared!")
            
            # IMMEDIATELY click the button - no waiting, no checking
            page.locator("#exec-execute-btn").click(force=True)
            print(f"Force clicked execute button for call {i+1}")
            
            # Wait for modal to close
            page.wait_for_selector("#function-execution-modal", state="hidden", timeout=5000) 
            print(f"Modal {i+1} closed")
        except Exception as e:
            print(f"No more modals after {i} calls. Details: {e}")
            break
    
    # Wait for generation to complete
    print("Waiting for all generation to complete...")
    page.wait_for_function(
        """() => {
            const btn = document.querySelector('#send-btn');
            return btn && !btn.hasAttribute('data-generating');
        }""",
        timeout=30000
    )
    
    # Check that result appears in chat
    page.wait_for_selector(".message.assistant .message-content", state="visible", timeout=15000)
    
    screenshot_with_markdown(page, "intercept_modified_result", {
        "Test": "Execute with intercept",
        "Status": "Modified result returned"
    })


def test_intercept_with_re_execution(page: Page, serve_hacka_re, api_key):
    """Test re-execution within intercept mode"""
    pytest.skip("Skipping re-execution test - too unreliable with AI behavior")
    return
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Set up API and functions
    setup_api_and_functions(page, api_key)
    
    # Ensure YOLO is disabled for this test
    set_yolo_mode(page, False)
    
    # Clear chat
    clear_btn = page.locator("#clear-chat-btn")
    clear_btn.click()
    page.wait_for_timeout(500)
    
    # Send a message that will trigger function call
    chat_input = page.locator("#message-input")
    chat_input.fill("encrypt 'reexecute' with key 'firstkey'")
    chat_input.press("Enter")
    
    # Wait for function execution modal
    modal = page.locator("#function-execution-modal")
    page.wait_for_selector("#function-execution-modal", state="visible", timeout=10000)
    
    # Click Execute + Intercept
    intercept_btn = modal.locator("#exec-intercept-btn")
    print("Clicking Execute + Intercept button...")
    intercept_btn.click()
    
    # The function execution happens and modal switches to result tab
    # But we need to wait for the execution to complete
    print("Waiting for function execution to complete...")
    
    # Poll for the result tab OR handle any new modals that appear
    max_wait = 10
    for i in range(max_wait):
        # First check if a NEW modal has appeared (modal closed and reopened)
        modal_closed = not page.locator("#function-execution-modal").is_visible()
        if modal_closed:
            print("Modal closed - checking for new one...")
            try:
                page.wait_for_selector("#function-execution-modal", state="visible", timeout=1000)
                print("NEW modal appeared! Handling it first...")
                page.locator("#exec-execute-btn").click(force=True)
                page.wait_for_selector("#function-execution-modal", state="hidden", timeout=3000)
                print("Handled intermediate modal, continuing...")
                # Now wait for original modal to come back
                page.wait_for_selector("#function-execution-modal", state="visible", timeout=3000)
            except:
                pass
        
        # Now check for result tab
        result_tab_active = page.evaluate("""() => {
            const tab = document.querySelector('#exec-result-tab');
            return tab && tab.classList.contains('active');
        }""")
        
        if result_tab_active:
            print(f"Result tab became active after {i+1} seconds")
            break
        
        print(f"Waiting for result tab... ({i+1}/{max_wait})")
        page.wait_for_timeout(1000)
    
    # Now wait for the textarea to have content
    page.wait_for_selector("#exec-result-textarea", state="visible", timeout=10000)
    print("Result textarea is visible")
    
    # Wait for it to have a value
    page.wait_for_function(
        """() => {
            const textarea = document.querySelector('#exec-result-textarea');
            return textarea && textarea.value && textarea.value.length > 0;
        }""",
        timeout=10000
    )
    print("Result textarea has content")
    
    # Get the first result
    result_textarea = modal.locator("#exec-result-textarea")
    first_result = result_textarea.input_value()
    
    screenshot_with_markdown(page, "re_execution_first_result", {
        "Test": "Re-execution",
        "Status": "First execution complete"
    })
    
    # Switch back to Request tab
    request_tab = modal.locator("#exec-request-tab")
    request_tab.click()
    
    # Modify parameters
    params_textarea = modal.locator("#exec-args-textarea")
    new_params = json.dumps({"plaintext": "reexecute", "key": "secondkey"})
    params_textarea.fill(new_params)
    
    screenshot_with_markdown(page, "re_execution_modified_params", {
        "Test": "Re-execution",
        "Status": "Parameters modified"
    })
    
    # Click Execute + Intercept again (re-execution)
    intercept_btn.click()
    
    # Wait for the function to execute again and result tab to become active
    page.wait_for_selector("#exec-result-tab.active", timeout=10000)
    
    # Wait for the new result to appear (different from first result)
    page.wait_for_function(
        """(oldResult) => {
            const textarea = document.querySelector('#exec-result-textarea');
            return textarea && textarea.value && textarea.value !== oldResult;
        }""",
        arg=first_result,
        timeout=10000
    )
    
    # Get the second result
    second_result = result_textarea.input_value()
    
    # Results should be different (different key used)
    assert first_result != second_result, "Re-execution should produce different result with different key"
    
    screenshot_with_markdown(page, "re_execution_second_result", {
        "Test": "Re-execution",
        "Status": "Second execution complete with different result"
    })
    
    # Click Return to accept the re-executed result
    return_btn = modal.locator("#exec-return-btn")
    return_btn.click()
    
    # Modal should close
    page.wait_for_selector("#function-execution-modal", state="hidden", timeout=5000)
    
    # Handle any additional function calls that might occur
    print("Checking for additional function calls...")
    
    # Handle any additional function calls that might occur
    print("Checking for additional function calls after intercept...")
    
    for i in range(5):
        try:
            # Wait for modal to appear
            page.wait_for_selector("#function-execution-modal", state="visible", timeout=2000)
            print(f"Additional function call {i+1} appeared!")
            
            # IMMEDIATELY click the button - no waiting, no checking
            page.locator("#exec-execute-btn").click(force=True)
            print(f"Force clicked execute button for call {i+1}")
            
            # Wait for modal to close
            page.wait_for_selector("#function-execution-modal", state="hidden", timeout=5000) 
            print(f"Modal {i+1} closed")
        except Exception as e:
            print(f"No more modals after {i} calls. Details: {e}")
            break
    
    # Wait for generation to complete
    print("Waiting for all generation to complete...")
    page.wait_for_function(
        """() => {
            const btn = document.querySelector('#send-btn');
            return btn && !btn.hasAttribute('data-generating');
        }""",
        timeout=30000
    )
    
    # Check that result appears in chat
    page.wait_for_selector(".message.assistant .message-content", state="visible", timeout=15000)
    
    screenshot_with_markdown(page, "re_execution_final", {
        "Test": "Re-execution",
        "Status": "Re-executed result returned to chat"
    })


def test_parameter_editing(page: Page, serve_hacka_re, api_key):
    """Test editing parameters before execution"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Set up API and functions
    setup_api_and_functions(page, api_key)
    
    # Ensure YOLO is disabled for this test
    set_yolo_mode(page, False)
    
    # Clear chat
    clear_btn = page.locator("#clear-chat-btn")
    clear_btn.click()
    page.wait_for_timeout(500)
    
    # Send a message that will trigger function call
    chat_input = page.locator("#message-input")
    chat_input.fill("encrypt 'original' with key 'originalkey'")
    chat_input.press("Enter")
    
    # Wait for function execution modal
    modal = page.locator("#function-execution-modal")
    page.wait_for_selector("#function-execution-modal", state="visible", timeout=10000)
    
    # Edit parameters
    params_textarea = modal.locator("#exec-args-textarea")
    edited_params = json.dumps({"plaintext": "edited", "key": "editedkey"})
    params_textarea.fill(edited_params)
    
    screenshot_with_markdown(page, "parameters_edited", {
        "Test": "Parameter editing",
        "Status": "Parameters modified before execution"
    })
    
    # Execute with edited parameters
    execute_btn = modal.locator("#exec-execute-btn")
    execute_btn.click()
    
    # Modal should close
    page.wait_for_selector("#function-execution-modal", state="hidden", timeout=5000)
    
    # Handle any additional function modals that might appear
    handle_any_function_modal(page)
    
    # Wait for response generation to complete
    page.wait_for_timeout(2000)
    page.wait_for_function(
        """() => {
            const btn = document.querySelector('#send-btn');
            return btn && !btn.hasAttribute('data-generating');
        }""",
        timeout=30000
    )
    
    # Check for assistant response
    page.wait_for_selector(".message.assistant .message-content", state="visible", timeout=15000)
    
    screenshot_with_markdown(page, "edited_params_executed", {
        "Test": "Parameter editing",
        "Status": "Function executed with edited parameters"
    })


def test_restore_original_parameters(page: Page, serve_hacka_re, api_key):
    """Test restore button for parameters"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Set up API and functions
    setup_api_and_functions(page, api_key)
    
    # Ensure YOLO is disabled for this test
    set_yolo_mode(page, False)
    
    # Send a message that will trigger function call
    chat_input = page.locator("#message-input")
    chat_input.fill("encrypt 'restore test' with key 'testkey'")
    chat_input.press("Enter")
    
    # Wait for function execution modal
    modal = page.locator("#function-execution-modal")
    page.wait_for_selector("#function-execution-modal", state="visible", timeout=10000)
    
    # Get original parameters
    params_textarea = modal.locator("#exec-args-textarea")
    original_params = params_textarea.input_value()
    
    # Edit parameters
    params_textarea.fill('{"completely": "different"}')
    
    # Click Restore
    restore_btn = modal.locator("#exec-restore-btn")
    restore_btn.click()
    
    # Parameters should be restored
    restored_params = params_textarea.input_value()
    assert restored_params == original_params, "Parameters should be restored to original"
    
    screenshot_with_markdown(page, "parameters_restored", {
        "Test": "Restore parameters",
        "Status": "Parameters restored to original"
    })
    
    # Close modal
    block_btn = modal.locator("#exec-block-btn")
    block_btn.click()


def test_session_memory_allow(page: Page, serve_hacka_re, api_key):
    """Test session memory for allowed functions"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Set up API and functions
    setup_api_and_functions(page, api_key)
    
    # Ensure YOLO is disabled for this test
    set_yolo_mode(page, False)
    
    # Clear chat
    clear_btn = page.locator("#clear-chat-btn")
    clear_btn.click()
    page.wait_for_timeout(500)
    
    # First call - approve with remember
    chat_input = page.locator("#message-input")
    chat_input.fill("encrypt 'first' with key 'key1'")
    chat_input.press("Enter")
    
    # Wait for modal
    modal = page.locator("#function-execution-modal")
    page.wait_for_selector("#function-execution-modal", state="visible", timeout=10000)
    
    # Check "Remember for session"
    remember_checkbox = modal.locator("#exec-remember-choice")
    remember_checkbox.check()
    
    # Execute
    execute_btn = modal.locator("#exec-execute-btn")
    execute_btn.click()
    
    # Modal should close
    page.wait_for_selector("#function-execution-modal", state="hidden", timeout=5000)
    
    # Wait for generation to complete
    page.wait_for_function(
        """() => {
            const btn = document.querySelector('#send-btn');
            return btn && !btn.hasAttribute('data-generating');
        }""",
        timeout=30000
    )
    
    # Wait for first result
    page.wait_for_selector(".message.assistant .message-content", state="visible", timeout=15000)
    
    # Second call - should auto-execute without modal
    chat_input.fill("encrypt 'second' with key 'key2'")
    chat_input.press("Enter")
    
    # Should NOT show modal (auto-approved)
    page.wait_for_timeout(2000)
    modal_visible = page.locator("#function-execution-modal").is_visible()
    assert not modal_visible, "Modal should not appear for remembered function"
    
    # Wait for generation to complete
    page.wait_for_function(
        """() => {
            const btn = document.querySelector('#send-btn');
            return btn && !btn.hasAttribute('data-generating');
        }""",
        timeout=30000
    )
    
    # Should see result directly
    page.wait_for_selector(".message.assistant:last-child .message-content", state="visible", timeout=15000)
    
    screenshot_with_markdown(page, "session_memory_auto_approve", {
        "Test": "Session memory",
        "Status": "Function auto-approved based on session memory"
    })


def test_session_memory_block(page: Page, serve_hacka_re, api_key):
    """Test session memory for blocked functions"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Set up API and functions
    setup_api_and_functions(page, api_key)
    
    # Ensure YOLO is disabled for this test
    set_yolo_mode(page, False)
    
    # Clear session memory first
    page.evaluate("localStorage.removeItem('function_session_blocked')")
    page.evaluate("localStorage.removeItem('function_session_allowed')")
    
    # Clear chat
    clear_btn = page.locator("#clear-chat-btn")
    clear_btn.click()
    page.wait_for_timeout(500)
    
    # First call - block with remember
    chat_input = page.locator("#message-input")
    chat_input.fill("decrypt 'test' with key 'key1'")
    chat_input.press("Enter")
    
    # Wait for modal
    modal = page.locator("#function-execution-modal")
    page.wait_for_selector("#function-execution-modal", state="visible", timeout=10000)
    
    # Check "Remember for session"
    remember_checkbox = modal.locator("#exec-remember-choice")
    remember_checkbox.check()
    
    # Block
    block_btn = modal.locator("#exec-block-btn")
    block_btn.click()
    
    # Modal should close
    page.wait_for_selector("#function-execution-modal", state="hidden", timeout=5000)
    
    # Should see error
    page.wait_for_selector(".message.system", timeout=10000)
    
    # Second call - should auto-block without modal
    chat_input.fill("decrypt 'another' with key 'key2'")
    chat_input.press("Enter")
    
    # Should NOT show modal (auto-blocked)
    page.wait_for_timeout(2000)
    modal_visible = page.locator("#function-execution-modal").is_visible()
    assert not modal_visible, "Modal should not appear for remembered blocked function"
    
    # Should see error message
    page.wait_for_selector(".message.system:last-child", timeout=10000)
    last_system_msg = page.locator(".message.system").last
    expect(last_system_msg).to_contain_text("Error")
    
    screenshot_with_markdown(page, "session_memory_auto_block", {
        "Test": "Session memory block",
        "Status": "Function auto-blocked based on session memory"
    })


def test_block_result_in_intercept(page: Page, serve_hacka_re, api_key):
    """Test blocking result in intercept mode"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Set up API and functions
    setup_api_and_functions(page, api_key)
    
    # Ensure YOLO is disabled for this test
    set_yolo_mode(page, False)
    
    # Clear chat
    clear_btn = page.locator("#clear-chat-btn")
    clear_btn.click()
    page.wait_for_timeout(500)
    
    # Send a message
    chat_input = page.locator("#message-input")
    chat_input.fill("encrypt 'blockresult' with key 'key'")
    chat_input.press("Enter")
    
    # Wait for modal
    modal = page.locator("#function-execution-modal")
    page.wait_for_selector("#function-execution-modal", state="visible", timeout=10000)
    
    # Execute with intercept
    intercept_btn = modal.locator("#exec-intercept-btn")
    intercept_btn.click()
    
    # Wait for result tab
    page.wait_for_selector("#exec-result-tab", timeout=10000)
    
    # Block the result
    block_result_btn = modal.locator("#exec-block-result-btn")
    block_result_btn.click()
    
    # Modal should close
    page.wait_for_selector("#function-execution-modal", state="hidden", timeout=5000)
    
    # Should see error about blocked result
    page.wait_for_selector(".message.system", timeout=10000)
    system_msg = page.locator(".message.system").last
    expect(system_msg).to_contain_text("blocked")
    
    screenshot_with_markdown(page, "blocked_result", {
        "Test": "Block result",
        "Status": "Result blocked after execution"
    })


def test_yolo_mode_auto_execution(page: Page, serve_hacka_re, api_key):
    """Test YOLO mode automatic function execution"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Set up API and functions
    setup_api_and_functions(page, api_key)
    
    # Enable YOLO mode
    set_yolo_mode(page, True)
    
    # Clear chat
    clear_btn = page.locator("#clear-chat-btn")
    clear_btn.click()
    page.wait_for_timeout(500)
    
    # Send a message that triggers function call
    chat_input = page.locator("#message-input")
    chat_input.fill("encrypt 'yolo test' with key 'autoexec'")
    chat_input.press("Enter")
    
    # Should NOT see execution modal
    page.wait_for_timeout(2000)
    modal = page.locator("#function-execution-modal")
    assert not modal.is_visible(), "Execution modal should not appear in YOLO mode"
    
    # Wait for generation to complete
    page.wait_for_function(
        """() => {
            const btn = document.querySelector('#send-btn');
            return btn && !btn.hasAttribute('data-generating');
        }""",
        timeout=30000
    )
    
    # Should see function result directly
    page.wait_for_selector(".message.assistant .message-content", state="visible", timeout=15000)
    
    screenshot_with_markdown(page, "yolo_auto_execution", {
        "Test": "YOLO mode auto-execution",
        "Status": "Function executed without prompt",
        "Mode": "YOLO enabled"
    })


def test_yolo_mode_memory_allow(page: Page, serve_hacka_re, api_key):
    """Test YOLO mode with 'remember choice' for allowing"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Set up API and functions
    setup_api_and_functions(page, api_key)
    
    # Disable YOLO first
    set_yolo_mode(page, False)
    
    # Clear chat
    clear_btn = page.locator("#clear-chat-btn")
    clear_btn.click()
    page.wait_for_timeout(500)
    
    # Send first message
    chat_input = page.locator("#message-input")
    chat_input.fill("encrypt 'memory test' with key 'remember'")
    chat_input.press("Enter")
    
    # Wait for modal
    modal = page.locator("#function-execution-modal")
    page.wait_for_selector("#function-execution-modal", state="visible", timeout=10000)
    
    # Check "remember my choice"
    remember_checkbox = modal.locator("#exec-remember-choice")
    remember_checkbox.check()
    
    # Click Execute
    execute_btn = modal.locator("#exec-execute-btn")
    execute_btn.click()
    
    # Wait for result
    # Wait for generation to complete
    page.wait_for_function(
        """() => {
            const btn = document.querySelector('#send-btn');
            return btn && !btn.hasAttribute('data-generating');
        }""",
        timeout=30000
    )
    
    page.wait_for_selector(".message.assistant .message-content", state="visible", timeout=15000)
    
    # Send another message - should auto-execute
    chat_input.fill("encrypt 'another test' with key 'auto'")
    chat_input.press("Enter")
    
    # Should NOT see modal again
    page.wait_for_timeout(2000)
    assert not modal.is_visible(), "Modal should not appear after remembering allow choice"
    
    # Wait for generation to complete
    page.wait_for_function(
        """() => {
            const btn = document.querySelector('#send-btn');
            return btn && !btn.hasAttribute('data-generating');
        }""",
        timeout=30000
    )
    
    # Should see new result
    page.wait_for_selector(".message.assistant:nth-child(4) .message-content", state="visible", timeout=15000)
    
    screenshot_with_markdown(page, "yolo_memory_allow", {
        "Test": "YOLO memory - allow",
        "Status": "Function auto-allowed based on memory",
        "Behavior": "Modal not shown for remembered function"
    })


def test_yolo_mode_memory_block(page: Page, serve_hacka_re, api_key):
    """Test YOLO mode with 'remember choice' for blocking"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Set up API and functions
    setup_api_and_functions(page, api_key)
    
    # Disable YOLO first
    set_yolo_mode(page, False)
    
    # Clear chat
    clear_btn = page.locator("#clear-chat-btn")
    clear_btn.click()
    page.wait_for_timeout(500)
    
    # Send first message
    chat_input = page.locator("#message-input")
    chat_input.fill("decrypt 'block test' with key 'deny'")
    chat_input.press("Enter")
    
    # Wait for modal
    modal = page.locator("#function-execution-modal")
    page.wait_for_selector("#function-execution-modal", state="visible", timeout=10000)
    
    # Check "remember my choice"
    remember_checkbox = modal.locator("#exec-remember-choice")
    remember_checkbox.check()
    
    # Click Block
    block_btn = modal.locator("#exec-block-btn")
    block_btn.click()
    
    # Should see error message
    page.wait_for_selector(".system-message", timeout=10000)
    
    # Send another message - should auto-block
    chat_input.fill("decrypt 'another block' with key 'autoblocked'")
    chat_input.press("Enter")
    
    # Should NOT see modal again
    page.wait_for_timeout(2000)
    assert not modal.is_visible(), "Modal should not appear after remembering block choice"
    
    # Should see another error
    page.wait_for_selector(".system-message:last-child", timeout=10000)
    
    screenshot_with_markdown(page, "yolo_memory_block", {
        "Test": "YOLO memory - block",
        "Status": "Function auto-blocked based on memory",
        "Behavior": "Modal not shown, function blocked"
    })


def test_yolo_mode_toggle(page: Page, serve_hacka_re, api_key):
    """Test toggling YOLO mode during session"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Set up API and functions
    setup_api_and_functions(page, api_key)
    
    # Start with YOLO disabled
    set_yolo_mode(page, False)
    
    # Clear chat
    clear_btn = page.locator("#clear-chat-btn")
    clear_btn.click()
    page.wait_for_timeout(500)
    
    # Send message - should see modal
    chat_input = page.locator("#message-input")
    chat_input.fill("encrypt 'toggle test 1' with key 'modal'")
    chat_input.press("Enter")
    
    modal = page.locator("#function-execution-modal")
    page.wait_for_selector("#function-execution-modal", state="visible", timeout=10000)
    
    # Execute it
    execute_btn = modal.locator("#exec-execute-btn")
    execute_btn.click()
    
    # Wait for generation to complete
    page.wait_for_function(
        """() => {
            const btn = document.querySelector('#send-btn');
            return btn && !btn.hasAttribute('data-generating');
        }""",
        timeout=30000
    )
    
    page.wait_for_selector(".message.assistant .message-content", state="visible", timeout=15000)
    
    # Now enable YOLO mode
    set_yolo_mode(page, True)
    
    # Send another message - should NOT see modal
    chat_input.fill("encrypt 'toggle test 2' with key 'auto'")
    chat_input.press("Enter")
    
    page.wait_for_timeout(2000)
    assert not modal.is_visible(), "Modal should not appear when YOLO is enabled"
    
    # Wait for generation to complete
    page.wait_for_function(
        """() => {
            const btn = document.querySelector('#send-btn');
            return btn && !btn.hasAttribute('data-generating');
        }""",
        timeout=30000
    )
    
    # Should see result directly
    page.wait_for_selector(".message.assistant:nth-child(4) .message-content", state="visible", timeout=15000)
    
    screenshot_with_markdown(page, "yolo_mode_toggle", {
        "Test": "YOLO mode toggle",
        "Status": "Behavior changes based on YOLO setting",
        "Flow": "Manual approval -> Auto execution"
    })