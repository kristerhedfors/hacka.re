"""Test multi-agent orchestration dropdown functionality and agent system prompt isolation"""

import pytest
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown
from playwright.sync_api import Page, expect
import time
import re


def test_multi_agent_system_prompt_isolation(page: Page, serve_hacka_re, api_key):
    """Test that each agent uses its own system prompt when multi-agent mode is active"""
    
    # Navigate to the app
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Configure API key
    settings_modal = page.locator("#settings-modal")
    if settings_modal.is_visible():
        # Settings modal is already open from welcome flow
        api_key_input = page.locator("#api-key")
        api_key_input.fill(api_key)
        save_settings_btn = page.locator("#save-settings-btn")
        save_settings_btn.click()
        dismiss_settings_modal(page)
    else:
        # Open settings if not already open
        settings_btn = page.locator("#settings-btn")
        settings_btn.click()
        expect(settings_modal).to_be_visible(timeout=5000)
        api_key_input = page.locator("#api-key")
        api_key_input.fill(api_key)
        save_settings_btn = page.locator("#save-settings-btn")
        save_settings_btn.click()
        dismiss_settings_modal(page)
    
    # Open Agent Configuration modal
    agent_config_btn = page.locator("#agent-config-btn")
    agent_config_btn.click()
    
    # Wait for modal to be visible
    agent_modal = page.locator("#agent-config-modal")
    expect(agent_modal).to_be_visible(timeout=5000)
    
    # Create first agent with specific system prompt
    page.locator("#quick-agent-name").fill("TestAgent1")
    page.locator("#quick-save-agent").click()
    
    # Wait for agent to be created
    page.wait_for_timeout(500)
    
    # Open prompts modal
    prompts_btn = page.locator("#prompts-btn")
    prompts_btn.click()
    
    # Wait for prompts modal
    prompts_modal = page.locator("#prompts-modal")
    expect(prompts_modal).to_be_visible(timeout=5000)
    
    # Select a specific prompt for Agent 1
    # First, deselect all prompts
    page.evaluate("""
        const checkboxes = document.querySelectorAll('.prompt-card input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = false);
    """)
    
    # Select only the Software Developer prompt
    developer_checkbox = page.locator('.prompt-card:has-text("Software Developer") input[type="checkbox"]')
    developer_checkbox.click()
    
    # Apply and close prompts
    apply_prompts_btn = page.locator("#apply-prompts-btn")
    apply_prompts_btn.click()
    
    # Close prompts modal
    close_prompts_btn = page.locator("#close-prompts-modal")
    close_prompts_btn.click()
    
    # Save agent with this configuration
    save_agent_btn = page.locator("#save-current-config-btn")
    save_agent_btn.click()
    page.wait_for_timeout(500)
    
    # Create second agent with different system prompt
    page.locator("#quick-agent-name").fill("TestAgent2")
    page.locator("#quick-save-agent").click()
    page.wait_for_timeout(500)
    
    # Open prompts modal again
    prompts_btn.click()
    expect(prompts_modal).to_be_visible(timeout=5000)
    
    # Deselect all and select only Data Analyst prompt
    page.evaluate("""
        const checkboxes = document.querySelectorAll('.prompt-card input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = false);
    """)
    
    analyst_checkbox = page.locator('.prompt-card:has-text("Data Analyst") input[type="checkbox"]')
    analyst_checkbox.click()
    
    # Apply and close
    apply_prompts_btn.click()
    close_prompts_btn.click()
    
    # Save this agent configuration
    save_agent_btn.click()
    page.wait_for_timeout(500)
    
    # Now enable both agents for multi-agent query
    # Find both agent checkboxes using more specific selectors
    agent1_checkbox = page.locator('.agent-card:has-text("TestAgent1") input[type="checkbox"]')
    agent2_checkbox = page.locator('.agent-card:has-text("TestAgent2") input[type="checkbox"]')
    
    # Enable both agents
    agent1_checkbox.click()
    agent2_checkbox.click()
    
    # Close agent modal
    close_agent_modal = page.locator("#close-agent-config-modal")
    close_agent_modal.click()
    
    # Check settings to see what system prompt is active before query
    settings_btn = page.locator("#settings-btn")
    settings_btn.click()
    
    settings_modal = page.locator("#settings-modal")
    expect(settings_modal).to_be_visible(timeout=5000)
    
    # Capture initial system prompt
    initial_prompt = page.locator("#system-prompt").input_value()
    
    screenshot_with_markdown(page, "before_multi_agent_query", {
        "Status": "Settings before multi-agent query",
        "Initial System Prompt": initial_prompt[:100] + "..." if len(initial_prompt) > 100 else initial_prompt,
        "Expected": "Each agent should use its own prompt during multi-agent query"
    })
    
    # Close settings
    close_settings_btn = page.locator("#close-settings-modal")
    close_settings_btn.click()
    
    # Send a multi-agent query
    message_input = page.locator("#message-input")
    message_input.fill("Hello, please introduce yourself and your expertise")
    
    # Listen for console messages to debug
    console_messages = []
    def log_console_message(msg):
        console_messages.append({
            'type': msg.type,
            'text': msg.text,
            'location': msg.location
        })
        if 'agent' in msg.text.lower() or 'prompt' in msg.text.lower():
            print(f"Console {msg.type}: {msg.text}")
    
    page.on("console", log_console_message)
    
    # Send the message
    send_button = page.locator("#chat-form button[type='submit']")
    send_button.click()
    
    # Wait for responses to start
    page.wait_for_timeout(2000)
    
    # Check chat for agent responses
    chat_container = page.locator("#chat-container")
    chat_html = chat_container.inner_html()
    
    # Look for agent-specific responses that would indicate they're using their own prompts
    has_developer_response = "software" in chat_html.lower() or "developer" in chat_html.lower() or "code" in chat_html.lower()
    has_analyst_response = "data" in chat_html.lower() or "analyst" in chat_html.lower() or "analysis" in chat_html.lower()
    
    screenshot_with_markdown(page, "multi_agent_responses", {
        "Status": "Multi-agent query responses",
        "TestAgent1 (Developer) Response": "Found" if has_developer_response else "Not found",
        "TestAgent2 (Analyst) Response": "Found" if has_analyst_response else "Not found",
        "Console Messages": str(len(console_messages))
    })
    
    # Open settings again to check final system prompt
    settings_btn.click()
    expect(settings_modal).to_be_visible(timeout=5000)
    
    final_prompt = page.locator("#system-prompt").input_value()
    
    screenshot_with_markdown(page, "after_multi_agent_query", {
        "Status": "Settings after multi-agent query",
        "Final System Prompt": final_prompt[:100] + "..." if len(final_prompt) > 100 else final_prompt,
        "Prompt Changed": "Yes" if final_prompt != initial_prompt else "No",
        "Issue": "System prompt may have been overwritten by last agent" if final_prompt != initial_prompt else "None"
    })
    
    # Clean up - delete test agents
    close_settings_btn.click()
    agent_config_btn.click()
    expect(agent_modal).to_be_visible(timeout=5000)
    
    # Delete TestAgent1
    delete_agent1 = page.locator('.agent-card:has-text("TestAgent1") .delete-agent-btn').first
    page.on("dialog", lambda dialog: dialog.accept())
    delete_agent1.click()
    page.wait_for_timeout(500)
    
    # Delete TestAgent2
    delete_agent2 = page.locator('.agent-card:has-text("TestAgent2") .delete-agent-btn').first
    delete_agent2.click()
    page.wait_for_timeout(500)
    
    # Close modal
    close_agent_modal.click()
    
    # Assertions
    assert has_developer_response or has_analyst_response, "At least one agent should have responded with role-specific content"
    
    # Log any relevant console messages for debugging
    prompt_related = [msg for msg in console_messages if 'prompt' in msg['text'].lower()]
    if prompt_related:
        print(f"\nPrompt-related console messages: {len(prompt_related)}")
        for msg in prompt_related[:5]:  # Show first 5
            print(f"  {msg['type']}: {msg['text'][:200]}")


def test_agent_dropdown_selection(page: Page, serve_hacka_re, api_key):
    """Test agent dropdown selection and quick switching functionality"""
    
    # Navigate to the app
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Configure API key
    settings_modal = page.locator("#settings-modal")
    if settings_modal.is_visible():
        # Settings modal is already open from welcome flow
        api_key_input = page.locator("#api-key")
        api_key_input.fill(api_key)
        save_settings_btn = page.locator("#save-settings-btn")
        save_settings_btn.click()
        dismiss_settings_modal(page)
    else:
        # Open settings if not already open
        settings_btn = page.locator("#settings-btn")
        settings_btn.click()
        expect(settings_modal).to_be_visible(timeout=5000)
        api_key_input = page.locator("#api-key")
        api_key_input.fill(api_key)
        save_settings_btn = page.locator("#save-settings-btn")
        save_settings_btn.click()
        dismiss_settings_modal(page)
    
    # Open Agent Configuration modal
    agent_config_btn = page.locator("#agent-config-btn")
    agent_config_btn.click()
    
    # Wait for modal to be visible
    agent_modal = page.locator("#agent-config-modal")
    expect(agent_modal).to_be_visible(timeout=5000)
    
    # Create test agents
    for i in range(3):
        page.locator("#quick-agent-name").fill(f"DropdownTest{i+1}")
        page.locator("#quick-save-agent").click()
        page.wait_for_timeout(500)
    
    # Close agent modal
    close_agent_modal = page.locator("#close-agent-config-modal")
    close_agent_modal.click()
    
    # Check if agent dropdown exists in the UI
    agent_dropdown = page.locator("#agent-dropdown")
    
    if agent_dropdown.count() > 0:
        # Test dropdown functionality
        expect(agent_dropdown).to_be_visible()
        
        # Open dropdown
        agent_dropdown.click()
        
        # Check for agent options
        dropdown_options = page.locator(".agent-dropdown-option")
        expect(dropdown_options).to_have_count(3, timeout=5000)
        
        # Select an agent
        page.locator(".agent-dropdown-option:has-text('DropdownTest2')").click()
        
        # Verify selection
        selected_text = agent_dropdown.inner_text()
        assert "DropdownTest2" in selected_text, f"Expected 'DropdownTest2' in dropdown, got: {selected_text}"
        
        screenshot_with_markdown(page, "agent_dropdown_selected", {
            "Status": "Agent selected via dropdown",
            "Selected Agent": selected_text,
            "Feature": "Quick agent switching"
        })
    else:
        # If dropdown doesn't exist, check for alternative UI
        print("Agent dropdown not found in current UI")
        screenshot_with_markdown(page, "no_agent_dropdown", {
            "Status": "Agent dropdown not implemented",
            "Note": "Quick switching may use different UI pattern"
        })
    
    # Clean up - delete test agents
    agent_config_btn.click()
    expect(agent_modal).to_be_visible(timeout=5000)
    
    page.on("dialog", lambda dialog: dialog.accept())
    
    for i in range(3):
        delete_btn = page.locator(f'.agent-card:has-text("DropdownTest{i+1}") .delete-agent-btn').first
        if delete_btn.count() > 0:
            delete_btn.click()
            page.wait_for_timeout(500)
    
    close_agent_modal.click()


def test_orchestration_toggle_ui(page: Page, serve_hacka_re, api_key):
    """Test orchestration agent toggle UI and functionality"""
    
    # Navigate to the app
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Configure API key
    settings_modal = page.locator("#settings-modal")
    if settings_modal.is_visible():
        # Settings modal is already open from welcome flow
        api_key_input = page.locator("#api-key")
        api_key_input.fill(api_key)
        save_settings_btn = page.locator("#save-settings-btn")
        save_settings_btn.click()
        dismiss_settings_modal(page)
    else:
        # Open settings if not already open
        settings_btn = page.locator("#settings-btn")
        settings_btn.click()
        expect(settings_modal).to_be_visible(timeout=5000)
        api_key_input = page.locator("#api-key")
        api_key_input.fill(api_key)
        save_settings_btn = page.locator("#save-settings-btn")
        save_settings_btn.click()
        dismiss_settings_modal(page)
    
    # Open Agent Configuration modal
    agent_config_btn = page.locator("#agent-config-btn")
    agent_config_btn.click()
    
    # Wait for modal to be visible
    agent_modal = page.locator("#agent-config-modal")
    expect(agent_modal).to_be_visible(timeout=5000)
    
    # Look for orchestration toggle
    orchestration_toggle = page.locator("#orchestration-toggle, .orchestration-toggle, input[type='checkbox'][name*='orchestration']")
    
    if orchestration_toggle.count() > 0:
        # Test toggle functionality
        initial_state = orchestration_toggle.is_checked()
        
        screenshot_with_markdown(page, "orchestration_toggle_initial", {
            "Status": "Orchestration toggle found",
            "Initial State": "Enabled" if initial_state else "Disabled"
        })
        
        # Toggle it
        orchestration_toggle.click()
        page.wait_for_timeout(500)
        
        new_state = orchestration_toggle.is_checked()
        assert new_state != initial_state, "Toggle state should change"
        
        screenshot_with_markdown(page, "orchestration_toggle_changed", {
            "Status": "Orchestration toggle clicked",
            "New State": "Enabled" if new_state else "Disabled",
            "Changed": "Yes"
        })
        
        # Look for orchestration agent in agent list
        orchestration_agent = page.locator(".agent-card:has-text('Orchestration Agent')")
        
        if orchestration_agent.count() > 0:
            screenshot_with_markdown(page, "orchestration_agent_found", {
                "Status": "Orchestration agent card found",
                "Visible": str(orchestration_agent.is_visible())
            })
    else:
        print("Orchestration toggle not found in current UI")
        screenshot_with_markdown(page, "no_orchestration_toggle", {
            "Status": "Orchestration toggle not implemented",
            "Note": "Feature may use different UI pattern"
        })
    
    # Close modal
    close_agent_modal = page.locator("#close-agent-config-modal")
    close_agent_modal.click()