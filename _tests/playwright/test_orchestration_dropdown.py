"""
Tests for the Orchestration Dropdown system
"""

import pytest
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown


def test_orchestration_dropdown_appears_in_modal(page: Page, serve_hacka_re):
    """Test that the orchestration dropdown appears in the agent modal"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Open agent modal directly
    agent_config_button = page.locator("#agent-config-btn") 
    expect(agent_config_button).to_be_visible()
    agent_config_button.click()
    
    # Wait for modal to appear
    agent_modal = page.locator("#agent-config-modal")
    expect(agent_modal).to_be_visible()
    
    # Check for orchestration section
    orchestration_section = page.locator(".agent-orchestration-section")
    expect(orchestration_section).to_be_visible()
    
    # Verify orchestration section content
    section_title = orchestration_section.locator("h3")
    expect(section_title).to_contain_text("Agent Orchestration")
    
    # Check dropdown exists
    orchestration_dropdown = page.locator("#orchestration-mode")
    expect(orchestration_dropdown).to_be_visible()
    
    # Verify dropdown is initially disabled (no active agents)
    expect(orchestration_dropdown).to_be_disabled()
    
    # Check status text
    status_text = page.locator("#orchestration-status-text")
    expect(status_text).to_be_visible()
    expect(status_text).to_contain_text("Activate agents to enable orchestration")
    
    screenshot_with_markdown(page, "orchestration_dropdown_in_modal", {
        "Status": "Orchestration dropdown visible in modal",
        "Component": "Agent Management Modal",
        "Feature": "Orchestration dropdown section",
        "Dropdown State": "Disabled (no active agents)"
    })


def test_orchestration_dropdown_options(page: Page, serve_hacka_re):
    """Test that the orchestration dropdown has correct options"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Open agent modal
    page.locator("#agent-config-btn").click()
    
    # Wait for modal and find dropdown
    page.wait_for_selector("#orchestration-mode", state="visible")
    orchestration_dropdown = page.locator("#orchestration-mode")
    
    # Check all options exist
    options = orchestration_dropdown.locator("option")
    expect(options).to_have_count(3)
    
    # Verify option values and text
    none_option = orchestration_dropdown.locator("option[value='none']")
    expect(none_option).to_contain_text("No orchestration")
    
    auto_option = orchestration_dropdown.locator("option[value='auto']")
    expect(auto_option).to_contain_text("Auto-orchestration")
    
    manual_option = orchestration_dropdown.locator("option[value='manual']") 
    expect(manual_option).to_contain_text("Manual coordination")
    
    screenshot_with_markdown(page, "orchestration_dropdown_options", {
        "Status": "Orchestration dropdown options verified",
        "Component": "Orchestration Dropdown",
        "Options": "none, auto, manual"
    })


def test_orchestration_dropdown_styling(page: Page, serve_hacka_re):
    """Test that the orchestration section has proper styling"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Open agent modal
    page.locator("#agent-config-btn").click()
    
    # Wait for modal and find orchestration section
    page.wait_for_selector(".agent-orchestration-section", state="visible")
    orchestration_section = page.locator(".agent-orchestration-section")
    
    # Verify section has distinctive styling
    expect(orchestration_section).to_have_css("border", "2px solid rgb(79, 70, 229)")
    
    # Check status text has proper styling class
    status_text = page.locator("#orchestration-status-text")
    expect(status_text).to_have_class("status-inactive")
    
    # Check dropdown is styled correctly when disabled
    orchestration_dropdown = page.locator("#orchestration-mode")
    expect(orchestration_dropdown).to_be_disabled()
    
    screenshot_with_markdown(page, "orchestration_section_styling", {
        "Status": "Orchestration section styling verified",
        "Component": "Orchestration Section", 
        "Styling": "Purple border, disabled dropdown, inactive status"
    })


def test_orchestration_status_updates(page: Page, serve_hacka_re):
    """Test that orchestration status updates correctly"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Open agent modal
    page.locator("#agent-config-btn").click()
    
    # Wait for modal to appear
    page.wait_for_selector(".agent-orchestration-section", state="visible")
    
    # Initially should be inactive
    status_text = page.locator("#orchestration-status-text")
    expect(status_text).to_contain_text("Activate agents to enable orchestration")
    expect(status_text).to_have_class("status-inactive")
    
    # Dropdown should be disabled
    orchestration_dropdown = page.locator("#orchestration-mode")
    expect(orchestration_dropdown).to_be_disabled()
    
    screenshot_with_markdown(page, "orchestration_status_inactive", {
        "Status": "Orchestration status showing inactive state",
        "Component": "Status Display",
        "State": "No active agents, dropdown disabled"
    })


def test_orchestration_dropdown_accessibility(page: Page, serve_hacka_re):
    """Test that the orchestration dropdown is accessible"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Open agent modal
    page.locator("#agent-config-btn").click()
    
    # Wait for modal and find orchestration elements
    page.wait_for_selector("#orchestration-mode", state="visible")
    
    # Check label association
    label = page.locator("label[for='orchestration-mode']")
    expect(label).to_be_visible()
    expect(label).to_contain_text("Orchestration Mode")
    
    # Check dropdown has proper attributes
    orchestration_dropdown = page.locator("#orchestration-mode")
    expect(orchestration_dropdown).to_have_attribute("id", "orchestration-mode")
    
    screenshot_with_markdown(page, "orchestration_accessibility", {
        "Status": "Orchestration dropdown accessibility verified",
        "Component": "Form Accessibility",
        "Features": "Label association, proper ID"
    })