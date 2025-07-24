"""
Debug which storage type is being used (localStorage vs sessionStorage)
"""
import pytest
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown


def test_debug_storage_type_detection(page: Page, serve_hacka_re, api_key):
    """Debug which storage is being used and why"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    print("=== DEBUGGING STORAGE TYPE SELECTION ===")
    
    # Check which storage type is being used
    storage_debug = page.evaluate("""() => {
        try {
            // Check StorageTypeService if available
            const storageTypeInfo = {
                StorageTypeServiceAvailable: typeof window.StorageTypeService,
                storage: null,
                isSessionStorage: false,
                isLocalStorage: false
            };
            
            if (typeof window.StorageTypeService !== 'undefined') {
                const storage = window.StorageTypeService.getStorage();
                storageTypeInfo.storage = storage === sessionStorage ? 'sessionStorage' : 
                                          storage === localStorage ? 'localStorage' : 'unknown';
                storageTypeInfo.isSessionStorage = storage === sessionStorage;
                storageTypeInfo.isLocalStorage = storage === localStorage;
                
                // Check why this storage type was selected
                if (typeof window.StorageTypeService.getStorageType === 'function') {
                    storageTypeInfo.storageType = window.StorageTypeService.getStorageType();
                }
                
                if (typeof window.StorageTypeService.isSharedLink === 'function') {
                    storageTypeInfo.isSharedLink = window.StorageTypeService.isSharedLink();
                }
            }
            
            return storageTypeInfo;
        } catch (error) {
            return { error: error.message, stack: error.stack };
        }
    }""")
    
    print(f"Storage type debug: {storage_debug}")
    
    # Test storing data and check both storages
    test_storage = page.evaluate("""() => {
        try {
            // Set a test value using CoreStorageService
            const testKey = 'storage_type_test';
            const testValue = { test: 'data', timestamp: Date.now() };
            
            const result = window.CoreStorageService.setValue(testKey, testValue);
            
            // Check both localStorage and sessionStorage
            const localKeys = Object.keys(localStorage);
            const sessionKeys = Object.keys(sessionStorage);
            
            // Get actual values from both
            const localValues = {};
            const sessionValues = {};
            
            localKeys.forEach(key => {
                localValues[key] = localStorage.getItem(key);
            });
            
            sessionKeys.forEach(key => {
                sessionValues[key] = sessionStorage.getItem(key);
            });
            
            return {
                success: true,
                setResult: result,
                localStorageKeys: localKeys,
                sessionStorageKeys: sessionKeys,
                localStorageCount: localKeys.length,
                sessionStorageCount: sessionKeys.length,
                localValues: localValues,
                sessionValues: sessionValues
            };
        } catch (error) {
            return { 
                error: error.message,
                stack: error.stack
            };
        }
    }""")
    
    print(f"Storage test result: {test_storage}")
    
    # Now set API key through UI and see where it goes
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
    
    # Check both storages after UI interaction
    after_ui_storage = page.evaluate("""() => {
        const localKeys = Object.keys(localStorage);
        const sessionKeys = Object.keys(sessionStorage);
        
        // Check if DataService can retrieve what we set
        const dataServiceState = {
            apiKey: window.DataService?.getApiKey() ? '***' + window.DataService.getApiKey().slice(-4) : 'none',
            provider: window.DataService?.getBaseUrlProvider() || 'none'
        };
        
        return {
            localStorageKeysAfterUI: localKeys,
            sessionStorageKeysAfterUI: sessionKeys,
            localCountAfterUI: localKeys.length,
            sessionCountAfterUI: sessionKeys.length,
            dataServiceState: dataServiceState
        };
    }""")
    
    print(f"After UI storage: {after_ui_storage}")
    
    # Try to save an agent and see where it goes
    agent_btn = page.locator('#agent-config-btn')
    agent_btn.click()
    page.wait_for_timeout(500)
    
    agent_name_input = page.locator('#quick-agent-name')
    agent_name_input.fill('storage-debug-agent')
    
    page.on("dialog", lambda dialog: dialog.accept())
    
    save_btn = page.locator('#quick-save-agent')
    save_btn.click()
    page.wait_for_timeout(2000)
    
    # Final storage check
    final_storage = page.evaluate("""() => {
        const localKeys = Object.keys(localStorage);
        const sessionKeys = Object.keys(sessionStorage);
        
        // Check AgentService
        const agentServiceState = {
            agentCount: 0,
            agents: {}
        };
        
        try {
            if (typeof window.AgentService !== 'undefined') {
                const agents = window.AgentService.getAllAgents();
                agentServiceState.agentCount = Object.keys(agents).length;
                agentServiceState.agents = agents;
            }
        } catch (e) {
            agentServiceState.error = e.message;
        }
        
        return {
            finalLocalKeys: localKeys,
            finalSessionKeys: sessionKeys,
            finalLocalCount: localKeys.length,
            finalSessionCount: sessionKeys.length,
            agentServiceState: agentServiceState
        };
    }""")
    
    print(f"Final storage state: {final_storage}")
    
    screenshot_with_markdown(page, "debug_storage_type_detection", {
        "Storage Type": str(storage_debug.get('storage', 'unknown')),
        "Is Shared Link": str(storage_debug.get('isSharedLink', 'unknown')),
        "Local Storage Keys": str(after_ui_storage.get('localCountAfterUI', 0)),
        "Session Storage Keys": str(after_ui_storage.get('sessionCountAfterUI', 0)),
        "Agent Count": str(final_storage.get('agentServiceState', {}).get('agentCount', 0)),
        "Final Session Keys": str(final_storage.get('finalSessionCount', 0))
    })