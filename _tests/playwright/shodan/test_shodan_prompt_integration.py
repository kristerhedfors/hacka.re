"""
Shodan MCP Prompt Integration Test
==================================
Tests that Shodan prompt appears in System Prompts UI after successful MCP connection.
"""
import pytest
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal


def test_shodan_prompt_appears_in_ui_after_connection(page: Page, serve_hacka_re, shodan_api_key):
    """Test that Shodan prompt appears in System Prompts UI after manual connection simulation"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    # Wait for system to initialize
    page.wait_for_timeout(2000)
    
    # Simulate successful Shodan MCP connection
    connection_result = page.evaluate(f"""async () => {{
        try {{
            // Set API key in storage (simulating user input)
            await window.CoreStorageService.setValue('shodan_api_key', '{shodan_api_key}');
            
            // Get service config and simulate createShodanConnection call
            // (this would normally be called by connectService after API key validation)
            const serviceKey = 'shodan';
            
            // Create a mock config object similar to what's in SERVICE_CONFIGS
            const mockConfig = {{
                name: 'Shodan',
                authType: 'api-key',
                tools: {{}} // Not needed for prompt registration
            }};
            
            // Call createShodanConnection directly (this is what registers the prompt)
            const connected = await window.MCPServiceConnectors.createShodanConnection(
                serviceKey, 
                mockConfig, 
                '{shodan_api_key}'
            );
            
            return {{
                success: true,
                connected: connected
            }};
        }} catch (error) {{
            return {{
                error: error.message,
                stack: error.stack
            }};
        }}
    }}""")
    
    print(f"Connection result: {connection_result}")
    
    assert connection_result.get('success'), f"Connection failed: {connection_result.get('error')}"
    assert connection_result.get('connected'), "Connection should return true"
    
    # Wait for prompt registration to complete
    page.wait_for_timeout(1000)
    
    # Verify prompt was registered and enabled
    prompt_status = page.evaluate("""() => {
        const allPrompts = window.DefaultPromptsService.getDefaultPrompts();
        const selectedIds = window.DefaultPromptsService.getSelectedDefaultPromptIds();
        
        const shodanPrompt = allPrompts.find(p => p.name === 'Shodan Integration Guide');
        
        return {
            promptRegistered: !!shodanPrompt,
            promptEnabled: selectedIds.includes('shodan-integration-guide'),
            totalPrompts: allPrompts.length,
            selectedPrompts: selectedIds.length
        };
    }""")
    
    print(f"Prompt status: {prompt_status}")
    
    assert prompt_status['promptRegistered'], "Shodan prompt should be registered after connection"
    assert prompt_status['promptEnabled'], "Shodan prompt should be enabled after connection"
    
    # Now check if it appears in the System Prompts UI
    # Open settings modal
    settings_button = page.locator("#settings-btn")
    settings_button.click()
    
    # Wait for settings modal to appear
    page.wait_for_selector("#settings-modal", state="visible", timeout=5000)
    
    # Click on System Prompts tab
    prompts_tab = page.locator("button:has-text('System Prompts')")
    expect(prompts_tab).to_be_visible()
    prompts_tab.click()
    
    # Wait for prompts section to load
    page.wait_for_timeout(1000)
    
    # Check if Shodan Integration Guide appears in the UI
    # Look for the prompt name in the UI
    shodan_prompt_text = page.locator("text=Shodan Integration Guide")
    expect(shodan_prompt_text).to_be_visible()
    
    # Check if the cybersecurity category appears
    cybersecurity_text = page.locator("text=cybersecurity")
    expect(cybersecurity_text).to_be_visible()
    
    print("✅ Shodan Integration Guide prompt is visible in System Prompts UI")
    
    # Take a screenshot to verify the UI appearance
    page.screenshot(path="_tests/playwright/screenshots/shodan_prompt_in_ui.png")
    
    # Close the modal
    close_button = page.locator("#close-settings")
    close_button.click()
    
    # Wait for modal to close
    page.wait_for_selector("#settings-modal", state="hidden", timeout=3000)
    
    print("✅ Integration test completed successfully")


def test_shodan_prompt_system_integration(page: Page, serve_hacka_re, shodan_api_key):
    """Test that Shodan prompt integrates with the system prompt when enabled"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    # Wait for system initialization
    page.wait_for_timeout(2000)
    
    # Simulate Shodan connection and prompt registration
    page.evaluate(f"""async () => {{
        await window.CoreStorageService.setValue('shodan_api_key', '{shodan_api_key}');
        
        const mockConfig = {{
            name: 'Shodan',
            authType: 'api-key',
            tools: {{}}
        }};
        
        await window.MCPServiceConnectors.createShodanConnection('shodan', mockConfig, '{shodan_api_key}');
    }}""")
    
    # Wait for prompt registration
    page.wait_for_timeout(1000)
    
    # Check if the system prompt gets updated when prompts are applied
    system_prompt_result = page.evaluate("""() => {
        try {
            // Get selected prompts
            const selectedPrompts = window.DefaultPromptsService.getSelectedDefaultPrompts();
            const shodanPrompt = selectedPrompts.find(p => p.name === 'Shodan Integration Guide');
            
            // Check if system prompt coordinator exists and can be triggered
            const hasCoordinator = !!window.SystemPromptCoordinator;
            
            return {
                success: true,
                selectedPromptsCount: selectedPrompts.length,
                hasShodanInSelected: !!shodanPrompt,
                hasSystemPromptCoordinator: hasCoordinator,
                shodanPromptContent: shodanPrompt ? shodanPrompt.content.substring(0, 100) + '...' : null
            };
        } catch (error) {
            return {
                error: error.message,
                stack: error.stack
            };
        }
    }""")
    
    print(f"System prompt result: {system_prompt_result}")
    
    assert system_prompt_result.get('success'), f"System prompt test failed: {system_prompt_result.get('error')}"
    assert system_prompt_result['selectedPromptsCount'] > 0, "Should have selected prompts"
    assert system_prompt_result['hasShodanInSelected'], "Shodan should be in selected prompts"
    assert system_prompt_result['hasSystemPromptCoordinator'], "SystemPromptCoordinator should exist"
    assert system_prompt_result['shodanPromptContent'] is not None, "Shodan prompt should have content"
    
    print("✅ Shodan prompt integrates correctly with system prompt coordination")