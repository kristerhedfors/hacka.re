"""
Shodan MCP Prompt Integration Tests
=====================================
Tests that Shodan MCP connection automatically registers and enables the Shodan Integration Guide prompt.
"""
import pytest
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal


def test_shodan_prompt_registration_on_connection(page: Page, serve_hacka_re, shodan_api_key):
    """Test that Shodan prompt is registered and enabled when Shodan MCP connects"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    # Wait for system to initialize
    page.wait_for_timeout(2000)
    
    # Check initial state - Shodan prompt should not be available
    initial_prompts = page.evaluate("""() => {
        if (!window.DefaultPromptsService) return { error: 'DefaultPromptsService not available' };
        
        const allPrompts = window.DefaultPromptsService.getDefaultPrompts();
        const selectedIds = window.DefaultPromptsService.getSelectedDefaultPromptIds();
        
        return {
            allPromptCount: allPrompts.length,
            allPromptNames: allPrompts.map(p => p.name),
            selectedCount: selectedIds.length,
            selectedIds: selectedIds,
            hasShodanPrompt: allPrompts.some(p => p.name.includes('Shodan')),
            shodanPromptEnabled: selectedIds.includes('shodan-integration-guide')
        };
    }""")
    
    print(f"Initial prompts state: {initial_prompts}")
    
    # Initially, Shodan prompt should not be available
    assert not initial_prompts['hasShodanPrompt'], "Shodan prompt should not be available before connection"
    assert not initial_prompts['shodanPromptEnabled'], "Shodan prompt should not be enabled before connection"
    
    # Connect to Shodan MCP by passing API key directly as credential
    connection_result = page.evaluate(f"""async () => {{
        try {{
            // Simulate MCP connection by calling connectService with credentials
            if (!window.MCPServiceConnectors) {{
                return {{ error: 'MCPServiceConnectors not available' }};
            }}

            const serviceKey = 'shodan';
            const credentials = {{ apiKey: '{shodan_api_key}' }};

            // Use connectService with credentials to skip modal
            const connected = await window.MCPServiceConnectors.connectService(serviceKey, credentials);

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
    
    # Check if connection was successful
    assert connection_result.get('success'), f"Failed to connect to Shodan MCP: {connection_result.get('error')}"
    assert connection_result.get('connected'), "Shodan MCP connection should return true"
    
    # Wait for prompt registration to complete
    page.wait_for_timeout(1000)
    
    # Check post-connection state - Shodan prompt should now be registered and enabled
    final_prompts = page.evaluate("""() => {
        if (!window.DefaultPromptsService) return { error: 'DefaultPromptsService not available' };
        
        const allPrompts = window.DefaultPromptsService.getDefaultPrompts();
        const selectedIds = window.DefaultPromptsService.getSelectedDefaultPromptIds();
        const shodanPrompt = allPrompts.find(p => p.name.includes('Shodan'));
        
        return {
            allPromptCount: allPrompts.length,
            allPromptNames: allPrompts.map(p => p.name),
            selectedCount: selectedIds.length,
            selectedIds: selectedIds,
            hasShodanPrompt: !!shodanPrompt,
            shodanPromptEnabled: selectedIds.includes('shodan-integration-guide'),
            shodanPromptDetails: shodanPrompt ? {
                id: shodanPrompt.id,
                name: shodanPrompt.name,
                category: shodanPrompt.category,
                isMcpPrompt: shodanPrompt.isMcpPrompt
            } : null
        };
    }""")
    
    print(f"Final prompts state: {final_prompts}")
    
    # Verify Shodan prompt is now registered and enabled
    assert final_prompts['hasShodanPrompt'], "Shodan prompt should be registered after MCP connection"
    assert final_prompts['shodanPromptEnabled'], "Shodan prompt should be enabled after MCP connection"
    
    # Verify prompt details
    shodan_details = final_prompts['shodanPromptDetails']
    assert shodan_details is not None, "Shodan prompt details should be available"
    assert shodan_details['id'] == 'shodan-integration-guide', "Shodan prompt should have correct ID"
    assert 'Shodan' in shodan_details['name'], "Shodan prompt should have Shodan in name"
    assert shodan_details['category'] == 'cybersecurity', "Shodan prompt should have cybersecurity category"
    assert shodan_details['isMcpPrompt'] is True, "Shodan prompt should be marked as MCP prompt"
    
    # Verify prompt count increased by exactly 1
    assert final_prompts['allPromptCount'] == initial_prompts['allPromptCount'] + 1, "Exactly one prompt should be added"
    assert final_prompts['selectedCount'] == initial_prompts['selectedCount'] + 1, "Exactly one prompt should be enabled"


def test_shodan_prompt_appears_in_system_prompts_ui(page: Page, serve_hacka_re, shodan_api_key):
    """Test that Shodan prompt appears in the System Prompts UI after connection"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    # Connect to Shodan first with credentials to skip modal
    page.evaluate(f"""async () => {{
        await window.MCPServiceConnectors.connectService('shodan', {{ apiKey: '{shodan_api_key}' }});
    }}""")
    
    # Wait for prompt registration
    page.wait_for_timeout(1000)
    
    # Open settings modal and navigate to System Prompts
    settings_button = page.locator("#settings-btn")
    settings_button.click()
    
    # Wait for settings modal to appear
    page.wait_for_selector("#settings-modal", state="visible", timeout=5000)
    
    # Click on System Prompts button (use more specific selector)
    prompts_btn = page.locator("#prompts-btn")
    prompts_btn.click()
    
    # Wait for prompts section to load
    page.wait_for_timeout(1000)
    
    # Check if Shodan prompt appears in the UI
    shodan_prompt_element = page.locator("text=/Shodan/")
    expect(shodan_prompt_element).to_be_visible()
    
    print("✅ Shodan Integration Guide prompt is visible and enabled in System Prompts UI")


def test_shodan_prompt_content_quality(page: Page, serve_hacka_re, shodan_api_key):
    """Test that Shodan prompt has appropriate cybersecurity content"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    # Connect to Shodan with credentials and get prompt content
    prompt_content = page.evaluate(f"""async () => {{
        await window.MCPServiceConnectors.connectService('shodan', {{ apiKey: '{shodan_api_key}' }});

        // Wait a moment for registration
        await new Promise(resolve => setTimeout(resolve, 500));

        const shodanPrompt = window.DefaultPromptsService.getDefaultPrompts().find(p => p.name.includes('Shodan'));
        return shodanPrompt ? shodanPrompt.content : null;
    }}""")
    
    assert prompt_content is not None, "Shodan prompt content should be available"
    
    # Verify key cybersecurity content is present
    cybersecurity_keywords = [
        "OSINT", "cybersecurity", "reconnaissance", "threat intelligence",
        "shodan_host_info", "shodan_search", "infrastructure analysis",
        "vulnerability", "honeypot", "ethical", "defensive"
    ]
    
    for keyword in cybersecurity_keywords:
        assert keyword.lower() in prompt_content.lower(), f"Prompt should contain '{keyword}' for proper cybersecurity guidance"
    
    # Verify ethical guidelines are present
    ethical_guidelines = ["ethical", "responsible", "defensive", "legal compliance"]
    ethical_content_found = any(guideline.lower() in prompt_content.lower() for guideline in ethical_guidelines)
    assert ethical_content_found, "Prompt should contain ethical guidelines for responsible OSINT use"
    
    print("✅ Shodan prompt contains appropriate cybersecurity and ethical content")