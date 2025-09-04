#!/usr/bin/env python3
"""
Focused cross-tab sync test to debug encryption issues
"""

from playwright.sync_api import sync_playwright, expect
import json
import time

def run_test():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # Visible for debugging
        context = browser.new_context()
        
        # Tab 1 - Initial setup
        print("=== Opening Tab 1 ===")
        tab1 = context.new_page()
        tab1.goto("http://localhost:8000")
        
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
        
        # Send a message in Tab 1
        print("Sending message in Tab 1...")
        tab1.fill("#message-input", "Hello from Tab 1")
        tab1.click("#send-btn")
        
        # Wait for message to appear
        tab1.wait_for_selector(".message.user", state="visible", timeout=5000)
        
        # Check sync status in Tab 1
        sync_status_tab1 = tab1.evaluate("""() => {
            return {
                crossTabSyncInit: window.CrossTabSync ? true : false,
                namespace: window.NamespaceService ? {
                    namespaceId: window.NamespaceService.getNamespace(),
                    masterKey: window.NamespaceService.getCurrentMasterKey()
                } : null,
                syncStatus: window.CrossTabSync ? window.CrossTabSync.getStatus() : null,
                storageType: window.StorageTypeService ? window.StorageTypeService.getStorageType() : null
            };
        }""")
        print(f"Tab 1 sync status: {json.dumps(sync_status_tab1, indent=2)}")
        
        # Count messages in Tab 1
        messages_tab1 = tab1.locator(".message").count()
        print(f"Tab 1 has {messages_tab1} messages")
        
        # Check what's in storage
        storage_check = tab1.evaluate("""() => {
            const storage = window.StorageTypeService ? window.StorageTypeService.getStorage() : localStorage;
            const namespace = window.NamespaceService ? window.NamespaceService.getNamespace() : '';
            const allKeys = [];
            for (let i = 0; i < storage.length; i++) {
                allKeys.push(storage.key(i));
            }
            
            // Look for sync-related keys
            const syncKeys = allKeys.filter(key => key.includes('sync'));
            const historyKeys = allKeys.filter(key => key.includes('history'));
            
            return {
                namespace: namespace,
                totalKeys: allKeys.length,
                syncKeys: syncKeys,
                historyKeys: historyKeys,
                hasHistoryHash: syncKeys.some(key => key.includes('history_hash'))
            };
        }""")
        print(f"Storage check Tab 1: {json.dumps(storage_check, indent=2)}")
        
        # Tab 2 - Open and check sync
        print("\n=== Opening Tab 2 ===")
        tab2 = context.new_page()
        tab2.goto("http://localhost:8000")
        
        # Dismiss welcome modal in Tab 2
        if tab2.locator("#welcome-modal").is_visible():
            print("Closing welcome modal in Tab 2")
            tab2.click("#close-welcome-modal")
            tab2.wait_for_selector("#welcome-modal", state="hidden")
        
        # Give Tab 2 time to initialize and sync
        print("Waiting for Tab 2 to initialize and sync...")
        time.sleep(3)
        
        # Check sync status in Tab 2
        sync_status_tab2 = tab2.evaluate("""() => {
            return {
                crossTabSyncInit: window.CrossTabSync ? true : false,
                namespace: window.NamespaceService ? {
                    namespaceId: window.NamespaceService.getNamespace(),
                    masterKey: window.NamespaceService.getCurrentMasterKey()
                } : null,
                syncStatus: window.CrossTabSync ? window.CrossTabSync.getStatus() : null,
                storageType: window.StorageTypeService ? window.StorageTypeService.getStorageType() : null
            };
        }""")
        print(f"Tab 2 sync status: {json.dumps(sync_status_tab2, indent=2)}")
        
        # Count messages in Tab 2 initially
        messages_tab2_initial = tab2.locator(".message").count()
        print(f"Tab 2 has {messages_tab2_initial} messages initially")
        
        # Send a message in Tab 2
        print("\nSending message in Tab 2...")
        tab2.fill("#message-input", "Hello from Tab 2")
        tab2.click("#send-btn")
        
        # Wait for Tab 2's own message
        tab2.wait_for_selector(".message.user", state="visible", timeout=5000)
        messages_tab2_after = tab2.locator(".message").count()
        print(f"Tab 2 has {messages_tab2_after} messages after sending")
        
        # IMPORTANT: Switch back to Tab 1 to check if it synced Tab 2's message
        print("\n=== Switching back to Tab 1 to check sync ===")
        tab1.bring_to_front()
        
        # Give Tab 1 time to sync
        print("Waiting for Tab 1 to sync Tab 2's message...")
        time.sleep(3)
        
        # Force a storage event check
        tab1.evaluate("""() => {
            // Trigger a manual check for storage changes
            if (window.CrossTabSync && window.CrossTabSync.checkForUpdates) {
                window.CrossTabSync.checkForUpdates();
            }
        }""")
        
        # Check Tab 1's messages again
        messages_tab1_final = tab1.locator(".message").count()
        print(f"Tab 1 has {messages_tab1_final} messages after Tab 2 sent a message")
        
        # Get the actual message content
        tab1_messages = tab1.evaluate("""() => {
            const messages = Array.from(document.querySelectorAll('.message'));
            return messages.map(msg => ({
                type: msg.classList.contains('user') ? 'user' : 
                      msg.classList.contains('assistant') ? 'assistant' : 'system',
                content: msg.textContent.trim().substring(0, 50) // First 50 chars
            }));
        }""")
        print(f"Tab 1 messages: {json.dumps(tab1_messages, indent=2)}")
        
        # Check Tab 2's messages for comparison
        tab2.bring_to_front()
        tab2_messages = tab2.evaluate("""() => {
            const messages = Array.from(document.querySelectorAll('.message'));
            return messages.map(msg => ({
                type: msg.classList.contains('user') ? 'user' : 
                      msg.classList.contains('assistant') ? 'assistant' : 'system',
                content: msg.textContent.trim().substring(0, 50) // First 50 chars
            }));
        }""")
        print(f"Tab 2 messages: {json.dumps(tab2_messages, indent=2)}")
        
        # Final storage check
        final_storage = tab1.evaluate("""() => {
            const storage = window.StorageTypeService ? window.StorageTypeService.getStorage() : localStorage;
            const syncKeys = [];
            for (let i = 0; i < storage.length; i++) {
                const key = storage.key(i);
                if (key && key.includes('sync')) {
                    const value = storage.getItem(key);
                    syncKeys.push({
                        key: key,
                        isEncrypted: value && !value.startsWith('{') && !value.startsWith('['),
                        length: value ? value.length : 0
                    });
                }
            }
            return syncKeys;
        }""")
        print(f"\nFinal sync keys in storage: {json.dumps(final_storage, indent=2)}")
        
        # Test results
        print("\n=== TEST RESULTS ===")
        if messages_tab1_final > messages_tab1:
            print("✅ Tab 1 received Tab 2's message via cross-tab sync")
        else:
            print("❌ Tab 1 did NOT receive Tab 2's message")
        
        if messages_tab2_initial >= messages_tab1:
            print("✅ Tab 2 loaded Tab 1's initial messages")
        else:
            print("❌ Tab 2 did NOT load Tab 1's initial messages")
        
        # Keep browser open for manual inspection
        print("\nTest complete. Browser will stay open for 10 seconds...")
        time.sleep(10)
        
        browser.close()

if __name__ == "__main__":
    run_test()