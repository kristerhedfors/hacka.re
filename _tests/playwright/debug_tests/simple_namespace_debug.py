#!/usr/bin/env python3
"""
Simple debug script to check namespace derivation consistency
"""

import json
import time
import subprocess
import signal
import os
from playwright.sync_api import sync_playwright

def simple_namespace_debug():
    """Simple debug to check namespace consistency"""
    
    # Start HTTP server
    server_process = subprocess.Popen(
        ['python3', '-m', 'http.server', '8000'],
        cwd='/Users/user/dev/hacka.re',
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    time.sleep(1)  # Give server time to start
    
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            
            # Create first tab and shared link
            tab1 = browser.new_page()
            tab1.goto("http://localhost:8000")
            
            # Dismiss welcome modal
            tab1.wait_for_selector("#welcome-modal", timeout=10000)
            tab1.click("#welcome-modal .btn-close")
            
            # Set API key
            tab1.click("#settings-btn")
            tab1.wait_for_selector("#api-key")
            tab1.fill("#api-key", "test_api_key")
            tab1.click("#save-btn")
            
            # Create shared link
            tab1.click("#share-btn")
            tab1.wait_for_selector("#password-input")
            tab1.fill("#password-input", "test_password")
            tab1.click("#create-share-btn")
            
            tab1.wait_for_selector("#share-link")
            shared_link = tab1.input_value("#share-link")
            print(f"Created shared link: {shared_link}")
            
            # Get namespace derivation info from tab1
            info_tab1 = tab1.evaluate("""
                () => {
                    const hash = window.location.hash;
                    let encryptedData = null;
                    if (hash.includes('#gpt=')) {
                        encryptedData = hash.split('#gpt=')[1];
                    }
                    
                    const dataHash = encryptedData ? window.CryptoUtils.hashString(encryptedData) : null;
                    const namespace = dataHash ? dataHash.substring(0, 8) : null;
                    const sessionKey = window.aiHackare?.shareManager?.getSessionKey?.();
                    const currentNamespace = window.NamespaceService?.getNamespaceId?.();
                    const masterKey = window.NamespaceService?.getNamespaceKey?.();
                    
                    return {
                        encryptedDataLength: encryptedData ? encryptedData.length : 0,
                        encryptedDataHash: dataHash,
                        derivedNamespace: namespace,
                        sessionKeyPresent: !!sessionKey,
                        currentNamespace: currentNamespace,
                        masterKeyPresent: !!masterKey,
                        url: hash
                    };
                }
            """)
            print(f"Tab1 info: {json.dumps(info_tab1, indent=2)}")
            
            # Open same link in tab2
            tab2 = browser.new_page()
            tab2.goto(shared_link)
            
            # Enter password
            tab2.wait_for_selector("#password-input", timeout=10000)
            tab2.fill("#password-input", "test_password")
            tab2.click("#unlock-btn")
            
            # Wait for initialization
            tab2.wait_for_selector("#chat-container", timeout=10000)
            time.sleep(1)
            
            # Get namespace derivation info from tab2
            info_tab2 = tab2.evaluate("""
                () => {
                    const hash = window.location.hash;
                    let encryptedData = null;
                    if (hash.includes('#gpt=')) {
                        encryptedData = hash.split('#gpt=')[1];
                    }
                    
                    const dataHash = encryptedData ? window.CryptoUtils.hashString(encryptedData) : null;
                    const namespace = dataHash ? dataHash.substring(0, 8) : null;
                    const sessionKey = window.aiHackare?.shareManager?.getSessionKey?.();
                    const currentNamespace = window.NamespaceService?.getNamespaceId?.();
                    const masterKey = window.NamespaceService?.getNamespaceKey?.();
                    
                    // Test deterministic derivation
                    let derivedMasterKey = null;
                    if (sessionKey && namespace) {
                        try {
                            derivedMasterKey = window.CryptoUtils.deriveMasterKeyFromSession(sessionKey, namespace);
                        } catch (e) {
                            derivedMasterKey = 'ERROR: ' + e.message;
                        }
                    }
                    
                    return {
                        encryptedDataLength: encryptedData ? encryptedData.length : 0,
                        encryptedDataHash: dataHash,
                        derivedNamespace: namespace,
                        sessionKeyPresent: !!sessionKey,
                        currentNamespace: currentNamespace,
                        masterKeyPresent: !!masterKey,
                        derivedMasterKeyPresent: !!derivedMasterKey,
                        derivedMatches: derivedMasterKey === masterKey,
                        url: hash
                    };
                }
            """)
            print(f"Tab2 info: {json.dumps(info_tab2, indent=2)}")
            
            # Compare critical fields
            print(f"\\n=== COMPARISON ===")
            print(f"URLs match: {info_tab1['url'] == info_tab2['url']}")
            print(f"Encrypted data hashes match: {info_tab1['encryptedDataHash'] == info_tab2['encryptedDataHash']}")
            print(f"Derived namespaces match: {info_tab1['derivedNamespace'] == info_tab2['derivedNamespace']}")
            print(f"Current namespaces match: {info_tab1['currentNamespace'] == info_tab2['currentNamespace']}")
            print(f"Both have session keys: {info_tab1['sessionKeyPresent'] and info_tab2['sessionKeyPresent']}")
            print(f"Tab2 derived master key matches current: {info_tab2.get('derivedMatches', 'N/A')}")
            
            browser.close()
            
    finally:
        # Stop server
        server_process.terminate()
        server_process.wait()

if __name__ == "__main__":
    simple_namespace_debug()