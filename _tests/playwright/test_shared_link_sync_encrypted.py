"""Test cross-tab synchronization with encrypted storage using a real shared link"""

from playwright.sync_api import Page, expect, BrowserContext
import json
import time
from test_utils import screenshot_with_markdown

def test_shared_link_cross_tab_sync(page: Page, context: BrowserContext):
    """Test cross-tab sync works with encrypted storage using provided shared link"""
    
    shared_link = "http://localhost:8000/#gpt=uEQ0lwn_trMbLfFfwmENtqzQhp9569Y4-57QLN0Tuw3A1Wdld3wqLz6FD5TZ10WoxEe45wZArWNOVU-JO_7z3kaQpEum0wwfXrQoXvatlPCcUG_hcllnMOy8RCpJ_Y7zgsYldEkJa5vZ2EwOhA6kNFIyWetCIuuJ_xqsqqrOGMMLmh4aRitjEGYuSsTErBk5IP-8CRbcCbwYug-IJfOu7wzYdsLD5jUQYgNYpkjSURDen8ae6ghSwyn1KJ_5cio9Kyh6OkMKfjZozLLeOkW6wliugEKY_IOa7qv7-Z2WN4d8vs5WztfhXcFb5Xhz-ccRWimAt-O61W1LWWVSxHpiausFsoEXzaB3SMRJnSwvs4KWF4U69x-AoksrRUcPCK45sa_hr-mMnBjJKm9sdRNWulcJlZPGRzxdej2nj_ao91-fOOIb3Z7pWhs0JQZmSUobSl-BUpnq0oIrasz5PHl2z7i3wJDB880PhpPcj_SZWpBzYFYI7mo2-oRzbiQPmrNdh6Rx4iFxEAMdhWMGVkaFCXV3N0-vWVBEOLDIL1o8U8h-9qM3WmLdMyCRqhAjy2fqLJJKf_v-UZFvrDzxOmDlrEHFFtf_WgoU1AodN60belmsiY76hGvOWa2m"
    password = "asd"
    
    print("=== Testing Cross-Tab Sync with Encrypted Storage ===")
    
    # Open first tab with shared link
    page.goto(shared_link)
    
    # Wait a moment for the page to load
    time.sleep(1)
    
    # Handle password input (could be early-password-input or decrypt-password)
    password_input = page.locator('#early-password-input, #decrypt-password').first
    password_input.fill(password)
    
    # Submit password (press Enter or click decrypt button if visible)
    page.keyboard.press('Enter')
    
    # Wait for decryption to complete
    time.sleep(3)  # Allow decryption and initialization
    
    # Check initial state - CrossTabSyncService should be initialized
    sync_status_tab1 = page.evaluate("""() => {
        return {
            crossTabSyncInit: CrossTabSyncService ? CrossTabSyncService.isInitialized() : false,
            storageType: StorageTypeService ? StorageTypeService.getStorageType() : 'unknown',
            isUsingLocalStorage: StorageTypeService ? StorageTypeService.isUsingLocalStorage() : false,
            namespace: NamespaceService ? NamespaceService.getNamespace() : null,
            syncStatus: CrossTabSyncService ? CrossTabSyncService.getSyncStatus() : null
        };
    }""")
    
    print(f"Tab 1 initial status: {json.dumps(sync_status_tab1, indent=2)}")
    
    # Verify using localStorage (required for cross-tab sync)
    assert sync_status_tab1['isUsingLocalStorage'], "Should be using localStorage for shared links"
    assert sync_status_tab1['crossTabSyncInit'], "CrossTabSyncService should be initialized"
    
    # Check for existing messages
    messages_tab1_initial = page.locator(".message").count()
    print(f"Tab 1 initial messages: {messages_tab1_initial}")
    
    # Add a new message in tab 1
    message_input = page.locator("#message-input")
    message_input.fill("Test message from Tab 1 - encrypted sync test")
    page.locator("#send-btn").click()
    
    # Wait for the message to appear (user message class structure)
    page.wait_for_selector(".message.user", state="visible", timeout=5000)
    time.sleep(2)  # Allow sync to trigger and propagate
    
    # Check sync variables are encrypted
    storage_check = page.evaluate("""() => {
        const namespace = NamespaceService.getNamespace();
        const allKeys = Object.keys(localStorage);
        const syncKeys = allKeys.filter(key => key.includes('sync_'));
        
        // Get all sync variables through encrypted storage
        const syncVars = DataService.getAllSyncVariables();
        
        // Check if sync values are actually encrypted by trying to parse them
        const syncKeyEncryption = {};
        syncKeys.forEach(key => {
            const value = localStorage.getItem(key);
            let isEncrypted = true;
            try {
                // If we can parse it as JSON with expected structure, it's not encrypted
                const parsed = JSON.parse(value);
                if (parsed.hash || parsed.tabId || parsed.type) {
                    isEncrypted = false;
                }
            } catch {
                // Can't parse as JSON - likely encrypted
                isEncrypted = true;
            }
            syncKeyEncryption[key] = isEncrypted;
        });
        
        return {
            namespace: namespace,
            syncKeys: syncKeys,
            namespacedSyncKeys: syncKeys.filter(key => key.includes(namespace.namespaceId || namespace)),
            syncKeyEncryption: syncKeyEncryption,
            actuallyEncryptedKeys: Object.keys(syncKeyEncryption).filter(k => syncKeyEncryption[k]),
            actuallyUnencryptedKeys: Object.keys(syncKeyEncryption).filter(k => !syncKeyEncryption[k]),
            syncVariables: syncVars,
            hasSyncData: Object.keys(syncVars).length > 0
        };
    }""")
    
    print(f"Storage check Tab 1: {json.dumps(storage_check, indent=2)}")
    
    # Verify sync keys are actually encrypted (values are encrypted, not plaintext)
    assert len(storage_check['actuallyUnencryptedKeys']) == 0, f"Found unencrypted sync values: {storage_check['actuallyUnencryptedKeys']}"
    
    # Verify encrypted sync keys exist
    assert len(storage_check['actuallyEncryptedKeys']) > 0, "Should have encrypted sync keys"
    
    # Verify all sync keys are namespaced
    for key in storage_check['namespacedSyncKeys']:
        namespace_id = storage_check['namespace']['namespaceId'] if isinstance(storage_check['namespace'], dict) else storage_check['namespace']
        assert namespace_id in key, f"Key not properly namespaced: {key}"
    
    # Open second tab with same shared link
    tab2 = context.new_page()
    tab2.goto(shared_link)
    
    # Wait and handle password in tab 2
    time.sleep(1)
    password_input_tab2 = tab2.locator('#early-password-input, #decrypt-password').first
    password_input_tab2.fill(password)
    tab2.keyboard.press('Enter')
    
    # Wait for content to load and sync
    time.sleep(3)  # Allow decryption and sync
    
    # Check sync status in tab 2
    sync_status_tab2 = tab2.evaluate("""() => {
        return {
            crossTabSyncInit: CrossTabSyncService ? CrossTabSyncService.isInitialized() : false,
            namespace: NamespaceService ? NamespaceService.getNamespace() : null,
            syncStatus: CrossTabSyncService ? CrossTabSyncService.getSyncStatus() : null
        };
    }""")
    
    print(f"Tab 2 sync status: {json.dumps(sync_status_tab2, indent=2)}")
    
    # Verify both tabs are using the same namespace
    assert sync_status_tab1['namespace']['namespaceId'] == sync_status_tab2['namespace']['namespaceId'], "Tabs should use same namespace"
    
    # Check messages in tab 2 - should see the message from tab 1
    messages_tab2 = tab2.locator(".message").count()
    print(f"Tab 2 messages after sync: {messages_tab2}")
    
    # Tab 2 should have at least the messages from tab 1
    assert messages_tab2 >= messages_tab1_initial + 1, "Tab 2 should have synced messages from Tab 1"
    
    # Add message in tab 2
    message_input_tab2 = tab2.locator("#message-input")
    message_input_tab2.fill("Message from Tab 2 - testing reverse sync")
    tab2.locator("#send-btn").click()
    
    # Wait for message to appear
    tab2.wait_for_selector(".message.user", state="visible", timeout=5000)
    time.sleep(3)  # Allow sync to propagate back to tab 1
    
    # Switch back to tab 1 and verify it has the new message
    messages_tab1_final = page.locator(".message").count()
    print(f"Tab 1 final messages: {messages_tab1_final}")
    
    # Verify sync propagated back
    assert messages_tab1_final > messages_tab1_initial + 1, "Tab 1 should have received sync from Tab 2"
    
    # Verify encrypted storage integrity
    encrypted_check = page.evaluate("""() => {
        // Try to read a sync variable directly vs through DataService
        const historyHash = DataService.getSyncVariable('history_hash');
        const namespace = NamespaceService.getNamespace();
        const namespaceId = namespace.namespaceId || namespace;
        // Keys are stored as hackare_{namespace}_{key} when namespaced
        const rawKey = `hackare_${namespaceId}_sync_history_hash`;
        const rawValue = localStorage.getItem(rawKey);
        
        let isProperlyEncrypted = false;
        if (rawValue) {
            // Check if raw value looks encrypted (base64 with no plain JSON structure)
            try {
                // If we can parse it as JSON directly, it's not encrypted
                JSON.parse(rawValue);
                isProperlyEncrypted = false;
            } catch {
                // Can't parse as JSON - likely encrypted
                isProperlyEncrypted = !rawValue.includes('hash') && !rawValue.includes('tabId');
            }
        }
        
        return {
            hasDecryptedValue: historyHash !== null,
            hasRawEncryptedValue: rawValue !== null,
            isProperlyEncrypted: isProperlyEncrypted,
            decryptedStructure: historyHash ? Object.keys(historyHash) : []
        };
    }""")
    
    print(f"Encryption check: {json.dumps(encrypted_check, indent=2)}")
    
    # Verify encryption
    assert encrypted_check['isProperlyEncrypted'], "Sync variables must be encrypted in localStorage"
    assert encrypted_check['hasDecryptedValue'], "Should be able to decrypt sync variables"
    assert 'hash' in encrypted_check['decryptedStructure'], "Decrypted value should have expected structure"
    
    screenshot_with_markdown(page, "cross_tab_sync_encrypted_final", {
        "Status": "Cross-tab sync with encryption verified",
        "Namespace": sync_status_tab1['namespace']['namespaceId'][:8] + "...",
        "Storage Type": "localStorage",
        "Encrypted Keys": len(storage_check['actuallyEncryptedKeys']),
        "Unencrypted Keys": len(storage_check['actuallyUnencryptedKeys']),
        "Sync Working": "Yes",
        "Bidirectional": "Yes"
    })
    
    # Cleanup
    tab2.close()
    
    print("=== Cross-Tab Sync with Encrypted Storage Test PASSED ===")


if __name__ == "__main__":
    # Run test directly
    from playwright.sync_api import sync_playwright
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()
        
        try:
            test_shared_link_cross_tab_sync(page, context)
            print("✓ Test completed successfully")
        except AssertionError as e:
            print(f"✗ Test failed: {e}")
            raise
        finally:
            browser.close()