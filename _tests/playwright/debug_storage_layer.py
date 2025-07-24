"""
Debug the storage layer to understand why nothing is persisting to localStorage
"""
import pytest
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown


def test_debug_core_storage_service(page: Page, serve_hacka_re, api_key):
    """Debug CoreStorageService operations step by step"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    print("=== DEBUGGING CORE STORAGE SERVICE ===")
    
    # Test direct CoreStorageService operations
    storage_debug = page.evaluate("""() => {
        try {
            console.log('Testing CoreStorageService directly...');
            
            if (typeof window.CoreStorageService === 'undefined') {
                return { error: 'CoreStorageService not available' };
            }
            
            // Test basic setValue/getValue
            const testKey = 'test_storage_debug';
            const testValue = { test: 'data', timestamp: Date.now() };
            
            console.log('Attempting to set value:', testKey, testValue);
            const setResult = window.CoreStorageService.setValue(testKey, testValue);
            console.log('setValue result:', setResult);
            
            // Check if it was actually stored
            const directCheck = localStorage.getItem(testKey);
            console.log('Direct localStorage check:', directCheck);
            
            // Try to retrieve via CoreStorageService
            const getValue = window.CoreStorageService.getValue(testKey);
            console.log('getValue result:', getValue);
            
            // Check localStorage keys
            const allKeys = Object.keys(localStorage);
            console.log('All localStorage keys:', allKeys);
            
            return {
                success: true,
                setResult: setResult,
                directCheck: directCheck,
                getValue: getValue,
                allKeys: allKeys,
                coreStorageAvailable: typeof window.CoreStorageService,
                namespaceServiceAvailable: typeof window.NamespaceService
            };
        } catch (error) {
            console.error('Storage debug error:', error);
            return { 
                error: error.message,
                stack: error.stack
            };
        }
    }""")
    
    print(f"Storage debug result: {storage_debug}")
    
    # Test NamespaceService operations
    namespace_debug = page.evaluate("""() => {
        try {
            if (typeof window.NamespaceService === 'undefined') {
                return { error: 'NamespaceService not available' };
            }
            
            const namespace = window.NamespaceService.getNamespace();
            const baseKeys = window.NamespaceService.BASE_STORAGE_KEYS;
            
            // Test namespaced key generation
            const testKey = 'test_namespaced';
            const namespacedKey = window.NamespaceService.getNamespacedKey ? 
                window.NamespaceService.getNamespacedKey(testKey) : 
                'namespace_method_not_available';
            
            return {
                success: true,
                namespace: namespace,
                baseKeys: baseKeys,
                namespacedKey: namespacedKey
            };
        } catch (error) {
            return { 
                error: error.message
            };
        }
    }""")
    
    print(f"Namespace debug result: {namespace_debug}")
    
    # Test DataService operations (what the UI uses)
    data_service_debug = page.evaluate("""() => {
        try {
            if (typeof window.DataService === 'undefined') {
                return { error: 'DataService not available' };
            }
            
            // Test setting API key
            console.log('Testing DataService.setApiKey...');
            window.DataService.setApiKey('test-api-key-12345');
            
            // Check what happened
            const retrievedKey = window.DataService.getApiKey();
            const allKeys = Object.keys(localStorage);
            
            return {
                success: true,
                setApiKey: 'test-api-key-12345',
                retrievedKey: retrievedKey,
                allKeysAfterSet: allKeys
            };
        } catch (error) {
            return { 
                error: error.message,
                stack: error.stack
            };
        }
    }""")
    
    print(f"DataService debug result: {data_service_debug}")
    
    screenshot_with_markdown(page, "debug_storage_layer", {
        "CoreStorage Available": str(storage_debug.get('coreStorageAvailable')),
        "Storage Test Success": str(storage_debug.get('success')),
        "localStorage Keys": str(len(storage_debug.get('allKeys', []))),
        "DataService Success": str(data_service_debug.get('success')),
        "Namespace": str(namespace_debug.get('namespace'))
    })


def test_debug_actual_ui_storage_flow(page: Page, serve_hacka_re, api_key):
    """Debug what happens when UI tries to store data"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    print("=== DEBUGGING UI STORAGE FLOW ===")
    
    # Monitor console messages
    console_messages = []
    page.on("console", lambda msg: console_messages.append(f"{msg.type}: {msg.text}"))
    
    # Check initial state
    initial_state = page.evaluate("() => ({ keys: Object.keys(localStorage), count: Object.keys(localStorage).length })")
    print(f"Initial localStorage: {initial_state}")
    
    # Open settings and set API key (this should trigger storage)
    settings_btn = page.locator('#settings-btn')
    settings_btn.click()
    page.wait_for_timeout(500)
    
    # Monitor storage before API key input
    before_api_key = page.evaluate("() => ({ keys: Object.keys(localStorage), count: Object.keys(localStorage).length })")
    print(f"Before API key localStorage: {before_api_key}")
    
    api_key_input = page.locator('#api-key-update')
    api_key_input.fill(api_key)
    
    # Check if filling the input triggered any storage
    after_fill = page.evaluate("() => ({ keys: Object.keys(localStorage), count: Object.keys(localStorage).length })")
    print(f"After fill localStorage: {after_fill}")
    
    # Trigger the input event manually (might be needed for storage)
    page.evaluate("document.getElementById('api-key-update').dispatchEvent(new Event('input', { bubbles: true }))")
    page.wait_for_timeout(100)
    
    after_input_event = page.evaluate("() => ({ keys: Object.keys(localStorage), count: Object.keys(localStorage).length })")
    print(f"After input event localStorage: {after_input_event}")
    
    # Try blur event (some UIs save on blur)
    page.evaluate("document.getElementById('api-key-update').dispatchEvent(new Event('blur', { bubbles: true }))")
    page.wait_for_timeout(100)
    
    after_blur = page.evaluate("() => ({ keys: Object.keys(localStorage), count: Object.keys(localStorage).length })")
    print(f"After blur localStorage: {after_blur}")
    
    # Select provider
    provider_select = page.locator('#base-url-select')
    provider_select.select_option('groq')
    page.wait_for_timeout(100)
    
    after_provider = page.evaluate("() => ({ keys: Object.keys(localStorage), count: Object.keys(localStorage).length })")
    print(f"After provider selection localStorage: {after_provider}")
    
    # Close settings (might trigger save)
    close_settings_btn = page.locator('#close-settings')
    close_settings_btn.click()
    page.wait_for_timeout(500)
    
    after_close_settings = page.evaluate("() => ({ keys: Object.keys(localStorage), count: Object.keys(localStorage).length })")
    print(f"After close settings localStorage: {after_close_settings}")
    
    # Test what DataService thinks is stored
    data_service_state = page.evaluate("""() => {
        try {
            return {
                apiKey: window.DataService?.getApiKey() ? '***' + window.DataService.getApiKey().slice(-4) : 'none',
                model: window.DataService?.getModel() || 'none',
                provider: window.DataService?.getBaseUrlProvider() || 'none',
                baseUrl: window.DataService?.getBaseUrl() || 'none'
            };
        } catch (error) {
            return { error: error.message };
        }
    }""")
    print(f"DataService state: {data_service_state}")
    
    # Check all localStorage content
    final_storage = page.evaluate("""() => {
        const keys = Object.keys(localStorage);
        const content = {};
        keys.forEach(key => {
            const value = localStorage.getItem(key);
            if (key.includes('api') || key.includes('key')) {
                content[key] = value ? '***' + value.slice(-4) : 'none';
            } else {
                content[key] = value && value.length > 100 ? value.substring(0, 100) + '...' : value;
            }
        });
        return { keys, content, count: keys.length };
    }""")
    print(f"Final localStorage: {final_storage}")
    
    print(f"Console messages count: {len(console_messages)}")
    for i, msg in enumerate(console_messages[-10:]):  # Last 10 messages
        print(f"  [{i}] {msg}")
    
    screenshot_with_markdown(page, "debug_ui_storage_flow", {
        "Initial Keys": str(initial_state['count']),
        "Final Keys": str(final_storage['count']),
        "DataService API Key": str(data_service_state.get('apiKey')),
        "DataService Provider": str(data_service_state.get('provider')),
        "Console Messages": str(len(console_messages))
    })