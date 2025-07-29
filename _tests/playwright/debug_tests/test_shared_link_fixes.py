#!/usr/bin/env python3
"""
Test script for shared link functionality fixes.
Tests the specific issues mentioned:
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
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

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

def test_shared_link_creation_and_usage():
    """Test complete shared link flow with detailed console monitoring"""
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=1000)  # Visible browser for debugging
        
        print("🚀 Starting shared link functionality test...")
        
        # ===============================
        # STEP 1: Create a shared link
        # ===============================
        print("\n📝 STEP 1: Creating shared link...")
        
        context1 = browser.new_context()
        page1 = context1.new_page()
        console_messages_create = setup_console_logging(page1)
        
        page1.goto("http://localhost:8000")
        
        # Wait for page to fully load before dismissing modal
        page1.wait_for_selector("#welcome-modal", state="visible", timeout=10000)
        dismiss_welcome_modal(page1)
        
        # Wait for settings button to be available
        page1.wait_for_selector("#settings-button", state="visible", timeout=5000)
        
        # Configure API key and basic settings
        print("Setting up API key and basic settings...")
        page1.locator("#settings-button").click()
        
        # Set OpenAI API key
        api_key_input = page1.locator("#openai-api-key")
        api_key_input.fill("sk-test-key-for-sharing-functionality")
        
        # Set a model
        model_select = page1.locator("#openai-model")
        model_select.select_option("gpt-4o-mini")
        
        # Add a simple system prompt
        system_prompt = page1.locator("#system-prompt")
        system_prompt.fill("You are a helpful assistant for testing shared links.")
        
        # Close settings
        page1.locator("#close-settings").click()
        
        # Add a test message to the chat
        chat_input = page1.locator("#user-input")
        chat_input.fill("Test message for shared link")
        page1.locator("#send-button").click()
        
        # Wait a moment for message to appear
        page1.wait_for_timeout(1000)
        
        screenshot_with_markdown(page1, "before_share_creation", {
            "Status": "Ready to create shared link",
            "API Key": "Configured",
            "Model": "gpt-4o-mini",
            "System Prompt": "Set",
            "Chat Messages": "1 test message added"
        })
        
        # Create shared link
        print("Creating shared link...")
        page1.locator("#share-button").click()
        
        # Wait for share modal to appear
        page1.wait_for_selector("#share-modal", state="visible", timeout=5000)
        
        # Set password
        password_input = page1.locator("#share-password")
        password_input.fill("testpassword123")
        
        # Create share
        create_share_button = page1.locator("#create-share")
        create_share_button.click()
        
        # Wait for share URL to be generated
        page1.wait_for_selector("#share-url", state="visible", timeout=10000)
        
        # Get the shared URL
        share_url = page1.locator("#share-url").input_value()
        print(f"✅ Shared link created: {share_url}")
        
        screenshot_with_markdown(page1, "share_created", {
            "Status": "Share link created successfully",
            "Share URL": share_url,
            "Password": "testpassword123"
        })
        
        # Close share modal
        page1.locator("#close-share-modal").click()
        
        # Save console messages from creation
        with open("/Users/user/dev/hacka.re/_tests/playwright/debug_tests/console_create.json", 'w') as f:
            json.dump(console_messages_create, f, indent=2)
        
        context1.close()
        
        # ===============================
        # STEP 2: Open shared link in new context
        # ===============================
        print(f"\n🔗 STEP 2: Opening shared link in new context...")
        print(f"URL: {share_url}")
        
        context2 = browser.new_context()
        page2 = context2.new_page()
        console_messages_open = setup_console_logging(page2)
        
        # Navigate to shared link
        page2.goto(share_url)
        
        # Wait for password prompt
        page2.wait_for_selector("#password-input", state="visible", timeout=10000)
        
        screenshot_with_markdown(page2, "password_prompt", {
            "Status": "Password prompt appeared",
            "URL": share_url,
            "Console Messages": str(len(console_messages_open))
        })
        
        # Enter password
        print("Entering password...")
        password_field = page2.locator("#password-input")
        password_field.fill("testpassword123")
        
        # Submit password
        submit_button = page2.locator("#submit-password")
        submit_button.click()
        
        # Wait for decryption to complete
        print("Waiting for decryption to complete...")
        page2.wait_for_timeout(3000)  # Give time for decryption and initialization
        
        # Check if main chat interface is visible
        try:
            page2.wait_for_selector("#chat-container", state="visible", timeout=10000)
            print("✅ Chat interface loaded successfully")
        except Exception as e:
            print(f"❌ Chat interface failed to load: {e}")
        
        # Check if settings modal opened automatically (should NOT happen)
        settings_modal_visible = page2.locator("#settings-modal").is_visible()
        print(f"Settings modal auto-opened: {settings_modal_visible}")
        
        # Check if API key prompt appeared (should NOT happen)
        welcome_modal_visible = page2.locator("#welcome-modal").is_visible()
        print(f"Welcome/API key modal visible: {welcome_modal_visible}")
        
        screenshot_with_markdown(page2, "after_decryption", {
            "Status": "After password submission and decryption",
            "Chat Interface Visible": str(page2.locator("#chat-container").is_visible()),
            "Settings Modal Auto-Opened": str(settings_modal_visible),
            "Welcome Modal Visible": str(welcome_modal_visible),
            "Console Messages": str(len(console_messages_open))
        })
        
        # Check for specific elements that should be restored
        system_prompt_restored = False
        api_key_restored = False
        
        # Open settings to check restoration
        if not settings_modal_visible:
            page2.locator("#settings-button").click()
            page2.wait_for_selector("#settings-modal", state="visible", timeout=5000)
        
        # Check API key restoration
        try:
            api_key_value = page2.locator("#openai-api-key").input_value()
            api_key_restored = bool(api_key_value and "sk-test-key" in api_key_value)
            print(f"API key restored: {api_key_restored} (value: {api_key_value[:20]}...)")
        except Exception as e:
            print(f"Error checking API key: {e}")
        
        # Check system prompt restoration
        try:
            system_prompt_value = page2.locator("#system-prompt").input_value()
            system_prompt_restored = bool(system_prompt_value and "helpful assistant" in system_prompt_value)
            print(f"System prompt restored: {system_prompt_restored}")
        except Exception as e:
            print(f"Error checking system prompt: {e}")
        
        # Close settings if we opened it
        if page2.locator("#close-settings").is_visible():
            page2.locator("#close-settings").click()
        
        screenshot_with_markdown(page2, "final_state", {
            "Status": "Final state after shared link opening",
            "API Key Restored": str(api_key_restored),
            "System Prompt Restored": str(system_prompt_restored),
            "Settings Auto-Opened": str(settings_modal_visible),
            "Welcome Modal Visible": str(welcome_modal_visible),
            "Total Console Messages": str(len(console_messages_open))
        })
        
        # Save console messages from opening
        with open("/Users/user/dev/hacka.re/_tests/playwright/debug_tests/console_open.json", 'w') as f:
            json.dump(console_messages_open, f, indent=2)
        
        context2.close()
        browser.close()
        
        # ===============================
        # STEP 3: Analyze results
        # ===============================
        print("\n📊 ANALYSIS RESULTS:")
        print("="*50)
        
        # Check for specific error patterns
        all_messages = console_messages_create + console_messages_open
        
        # Check for SharedLinkDataProcessor errors
        processor_errors = [msg for msg in all_messages if "SharedLinkDataProcessor" in msg['text'] and msg['type'] in ['error', 'warn']]
        print(f"SharedLinkDataProcessor errors: {len(processor_errors)}")
        for error in processor_errors:
            print(f"  - {error['timestamp']}: {error['text']}")
        
        # Check for CryptoUtils.generateRandomId errors
        crypto_errors = [msg for msg in all_messages if "generateRandomId" in msg['text'] and msg['type'] in ['error', 'warn']]
        print(f"CryptoUtils.generateRandomId errors: {len(crypto_errors)}")
        for error in crypto_errors:
            print(f"  - {error['timestamp']}: {error['text']}")
        
        # Check for session key messages
        session_key_messages = [msg for msg in all_messages if "Session key" in msg['text']]
        print(f"Session key messages: {len(session_key_messages)}")
        for msg in session_key_messages:
            print(f"  - {msg['timestamp']}: {msg['text']}")
        
        # Check for namespace messages
        namespace_messages = [msg for msg in all_messages if "NamespaceService" in msg['text']]
        print(f"NamespaceService messages: {len(namespace_messages)}")
        for msg in namespace_messages:
            print(f"  - {msg['timestamp']}: {msg['text']}")
        
        # Overall assessment
        print("\n🎯 OVERALL ASSESSMENT:")
        print(f"✅ Share link creation: SUCCESS")
        print(f"✅ Password prompt: SUCCESS") 
        print(f"{'✅' if api_key_restored else '❌'} API key restoration: {'SUCCESS' if api_key_restored else 'FAILED'}")
        print(f"{'✅' if system_prompt_restored else '❌'} System prompt restoration: {'SUCCESS' if system_prompt_restored else 'FAILED'}")
        print(f"{'✅' if not settings_modal_visible else '❌'} Settings modal auto-open prevention: {'SUCCESS' if not settings_modal_visible else 'FAILED'}")
        print(f"{'✅' if len(processor_errors) == 0 else '❌'} SharedLinkDataProcessor errors: {'FIXED' if len(processor_errors) == 0 else 'STILL PRESENT'}")
        print(f"{'✅' if len(crypto_errors) == 0 else '❌'} CryptoUtils errors: {'FIXED' if len(crypto_errors) == 0 else 'STILL PRESENT'}")
        
        return {
            'share_creation': True,
            'password_prompt': True,
            'api_key_restored': api_key_restored,
            'system_prompt_restored': system_prompt_restored,
            'settings_auto_opened': settings_modal_visible,
            'processor_errors': len(processor_errors),
            'crypto_errors': len(crypto_errors),
            'session_key_messages': len(session_key_messages),
            'namespace_messages': len(namespace_messages),
            'total_console_messages': len(all_messages)
        }

if __name__ == "__main__":
    results = test_shared_link_creation_and_usage()
    print(f"\n📝 Test completed. Results: {results}")