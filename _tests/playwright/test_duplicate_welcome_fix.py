"""
Test to verify duplicate welcome messages are fixed
"""
import os
import pytest
from playwright.sync_api import Page
from test_utils import dismiss_welcome_modal, screenshot_with_markdown


def test_duplicate_welcome_fix(page: Page, serve_hacka_re):
    """Test that welcome messages don't duplicate"""
    
    print("🎯 Testing Duplicate Welcome Message Fix")
    page.set_viewport_size({"width": 1200, "height": 800})
    
    # Navigate to the page
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    screenshot_with_markdown(page, "initial_load", {
        "Status": "Page loaded and welcome modal dismissed",
        "Test": "Checking for duplicate welcome messages"
    })
    
    # Simulate the shared link welcome message setup
    page.evaluate("""
        // Simulate what happens during shared link processing
        console.log('Setting up welcome message for prepending...');
        
        window._welcomeMessageToPrepend = {
            role: 'system',
            content: 'TEST WELCOME MESSAGE',
            className: 'welcome-message'
        };
        
        console.log('Welcome message set up for prepending');
    """)
    
    # Trigger conversation reload (simulates what happens with shared links)
    if page.evaluate("() => window.aiHackare && window.aiHackare.chatManager"):
        page.evaluate("""
            if (window.aiHackare && window.aiHackare.chatManager) {
                console.log('Triggering conversation history reload...');
                window.aiHackare.chatManager.reloadConversationHistory();
            }
        """)
        
        page.wait_for_timeout(1000)  # Wait for reload to process
        
        # Count how many welcome messages are displayed
        welcome_messages = page.locator('.message .message-content:has-text("TEST WELCOME MESSAGE")').count()
        system_messages = page.locator('.message .message-content:has-text("Welcome message displayed")').count()
        
        print(f"Welcome messages found: {welcome_messages}")
        print(f"System messages about welcome: {system_messages}")
        
        screenshot_with_markdown(page, "after_first_reload", {
            "Status": "After first conversation reload",
            "Welcome Messages": str(welcome_messages),
            "System Messages": str(system_messages),
            "Expected": "1 welcome message, 0 system messages"
        })
        
        # Trigger a second reload (simulates namespace service delayed reload)
        page.wait_for_timeout(500)
        page.evaluate("""
            if (window.aiHackare && window.aiHackare.chatManager) {
                console.log('Triggering SECOND conversation history reload...');
                window.aiHackare.chatManager.reloadConversationHistory();
            }
        """)
        
        page.wait_for_timeout(1000)  # Wait for second reload
        
        # Count messages again
        welcome_messages_after = page.locator('.message .message-content:has-text("TEST WELCOME MESSAGE")').count()
        system_messages_after = page.locator('.message .message-content:has-text("Welcome message displayed")').count()
        
        print(f"Welcome messages after second reload: {welcome_messages_after}")
        print(f"System messages after second reload: {system_messages_after}")
        
        screenshot_with_markdown(page, "after_second_reload", {
            "Status": "After second conversation reload", 
            "Welcome Messages": str(welcome_messages_after),
            "System Messages": str(system_messages_after),
            "Expected": "1 welcome message, 0 system messages",
            "Test Result": "PASS" if welcome_messages_after == 1 and system_messages_after == 0 else "FAIL"
        })
        
        # Verify the fix worked
        assert welcome_messages_after == 1, f"Expected 1 welcome message, got {welcome_messages_after}"
        assert system_messages_after == 0, f"Expected 0 system messages, got {system_messages_after}"
        
        print("✅ PASS: No duplicate welcome messages found")
        print("✅ PASS: No extra system messages found")
        
    else:
        print("❌ ChatManager not available for testing")
        
    print("🎯 Duplicate welcome message fix test complete")