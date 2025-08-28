"""Test that tooltips appear below header icons"""
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal
import time


def test_tooltip_below_icons(page: Page, serve_hacka_re):
    """Test that tooltips appear below header icons and not above"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Test each button to ensure tooltip appears below
    buttons_to_test = [
        'agent-config-btn',
        'copy-chat-btn', 
        'mcp-servers-btn',
        'function-btn',
        'rag-btn',
        'prompts-btn',
        'share-btn',
        'theme-toggle-btn',
        'settings-btn'
    ]
    
    for button_id in buttons_to_test:
        button = page.locator(f"#{button_id}")
        expect(button).to_be_visible()
        
        # Get button position
        button_box = button.bounding_box()
        assert button_box, f"Could not get bounding box for {button_id}"
        
        # Hover to show tooltip
        button.hover()
        
        # Wait a bit for tooltip transition
        page.wait_for_timeout(300)
        
        # Get tooltip element
        tooltip = button.locator(".mini-tooltip")
        expect(tooltip).to_be_visible()
        
        # Get tooltip position
        tooltip_box = tooltip.bounding_box()
        assert tooltip_box, f"Could not get bounding box for tooltip of {button_id}"
        
        # Check that tooltip top is below button bottom
        assert tooltip_box['y'] > button_box['y'] + button_box['height'], \
            f"Tooltip for {button_id} is not below the button. Button bottom: {button_box['y'] + button_box['height']}, Tooltip top: {tooltip_box['y']}"
        
        print(f"✅ {button_id}: Tooltip correctly positioned below (button bottom: {button_box['y'] + button_box['height']:.1f}, tooltip top: {tooltip_box['y']:.1f})")
        
        # Move mouse away to hide tooltip
        page.mouse.move(0, 0)
        page.wait_for_timeout(100)