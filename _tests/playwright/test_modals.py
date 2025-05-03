import pytest
from playwright.sync_api import Page, expect

from test_utils import timed_test, dismiss_welcome_modal, dismiss_settings_modal

@timed_test
def test_settings_modal(page, serve_hacka_re):
    """Test that the settings modal opens and contains expected elements."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if already open
    dismiss_settings_modal(page)
    
    # Click the settings button with strict timeout
    settings_button = page.locator("#settings-btn")
    settings_button.click(timeout=1000)
    
    # Check that the settings modal is visible
    settings_modal = page.locator("#settings-modal")
    expect(settings_modal).to_be_visible()
    
    # Check that the settings form is visible
    settings_form = page.locator("#settings-form")
    expect(settings_form).to_be_visible()
    
    # Check that the API provider dropdown is visible
    api_provider = page.locator("#base-url-select")
    expect(api_provider).to_be_visible()
    
    # Check that the model select dropdown is visible
    model_select = page.locator("#model-select")
    expect(model_select).to_be_visible()
    
    # Check that the system prompt textarea is visible
    system_prompt = page.locator("#system-prompt")
    expect(system_prompt).to_be_visible()
    
    # Close the settings modal
    close_button = page.locator("#close-settings")
    close_button.click()
    
    # Check that the settings modal is no longer visible
    expect(settings_modal).not_to_be_visible()

@timed_test
def test_prompts_modal(page, serve_hacka_re):
    """Test that the prompts modal opens and contains expected elements."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Click the prompts button
    prompts_button = page.locator("#prompts-btn")
    prompts_button.click()
    
    # Check that the prompts modal is visible
    prompts_modal = page.locator("#prompts-modal")
    expect(prompts_modal).to_be_visible()
    
    # Check that the prompts list container is visible
    prompts_list = page.locator("#prompts-list")
    expect(prompts_list).to_be_visible()
    
    # Close the prompts modal
    close_button = page.locator("#close-prompts-modal")
    close_button.click()
    
    # Check that the prompts modal is no longer visible
    expect(prompts_modal).not_to_be_visible()

@timed_test
def test_share_modal(page, serve_hacka_re):
    """Test that the share modal opens and contains expected elements."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Click the share button
    share_button = page.locator("#share-btn")
    share_button.click()
    
    # Wait for the share modal to become visible
    page.wait_for_selector("#share-modal", state="visible", timeout=5000)
    
    # Check that the share modal is visible
    share_modal = page.locator("#share-modal")
    expect(share_modal).to_be_visible()
    
    # Check that the share form is visible
    share_form = page.locator("#share-form")
    expect(share_form).to_be_visible()
    
    # Check that the password input is visible
    password_input = page.locator("#share-password")
    expect(password_input).to_be_visible()
    
    # Check that the share options are visible
    share_options = page.locator(".share-options")
    expect(share_options).to_be_visible()
    
    # Close the share modal
    close_button = page.locator("#close-share-modal")
    close_button.click()
    
    # Check that the share modal is no longer visible
    expect(share_modal).not_to_be_visible()
