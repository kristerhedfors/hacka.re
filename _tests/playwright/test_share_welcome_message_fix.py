#!/usr/bin/env python3
"""Test the Share Link modal welcome message UI improvements"""

from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown


def test_share_welcome_message_ui(page: Page, serve_hacka_re):
    """Test that welcome message textarea is properly indented and grayed out when unchecked"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Click the Share button to open modal
    share_button = page.locator("#share-btn")
    share_button.click()
    
    # Wait for modal to be visible
    page.wait_for_selector("#share-modal.active", state="visible", timeout=5000)
    
    # Get the checkbox and textarea elements
    checkbox = page.locator("#share-welcome-message-checkbox")
    textarea = page.locator("#share-welcome-message")
    
    # Verify initial state - checkbox unchecked, textarea disabled and grayed out
    expect(checkbox).not_to_be_checked()
    expect(textarea).to_be_disabled()
    
    # Check the opacity style
    opacity = textarea.evaluate("el => window.getComputedStyle(el).opacity")
    assert float(opacity) == 0.5, f"Expected opacity 0.5, got {opacity}"
    
    # Check the indentation (margin-left on parent)
    parent_margin = page.locator(".branding-options").first.evaluate("el => window.getComputedStyle(el).marginLeft")
    assert parent_margin == "24px", f"Expected margin-left 24px, got {parent_margin}"
    
    # Verify no redundant "Welcome Message" label exists above the textarea
    labels = page.locator(".form-group label:text-is('Welcome Message')")
    expect(labels).to_have_count(0)
    
    screenshot_with_markdown(page, "welcome_message_unchecked", {
        "Status": "Initial state",
        "Checkbox": "Unchecked",
        "Textarea": "Disabled and grayed out",
        "Indentation": "24px margin-left"
    })
    
    # Check the checkbox
    checkbox.check()
    
    # Verify textarea is now enabled and fully visible
    expect(checkbox).to_be_checked()
    expect(textarea).to_be_enabled()
    
    # Check the opacity changed to 1
    opacity = textarea.evaluate("el => window.getComputedStyle(el).opacity")
    assert float(opacity) == 1.0, f"Expected opacity 1, got {opacity}"
    
    screenshot_with_markdown(page, "welcome_message_checked", {
        "Status": "After checking",
        "Checkbox": "Checked",
        "Textarea": "Enabled and fully visible",
        "Opacity": "1.0"
    })
    
    # Type in the textarea to ensure it's functional
    textarea.fill("Custom welcome message for testing")
    expect(textarea).to_have_value("Custom welcome message for testing")
    
    # Uncheck the checkbox again
    checkbox.uncheck()
    
    # Verify textarea is disabled and grayed out again
    expect(checkbox).not_to_be_checked()
    expect(textarea).to_be_disabled()
    opacity = textarea.evaluate("el => window.getComputedStyle(el).opacity")
    assert float(opacity) == 0.5, f"Expected opacity 0.5 after unchecking, got {opacity}"
    
    screenshot_with_markdown(page, "welcome_message_unchecked_again", {
        "Status": "After unchecking again",
        "Checkbox": "Unchecked",
        "Textarea": "Disabled and grayed out",
        "Text": "Still contains custom message"
    })
    
    print("✅ Welcome message UI improvements verified successfully")


if __name__ == "__main__":
    from conftest import browser, serve_hacka_re as serve_fixture
    import sys
    
    with browser() as browser_instance:
        page = browser_instance.new_page()
        try:
            test_share_welcome_message_ui(page, "http://localhost:8000")
            print("\n✅ All tests passed!")
        except Exception as e:
            print(f"\n❌ Test failed: {e}", file=sys.stderr)
            sys.exit(1)
        finally:
            page.close()