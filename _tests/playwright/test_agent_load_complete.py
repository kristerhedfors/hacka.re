"""
Complete test of agent Load button functionality - verifying actual configuration restoration
"""
from playwright.sync_api import Page
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown

def test_agent_load_complete_functionality(page: Page, serve_hacka_re, api_key):
    """Test complete agent save and load cycle with configuration verification"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    # Don't dismiss settings modal initially - it can interfere with proper initialization
    
    print("=== COMPLETE AGENT LOAD FUNCTIONALITY TEST ===")
    
    # Step 1: Set up initial configuration (Groq)
    print("Step 1: Setting up Groq configuration...")
    
    # Check if settings modal is already open
    settings_modal = page.locator('#settings-modal')
    if not settings_modal.is_visible():
        # Only click if modal is not already open
        settings_btn = page.locator('#settings-btn')
        settings_btn.click()
        page.wait_for_timeout(2000)  # Wait for initialization
    else:
        print("Settings modal already open, proceeding with configuration...")
        # When modal auto-opens, wait for full initialization
        page.wait_for_timeout(3000)  # Extra time for auto-opened modal to initialize
    
    # Verify provider dropdown exists and is ready
    provider_select = page.locator('#base-url-select')
    initial_provider = provider_select.input_value()
    print(f"Initial provider value: {initial_provider}")
    
    # Fill API key first (this may trigger auto-detection)
    api_key_input = page.locator('#api-key-update')
    api_key_input.fill(api_key)
    page.wait_for_timeout(500)  # Wait for any auto-detection to complete
    
    # Now select provider AFTER API key is set (to override any auto-detection)
    provider_select.select_option('groq')
    page.wait_for_timeout(1000)  # Wait for save
    
    # Verify provider selection changed
    selected_provider = provider_select.input_value()
    print(f"Selected provider value: {selected_provider}")
    
    # Check DataService BEFORE closing modal to see if it's being saved
    config_before_close = page.evaluate("""() => {
        return {
            apiKey: window.DataService ? window.DataService.getApiKey() : 'none',
            provider: window.DataService ? window.DataService.getBaseUrlProvider() : 'none',
            baseUrl: window.DataService ? window.DataService.getBaseUrl() : 'none',
            model: window.DataService ? window.DataService.getModel() : 'none'
        };
    }""")
    print(f"Config BEFORE closing modal: {config_before_close}")
    
    close_settings_btn = page.locator('#close-settings')
    close_settings_btn.click()
    page.wait_for_timeout(500)
    
    # Verify the configuration is set AFTER closing modal
    initial_config = page.evaluate("""() => {
        return {
            apiKey: window.DataService ? window.DataService.getApiKey() : 'none',
            provider: window.DataService ? window.DataService.getBaseUrlProvider() : 'none',
            baseUrl: window.DataService ? window.DataService.getBaseUrl() : 'none',
            model: window.DataService ? window.DataService.getModel() : 'none'
        };
    }""")
    
    print(f"Config AFTER closing modal: {initial_config}")
    assert initial_config['provider'] == 'groq', f"Expected groq, got {initial_config['provider']}"
    
    # Step 2: Save agent with Groq configuration
    print("\\nStep 2: Saving agent with Groq configuration...")
    agent_btn = page.locator('#agent-config-btn')
    agent_btn.click()
    page.wait_for_timeout(500)
    
    agent_name_input = page.locator('#quick-agent-name')
    agent_name_input.fill('test-groq-agent')
    
    page.on("dialog", lambda dialog: dialog.accept())
    
    save_btn = page.locator('#quick-save-agent')
    save_btn.click()
    page.wait_for_timeout(2000)
    
    close_agent_btn = page.locator('#close-agent-config-modal')
    close_agent_btn.click()
    page.wait_for_timeout(500)
    
    # Step 3: Change configuration to OpenAI 
    print("\\nStep 3: Changing configuration to OpenAI...")
    settings_btn.click()
    page.wait_for_timeout(2000)
    
    provider_select.select_option('openai')
    page.wait_for_timeout(1000)  # Wait for save
    
    close_settings_btn.click()
    page.wait_for_timeout(500)
    
    # Verify OpenAI is now active
    openai_config = page.evaluate("""() => {
        return {
            provider: window.DataService ? window.DataService.getBaseUrlProvider() : 'none',
            baseUrl: window.DataService ? window.DataService.getBaseUrl() : 'none'
        };
    }""")
    
    print(f"Changed to OpenAI config: {openai_config}")
    assert openai_config['provider'] == 'openai', f"Expected openai, got {openai_config['provider']}"
    
    screenshot_with_markdown(page, "before_agent_load", {
        "Status": "Before loading agent",
        "Current Provider": openai_config['provider'],
        "Saved Agent": "test-groq-agent (should have groq config)"
    })
    
    # Step 4: Load the saved agent and verify restoration
    print("\\nStep 4: Loading saved agent...")
    agent_btn.click()
    page.wait_for_timeout(500)
    
    # Find and click the Load button for our agent
    # The load button should be next to the agent name
    load_btn = page.locator('button:has-text("Load")').first
    load_btn.click()
    page.wait_for_timeout(3000)  # Wait for load and UI refresh
    
    # Close agent modal if still open
    modal_visible = page.locator('#agent-config-modal').is_visible()
    if modal_visible:
        close_agent_btn.click()
        page.wait_for_timeout(500)
    
    # Step 5: Verify configuration was restored
    print("\\nStep 5: Verifying configuration restoration...")
    
    # Check the stored configuration
    restored_config = page.evaluate("""() => {
        return {
            apiKey: window.DataService ? window.DataService.getApiKey() : 'none',
            provider: window.DataService ? window.DataService.getBaseUrlProvider() : 'none',
            baseUrl: window.DataService ? window.DataService.getBaseUrl() : 'none',
            model: window.DataService ? window.DataService.getModel() : 'none'
        };
    }""")
    
    print(f"Restored config: {restored_config}")
    
    # Check the UI reflects the restored configuration
    settings_btn.click()
    page.wait_for_timeout(2000)
    
    ui_provider = provider_select.input_value()
    ui_api_key = api_key_input.input_value()
    
    close_settings_btn.click()
    page.wait_for_timeout(500)
    
    screenshot_with_markdown(page, "after_agent_load", {
        "Status": "After loading agent",
        "Expected Provider": "groq",
        "Restored Provider": restored_config['provider'],
        "UI Provider": ui_provider,
        "API Key Restored": "Yes" if ui_api_key else "No",
        "Load Success": str(restored_config['provider'] == 'groq')
    })
    
    # Step 6: Final verification
    print("\\nStep 6: Final verification...")
    
    # The critical test - was the Groq configuration restored?
    if restored_config['provider'] == 'groq':
        print("✅ SUCCESS: Agent Load button correctly restored Groq configuration!")
        print(f"✅ Provider: {restored_config['provider']}")
        print(f"✅ Base URL: {restored_config['baseUrl']}")
        print(f"✅ UI matches storage: {ui_provider == restored_config['provider']}")
        assert restored_config['provider'] == 'groq'
        assert ui_provider == 'groq'
    else:
        print(f"❌ FAILURE: Expected 'groq', got '{restored_config['provider']}'")
        print(f"❌ UI shows: '{ui_provider}'")
        print(f"❌ Storage shows: '{restored_config['provider']}'")
        
        # Additional debugging
        debug_info = page.evaluate("""() => {
            const agentData = window.AgentService ? window.AgentService.getAllAgents() : {};
            return {
                agentCount: Object.keys(agentData).length,
                agentNames: Object.keys(agentData),
                storageType: window.StorageTypeService ? 
                    (window.StorageTypeService.getStorage() === sessionStorage ? 'sessionStorage' : 'localStorage') : 'unknown'
            };
        }""")
        print(f"Debug info: {debug_info}")
        
        # This will fail the test
        assert False, f"Agent Load failed: expected 'groq', got '{restored_config['provider']}'"
    
    print("\\n🎉 Agent Load button test completed successfully!")
    print("🎉 Load functionality is working correctly!")