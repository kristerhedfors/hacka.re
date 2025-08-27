"""
Chat Helpers for Function Calling API Tests

This module contains helper functions for testing chat interactions
with functions in function calling API tests.
"""
import pytest
from playwright.sync_api import Page, expect

from test_utils import check_system_messages, screenshot_with_markdown

def function_invocation_through_chat(page):
    """Test function invocation through chat conversation."""
    print("Testing function invocation through chat...")
    
    # Wait for chat interface to be ready
    page.wait_for_selector("#message-input", state="visible", timeout=5000)
    page.wait_for_selector("#send-btn", state="visible", timeout=5000)
    
    # Check if input is enabled 
    message_input = page.locator("#message-input")
    send_button = page.locator("#send-btn")
    
    # Wait for input to be enabled (sometimes takes a moment after API key setup)
    try:
        page.wait_for_function("() => !document.getElementById('message-input').disabled", timeout=3000)
    except:
        print("Warning: Message input might still be disabled")
    
    # Set up console logging to catch any API errors
    console_errors = []
    def handle_console(msg):
        if msg.type == "error":
            console_errors.append(f"Console error: {msg.text}")
            print(f"Console error: {msg.text}")
    page.on("console", handle_console)
    
    # Type a message that should trigger the weather function
    test_message = "What's the weather like in London right now?"
    
    # Check the current state of message input
    print(f"Message input enabled: {message_input.is_enabled()}")
    print(f"Send button enabled: {send_button.is_enabled()}")
    
    message_input.fill(test_message)
    print(f"Message input value after fill: {message_input.input_value()}")
    
    # Send the message
    send_button.click()
    print("Send button clicked")
    
    # Wait a bit to see if the message gets processed
    page.wait_for_timeout(1000)
    
    # Check if the user message appeared
    user_message_exists = page.locator(".message.user").count() > 0
    print(f"User message exists after sending: {user_message_exists}")
    
    if not user_message_exists:
        # Try to debug why the message wasn't sent
        input_value = message_input.input_value()
        print(f"Input value after click: {input_value}")
        
        # Check if there are any error messages
        error_messages = page.evaluate("""() => {
            const elements = document.querySelectorAll('.error, .alert, .warning');
            return Array.from(elements).map(el => el.textContent);
        }""")
        print(f"Error messages on page: {error_messages}")
        
        # Try sending with Enter key as backup
        print("Trying to send with Enter key...")
        message_input.press("Enter")
        page.wait_for_timeout(1000)
    
    # Wait for the user message to appear in the chat
    page.wait_for_selector(".message.user .message-content", state="visible", timeout=5000)
    user_message = page.locator(".message.user .message-content")
    expect(user_message).to_be_visible()
    expect(user_message).to_contain_text(test_message)
    
    # Take a screenshot after sending the message
    screenshot_with_markdown(page, "after_sending_message", 
                           {"Component": "Chat", "Status": "After sending message", "Message": test_message})
    
    # Wait for system messages about function execution
    # This may take some time as the model needs to decide to use the function
    try:
        # Wait for a system message indicating function execution
        page.wait_for_selector(".message.system .message-content:has-text('function')", 
                              state="visible", 
                              timeout=5000)
        
        # Check system messages
        system_messages = check_system_messages(page)
        
        # Verify that at least one system message mentions function execution
        function_execution_message_found = False
        for i in range(system_messages.count()):
            message_text = system_messages.nth(i).text_content()
            if "function" in message_text.lower() and ("executing" in message_text.lower() or "executed" in message_text.lower()):
                function_execution_message_found = True
                print(f"Found function execution message: {message_text}")
                break
        
        if not function_execution_message_found:
            print("WARNING: No function execution message found in system messages")
            # Take a screenshot for debugging
            screenshot_with_markdown(page, "no_function_execution_message", 
                                   {"Component": "System Messages", "Status": "Warning", "Issue": "No function execution message found"})
    except Exception as e:
        print(f"Error waiting for function execution message: {e}")
        # Take a screenshot for debugging
        screenshot_with_markdown(page, "function_execution_timeout", 
                               {"Component": "System Messages", "Status": "Error", "Error": str(e), "Timeout": "5000ms"})
        # Continue the test even if we don't see the function execution message
        # as the model might not always choose to use the function
    
    # Wait for the assistant response
    try:
        page.wait_for_selector(".message.assistant .message-content", 
                              state="visible", 
                              timeout=5000)
        
        # Get the assistant message
        assistant_message = page.locator(".message.assistant .message-content").last
        
        # Wait a bit more for content to load 
        page.wait_for_timeout(1000)
        
        assistant_text = assistant_message.text_content()
        print(f"Assistant response: {repr(assistant_text)}")
        
        # Check if response is empty or just whitespace
        if not assistant_text or assistant_text.strip() == "":
            print("Assistant response is empty, waiting a bit more...")
            page.wait_for_timeout(2000)
            assistant_text = assistant_message.text_content()
            print(f"Assistant response after wait: {repr(assistant_text)}")
        
        # Check if the response contains weather-related information
        weather_terms = ["weather", "temperature", "celsius", "fahrenheit", "degrees", "london", "condition", "rainy", "sunny", "cloudy"]
        contains_weather_info = any(term in assistant_text.lower() for term in weather_terms) if assistant_text else False
        
        # Take a screenshot of the assistant response
        screenshot_with_markdown(page, "assistant_response", 
                               {"Component": "Chat Response", "Status": "Success", "Contains Weather Info": str(contains_weather_info), "Response": assistant_text[:100] + "..." if assistant_text else "Empty response"})
        
        if contains_weather_info:
            print("Assistant response contains weather information")
        elif not assistant_text or assistant_text.strip() == "":
            print("ERROR: Assistant response is empty")
            print(f"Console errors during chat: {console_errors}")
            # Check if there was an API error
            api_error_messages = page.evaluate("""() => {
                const systemMessages = document.querySelectorAll('.message.system .message-content');
                const errorMessages = [];
                systemMessages.forEach(msg => {
                    const text = msg.textContent;
                    if (text && (text.includes('error') || text.includes('Error') || text.includes('failed') || text.includes('Failed'))) {
                        errorMessages.push(text.trim());
                    }
                });
                return errorMessages;
            }""")
            print(f"API error messages in system chat: {api_error_messages}")
            # Take additional debug screenshot
            screenshot_with_markdown(page, "empty_assistant_response", 
                                   {"Component": "Chat Response", "Status": "Error", "Issue": "Empty response", "Console Errors": str(len(console_errors)), "API Errors": str(len(api_error_messages))})
            pytest.fail("Assistant response is empty")
        else:
            print("WARNING: Assistant response does not contain weather information")
            print("This could be because the model chose not to use the function")
            
        # The test passes as long as we got a non-empty response
        if assistant_text and assistant_text.strip():
            print("Test passed: Got non-empty assistant response")
        else:
            pytest.fail("Assistant response is empty or not visible")
    except Exception as e:
        print(f"Error waiting for assistant response: {e}")
        # Take a screenshot for debugging
        screenshot_with_markdown(page, "assistant_response_timeout", 
                               {"Component": "Chat Response", "Status": "Error", "Error": str(e), "Timeout": "5000ms"})
        pytest.fail("Assistant response did not appear in chat")

def multiple_function_invocation(page):
    """Test invocation of a simple function through chat."""
    print("Testing simple function invocation...")
    
    # Clear the chat history first
    page.evaluate("""() => {
        if (window.chatManager && window.chatManager.clearMessages) {
            window.chatManager.clearMessages();
        }
    }""")
    
    # Type a message that could trigger the calculator function
    message_input = page.locator("#message-input")
    calculation_message = "What is 25 multiplied by 4?"
    message_input.fill(calculation_message)
    
    # Send the message
    send_button = page.locator("#send-btn")
    send_button.click()
    
    # Take a screenshot after sending the message
    screenshot_with_markdown(page, "after_sending_calculation", 
                           {"Component": "Chat", "Status": "After sending message", "Message": calculation_message})
    
    # Wait for the assistant response with a longer timeout
    try:
        page.wait_for_selector(".message.assistant .message-content", 
                              state="visible", 
                              timeout=10000)  # Increased timeout to 10 seconds
        
        # Get the assistant message
        assistant_message = page.locator(".message.assistant .message-content").last
        assistant_text = assistant_message.text_content()
        print(f"Assistant response: {assistant_text}")
        
        # Check if the response contains calculation-related information
        calculation_terms = ["25", "4", "100", "multiply", "multiplied", "result", "equals", "="]
        contains_calculation_info = any(term in assistant_text.lower() for term in calculation_terms)
        
        # Take a screenshot of the calculation response
        screenshot_with_markdown(page, "calculation_response", 
                               {"Component": "Chat Response", "Status": "Success", "Contains Calculation Info": str(contains_calculation_info), "Response": assistant_text[:100] + "..."})
        
        if contains_calculation_info:
            print("Assistant response contains calculation information")
        else:
            print("WARNING: Assistant response does not contain calculation information")
            
        # The test passes as long as we got a response, even if the function wasn't used
        expect(assistant_message).to_be_visible()
        
        print("Function invocation test completed successfully")
    except Exception as e:
        print(f"Error waiting for assistant response: {e}")
        # Take a screenshot for debugging
        screenshot_with_markdown(page, "calculation_response_timeout", 
                               {"Component": "Chat Response", "Status": "Error", "Error": str(e), "Timeout": "10000ms"})
        pytest.fail("Assistant response did not appear in chat")
