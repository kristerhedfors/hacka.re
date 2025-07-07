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

def test_stop_generation_debug(page: Page, serve_hacka_re):
    """Debug test to understand why button isn't changing to stop state."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Click the settings button
    settings_button = page.locator("#settings-btn")
    settings_button.click(timeout=2000)
    
    # Wait for the settings modal to become visible
    page.wait_for_selector("#settings-modal.active", state="visible", timeout=2000)
    
    # Enter the OpenAI API key from .env
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill(API_KEY)
    print(f"API key filled: {API_KEY[:10]}...")
    
    # Select OpenAI as the API provider
    base_url_select = page.locator("#base-url-select")
    base_url_select.select_option("openai")
    print("Base URL set to OpenAI")
    
    # Click the reload models button
    reload_button = page.locator("#model-reload-btn")
    reload_button.click()
    print("Clicked reload models")
    
    # Wait for the models to be loaded
    try:
        page.wait_for_selector("#model-select option:not([disabled])", state="visible", timeout=2000)
        print("Models loaded successfully")
    except Exception:
        print("Models load timeout, continuing...")
        time.sleep(0.5)
    
    # Select the recommended test model
    selected_model = select_recommended_test_model(page)
    print(f"Selected model: {selected_model}")
    
    # Save the settings
    save_button = page.locator("#settings-form button[type='submit']")
    save_button.click(force=True)
    print("Clicked save settings")
    
    # Wait for the settings modal to be closed
    page.wait_for_selector("#settings-modal", state="hidden", timeout=2000)
    print("Settings modal closed")
    
    screenshot_with_markdown(page, "After API setup - ready to test")
    
    # Check if API key is stored
    api_key_stored = page.evaluate("""() => {
        const keys = Object.keys(localStorage);
        for (const key of keys) {
            if (key.includes('api-key')) {
                return true;
            }
        }
        return false;
    }""")
    print(f"API key stored in localStorage: {api_key_stored}")
    
    # Check current model
    current_model = page.evaluate("""() => {
        if (window.aiHackare && window.aiHackare.settingsManager) {
            return window.aiHackare.settingsManager.getCurrentModel();
        }
        return null;
    }""")
    print(f"Current model from settings manager: {current_model}")
    
    # Type a simple message
    message_input = page.locator("#message-input")
    test_message = "Hello, this is a test."
    message_input.fill(test_message)
    print(f"Message filled: {test_message}")
    
    # Check initial button state
    send_button = page.locator("#send-btn")
    initial_icon = send_button.locator("i")
    initial_classes = initial_icon.get_attribute("class")
    initial_title = send_button.get_attribute("title")
    print(f"Initial button icon classes: {initial_classes}")
    print(f"Initial button title: {initial_title}")
    
    # Click send button
    print("Clicking send button...")
    send_button.click()
    
    # Wait a very small amount for UI to update
    time.sleep(0.05)
    
    # Check if API key modal appears
    api_key_modal_visible = page.locator("#api-key-modal").is_visible()
    print(f"API key modal visible after send: {api_key_modal_visible}")
    
    if api_key_modal_visible:
        print("ERROR: API key modal appeared - API key not saved properly")
        return
    
    # Check button state immediately after click
    after_click_icon = send_button.locator("i")
    after_click_classes = after_click_icon.get_attribute("class")
    after_click_title = send_button.get_attribute("title")
    print(f"After click button icon classes: {after_click_classes}")
    print(f"After click button title: {after_click_title}")
    
    # Check if generating
    is_generating = page.evaluate("""() => {
        if (window.aiHackare && window.aiHackare.chatManager) {
            return window.aiHackare.chatManager.getIsGenerating();
        }
        return null;
    }""")
    print(f"Is generating from chat manager: {is_generating}")
    
    # Wait a bit longer and check again
    time.sleep(0.5)
    
    later_icon = send_button.locator("i")
    later_classes = later_icon.get_attribute("class")
    later_title = send_button.get_attribute("title")
    print(f"After 0.5s button icon classes: {later_classes}")
    print(f"After 0.5s button title: {later_title}")
    
    # Check if generating again
    is_generating_later = page.evaluate("""() => {
        if (window.aiHackare && window.aiHackare.chatManager) {
            return window.aiHackare.chatManager.getIsGenerating();
        }
        return null;
    }""")
    print(f"Is generating after 0.5s: {is_generating_later}")
    
    # Check for any error messages in chat
    error_messages = page.locator(".message.system").count()
    print(f"Number of system messages: {error_messages}")
    
    if error_messages > 0:
        for i in range(error_messages):
            msg = page.locator(".message.system").nth(i).text_content()
            print(f"System message {i}: {msg}")
    
    # Check console for any errors
    screenshot_with_markdown(page, "Final state after send click")
    
    # The test will succeed if we get here - this is just for debugging
    assert True, "Debug test completed"