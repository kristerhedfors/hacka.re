"""
Test microphone button visibility with voice control ENABLED
"""
import time
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_microphone_disappears_with_voice_enabled(page: Page, serve_hacka_re):
    """Test that microphone button disappears when typing (with voice control enabled)"""
    # Navigate
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Check if settings modal is already open, if not open it
    settings_modal = page.locator("#settings-modal.active")
    if not settings_modal.is_visible():
        settings_btn = page.locator("#settings-btn")
        settings_btn.click()
        # Wait for settings modal
        page.wait_for_selector("#settings-modal.active", state="visible", timeout=5000)
    
    # Enable voice control
    voice_control_checkbox = page.locator("#voice-control")
    if not voice_control_checkbox.is_checked():
        print("Enabling voice control...")
        voice_control_checkbox.click()
        page.wait_for_timeout(500)
    else:
        print("Voice control already enabled")
    
    # Close settings with escape
    page.keyboard.press("Escape")
    page.wait_for_selector("#settings-modal.active", state="hidden", timeout=5000)
    page.wait_for_timeout(500)
    
    # Now verify microphone button exists and is visible
    mic_initial = page.evaluate("""
        () => {
            const mic = document.querySelector('.microphone-btn-inside');
            return {
                exists: !!mic,
                display: mic ? window.getComputedStyle(mic).display : 'none',
                visibility: mic ? window.getComputedStyle(mic).visibility : 'hidden',
                color: mic ? window.getComputedStyle(mic).color : 'none'
            };
        }
    """)
    
    print(f"Initial microphone state: {mic_initial}")
    assert mic_initial['exists'], "Microphone button should exist when voice control is enabled"
    assert mic_initial['display'] == 'flex', f"Microphone should be visible initially, got display={mic_initial['display']}"
    
    screenshot_with_markdown(page, "mic_enabled_initial", {
        "Test": "Initial state with voice enabled",
        "Mic Exists": str(mic_initial['exists']),
        "Display": mic_initial['display'],
        "Visibility": mic_initial['visibility'],
        "Color": mic_initial['color']
    })
    
    # Get message input and type
    message_input = page.locator("#message-input")
    
    # Type a single character
    print("Typing 'H'...")
    message_input.type("H")
    page.wait_for_timeout(200)  # Give it time to react
    
    # Check microphone after typing
    mic_after_H = page.evaluate("""
        () => {
            const mic = document.querySelector('.microphone-btn-inside');
            const input = document.getElementById('message-input');
            return {
                exists: !!mic,
                display: mic ? window.getComputedStyle(mic).display : 'none',
                visibility: mic ? window.getComputedStyle(mic).visibility : 'hidden',
                inputValue: input ? input.value : '',
                inputLength: input ? input.value.length : 0
            };
        }
    """)
    
    print(f"After typing 'H': {mic_after_H}")
    
    screenshot_with_markdown(page, "mic_after_H", {
        "Test": "After typing H",
        "Input Value": mic_after_H['inputValue'],
        "Input Length": str(mic_after_H['inputLength']),
        "Mic Display": mic_after_H['display'],
        "Mic Visibility": mic_after_H['visibility'],
        "Expected": "none/hidden"
    })
    
    # Assert microphone is hidden
    assert mic_after_H['display'] == 'none' or mic_after_H['visibility'] == 'hidden', \
        f"Microphone should be hidden after typing, got display={mic_after_H['display']}, visibility={mic_after_H['visibility']}"
    
    # Type more
    print("Typing 'ello'...")
    message_input.type("ello")
    page.wait_for_timeout(200)
    
    mic_after_Hello = page.evaluate("""
        () => {
            const mic = document.querySelector('.microphone-btn-inside');
            const input = document.getElementById('message-input');
            return {
                display: mic ? window.getComputedStyle(mic).display : 'none',
                visibility: mic ? window.getComputedStyle(mic).visibility : 'hidden',
                inputValue: input ? input.value : ''
            };
        }
    """)
    
    print(f"After typing 'Hello': {mic_after_Hello}")
    
    # Assert still hidden
    assert mic_after_Hello['display'] == 'none' or mic_after_Hello['visibility'] == 'hidden', \
        f"Microphone should stay hidden, got display={mic_after_Hello['display']}, visibility={mic_after_Hello['visibility']}"
    
    # Clear input
    print("Clearing input...")
    message_input.fill("")
    page.wait_for_timeout(200)
    
    # Check microphone reappears
    mic_after_clear = page.evaluate("""
        () => {
            const mic = document.querySelector('.microphone-btn-inside');
            const input = document.getElementById('message-input');
            return {
                display: mic ? window.getComputedStyle(mic).display : 'none',
                visibility: mic ? window.getComputedStyle(mic).visibility : 'hidden',
                inputValue: input ? input.value : ''
            };
        }
    """)
    
    print(f"After clearing: {mic_after_clear}")
    
    screenshot_with_markdown(page, "mic_after_clear", {
        "Test": "After clearing input",
        "Input Value": mic_after_clear['inputValue'],
        "Mic Display": mic_after_clear['display'],
        "Mic Visibility": mic_after_clear['visibility'],
        "Expected": "flex/visible"
    })
    
    # Assert microphone is visible again
    assert mic_after_clear['display'] == 'flex' and mic_after_clear['visibility'] == 'visible', \
        f"Microphone should be visible after clearing, got display={mic_after_clear['display']}, visibility={mic_after_clear['visibility']}"
    
    print("✅ Test passed! Microphone hides when typing and reappears when cleared.")

if __name__ == "__main__":
    from playwright.sync_api import sync_playwright
    import sys
    import os
    
    # Add parent directory to path
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # Show browser for manual verification
        page = browser.new_page()
        
        # Run test
        test_microphone_disappears_with_voice_enabled(page, "http://localhost:8000")
        
        print("\nTest completed! Press Enter to close browser...")
        input()
        browser.close()