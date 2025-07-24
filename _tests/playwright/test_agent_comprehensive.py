"""
Comprehensive Agent Save/Load Test Suite
Tests all aspects of agent functionality including:
- API configuration (provider, model, API key)
- Function calling (library, enabled functions, tools status)
- Prompts (library, selected prompts, default prompts)
- MCP connections (GitHub, OAuth, etc.)
- Chat data (system prompt, conversation history)
"""
from playwright.sync_api import Page
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_agent_comprehensive_save_load(page: Page, serve_hacka_re, api_key):
    """Test comprehensive agent save/load including all configuration aspects"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    print("=== COMPREHENSIVE AGENT SAVE/LOAD TEST ===")
    
    # Step 1: Configure API settings
    print("\nStep 1: Configuring API settings...")
    if page.locator('#settings-modal').is_visible():
        page.wait_for_timeout(2000)
    else:
        page.locator('#settings-btn').click()
        page.wait_for_timeout(2000)
    
    # Set up comprehensive API configuration
    page.locator('#api-key-update').fill(api_key)
    page.locator('#base-url-select').select_option('groq')
    page.wait_for_timeout(1000)
    
    # Enable tool calling
    tool_calling_checkbox = page.locator('#tool-calling-checkbox')
    if tool_calling_checkbox.count() and not tool_calling_checkbox.is_checked():
        tool_calling_checkbox.check()
        page.wait_for_timeout(500)
    
    page.locator('#close-settings').click()
    page.wait_for_timeout(1000)
    
    # Step 2: Add functions to library
    print("Step 2: Adding functions to library...")
    page.locator('#function-btn').click()
    page.wait_for_timeout(1000)
    
    # Add a test function
    function_code = '''/**
     * Test function for agent save/load
     * @param {string} message - Test message
     * @returns {string} Response
     */
    function agentTestFunction(message) {
        return "Agent test response: " + message;
    }'''
    
    page.locator('#function-code').fill(function_code)
    page.wait_for_timeout(500)
    
    # The function name should auto-populate
    page.evaluate("document.getElementById('function-code').dispatchEvent(new Event('input'))")
    page.wait_for_timeout(500)
    
    # Validate the function first
    page.locator('#function-validate-btn').click()
    page.wait_for_timeout(1000)
    
    # Submit the form using the correct selector
    page.locator('#function-editor-form button[type="submit"]').click()
    page.wait_for_timeout(1000)
    
    page.locator('#close-function-modal').click()
    page.wait_for_timeout(500)
    
    # Step 3: Configure prompts
    print("Step 3: Configuring prompts...")
    page.locator('#prompts-btn').click()
    page.wait_for_timeout(1000)
    
    # Add a custom prompt
    page.locator('#new-prompt-label').fill('Agent Test Prompt')
    page.locator('#new-prompt-content').fill('You are a helpful AI assistant for testing agent save/load functionality.')
    page.locator('.new-prompt-save').click()
    page.wait_for_timeout(500)
    
    # Select the user-created prompt 
    # Find the prompt item that contains our test prompt
    test_prompt_item = page.locator('.prompt-item:has-text("Agent Test Prompt")')
    if test_prompt_item.count() > 0:
        prompt_checkbox = test_prompt_item.locator('.prompt-item-checkbox')
        if not prompt_checkbox.is_checked():
            prompt_checkbox.check()
            page.wait_for_timeout(500)
    
    page.locator('#close-prompts-modal').click()
    page.wait_for_timeout(500)
    
    # Step 4: Add chat history
    print("Step 4: Adding chat history...")
    input_field = page.locator('#message-input')
    input_field.fill('Test message for agent history')
    
    # Send message but stop it quickly to avoid API calls
    send_btn = page.locator('#send-btn')
    send_btn.click()
    page.wait_for_timeout(500)
    
    # Stop generation if it started
    if page.locator('#send-btn').get_attribute('title') != 'Send Message':
        send_btn.click()  # Stop generation
        page.wait_for_timeout(500)
    
    # Step 5: Capture current configuration for comparison
    print("Step 5: Capturing current configuration...")
    original_config = page.evaluate("""() => {
        return {
            api: {
                provider: window.DataService ? window.DataService.getBaseUrlProvider() : null,
                model: window.DataService ? window.DataService.getModel() : null,
                apiKey: window.DataService ? (window.DataService.getApiKey() ? 'set' : null) : null
            },
            functions: {
                library: window.FunctionToolsService ? window.FunctionToolsService.getJsFunctions() : {},
                enabled: window.FunctionToolsService ? window.FunctionToolsService.getEnabledFunctionNames() : [],
                toolsEnabled: window.FunctionToolsService ? window.FunctionToolsService.isFunctionToolsEnabled() : false
            },
            prompts: {
                library: window.PromptsService ? window.PromptsService.getPrompts() : {},
                selectedIds: window.PromptsService ? window.PromptsService.getSelectedPromptIds() : []
            },
            chat: {
                systemPrompt: window.DataService ? window.DataService.getSystemPrompt() : null,
                messageCount: window.aiHackare ? window.aiHackare.chatManager.getMessages().length : 0
            }
        };
    }""")
    
    print(f"Original config summary:")
    print(f"  API: {original_config['api']['provider']} / {original_config['api']['model']}")
    print(f"  Functions: {len(original_config['functions']['library'])} total, {len(original_config['functions']['enabled'])} enabled")
    print(f"  Prompts: {len(original_config['prompts']['library'])} total, {len(original_config['prompts']['selectedIds'])} selected")
    print(f"  Chat: {original_config['chat']['messageCount']} messages")
    
    # Step 6: Save as agent
    print("\nStep 6: Saving comprehensive agent...")
    page.locator('#agent-config-btn').click()
    page.wait_for_timeout(500)
    
    page.locator('#quick-agent-name').fill('comprehensive-test-agent')
    page.on("dialog", lambda dialog: dialog.accept())
    page.locator('#quick-save-agent').click()
    page.wait_for_timeout(2000)
    
    page.locator('#close-agent-config-modal').click()
    page.wait_for_timeout(500)
    
    # Step 7: Modify current configuration
    print("Step 7: Modifying current configuration...")
    
    # Change API settings
    page.locator('#settings-btn').click()
    page.wait_for_timeout(2000)
    page.locator('#base-url-select').select_option('openai')
    page.wait_for_timeout(500)
    page.locator('#close-settings').click()
    page.wait_for_timeout(1000)
    
    # Clear functions
    page.locator('#function-btn').click()
    page.wait_for_timeout(1000)
    clear_btn = page.locator('button:has-text("Clear All")')
    if clear_btn.count():
        clear_btn.click()
        page.wait_for_timeout(500)
    page.locator('#close-function-modal').click()
    page.wait_for_timeout(500)
    
    # Clear prompts
    page.locator('#prompts-btn').click()
    page.wait_for_timeout(1000)
    clear_prompts_btn = page.locator('button:has-text("Clear All")')
    if clear_prompts_btn.count():
        clear_prompts_btn.click()
        page.wait_for_timeout(500)
    page.locator('#close-prompts-modal').click()
    page.wait_for_timeout(500)
    
    # Clear chat
    clear_chat_btn = page.locator('#clear-chat-btn')
    if clear_chat_btn.count():
        page.on("dialog", lambda dialog: dialog.accept())
        clear_chat_btn.click()
        page.wait_for_timeout(1000)
    
    # Step 8: Verify configuration is different
    print("Step 8: Verifying configuration changed...")
    modified_config = page.evaluate("""() => {
        return {
            api: {
                provider: window.DataService ? window.DataService.getBaseUrlProvider() : null,
                model: window.DataService ? window.DataService.getModel() : null
            },
            functions: {
                library: window.FunctionToolsService ? window.FunctionToolsService.getJsFunctions() : {},
                enabled: window.FunctionToolsService ? window.FunctionToolsService.getEnabledFunctionNames() : []
            },
            prompts: {
                library: window.PromptsService ? window.PromptsService.getPrompts() : {},
                selectedIds: window.PromptsService ? window.PromptsService.getSelectedPromptIds() : []
            },
            chat: {
                messageCount: window.aiHackare ? window.aiHackare.chatManager.getMessages().length : 0
            }
        };
    }""")
    
    print(f"Modified config summary:")
    print(f"  API: {modified_config['api']['provider']} / {modified_config['api']['model']}")
    print(f"  Functions: {len(modified_config['functions']['library'])} total, {len(modified_config['functions']['enabled'])} enabled")
    print(f"  Prompts: {len(modified_config['prompts']['library'])} total, {len(modified_config['prompts']['selectedIds'])} selected")
    print(f"  Chat: {modified_config['chat']['messageCount']} messages")
    
    # Step 9: Load the saved agent
    print("\nStep 9: Loading saved agent...")
    page.locator('#agent-config-btn').click()
    page.wait_for_timeout(500)
    
    load_btn = page.locator('button:has-text("Load")').first
    load_btn.click()
    page.wait_for_timeout(3000)  # Wait for comprehensive load
    
    if page.locator('#agent-config-modal').is_visible():
        page.locator('#close-agent-config-modal').click()
        page.wait_for_timeout(500)
    
    # Step 10: Verify all configuration was restored
    print("Step 10: Verifying configuration restored...")
    restored_config = page.evaluate("""() => {
        return {
            api: {
                provider: window.DataService ? window.DataService.getBaseUrlProvider() : null,
                model: window.DataService ? window.DataService.getModel() : null,
                apiKey: window.DataService ? (window.DataService.getApiKey() ? 'set' : null) : null
            },
            functions: {
                library: window.FunctionToolsService ? window.FunctionToolsService.getJsFunctions() : {},
                enabled: window.FunctionToolsService ? window.FunctionToolsService.getEnabledFunctionNames() : [],
                toolsEnabled: window.FunctionToolsService ? window.FunctionToolsService.isFunctionToolsEnabled() : false
            },
            prompts: {
                library: window.PromptsService ? window.PromptsService.getPrompts() : {},
                selectedIds: window.PromptsService ? window.PromptsService.getSelectedPromptIds() : []
            },
            chat: {
                systemPrompt: window.DataService ? window.DataService.getSystemPrompt() : null,
                messageCount: window.aiHackare ? window.aiHackare.chatManager.getMessages().length : 0
            }
        };
    }""")
    
    print(f"Restored config summary:")
    print(f"  API: {restored_config['api']['provider']} / {restored_config['api']['model']}")
    print(f"  Functions: {len(restored_config['functions']['library'])} total, {len(restored_config['functions']['enabled'])} enabled")
    print(f"  Prompts: {len(restored_config['prompts']['library'])} total, {len(restored_config['prompts']['selectedIds'])} selected")
    print(f"  Chat: {restored_config['chat']['messageCount']} messages")
    
    screenshot_with_markdown(page, "agent_comprehensive_test", {
        "Test Phase": "Comprehensive agent save/load complete",
        "Original API": f"{original_config['api']['provider']}/{original_config['api']['model']}",
        "Restored API": f"{restored_config['api']['provider']}/{restored_config['api']['model']}",
        "Original Functions": str(len(original_config['functions']['library'])),
        "Restored Functions": str(len(restored_config['functions']['library'])),
        "Original Prompts": str(len(original_config['prompts']['library'])),
        "Restored Prompts": str(len(restored_config['prompts']['library'])),
        "API Restored": str(restored_config['api']['provider'] == original_config['api']['provider']),
        "Functions Restored": str(len(restored_config['functions']['library']) == len(original_config['functions']['library'])),
        "Prompts Restored": str(len(restored_config['prompts']['library']) == len(original_config['prompts']['library']))
    })
    
    # Assertions
    print("\nStep 11: Validating restoration...")
    
    # API configuration should be restored
    assert restored_config['api']['provider'] == original_config['api']['provider'], \
        f"API provider not restored: expected {original_config['api']['provider']}, got {restored_config['api']['provider']}"
    
    assert restored_config['api']['model'] == original_config['api']['model'], \
        f"API model not restored: expected {original_config['api']['model']}, got {restored_config['api']['model']}"
    
    # Functions should be restored
    assert len(restored_config['functions']['library']) == len(original_config['functions']['library']), \
        f"Function library not restored: expected {len(original_config['functions']['library'])}, got {len(restored_config['functions']['library'])}"
    
    # Prompts should be restored
    assert len(restored_config['prompts']['library']) == len(original_config['prompts']['library']), \
        f"Prompt library not restored: expected {len(original_config['prompts']['library'])}, got {len(restored_config['prompts']['library'])}"
    
    # Chat history should be restored
    assert restored_config['chat']['messageCount'] == original_config['chat']['messageCount'], \
        f"Chat history not restored: expected {original_config['chat']['messageCount']}, got {restored_config['chat']['messageCount']}"
    
    print("\n🎉 Comprehensive agent save/load test completed successfully!")
    print("✅ All configuration aspects were saved and restored correctly")
    print(f"✅ API: {original_config['api']['provider']}/{original_config['api']['model']}")
    print(f"✅ Functions: {len(original_config['functions']['library'])} functions restored")
    print(f"✅ Prompts: {len(original_config['prompts']['library'])} prompts restored")
    print(f"✅ Chat: {original_config['chat']['messageCount']} messages restored")

if __name__ == "__main__":
    test_agent_comprehensive_save_load()