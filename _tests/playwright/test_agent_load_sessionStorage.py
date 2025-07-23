"""
Test agent Load button functionality with sessionStorage (correct storage type)
"""
import pytest
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown


def test_agent_load_button_with_session_storage(page: Page, serve_hacka_re, api_key):
    """Test that Load button works correctly with sessionStorage"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    print("=== TESTING LOAD BUTTON WITH CORRECT STORAGE (sessionStorage) ===")
    
    # Verify we're using sessionStorage
    storage_type = page.evaluate("() => window.StorageTypeService ? window.StorageTypeService.getStorage() === sessionStorage ? 'sessionStorage' : 'localStorage' : 'unknown'")
    print(f"Storage type: {storage_type}")
    
    # Set initial configuration (Groq)
    settings_btn = page.locator('#settings-btn')
    settings_btn.click()
    page.wait_for_timeout(2000)  # Wait for settings initialization
    
    api_key_input = page.locator('#api-key-update')
    api_key_input.fill(api_key)
    
    provider_select = page.locator('#base-url-select')
    provider_select.select_option('groq')
    
    close_settings_btn = page.locator('#close-settings')
    close_settings_btn.click()
    page.wait_for_timeout(500)
    
    # Verify configuration was set
    settings_btn.click()
    page.wait_for_timeout(500)
    initial_provider = provider_select.input_value()
    assert initial_provider == 'groq', f"Expected 'groq', got '{initial_provider}'"
    close_settings_btn.click()
    page.wait_for_timeout(500)
    
    print(f"✅ Initial configuration set: provider = {initial_provider}")
    
    # Save agent
    agent_btn = page.locator('#agent-config-btn')
    agent_btn.click()
    page.wait_for_timeout(500)
    
    agent_name_input = page.locator('#quick-agent-name')
    agent_name_input.fill('sessionStorage-test-agent')
    
    save_btn = page.locator('#quick-save-agent')
    save_btn.click()
    page.wait_for_timeout(2000)
    
    # Verify agent was saved to sessionStorage
    session_storage_check = page.evaluate("""() => {
        const sessionKeys = Object.keys(sessionStorage);
        const agentCount = window.AgentService ? Object.keys(window.AgentService.getAllAgents()).length : 0;
        return {
            sessionStorageKeys: sessionKeys.length,
            agentCount: agentCount,
            hasAgentKeys: sessionKeys.some(key => key.includes('saved_agents') || key.includes('agent'))
        };
    }""")
    
    print(f"After save - SessionStorage keys: {session_storage_check['sessionStorageKeys']}, Agent count: {session_storage_check['agentCount']}")
    
    screenshot_with_markdown(page, "sessionStorage_agent_saved", {
        "Status": "Agent saved to sessionStorage",
        "Storage Type": storage_type,
        "Session Keys": str(session_storage_check['sessionStorageKeys']),
        "Agent Count": str(session_storage_check['agentCount'])
    })
    
    # Close agent modal
    close_agent_btn = page.locator('#close-agent-config-modal')
    close_agent_btn.click()
    page.wait_for_timeout(500)
    
    # Change configuration to OpenAI
    settings_btn.click()
    page.wait_for_timeout(2000)  # Wait for settings initialization
    
    provider_select.select_option('openai')
    close_settings_btn.click()
    page.wait_for_timeout(500)
    
    # Verify change
    settings_btn.click()
    page.wait_for_timeout(500)
    changed_provider = provider_select.input_value()
    assert changed_provider == 'openai', f"Expected 'openai', got '{changed_provider}'"
    close_settings_btn.click()
    page.wait_for_timeout(500)
    
    print(f"✅ Configuration changed: provider = {changed_provider}")
    
    screenshot_with_markdown(page, "sessionStorage_config_changed", {
        "Status": "Configuration changed to OpenAI",
        "Original": "groq",
        "New": "openai"
    })
    
    # Now test the Load button
    agent_btn.click()
    page.wait_for_timeout(500)
    
    # Find Load button
    load_btn = page.locator('button:has-text("Load")').first
    expect(load_btn).to_be_visible()
    expect(load_btn).to_be_enabled()
    
    print("✅ Load button found and enabled")
    
    # Click Load button
    load_btn.click()
    page.wait_for_timeout(2000)  # Wait for load to complete
    
    screenshot_with_markdown(page, "sessionStorage_after_load", {
        "Status": "Load button clicked, checking results"
    })
    
    # Close agent modal if still open
    modal_visible = page.locator('#agent-config-modal').is_visible()
    if modal_visible:
        close_agent_btn.click()
        page.wait_for_timeout(500)
    
    # Verify configuration was restored
    settings_btn.click()
    page.wait_for_timeout(2000)  # Wait for settings initialization
    
    restored_provider = provider_select.input_value()
    
    screenshot_with_markdown(page, "sessionStorage_load_verification", {
        "Status": "Verifying configuration restored",
        "Expected": "groq",
        "Actual": restored_provider,
        "Load Success": str(restored_provider == 'groq')
    })
    
    # Final verification
    if restored_provider == 'groq':
        print("✅ LOAD SUCCESS: Provider restored from 'openai' back to 'groq'")
        print("✅ Load button works correctly with sessionStorage!")
        assert restored_provider == 'groq'
    else:
        print(f"❌ LOAD FAILED: Provider is '{restored_provider}', expected 'groq'")
        # Still check sessionStorage to debug
        final_debug = page.evaluate("""() => {
            const sessionKeys = Object.keys(sessionStorage);
            const agentData = window.AgentService ? window.AgentService.getAllAgents() : {};
            return {
                sessionKeys: sessionKeys.length,
                agentCount: Object.keys(agentData).length,
                agentData: Object.keys(agentData)
            };
        }""")
        print(f"Debug info: {final_debug}")
        assert restored_provider == 'groq', f"Expected 'groq', got '{restored_provider}'"
    
    close_settings_btn.click()


def test_verify_storage_persistence_in_session(page: Page, serve_hacka_re, api_key):
    """Verify that sessionStorage persists during the same browser session"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    print("=== TESTING sessionStorage PERSISTENCE ===")
    
    # Save some data
    settings_btn = page.locator('#settings-btn')
    settings_btn.click()
    page.wait_for_timeout(500)
    
    api_key_input = page.locator('#api-key-update')
    api_key_input.fill(api_key)
    
    provider_select = page.locator('#base-url-select')
    provider_select.select_option('groq')
    
    close_settings_btn = page.locator('#close-settings')
    close_settings_btn.click()
    page.wait_for_timeout(500)
    
    # Save agent
    agent_btn = page.locator('#agent-config-btn')
    agent_btn.click()
    page.wait_for_timeout(500)
    
    agent_name_input = page.locator('#quick-agent-name')
    agent_name_input.fill('persistence-test-agent')
    
    save_btn = page.locator('#quick-save-agent')
    save_btn.click()
    page.wait_for_timeout(2000)
    
    # Check what's in sessionStorage
    before_navigation = page.evaluate("""() => {
        const sessionKeys = Object.keys(sessionStorage);
        const agentCount = window.AgentService ? Object.keys(window.AgentService.getAllAgents()).length : 0;
        return {
            sessionKeys: sessionKeys.length,
            agentCount: agentCount
        };
    }""")
    
    print(f"Before navigation - Session keys: {before_navigation['sessionKeys']}, Agents: {before_navigation['agentCount']}")
    
    # Navigate to a different hash/state (but same session)
    page.evaluate("window.location.hash = '#test'")
    page.wait_for_timeout(1000)
    
    # Navigate back
    page.evaluate("window.location.hash = ''")
    page.wait_for_timeout(1000)
    
    # Check if data persisted
    after_navigation = page.evaluate("""() => {
        const sessionKeys = Object.keys(sessionStorage);
        const agentCount = window.AgentService ? Object.keys(window.AgentService.getAllAgents()).length : 0;
        return {
            sessionKeys: sessionKeys.length,
            agentCount: agentCount
        };
    }""")
    
    print(f"After navigation - Session keys: {after_navigation['sessionKeys']}, Agents: {after_navigation['agentCount']}")
    
    screenshot_with_markdown(page, "sessionStorage_persistence_test", {
        "Before Session Keys": str(before_navigation['sessionKeys']),
        "After Session Keys": str(after_navigation['sessionKeys']),
        "Before Agents": str(before_navigation['agentCount']),
        "After Agents": str(after_navigation['agentCount']),
        "Data Persisted": str(after_navigation['sessionKeys'] > 0 and after_navigation['agentCount'] > 0)
    })
    
    # Data should persist during same session
    assert after_navigation['sessionKeys'] > 0, "sessionStorage should persist during same session"
    assert after_navigation['agentCount'] > 0, "Agents should persist during same session"
    
    print("✅ sessionStorage data persists correctly during same browser session")