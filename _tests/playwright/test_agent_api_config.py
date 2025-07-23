"""
Test Agent API Configuration Save/Load
Tests that agents properly save and restore API configuration including:
- Provider selection (OpenAI, Groq, etc.)
- Model selection
- API key storage
- Base URL settings
- Tool calling configuration
"""
from playwright.sync_api import Page
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_agent_api_config_save_load(page: Page, serve_hacka_re, api_key):
    """Test agent save/load for API configuration aspects"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    print("=== AGENT API CONFIG SAVE/LOAD TEST ===")
    
    # Step 1: Configure API settings
    print("\nStep 1: Configuring API settings...")
    # Check if settings modal is already open
    if page.locator('#settings-modal').is_visible():
        print("Settings modal already open")
        page.wait_for_timeout(1000)
    else:
        page.locator('#settings-btn').click()
        page.wait_for_timeout(2000)
    
    # Set comprehensive API configuration
    page.locator('#api-key-update').fill(api_key)
    page.locator('#base-url-select').select_option('groq')
    page.wait_for_timeout(500)
    
    # Enable tool calling
    tool_calling_checkbox = page.locator('#tool-calling-checkbox')
    if tool_calling_checkbox.count() and not tool_calling_checkbox.is_checked():
        tool_calling_checkbox.check()
        page.wait_for_timeout(500)
    
    page.locator('#close-settings').click()
    page.wait_for_timeout(1000)
    
    # Step 2: Capture original configuration
    print("Step 2: Capturing original API configuration...")
    original_config = page.evaluate("""() => {
        return {
            provider: window.DataService ? window.DataService.getBaseUrlProvider() : null,
            model: window.DataService ? window.DataService.getModel() : null,
            apiKey: window.DataService ? (window.DataService.getApiKey() ? 'set' : null) : null,
            toolsEnabled: window.FunctionToolsService ? window.FunctionToolsService.isFunctionToolsEnabled() : false
        };
    }""")
    
    print(f"Original API config: Provider={original_config['provider']}, Model={original_config['model']}, API Key={original_config['apiKey']}, Tools={original_config['toolsEnabled']}")
    
    # Step 3: Save as agent
    print("Step 3: Saving API configuration as agent...")
    page.locator('#agent-config-btn').click()
    page.wait_for_timeout(500)
    
    page.locator('#quick-agent-name').fill('api-config-test-agent')
    page.on("dialog", lambda dialog: dialog.accept())
    page.locator('#quick-save-agent').click()
    page.wait_for_timeout(2000)
    
    page.locator('#close-agent-config-modal').click()
    page.wait_for_timeout(500)
    
    # Step 4: Change API configuration
    print("Step 4: Changing API configuration...")
    page.locator('#settings-btn').click()
    page.wait_for_timeout(2000)
    
    # Change to different provider and settings
    page.locator('#base-url-select').select_option('openai')
    page.wait_for_timeout(500)
    
    # Disable tool calling
    if tool_calling_checkbox.count() and tool_calling_checkbox.is_checked():
        tool_calling_checkbox.uncheck()
        page.wait_for_timeout(500)
    
    page.locator('#close-settings').click()
    page.wait_for_timeout(1000)
    
    # Step 5: Verify configuration changed
    print("Step 5: Verifying configuration changed...")
    modified_config = page.evaluate("""() => {
        return {
            provider: window.DataService ? window.DataService.getBaseUrlProvider() : null,
            model: window.DataService ? window.DataService.getModel() : null,
            toolsEnabled: window.FunctionToolsService ? window.FunctionToolsService.isFunctionToolsEnabled() : false
        };
    }""")
    
    print(f"Modified API config: Provider={modified_config['provider']}, Model={modified_config['model']}, Tools={modified_config['toolsEnabled']}")
    
    # Step 6: Load the saved agent
    print("Step 6: Loading saved agent...")
    page.locator('#agent-config-btn').click()
    page.wait_for_timeout(500)
    
    load_btn = page.locator('button:has-text("Load")').first
    load_btn.click()
    page.wait_for_timeout(3000)  # Wait for agent to load
    
    if page.locator('#agent-config-modal').is_visible():
        page.locator('#close-agent-config-modal').click()
        page.wait_for_timeout(500)
    
    # Step 7: Verify API configuration was restored
    print("Step 7: Verifying API configuration restored...")
    restored_config = page.evaluate("""() => {
        return {
            provider: window.DataService ? window.DataService.getBaseUrlProvider() : null,
            model: window.DataService ? window.DataService.getModel() : null,
            apiKey: window.DataService ? (window.DataService.getApiKey() ? 'set' : null) : null,
            toolsEnabled: window.FunctionToolsService ? window.FunctionToolsService.isFunctionToolsEnabled() : false
        };
    }""")
    
    print(f"Restored API config: Provider={restored_config['provider']}, Model={restored_config['model']}, API Key={restored_config['apiKey']}, Tools={restored_config['toolsEnabled']}")
    
    screenshot_with_markdown(page, "agent_api_config_test", {
        "Test Phase": "API configuration save/load complete",
        "Original Provider": str(original_config['provider']),
        "Restored Provider": str(restored_config['provider']),
        "Original Tools": str(original_config['toolsEnabled']),
        "Restored Tools": str(restored_config['toolsEnabled']),
        "Provider Restored": str(restored_config['provider'] == original_config['provider']),
        "Tools Restored": str(restored_config['toolsEnabled'] == original_config['toolsEnabled']),
        "API Key Restored": str(restored_config['apiKey'] == original_config['apiKey'])
    })
    
    # Step 8: Validate all API configuration was restored
    print("Step 8: Validating API configuration restoration...")
    
    # Provider should be restored
    assert restored_config['provider'] == original_config['provider'], \
        f"Provider not restored: expected {original_config['provider']}, got {restored_config['provider']}"
    
    # Model should be restored
    assert restored_config['model'] == original_config['model'], \
        f"Model not restored: expected {original_config['model']}, got {restored_config['model']}"
    
    # API key should be restored
    assert restored_config['apiKey'] == original_config['apiKey'], \
        f"API key not restored: expected {original_config['apiKey']}, got {restored_config['apiKey']}"
    
    # Tool calling should be restored
    assert restored_config['toolsEnabled'] == original_config['toolsEnabled'], \
        f"Tool calling not restored: expected {original_config['toolsEnabled']}, got {restored_config['toolsEnabled']}"
    
    print("\\n🎉 Agent API configuration save/load test completed successfully!")
    print("✅ All API configuration aspects were saved and restored correctly")
    print(f"✅ Provider: {original_config['provider']} → {restored_config['provider']}")
    print(f"✅ Model: {original_config['model']} → {restored_config['model']}")
    print(f"✅ API Key: {original_config['apiKey']} → {restored_config['apiKey']}")
    print(f"✅ Tools: {original_config['toolsEnabled']} → {restored_config['toolsEnabled']}")

def test_agent_api_config_edge_cases(page: Page, serve_hacka_re, api_key):
    """Test edge cases for API configuration in agents"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    print("=== AGENT API CONFIG EDGE CASES TEST ===")
    
    # Test empty API key scenario
    print("\\nTesting empty API key scenario...")
    # Check if settings modal is already open
    if page.locator('#settings-modal').is_visible():
        print("Settings modal already open")
        page.wait_for_timeout(1000)
    else:
        page.locator('#settings-btn').click()
        page.wait_for_timeout(2000)
    
    # Clear API key
    page.locator('#api-key-update').fill('')
    page.locator('#base-url-select').select_option('openai')
    page.locator('#close-settings').click()
    page.wait_for_timeout(1000)
    
    # Save agent with empty API key
    page.locator('#agent-config-btn').click()
    page.wait_for_timeout(500)
    
    page.locator('#quick-agent-name').fill('empty-api-key-agent')
    page.on("dialog", lambda dialog: dialog.accept())
    page.locator('#quick-save-agent').click()
    page.wait_for_timeout(2000)
    
    page.locator('#close-agent-config-modal').click()
    page.wait_for_timeout(500)
    
    # Set an API key
    if page.locator('#settings-modal').is_visible():
        print("Settings modal already open")
        page.wait_for_timeout(1000)
    else:
        page.locator('#settings-btn').click()
        page.wait_for_timeout(2000)
    page.locator('#api-key-update').fill(api_key)
    page.locator('#close-settings').click()
    page.wait_for_timeout(1000)
    
    # Load agent and verify empty API key is restored
    page.locator('#agent-config-btn').click()
    page.wait_for_timeout(500)
    
    load_btn = page.locator('button:has-text("Load")').first
    load_btn.click()
    page.wait_for_timeout(3000)
    
    if page.locator('#agent-config-modal').is_visible():
        page.locator('#close-agent-config-modal').click()
        page.wait_for_timeout(500)
    
    # Verify API key was cleared
    api_key_status = page.evaluate("""() => {
        return window.DataService ? (window.DataService.getApiKey() || '') : '';
    }""")
    
    assert api_key_status == '', f"API key should be empty but got: {api_key_status}"
    
    print("✅ Empty API key scenario handled correctly")
    print("\\n🎉 Agent API configuration edge cases test completed successfully!")

if __name__ == "__main__":
    test_agent_api_config_save_load()
    test_agent_api_config_edge_cases()