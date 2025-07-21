#!/usr/bin/env python3
"""
Test both welcome message fixes:
1. Pre-population in share modal after loading shared link
2. Default welcome message only appears when appropriate
"""

import pytest
import os
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_welcome_message_fixes(page, serve_hacka_re):
    """Test both welcome message fixes work together"""
    
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        pytest.skip("OPENAI_API_KEY not set")
    
    print("🚀 Testing Welcome Message Fixes")
    page.set_viewport_size({"width": 1200, "height": 800})
    
    # Phase 1: Create shared link with custom welcome message
    print("\n" + "="*50)
    print("PHASE 1: Creating Shared Link with Custom Welcome")
    print("="*50)
    
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Configure API
    if page.is_visible('#settings-modal.active'):
        page.press('body', 'Escape')
        page.wait_for_timeout(500)
        
    page.click('#settings-btn')
    page.wait_for_selector('#api-key-update')
    page.fill('#api-key-update', api_key)
    page.click('#save-settings-btn')
    page.wait_for_timeout(1000)
    
    # Create share link with custom welcome message
    page.click('#share-btn')
    page.wait_for_selector('#share-modal.active')
    
    custom_welcome = "🎯 **Custom Welcome!** This is a test message with *markdown*."
    page.check('#share-welcome-message-checkbox')
    page.fill('#share-welcome-message', custom_welcome)
    
    # Generate link
    session_key = page.input_value('#share-password')
    page.click('#generate-share-link-btn')
    page.wait_for_selector('#generated-share-link')
    shared_link = page.input_value('#generated-share-link')
    
    print(f"✅ Created shared link with custom welcome message")
    print(f"   Link: {shared_link[:50]}...")
    
    # Phase 2: Load shared link and check welcome message behavior
    print("\n" + "="*50)
    print("PHASE 2: Loading Shared Link & Checking Welcome")  
    print("="*50)
    
    page.goto(shared_link)
    
    # Handle password if needed
    try:
        page.wait_for_selector('input[type="password"]', timeout=3000)
        page.fill('input[type="password"]', session_key)
        page.click('button[type="submit"]')
        page.wait_for_timeout(2000)
    except:
        pass  # No password prompt
    
    # Check that only custom welcome message appears, not default
    messages = page.query_selector_all('.message.system')
    welcome_messages = []
    default_found = False
    custom_found = False
    
    for msg in messages:
        content = msg.text_content()
        if "Welcome to hacka.re" in content and "Start a conversation" in content:
            default_found = True
            welcome_messages.append("DEFAULT: " + content[:50])
        elif custom_welcome.replace('*', '').replace('#', '') in content.replace('*', '').replace('#', ''):
            custom_found = True
            welcome_messages.append("CUSTOM: " + content[:50])
    
    print(f"📝 System messages found: {len(messages)}")
    print(f"🎯 Custom welcome found: {custom_found}")  
    print(f"🏠 Default welcome found: {default_found}")
    
    if custom_found and not default_found:
        print("✅ SUCCESS: Only custom welcome message displayed!")
    elif default_found and not custom_found:
        print("❌ FAIL: Only default welcome message displayed")
    elif custom_found and default_found:
        print("⚠️  PARTIAL: Both messages displayed (should only show custom)")
    else:
        print("❌ FAIL: No welcome messages found")
    
    # Phase 3: Check pre-population in share modal
    print("\n" + "="*50)
    print("PHASE 3: Checking Welcome Message Pre-population")
    print("="*50)
    
    page.click('#share-btn')
    page.wait_for_selector('#share-modal.active')
    
    screenshot_with_markdown(page, "welcome_fixes_test", 
                           "Share modal after loading shared link - checking pre-population")
    
    # Check pre-population
    if page.is_visible('#share-welcome-message'):
        prepopulated = page.input_value('#share-welcome-message')
        checkbox_checked = page.is_checked('#share-welcome-message-checkbox')
        
        print(f"📝 Pre-populated message: '{prepopulated[:30]}...'")
        print(f"☑️  Checkbox checked: {checkbox_checked}")
        
        if prepopulated == custom_welcome and checkbox_checked:
            print("✅ SUCCESS: Welcome message correctly pre-populated!")
        elif prepopulated and prepopulated != custom_welcome:
            print(f"⚠️  PARTIAL: Different message pre-populated")
        elif not prepopulated:
            print("❌ FAIL: No message pre-populated")
        elif not checkbox_checked:
            print("⚠️  PARTIAL: Message populated but checkbox not checked")
    else:
        print("❌ FAIL: Welcome message field not found")
    
    print("\n🎯 Test completed!")

if __name__ == "__main__":
    import subprocess
    result = subprocess.run([
        "python", "-m", "pytest", __file__, "-v", "--tb=short", "-s"
    ], cwd="/Users/user/dev/hacka.re/_tests/playwright")
    exit(result.returncode)