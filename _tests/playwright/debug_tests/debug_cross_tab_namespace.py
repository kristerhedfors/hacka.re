#!/usr/bin/env python3
"""
Debug script to investigate cross-tab namespace issues
"""

import json
import time
from playwright.sync_api import sync_playwright

def debug_cross_tab_namespace():
    """Debug cross-tab namespace synchronization issues"""
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # Visible for debugging
        
        # Create first tab
        tab1 = browser.new_page()
        
        # Setup console logging for both tabs
        console_messages_tab1 = []
        console_messages_tab2 = []
        
        def log_console_tab1(msg):
            timestamp = time.strftime("%H:%M:%S.%f")[:-3]
            console_messages_tab1.append({
                'timestamp': timestamp,
                'type': msg.type,
                'text': msg.text,
                'tab': 'tab1'
            })
            print(f"[{timestamp}] TAB1 Console {msg.type.upper()}: {msg.text}")
            
        def log_console_tab2(msg):
            timestamp = time.strftime("%H:%M:%S.%f")[:-3]
            console_messages_tab2.append({
                'timestamp': timestamp,
                'type': msg.type,
                'text': msg.text,
                'tab': 'tab2'
            })
            print(f"[{timestamp}] TAB2 Console {msg.type.upper()}: {msg.text}")
        
        tab1.on("console", log_console_tab1)
        
        # Step 1: Create a shared link in tab1
        print("=== STEP 1: Creating shared link in tab1 ===")
        tab1.goto("http://localhost:8000")
        
        # Wait for page load and dismiss modals
        tab1.wait_for_selector("#welcome-modal", timeout=10000)
        tab1.click("#welcome-modal .btn-close")
        
        # Set API key
        tab1.click("#settings-btn")
        tab1.wait_for_selector("#api-key")
        tab1.fill("#api-key", "test_api_key")
        tab1.click("#save-btn")
        
        # Create a shared link 
        tab1.click("#share-btn")
        tab1.wait_for_selector("#password-input")
        tab1.fill("#password-input", "test_password")
        tab1.click("#create-share-btn")
        
        # Get the shared link
        tab1.wait_for_selector("#share-link")
        shared_link = tab1.input_value("#share-link")
        print(f"Created shared link: {shared_link}")
        
        # Step 2: Get namespace info from tab1
        print("\n=== STEP 2: Getting namespace info from tab1 ===")
        namespace_info_tab1 = tab1.evaluate("""
            () => {
                const sessionKey = window.aiHackare?.shareManager?.getSessionKey?.() || 
                                 window.ShareManager?.getSessionKey?.();
                const storageNamespace = window.StorageTypeService?.getSharedLinkNamespace?.();
                const currentNamespace = window.NamespaceService?.getNamespaceId?.();
                const masterKey = window.NamespaceService?.getNamespaceKey?.();
                
                return {
                    sessionKey: sessionKey ? sessionKey.substring(0, 8) + '...' + sessionKey.substring(sessionKey.length - 8) : 'null',
                    storageNamespace: storageNamespace,
                    currentNamespace: currentNamespace,
                    masterKey: masterKey ? masterKey.substring(0, 8) + '...' + masterKey.substring(masterKey.length - 8) : 'null',
                    url: window.location.hash
                };
            }
        """)
        print(f"Tab1 namespace info: {json.dumps(namespace_info_tab1, indent=2)}")
        
        # Step 3: Open same link in tab2
        print(f"\n=== STEP 3: Opening shared link in tab2 ===")
        tab2 = browser.new_page()
        tab2.on("console", log_console_tab2)
        
        tab2.goto(shared_link)
        
        # Enter password in tab2
        tab2.wait_for_selector("#password-input", timeout=10000)
        tab2.fill("#password-input", "test_password")
        tab2.click("#unlock-btn")
        
        # Wait for decryption to complete
        tab2.wait_for_selector("#chat-container", timeout=10000)
        time.sleep(2)  # Allow for initialization
        
        # Step 4: Get namespace info from tab2
        print("\n=== STEP 4: Getting namespace info from tab2 ===")
        namespace_info_tab2 = tab2.evaluate("""
            () => {
                const sessionKey = window.aiHackare?.shareManager?.getSessionKey?.() || 
                                 window.ShareManager?.getSessionKey?.();
                const storageNamespace = window.StorageTypeService?.getSharedLinkNamespace?.();
                const currentNamespace = window.NamespaceService?.getNamespaceId?.();
                const masterKey = window.NamespaceService?.getNamespaceKey?.();
                
                return {
                    sessionKey: sessionKey ? sessionKey.substring(0, 8) + '...' + sessionKey.substring(sessionKey.length - 8) : 'null',
                    storageNamespace: storageNamespace,
                    currentNamespace: currentNamespace,
                    masterKey: masterKey ? masterKey.substring(0, 8) + '...' + masterKey.substring(masterKey.length - 8) : 'null',
                    url: window.location.hash
                };
            }
        """)
        print(f"Tab2 namespace info: {json.dumps(namespace_info_tab2, indent=2)}")
        
        # Step 5: Compare namespace info
        print(f"\n=== STEP 5: Comparison ===")
        print(f"Session keys match: {namespace_info_tab1['sessionKey'] == namespace_info_tab2['sessionKey']}")
        print(f"Storage namespaces match: {namespace_info_tab1['storageNamespace'] == namespace_info_tab2['storageNamespace']}")
        print(f"Current namespaces match: {namespace_info_tab1['currentNamespace'] == namespace_info_tab2['currentNamespace']}")
        print(f"Master keys match: {namespace_info_tab1['masterKey'] == namespace_info_tab2['masterKey']}")
        print(f"URLs match: {namespace_info_tab1['url'] == namespace_info_tab2['url']}")
        
        # Step 6: Change model in tab1 and test decryption in tab2
        print(f"\n=== STEP 6: Change model in tab1, test decryption in tab2 ===")
        
        # Change model in tab1
        tab1.click("#model-select")
        tab1.wait_for_selector("#model-select option[value*='gpt-4']")
        tab1.select_option("#model-select", label="gpt-4")
        
        # Give time for the change to be stored
        time.sleep(1)
        
        # Try to read the model from tab2
        model_from_tab2 = tab2.evaluate("""
            () => {
                try {
                    const model = window.CoreStorageService?.getItem?.('model');
                    return { success: true, model: model, error: null };
                } catch (error) {
                    return { success: false, model: null, error: error.message };
                }
            }
        """)
        print(f"Model read from tab2: {json.dumps(model_from_tab2, indent=2)}")
        
        # Step 7: Get final namespace comparison
        print(f"\n=== STEP 7: Final namespace comparison after model change ===")
        
        final_info_tab1 = tab1.evaluate("""
            () => {
                const masterKey = window.NamespaceService?.getNamespaceKey?.();
                return {
                    masterKey: masterKey ? masterKey.substring(0, 8) + '...' + masterKey.substring(masterKey.length - 8) : 'null'
                };
            }
        """)
        
        final_info_tab2 = tab2.evaluate("""
            () => {
                const masterKey = window.NamespaceService?.getNamespaceKey?.();
                return {
                    masterKey: masterKey ? masterKey.substring(0, 8) + '...' + masterKey.substring(masterKey.length - 8) : 'null'
                };
            }
        """)
        
        print(f"Final Tab1 master key: {final_info_tab1['masterKey']}")
        print(f"Final Tab2 master key: {final_info_tab2['masterKey']}")
        print(f"Final master keys match: {final_info_tab1['masterKey'] == final_info_tab2['masterKey']}")
        
        # Save console logs for analysis
        all_logs = console_messages_tab1 + console_messages_tab2
        all_logs.sort(key=lambda x: x['timestamp'])
        
        with open('debug_cross_tab_console.json', 'w') as f:
            json.dump(all_logs, f, indent=2)
        
        print(f"\n=== Console logs saved to debug_cross_tab_console.json ===")
        print(f"Total console messages: {len(all_logs)}")
        
        # Pause for manual inspection
        print("\n=== Pausing for manual inspection - press Enter to continue ===")
        input()
        
        browser.close()

if __name__ == "__main__":
    debug_cross_tab_namespace()