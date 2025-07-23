import pytest
from playwright.sync_api import Page, expect

from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown

def test_agent_config_button_exists(page: Page, serve_hacka_re):
    """Test that the agent configuration button exists and is visible."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Also dismiss settings modal if present
    dismiss_settings_modal(page)
    
    # Check that the agent config button is visible
    agent_config_btn = page.locator("#agent-config-btn")
    expect(agent_config_btn).to_be_visible()
    
    # Take a screenshot with debug info
    screenshot_with_markdown(page, "agent_config_button", {
        "Status": "Checking agent config button visibility",
        "Button": "Agent Configuration Button",
        "Location": "Header bar (replaced copy chat button)"
    })

def test_agent_config_modal_opens(page: Page, serve_hacka_re):
    """Test that clicking the agent configuration button opens the modal."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Also dismiss settings modal if present
    dismiss_settings_modal(page)
    
    # Click the agent config button
    agent_config_btn = page.locator("#agent-config-btn")
    agent_config_btn.click()
    
    # Check that the agent config modal is visible
    agent_config_modal = page.locator("#agent-config-modal")
    expect(agent_config_modal).to_be_visible()
    
    # Take a screenshot with debug info
    screenshot_with_markdown(page, "agent_config_modal_open", {
        "Status": "After clicking agent config button",
        "Modal": "Agent Configuration Modal",
        "Expected": "Modal should be open and visible"
    })
    
    # Check that the modal has the correct title
    modal_title = page.locator("#agent-config-modal h2")
    expect(modal_title).to_have_text("Agent Modal")

def test_agent_config_modal_closes(page: Page, serve_hacka_re):
    """Test that the agent configuration modal can be closed."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Also dismiss settings modal if present
    dismiss_settings_modal(page)
    
    # Open the agent config modal
    agent_config_btn = page.locator("#agent-config-btn")
    agent_config_btn.click()
    
    # Verify modal is open
    agent_config_modal = page.locator("#agent-config-modal")
    expect(agent_config_modal).to_be_visible()
    
    # Click the close button
    close_btn = page.locator("#close-agent-config-modal")
    close_btn.click()
    
    # Check that the modal is hidden
    expect(agent_config_modal).to_be_hidden()
    
    # Take a screenshot with debug info
    screenshot_with_markdown(page, "agent_config_modal_closed", {
        "Status": "After clicking close button",
        "Modal": "Agent Configuration Modal",
        "Expected": "Modal should be hidden"
    })

def test_agent_config_modal_closes_on_outside_click(page: Page, serve_hacka_re):
    """Test that the agent configuration modal closes when clicking outside."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Also dismiss settings modal if present
    dismiss_settings_modal(page)
    
    # Open the agent config modal
    agent_config_btn = page.locator("#agent-config-btn")
    agent_config_btn.click()
    
    # Verify modal is open
    agent_config_modal = page.locator("#agent-config-modal")
    expect(agent_config_modal).to_be_visible()
    
    # Click outside the modal (on the modal backdrop)
    agent_config_modal.click()
    
    # Check that the modal is hidden
    expect(agent_config_modal).to_be_hidden()
    
    # Take a screenshot with debug info
    screenshot_with_markdown(page, "agent_config_modal_outside_click", {
        "Status": "After clicking outside modal",
        "Modal": "Agent Configuration Modal",
        "Expected": "Modal should be hidden"
    })

def test_agent_items_present(page: Page, serve_hacka_re):
    """Test that agent items (Github, Gmail, Context7) are present in the modal."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Also dismiss settings modal if present
    dismiss_settings_modal(page)
    
    # Open the agent config modal
    agent_config_btn = page.locator("#agent-config-btn")
    agent_config_btn.click()
    
    # Verify modal is open
    agent_config_modal = page.locator("#agent-config-modal")
    expect(agent_config_modal).to_be_visible()
    
    # Check for GitHub agent item
    github_agent = page.locator('[data-agent="github"]')
    expect(github_agent).to_be_visible()
    expect(github_agent.locator('h4')).to_have_text("GitHub")
    
    # Check for Gmail agent item
    gmail_agent = page.locator('[data-agent="gmail"]')
    expect(gmail_agent).to_be_visible()
    expect(gmail_agent.locator('h4')).to_have_text("Gmail")
    
    # Check for Context7 agent item 
    context7_agent = page.locator('[data-agent="context7"]')
    expect(context7_agent).to_be_visible()
    expect(context7_agent.locator('h4')).to_have_text("Context7")
    
    # Take a screenshot with debug info
    screenshot_with_markdown(page, "agent_items_present", {
        "Status": "Agent items verified",
        "Modal": "Agent Modal",
        "Agents": "GitHub, Gmail, Context7 all present"
    })

def test_agent_checkboxes_and_buttons(page: Page, serve_hacka_re):
    """Test that agent checkboxes and action buttons are functional."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Also dismiss settings modal if present
    dismiss_settings_modal(page)
    
    # Open the agent config modal
    agent_config_btn = page.locator("#agent-config-btn")
    agent_config_btn.click()
    
    # Verify modal is open
    agent_config_modal = page.locator("#agent-config-modal")
    expect(agent_config_modal).to_be_visible()
    
    # Test GitHub agent checkbox
    github_checkbox = page.locator("#agent-github-enabled")
    expect(github_checkbox).to_be_visible()
    expect(github_checkbox).not_to_be_checked()
    
    # Test GitHub agent buttons
    github_settings_btn = page.locator('[data-agent="github"].agent-settings-btn')
    expect(github_settings_btn).to_be_visible()
    
    github_delete_btn = page.locator('[data-agent="github"].agent-delete-btn')
    expect(github_delete_btn).to_be_visible()
    
    # Take a screenshot with debug info
    screenshot_with_markdown(page, "agent_controls_functional", {
        "Status": "Agent controls verified",
        "Modal": "Agent Modal", 
        "Controls": "Checkboxes and action buttons present"
    })