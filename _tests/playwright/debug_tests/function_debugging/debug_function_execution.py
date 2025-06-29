"""
Debug Function Execution Test

This test creates a simple function and logs how it's called to understand the parameter passing pattern.
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

def test_debug_function_parameter_passing(page: Page, serve_hacka_re, api_key):
    """Debug how function parameters are passed to understand the args structure."""
    # Set up enhanced console logging to capture all messages
    console_messages = []
    
    def handle_console(msg):
        console_messages.append(f"[{msg.type}] {msg.text}")
        print(f"Console [{msg.type}]: {msg.text}")
    
    page.on("console", handle_console)
    setup_console_logging(page)
    
    # Navigate to the page
    base_url = serve_hacka_re if serve_hacka_re.endswith('/') else f"{serve_hacka_re}/"
    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_load_state("networkidle", timeout=5000)
    
    # Dismiss modals
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Configure API key and model
    configure_api_key_and_model(page, api_key)
    enable_tool_calling_and_function_tools(page)
    
    # Add a debug function that logs the parameter structure
    page.locator("#function-btn").click()
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible(timeout=5000)
    
    # Fill in the debug function
    function_code = page.locator("#function-code")
    function_code.fill("""/**
 * @description Debug function to understand parameter passing
 * @param {string} message - Test message
 * @param {number} count - Test count
 * @tool This function will be exposed to the LLM
 */
function debug_params(message, count) {
    console.log('=== DEBUG FUNCTION CALLED ===');
    console.log('Function arguments object:', arguments);
    console.log('Arguments length:', arguments.length);
    console.log('arguments[0]:', arguments[0]);
    console.log('arguments[1]:', arguments[1]);
    console.log('message parameter:', message);
    console.log('count parameter:', count);
    console.log('typeof message:', typeof message);
    console.log('typeof count:', typeof count);
    
    // Check if args is defined in the execution context
    try {
        console.log('args variable:', typeof args !== 'undefined' ? args : 'undefined');
        if (typeof args !== 'undefined') {
            console.log('args keys:', Object.keys(args));
            console.log('args.message:', args.message);
            console.log('args.count:', args.count);
            console.log('args["message"]:', args["message"]);
            console.log('args["count"]:', args["count"]);
        }
    } catch (e) {
        console.log('Error accessing args:', e.message);
    }
    
    console.log('=== END DEBUG ===');
    
    return {
        receivedMessage: message,
        receivedCount: count,
        messageType: typeof message,
        countType: typeof count,
        argumentsLength: arguments.length,
        argsAvailable: typeof args !== 'undefined',
        timestamp: new Date().toISOString()
    };
}""")
    
    # Validate and submit the function
    page.locator("#function-validate-btn").click()
    validation_result = page.locator("#function-validation-result")
    expect(validation_result).to_be_visible()
    expect(validation_result).to_contain_text("Library validated successfully")
    
    page.locator("#function-editor-form button[type='submit']").click()
    
    # Verify function was added
    function_list = page.locator("#function-list")
    expect(function_list.locator(".function-item-name:has-text('debug_params')")).to_be_visible()
    
    # Close the function modal
    page.locator("#close-function-modal").click()
    expect(function_modal).not_to_be_visible()
    
    # Test the function through chat
    message_input = page.locator("#message-input")
    test_message = 'Call the debug_params function with message "hello world" and count 42'
    message_input.fill(test_message)
    
    # Send the message
    send_button = page.locator("#send-btn")
    send_button.click()
    
    # Wait for the assistant response
    try:
        page.wait_for_selector(".message.assistant .message-content", 
                              state="visible", 
                              timeout=15000)
        print("Assistant response appeared")
        
        # Get the assistant message
        assistant_message = page.locator(".message.assistant .message-content").last
        assistant_text = assistant_message.text_content()
        print(f"Assistant response: {assistant_text}")
        
        # Print all captured console messages
        print("\n=== CAPTURED CONSOLE MESSAGES ===")
        for msg in console_messages:
            print(f"  {msg}")
        print("=== END CONSOLE MESSAGES ===\n")
        
        # Take a screenshot
        screenshot_with_markdown(page, "debug_function_execution",
                               {"Component": "Function Execution Debug", "Status": "Complete"})
        
    except Exception as e:
        print(f"Error waiting for assistant response: {e}")
        screenshot_with_markdown(page, "debug_function_timeout",
                               {"Error": str(e), "Component": "Function Execution Debug"})
    
    # Clean up
    page.locator("#function-btn").click()
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible(timeout=5000)
    
    # Handle the confirmation dialog for deletion
    page.on("dialog", lambda dialog: dialog.accept())
    
    # Delete the function
    function_list = page.locator("#function-list")
    if function_list.locator(".function-item-delete").count() > 0:
        function_list.locator(".function-item-delete").first.click()
    
    # Close the function modal
    page.locator("#close-function-modal").click()
    expect(function_modal).not_to_be_visible()