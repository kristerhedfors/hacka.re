#!/usr/bin/env python3
"""
Debug Shared Link Welcome Message Functionality
===============================================

This Playwright debug script tests the shared link functionality, specifically 
focusing on whether welcome messages are properly included and displayed when
shared links are loaded. It captures comprehensive console output and debug
information to help identify issues.

Usage:
    python debug_shared_link_welcome.py [--headless] [--api-key YOUR_API_KEY]
"""

import pytest
import time
import os
import json
import argparse
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright, Page

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

def setup_console_logging(page: Page):
    """Setup comprehensive console logging"""
    console_messages = []
    
    def log_console_message(msg):
        timestamp = time.strftime("%H:%M:%S.%f")[:-3]
        message_info = {
            'timestamp': timestamp,
            'type': msg.type,
            'text': msg.text,
            'location': msg.location if hasattr(msg, 'location') else None
        }
        console_messages.append(message_info)
        print(f"[{timestamp}] Console {msg.type.upper()}: {msg.text}")
        if msg.location:
            print(f"    at {msg.location}")
    
    page.on("console", log_console_message)
    return console_messages

def dismiss_welcome_modal(page: Page):
    """Dismiss welcome modal if present"""
    try:
        welcome_modal = page.locator("#welcome-modal")
        if welcome_modal.is_visible(timeout=1000):
            close_button = page.locator("#close-welcome-modal")
            close_button.click(timeout=1000)
            page.wait_for_selector("#welcome-modal", state="hidden", timeout=2000)
            print("✅ Welcome modal dismissed")
        else:
            print("ℹ️  No welcome modal found")
    except Exception as e:
        print(f"⚠️  Could not dismiss welcome modal: {e}")

def dismiss_settings_modal(page: Page):
    """Dismiss settings modal if already open"""
    try:
        settings_modal = page.locator("#settings-modal.active")
        if settings_modal.is_visible(timeout=1000):
            print("⚙️  Settings modal is open, attempting to close...")
            # Try pressing Escape first
            page.keyboard.press("Escape")
            time.sleep(0.5)
            
            # If still open, try clicking close button
            if settings_modal.is_visible(timeout=500):
                close_button = page.locator("#close-settings-modal, .close-modal")
                if close_button.count() > 0:
                    close_button.first.click(force=True)
                    time.sleep(0.5)
            
            # Wait for modal to close
            page.wait_for_selector("#settings-modal.active", state="hidden", timeout=2000)
            print("✅ Settings modal dismissed")
        else:
            print("ℹ️  No active settings modal to dismiss")
    except Exception as e:
        print(f"⚠️  Could not dismiss settings modal: {e}")
        # Force close by removing the active class
        try:
            page.evaluate("""
                const modal = document.getElementById('settings-modal');
                if (modal && modal.classList.contains('active')) {
                    modal.classList.remove('active');
                    modal.style.display = 'none';
                }
            """)
            print("✅ Force closed settings modal via JavaScript")
        except Exception as js_error:
            print(f"⚠️  Could not force close: {js_error}")

def screenshot_with_debug(page: Page, name: str, debug_info: dict):
    """Take screenshot with debug information"""
    screenshot_path = f"screenshots/debug_{name}_{int(time.time())}.png"
    os.makedirs("screenshots", exist_ok=True)
    
    page.screenshot(path=screenshot_path)
    
    print(f"\n📸 Screenshot: {screenshot_path}")
    print("🔍 Debug Info:")
    for key, value in debug_info.items():
        print(f"   {key}: {value}")
    print()

def test_shared_link_creation_with_welcome(page: Page, serve_hacka_re: str, api_key: str):
    """Test creating a shared link with custom welcome message"""
    print("\n" + "="*60)
    print("PHASE 1: Creating Shared Link with Welcome Message")
    print("="*60)
    
    # Navigate and setup
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)  # Dismiss if already open
    
    # Setup API key first
    print("🔧 Setting up API configuration...")
    settings_button = page.locator("#settings-btn")
    settings_button.click(timeout=2000)
    
    page.wait_for_selector("#settings-modal.active", state="visible", timeout=2500)
    
    # Enter API key and select Groq
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill(api_key)
    
    base_url_select = page.locator("#base-url-select")
    base_url_select.select_option("groq")
    
    # Save settings
    close_button = page.locator("#close-settings")
    page.wait_for_timeout(1000)  # Wait for auto-save    close_button.click()
    page.wait_for_selector("#settings-modal", state="hidden", timeout=2500)
    
    # Open share modal
    print("🔗 Opening share modal...")
    share_button = page.locator("#share-btn")
    share_button.click(timeout=2000)
    
    page.wait_for_selector("#share-modal.active", state="visible", timeout=2500)
    
    screenshot_with_debug(page, "share_modal_opened", {
        "Modal visible": "True",
        "Page URL": page.url
    })
    
    # Check for welcome message checkbox and input
    print("🔍 Checking for welcome message controls...")
    
    welcome_checkbox = page.locator("#share-welcome-message-checkbox")
    welcome_textarea = page.locator("#share-welcome-message")
    
    welcome_checkbox_exists = welcome_checkbox.count() > 0
    welcome_textarea_exists = welcome_textarea.count() > 0
    
    print(f"   Welcome checkbox exists: {welcome_checkbox_exists}")
    print(f"   Welcome textarea exists: {welcome_textarea_exists}")
    
    custom_welcome = None
    if welcome_checkbox_exists:
        print("✅ Enabling welcome message sharing...")
        if not welcome_checkbox.is_checked():
            welcome_checkbox.check()
        
        # Set custom welcome message
        if welcome_textarea_exists:
            custom_welcome = "🎉 Welcome to our shared AI workspace! This link contains pre-configured settings to get you started."
            welcome_textarea.fill(custom_welcome)
            print(f"   Set welcome message: {custom_welcome}")
    else:
        print("❌ Welcome message checkbox not found!")
    
    # Enable API key sharing  
    api_key_checkbox = page.locator("#share-api-key")
    if api_key_checkbox.count() > 0 and not api_key_checkbox.is_checked():
        api_key_checkbox.check()
    
    # Generate session key
    print("🔑 Generating session key...")
    regenerate_button = page.locator("#regenerate-password")
    regenerate_button.click()
    time.sleep(0.5)
    
    session_key_input = page.locator("#share-password")
    session_key = session_key_input.input_value()
    print(f"   Session key: {session_key}")
    
    # Generate share link
    print("🚀 Generating share link...")
    generate_button = page.locator("#generate-share-link-btn")
    generate_button.click()
    
    time.sleep(1.0)  # Wait for link generation
    
    # Get the generated link
    generated_link_element = page.locator("#generated-link")
    if generated_link_element.is_visible():
        generated_link = generated_link_element.input_value()
        print(f"✅ Generated link: {generated_link[:50]}...")
        
        # Store for next phase
        return generated_link, session_key, custom_welcome
    else:
        print("❌ Generated link not visible!")
        # Try to get via JavaScript
        generated_link = page.evaluate("""() => {
            const linkElement = document.getElementById('generated-link');
            return linkElement ? linkElement.value : '';
        }""")
        print(f"   JS fallback link: {generated_link[:50]}..." if generated_link else "   No link found")
        return generated_link, session_key, custom_welcome

def test_shared_link_loading_with_welcome(page: Page, serve_hacka_re: str, shared_link: str, session_key: str, expected_welcome: str):
    """Test loading shared link and verifying welcome message appears"""
    print("\n" + "="*60)
    print("PHASE 2: Loading Shared Link and Checking Welcome Message")
    print("="*60)
    
    if not shared_link:
        print("❌ No shared link to test!")
        return
    
    # Clear any existing data and navigate to shared link
    print("🌐 Navigating to shared link...")
    print(f"   Link: {shared_link}")
    
    page.goto(shared_link)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)  # Dismiss if already open
    
    # Wait for password prompt
    print("🔐 Waiting for password prompt...")
    try:
        page.wait_for_selector("#password-modal", state="visible", timeout=5000)
        print("✅ Password modal appeared")
        
        screenshot_with_debug(page, "password_modal", {
            "Modal visible": "True",
            "Expected welcome": expected_welcome or "None"
        })
        
        # Enter password
        password_input = page.locator("#decrypt-password")
        password_input.fill(session_key)
        
        # Submit
        submit_button = page.locator("button[type='submit']")
        submit_button.click()
        
        print("🔓 Password submitted, waiting for decryption...")
        
        # Wait for modal to close
        page.wait_for_selector("#password-modal", state="hidden", timeout=5000)
        print("✅ Password modal closed")
        
        time.sleep(2.0)  # Give time for messages to appear
        
    except Exception as e:
        print(f"❌ Password prompt failed: {e}")
        return
    
    # Check for system messages
    print("📝 Checking for system messages...")
    
    # Look for system messages in chat
    system_messages = page.locator(".message.system")
    message_count = system_messages.count()
    print(f"   Found {message_count} system messages")
    
    messages_found = []
    for i in range(message_count):
        message_text = system_messages.nth(i).text_content()
        messages_found.append(message_text)
        print(f"   Message {i+1}: {message_text}")
    
    # Check specifically for welcome message
    welcome_found = False
    if expected_welcome:
        for message in messages_found:
            if expected_welcome in message or "Welcome to our shared AI workspace" in message:
                welcome_found = True
                print("✅ Welcome message found in system messages!")
                break
    
    if expected_welcome and not welcome_found:
        print("❌ Expected welcome message not found!")
        print(f"   Expected: {expected_welcome}")
        print("   Found messages:")
        for msg in messages_found:
            print(f"     - {msg}")
    
    screenshot_with_debug(page, "after_shared_link_loaded", {
        "System messages": str(message_count),
        "Welcome found": str(welcome_found),
        "Expected welcome": expected_welcome or "None"
    })
    
    return welcome_found

def main():
    parser = argparse.ArgumentParser(description='Debug shared link welcome message functionality')
    parser.add_argument('--headless', action='store_true', help='Run in headless mode')
    parser.add_argument('--api-key', help='OpenAI API key (overrides .env file)')
    args = parser.parse_args()
    
    # Get API key
    api_key = args.api_key or os.getenv("OPENAI_API_KEY", "sk-test-key")
    if not api_key or api_key == "sk-test-key":
        print("❌ Please provide a valid API key via --api-key or .env file")
        return
    
    print("🚀 Starting Shared Link Welcome Message Debug")
    print(f"   Headless mode: {args.headless}")
    print(f"   API key: {api_key[:10]}..." if api_key else "Not set")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=args.headless)
        context = browser.new_context()
        page = context.new_page()
        
        # Setup console logging
        console_messages = setup_console_logging(page)
        
        # Start local server (assuming it's running on 8000)
        serve_hacka_re = "http://localhost:8000"
        
        try:
            # Phase 1: Create shared link with welcome message
            shared_link, session_key, expected_welcome = test_shared_link_creation_with_welcome(
                page, serve_hacka_re, api_key
            )
            
            if shared_link:
                # Phase 2: Load shared link and check welcome message
                welcome_found = test_shared_link_loading_with_welcome(
                    page, serve_hacka_re, shared_link, session_key, expected_welcome
                )
                
                # Summary
                print("\n" + "="*60)
                print("DEBUG SUMMARY")
                print("="*60)
                print(f"✅ Shared link created: {bool(shared_link)}")
                print(f"✅ Welcome message expected: {bool(expected_welcome)}")
                print(f"✅ Welcome message found: {welcome_found if shared_link else 'N/A'}")
                print(f"📊 Console messages captured: {len(console_messages)}")
                
                if console_messages:
                    print("\n📝 Key Console Messages:")
                    for msg in console_messages[-10:]:  # Show last 10
                        print(f"   [{msg['timestamp']}] {msg['type']}: {msg['text']}")
                
                # Save console log to file
                log_file = "shared_link_debug_console.json"
                with open(log_file, 'w') as f:
                    json.dump(console_messages, f, indent=2)
                print(f"\n💾 Full console log saved to: {log_file}")
                
            else:
                print("\n❌ Could not create shared link - debugging failed")
                
        except Exception as e:
            print(f"\n💥 Debug script failed: {e}")
            import traceback
            traceback.print_exc()
        
        finally:
            browser.close()

if __name__ == "__main__":
    main()