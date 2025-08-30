import pytest
from playwright.sync_api import Page, expect
from test_utils import screenshot_with_markdown, dismiss_welcome_modal, dismiss_settings_modal

def test_button_tooltips(page: Page, serve_hacka_re):
    """Test that mini-tooltips appear when hovering over buttons in the upper right bar."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Also dismiss settings modal if present (to prevent interference with button hovers)
    dismiss_settings_modal(page)
    
    # Take a screenshot of the initial state
    screenshot_with_markdown(page, "button_tooltips_initial", {
        "Status": "Initial state before hovering",
        "Component": "Button Tooltips",
        "Test Phase": "Setup",
        "Action": "None"
    })
    
    # Define the buttons to test (in the upper right bar)
    buttons = [
        # Agent button removed from UI
        # {"id": "agent-config-btn", "expected_text": "Agents"},
        {"id": "function-btn", "expected_text": "Function Calling"},
        {"id": "prompts-btn", "expected_text": "System Prompts"},
        {"id": "share-btn", "expected_text": "Share"},
        {"id": "theme-toggle-btn", "expected_text": "Cycle Theme"},
        {"id": "settings-btn", "expected_text": "Settings"}
    ]
    
    # Test each button
    for button in buttons:
        button_id = button["id"]
        expected_text = button["expected_text"]
        
        # Get the button element
        button_element = page.locator(f"#{button_id}")
        button_element.scroll_into_view_if_needed()
        expect(button_element).to_be_visible()
        
        # Hover over the button
        button_element.hover()
        
        # Wait for the tooltip to appear
        # page.wait_for_timeout(500)  # TODO: Replace with proper wait condition  # Small delay to ensure tooltip is visible
        
        # Take a screenshot after hovering
        screenshot_with_markdown(page, f"button_tooltip_{button_id}_hover", {
            "Status": f"After hovering over {button_id}",
            "Component": "Button Tooltips",
            "Button": button_id,
            "Expected Text": expected_text,
            "Test Phase": "Hover",
            "Action": f"Hovered over {button_id}"
        })
        
        # Check that the tooltip is visible
        tooltip = button_element.locator(".mini-tooltip.active")
        expect(tooltip).to_be_visible()
        
        # Check that the tooltip has the correct text
        expect(tooltip).to_have_text(expected_text)
        
        # Move away from the button to hide the tooltip
        page.mouse.move(0, 0)
        # page.wait_for_timeout(500)  # TODO: Replace with proper wait condition  # Small delay to ensure tooltip is hidden
        
        # Check that the tooltip is hidden
        tooltip = button_element.locator(".mini-tooltip")
        expect(tooltip).not_to_have_class("active")
    
    # Take a final screenshot
    screenshot_with_markdown(page, "button_tooltips_final", {
        "Status": "Final state after testing all buttons",
        "Component": "Button Tooltips",
        "Test Phase": "Test Complete",
        "Action": "Tested all button tooltips"
    })
