"""
Test Function Execution Modal
Tests the human-in-the-loop function execution approval system
"""

import json
import time
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown


def disable_yolo_mode(page: Page):
    """Helper to disable YOLO mode through settings"""
    settings_btn = page.locator("#settings-btn")
    settings_btn.click()
    page.wait_for_selector("#settings-modal.active", timeout=5000)
    
    yolo_checkbox = page.locator("#yolo-mode")
    if yolo_checkbox.is_checked():
        yolo_checkbox.click()
    
    # Close settings
    close_settings = page.locator("#close-settings-modal")
    close_settings.click()
    page.wait_for_selector("#settings-modal.active", state="hidden", timeout=5000)


def test_basic_function_approval(page: Page, serve_hacka_re, api_key):
    """Test basic function approval flow"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Configure API key
    page.evaluate(f"localStorage.setItem('openai_api_key', '{api_key}')")
    page.reload()
    dismiss_welcome_modal(page)
    
    # Open settings and disable YOLO mode to ensure we get prompts
    settings_btn = page.locator("#settings-btn")
    settings_btn.click()
    page.wait_for_selector("#settings-modal.active", timeout=5000)
    
    yolo_checkbox = page.locator("#yolo-mode")
    if yolo_checkbox.is_checked():
        yolo_checkbox.click()
    
    # Close settings
    close_settings = page.locator("#close-settings-modal")
    close_settings.click()
    page.wait_for_selector("#settings-modal.active", state="hidden", timeout=5000)
    
    # Send a message that will trigger function call
    chat_input = page.locator("#chat-input")
    chat_input.fill("encrypt 'test' with key 'secret'")
    chat_input.press("Enter")
    
    # Wait for function execution modal
    modal = page.locator("#function-execution-modal")
    page.wait_for_selector("#function-execution-modal.active", timeout=10000)
    
    # Verify modal content
    expect(modal.locator("h3")).to_contain_text("Function Execution Request")
    expect(modal.locator("#exec-function-name")).to_contain_text("rc4_encrypt")
    
    # Check that parameters are shown
    params_textarea = modal.locator("#exec-args-textarea")
    expect(params_textarea).to_be_visible()
    params_text = params_textarea.input_value()
    assert "test" in params_text
    assert "secret" in params_text
    
    screenshot_with_markdown(page, "function_approval_modal", {
        "Test": "Basic function approval",
        "Status": "Modal shown with parameters"
    })
    
    # Click Execute
    execute_btn = modal.locator("#exec-execute-btn")
    execute_btn.click()
    
    # Modal should close
    page.wait_for_selector("#function-execution-modal.active", state="hidden", timeout=5000)
    
    # Wait for function result in chat
    page.wait_for_selector(".assistant-message .function-result-icon", timeout=10000)
    
    screenshot_with_markdown(page, "function_approved_result", {
        "Test": "Basic function approval",
        "Status": "Function executed and result shown"
    })


def test_function_block(page: Page, serve_hacka_re, api_key):
    """Test blocking function execution"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Configure API key
    page.evaluate(f"localStorage.setItem('openai_api_key', '{api_key}')")
    page.reload()
    dismiss_welcome_modal(page)
    
    # Disable YOLO mode
    yolo_checkbox = page.locator("#yolo-mode-checkbox")
    if yolo_checkbox.is_checked():
        yolo_checkbox.click()
    
    # Clear chat first
    clear_btn = page.locator("#clear-chat-btn")
    clear_btn.click()
    page.wait_for_timeout(500)
    
    # Send a message that will trigger function call
    chat_input = page.locator("#chat-input")
    chat_input.fill("encrypt 'blocked' with key 'test'")
    chat_input.press("Enter")
    
    # Wait for function execution modal
    modal = page.locator("#function-execution-modal")
    page.wait_for_selector("#function-execution-modal.active", timeout=10000)
    
    # Click Block
    block_btn = modal.locator("#exec-block-btn")
    block_btn.click()
    
    # Modal should close
    page.wait_for_selector("#function-execution-modal.active", state="hidden", timeout=5000)
    
    # Check that error message appears in chat
    page.wait_for_selector(".system-message", timeout=10000)
    system_msg = page.locator(".system-message").last
    expect(system_msg).to_contain_text("Error executing function")
    
    screenshot_with_markdown(page, "function_blocked", {
        "Test": "Function block",
        "Status": "Function blocked and error shown"
    })


def test_execute_with_intercept(page: Page, serve_hacka_re, api_key):
    """Test execute with result interception"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Configure API key
    page.evaluate(f"localStorage.setItem('openai_api_key', '{api_key}')")
    page.reload()
    dismiss_welcome_modal(page)
    
    # Disable YOLO mode
    yolo_checkbox = page.locator("#yolo-mode-checkbox")
    if yolo_checkbox.is_checked():
        yolo_checkbox.click()
    
    # Clear chat
    clear_btn = page.locator("#clear-chat-btn")
    clear_btn.click()
    page.wait_for_timeout(500)
    
    # Send a message that will trigger function call
    chat_input = page.locator("#chat-input")
    chat_input.fill("encrypt 'intercept' with key 'key123'")
    chat_input.press("Enter")
    
    # Wait for function execution modal
    modal = page.locator("#function-execution-modal")
    page.wait_for_selector("#function-execution-modal.active", timeout=10000)
    
    # Click Execute + Intercept
    intercept_btn = modal.locator("#exec-intercept-btn")
    intercept_btn.click()
    
    # Wait for result tab to appear
    page.wait_for_selector("#exec-result-tab", timeout=10000)
    
    # Result tab should be active
    result_tab = modal.locator("#exec-result-tab")
    expect(result_tab).to_have_class("active")
    
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
    page.wait_for_selector("#function-execution-modal.active", state="hidden", timeout=5000)
    
    # Check that modified result appears in chat
    page.wait_for_selector(".assistant-message .function-result-icon", timeout=10000)
    
    screenshot_with_markdown(page, "intercept_modified_result", {
        "Test": "Execute with intercept",
        "Status": "Modified result returned"
    })


def test_intercept_with_re_execution(page: Page, serve_hacka_re, api_key):
    """Test re-execution within intercept mode"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Configure API key
    page.evaluate(f"localStorage.setItem('openai_api_key', '{api_key}')")
    page.reload()
    dismiss_welcome_modal(page)
    
    # Disable YOLO mode
    yolo_checkbox = page.locator("#yolo-mode-checkbox")
    if yolo_checkbox.is_checked():
        yolo_checkbox.click()
    
    # Clear chat
    clear_btn = page.locator("#clear-chat-btn")
    clear_btn.click()
    page.wait_for_timeout(500)
    
    # Send a message that will trigger function call
    chat_input = page.locator("#chat-input")
    chat_input.fill("encrypt 'reexecute' with key 'firstkey'")
    chat_input.press("Enter")
    
    # Wait for function execution modal
    modal = page.locator("#function-execution-modal")
    page.wait_for_selector("#function-execution-modal.active", timeout=10000)
    
    # Click Execute + Intercept
    intercept_btn = modal.locator("#exec-intercept-btn")
    intercept_btn.click()
    
    # Wait for result tab to appear
    page.wait_for_selector("#exec-result-tab.active", timeout=10000)
    
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
    
    # Wait for execution to complete
    page.wait_for_timeout(2000)
    
    # Should switch to result tab automatically
    expect(modal.locator("#exec-result-tab")).to_have_class("active")
    
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
    page.wait_for_selector("#function-execution-modal.active", state="hidden", timeout=5000)
    
    # Check that result appears in chat
    page.wait_for_selector(".assistant-message .function-result-icon", timeout=10000)
    
    screenshot_with_markdown(page, "re_execution_final", {
        "Test": "Re-execution",
        "Status": "Re-executed result returned to chat"
    })


def test_parameter_editing(page: Page, serve_hacka_re, api_key):
    """Test editing parameters before execution"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Configure API key
    page.evaluate(f"localStorage.setItem('openai_api_key', '{api_key}')")
    page.reload()
    dismiss_welcome_modal(page)
    
    # Disable YOLO mode
    yolo_checkbox = page.locator("#yolo-mode-checkbox")
    if yolo_checkbox.is_checked():
        yolo_checkbox.click()
    
    # Clear chat
    clear_btn = page.locator("#clear-chat-btn")
    clear_btn.click()
    page.wait_for_timeout(500)
    
    # Send a message that will trigger function call
    chat_input = page.locator("#chat-input")
    chat_input.fill("encrypt 'original' with key 'originalkey'")
    chat_input.press("Enter")
    
    # Wait for function execution modal
    modal = page.locator("#function-execution-modal")
    page.wait_for_selector("#function-execution-modal.active", timeout=10000)
    
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
    page.wait_for_selector("#function-execution-modal.active", state="hidden", timeout=5000)
    
    # Function should execute with edited parameters
    page.wait_for_selector(".assistant-message .function-result-icon", timeout=10000)
    
    screenshot_with_markdown(page, "edited_params_executed", {
        "Test": "Parameter editing",
        "Status": "Function executed with edited parameters"
    })


def test_restore_original_parameters(page: Page, serve_hacka_re, api_key):
    """Test restore button for parameters"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Configure API key
    page.evaluate(f"localStorage.setItem('openai_api_key', '{api_key}')")
    page.reload()
    dismiss_welcome_modal(page)
    
    # Disable YOLO mode
    yolo_checkbox = page.locator("#yolo-mode-checkbox")
    if yolo_checkbox.is_checked():
        yolo_checkbox.click()
    
    # Send a message that will trigger function call
    chat_input = page.locator("#chat-input")
    chat_input.fill("encrypt 'restore test' with key 'testkey'")
    chat_input.press("Enter")
    
    # Wait for function execution modal
    modal = page.locator("#function-execution-modal")
    page.wait_for_selector("#function-execution-modal.active", timeout=10000)
    
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
    
    # Configure API key
    page.evaluate(f"localStorage.setItem('openai_api_key', '{api_key}')")
    page.reload()
    dismiss_welcome_modal(page)
    
    # Disable YOLO mode
    yolo_checkbox = page.locator("#yolo-mode-checkbox")
    if yolo_checkbox.is_checked():
        yolo_checkbox.click()
    
    # Clear chat
    clear_btn = page.locator("#clear-chat-btn")
    clear_btn.click()
    page.wait_for_timeout(500)
    
    # First call - approve with remember
    chat_input = page.locator("#chat-input")
    chat_input.fill("encrypt 'first' with key 'key1'")
    chat_input.press("Enter")
    
    # Wait for modal
    modal = page.locator("#function-execution-modal")
    page.wait_for_selector("#function-execution-modal.active", timeout=10000)
    
    # Check "Remember for session"
    remember_checkbox = modal.locator("#exec-remember-choice")
    remember_checkbox.check()
    
    # Execute
    execute_btn = modal.locator("#exec-execute-btn")
    execute_btn.click()
    
    # Modal should close
    page.wait_for_selector("#function-execution-modal.active", state="hidden", timeout=5000)
    
    # Wait for first result
    page.wait_for_selector(".assistant-message .function-result-icon", timeout=10000)
    
    # Second call - should auto-execute without modal
    chat_input.fill("encrypt 'second' with key 'key2'")
    chat_input.press("Enter")
    
    # Should NOT show modal (auto-approved)
    page.wait_for_timeout(2000)
    modal_visible = page.locator("#function-execution-modal.active").is_visible()
    assert not modal_visible, "Modal should not appear for remembered function"
    
    # Should see result directly
    page.wait_for_selector(".assistant-message:last-child .function-result-icon", timeout=10000)
    
    screenshot_with_markdown(page, "session_memory_auto_approve", {
        "Test": "Session memory",
        "Status": "Function auto-approved based on session memory"
    })


def test_session_memory_block(page: Page, serve_hacka_re, api_key):
    """Test session memory for blocked functions"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Configure API key
    page.evaluate(f"localStorage.setItem('openai_api_key', '{api_key}')")
    page.reload()
    dismiss_welcome_modal(page)
    
    # Disable YOLO mode
    yolo_checkbox = page.locator("#yolo-mode-checkbox")
    if yolo_checkbox.is_checked():
        yolo_checkbox.click()
    
    # Clear session memory first
    page.evaluate("localStorage.removeItem('function_session_blocked')")
    page.evaluate("localStorage.removeItem('function_session_allowed')")
    
    # Clear chat
    clear_btn = page.locator("#clear-chat-btn")
    clear_btn.click()
    page.wait_for_timeout(500)
    
    # First call - block with remember
    chat_input = page.locator("#chat-input")
    chat_input.fill("decrypt 'test' with key 'key1'")
    chat_input.press("Enter")
    
    # Wait for modal
    modal = page.locator("#function-execution-modal")
    page.wait_for_selector("#function-execution-modal.active", timeout=10000)
    
    # Check "Remember for session"
    remember_checkbox = modal.locator("#exec-remember-choice")
    remember_checkbox.check()
    
    # Block
    block_btn = modal.locator("#exec-block-btn")
    block_btn.click()
    
    # Modal should close
    page.wait_for_selector("#function-execution-modal.active", state="hidden", timeout=5000)
    
    # Should see error
    page.wait_for_selector(".system-message", timeout=10000)
    
    # Second call - should auto-block without modal
    chat_input.fill("decrypt 'another' with key 'key2'")
    chat_input.press("Enter")
    
    # Should NOT show modal (auto-blocked)
    page.wait_for_timeout(2000)
    modal_visible = page.locator("#function-execution-modal.active").is_visible()
    assert not modal_visible, "Modal should not appear for remembered blocked function"
    
    # Should see error message
    page.wait_for_selector(".system-message:last-child", timeout=10000)
    last_system_msg = page.locator(".system-message").last
    expect(last_system_msg).to_contain_text("Error")
    
    screenshot_with_markdown(page, "session_memory_auto_block", {
        "Test": "Session memory block",
        "Status": "Function auto-blocked based on session memory"
    })


def test_block_result_in_intercept(page: Page, serve_hacka_re, api_key):
    """Test blocking result in intercept mode"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Configure API key
    page.evaluate(f"localStorage.setItem('openai_api_key', '{api_key}')")
    page.reload()
    dismiss_welcome_modal(page)
    
    # Disable YOLO mode
    yolo_checkbox = page.locator("#yolo-mode-checkbox")
    if yolo_checkbox.is_checked():
        yolo_checkbox.click()
    
    # Clear chat
    clear_btn = page.locator("#clear-chat-btn")
    clear_btn.click()
    page.wait_for_timeout(500)
    
    # Send a message
    chat_input = page.locator("#chat-input")
    chat_input.fill("encrypt 'blockresult' with key 'key'")
    chat_input.press("Enter")
    
    # Wait for modal
    modal = page.locator("#function-execution-modal")
    page.wait_for_selector("#function-execution-modal.active", timeout=10000)
    
    # Execute with intercept
    intercept_btn = modal.locator("#exec-intercept-btn")
    intercept_btn.click()
    
    # Wait for result tab
    page.wait_for_selector("#exec-result-tab.active", timeout=10000)
    
    # Block the result
    block_result_btn = modal.locator("#exec-block-result-btn")
    block_result_btn.click()
    
    # Modal should close
    page.wait_for_selector("#function-execution-modal.active", state="hidden", timeout=5000)
    
    # Should see error about blocked result
    page.wait_for_selector(".system-message", timeout=10000)
    system_msg = page.locator(".system-message").last
    expect(system_msg).to_contain_text("blocked")
    
    screenshot_with_markdown(page, "blocked_result", {
        "Test": "Block result",
        "Status": "Result blocked after execution"
    })