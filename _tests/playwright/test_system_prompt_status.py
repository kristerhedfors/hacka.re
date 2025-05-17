import pytest
from playwright.sync_api import expect

from test_utils import dismiss_welcome_modal

def test_system_prompt_status(page):
    """Test that the system prompt status message updates correctly."""
    # Navigate to the page
    page.goto("http://localhost:8000")
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Wait for the page to load
    page.wait_for_selector("#settings-btn")
    
    # Open settings modal
    page.click("#settings-btn")
    
    # Open prompts modal
    page.click("#open-prompts-config")
    
    # Wait for the prompts modal to be visible
    page.wait_for_selector(".prompts-container")
    
    # Verify the system prompt status message exists
    status_message = page.locator(".system-prompt-status")
    expect(status_message).to_be_visible()
    
    # Get all default prompts
    default_prompts = page.locator(".default-prompts-header")
    
    # Expand default prompts section if it exists
    if default_prompts.count() > 0:
        default_prompts.first.click()
        
        # Wait for the default prompts list to be visible
        page.wait_for_selector(".default-prompts-list")
        
        # Get all checkboxes in the default prompts section
        checkboxes = page.locator(".default-prompt-item .prompt-item-checkbox")
        
        # Uncheck all prompts first to ensure we start with no prompts selected
        for i in range(checkboxes.count()):
            if checkboxes.nth(i).is_checked():
                checkboxes.nth(i).click()
        
        # Verify status message shows "No system prompt is active"
        expect(status_message).to_have_text("No system prompt is active")
        
        # Check the first prompt
        if checkboxes.count() > 0:
            checkboxes.first.click()
            
            # Verify status message shows "1 system prompt component checked and active"
            expect(status_message).to_have_text("1 system prompt component checked and active")
            
            # Uncheck the prompt
            checkboxes.first.click()
            
            # Verify status message shows "No system prompt is active" again
            expect(status_message).to_have_text("No system prompt is active")
    else:
        # If no default prompts, check for user-created prompts
        user_prompts = page.locator(".prompt-item:not(.default-prompt-item)")
        
        # Uncheck all prompts first
        for i in range(user_prompts.count()):
            checkbox = user_prompts.nth(i).locator(".prompt-item-checkbox")
            if checkbox.is_checked():
                checkbox.click()
        
        # Verify status message shows "No system prompt is active"
        expect(status_message).to_have_text("No system prompt is active")
        
        # Check the first prompt if any exist
        if user_prompts.count() > 0:
            user_prompts.first.locator(".prompt-item-checkbox").click()
            
            # Verify status message shows "1 system prompt component checked and active"
            expect(status_message).to_have_text("1 system prompt component checked and active")
            
            # Uncheck the prompt
            user_prompts.first.locator(".prompt-item-checkbox").click()
            
            # Verify status message shows "No system prompt is active" again
            expect(status_message).to_have_text("No system prompt is active")
    
    # Close the prompts modal
    page.click("#close-prompts-modal")
