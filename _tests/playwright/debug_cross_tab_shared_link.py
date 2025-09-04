#!/usr/bin/env python3
"""
Test cross-tab sync with shared link (uses localStorage)
"""

from playwright.sync_api import sync_playwright, expect
import json
import time
import hashlib
import base64

def run_test():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # Visible for debugging
        context = browser.new_context()
        
        # Create a shared link URL to force localStorage usage
        base_url = "http://localhost:8000"
        
        # Simple shared link parameters
        namespace = hashlib.sha256(b"test-namespace").hexdigest()[:8]
        share_data = {
            "n": namespace,
            "k": "test-master-key-12345"
        }
        
        # Create the shared link URL
        share_params = base64.b64encode(json.dumps(share_data).encode()).decode()
        shared_link_url = f"{base_url}/?share={share_params}"
        
        print(f"Using shared link URL: {shared_link_url}")
        
        # Tab 1 - Open with shared link
        print("\n=== Opening Tab 1 with shared link ===")
        tab1 = context.new_page()
        tab1.goto(shared_link_url)
        
        # Wait for initialization
        tab1.wait_for_timeout(2000)
        
        # Dismiss welcome modal
        if tab1.locator("#welcome-modal").is_visible():
            print("Closing welcome modal in Tab 1")
            tab1.click("#close-welcome-modal")
            tab1.wait_for_selector("#welcome-modal", state="hidden")
        
        # Configure Tab 1 with API key
        print("Configuring Tab 1...")
        tab1.click("#settings-btn")
        tab1.wait_for_selector("#settings-modal", state="visible")
        tab1.fill("#api-key-update", "test-key-123")
        tab1.click("#close-settings")
        tab1.wait_for_selector("#settings-modal", state="hidden")
        
        # Check storage type and sync status
        storage_check_tab1 = tab1.evaluate("""() => {
            return {
                storageType: window.StorageTypeService ? window.StorageTypeService.getStorageType() : 'unknown',
                isUsingLocalStorage: window.StorageTypeService ? window.StorageTypeService.isUsingLocalStorage() : false,
                crossTabSyncEnabled: window.CrossTabSync ? true : false,
                namespace: window.NamespaceService ? window.NamespaceService.getNamespace() : null,
                masterKey: window.NamespaceService ? window.NamespaceService.getCurrentMasterKey() : null
            };
        }""")
        print(f"Tab 1 storage check: {json.dumps(storage_check_tab1, indent=2)}")
        
        # Send a message in Tab 1
        print("\nSending message in Tab 1...")
        tab1.fill("#message-input", "Hello from Tab 1")
        tab1.click("#send-btn")
        
        # Wait for message to appear
        tab1.wait_for_timeout(2000)
        
        messages_tab1 = tab1.locator(".message").count()
        print(f"Tab 1 has {messages_tab1} messages")
        
        # Check what sync data is in storage
        sync_data = tab1.evaluate("""() => {
            const storage = localStorage; // Shared links use localStorage
            const syncKeys = [];
            for (let i = 0; i < storage.length; i++) {
                const key = storage.key(i);
                if (key && (key.includes('sync') || key.includes('history'))) {
                    const value = storage.getItem(key);
                    let parsedValue = null;
                    try {
                        // Try to decrypt if encrypted
                        if (window.CoreStorageService && key.includes('hackare_')) {
                            const baseKey = key.replace(/^hackare_[^_]+_/, '');
                            parsedValue = window.CoreStorageService.getValue(baseKey);
                        } else {
                            parsedValue = JSON.parse(value);
                        }
                    } catch (e) {
                        parsedValue = 'encrypted or unparseable';
                    }
                    syncKeys.push({
                        key: key,
                        value: parsedValue,
                        rawLength: value ? value.length : 0
                    });
                }
            }
            
            // Check CrossTabSync status
            const syncStatus = window.CrossTabSync ? window.CrossTabSync.getStatus() : null;
            
            return {
                syncKeys: syncKeys,
                syncStatus: syncStatus,
                hasCrossTabSync: !!window.CrossTabSync
            };
        }""")
        print(f"Tab 1 sync data: {json.dumps(sync_data, indent=2)}")
        
        # Tab 2 - Open with same shared link
        print("\n=== Opening Tab 2 with same shared link ===")
        tab2 = context.new_page()
        tab2.goto(shared_link_url)
        
        # Wait for initialization
        tab2.wait_for_timeout(2000)
        
        # Dismiss welcome modal in Tab 2
        if tab2.locator("#welcome-modal").is_visible():
            print("Closing welcome modal in Tab 2")
            tab2.click("#close-welcome-modal")
            tab2.wait_for_selector("#welcome-modal", state="hidden")
        
        # Check storage type in Tab 2
        storage_check_tab2 = tab2.evaluate("""() => {
            return {
                storageType: window.StorageTypeService ? window.StorageTypeService.getStorageType() : 'unknown',
                isUsingLocalStorage: window.StorageTypeService ? window.StorageTypeService.isUsingLocalStorage() : false,
                crossTabSyncEnabled: window.CrossTabSync ? true : false,
                namespace: window.NamespaceService ? window.NamespaceService.getNamespace() : null,
                masterKey: window.NamespaceService ? window.NamespaceService.getCurrentMasterKey() : null
            };
        }""")
        print(f"Tab 2 storage check: {json.dumps(storage_check_tab2, indent=2)}")
        
        # Wait for sync
        print("Waiting for Tab 2 to sync...")
        tab2.wait_for_timeout(3000)
        
        # Count messages in Tab 2
        messages_tab2_initial = tab2.locator(".message").count()
        print(f"Tab 2 has {messages_tab2_initial} messages after sync")
        
        # Send a message in Tab 2
        print("\nSending message in Tab 2...")
        tab2.fill("#message-input", "Hello from Tab 2")
        tab2.click("#send-btn")
        
        tab2.wait_for_timeout(2000)
        messages_tab2_after = tab2.locator(".message").count()
        print(f"Tab 2 has {messages_tab2_after} messages after sending")
        
        # Switch back to Tab 1
        print("\n=== Switching back to Tab 1 ===")
        tab1.bring_to_front()
        
        # Wait for Tab 1 to sync
        print("Waiting for Tab 1 to sync...")
        tab1.wait_for_timeout(3000)
        
        # Force reload to trigger sync
        tab1.evaluate("""() => {
            // Trigger storage event listener
            window.dispatchEvent(new StorageEvent('storage', {
                key: 'hackare_' + window.NamespaceService.getNamespace() + '_sync_history_hash',
                newValue: 'trigger',
                url: window.location.href
            }));
        }""")
        
        tab1.wait_for_timeout(1000)
        
        messages_tab1_final = tab1.locator(".message").count()
        print(f"Tab 1 has {messages_tab1_final} messages after Tab 2 sent")
        
        # Get message details
        tab1_messages = tab1.evaluate("""() => {
            const messages = Array.from(document.querySelectorAll('.message'));
            return messages.map(msg => ({
                type: msg.classList.contains('user') ? 'user' : 
                      msg.classList.contains('assistant') ? 'assistant' : 'system',
                content: msg.querySelector('.message-content') ? 
                        msg.querySelector('.message-content').textContent.trim().substring(0, 30) : 
                        msg.textContent.trim().substring(0, 30)
            }));
        }""")
        print(f"\nTab 1 messages: {json.dumps(tab1_messages, indent=2)}")
        
        tab2.bring_to_front()
        tab2_messages = tab2.evaluate("""() => {
            const messages = Array.from(document.querySelectorAll('.message'));
            return messages.map(msg => ({
                type: msg.classList.contains('user') ? 'user' : 
                      msg.classList.contains('assistant') ? 'assistant' : 'system',
                content: msg.querySelector('.message-content') ? 
                        msg.querySelector('.message-content').textContent.trim().substring(0, 30) : 
                        msg.textContent.trim().substring(0, 30)
            }));
        }""")
        print(f"Tab 2 messages: {json.dumps(tab2_messages, indent=2)}")
        
        # Test results
        print("\n=== TEST RESULTS ===")
        print(f"Storage type: {storage_check_tab1['storageType']}")
        print(f"Using localStorage: {storage_check_tab1['isUsingLocalStorage']}")
        print(f"Same namespace: {storage_check_tab1['namespace'] == storage_check_tab2['namespace']}")
        print(f"Same master key: {storage_check_tab1['masterKey'] == storage_check_tab2['masterKey']}")
        
        if messages_tab1_final > messages_tab1:
            print("✅ Tab 1 received Tab 2's message")
        else:
            print("❌ Tab 1 did NOT receive Tab 2's message")
        
        if messages_tab2_initial >= messages_tab1:
            print("✅ Tab 2 loaded Tab 1's messages")
        else:
            print("❌ Tab 2 did NOT load Tab 1's messages")
        
        print("\nBrowser staying open for 10 seconds...")
        time.sleep(10)
        
        browser.close()

if __name__ == "__main__":
    run_test()