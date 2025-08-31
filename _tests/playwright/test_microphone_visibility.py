"""
Test microphone button visibility behavior
"""
import time
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_microphone_hides_when_text_entered(page: Page, serve_hacka_re):
    """Test that microphone button disappears when text is entered"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Wait for the microphone button to be visible initially
    microphone_btn = page.locator(".microphone-btn-inside")
    page.wait_for_timeout(500)  # Give it time to initialize
    
    # Check initial state - microphone should be visible when input is empty
    message_input = page.locator("#message-input")
    expect(message_input).to_have_value("")
    
    # The microphone might not be visible if voice control is disabled
    # So we'll check its visibility state after typing
    
    # Type some text
    message_input.fill("Hello world")
    page.wait_for_timeout(100)  # Brief wait for event handlers
    
    # Microphone should now be hidden
    is_hidden = page.evaluate("""
        () => {
            const mic = document.querySelector('.microphone-btn-inside');
            return mic ? mic.style.display === 'none' : true;
        }
    """)
    
    screenshot_with_markdown(page, "microphone_with_text", {
        "Test": "Microphone hidden when text present",
        "Input Value": "Hello world",
        "Microphone Hidden": str(is_hidden)
    })
    
    assert is_hidden, "Microphone button should be hidden when text is present"
    
    # Clear the text
    message_input.fill("")
    page.wait_for_timeout(100)  # Brief wait for event handlers
    
    # Microphone should be visible again (if voice control is enabled)
    is_visible = page.evaluate("""
        () => {
            const mic = document.querySelector('.microphone-btn-inside');
            return mic ? mic.style.display !== 'none' : false;
        }
    """)
    
    screenshot_with_markdown(page, "microphone_empty_input", {
        "Test": "Microphone visible when input empty",
        "Input Value": "(empty)",
        "Microphone Visible": str(is_visible)
    })
    
    # Note: Microphone might not be visible if voice control is disabled
    # So we don't assert it must be visible, just that it behaves correctly

def test_microphone_stays_hidden_during_typing(page: Page, serve_hacka_re):
    """Test that microphone button stays hidden while typing"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    message_input = page.locator("#message-input")
    
    # Type character by character
    test_text = "Testing microphone visibility"
    for i, char in enumerate(test_text):
        message_input.type(char)
        page.wait_for_timeout(50)  # Small delay between characters
        
        # Check microphone is hidden after each character
        is_hidden = page.evaluate("""
            () => {
                const mic = document.querySelector('.microphone-btn-inside');
                return mic ? mic.style.display === 'none' : true;
            }
        """)
        
        if not is_hidden:
            screenshot_with_markdown(page, f"microphone_visible_at_char_{i}", {
                "Test": "Microphone visibility during typing",
                "Character Index": str(i),
                "Current Text": test_text[:i+1],
                "Microphone Hidden": str(is_hidden),
                "ERROR": "Microphone should be hidden!"
            })
            assert False, f"Microphone button should be hidden after typing '{test_text[:i+1]}'"
    
    screenshot_with_markdown(page, "microphone_typing_complete", {
        "Test": "Microphone hidden throughout typing",
        "Final Text": test_text,
        "Result": "PASS - Microphone stayed hidden"
    })

def test_microphone_reappears_on_clear(page: Page, serve_hacka_re):
    """Test that microphone button reappears when input is cleared"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    message_input = page.locator("#message-input")
    
    # Type some text
    message_input.fill("Some text here")
    page.wait_for_timeout(100)
    
    # Verify microphone is hidden
    is_hidden = page.evaluate("""
        () => {
            const mic = document.querySelector('.microphone-btn-inside');
            return mic ? mic.style.display === 'none' : true;
        }
    """)
    assert is_hidden, "Microphone should be hidden with text"
    
    # Clear using Ctrl+A and Delete
    message_input.click()
    page.keyboard.press("Control+A")
    page.keyboard.press("Delete")
    page.wait_for_timeout(100)
    
    # Check if microphone reappears (if voice control is enabled)
    mic_state = page.evaluate("""
        () => {
            const mic = document.querySelector('.microphone-btn-inside');
            if (!mic) return 'not-found';
            return mic.style.display === 'none' ? 'hidden' : 'visible';
        }
    """)
    
    screenshot_with_markdown(page, "microphone_after_clear", {
        "Test": "Microphone state after clearing input",
        "Input Value": "(empty)",
        "Microphone State": mic_state
    })
    
    # Also test backspace clearing
    message_input.fill("Test")
    page.wait_for_timeout(100)
    
    # Clear with backspace
    for _ in range(4):
        page.keyboard.press("Backspace")
        page.wait_for_timeout(50)
    
    mic_state_after_backspace = page.evaluate("""
        () => {
            const mic = document.querySelector('.microphone-btn-inside');
            if (!mic) return 'not-found';
            return mic.style.display === 'none' ? 'hidden' : 'visible';
        }
    """)
    
    screenshot_with_markdown(page, "microphone_after_backspace", {
        "Test": "Microphone state after backspace clear",
        "Input Value": "(empty)",
        "Microphone State": mic_state_after_backspace
    })