"""
Simple Shodan MCP Prompt Test
=============================
Tests the prompt registration logic directly without modal interactions.
"""
import pytest
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, dismiss_settings_modal


def test_shodan_prompt_registration_direct(page: Page, serve_hacka_re, shodan_api_key):
    """Test Shodan prompt registration by directly calling the registration methods"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Wait for system to initialize
    page.wait_for_timeout(2000)
    
    # Test the prompt registration system directly
    test_result = page.evaluate(f"""async () => {{
        try {{
            // Check if Shodan Integration Guide is available globally
            if (!window.ShodanIntegrationGuide) {{
                return {{ error: 'ShodanIntegrationGuide not loaded globally' }};
            }}
            
            // Check if DefaultPromptsService has the required methods
            if (!window.DefaultPromptsService) {{
                return {{ error: 'DefaultPromptsService not available' }};
            }}
            
            if (!window.DefaultPromptsService.registerPrompt) {{
                return {{ error: 'registerPrompt method not available' }};
            }}
            
            if (!window.DefaultPromptsService.enablePrompt) {{
                return {{ error: 'enablePrompt method not available' }};
            }}
            
            // Get initial state
            const initialPrompts = window.DefaultPromptsService.getDefaultPrompts();
            const initialSelected = window.DefaultPromptsService.getSelectedDefaultPromptIds();
            
            const initialState = {{
                promptCount: initialPrompts.length,
                selectedCount: initialSelected.length,
                hasShodan: initialPrompts.some(p => p.name === 'Shodan Integration Guide'),
                shodanEnabled: initialSelected.includes('shodan-integration-guide')
            }};
            
            // Manually register and enable Shodan prompt (simulating MCP connection)
            const registered = window.DefaultPromptsService.registerPrompt(window.ShodanIntegrationGuide);
            const enabled = window.DefaultPromptsService.enablePrompt('Shodan Integration Guide');
            
            // Get final state
            const finalPrompts = window.DefaultPromptsService.getDefaultPrompts();
            const finalSelected = window.DefaultPromptsService.getSelectedDefaultPromptIds();
            
            const finalState = {{
                promptCount: finalPrompts.length,
                selectedCount: finalSelected.length,
                hasShodan: finalPrompts.some(p => p.name === 'Shodan Integration Guide'),
                shodanEnabled: finalSelected.includes('shodan-integration-guide')
            }};
            
            // Get Shodan prompt details
            const shodanPrompt = finalPrompts.find(p => p.name === 'Shodan Integration Guide');
            
            return {{
                success: true,
                initialState,
                finalState,
                registered,
                enabled,
                shodanPromptExists: !!window.ShodanIntegrationGuide,
                shodanPromptDetails: shodanPrompt ? {{
                    id: shodanPrompt.id,
                    name: shodanPrompt.name,
                    category: shodanPrompt.category,
                    isMcpPrompt: shodanPrompt.isMcpPrompt,
                    hasContent: !!shodanPrompt.content
                }} : null
            }};
        }} catch (error) {{
            return {{
                error: error.message,
                stack: error.stack
            }};
        }}
    }}""")
    
    print(f"Test result: {test_result}")
    
    # Verify the test was successful
    assert test_result.get('success'), f"Test failed: {test_result.get('error')}"
    
    # Verify Shodan prompt exists globally
    assert test_result['shodanPromptExists'], "ShodanIntegrationGuide should be available globally"
    
    # Verify registration worked
    assert test_result['registered'], "registerPrompt should return true"
    assert test_result['enabled'], "enablePrompt should return true"
    
    # Verify state changes
    initial = test_result['initialState']
    final = test_result['finalState']
    
    assert not initial['hasShodan'], "Initially should not have Shodan prompt"
    assert not initial['shodanEnabled'], "Initially Shodan should not be enabled"
    
    assert final['hasShodan'], "Finally should have Shodan prompt"
    assert final['shodanEnabled'], "Finally Shodan should be enabled"
    
    assert final['promptCount'] == initial['promptCount'] + 1, "Should add exactly one prompt"
    assert final['selectedCount'] == initial['selectedCount'] + 1, "Should enable exactly one prompt"
    
    # Verify prompt details
    details = test_result['shodanPromptDetails']
    assert details is not None, "Shodan prompt details should be available"
    assert details['id'] == 'shodan-integration-guide', "Should have correct ID"
    assert details['name'] == 'Shodan Integration Guide', "Should have correct name"
    assert details['category'] == 'cybersecurity', "Should have cybersecurity category"
    assert details['isMcpPrompt'] is True, "Should be marked as MCP prompt"
    assert details['hasContent'], "Should have content"
    
    print("✅ Shodan prompt registration and enablement works correctly")


def test_shodan_prompt_content_verification(page: Page, serve_hacka_re):
    """Test that Shodan prompt content contains appropriate cybersecurity guidance"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Wait for system to initialize
    page.wait_for_timeout(1000)
    
    # Get Shodan prompt content
    prompt_analysis = page.evaluate("""() => {
        if (!window.ShodanIntegrationGuide) {
            return { error: 'ShodanIntegrationGuide not available' };
        }
        
        const content = window.ShodanIntegrationGuide.content;
        if (!content) {
            return { error: 'No content in ShodanIntegrationGuide' };
        }
        
        const contentLower = content.toLowerCase();
        
        // Check for key cybersecurity concepts
        const osintTerms = ['osint', 'reconnaissance', 'intelligence', 'cybersecurity'];
        const shodanTools = ['shodan_host_info', 'shodan_search', 'shodan_dns'];
        const ethicalTerms = ['ethical', 'responsible', 'defensive', 'legal'];
        const threatTerms = ['threat', 'vulnerability', 'security', 'risk'];
        
        const analysis = {
            contentLength: content.length,
            hasOsintTerms: osintTerms.some(term => contentLower.includes(term)),
            hasShodanTools: shodanTools.some(tool => contentLower.includes(tool)),
            hasEthicalGuidance: ethicalTerms.some(term => contentLower.includes(term)),
            hasThreatContext: threatTerms.some(term => contentLower.includes(term)),
            foundOsintTerms: osintTerms.filter(term => contentLower.includes(term)),
            foundShodanTools: shodanTools.filter(tool => contentLower.includes(tool)),
            foundEthicalTerms: ethicalTerms.filter(term => contentLower.includes(term)),
            foundThreatTerms: threatTerms.filter(term => contentLower.includes(term))
        };
        
        return { success: true, analysis };
    }""")
    
    print(f"Prompt analysis: {prompt_analysis}")
    
    assert prompt_analysis.get('success'), f"Analysis failed: {prompt_analysis.get('error')}"
    
    analysis = prompt_analysis['analysis']
    
    # Verify content quality
    assert analysis['contentLength'] > 1000, "Prompt should have substantial content (>1000 chars)"
    assert analysis['hasOsintTerms'], f"Should contain OSINT terms, found: {analysis['foundOsintTerms']}"
    assert analysis['hasShodanTools'], f"Should contain Shodan tools, found: {analysis['foundShodanTools']}"
    assert analysis['hasEthicalGuidance'], f"Should contain ethical guidance, found: {analysis['foundEthicalTerms']}"
    assert analysis['hasThreatContext'], f"Should contain threat context, found: {analysis['foundThreatTerms']}"
    
    print("✅ Shodan prompt contains appropriate cybersecurity and ethical content")


def test_multiple_prompt_registration_handling(page: Page, serve_hacka_re):
    """Test that registering the same prompt multiple times is handled gracefully"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Wait for system to initialize
    page.wait_for_timeout(1000)
    
    # Test multiple registrations
    multi_registration_result = page.evaluate("""() => {
        try {
            const initialCount = window.DefaultPromptsService.getDefaultPrompts().length;
            
            // Register the same prompt multiple times
            const result1 = window.DefaultPromptsService.registerPrompt(window.ShodanIntegrationGuide);
            const result2 = window.DefaultPromptsService.registerPrompt(window.ShodanIntegrationGuide);
            const result3 = window.DefaultPromptsService.registerPrompt(window.ShodanIntegrationGuide);
            
            const finalCount = window.DefaultPromptsService.getDefaultPrompts().length;
            
            return {
                success: true,
                initialCount,
                finalCount,
                registrationResults: [result1, result2, result3],
                countIncrease: finalCount - initialCount
            };
        } catch (error) {
            return {
                error: error.message,
                stack: error.stack
            };
        }
    }""")
    
    print(f"Multiple registration result: {multi_registration_result}")
    
    assert multi_registration_result.get('success'), f"Test failed: {multi_registration_result.get('error')}"
    
    # All registrations should return true (idempotent)
    results = multi_registration_result['registrationResults']
    assert all(results), "All registration attempts should return true"
    
    # But count should only increase by 1 (no duplicates)
    assert multi_registration_result['countIncrease'] == 1, "Should only add the prompt once, not create duplicates"
    
    print("✅ Multiple prompt registrations handled gracefully (idempotent)")