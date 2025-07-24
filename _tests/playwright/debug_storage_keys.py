"""
Debug storage key patterns to understand why agents aren't being saved/loaded
"""
import pytest
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown


def test_debug_storage_keys(page: Page, serve_hacka_re, api_key):
    """Debug the actual localStorage keys being used"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    print("=== DEBUGGING STORAGE KEYS ===")
    
    # Check initial localStorage state
    initial_storage = page.evaluate("() => Object.keys(localStorage)")
    print(f"Initial localStorage keys: {initial_storage}")
    
    # Set up configuration
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
    
    # Check localStorage after setting config
    after_config_storage = page.evaluate("() => Object.keys(localStorage)")
    print(f"After config localStorage keys: {after_config_storage}")
    
    # Check the actual values
    storage_values = page.evaluate("""() => {
        const keys = Object.keys(localStorage);
        const values = {};
        keys.forEach(key => {
            const value = localStorage.getItem(key);
            // Mask API keys for security
            if (key.includes('api') || key.includes('key')) {
                values[key] = value ? `***${value.slice(-4)}` : 'none';
            } else {
                values[key] = value;
            }
        });
        return values;
    }""")
    print(f"Storage values: {storage_values}")
    
    # Open agent modal and try to save
    agent_btn = page.locator('#agent-config-btn')
    agent_btn.click()
    page.wait_for_timeout(500)
    
    agent_name_input = page.locator('#quick-agent-name')
    agent_name_input.fill('debug-keys-agent')
    
    # Monitor for any new localStorage keys after clicking save
    page.on("dialog", lambda dialog: dialog.accept())
    
    save_btn = page.locator('#quick-save-agent')
    save_btn.click()
    page.wait_for_timeout(2000)  # Wait for save
    
    # Check localStorage after save attempt
    after_save_storage = page.evaluate("() => Object.keys(localStorage)")
    print(f"After save localStorage keys: {after_save_storage}")
    
    # Check for new values
    after_save_values = page.evaluate("""() => {
        const keys = Object.keys(localStorage);
        const values = {};
        keys.forEach(key => {
            const value = localStorage.getItem(key);
            // Mask API keys for security
            if (key.includes('api') || key.includes('key')) {
                values[key] = value ? `***${value.slice(-4)}` : 'none';
            } else {
                values[key] = value ? (value.length > 100 ? `${value.substring(0, 100)}...` : value) : 'none';
            }
        });
        return values;
    }""")
    print(f"After save storage values: {after_save_values}")
    
    # Try to access AgentService directly to see what it thinks
    agent_service_check = page.evaluate("""() => {
        try {
            if (typeof window.AgentService === 'undefined') {
                return { error: 'AgentService not available' };
            }
            
            const agents = window.AgentService.getAllAgents();
            const agentList = window.AgentService.listAgents();
            
            return {
                success: true,
                allAgents: agents,
                agentList: agentList,
                agentCount: Object.keys(agents).length
            };
        } catch (error) {
            return { 
                error: error.message,
                stack: error.stack?.substring(0, 200)
            };
        }
    }""")
    print(f"AgentService check: {agent_service_check}")
    
    # Check NamespaceService configuration
    namespace_check = page.evaluate("""() => {
        try {
            if (typeof window.NamespaceService === 'undefined') {
                return { error: 'NamespaceService not available' };
            }
            
            const namespace = window.NamespaceService.getNamespace();
            const baseKeys = window.NamespaceService.BASE_STORAGE_KEYS;
            
            return {
                success: true,
                namespace: namespace,
                baseKeys: baseKeys
            };
        } catch (error) {
            return { 
                error: error.message
            };
        }
    }""")
    print(f"NamespaceService check: {namespace_check}")
    
    screenshot_with_markdown(page, "debug_storage_keys_final", {
        "Initial Keys": str(len(initial_storage)),
        "After Config Keys": str(len(after_config_storage)),
        "After Save Keys": str(len(after_save_storage)),
        "Agent Service": str(agent_service_check.get('agentCount', 'error')),
        "Namespace": str(namespace_check.get('namespace', 'error'))
    })