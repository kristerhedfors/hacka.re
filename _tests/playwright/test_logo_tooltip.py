import pytest
from playwright.sync_api import Page, expect
from test_utils import screenshot_with_markdown, dismiss_welcome_modal, dismiss_settings_modal

def test_heart_logo_tooltip(page: Page, serve_hacka_re):
    """Test that the heart logo modal appears when clicking on various elements."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if present
    dismiss_settings_modal(page)
    
    # Take a screenshot of the initial state
    screenshot_with_markdown(page, "heart_logo_tooltip_initial", {
        "Status": "Initial state before clicking",
        "Component": "Heart Logo Modal"
    })
    
    # Check that the logo info modal is initially hidden
    logo_modal = page.locator("#logo-info-modal")
    expect(logo_modal).not_to_be_visible()
    
    # Test clicking on the heart logo
    heart_logo = page.locator(".heart-logo")
    expect(heart_logo).to_be_visible()
    
    # Click on the heart logo
    heart_logo.click()
    
    # Check that the modal is now visible
    expect(logo_modal).to_be_visible()
    
    # Take a screenshot after clicking the heart logo
    screenshot_with_markdown(page, "heart_logo_tooltip_after_heart_click", {
        "Status": "After clicking heart logo",
        "Component": "Heart Logo Modal",
        "Modal Active": "Yes"
    })
    
    # Close the modal by clicking the close button
    close_button = page.locator("#close-logo-info-modal")
    close_button.click()
    
    # Check that the modal is hidden again
    expect(logo_modal).not_to_be_visible()
    
    # Test clicking on the logo text
    logo_text = page.locator(".logo-text")
    expect(logo_text).to_be_visible()
    
    # Click on the logo text
    logo_text.click()
    
    # Check that the modal is now visible
    expect(logo_modal).to_be_visible()
    
    # Take a screenshot after clicking the logo text
    screenshot_with_markdown(page, "heart_logo_tooltip_after_logo_text_click", {
        "Status": "After clicking logo text",
        "Component": "Heart Logo Modal",
        "Modal Active": "Yes"
    })
    
    # Close the modal by clicking outside
    page.click("#logo-info-modal", position={"x": 10, "y": 10})
    
    # Check that the modal is hidden again
    expect(logo_modal).not_to_be_visible()
    
    # Test clicking on the tagline
    tagline = page.locator(".tagline")
    expect(tagline).to_be_visible()
    
    # Click on the tagline
    tagline.click()
    
    # Check that the modal is now visible
    expect(logo_modal).to_be_visible()
    
    # Take a screenshot after clicking the tagline
    screenshot_with_markdown(page, "heart_logo_tooltip_after_tagline_click", {
        "Status": "After clicking tagline",
        "Component": "Heart Logo Modal",
        "Modal Active": "Yes"
    })
    
    # Close the modal by pressing Escape
    page.keyboard.press("Escape")
    
    # Check that the modal is hidden again
    expect(logo_modal).not_to_be_visible()
    
    # Test clicking on the serverless GPTs text if it exists
    serverless_gpts = page.locator(".serverless-gpts")
    if serverless_gpts.count() > 0:
        # Click on the serverless GPTs text
        serverless_gpts.click()
        
        # Check that the modal is now visible
        expect(logo_modal).to_be_visible()
        
        # Take a screenshot after clicking the serverless GPTs text
        screenshot_with_markdown(page, "heart_logo_tooltip_after_serverless_gpts_click", {
            "Status": "After clicking serverless GPTs text",
            "Component": "Heart Logo Modal",
            "Modal Active": "Yes"
        })
        
        # Close the modal by clicking the close button
        close_button.click()
        
        # Check that the modal is hidden again
        expect(logo_modal).not_to_be_visible()
    else:
        print("Serverless GPTs text not found, skipping this part of the test")
        screenshot_with_markdown(page, "heart_logo_tooltip_no_serverless_gpts", {
            "Status": "Serverless GPTs text not found",
            "Component": "Heart Logo Modal",
            "Modal Active": "No"
        })
