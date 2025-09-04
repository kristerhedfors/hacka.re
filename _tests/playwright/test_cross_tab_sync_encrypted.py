"""Test cross-tab synchronization with encrypted storage"""

from playwright.sync_api import Page, expect, BrowserContext
import json
import time
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_cross_tab_sync_encrypted_storage(page: Page, context: BrowserContext, serve_hacka_re, api_key):
    """Test that cross-tab sync works with encrypted, namespaced storage"""
    
    # Navigate to the first tab
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Set a custom namespace by setting title/subtitle
    page.evaluate("""() => {
        // Set custom title and subtitle to create a specific namespace
        DataService.saveTitle('TestSync');
        DataService.saveSubtitle('Testing Cross Tab');
        
        // Reinitialize namespace to use the new values
        NamespaceService.resetNamespaceCache();
        
        // Reinitialize cross-tab sync with new namespace
        if (window.CrossTabSyncService) {
            window.CrossTabSyncService.destroy();
            window.CrossTabSyncService.init();
        }
    }""")
    
    # Configure API key for testing
    page.locator("#settings-btn").click()
    api_key_field = page.locator("#api-key-update")
    api_key_field.fill(api_key)
    page.locator("#close-settings").click()
    
    # Send a message in the first tab
    message_input = page.locator("#message-input")
    message_input.fill("Test message for cross-tab sync")
    page.locator("#send-btn").click()
    
    # Wait for response
    page.wait_for_selector(".message.assistant", state="visible", timeout=10000)
    
    # Get the sync status from the first tab
    sync_status_tab1 = page.evaluate("""() => {
        return CrossTabSyncService.getSyncStatus();
    }""")
    
    print(f"Tab 1 sync status: {json.dumps(sync_status_tab1, indent=2)}")
    
    # Verify sync variables are encrypted in storage
    storage_check = page.evaluate("""() => {
        const namespace = NamespaceService.getNamespace();
        const allKeys = Object.keys(localStorage);
        const syncKeys = allKeys.filter(key => key.includes('sync_'));
        
        return {
            namespace: namespace,
            allStorageKeys: allKeys,
            syncKeys: syncKeys,
            encryptedSyncKeys: syncKeys.filter(key => key.startsWith('encrypted_')),
            unencryptedSyncKeys: syncKeys.filter(key => !key.startsWith('encrypted_'))
        };
    }""")
    
    print(f"Storage check: {json.dumps(storage_check, indent=2)}")
    
    # Verify NO unencrypted sync_ keys exist
    assert len(storage_check['unencryptedSyncKeys']) == 0, f"Found unencrypted sync keys: {storage_check['unencryptedSyncKeys']}"
    
    # Verify encrypted sync keys exist and are namespaced
    assert len(storage_check['encryptedSyncKeys']) > 0, "No encrypted sync keys found"
    for key in storage_check['encryptedSyncKeys']:
        assert storage_check['namespace'] in key, f"Sync key not namespaced: {key}"
    
    # Open a second tab with the same namespace
    page2 = context.new_page()
    page2.goto(serve_hacka_re)
    
    # Set the same namespace in the second tab
    page2.evaluate("""() => {
        // Set same title and subtitle to use same namespace
        DataService.saveTitle('TestSync');
        DataService.saveSubtitle('Testing Cross Tab');
        
        // Reinitialize namespace
        NamespaceService.resetNamespaceCache();
        
        // Reinitialize cross-tab sync
        if (window.CrossTabSyncService) {
            window.CrossTabSyncService.destroy();
            window.CrossTabSyncService.init();
        }
    }""")
    
    # Wait for sync to propagate
    time.sleep(2)
    
    # Check if history is synced in the second tab
    messages_tab2 = page2.locator(".message")
    expect(messages_tab2).to_have_count(2, timeout=5000)  # User + assistant message
    
    # Get sync status from second tab
    sync_status_tab2 = page2.evaluate("""() => {
        return CrossTabSyncService.getSyncStatus();
    }""")
    
    print(f"Tab 2 sync status: {json.dumps(sync_status_tab2, indent=2)}")
    
    # Verify both tabs are using the same namespace
    assert sync_status_tab1['namespace'] == sync_status_tab2['namespace'], "Tabs using different namespaces"
    
    # Send another message from tab 2
    message_input2 = page2.locator("#message-input")
    message_input2.fill("Message from second tab")
    page2.locator("#send-btn").click()
    
    # Wait for response in tab 2
    page2.wait_for_selector(".message.assistant:nth-of-type(2)", state="visible", timeout=10000)
    
    # Wait for sync to propagate back to tab 1
    time.sleep(2)
    
    # Switch back to first tab and verify it has the new message
    messages_tab1 = page.locator(".message")
    expect(messages_tab1).to_have_count(4, timeout=5000)  # 2 user + 2 assistant messages
    
    # Verify sync variable content is properly encrypted
    sync_var_check = page.evaluate("""() => {
        // Try to read sync variables through the encrypted storage
        const historyHash = DataService.getSyncVariable('history_hash');
        
        // Try to read raw localStorage (should be encrypted)
        const namespace = NamespaceService.getNamespace();
        const rawKey = `encrypted_${namespace}_sync_history_hash`;
        const rawValue = localStorage.getItem(rawKey);
        
        return {
            decryptedValue: historyHash,
            rawEncryptedValue: rawValue,
            isEncrypted: rawValue && !rawValue.includes('hash') && !rawValue.includes('tabId')
        };
    }""")
    
    print(f"Sync variable check: {json.dumps(sync_var_check, indent=2)}")
    
    # Verify the raw value is encrypted (doesn't contain plaintext)
    assert sync_var_check['isEncrypted'], "Sync variables are not properly encrypted"
    
    # Verify decrypted value has the expected structure
    assert sync_var_check['decryptedValue'] is not None, "Could not decrypt sync variable"
    assert 'hash' in sync_var_check['decryptedValue'], "Decrypted value missing hash field"
    assert 'tabId' in sync_var_check['decryptedValue'], "Decrypted value missing tabId field"
    
    screenshot_with_markdown(page, "cross_tab_sync_encrypted", {
        "Status": "Cross-tab sync with encrypted storage verified",
        "Namespace": sync_status_tab1['namespace'],
        "Encrypted Keys": len(storage_check['encryptedSyncKeys']),
        "Unencrypted Keys": len(storage_check['unencryptedSyncKeys']),
        "Messages Synced": "Yes"
    })
    
    # Clean up
    page2.close()


def test_cross_tab_sync_different_namespaces(page: Page, context: BrowserContext, serve_hacka_re, api_key):
    """Test that different namespaces don't sync with each other"""
    
    # Set up first tab with namespace A
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    page.evaluate("""() => {
        DataService.saveTitle('NamespaceA');
        DataService.saveSubtitle('First Namespace');
        NamespaceService.resetNamespaceCache();
        if (window.CrossTabSyncService) {
            window.CrossTabSyncService.destroy();
            window.CrossTabSyncService.init();
        }
    }""")
    
    # Configure API and send a message
    page.locator("#settings-btn").click()
    page.locator("#api-key-update").fill(api_key)
    page.locator("#close-settings").click()
    
    page.locator("#message-input").fill("Message in namespace A")
    page.locator("#send-btn").click()
    page.wait_for_selector(".message.assistant", state="visible", timeout=10000)
    
    # Open second tab with different namespace
    page2 = context.new_page()
    page2.goto(serve_hacka_re)
    
    page2.evaluate("""() => {
        DataService.saveTitle('NamespaceB');
        DataService.saveSubtitle('Second Namespace');
        NamespaceService.resetNamespaceCache();
        if (window.CrossTabSyncService) {
            window.CrossTabSyncService.destroy();
            window.CrossTabSyncService.init();
        }
    }""")
    
    # Wait a moment to see if sync incorrectly happens
    time.sleep(2)
    
    # Verify second tab doesn't have messages from first tab
    messages_tab2 = page2.locator(".message")
    expect(messages_tab2).to_have_count(0)
    
    # Get namespaces from both tabs
    namespace_tab1 = page.evaluate("() => NamespaceService.getNamespace()")
    namespace_tab2 = page2.evaluate("() => NamespaceService.getNamespace()")
    
    print(f"Tab 1 namespace: {namespace_tab1}")
    print(f"Tab 2 namespace: {namespace_tab2}")
    
    # Verify they are different
    assert namespace_tab1 != namespace_tab2, "Tabs should have different namespaces"
    
    # Verify sync variables are isolated
    sync_vars_tab1 = page.evaluate("() => DataService.getAllSyncVariables()")
    sync_vars_tab2 = page2.evaluate("() => DataService.getAllSyncVariables()")
    
    # Tab 1 should have sync variables, Tab 2 should not see them
    assert 'history_hash' in sync_vars_tab1, "Tab 1 should have history_hash"
    assert 'history_hash' not in sync_vars_tab2 or sync_vars_tab2.get('history_hash') != sync_vars_tab1.get('history_hash'), "Tab 2 should not see Tab 1's sync variables"
    
    screenshot_with_markdown(page, "cross_tab_sync_isolation", {
        "Status": "Namespace isolation verified",
        "Namespace Tab 1": namespace_tab1[:8] + "...",
        "Namespace Tab 2": namespace_tab2[:8] + "...",
        "Isolation": "Confirmed"
    })
    
    # Clean up
    page2.close()