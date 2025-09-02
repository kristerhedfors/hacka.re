"""
Simple test to verify agent load functionality
"""
import pytest
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown
from conftest import ACTIVE_TEST_CONFIG


def test_agent_load_button_exists_and_triggers(page: Page, serve_hacka_re, api_key):
    """Test that agent load button exists and triggers expected behavior"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    # First save an agent to have something to load
    # Set API key first
    settings_btn = page.locator('#settings-btn')
    settings_btn.click()
    # page.wait_for_timeout(500)  # TODO: Replace with proper wait condition
    
    api_key_input = page.locator('#api-key-update')
    api_key_input.fill(api_key)
    
    # Set to Groq provider  
    provider_select = page.locator('#base-url-select')
    provider_select.select_option(ACTIVE_TEST_CONFIG["provider_value"])
    
    close_settings_btn = page.locator('#close-settings')
    close_settings_btn.click()
    # page.wait_for_timeout(500)  # TODO: Replace with proper wait condition
    
    # Save agent
    agent_btn = page.locator('#agent-config-btn')
    agent_btn.click()
    # page.wait_for_timeout(500)  # TODO: Replace with proper wait condition
    
    agent_name_input = page.locator('#quick-agent-name')
    agent_name_input.fill('test-load-agent')
    
    save_btn = page.locator('#quick-save-agent')
    save_btn.click()
    # page.wait_for_timeout(1500)  # TODO: Replace with proper wait condition  # Wait for save to complete
    
    screenshot_with_markdown(page, "agent_saved_for_load_test", {
        "Status": "Agent saved successfully",
        "Agent Name": "test-load-agent"
    })
    
    # Now change configuration
    close_agent_btn = page.locator('#close-agent-config-modal')
    close_agent_btn.click()
    # page.wait_for_timeout(500)  # TODO: Replace with proper wait condition
    
    # Change to OpenAI
    settings_btn.click()
    # page.wait_for_timeout(500)  # TODO: Replace with proper wait condition
    provider_select.select_option('openai')
    close_settings_btn.click()
    # page.wait_for_timeout(500)  # TODO: Replace with proper wait condition
    
    # Verify it changed to OpenAI
    settings_btn.click()
    # page.wait_for_timeout(500)  # TODO: Replace with proper wait condition
    current_provider = provider_select.input_value()
    assert current_provider == 'openai', f"Expected 'openai', got '{current_provider}'"
    close_settings_btn.click()
    # page.wait_for_timeout(500)  # TODO: Replace with proper wait condition
    
    screenshot_with_markdown(page, "config_changed_to_openai", {
        "Status": "Configuration changed to OpenAI",
        "Provider": "openai"
    })
    
    # Now test loading the agent
    agent_btn.click() 
    # page.wait_for_timeout(500)  # TODO: Replace with proper wait condition
    
    # Find load button and verify it exists
    load_btn = page.locator('button:has-text("Load")').first
    expect(load_btn).to_be_visible()
    expect(load_btn).to_be_enabled()
    
    # Click load button (will trigger confirmation dialog)
    load_btn.click()
    # page.wait_for_timeout(1000)  # TODO: Replace with proper wait condition  # Wait for load to complete
    
    screenshot_with_markdown(page, "after_load_attempt", {
        "Status": "Load button clicked, checking results"
    })
    
    # Check if modal closed automatically (which would indicate success)
    modal_visible = page.locator('#agent-config-modal').is_visible()
    
    if modal_visible:
        # Modal is still open, close it
        close_agent_btn = page.locator('#close-agent-config-modal')
        close_agent_btn.click()
        # page.wait_for_timeout(500)  # TODO: Replace with proper wait condition
    
    # Check if configuration was restored by opening settings
    settings_btn.click()
    # page.wait_for_timeout(500)  # TODO: Replace with proper wait condition
    
    # Check if provider is back to configured test provider
    restored_provider = provider_select.input_value()
    
    screenshot_with_markdown(page, "load_result_verification", {
        "Status": "Checking if configuration was restored",
        "Expected": ACTIVE_TEST_CONFIG["provider_value"],
        "Actual": restored_provider,
        "Load Success": str(restored_provider == ACTIVE_TEST_CONFIG["provider_value"])
    })
    
    # The main test - did the load work?
    expected_provider = ACTIVE_TEST_CONFIG["provider_value"]
    if restored_provider == expected_provider:
        print(f"✅ LOAD SUCCESS: Provider restored from 'openai' back to '{expected_provider}'")
        assert restored_provider == expected_provider
    else:
        print(f"❌ LOAD FAILED: Provider is '{restored_provider}', expected '{expected_provider}'")
        # This will help us debug what went wrong
        assert restored_provider == expected_provider, f"Expected '{expected_provider}', got '{restored_provider}'"


def test_load_button_without_confirmation_dialog(page: Page, serve_hacka_re, api_key):
    """Test load button behavior by checking console logs and storage changes"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    # Monitor console logs
    console_messages = []
    page.on("console", lambda msg: console_messages.append(f"{msg.type}: {msg.text}"))
    
    # Save an agent first
    settings_btn = page.locator('#settings-btn')
    settings_btn.click()
    # page.wait_for_timeout(500)  # TODO: Replace with proper wait condition
    
    api_key_input = page.locator('#api-key-update')
    api_key_input.fill(api_key)
    provider_select = page.locator('#base-url-select')
    provider_select.select_option(ACTIVE_TEST_CONFIG["provider_value"])
    
    close_settings_btn = page.locator('#close-settings')
    close_settings_btn.click()
    # page.wait_for_timeout(500)  # TODO: Replace with proper wait condition
    
    # Save agent without dialog handling
    agent_btn = page.locator('#agent-config-btn')
    agent_btn.click()
    # page.wait_for_timeout(500)  # TODO: Replace with proper wait condition
    
    agent_name_input = page.locator('#quick-agent-name')
    agent_name_input.fill('console-test-agent')
    
    save_btn = page.locator('#quick-save-agent')
    save_btn.click()
    # page.wait_for_timeout(2000)  # TODO: Replace with proper wait condition  # Wait longer for save
    
    # Check console for save success
    save_logs = [msg for msg in console_messages if 'console-test-agent' in msg and 'saved successfully' in msg]
    print(f"Save logs: {save_logs}")
    
    # Change config
    close_agent_btn = page.locator('#close-agent-config-modal')
    close_agent_btn.click()
    # page.wait_for_timeout(500)  # TODO: Replace with proper wait condition
    
    settings_btn.click()
    # page.wait_for_timeout(500)  # TODO: Replace with proper wait condition
    provider_select.select_option('openai')
    close_settings_btn.click()
    # page.wait_for_timeout(500)  # TODO: Replace with proper wait condition
    
    # Check storage before load
    storage_before = page.evaluate("() => localStorage.getItem('hackare__base_url_provider')")
    print(f"Storage before load: {storage_before}")
    
    # Try to load agent
    agent_btn.click()
    # page.wait_for_timeout(500)  # TODO: Replace with proper wait condition
    
    load_btn = page.locator('button:has-text("Load")').first
    load_btn.click()
    # page.wait_for_timeout(2000)  # TODO: Replace with proper wait condition
    
    # Check storage after load
    storage_after = page.evaluate("() => localStorage.getItem('hackare__base_url_provider')")
    print(f"Storage after load: {storage_after}")
    
    # Check console for load messages
    load_logs = [msg for msg in console_messages if 'load' in msg.lower() or 'applied' in msg.lower()]
    print(f"Load-related console messages: {load_logs}")
    
    screenshot_with_markdown(page, "console_test_result", {
        "Storage Before": str(storage_before),
        "Storage After": str(storage_after), 
        "Console Messages": str(len(console_messages)),
        "Load Logs": str(len(load_logs))
    })