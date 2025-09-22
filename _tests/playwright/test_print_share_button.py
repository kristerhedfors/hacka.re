"""Test the new print share link button functionality"""

import pytest
from playwright.sync_api import Page, expect

from test_utils import screenshot_with_markdown


def test_print_share_button(page: Page, serve_hacka_re, browser_name):
    """Test that the print share link button is present and functional"""

    page.goto(serve_hacka_re)

    # Close welcome modal if present
    try:
        welcome_modal = page.locator("#welcome-modal")
        if welcome_modal.is_visible():
            close_button = page.locator("#close-welcome-modal")
            if close_button.is_visible():
                close_button.click()
                page.wait_for_selector("#welcome-modal", state="hidden")
    except:
        pass

    # Open share modal
    share_btn = page.locator("#share-btn")
    expect(share_btn).to_be_visible()
    share_btn.click()

    # Check that share modal is open
    share_modal = page.locator("#share-modal")
    expect(share_modal).to_be_visible()

    # Check welcome message option (doesn't require API key)
    welcome_checkbox = page.locator("#share-welcome-message-checkbox")
    if not welcome_checkbox.is_checked():
        welcome_checkbox.click()

    # Fill in a welcome message
    welcome_input = page.locator("#share-welcome-message")
    welcome_input.fill("Test welcome message")

    # Generate a share link with minimal options
    password_input = page.locator("#share-password")
    password_input.fill("test123")

    generate_btn = page.locator("#generate-share-link-btn")
    generate_btn.click()

    # Wait for link to be generated
    page.wait_for_selector("#generated-link-container", state="visible", timeout=15000)

    # Check that all three buttons are present
    copy_btn = page.locator("#copy-generated-link")
    print_btn = page.locator("#print-share-link")

    expect(copy_btn).to_be_visible()
    expect(print_btn).to_be_visible()

    # Verify the print button has the correct icon
    print_icon = print_btn.locator("i.fa-print")
    expect(print_icon).to_be_visible()

    # Set up a listener to detect new pages (print window)
    print_window_opened = False

    def handle_popup(popup):
        nonlocal print_window_opened
        print_window_opened = True
        # Close the popup immediately to avoid leaving windows open
        popup.close()

    page.context.on("page", handle_popup)

    # Click the print button
    print_btn.click()

    # Give it a moment for the popup to open
    page.wait_for_timeout(1000)

    # Check that a popup was opened
    assert print_window_opened, "Print window should have opened"

    screenshot_with_markdown(
        page,
        f"test_print_share_button_{browser_name}_final",
        {
            "Test": "Print Share Button",
            "Browser": browser_name,
            "Status": "Print button clicked successfully",
            "Result": "Print window opened" if print_window_opened else "Print window did not open"
        }
    )

    print(f"✅ Print share button test passed - print window {'opened' if print_window_opened else 'did not open'}")