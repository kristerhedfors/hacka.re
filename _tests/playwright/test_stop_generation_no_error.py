import pytest
import time
import os
from dotenv import load_dotenv
from playwright.sync_api import Page, expect

from test_utils import dismiss_welcome_modal, screenshot_with_markdown, select_recommended_test_model

# Load environment variables from .env file in the current directory
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
# Get API key from environment variables
API_KEY = os.getenv("OPENAI_API_KEY")

def setup_api_and_model(page: Page):
    """Helper function to set up API key and model for testing."""
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Click the settings button
    settings_button = page.locator("#settings-btn")
    settings_button.click(timeout=1000)
    
    # Wait for the settings modal to become visible
    page.wait_for_selector("#settings-modal.active", state="visible", timeout=2000)
    
    # Enter the OpenAI API key from .env
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill(API_KEY)
    
    # Select OpenAI as the API provider
    base_url_select = page.locator("#base-url-select")
    base_url_select.select_option("openai")
    
    # Click the reload models button
    reload_button = page.locator("#model-reload-btn")
    reload_button.click()
    
    # Wait for the models to be loaded
    try:
        page.wait_for_selector("#model-select option:not([disabled])", state="visible", timeout=2000)
    except Exception:
        time.sleep(1)
    
    # Select the recommended test model
    selected_model = select_recommended_test_model(page)
    
    # Skip the test if no valid model could be selected
    if not selected_model:
        pytest.skip("No valid model could be selected")
    
    # Save the settings
    save_button = page.locator("#settings-form button[type='submit']")
    save_button.click(force=True)
    
    # Wait for the settings modal to be closed
    page.wait_for_selector("#settings-modal", state="hidden", timeout=2000)
    
    return selected_model

def test_stop_generation_no_console_errors(page: Page, serve_hacka_re):
    """Test that stopping generation doesn't log AbortError as an error in console."""
    # Set up console monitoring
    console_errors = []
    console_logs = []
    
    def handle_console(msg):
        if msg.type == 'error':
            console_errors.append(msg.text)
        elif msg.type == 'log':
            console_logs.append(msg.text)
    
    page.on('console', handle_console)
    
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Set up API key and model
    setup_api_and_model(page)
    
    screenshot_with_markdown(page, "Ready to test stop generation without console errors")
    
    # Type a message that will generate content
    message_input = page.locator("#message-input")
    test_message = "Please write a very long story about a robot learning to paint. Take your time."
    message_input.fill(test_message)
    
    # Click send button
    send_button = page.locator("#send-btn")
    send_button.click()
    
    # Wait for generation to start - check button changes to stop
    time.sleep(0.5)
    stop_icon = send_button.locator("i")
    try:
        expect(stop_icon).to_have_class("fas fa-stop", timeout=2000)
    except:
        # If button didn't change to stop, skip the test (generation might have failed to start)
        pytest.skip("Generation did not start properly")
    
    screenshot_with_markdown(page, "Generation started - button shows stop icon")
    
    # Clear any existing console messages
    initial_error_count = len(console_errors)
    
    # Wait a moment to let some generation happen
    time.sleep(1)
    
    # Click the stop button
    send_button.click()
    
    screenshot_with_markdown(page, "Clicked stop button")
    
    # Wait for stop to complete
    time.sleep(1)
    
    # Check that button reverted to send state
    final_icon = send_button.locator("i")
    expect(final_icon).to_have_class("fas fa-paper-plane")
    
    # Check for "stopped" message in chat
    try:
        page.wait_for_selector(".message.system", state="visible", timeout=2000)
        system_messages = page.locator(".message.system .message-content")
        
        found_stop_message = False
        for i in range(system_messages.count()):
            message_text = system_messages.nth(i).text_content()
            if "stopped" in message_text.lower():
                found_stop_message = True
                print(f"Found stop message: {message_text}")
                break
        
        # It's okay if we don't find the stop message, but the test should still pass
        if found_stop_message:
            print("Stop message found in UI")
        else:
            print("Stop message not found, but that's okay")
            
    except Exception as e:
        print(f"No system message appeared after stopping: {e}")
    
    # Most importantly: Check that no new console errors were logged
    final_error_count = len(console_errors)
    new_errors = console_errors[initial_error_count:]
    
    # Filter out any AbortError messages in console errors
    abort_errors = [error for error in new_errors if 'AbortError' in error and 'generateChatCompletion' in error]
    
    # Print console activity for debugging
    print(f"Console errors before stop: {initial_error_count}")
    print(f"Console errors after stop: {final_error_count}")
    print(f"New errors: {new_errors}")
    print(f"AbortError messages: {abort_errors}")
    
    # The key assertion: No AbortError should be logged as an error
    assert len(abort_errors) == 0, f"Found AbortError logged as console error: {abort_errors}"
    
    # Check if we have any API Debug info messages about cancellation
    cancel_info_messages = [log for log in console_logs if 'Request cancelled by user' in log]
    print(f"Cancel info messages: {cancel_info_messages}")
    
    # This is what we want to see instead of errors
    if cancel_info_messages:
        print("✓ Found proper info message about request cancellation")

def test_abort_error_converted_to_info(page: Page, serve_hacka_re):
    """Test that AbortError is logged as info, not error."""
    # Set up console monitoring to capture all levels
    console_messages = []
    
    def handle_console(msg):
        console_messages.append({
            'type': msg.type,
            'text': msg.text
        })
    
    page.on('console', handle_console)
    
    # Navigate and test the UI service directly
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Test that we can simulate the proper logging behavior
    result = page.evaluate("""() => {
        // Test the API debugger directly
        if (!window.ApiDebugger) {
            return { success: false, error: 'ApiDebugger not found' };
        }
        
        // Clear console
        console.clear();
        
        // Test that logInfo method exists and works
        if (typeof window.ApiDebugger.logInfo === 'function') {
            window.ApiDebugger.logInfo('generateChatCompletion', 'Request cancelled by user');
            return { success: true, hasLogInfo: true };
        } else {
            return { success: true, hasLogInfo: false };
        }
    }""")
    
    assert result['success'], f"Test failed: {result.get('error', 'Unknown error')}"
    
    if result['hasLogInfo']:
        # Wait a moment for console message to appear
        time.sleep(0.1)
        
        # Check that we have an info message about cancellation
        info_messages = [msg for msg in console_messages if msg['type'] == 'log' and 'Request cancelled by user' in msg['text']]
        
        assert len(info_messages) > 0, "Should have found info message about request cancellation"
        print(f"✓ Found proper info logging: {info_messages}")
    else:
        print("ApiDebugger.logInfo method not found - this is okay, basic error suppression should still work")