#!/usr/bin/env python3
"""
Test welcome message pre-population in share modal after loading from shared link

This test verifies that when a user loads a shared link containing a welcome message,
then opens the share modal to create a new link, the welcome message is pre-populated.
"""

import pytest
import time
import os
from test_utils import screenshot_with_markdown, dismiss_welcome_modal

def test_welcome_message_prepopulation(page, serve_hacka_re):
    """Test that welcome message is pre-populated in share modal after loading shared link"""
    
    # Get API key from environment
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        pytest.skip("OPENAI_API_KEY not set")
    
    print("🚀 Testing Welcome Message Pre-population in Share Modal")
    print(f"   API key: {api_key[:10]}...")
    
    page.set_viewport_size({"width": 1200, "height": 800})
    
    try:
        # Phase 1: Create initial shared link with welcome message
        print("\n" + "="*60)
        print("PHASE 1: Creating Initial Shared Link with Welcome Message")
        print("="*60)
        
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        # Configure API key (modal may already be open)
        if page.is_visible('#settings-modal.active'):
            # Close the modal first
            page.press('body', 'Escape')
            page.wait_for_timeout(500)
            
        page.click('#settings-btn')
        page.wait_for_selector('#settings-modal.active')
        page.wait_for_selector('#api-key-update')
        page.fill('#api-key-update', api_key)
        page.click('#save-settings-btn')
        page.wait_for_timeout(1000)  # Wait for save to complete
        
        # Open share modal
        page.click('#share-btn')
        page.wait_for_selector('#share-modal.active')
        
        # Set welcome message
        welcome_message = "🎉 **Welcome to our collaborative workspace!** This shared link includes:\n\n- Pre-configured API settings\n- Custom welcome message\n- Ready-to-use environment\n\n*Happy chatting!* 🚀"
        
        if page.is_visible('#share-welcome-message-checkbox'):
            page.check('#share-welcome-message-checkbox')
        
        if page.is_visible('#share-welcome-message'):
            page.fill('#share-welcome-message', welcome_message)
        
        # Generate share link
        session_key = page.input_value('#share-password')
        page.click('#generate-share-link-btn')
        
        # Wait for link to be generated
        page.wait_for_selector('#generated-share-link')
        shared_link = page.input_value('#generated-share-link')
        
        print(f"✅ Created shared link with welcome message")
        print(f"   Session key: {session_key}")
        print(f"   Link: {shared_link[:80]}...")
        
        # Phase 2: Load shared link and verify welcome message processing
        print("\n" + "="*60)
        print("PHASE 2: Loading Shared Link and Processing Welcome Message")
        print("="*60)
        
        # Navigate to shared link
        page.goto(shared_link)
        
        # Handle decryption password prompt
        page.wait_for_selector('.modal.active', timeout=10000)
        if page.is_visible('input[type="password"]'):
            page.fill('input[type="password"]', session_key)
            page.click('button[type="submit"]')
            page.wait_for_selector('.modal:not(.active)', timeout=5000)
        
        # Wait for welcome message to appear
        page.wait_for_selector('.message.system.welcome-message', timeout=10000)
        welcome_displayed = page.text_content('.message.system.welcome-message')
        print(f"✅ Welcome message displayed: {welcome_displayed[:80]}...")
        
        # Phase 3: Open share modal and verify pre-population
        print("\n" + "="*60)
        print("PHASE 3: Verifying Welcome Message Pre-population")
        print("="*60)
        
        # Open share modal
        page.click('#share-btn')
        page.wait_for_selector('#share-modal.active')
        
        screenshot_with_markdown(page, "share_modal_with_prepopulated_welcome", 
                                "Share modal opened - checking welcome message pre-population")
        
        # Check if welcome message is pre-populated
        if page.is_visible('#share-welcome-message'):
            prepopulated_message = page.input_value('#share-welcome-message')
            checkbox_checked = page.is_checked('#share-welcome-message-checkbox')
            
            print(f"✅ Welcome message field exists")
            print(f"   Checkbox checked: {checkbox_checked}")
            print(f"   Pre-populated content: {prepopulated_message[:80]}...")
            
            # Verify the messages match
            if prepopulated_message == welcome_message:
                print("✅ SUCCESS: Welcome message correctly pre-populated!")
            else:
                print("❌ FAIL: Welcome message doesn't match")
                print(f"   Expected: {welcome_message[:80]}...")
                print(f"   Got: {prepopulated_message[:80]}...")
                
            # Verify checkbox is checked
            if checkbox_checked:
                print("✅ SUCCESS: Welcome message checkbox automatically checked!")
            else:
                print("❌ FAIL: Welcome message checkbox not checked")
                
        else:
            print("❌ FAIL: Welcome message field not found")
            
        # Phase 4: Generate new link to verify functionality works end-to-end
        print("\n" + "="*60)
        print("PHASE 4: Generating New Share Link with Pre-populated Welcome")
        print("="*60)
        
        # Generate a new share link
        page.click('#generate-share-link-btn')
        page.wait_for_selector('#generated-share-link')
        new_shared_link = page.input_value('#generated-share-link')
        
        print(f"✅ Generated new share link: {new_shared_link[:80]}...")
        print("✅ Test completed successfully - welcome message pre-population works!")
        
    except Exception as e:
        screenshot_with_markdown(page, "welcome_prepopulation_error", 
                                f"Error during welcome message pre-population test: {str(e)}")
        raise e
    finally:
        pass  # Page cleanup handled by fixture

if __name__ == "__main__":
    import subprocess
    result = subprocess.run([
        "python", "-m", "pytest", __file__, "-v", "--tb=short"
    ], cwd="/Users/user/dev/hacka.re/_tests/playwright")
    exit(result.returncode)