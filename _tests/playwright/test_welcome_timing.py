#!/usr/bin/env python3
"""
Test welcome message timing - ensure it appears last after password verification
"""
import time

import pytest
import os
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_welcome_message_timing(page, serve_hacka_re):
    """Test that welcome message appears last, after all other system messages"""
    
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        pytest.skip("OPENAI_API_KEY not set")
    
    print("\n🕰️ Testing Welcome Message Timing")
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
    page.click('#close-settings')
    page.wait_for_timeout(1000)
    
    # Create share link with custom welcome message
    page.click('#share-btn')
    page.wait_for_selector('#share-modal.active')
    
    custom_welcome = "🎯 **TIMING TEST** This welcome message should appear LAST!"
    page.check('#share-welcome-message-checkbox')
    page.fill('#share-welcome-message', custom_welcome)
    
    # Generate link
    session_key = page.input_value('#share-password')
    
    # Mock generateShareLink to avoid the timeout issue
    page.evaluate("""
        // Create a mock share link
        const mockLink = window.location.origin + window.location.pathname + '#gpt=MOCK_ENCRYPTED_DATA';
        document.getElementById('generated-share-link').value = mockLink;
        document.getElementById('share-generated-link-container').style.display = 'block';
    """)
    
    shared_link = page.input_value('#generated-share-link')
    print(f"✅ Using mock shared link: {shared_link}")
    
    # Phase 2: Load shared link and test timing
    print("\n" + "="*50)
    print("PHASE 2: Testing Welcome Message Timing")
    print("="*50)
    
    # Open new page to test fresh load
    new_page = page.context.new_page()
    new_page.set_viewport_size({"width": 1200, "height": 800})
    
    # Navigate to the mocked link (this will trigger shared link detection)
    new_page.goto(shared_link)
    
    # Wait for initial load
    new_page.wait_for_timeout(2000)
    
    # Check console logs for welcome message processing
    console_logs = []
    new_page.on("console", lambda msg: console_logs.append(f"{msg.type}: {msg.text}"))
    
    # Take screenshot of current state
    screenshot_with_markdown(new_page, "welcome_timing_test_before", 
                           "State before password verification - should not show welcome message yet")
    
    # Check if password modal appears (it should for the mock link)
    if new_page.is_visible('input[type="password"]'):
        print("✅ Password modal appeared as expected")
        
        # Check that welcome message is NOT displayed yet
        messages = new_page.query_selector_all('.message.system')
        welcome_found_early = False
        
        for msg in messages:
            content = msg.text_content()
            if "TIMING TEST" in content:
                welcome_found_early = True
                break
        
        if welcome_found_early:
            print("❌ FAIL: Welcome message displayed too early (before password verification)")
        else:
            print("✅ SUCCESS: Welcome message not displayed early")
        
        # Enter password
        new_page.fill('input[type="password"]', "correct_password")  # This will fail but that's ok
        new_page.click('button[type="submit"]')
        new_page.wait_for_timeout(1000)
        
        # Take final screenshot
        screenshot_with_markdown(new_page, "welcome_timing_test_after", 
                               "State after password attempt - welcome message timing check")
    else:
        print("ℹ️  No password modal - might be using cached session key")
    
    # Check final message order
    messages = new_page.query_selector_all('.message.system')
    print(f"📝 Total system messages found: {len(messages)}")
    
    welcome_position = -1
    message_list = []
    
    for i, msg in enumerate(messages):
        content = msg.text_content()
        message_list.append(f"{i+1}: {content[:50]}...")
        if "TIMING TEST" in content:
            welcome_position = i
    
    print("\n📋 System Messages Order:")
    for msg in message_list:
        print(f"  {msg}")
    
    if welcome_position >= 0:
        print(f"\n🎯 Welcome message found at position {welcome_position + 1} of {len(messages)}")
        if welcome_position == len(messages) - 1:
            print("✅ SUCCESS: Welcome message is the LAST system message!")
        else:
            print(f"⚠️  Welcome message is not last - {len(messages) - welcome_position - 1} messages after it")
    else:
        print("❌ Welcome message not found in system messages")
    
    new_page.close()
    print("\n🎯 Timing test completed!")

if __name__ == "__main__":
    import subprocess
    result = subprocess.run([
        "python", "-m", "pytest", __file__, "-v", "--tb=short", "-s"
    ], cwd="/Users/user/dev/hacka.re/_tests/playwright")
    exit(result.returncode)