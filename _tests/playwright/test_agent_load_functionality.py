"""
Test agent load functionality to verify configuration is applied
"""
import pytest
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown


def test_agent_save_and_load_functionality(page: Page, serve_hacka_re, api_key):
    """Test that saving and loading an agent properly applies the configuration"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # First, open settings and set a specific configuration
    settings_btn = page.locator('#settings-btn')
    settings_btn.click()
    
    # Wait for settings modal
    page.wait_for_timeout(500)
    
    # Set API key
    api_key_input = page.locator('#api-key-update')
    api_key_input.fill(api_key)
    
    # Set specific model (groq should be default)
    provider_select = page.locator('#base-url-select')
    provider_select.select_option('groq')
    
    # Wait for model to load and select a specific one
    page.wait_for_timeout(2000)
    model_select = page.locator('#model-select')
    
    # Wait for models to be populated
    page.wait_for_function("document.querySelector('#model-select').options.length > 1", timeout=10000)
    
    # Select the second option (first real model)
    all_options = model_select.locator('option').all()
    if len(all_options) > 1:
        test_model = model_select.locator('option').nth(1).get_attribute('value')
        model_select.select_option(test_model)
    
    # Close settings modal
    close_settings_btn = page.locator('#close-settings')
    close_settings_btn.click()
    
    # Wait for settings to close
    page.wait_for_timeout(500)
    
    screenshot_with_markdown(page, "before_agent_save", {
        "Status": "Configuration set before saving agent",
        "Provider": "Groq",
        "Model": test_model if 'test_model' in locals() else "Default"
    })
    
    # Now open agent modal and save current config
    agent_btn = page.locator('#agent-config-btn')
    agent_btn.click()
    
    # Wait for agent modal
    page.wait_for_timeout(500)
    
    # Save agent with test name
    agent_name_input = page.locator('#quick-agent-name')
    agent_name_input.fill('test-agent-config')
    
    save_btn = page.locator('#quick-save-agent')
    save_btn.click()
    
    # Wait for save to complete
    page.wait_for_timeout(1000)
    
    screenshot_with_markdown(page, "agent_saved", {
        "Status": "Agent saved successfully",
        "Agent Name": "test-agent-config"
    })
    
    # Now change the configuration to something different
    # Close agent modal first
    close_agent_btn = page.locator('#close-agent-config-modal')
    close_agent_btn.click()
    
    # Open settings again
    settings_btn.click()
    page.wait_for_timeout(500)
    
    # Change to OpenAI provider
    provider_select.select_option('openai')
    page.wait_for_timeout(1000)
    
    # Close settings
    close_settings_btn.click()
    page.wait_for_timeout(500)
    
    screenshot_with_markdown(page, "config_changed", {
        "Status": "Configuration changed to OpenAI",
        "Original": "Groq",
        "New": "OpenAI"  
    })
    
    # Now load the saved agent and verify config is restored
    agent_btn.click()
    page.wait_for_timeout(500)
    
    # Find and click the Load button for our test agent
    load_btn = page.locator('button:has-text("Load")').first
    expect(load_btn).to_be_visible()
    
    load_btn.click()
    
    # Wait for load to complete
    page.wait_for_timeout(2000)
    
    screenshot_with_markdown(page, "after_agent_load", {
        "Status": "Agent loaded, checking if configuration restored",
        "Expected": "Groq provider should be restored"
    })
    
    # Verify that the configuration was restored by checking settings
    settings_btn.click()
    page.wait_for_timeout(500)
    
    # Check that provider is back to Groq
    current_provider = provider_select.input_value()
    expect(current_provider).to_equal('groq')
    
    # Check that model is restored (if we had set a specific one)
    if 'test_model' in locals():
        current_model = model_select.input_value()
        expect(current_model).to_equal(test_model)
    
    screenshot_with_markdown(page, "config_verification", {
        "Status": "Configuration verified after load",
        "Provider": current_provider,
        "Model": model_select.input_value() if model_select.input_value() else "Default"
    })
    
    # Close settings
    close_settings_btn.click()


def test_agent_load_with_different_api_key(page: Page, serve_hacka_re, api_key):
    """Test that loading an agent with different API key updates correctly"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Set initial API key
    settings_btn = page.locator('#settings-btn')
    settings_btn.click()
    page.wait_for_timeout(500)
    
    api_key_input = page.locator('#api-key-update')
    original_key = api_key
    api_key_input.fill(original_key)
    
    close_settings_btn = page.locator('#close-settings')
    close_settings_btn.click()
    page.wait_for_timeout(500)
    
    # Save as agent
    agent_btn = page.locator('#agent-config-btn')
    agent_btn.click()
    page.wait_for_timeout(500)
    
    agent_name_input = page.locator('#quick-agent-name')
    agent_name_input.fill('api-key-test-agent')
    
    save_btn = page.locator('#quick-save-agent')
    save_btn.click()
    page.wait_for_timeout(1000)
    
    # Change API key
    close_agent_btn = page.locator('#close-agent-config-modal')
    close_agent_btn.click()
    
    settings_btn.click()
    page.wait_for_timeout(500)
    
    # Set different API key (modify the last character)
    modified_key = original_key[:-1] + 'X'
    api_key_input.fill(modified_key)
    close_settings_btn.click()
    page.wait_for_timeout(500)
    
    # Load the original agent
    agent_btn.click()
    page.wait_for_timeout(500)
    
    load_btn = page.locator('button:has-text("Load")').first
    load_btn.click()
    page.wait_for_timeout(2000)
    
    # Verify API key was restored
    settings_btn.click()
    page.wait_for_timeout(500)
    
    # Check that the API key field shows the original key (masked)
    current_value = api_key_input.input_value()
    # Should show masked version of original key
    expect(current_value).to_contain('***')
    expect(current_value).to_contain(original_key[-4:])
    
    screenshot_with_markdown(page, "api_key_restored", {
        "Status": "API key restored after agent load",
        "Display": current_value,
        "Expected Suffix": original_key[-4:]
    })