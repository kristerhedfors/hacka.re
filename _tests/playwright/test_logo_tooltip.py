import pytest
from playwright.sync_api import Page, expect
from test_utils import timed_test, screenshot_with_markdown, dismiss_welcome_modal

def test_heart_logo_tooltip(page: Page, serve_hacka_re):
    """Test that the heart logo tooltip appears when clicking on various elements."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Take a screenshot of the initial state
    screenshot_with_markdown(page, "heart_logo_tooltip_initial", {
        "Status": "Initial state before clicking",
        "Component": "Heart Logo Tooltip"
    })
    
    # Check that the tooltip is initially hidden
    tooltip = page.locator(".heart-logo .tooltip")
    expect(tooltip).not_to_be_visible()
    
    # Test clicking on the heart logo
    heart_logo = page.locator(".heart-logo")
    expect(heart_logo).to_be_visible()
    
    # Click on the heart logo
    heart_logo.click()
    
    # Check that the tooltip is now visible
    expect(tooltip).to_be_visible()
    
    # Take a screenshot after clicking the heart logo
    screenshot_with_markdown(page, "heart_logo_tooltip_after_heart_click", {
        "Status": "After clicking heart logo",
        "Component": "Heart Logo Tooltip",
        "Tooltip Visible": "Yes"
    })
    
    # Close the tooltip by clicking elsewhere
    page.click("body", position={"x": 10, "y": 10})
    
    # Check that the tooltip is hidden again
    expect(tooltip).not_to_be_visible()
    
    # Test clicking on the logo text
    logo_text = page.locator(".logo-text")
    expect(logo_text).to_be_visible()
    
    # Click on the logo text
    logo_text.click()
    
    # Check that the tooltip is now visible
    expect(tooltip).to_be_visible()
    
    # Take a screenshot after clicking the logo text
    screenshot_with_markdown(page, "heart_logo_tooltip_after_logo_text_click", {
        "Status": "After clicking logo text",
        "Component": "Heart Logo Tooltip",
        "Tooltip Visible": "Yes"
    })
    
    # Close the tooltip by clicking elsewhere
    page.click("body", position={"x": 10, "y": 10})
    
    # Check that the tooltip is hidden again
    expect(tooltip).not_to_be_visible()
    
    # Test clicking on the tagline
    tagline = page.locator(".tagline")
    expect(tagline).to_be_visible()
    
    # Click on the tagline
    tagline.click()
    
    # Check that the tooltip is now visible
    expect(tooltip).to_be_visible()
    
    # Take a screenshot after clicking the tagline
    screenshot_with_markdown(page, "heart_logo_tooltip_after_tagline_click", {
        "Status": "After clicking tagline",
        "Component": "Heart Logo Tooltip",
        "Tooltip Visible": "Yes"
    })
    
    # Close the tooltip by clicking elsewhere
    page.click("body", position={"x": 10, "y": 10})
    
    # Check that the tooltip is hidden again
    expect(tooltip).not_to_be_visible()
    
    # Test clicking on the serverless GPTs text if it exists
    serverless_gpts = page.locator(".serverless-gpts")
    if serverless_gpts.count() > 0:
        # Click on the serverless GPTs text
        serverless_gpts.click()
        
        # Check that the tooltip is now visible
        expect(tooltip).to_be_visible()
        
        # Take a screenshot after clicking the serverless GPTs text
        screenshot_with_markdown(page, "heart_logo_tooltip_after_serverless_gpts_click", {
            "Status": "After clicking serverless GPTs text",
            "Component": "Heart Logo Tooltip",
            "Tooltip Visible": "Yes"
        })
        
        # Close the tooltip by clicking elsewhere
        page.click("body", position={"x": 10, "y": 10})
        
        # Check that the tooltip is hidden again
        expect(tooltip).not_to_be_visible()
    else:
        print("Serverless GPTs text not found, skipping this part of the test")
        screenshot_with_markdown(page, "heart_logo_tooltip_no_serverless_gpts", {
            "Status": "Serverless GPTs text not found",
            "Component": "Heart Logo Tooltip",
            "Tooltip Visible": "No"
        })
