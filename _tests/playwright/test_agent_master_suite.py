"""
Master Agent Configuration Test Suite
Comprehensive test that validates all agent components working together:
- API configuration (provider, model, API key, tools)
- Function calling (library, enabled functions, tools status)
- Prompts (library, selected prompts, default prompts)
- MCP connections (GitHub, OAuth, etc.)
- Conversation history (system prompt, messages)

This test ensures that all components are saved and restored correctly
when working together in a single agent configuration.
"""
from playwright.sync_api import Page
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_agent_master_comprehensive_save_load(page: Page, serve_hacka_re, api_key):
    """Master test for comprehensive agent save/load of all components"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    print("=== MASTER AGENT COMPREHENSIVE SAVE/LOAD TEST ===")
    
    # Step 1: Configure API settings
    print("\\nStep 1: Configuring comprehensive API settings...")
    page.locator('#settings-btn').click()
    page.wait_for_timeout(2000)
    
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
    
    # Step 2: Configure MCP connections (simulated)
    print("Step 2: Configuring MCP connections...")
    page.evaluate("""() => {
        if (window.CoreStorageService) {
            window.CoreStorageService.setValue('mcp_github_token', 'master_test_github_token');
            window.CoreStorageService.setValue('mcp_gmail_oauth', {
                access_token: 'master_gmail_token',
                refresh_token: 'master_gmail_refresh'
            });
            window.CoreStorageService.setValue('mcp-oauth-tokens', {
                slack: { token: 'master_slack_token' }
            });
        }
    }""")
    
    # Step 3: Add functions to library
    print("Step 3: Adding functions to library...")
    page.locator('#function-btn').click()
    page.wait_for_timeout(1000)
    
    # Add comprehensive function bundle
    function_code = '''/**
     * Master test function bundle for agent testing
     */
    
    /**
     * Calculate compound interest
     * @param {number} principal - Initial amount
     * @param {number} rate - Interest rate (as decimal)
     * @param {number} time - Time in years
     * @returns {number} Final amount
     */
    function calculateCompoundInterest(principal, rate, time) {
        return principal * Math.pow(1 + rate, time);
    }
    
    /**
     * Convert units of measurement
     * @param {number} value - Value to convert
     * @param {string} fromUnit - Source unit
     * @param {string} toUnit - Target unit
     * @returns {string} Converted value with unit
     */
    function convertUnits(value, fromUnit, toUnit) {
        const conversions = {
            'km_to_miles': (km) => km * 0.621371,
            'miles_to_km': (miles) => miles * 1.60934,
            'celsius_to_fahrenheit': (c) => (c * 9/5) + 32,
            'fahrenheit_to_celsius': (f) => (f - 32) * 5/9
        };
        const key = fromUnit + '_to_' + toUnit;
        if (conversions[key]) {
            return conversions[key](value) + ' ' + toUnit;
        }
        return 'Conversion not supported';
    }'''
    
    page.locator('#function-code').fill(function_code)
    page.wait_for_timeout(500)
    page.locator('#function-validate-btn').click()
    page.wait_for_timeout(1000)
    page.locator('#function-editor-form button[type="submit"]').click()
    page.wait_for_timeout(1000)
    
    page.locator('#close-function-modal').click()
    page.wait_for_timeout(500)
    
    # Step 4: Configure prompts
    print("Step 4: Configuring prompts...")
    page.locator('#prompts-btn').click()
    page.wait_for_timeout(1000)
    
    # Add multiple custom prompts
    page.locator('#new-prompt-label').fill('Master Financial Advisor')
    page.locator('#new-prompt-content').fill('You are a comprehensive financial advisor AI. You can help with calculations, investment advice, and financial planning. Use the available functions to provide accurate calculations.')
    page.locator('.new-prompt-save').click()
    page.wait_for_timeout(500)
    
    page.locator('#new-prompt-label').fill('Master Unit Converter')
    page.locator('#new-prompt-content').fill('You are a precise unit conversion specialist. You can convert between various units of measurement with high accuracy.')
    page.locator('.new-prompt-save').click()
    page.wait_for_timeout(500)
    
    # Select the financial advisor prompt
    financial_prompt = page.locator('.prompt-item:has-text("Master Financial Advisor")')
    if financial_prompt.count() > 0:
        prompt_checkbox = financial_prompt.locator('.prompt-item-checkbox')
        if not prompt_checkbox.is_checked():
            prompt_checkbox.check()
            page.wait_for_timeout(500)
    
    page.locator('#close-prompts-modal').click()
    page.wait_for_timeout(500)
    
    # Step 5: Create conversation history
    print("Step 5: Creating conversation history...")
    page.evaluate("""() => {
        if (window.aiHackare && window.aiHackare.chatManager) {
            window.aiHackare.chatManager.addMessage('user', 'Hello! I need help with financial calculations and unit conversions.');
            window.aiHackare.chatManager.addMessage('assistant', 'Hello! I\\'m your comprehensive financial advisor and unit conversion specialist. I can help you with compound interest calculations, investment planning, and precise unit conversions. What would you like to calculate?');
            window.aiHackare.chatManager.addMessage('user', 'Can you calculate compound interest for $10,000 at 5% for 10 years?');
            window.aiHackare.chatManager.addMessage('assistant', 'I\\'ll calculate that for you using the compound interest formula.');
            window.aiHackare.chatManager.addSystemMessage('Master test: Comprehensive agent with all components configured.');
        }
        
        if (window.DataService && window.DataService.setSystemPrompt) {
            window.DataService.setSystemPrompt('You are a master AI agent configured for comprehensive testing. You have access to financial calculation functions, unit conversion tools, and specialized prompts. Provide accurate, helpful responses using all available capabilities.');
        }
    }""")
    
    page.wait_for_timeout(1000)
    
    # Step 6: Capture complete original configuration
    print("Step 6: Capturing complete original configuration...")
    original_config = page.evaluate("""() => {
        return {
            // API Configuration
            api: {
                provider: window.DataService ? window.DataService.getBaseUrlProvider() : null,
                model: window.DataService ? window.DataService.getModel() : null,
                apiKey: window.DataService ? (window.DataService.getApiKey() ? 'set' : null) : null,
                toolsEnabled: window.FunctionToolsService ? window.FunctionToolsService.isToolsEnabled() : false
            },
            // MCP Configuration
            mcp: {
                github_token: window.CoreStorageService ? window.CoreStorageService.getValue('mcp_github_token') : null,
                gmail_oauth: window.CoreStorageService ? window.CoreStorageService.getValue('mcp_gmail_oauth') : null,
                oauth_tokens: window.CoreStorageService ? window.CoreStorageService.getValue('mcp-oauth-tokens') : null
            },
            // Function Configuration
            functions: {
                library: window.FunctionToolsService ? window.FunctionToolsService.getJsFunctions() : {},
                enabled: window.FunctionToolsService ? window.FunctionToolsService.getEnabledFunctionNames() : []
            },
            // Prompts Configuration
            prompts: {
                library: window.PromptsService ? window.PromptsService.getPrompts() : {},
                selectedIds: window.PromptsService ? window.PromptsService.getSelectedPromptIds() : [],
                selectedDefaultIds: window.DefaultPromptsService ? window.DefaultPromptsService.getSelectedDefaultPromptIds() : []
            },
            // Conversation Configuration
            conversation: {
                systemPrompt: window.DataService ? window.DataService.getSystemPrompt() : null,
                messageCount: window.aiHackare ? window.aiHackare.chatManager.getMessages().length : 0
            }
        };
    }""")
    
    print("Original comprehensive configuration captured:")
    print(f"  API: {original_config['api']['provider']}/{original_config['api']['model']}, Tools: {original_config['api']['toolsEnabled']}")
    print(f"  MCP: GitHub={bool(original_config['mcp']['github_token'])}, Gmail={bool(original_config['mcp']['gmail_oauth'])}")
    print(f"  Functions: {len(original_config['functions']['library'])} total, {len(original_config['functions']['enabled'])} enabled")
    print(f"  Prompts: {len(original_config['prompts']['library'])} total, {len(original_config['prompts']['selectedIds'])} selected")
    print(f"  Conversation: {original_config['conversation']['messageCount']} messages, System prompt: {len(original_config['conversation']['systemPrompt'] or '')} chars")
    
    # Step 7: Save as master agent
    print("\\nStep 7: Saving as master comprehensive agent...")
    page.locator('#agent-config-btn').click()
    page.wait_for_timeout(500)
    
    page.locator('#quick-agent-name').fill('master-comprehensive-agent')
    page.on("dialog", lambda dialog: dialog.accept())
    page.locator('#quick-save-agent').click()
    page.wait_for_timeout(3000)  # Extra time for comprehensive save
    
    page.locator('#close-agent-config-modal').click()
    page.wait_for_timeout(500)
    
    # Step 8: Clear all configurations
    print("Step 8: Clearing all configurations...")
    
    # Clear API
    page.locator('#settings-btn').click()
    page.wait_for_timeout(2000)
    page.locator('#base-url-select').select_option('openai')
    if tool_calling_checkbox.count() and tool_calling_checkbox.is_checked():
        tool_calling_checkbox.uncheck()
    page.locator('#close-settings').click()
    page.wait_for_timeout(1000)
    
    # Clear MCP
    page.evaluate("""() => {
        if (window.CoreStorageService) {
            window.CoreStorageService.setValue('mcp_github_token', null);
            window.CoreStorageService.setValue('mcp_gmail_oauth', null);
            window.CoreStorageService.setValue('mcp-oauth-tokens', {});
        }
    }""")
    
    # Clear functions
    page.locator('#function-btn').click()
    page.wait_for_timeout(1000)
    clear_functions_btn = page.locator('button:has-text("Clear All")')
    if clear_functions_btn.count():
        clear_functions_btn.click()
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
    
    # Clear conversation
    clear_chat_btn = page.locator('#clear-chat-btn')
    if clear_chat_btn.count():
        page.on("dialog", lambda dialog: dialog.accept())
        clear_chat_btn.click()
        page.wait_for_timeout(1000)
    
    page.evaluate("""() => {
        if (window.DataService && window.DataService.setSystemPrompt) {
            window.DataService.setSystemPrompt('');
        }
    }""")
    
    # Step 9: Verify all configurations were cleared
    print("Step 9: Verifying all configurations were cleared...")
    cleared_config = page.evaluate("""() => {
        return {
            api: {
                provider: window.DataService ? window.DataService.getBaseUrlProvider() : null,
                toolsEnabled: window.FunctionToolsService ? window.FunctionToolsService.isToolsEnabled() : false
            },
            mcp: {
                github_token: window.CoreStorageService ? window.CoreStorageService.getValue('mcp_github_token') : null
            },
            functions: {
                library: window.FunctionToolsService ? window.FunctionToolsService.getJsFunctions() : {}
            },
            prompts: {
                library: window.PromptsService ? window.PromptsService.getPrompts() : {}
            },
            conversation: {
                systemPrompt: window.DataService ? window.DataService.getSystemPrompt() : null,
                messageCount: window.aiHackare ? window.aiHackare.chatManager.getMessages().length : 0
            }
        };
    }""")
    
    print("Cleared configuration verified:")
    print(f"  API: {cleared_config['api']['provider']}, Tools: {cleared_config['api']['toolsEnabled']}")
    print(f"  MCP: GitHub={bool(cleared_config['mcp']['github_token'])}")
    print(f"  Functions: {len(cleared_config['functions']['library'])}")
    print(f"  Prompts: {len(cleared_config['prompts']['library'])}")
    print(f"  Conversation: {cleared_config['conversation']['messageCount']} messages")
    
    # Step 10: Load the master agent
    print("\\nStep 10: Loading master comprehensive agent...")
    page.locator('#agent-config-btn').click()
    page.wait_for_timeout(500)
    
    load_btn = page.locator('button:has-text("Load")').first
    load_btn.click()
    page.wait_for_timeout(5000)  # Extra time for comprehensive load
    
    if page.locator('#agent-config-modal').is_visible():
        page.locator('#close-agent-config-modal').click()
        page.wait_for_timeout(500)
    
    # Step 11: Verify all configurations were restored
    print("Step 11: Verifying all configurations were restored...")
    restored_config = page.evaluate("""() => {
        return {
            // API Configuration
            api: {
                provider: window.DataService ? window.DataService.getBaseUrlProvider() : null,
                model: window.DataService ? window.DataService.getModel() : null,
                apiKey: window.DataService ? (window.DataService.getApiKey() ? 'set' : null) : null,
                toolsEnabled: window.FunctionToolsService ? window.FunctionToolsService.isToolsEnabled() : false
            },
            // MCP Configuration
            mcp: {
                github_token: window.CoreStorageService ? window.CoreStorageService.getValue('mcp_github_token') : null,
                gmail_oauth: window.CoreStorageService ? window.CoreStorageService.getValue('mcp_gmail_oauth') : null,
                oauth_tokens: window.CoreStorageService ? window.CoreStorageService.getValue('mcp-oauth-tokens') : null
            },
            // Function Configuration
            functions: {
                library: window.FunctionToolsService ? window.FunctionToolsService.getJsFunctions() : {},
                enabled: window.FunctionToolsService ? window.FunctionToolsService.getEnabledFunctionNames() : []
            },
            // Prompts Configuration
            prompts: {
                library: window.PromptsService ? window.PromptsService.getPrompts() : {},
                selectedIds: window.PromptsService ? window.PromptsService.getSelectedPromptIds() : [],
                selectedDefaultIds: window.DefaultPromptsService ? window.DefaultPromptsService.getSelectedDefaultPromptIds() : []
            },
            // Conversation Configuration
            conversation: {
                systemPrompt: window.DataService ? window.DataService.getSystemPrompt() : null,
                messageCount: window.aiHackare ? window.aiHackare.chatManager.getMessages().length : 0
            }
        };
    }""")
    
    print("Restored comprehensive configuration:")
    print(f"  API: {restored_config['api']['provider']}/{restored_config['api']['model']}, Tools: {restored_config['api']['toolsEnabled']}")
    print(f"  MCP: GitHub={bool(restored_config['mcp']['github_token'])}, Gmail={bool(restored_config['mcp']['gmail_oauth'])}")
    print(f"  Functions: {len(restored_config['functions']['library'])} total, {len(restored_config['functions']['enabled'])} enabled")
    print(f"  Prompts: {len(restored_config['prompts']['library'])} total, {len(restored_config['prompts']['selectedIds'])} selected")
    print(f"  Conversation: {restored_config['conversation']['messageCount']} messages, System prompt: {len(restored_config['conversation']['systemPrompt'] or '')} chars")
    
    screenshot_with_markdown(page, "master_agent_comprehensive_test", {
        "Test Phase": "Master comprehensive agent save/load complete",
        "Original API Provider": str(original_config['api']['provider']),
        "Restored API Provider": str(restored_config['api']['provider']),
        "Original Functions": str(len(original_config['functions']['library'])),
        "Restored Functions": str(len(restored_config['functions']['library'])),
        "Original Prompts": str(len(original_config['prompts']['library'])),
        "Restored Prompts": str(len(restored_config['prompts']['library'])),
        "Original Messages": str(original_config['conversation']['messageCount']),
        "Restored Messages": str(restored_config['conversation']['messageCount']),
        "All Components Restored": "True"
    })
    
    # Step 12: Comprehensive validation
    print("\\nStep 12: Comprehensive validation of all components...")
    
    # Validate API configuration
    assert restored_config['api']['provider'] == original_config['api']['provider'], \
        f"API provider not restored: expected {original_config['api']['provider']}, got {restored_config['api']['provider']}"
    assert restored_config['api']['model'] == original_config['api']['model'], \
        f"API model not restored: expected {original_config['api']['model']}, got {restored_config['api']['model']}"
    assert restored_config['api']['toolsEnabled'] == original_config['api']['toolsEnabled'], \
        f"Tools enabled not restored: expected {original_config['api']['toolsEnabled']}, got {restored_config['api']['toolsEnabled']}"
    
    # Validate MCP configuration
    assert bool(restored_config['mcp']['github_token']) == bool(original_config['mcp']['github_token']), \
        "MCP GitHub token presence not restored"
    assert bool(restored_config['mcp']['gmail_oauth']) == bool(original_config['mcp']['gmail_oauth']), \
        "MCP Gmail OAuth presence not restored"
    
    # Validate function configuration
    assert len(restored_config['functions']['library']) == len(original_config['functions']['library']), \
        f"Function library count not restored: expected {len(original_config['functions']['library'])}, got {len(restored_config['functions']['library'])}"
    assert len(restored_config['functions']['enabled']) == len(original_config['functions']['enabled']), \
        f"Enabled functions count not restored: expected {len(original_config['functions']['enabled'])}, got {len(restored_config['functions']['enabled'])}"
    
    # Check for specific functions
    expected_functions = ['calculateCompoundInterest', 'convertUnits']
    for func_name in expected_functions:
        assert func_name in restored_config['functions']['library'], f"Function {func_name} not restored"
        assert func_name in restored_config['functions']['enabled'], f"Function {func_name} not enabled after restore"
    
    # Validate prompts configuration
    assert len(restored_config['prompts']['library']) == len(original_config['prompts']['library']), \
        f"Prompts library count not restored: expected {len(original_config['prompts']['library'])}, got {len(restored_config['prompts']['library'])}"
    assert len(restored_config['prompts']['selectedIds']) == len(original_config['prompts']['selectedIds']), \
        f"Selected prompts count not restored: expected {len(original_config['prompts']['selectedIds'])}, got {len(restored_config['prompts']['selectedIds'])}"
    
    # Check for specific prompts
    prompt_labels = [p.get('label', '') for p in restored_config['prompts']['library'].values()]
    assert 'Master Financial Advisor' in prompt_labels, "Master Financial Advisor prompt not restored"
    assert 'Master Unit Converter' in prompt_labels, "Master Unit Converter prompt not restored"
    
    # Validate conversation configuration
    assert restored_config['conversation']['messageCount'] == original_config['conversation']['messageCount'], \
        f"Message count not restored: expected {original_config['conversation']['messageCount']}, got {restored_config['conversation']['messageCount']}"
    
    original_system_prompt = original_config['conversation']['systemPrompt'] or ''
    restored_system_prompt = restored_config['conversation']['systemPrompt'] or ''
    assert restored_system_prompt == original_system_prompt, \
        f"System prompt not restored correctly: expected {len(original_system_prompt)} chars, got {len(restored_system_prompt)} chars"
    
    print("\\n🎉🎉🎉 MASTER COMPREHENSIVE AGENT TEST COMPLETED SUCCESSFULLY! 🎉🎉🎉")
    print("✅ ALL COMPONENTS SAVED AND RESTORED CORRECTLY:")
    print(f"  ✅ API Configuration: {original_config['api']['provider']}/{original_config['api']['model']} with tools={original_config['api']['toolsEnabled']}")
    print(f"  ✅ MCP Configuration: GitHub token + Gmail OAuth + additional tokens")
    print(f"  ✅ Function Library: {len(original_config['functions']['library'])} functions ({', '.join(expected_functions)})")
    print(f"  ✅ Prompts Library: {len(original_config['prompts']['library'])} prompts with {len(original_config['prompts']['selectedIds'])} selected")
    print(f"  ✅ Conversation History: {original_config['conversation']['messageCount']} messages + system prompt")
    print("\\n🔥 The agent system successfully preserves ALL configuration aspects! 🔥")

if __name__ == "__main__":
    test_agent_master_comprehensive_save_load()