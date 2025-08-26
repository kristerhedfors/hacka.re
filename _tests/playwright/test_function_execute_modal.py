"""
Test function execute modal functionality
"""
import pytest
from test_utils import dismiss_welcome_modal, screenshot_with_markdown
from playwright.sync_api import Page, expect
import time


def test_function_execute_modal_basic(page: Page, serve_hacka_re):
    """Test basic function execute modal functionality"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Close any open modals first
    page.evaluate("""
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
    """)
    
    page.wait_for_timeout(500)
    
    # Open function calling modal
    function_btn = page.locator("#function-btn")
    function_btn.click()
    
    # Wait for modal to open
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_have_class("modal active")
    
    # Clear existing code and add test function
    function_code = page.locator("#function-code")
    function_code.fill("""/**
 * Test function for execution
 * @description A simple test function that adds two numbers
 * @param {number} a - First number
 * @param {number} b - Second number  
 * @returns {Object} Result object with sum
 * @callable
 */
function test_add(a, b) {
    return {
        result: a + b,
        message: "Addition completed successfully",
        timestamp: new Date().toISOString()
    };
}""")
    
    # Trigger auto-population of function name
    page.evaluate("document.getElementById('function-code').dispatchEvent(new Event('input'))")
    page.wait_for_timeout(500)
    
    screenshot_with_markdown(page, "function_code_entered", {
        "Status": "Function code entered",
        "Component": "Function Calling Modal",
        "Function": "test_add with two parameters"
    })
    
    # First save the function by clicking "Save Functions"
    save_btn = page.get_by_role("button", name="Save Functions")
    save_btn.click()
    
    # Wait for function to be saved (validation result should appear)
    page.wait_for_timeout(1000)
    
    screenshot_with_markdown(page, "function_saved", {
        "Status": "Function saved",
        "Component": "Function Calling Modal"
    })
    
    # Click Execute button
    execute_btn = page.locator("#function-execute-btn")
    expect(execute_btn).to_be_visible()
    execute_btn.click()
    
    # Wait for execute modal to open
    execute_modal = page.locator("#function-execute-modal")
    expect(execute_modal).to_have_class("modal active")
    
    # Verify function info is displayed
    function_name = page.locator("#function-execute-function-name")
    expect(function_name).to_contain_text("test_add")
    
    function_desc = page.locator("#function-execute-function-description")
    expect(function_desc).to_contain_text("A simple test function that adds two numbers")
    
    screenshot_with_markdown(page, "execute_modal_opened", {
        "Status": "Execute modal opened",
        "Function": "test_add",
        "Parameters": "Should show 2 parameter inputs"
    })
    
    # Fill in parameters
    param_a = page.locator("#param-a")
    param_b = page.locator("#param-b")
    
    expect(param_a).to_be_visible()
    expect(param_b).to_be_visible()
    
    param_a.fill("5")
    param_b.fill("3")
    
    screenshot_with_markdown(page, "parameters_filled", {
        "Status": "Parameters filled",
        "Parameter a": "5",
        "Parameter b": "3"
    })
    
    # Execute the function
    run_btn = page.locator("#function-execute-run-btn")
    expect(run_btn).to_contain_text("Execute")
    run_btn.click()
    
    # Wait for execution to complete or error to appear
    try:
        page.wait_for_selector("#function-execute-output-section", state="visible", timeout=10000)
    except:
        # Check if there's an error instead
        error_section = page.locator("#function-execute-error-section")
        if error_section.is_visible():
            error_msg = page.locator("#function-execute-error-message").text_content()
            screenshot_with_markdown(page, "execution_error", {
                "Status": "Execution failed with error",
                "Error": error_msg,
                "Component": "Execute Modal"
            })
            # Print the error for debugging
            print(f"Function execution error: {error_msg}")
        else:
            screenshot_with_markdown(page, "execution_timeout", {
                "Status": "Execution timed out",
                "Modal State": "Execute modal visible" if page.locator("#function-execute-modal").is_visible() else "Execute modal not visible",
                "Button State": page.locator("#function-execute-run-btn").text_content()
            })
        raise
    
    # Verify output is displayed
    output_section = page.locator("#function-execute-output-section")
    expect(output_section).to_be_visible()
    
    output_content = page.locator("#function-execute-output-content")
    output_text = output_content.text_content()
    
    screenshot_with_markdown(page, "execution_completed", {
        "Status": "Function executed successfully",
        "Output": output_text[:200] + "..." if len(output_text) > 200 else output_text,
        "Timing": page.locator("#function-execute-timing").text_content()
    })
    
    # Verify the output contains expected result
    assert "result" in output_text
    assert "8" in output_text  # 5 + 3 = 8
    assert "Addition completed successfully" in output_text
    
    # Test output format toggle
    toggle_btn = page.locator("#function-execute-output-toggle")
    expect(toggle_btn).to_contain_text("JSON")
    toggle_btn.click()
    expect(toggle_btn).to_contain_text("Raw")
    
    # Close execute modal
    close_btn = page.locator("#close-function-execute-modal")
    close_btn.click()
    
    # Verify modal is closed
    expect(execute_modal).not_to_have_class("modal active")


def test_function_execute_modal_validation_errors(page: Page, serve_hacka_re):
    """Test function execute modal with validation errors"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Open function calling modal
    function_btn = page.locator("#function-btn")
    function_btn.click()
    
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_have_class("modal active")
    
    # Add function with required parameter
    function_code = page.locator("#function-code")
    function_code.fill("""/**
 * Test function with required parameter
 * @param {string} message - Required message parameter
 * @returns {Object} Result object
 * @callable
 */
function test_required_param(message) {
    if (!message) {
        throw new Error("Message parameter is required");
    }
    return {
        echo: message,
        length: message.length
    };
}""")
    
    page.evaluate("document.getElementById('function-code').dispatchEvent(new Event('input'))")
    page.wait_for_timeout(500)
    
    # Click Execute button
    execute_btn = page.locator("#function-execute-btn")
    execute_btn.click()
    
    execute_modal = page.locator("#function-execute-modal")
    expect(execute_modal).to_have_class("modal active")
    
    # Try to execute without filling required parameter
    run_btn = page.locator("#function-execute-run-btn")
    run_btn.click()
    
    # Should show error for required parameter
    page.wait_for_selector("#function-execute-error-section", state="visible", timeout=5000)
    
    error_section = page.locator("#function-execute-error-section")
    expect(error_section).to_be_visible()
    
    error_message = page.locator("#function-execute-error-message")
    error_text = error_message.text_content()
    
    screenshot_with_markdown(page, "validation_error", {
        "Status": "Validation error shown",
        "Error": error_text,
        "Component": "Execute Modal"
    })
    
    assert "required" in error_text.lower()


def test_function_execute_modal_no_parameters(page: Page, serve_hacka_re):
    """Test function execute modal with function that has no parameters"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Open function calling modal
    function_btn = page.locator("#function-btn")
    function_btn.click()
    
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_have_class("modal active")
    
    # Add function with no parameters
    function_code = page.locator("#function-code")
    function_code.fill("""/**
 * Test function with no parameters
 * @description Returns current timestamp
 * @returns {Object} Result with timestamp
 * @callable
 */
function get_timestamp() {
    return {
        timestamp: Date.now(),
        iso: new Date().toISOString(),
        message: "Timestamp generated successfully"
    };
}""")
    
    page.evaluate("document.getElementById('function-code').dispatchEvent(new Event('input'))")
    page.wait_for_timeout(500)
    
    # Click Execute button
    execute_btn = page.locator("#function-execute-btn")
    execute_btn.click()
    
    execute_modal = page.locator("#function-execute-modal")
    expect(execute_modal).to_have_class("modal active")
    
    # Should show "no parameters" message
    no_params_msg = page.locator(".function-execute-no-params")
    expect(no_params_msg).to_be_visible()
    expect(no_params_msg).to_contain_text("This function has no parameters")
    
    # Execute the function
    run_btn = page.locator("#function-execute-run-btn")
    run_btn.click()
    
    # Wait for execution to complete
    page.wait_for_selector("#function-execute-output-section", state="visible", timeout=10000)
    
    output_section = page.locator("#function-execute-output-section")
    expect(output_section).to_be_visible()
    
    output_content = page.locator("#function-execute-output-content")
    output_text = output_content.text_content()
    
    screenshot_with_markdown(page, "no_params_execution", {
        "Status": "Function with no parameters executed",
        "Output": output_text[:200] + "..." if len(output_text) > 200 else output_text
    })
    
    # Verify output contains timestamp data
    assert "timestamp" in output_text
    assert "iso" in output_text
    assert "Timestamp generated successfully" in output_text