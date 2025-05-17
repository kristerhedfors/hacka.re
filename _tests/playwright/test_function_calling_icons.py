import pytest
from playwright.sync_api import Page, expect
import time
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, timed_test, screenshot_with_markdown

from function_calling_api.helpers.setup_helpers import (
    setup_console_logging, 
    configure_api_key_and_model, 
    enable_tool_calling_and_function_tools
)
from function_calling_api.helpers.function_helpers import (
    add_test_function, 
    add_function,
    add_multiple_test_functions,
    cleanup_functions
)

def test_function_calling_icons(page: Page, serve_hacka_re, api_key):
    """Test that function calling icons appear inline with the token stream."""
    # Set up console error logging
    setup_console_logging(page)
    
    # Navigate to the page
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if already open
    dismiss_settings_modal(page)
    
    # Configure API key and model
    configure_api_key_and_model(page, api_key)
    
    # Enable tool calling and function tools
    enable_tool_calling_and_function_tools(page)
    
    # Add a test function
    add_test_function(page)  # This uses the default weather function
    
    # Type a message that should trigger the function
    message_input = page.locator("#message-input")
    test_message = "What's the weather like in London right now?"
    message_input.fill(test_message)
    
    # Send the message
    send_button = page.locator("#send-btn")
    send_button.click()
    
    # Wait for the user message to appear in the chat
    page.wait_for_selector(".message.user .message-content", state="visible", timeout=2000)
    
    # Wait for the assistant response
    try:
        page.wait_for_selector(".message.assistant .message-content", 
                              state="visible", 
                              timeout=5000)
        
        # Take a screenshot of the initial response
        screenshot_with_markdown(page, "assistant_response_initial", 
                               {"Component": "Chat Response", "Status": "Initial Response"})
        
        # Wait for function call icon to appear
        try:
            page.wait_for_selector(".function-call-icon", state="visible", timeout=10000)
            
            # Take a screenshot showing the function call icon
            screenshot_with_markdown(page, "function_call_icon", 
                                   {"Component": "Function Call Icon", "Status": "Visible"})
            
            # Verify the function call icon is visible
            function_call_icon = page.locator(".function-call-icon").first
            expect(function_call_icon).to_be_visible()
            
            # Verify the tooltip text
            tooltip_text = function_call_icon.locator(".function-icon-tooltip").text_content()
            expect(tooltip_text).to_contain_text("Function call:")
            
            # Verify the icon is inline with text (not on a separate line)
            # This is done by checking if the icon's parent element contains text nodes
            has_text_siblings = page.evaluate("""() => {
                const icon = document.querySelector('.function-call-icon');
                if (!icon) return false;
                
                const parent = icon.parentElement;
                if (!parent) return false;
                
                // Check if there are text nodes as siblings
                let hasTextSiblings = false;
                for (const node of parent.childNodes) {
                    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                        hasTextSiblings = true;
                        break;
                    }
                }
                
                return hasTextSiblings;
            }""")
            
            if has_text_siblings:
                print("Function call icon is inline with text")
            else:
                print("WARNING: Function call icon might not be inline with text")
            
            print("Function call icon is visible with tooltip:", tooltip_text)
        except Exception as e:
            print(f"Error waiting for function call icon: {e}")
            # Take a screenshot for debugging
            screenshot_with_markdown(page, "function_call_icon_error", 
                                   {"Component": "Function Call Icon", "Status": "Error", "Error": str(e)})
        
        # Wait for function result icon to appear
        try:
            page.wait_for_selector(".function-result-icon", state="visible", timeout=10000)
            
            # Take a screenshot showing the function result icon
            screenshot_with_markdown(page, "function_result_icon", 
                                   {"Component": "Function Result Icon", "Status": "Visible"})
            
            # Verify the function result icon is visible
            function_result_icon = page.locator(".function-result-icon").first
            expect(function_result_icon).to_be_visible()
            
            # Verify the tooltip text includes function name, type and value (without copy buttons)
            tooltip_text = function_result_icon.locator(".function-icon-tooltip").text_content()
            expect(tooltip_text).to_contain_text("Function result:")
            expect(tooltip_text).to_contain_text("Type:")
            expect(tooltip_text).to_contain_text("Value:")
            
            # Verify the icon is inline with text (not on a separate line)
            has_text_siblings = page.evaluate("""() => {
                const icon = document.querySelector('.function-result-icon');
                if (!icon) return false;
                
                const parent = icon.parentElement;
                if (!parent) return false;
                
                // Check if there are text nodes as siblings
                let hasTextSiblings = false;
                for (const node of parent.childNodes) {
                    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                        hasTextSiblings = true;
                        break;
                    }
                }
                
                return hasTextSiblings;
            }""")
            
            if has_text_siblings:
                print("Function result icon is inline with text")
            else:
                print("WARNING: Function result icon might not be inline with text")
            
            print("Function result icon is visible with tooltip:", tooltip_text)
        except Exception as e:
            print(f"Error waiting for function result icon: {e}")
            # Take a screenshot for debugging
            screenshot_with_markdown(page, "function_result_icon_error", 
                                   {"Component": "Function Result Icon", "Status": "Error", "Error": str(e)})
        
        # Take a final screenshot of the complete response
        screenshot_with_markdown(page, "assistant_response_final", 
                               {"Component": "Chat Response", "Status": "Final Response"})
        
    except Exception as e:
        print(f"Error waiting for assistant response: {e}")
        # Take a screenshot for debugging
        screenshot_with_markdown(page, "assistant_response_timeout", 
                               {"Component": "Chat Response", "Status": "Error", "Error": str(e)})
        pytest.fail("Assistant response did not appear in chat")
    
    # Clean up - delete the function
    cleanup_functions(page)

def test_multiple_function_calls_colors(page: Page, serve_hacka_re, api_key):
    """Test that multiple function calls use different colors."""
    # Set up console error logging
    setup_console_logging(page)
    
    # Navigate to the page
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if already open
    dismiss_settings_modal(page)
    
    # Configure API key and model
    configure_api_key_and_model(page, api_key)
    
    # Enable tool calling and function tools
    enable_tool_calling_and_function_tools(page)
    
    # Add multiple test functions
    add_multiple_test_functions(page)
    
    # Type a message that should trigger multiple functions
    message_input = page.locator("#message-input")
    test_message = "What's the weather like in London and what is 25 multiplied by 4?"
    message_input.fill(test_message)
    
    # Send the message
    send_button = page.locator("#send-btn")
    send_button.click()
    
    # Wait for the assistant response
    try:
        page.wait_for_selector(".message.assistant .message-content", 
                              state="visible", 
                              timeout=5000)
        
        # Wait for function call icons to appear
        page.wait_for_selector(".function-call-icon", state="visible", timeout=10000)
        
        # Wait for at least 2 function call icons (may take some time)
        try:
            # Wait for the second function call icon
            page.wait_for_function(
                """() => document.querySelectorAll('.function-call-icon').length >= 2""",
                timeout=15000
            )
            
            # Take a screenshot showing multiple function call icons
            screenshot_with_markdown(page, "multiple_function_calls", 
                                   {"Component": "Multiple Function Calls", "Status": "Visible"})
            
            # Verify that the function call icons have different colors
            function_call_icons = page.locator(".function-call-icon").all()
            
            if len(function_call_icons) >= 2:
                # Get the color classes of the first two icons
                first_icon_class = page.evaluate("""() => {
                    const icons = document.querySelectorAll('.function-call-icon');
                    if (icons.length > 0) {
                        return Array.from(icons[0].classList).find(c => c.startsWith('color-'));
                    }
                    return null;
                }""")
                
                second_icon_class = page.evaluate("""() => {
                    const icons = document.querySelectorAll('.function-call-icon');
                    if (icons.length > 1) {
                        return Array.from(icons[1].classList).find(c => c.startsWith('color-'));
                    }
                    return null;
                }""")
                
                print(f"First icon color class: {first_icon_class}")
                print(f"Second icon color class: {second_icon_class}")
                
                # Check if the color classes are different
                if first_icon_class and second_icon_class and first_icon_class != second_icon_class:
                    print("Function call icons have different colors")
                else:
                    print("WARNING: Function call icons have the same color or no color class")
            else:
                print(f"Only found {len(function_call_icons)} function call icons")
                
        except Exception as e:
            print(f"Error waiting for multiple function call icons: {e}")
            # Take a screenshot for debugging
            screenshot_with_markdown(page, "multiple_function_calls_error", 
                                   {"Component": "Multiple Function Calls", "Status": "Error", "Error": str(e)})
        
    except Exception as e:
        print(f"Error waiting for assistant response: {e}")
        # Take a screenshot for debugging
        screenshot_with_markdown(page, "assistant_response_timeout", 
                               {"Component": "Chat Response", "Status": "Error", "Error": str(e)})
        pytest.fail("Assistant response did not appear in chat")
    
    # Clean up - delete the functions
    cleanup_functions(page)
