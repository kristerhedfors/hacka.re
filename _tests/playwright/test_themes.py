import pytest
from playwright.sync_api import expect

def test_theme_toggle_button_exists(page):
    """Test that the theme toggle button exists in the header."""
    page.goto("/")
    theme_toggle_btn = page.locator("#theme-toggle-btn")
    expect(theme_toggle_btn).to_be_visible()
    expect(theme_toggle_btn).to_have_attribute("title", "Change Theme")

def test_mcp_button_exists(page):
    """Test that the MCP button exists in the header."""
    page.goto("/")
    mcp_btn = page.locator("#mcp-btn")
    expect(mcp_btn).to_be_visible()
    expect(mcp_btn).to_have_attribute("title", "Model Context Protocol")

def test_theme_cycling(page):
    """Test that clicking the theme toggle button cycles through themes."""
    page.goto("/")
    
    # Get the initial theme
    initial_theme_class = page.evaluate("() => document.documentElement.className")
    
    # Click the theme toggle button
    page.click("#theme-toggle-btn")
    
    # Wait for theme change to take effect
    page.wait_for_timeout(500)
    
    # Get the new theme
    new_theme_class = page.evaluate("() => document.documentElement.className")
    
    # Verify that the theme has changed
    assert initial_theme_class != new_theme_class, "Theme did not change after clicking the toggle button"
    
    # Click again to cycle to the next theme
    page.click("#theme-toggle-btn")
    
    # Wait for theme change to take effect
    page.wait_for_timeout(500)
    
    # Get the next theme
    next_theme_class = page.evaluate("() => document.documentElement.className")
    
    # Verify that the theme has changed again
    assert new_theme_class != next_theme_class, "Theme did not change after clicking the toggle button again"

def test_mcp_modal_opens(page):
    """Test that clicking the MCP button opens the MCP modal."""
    page.goto("/")
    
    # Click the MCP button
    page.click("#mcp-btn")
    
    # Check that the MCP modal is visible
    mcp_modal = page.locator("#mcp-modal")
    expect(mcp_modal).to_be_visible()
    
    # Check that the modal has the expected title
    modal_title = page.locator("#mcp-modal .settings-header h2")
    expect(modal_title).to_have_text("Model Context Protocol (MCP)")
    
    # Close the modal
    page.click("#close-mcp-modal")
    
    # Check that the modal is no longer visible
    expect(mcp_modal).not_to_be_visible()

def test_mobile_responsive_classes(page):
    """Test that mobile responsive classes are added to the body."""
    # Set viewport to mobile size
    page.set_viewport_size({"width": 375, "height": 667})
    page.goto("/")
    
    # Wait for mobile utils to initialize
    page.wait_for_timeout(500)
    
    # Check if mobile-device class is added to body
    has_mobile_class = page.evaluate("() => document.body.classList.contains('mobile-device')")
    assert has_mobile_class, "Mobile device class not added to body"
    
    # Check if portrait class is added to body
    has_portrait_class = page.evaluate("() => document.body.classList.contains('portrait')")
    assert has_portrait_class, "Portrait class not added to body"
    
    # Reset viewport
    page.set_viewport_size({"width": 1280, "height": 720})
