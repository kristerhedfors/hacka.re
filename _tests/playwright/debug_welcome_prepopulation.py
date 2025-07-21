#!/usr/bin/env python3
"""
Debug welcome message pre-population flow
"""

import pytest
import time
import os
from test_utils import dismiss_welcome_modal

def test_debug_welcome_prepopulation(page, serve_hacka_re):
    """Debug the welcome message pre-population"""
    
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        pytest.skip("OPENAI_API_KEY not set")
    
    print("🚀 Debugging Welcome Message Pre-population")
    
    page.set_viewport_size({"width": 1200, "height": 800})
    
    # Phase 1: Create shared link
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Close settings modal if open
    if page.is_visible('#settings-modal.active'):
        page.press('body', 'Escape')
        page.wait_for_timeout(500)
    
    # Configure API
    page.click('#settings-btn')
    page.wait_for_selector('#api-key-update')
    page.fill('#api-key-update', api_key)
    page.click('#save-settings-btn')
    page.wait_for_timeout(1000)
    
    # Open share modal
    page.click('#share-btn')
    page.wait_for_selector('#share-modal.active')
    
    # Set welcome message
    welcome_message = "🎉 Test welcome message for debugging"
    page.check('#share-welcome-message-checkbox')
    page.fill('#share-welcome-message', welcome_message)
    
    # Generate link
    session_key = page.input_value('#share-password')
    page.click('#generate-share-link-btn')
    page.wait_for_selector('#generated-share-link')
    shared_link = page.input_value('#generated-share-link')
    
    print(f"✅ Created shared link: {shared_link[:80]}...")
    print(f"   Session key: {session_key}")
    
    # Phase 2: Load shared link
    print("\n🔄 Loading shared link...")
    page.goto(shared_link)
    
    # Handle password prompt
    try:
        page.wait_for_selector('input[type="password"]', timeout=5000)
        page.fill('input[type="password"]', session_key)
        page.click('button[type="submit"]')
        page.wait_for_timeout(2000)
        print("✅ Password submitted")
    except Exception as e:
        print(f"❌ Password prompt handling failed: {e}")
    
    # Wait for welcome message to appear
    try:
        page.wait_for_selector('.message.system.welcome-message', timeout=10000)
        welcome_displayed = page.text_content('.message.system.welcome-message')
        print(f"✅ Welcome message displayed: {welcome_displayed[:50]}...")
    except Exception as e:
        print(f"❌ Welcome message not found: {e}")
    
    # Phase 3: Check share modal pre-population
    print("\n🔄 Opening share modal to check pre-population...")
    page.click('#share-btn')
    page.wait_for_selector('#share-modal.active')
    
    # Check if welcome message is pre-populated
    if page.is_visible('#share-welcome-message'):
        prepopulated = page.input_value('#share-welcome-message')
        checkbox_checked = page.is_checked('#share-welcome-message-checkbox')
        
        print(f"📝 Pre-populated message: '{prepopulated}'")
        print(f"☑️  Checkbox checked: {checkbox_checked}")
        
        if prepopulated == welcome_message:
            print("✅ SUCCESS: Message correctly pre-populated!")
        elif prepopulated:
            print(f"⚠️  PARTIAL: Different message pre-populated")
        else:
            print("❌ FAIL: No message pre-populated")
    else:
        print("❌ FAIL: Welcome message field not found")

if __name__ == "__main__":
    import subprocess
    result = subprocess.run([
        "python", "-m", "pytest", __file__, "-v", "--tb=short", "-s"
    ], cwd="/Users/user/dev/hacka.re/_tests/playwright")
    exit(result.returncode)