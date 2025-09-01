import pytest
from playwright.sync_api import Page, expect
from test_utils import screenshot_with_markdown, dismiss_welcome_modal

def test_input_field_scroll_behavior(page: Page, serve_hacka_re):
    """Test that focusing the input field doesn't scroll past the footer."""
    # Navigate to the page
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if present
    # Take a screenshot of the initial state
    screenshot_with_markdown(page, "input_field_scroll_initial.png", {
        "Status": "Initial page load",
        "Test": "Input field scroll behavior",
        "Description": "Checking that input field focus doesn't scroll past the footer"
    })
    
    # Get the footer element for position reference
    footer = page.locator("footer")
    expect(footer).to_be_visible()
    
    # Get the initial position of the footer
    footer_box = footer.bounding_box()
    initial_footer_y = footer_box["y"]
    
    # Focus the input field
    input_field = page.locator("#message-input")
    input_field.scroll_into_view_if_needed()
    input_field.click()
    
    # Wait a moment for any scrolling to complete (the mobile-utils.js has a 300ms timeout)
    page.wait_for_timeout(500)
    
    # Take a screenshot after focusing the input field
    screenshot_with_markdown(page, "input_field_scroll_after_focus.png", {
        "Status": "After focusing input field",
        "Test": "Input field scroll behavior",
        "Description": "The page should not scroll past the footer"
    })
    
    # Get the new position of the footer
    footer_box_after = footer.bounding_box()
    after_focus_footer_y = footer_box_after["y"]
    
    # Check if the footer is still visible in the viewport
    viewport_height = page.viewport_size["height"]
    
    # Take a screenshot with debug information about the footer position
    screenshot_with_markdown(page, "input_field_scroll_footer_position.png", {
        "Status": "Checking footer position",
        "Test": "Input field scroll behavior",
        "Initial Footer Y": f"{initial_footer_y}px",
        "After Focus Footer Y": f"{after_focus_footer_y}px",
        "Viewport Height": f"{viewport_height}px",
        "Footer Visible": str(after_focus_footer_y < viewport_height)
    })
    
    # Verify that the footer is still visible or at least not scrolled far below the viewport
    # We allow some scrolling, but not too much past the footer
    assert after_focus_footer_y < viewport_height + 100, "Page scrolled too far past the footer"
    
    # Type some text to ensure the input field is working
    input_field.type("Test message")
    
    # Take a final screenshot
    screenshot_with_markdown(page, "input_field_scroll_with_text.png", {
        "Status": "After typing text",
        "Test": "Input field scroll behavior",
        "Description": "Input field should be functional and page should not scroll excessively"
    })

def test_input_field_scroll_safari_emulation(page: Page, serve_hacka_re):
    """Test input field scroll behavior with Safari emulation."""
    # Configure the context to emulate Safari on iOS
    page.context.add_cookies([{
        "name": "safari-emulation",
        "value": "true",
        "url": serve_hacka_re,
    }])
    
    # Set Safari user agent
    page.set_extra_http_headers({
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1"
    })
    
    # Navigate to the page
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if present
    # Take a screenshot of the initial state with Safari emulation
    screenshot_with_markdown(page, "safari_input_field_scroll_initial.png", {
        "Status": "Initial page load with Safari emulation",
        "Test": "Safari input field scroll behavior",
        "Description": "Checking that input field focus doesn't scroll past the footer in Safari"
    })
    
    # Get the footer element for position reference
    footer = page.locator("footer")
    expect(footer).to_be_visible()
    
    # Get the initial position of the footer
    footer_box = footer.bounding_box()
    initial_footer_y = footer_box["y"]
    
    # Focus the input field
    input_field = page.locator("#message-input")
    input_field.scroll_into_view_if_needed()
    input_field.click()
    
    # Wait a moment for any scrolling to complete (the mobile-utils.js has a 300ms timeout)
    page.wait_for_timeout(500)
    
    # Take a screenshot after focusing the input field
    screenshot_with_markdown(page, "safari_input_field_scroll_after_focus.png", {
        "Status": "After focusing input field in Safari",
        "Test": "Safari input field scroll behavior",
        "Description": "The page should not scroll past the footer"
    })
    
    # Get the new position of the footer
    footer_box_after = footer.bounding_box()
    after_focus_footer_y = footer_box_after["y"]
    
    # Check if the footer is still visible in the viewport
    viewport_height = page.viewport_size["height"]
    
    # Take a screenshot with debug information about the footer position
    screenshot_with_markdown(page, "safari_input_field_scroll_footer_position.png", {
        "Status": "Checking footer position in Safari",
        "Test": "Safari input field scroll behavior",
        "Initial Footer Y": f"{initial_footer_y}px",
        "After Focus Footer Y": f"{after_focus_footer_y}px",
        "Viewport Height": f"{viewport_height}px",
        "Footer Visible": str(after_focus_footer_y < viewport_height)
    })
    
    # Verify that the footer is still visible or at least not scrolled far below the viewport
    # We allow some scrolling, but not too much past the footer
    assert after_focus_footer_y < viewport_height + 100, "Page scrolled too far past the footer in Safari"
    
    # Type some text to ensure the input field is working
    input_field.type("Test message in Safari")
    
    # Take a final screenshot
    screenshot_with_markdown(page, "safari_input_field_scroll_with_text.png", {
        "Status": "After typing text in Safari",
        "Test": "Safari input field scroll behavior",
        "Description": "Input field should be functional and page should not scroll excessively"
    })
