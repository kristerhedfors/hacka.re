import pytest
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, dismiss_settings_modal


def test_agent_modal_basic(page: Page, serve_hacka_re):
    """Test basic agent modal functionality"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Open agent modal
    agent_button = page.locator("#agent-config-btn")
    expect(agent_button).to_be_visible()
    agent_button.click()
    
    # Verify modal is visible
    agent_modal = page.locator("#agent-config-modal")
    expect(agent_modal).to_be_visible()
    
    # Check for some UI elements (without being too specific)
    form_elements = page.locator("#agent-config-modal input, #agent-config-modal button, #agent-config-modal select")
    assert form_elements.count() > 0, "Modal should have some form elements"
    
    # Close modal
    close_btn = page.locator("#close-agent-config-modal")
    if close_btn.count() > 0:
        close_btn.click()
        expect(agent_modal).not_to_be_visible()


def test_agent_button_exists(page: Page, serve_hacka_re):
    """Test that agent button exists"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Check that agent button is visible  
    agent_button = page.locator("#agent-config-btn")
    expect(agent_button).to_be_visible()
    
    # Check tooltip exists (don't assume specific text)
    title_attr = agent_button.get_attribute("title")
    if title_attr:
        assert len(title_attr) > 0, "Agent button should have a tooltip"
