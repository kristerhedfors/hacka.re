#!/usr/bin/env python3
"""
Test the cross-tab encryption fix for shared links
"""

import json
import time
import subprocess
from playwright.sync_api import sync_playwright

def test_cross_tab_fix():
    """Test that multiple tabs can decrypt data after model changes"""
    
    # Start HTTP server
    server_process = subprocess.Popen(
        ['python3', '-m', 'http.server', '8000'],
        cwd='/Users/user/dev/hacka.re',
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    time.sleep(1)
    
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=False)
            
            # Create first tab and shared link
            print("=== Creating shared link in Tab 1 ===")
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
            
            # Set a model
            tab1.wait_for_selector("#model-select")
            tab1.select_option("#model-select", index=1)  # Select first available model
            
            # Create shared link
            tab1.click("#share-btn")
            tab1.wait_for_selector("#password-input")
            tab1.fill("#password-input", "test_password")
            tab1.click("#create-share-btn")
            
            tab1.wait_for_selector("#share-link")
            shared_link = tab1.input_value("#share-link")
            print(f"Created shared link: {shared_link[:50]}...")
            
            # Copy link and close share modal
            tab1.click("#share-modal .close")
            
            # Open shared link in Tab 2
            print("\n=== Opening shared link in Tab 2 ===")
            tab2 = browser.new_page()
            tab2.goto(shared_link)
            
            # Enter password
            tab2.wait_for_selector("#password-input", timeout=10000)
            tab2.fill("#password-input", "test_password")
            tab2.click("#unlock-btn")
            
            # Wait for initialization
            tab2.wait_for_selector("#chat-container", timeout=10000)
            time.sleep(2)
            
            # Open shared link in Tab 3
            print("\n=== Opening shared link in Tab 3 ===")
            tab3 = browser.new_page()
            tab3.goto(shared_link)
            
            # Enter password
            tab3.wait_for_selector("#password-input", timeout=10000)
            tab3.fill("#password-input", "test_password")
            tab3.click("#unlock-btn")
            
            # Wait for initialization
            tab3.wait_for_selector("#chat-container", timeout=10000)
            time.sleep(2)
            
            # Change model in Tab 2
            print("\n=== Changing model in Tab 2 ===")
            tab2.click("#model-select")
            tab2.wait_for_timeout(500)
            
            # Select a different model
            current_model = tab2.evaluate("() => document.querySelector('#model-select').value")
            print(f"Current model in Tab 2: {current_model}")
            
            # Find a different model to select
            options = tab2.query_selector_all("#model-select option")
            for option in options:
                value = option.get_attribute("value")
                if value and value != current_model and not option.is_disabled():
                    tab2.select_option("#model-select", value=value)
                    print(f"Changed to model: {value}")
                    break
            
            time.sleep(1)
            
            # Test encryption in all tabs
            print("\n=== Testing encryption in all tabs ===")
            
            # Tab 1: Send a message
            print("Tab 1: Sending message...")
            tab1.fill("#chat-input", "Test message from Tab 1")
            tab1.press("#chat-input", "Enter")
            
            # Check for errors
            tab1_errors = tab1.evaluate("""
                () => {
                    const errors = [];
                    const errorElements = document.querySelectorAll('.error, .alert-danger');
                    errorElements.forEach(el => errors.push(el.textContent));
                    return errors;
                }
            """)
            print(f"Tab 1 errors: {tab1_errors if tab1_errors else 'None'}")
            
            # Tab 2: Send a message
            print("\nTab 2: Sending message...")
            tab2.fill("#chat-input", "Test message from Tab 2")
            tab2.press("#chat-input", "Enter")
            
            tab2_errors = tab2.evaluate("""
                () => {
                    const errors = [];
                    const errorElements = document.querySelectorAll('.error, .alert-danger');
                    errorElements.forEach(el => errors.push(el.textContent));
                    return errors;
                }
            """)
            print(f"Tab 2 errors: {tab2_errors if tab2_errors else 'None'}")
            
            # Tab 3: Send a message
            print("\nTab 3: Sending message...")
            tab3.fill("#chat-input", "Test message from Tab 3")
            tab3.press("#chat-input", "Enter")
            
            tab3_errors = tab3.evaluate("""
                () => {
                    const errors = [];
                    const errorElements = document.querySelectorAll('.error, .alert-danger');
                    errorElements.forEach(el => errors.push(el.textContent));
                    return errors;
                }
            """)
            print(f"Tab 3 errors: {tab3_errors if tab3_errors else 'None'}")
            
            # Get namespace and key info from all tabs
            print("\n=== Namespace and Key Information ===")
            
            for i, tab in enumerate([tab1, tab2, tab3], 1):
                info = tab.evaluate("""
                    () => {
                        const sessionKey = window.aiHackare?.shareManager?.getSessionKey?.();
                        const namespace = window.NamespaceService?.getNamespaceId?.();
                        const masterKey = window.NamespaceService?.getNamespaceKey?.();
                        
                        return {
                            sessionKey: sessionKey ? sessionKey.substring(0, 8) + '...' : 'null',
                            namespace: namespace,
                            masterKey: masterKey ? masterKey.substring(0, 8) + '...' + masterKey.substring(masterKey.length - 8) : 'null'
                        };
                    }
                """)
                print(f"Tab {i}: {json.dumps(info, indent=2)}")
            
            # Check if all tabs have same keys
            print("\n=== Summary ===")
            print("All tabs should have:")
            print("- Same session key")
            print("- Same namespace")
            print("- Same master key")
            print("- No decryption errors after model changes")
            
            print("\nPress Enter to close browsers...")
            input()
            
            browser.close()
            
    finally:
        # Stop server
        server_process.terminate()
        server_process.wait()

if __name__ == "__main__":
    test_cross_tab_fix()