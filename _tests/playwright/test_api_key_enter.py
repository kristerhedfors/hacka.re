"""Test that Enter key works in API key modal to save and close it"""

from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

def test_api_key_modal_enter_key(page: Page, serve_hacka_re):
    """Test that pressing Enter in API key modal saves and closes it"""
    # Set up console logging to debug
    page.on("console", lambda msg: print(f"Console {msg.type}: {msg.text}"))
    
    # Navigate to the app
    page.goto(serve_hacka_re)
    
    # Clear any existing API key to ensure modal will appear
    page.evaluate("""() => {
        // Clear all storage to ensure API key modal will appear
        localStorage.clear();
        sessionStorage.clear();
    }""")
    
    # Reload to apply the cleared storage
    page.reload()
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if it's open
    dismiss_settings_modal(page)
    
    # Type a test message
    message_input = page.locator("#message-input")
    message_input.fill("Test message")
    
    # Click send to trigger API key modal (when no API key is set)
    send_button = page.locator("#send-btn")
    send_button.click()
    
    # Wait for API key modal to appear
    api_key_modal = page.locator("#api-key-modal")
    page.wait_for_selector("#api-key-modal.active", state="visible", timeout=5000)
    
    # Verify modal is active
    expect(api_key_modal).to_be_visible()
    
    # Get test API key
    api_key = os.getenv("OPENAI_API_KEY", "test-api-key-1234")
    
    # Type API key in the input field
    api_key_input = page.locator("#api-key")
    api_key_input.fill(api_key)
    
    # Take screenshot before pressing Enter
    screenshot_with_markdown(page, "api_key_before_enter", {
        "Status": "API key entered, about to press Enter",
        "Modal State": "Open",
        "Input Filled": "Yes"
    })
    
    # Press Enter to submit the form
    api_key_input.press("Enter")
    
    # Wait for modal to close - it should lose the 'active' class
    page.wait_for_function(
        """() => {
            const modal = document.querySelector('#api-key-modal');
            return modal && !modal.classList.contains('active');
        }""",
        timeout=5000
    )
    
    # Small delay to ensure DOM updates
    page.wait_for_timeout(300)
    
    # Verify modal is no longer active
    modal_classes = page.evaluate("""() => {
        const modal = document.querySelector('#api-key-modal');
        return modal ? modal.className : '';
    }""")
    assert "active" not in modal_classes, f"Modal should not be active, but has classes: {modal_classes}"
    
    # Verify we're back to the chat interface
    message_input = page.locator("#message-input")
    expect(message_input).to_be_visible()
    
    # Verify that API key was saved (checking all possible storage locations)
    api_key_stored = page.evaluate("""() => {
        // Check for namespaced keys - the app uses namespacing for storage
        const keys = Object.keys(localStorage);
        const apiKeyKeys = keys.filter(k => k.includes('api_key'));
        
        // Also check sessionStorage
        const sessionKeys = Object.keys(sessionStorage);
        const sessionApiKeys = sessionKeys.filter(k => k.includes('api_key'));
        
        // Log what we found for debugging
        console.log('LocalStorage API key keys:', apiKeyKeys);
        console.log('SessionStorage API key keys:', sessionApiKeys);
        
        // Return true if we found any API key in either storage
        return apiKeyKeys.length > 0 || sessionApiKeys.length > 0;
    }""")
    
    assert api_key_stored, "API key should be stored after pressing Enter"
    
    # Take screenshot showing modal is closed
    screenshot_with_markdown(page, "api_key_after_enter", {
        "Status": "API key saved via Enter key",
        "Modal State": "Closed",
        "API Key Stored": "Yes" if api_key_stored else "No",
        "Test Result": "Success"
    })
    
    print("✅ Enter key successfully saves API key and closes modal")