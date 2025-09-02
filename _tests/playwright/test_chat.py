import pytest
import time
import os
import json
from dotenv import load_dotenv
from playwright.sync_api import Page, expect

from test_utils import dismiss_welcome_modal, check_system_messages, screenshot_with_markdown

# Load environment variables from .env file in the current directory
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

def test_chat_message_send_receive(page: Page, serve_hacka_re, api_key, test_config):
    """Test sending a message and receiving a response with real API."""
    
    # Set up console logging
    console_messages = []
    def log_console_message(msg):
        timestamp = time.strftime("%H:%M:%S")
        console_messages.append({
            'timestamp': timestamp,
            'type': msg.type,
            'text': msg.text,
            'location': str(msg.location) if msg.location else None
        })
        print(f"[{timestamp}] Console {msg.type.upper()}: {msg.text}")
    
    page.on("console", log_console_message)
    
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Take initial screenshot
    screenshot_with_markdown(page, "01_initial_load", {
        "Status": "Page loaded",
        "Provider": test_config["provider_value"],
        "Model": test_config["model"],
        "Base URL": test_config["base_url"]
    })
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Click the settings button
    settings_button = page.locator("#settings-btn")
    settings_button.click(timeout=2000)
    
    # Wait for the settings modal to become visible
    page.wait_for_selector("#settings-modal.active", state="visible", timeout=2000)
    
    # Enter the API key from centralized config
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill(api_key)
    
    # Select the configured test provider
    base_url_select = page.locator("#base-url-select")
    if test_config["provider_value"] == "berget":
        base_url_select.select_option("berget")
    else:
        base_url_select.select_option(test_config["provider_value"])
    
    # Take screenshot of settings
    screenshot_with_markdown(page, "02_settings_configured", {
        "Status": "Settings configured",
        "API Key Length": str(len(api_key)),
        "Provider": test_config["provider_value"]
    })
    
    # Wait for models to load
    page.wait_for_timeout(2000)
    
    # Select the recommended test model
    from test_utils import select_recommended_test_model
    selected_model = select_recommended_test_model(page)
    
    if not selected_model:
        pytest.skip("No valid model could be selected")
    
    print(f"Selected model: {selected_model}")
    
    # Settings auto-save, wait for them to save
    page.wait_for_timeout(2000)
    
    # Close the settings modal
    close_button = page.locator("#close-settings")
    close_button.click()
    
    # Wait for the settings modal to be closed
    page.wait_for_selector("#settings-modal", state="hidden", timeout=2000)
    
    # Check API key was saved
    api_key_saved = page.evaluate("""() => {
        const keys = Object.keys(localStorage);
        for (const key of keys) {
            if (key.includes('api') && key.includes('key')) {
                const value = localStorage.getItem(key);
                if (value && value.length > 0) {
                    return { key: key, length: value.length };
                }
            }
        }
        return null;
    }""")
    
    print(f"API key storage check: {api_key_saved}")
    
    # Also check the encrypted storage
    encrypted_check = page.evaluate("""() => {
        const keys = Object.keys(localStorage);
        const hackareKeys = keys.filter(k => k.startsWith('hackare_'));
        return hackareKeys.map(k => ({
            key: k,
            length: localStorage.getItem(k) ? localStorage.getItem(k).length : 0
        }));
    }""")
    
    print(f"Encrypted storage keys: {encrypted_check}")
    
    # Take screenshot before sending message
    screenshot_with_markdown(page, "03_before_send", {
        "Status": "Ready to send message",
        "API Key Saved": str(api_key_saved is not None),
        "Selected Model": selected_model
    })
    
    # Type a message in the chat input
    message_input = page.locator("#message-input")
    test_message = "Hello, please respond with just 'Hi!' and nothing else."
    message_input.fill(test_message)
    
    # Click send button
    send_button = page.locator("#send-btn")
    send_button.click()
    
    # Wait for user message to appear
    try:
        page.wait_for_selector(".message.user .message-content", state="visible", timeout=5000)
        print("User message appeared in chat")
    except Exception as e:
        screenshot_with_markdown(page, "04_error_no_user_message", {
            "Status": "User message did not appear",
            "Error": str(e),
            "Console Messages": str(len(console_messages))
        })
        pytest.skip(f"User message did not appear: {e}")
    
    # Check for API key modal
    api_key_modal = page.locator("#api-key-modal")
    if api_key_modal.is_visible():
        print("WARNING: API key modal appeared - key was not saved properly")
        screenshot_with_markdown(page, "05_api_key_modal", {
            "Status": "API key modal appeared",
            "Issue": "API key was not saved properly"
        })
        
        # Enter the API key again
        modal_api_input = page.locator("#api-key")
        modal_api_input.fill(api_key)
        
        # Submit the API key form
        submit_button = page.locator("#api-key-form button[type='submit']")
        submit_button.click()
        
        # Wait for modal to close
        page.wait_for_selector("#api-key-modal", state="hidden", timeout=2000)
    
    # Wait for assistant response with detailed monitoring
    print("Waiting for assistant response...")
    
    # Check for typing indicator
    typing_visible = False
    try:
        page.wait_for_selector(".typing-indicator", state="visible", timeout=2000)
        typing_visible = True
        print("Typing indicator appeared")
    except:
        print("Typing indicator did not appear within 2 seconds")
    
    # Monitor for assistant message
    try:
        page.wait_for_selector(".message.assistant .message-content", state="visible", timeout=15000)
        print("Assistant message appeared")
        
        # Wait a bit for content to fully load
        page.wait_for_timeout(2000)
        
        # Get the assistant response - check all messages for non-empty assistant response
        assistant_messages = page.locator(".message.assistant .message-content")
        response_found = False
        actual_response = ""
        
        for i in range(assistant_messages.count()):
            msg_content = assistant_messages.nth(i).text_content()
            if msg_content and msg_content.strip():
                response_found = True
                actual_response = msg_content.strip()
                print(f"Found assistant response in message {i+1}: {actual_response}")
                break
        
        if not response_found:
            # Also check if response is in any message without .assistant class
            all_messages = page.locator(".message .message-content")
            for i in range(all_messages.count()):
                msg_content = all_messages.nth(i).text_content()
                # Skip system and user messages
                parent_class = page.evaluate(f"""
                    document.querySelectorAll('.message')[{i}]?.className || ''
                """)
                if 'system' not in parent_class and 'user' not in parent_class:
                    if msg_content and msg_content.strip() and msg_content.strip() != test_message:
                        response_found = True
                        actual_response = msg_content.strip()
                        print(f"Found response in message {i+1} (non-.assistant): {actual_response}")
                        break
        
        if response_found:
            print(f"✅ Assistant response: {actual_response}")
            
            screenshot_with_markdown(page, "06_success_response", {
                "Status": "Response received",
                "Response": actual_response[:100] + "..." if len(actual_response) > 100 else actual_response,
                "Typing Indicator": str(typing_visible)
            })
            
            # Verify response is not empty and contains something meaningful
            assert actual_response != "", "Assistant response is empty"
            assert len(actual_response) > 0, "Response has no content"
            print("✅ Test passed: Response received successfully")
        else:
            raise Exception("No assistant messages found")
            
    except Exception as e:
        print(f"Error waiting for assistant response: {e}")
        
        # Take debug screenshot
        screenshot_with_markdown(page, "07_error_no_response", {
            "Status": "No assistant response",
            "Error": str(e),
            "Typing Indicator": str(typing_visible),
            "Console Messages": str(len(console_messages))
        })
        
        # Print all messages for debugging
        all_messages = page.locator(".message .message-content")
        print(f"Total messages in chat: {all_messages.count()}")
        for i in range(all_messages.count()):
            msg_text = all_messages.nth(i).text_content()
            print(f"  Message {i+1}: {msg_text[:100]}...")
        
        # Save console log to file
        console_log_file = "test_chat_console.json"
        with open(console_log_file, 'w') as f:
            json.dump(console_messages, f, indent=2)
        print(f"Console log saved to {console_log_file}")
        
        # Check for error messages
        error_messages = page.locator(".message.system.error")
        if error_messages.count() > 0:
            print("Error messages found:")
            for i in range(error_messages.count()):
                error_text = error_messages.nth(i).text_content()
                print(f"  Error: {error_text}")
        
        pytest.fail(f"Assistant response not received: {e}")