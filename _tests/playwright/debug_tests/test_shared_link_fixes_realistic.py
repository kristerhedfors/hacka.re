#!/usr/bin/env python3
"""
Realistic test for shared link functionality fixes.
Creates an actual shared link and tests the decryption process.
"""

import sys
import os
import time
import json
from pathlib import Path
from urllib.parse import unquote

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
        elif "password" in msg.text.lower() and ("dialog" in msg.text or "prompt" in msg.text):
            print(f"🔍 PASSWORD PROMPT: {msg.text}")
    
    page.on("console", log_console_message)
    return console_messages

def test_shared_link_realistic():
    """Test shared link creation and usage with realistic data"""
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=500)
        
        print("🚀 Testing realistic shared link functionality...")
        
        # ===============================
        # STEP 1: Create a simple shared link with JS
        # ===============================
        print("\n📝 STEP 1: Creating shared link via JavaScript...")
        
        context1 = browser.new_context()
        page1 = context1.new_page()
        console_messages_create = setup_console_logging(page1)
        
        page1.goto("http://localhost:8000")
        
        # Wait for the page to fully load
        page1.wait_for_load_state('networkidle')
        
        # Create a shared link using JavaScript directly
        print("Creating shared link using JavaScript...")
        
        # Create a shared link with test data
        share_creation_result = page1.evaluate("""
        () => {
            try {
                // Create test payload
                const testPayload = {
                    apiKey: 'sk-test-key-12345',
                    model: 'gpt-4o-mini',
                    systemPrompt: 'You are a helpful test assistant.'
                };
                
                const password = 'testpassword123';
                
                // Use LinkSharingService to create the link
                if (window.LinkSharingService && window.LinkSharingService.createCustomShareableLink) {
                    const shareUrl = window.LinkSharingService.createCustomShareableLink(testPayload, password);
                    return {
                        success: true,
                        shareUrl: shareUrl,
                        password: password
                    };
                } else {
                    return {
                        success: false,
                        error: 'LinkSharingService not available'
                    };
                }
            } catch (error) {
                return {
                    success: false,
                    error: error.message
                };
            }
        }
        """)
        
        if not share_creation_result['success']:
            print(f"❌ Failed to create share link: {share_creation_result.get('error', 'Unknown error')}")
            browser.close()
            return
            
        share_url = share_creation_result['shareUrl']
        password = share_creation_result['password']
        
        print(f"✅ Share link created: {share_url}")
        print(f"✅ Password: {password}")
        
        screenshot_with_markdown(page1, "share_link_created", {
            "Status": "Share link created via JavaScript",
            "Share URL": share_url,
            "Password": password,
            "Console Messages": str(len(console_messages_create))
        })
        
        context1.close()
        
        # ===============================
        # STEP 2: Open the shared link
        # ===============================
        print(f"\n🔗 STEP 2: Opening shared link...")
        
        context2 = browser.new_context()
        page2 = context2.new_page()
        console_messages_open = setup_console_logging(page2)
        
        # Navigate to the shared link
        print(f"Navigating to: {share_url}")
        page2.goto(share_url)
        
        # Wait for page to load
        page2.wait_for_load_state('networkidle')
        time.sleep(2)  # Give additional time for initialization
        
        screenshot_with_markdown(page2, "after_navigation", {
            "Status": "After navigating to shared link",
            "URL": share_url,
            "Console Messages": str(len(console_messages_open))
        })
        
        # Check if password prompt appears
        password_prompt_visible = False
        try:
            # Look for password dialog/prompt
            password_element = page2.locator("#password-input, input[type='password'], .password-prompt")
            password_element.wait_for(state="visible", timeout=5000)
            password_prompt_visible = True
            print("✅ Password prompt appeared")
        except Exception:
            # Try to check if browser's built-in password prompt appeared
            print("❌ No password input field found")
            
            # Check if the page shows any password-related content
            page_content = page2.content()
            if "password" in page_content.lower():
                print("🔍 Found password-related content in page")
            
            # Check for JavaScript prompt (browser's built-in)
            # This might be handled differently in headless mode
        
        # Try to trigger password prompt manually if not visible
        if not password_prompt_visible:
            print("Attempting to trigger password prompt manually...")
            
            # Try calling the shared link processing directly
            prompt_result = page2.evaluate("""
            () => {
                try {
                    // Check if LinkSharingService detects a shared link
                    if (window.LinkSharingService && window.LinkSharingService.hasSharedApiKey) {
                        const hasShared = window.LinkSharingService.hasSharedApiKey();
                        
                        if (hasShared) {
                            // Try to extract with the test password
                            const result = window.LinkSharingService.extractSharedApiKey('testpassword123');
                            return {
                                hasSharedLink: true,
                                extractionResult: result,
                                url: window.location.href
                            };
                        } else {
                            return {
                                hasSharedLink: false,
                                url: window.location.href
                            };
                        }
                    }
                    return { error: 'LinkSharingService not available' };
                } catch (error) {
                    return { error: error.message };
                }
            }
            """)
            
            print(f"Manual extraction result: {prompt_result}")
            
            if prompt_result.get('extractionResult'):
                print("✅ Successfully extracted shared data!")
                
                # Check if settings modal opened automatically
                settings_modal_visible = page2.locator("#settings-modal").is_visible()
                welcome_modal_visible = page2.locator("#welcome-modal").is_visible()
                
                print(f"Settings modal auto-opened: {settings_modal_visible}")
                print(f"Welcome modal visible: {welcome_modal_visible}")
            else:
                print(f"❌ Failed to extract shared data: {prompt_result}")
        
        screenshot_with_markdown(page2, "final_state", {
            "Status": "Final state after shared link processing",
            "Password Prompt Visible": str(password_prompt_visible),
            "Manual Extraction": str(prompt_result if 'prompt_result' in locals() else 'Not attempted'),
            "Console Messages": str(len(console_messages_open))
        })
        
        # Save console messages
        with open("/Users/user/dev/hacka.re/_tests/playwright/debug_tests/console_realistic_test.json", 'w') as f:
            json.dump(console_messages_create + console_messages_open, f, indent=2)
        
        context2.close()
        browser.close()
        
        # ===============================
        # STEP 3: Analyze results
        # ===============================
        print("\n📊 ANALYSIS RESULTS:")
        print("="*50)
        
        all_messages = console_messages_create + console_messages_open
        
        # Check for specific error patterns
        processor_errors = [msg for msg in all_messages if "SharedLinkDataProcessor" in msg['text'] and msg['type'] in ['error', 'warn']]
        crypto_errors = [msg for msg in all_messages if "generateRandomId" in msg['text'] and msg['type'] in ['error', 'warn']]
        session_key_messages = [msg for msg in all_messages if "Session key" in msg['text']]
        namespace_messages = [msg for msg in all_messages if "NamespaceService" in msg['text']]
        
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
        
        print(f"\nTotal console messages: {len(all_messages)}")
        
        # Overall assessment
        print("\n🎯 FIXES ASSESSMENT:")
        print(f"{'✅' if len(processor_errors) == 0 else '❌'} SharedLinkDataProcessor errors: {'FIXED' if len(processor_errors) == 0 else 'STILL PRESENT'}")
        print(f"{'✅' if len(crypto_errors) == 0 else '❌'} CryptoUtils.generateRandomId errors: {'FIXED' if len(crypto_errors) == 0 else 'STILL PRESENT'}")
        print(f"{'✅' if len(session_key_messages) > 0 else '❌'} Session key flow: {'WORKING' if len(session_key_messages) > 0 else 'NO MESSAGES'}")
        
        return {
            'share_creation': share_creation_result['success'],
            'processor_errors': len(processor_errors),
            'crypto_errors': len(crypto_errors),
            'session_key_messages': len(session_key_messages),
            'namespace_messages': len(namespace_messages),
            'total_console_messages': len(all_messages)
        }

if __name__ == "__main__":
    results = test_shared_link_realistic()
    print(f"\n📝 Test completed. Results: {results}")