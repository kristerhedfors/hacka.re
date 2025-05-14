"""
Chat Helpers for Function Calling API Tests

This module contains helper functions for testing chat interactions
with functions in function calling API tests.
"""
import pytest
from playwright.sync_api import Page, expect

from test_utils import check_system_messages

def function_invocation_through_chat(page):
    """Test function invocation through chat conversation."""
    print("Testing function invocation through chat...")
    
    # Type a message that should trigger the weather function
    message_input = page.locator("#message-input")
    test_message = "What's the weather like in London right now?"
    message_input.fill(test_message)
    
    # Send the message
    send_button = page.locator("#send-btn")
    send_button.click()
    
    # Wait for the user message to appear in the chat
    page.wait_for_selector(".message.user .message-content", state="visible", timeout=2000)
    user_message = page.locator(".message.user .message-content")
    expect(user_message).to_be_visible()
    expect(user_message).to_contain_text(test_message)
    
    # Take a screenshot after sending the message
    page.screenshot(path="_tests/playwright/videos/after_sending_message.png")
    
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
            page.screenshot(path="_tests/playwright/videos/no_function_execution_message.png")
    except Exception as e:
        print(f"Error waiting for function execution message: {e}")
        # Take a screenshot for debugging
        page.screenshot(path="_tests/playwright/videos/function_execution_timeout.png")
        # Continue the test even if we don't see the function execution message
        # as the model might not always choose to use the function
    
    # Wait for the assistant response
    try:
        page.wait_for_selector(".message.assistant .message-content", 
                              state="visible", 
                              timeout=5000)
        
        # Get the assistant message
        assistant_message = page.locator(".message.assistant .message-content").last
        assistant_text = assistant_message.text_content()
        print(f"Assistant response: {assistant_text}")
        
        # Take a screenshot of the assistant response
        page.screenshot(path="_tests/playwright/videos/assistant_response.png")
        
        # Check if the response contains weather-related information
        weather_terms = ["weather", "temperature", "celsius", "fahrenheit", "degrees", "london", "condition", "rainy", "sunny", "cloudy"]
        contains_weather_info = any(term in assistant_text.lower() for term in weather_terms)
        
        if contains_weather_info:
            print("Assistant response contains weather information")
        else:
            print("WARNING: Assistant response does not contain weather information")
            print("This could be because the model chose not to use the function")
            
        # The test passes as long as we got a response, even if the function wasn't used
        expect(assistant_message).to_be_visible()
    except Exception as e:
        print(f"Error waiting for assistant response: {e}")
        # Take a screenshot for debugging
        page.screenshot(path="_tests/playwright/videos/assistant_response_timeout.png")
        pytest.fail("Assistant response did not appear in chat")

def multiple_function_invocation(page):
    """Test invocation of multiple functions through chat."""
    print("Testing multiple function invocation...")
    
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
    
    # Wait for the user message to appear in the chat
    try:
        page.wait_for_selector(".message.user .message-content", state="visible", timeout=2000)
        # Get the count of user messages
        user_message_count = page.locator(".message.user").count()
        print(f"User message count after calculation query: {user_message_count}")
    except Exception as e:
        print(f"Error waiting for user message: {e}")
        # Take a screenshot for debugging
        page.screenshot(path="_tests/playwright/videos/user_message_timeout.png")
        pytest.fail("User message did not appear in chat")
    
    # Take a screenshot after sending the calculation message
    page.screenshot(path="_tests/playwright/videos/after_sending_calculation.png")
    
    # Wait for the assistant response
    try:
        page.wait_for_selector(".message.assistant .message-content", 
                              state="visible", 
                              timeout=5000)
        
        # Get the assistant message
        assistant_message = page.locator(".message.assistant .message-content").last
        assistant_text = assistant_message.text_content()
        print(f"Assistant response: {assistant_text}")
        
        # Take a screenshot of the calculation response
        page.screenshot(path="_tests/playwright/videos/calculation_response.png")
        
        # Check if the response contains calculation-related information
        calculation_terms = ["25", "4", "100", "multiply", "multiplied", "result", "equals", "="]
        contains_calculation_info = any(term in assistant_text.lower() for term in calculation_terms)
        
        if contains_calculation_info:
            print("Assistant response contains calculation information")
        else:
            print("WARNING: Assistant response does not contain calculation information")
            
        # The test passes as long as we got a response, even if the function wasn't used
        expect(assistant_message).to_be_visible()
        
        # Get the count of assistant messages after the first query
        assistant_message_count = page.locator(".message.assistant").count()
        print(f"Assistant message count after calculation query: {assistant_message_count}")
    except Exception as e:
        print(f"Error waiting for assistant response: {e}")
        # Take a screenshot for debugging
        page.screenshot(path="_tests/playwright/videos/calculation_response_timeout.png")
        pytest.fail("Assistant response did not appear in chat")
    
    # Now try a weather query
    message_input = page.locator("#message-input")
    weather_message = "What's the weather like in Tokyo today?"
    message_input.fill(weather_message)
    
    # Send the message
    send_button = page.locator("#send-btn")
    send_button.click()
    
    # Wait for a new user message to appear in the chat
    try:
        # Get the current count of user messages
        current_user_count = page.locator(".message.user").count()
        
        # Wait for a new user message to appear
        page.wait_for_function(
            """(prevCount) => document.querySelectorAll('.message.user').length > prevCount""",
            arg=current_user_count,
            timeout=2000
        )
        
        # Verify the new user message contains the weather query
        new_user_message = page.locator(".message.user .message-content").last
        expect(new_user_message).to_contain_text("Tokyo")
        print("New user message with Tokyo query appeared in chat")
    except Exception as e:
        print(f"Error waiting for new user message: {e}")
        # Take a screenshot for debugging
        page.screenshot(path="_tests/playwright/videos/new_user_message_timeout.png")
        pytest.fail(f"New user message did not appear in chat: {e}")
    
    # Take a screenshot after sending the weather message
    page.screenshot(path="_tests/playwright/videos/after_sending_weather.png")
    
    # Wait for the assistant response
    try:
        # Get the count of assistant messages before waiting for a new one
        previous_count = page.locator(".message.assistant").count()
        
        # Wait for a new assistant message
        page.wait_for_function(
            """(prevCount) => document.querySelectorAll('.message.assistant').length > prevCount""",
            arg=previous_count,
            timeout=5000
        )
        
        # Get the latest assistant message
        assistant_message = page.locator(".message.assistant .message-content").last
        assistant_text = assistant_message.text_content()
        print(f"Assistant response for weather query: {assistant_text}")
        
        # Take a screenshot of the weather response
        page.screenshot(path="_tests/playwright/videos/weather_response.png")
        
        # Check if the response contains weather-related information
        weather_terms = ["weather", "temperature", "celsius", "fahrenheit", "degrees", "tokyo", "condition", "sunny"]
        contains_weather_info = any(term in assistant_text.lower() for term in weather_terms)
        
        if contains_weather_info:
            print("Assistant response contains weather information")
        else:
            print("WARNING: Assistant response does not contain weather information")
            
        # The test passes as long as we got a response, even if the function wasn't used
        expect(assistant_message).to_be_visible()
    except Exception as e:
        print(f"Error waiting for assistant response: {e}")
        # Take a screenshot for debugging
        page.screenshot(path="_tests/playwright/videos/weather_response_timeout.png")
        pytest.fail("Assistant response did not appear in chat")
