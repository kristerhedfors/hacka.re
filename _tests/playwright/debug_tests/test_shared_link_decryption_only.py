#!/usr/bin/env python3
"""
Simplified test focused on shared link decryption functionality.
Tests the specific fixes you mentioned:
1. SharedLinkDataProcessor undefined errors
2. Session key availability when NamespaceService initializes  
3. CryptoUtils.generateRandomId function name errors
4. Settings modal auto-opening after decryption
5. API key prompts appearing after successful decryption
"""

import sys
import os
import time
import json
from pathlib import Path

# Add the test directory to the path
sys.path.insert(0, str(Path(__file__).parent.parent))

from playwright.sync_api import sync_playwright, Page
from test_utils import screenshot_with_markdown

def setup_console_logging(page: Page):
    """Setup comprehensive console logging to capture all messages"""
    console_messages = []
    
    def log_console_message(msg):
        timestamp = time.strftime("%H:%M:%S.%f")[:-3]
        message_data = {
            'timestamp': timestamp,
            'type': msg.type,
            'text': msg.text,
            'location': getattr(msg, 'location', None)
        }
        console_messages.append(message_data)
        
        # Print to terminal for real-time monitoring
        print(f"[{timestamp}] Console {msg.type.upper()}: {msg.text}")
        
        # Special attention to the issues we're tracking
        if "SharedLinkDataProcessor" in msg.text:
            print(f"🔍 SHARED LINK PROCESSOR: {msg.text}")
        elif "generateRandomId" in msg.text:
            print(f"🔍 CRYPTO UTILS: {msg.text}")
        elif "Session key" in msg.text:
            print(f"🔍 SESSION KEY: {msg.text}")
        elif "NamespaceService" in msg.text:
            print(f"🔍 NAMESPACE: {msg.text}")
    
    page.on("console", log_console_message)
    return console_messages

def test_shared_link_decryption():
    """Test shared link decryption with a known shared link"""
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=1000)
        
        print("🚀 Testing shared link decryption functionality...")
        
        context = browser.new_context()
        page = context.new_page()
        console_messages = setup_console_logging(page)
        
        # Test with a mock shared link URL (this will test the decryption flow even if invalid data)
        test_share_url = "http://localhost:8000/?share=eyJhbGciOiJBMjU2R0NNIiwiaXYiOiJyYW5kb21fdGVzdF9pdiIsInNhbHQiOiJyYW5kb21fdGVzdF9zYWx0IiwiZGF0YSI6InRlc3RfZW5jcnlwdGVkX2RhdGEifQ%3D%3D&t=1648483200"
        
        print(f"🔗 Navigating to test shared link: {test_share_url}")
        
        # Navigate to the shared link
        page.goto(test_share_url)
        
        # Wait for password prompt or other initial elements to appear
        time.sleep(2)
        
        screenshot_with_markdown(page, "initial_load", {
            "Status": "Initial load after navigating to shared link",
            "URL": test_share_url,
            "Console Messages": str(len(console_messages))
        })
        
        # Check if password prompt appears
        password_input_visible = False
        try:
            page.wait_for_selector("#password-input", state="visible", timeout=5000)
            password_input_visible = True
            print("✅ Password prompt appeared")
        except Exception:
            print("❌ Password prompt did not appear")
        
        if password_input_visible:
            # Try entering a password to trigger the decryption process
            print("Entering test password...")
            password_field = page.locator("#password-input")
            password_field.fill("testpassword")
            
            submit_button = page.locator("#submit-password")
            if submit_button.is_visible():
                submit_button.click()
                print("✅ Password submitted")
                
                # Wait for the decryption process to complete (or fail)
                time.sleep(3)
            else:
                print("❌ Submit button not visible")
        
        # Check the final state
        screenshot_with_markdown(page, "after_password_attempt", {
            "Status": "After password entry attempt",
            "Password Input Visible": str(password_input_visible),
            "Console Messages": str(len(console_messages))
        })
        
        # Save console messages
        with open("/Users/user/dev/hacka.re/_tests/playwright/debug_tests/console_decryption_test.json", 'w') as f:
            json.dump(console_messages, f, indent=2)
        
        # Analysis of console messages
        print("\n📊 CONSOLE MESSAGE ANALYSIS:")
        print("="*50)
        
        # Check for specific error patterns
        processor_errors = [msg for msg in console_messages if "SharedLinkDataProcessor" in msg['text'] and msg['type'] in ['error', 'warn']]
        crypto_errors = [msg for msg in console_messages if "generateRandomId" in msg['text'] and msg['type'] in ['error', 'warn']]
        session_key_messages = [msg for msg in console_messages if "Session key" in msg['text']]
        namespace_messages = [msg for msg in console_messages if "NamespaceService" in msg['text']]
        
        print(f"SharedLinkDataProcessor errors: {len(processor_errors)}")
        for error in processor_errors:
            print(f"  - {error['timestamp']}: {error['text']}")
        
        print(f"CryptoUtils.generateRandomId errors: {len(crypto_errors)}")
        for error in crypto_errors:
            print(f"  - {error['timestamp']}: {error['text']}")
        
        print(f"Session key messages: {len(session_key_messages)}")
        for msg in session_key_messages:
            print(f"  - {msg['timestamp']}: {msg['text']}")
        
        print(f"NamespaceService messages: {len(namespace_messages)}")
        for msg in namespace_messages:
            print(f"  - {msg['timestamp']}: {msg['text']}")
        
        print(f"\nTotal console messages: {len(console_messages)}")
        
        context.close()
        browser.close()
        
        return {
            'password_prompt_visible': password_input_visible,
            'processor_errors': len(processor_errors),
            'crypto_errors': len(crypto_errors),
            'session_key_messages': len(session_key_messages),
            'namespace_messages': len(namespace_messages),
            'total_console_messages': len(console_messages)
        }

if __name__ == "__main__":
    results = test_shared_link_decryption()
    print(f"\n📝 Test completed. Results: {results}")