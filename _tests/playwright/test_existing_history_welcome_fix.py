"""
Test to verify welcome message doesn't duplicate when loading shared link with existing conversation history
"""
import os
import pytest
from playwright.sync_api import Page
from test_utils import dismiss_welcome_modal, screenshot_with_markdown


def test_existing_history_welcome_fix(page: Page, serve_hacka_re):
    """Test that welcome messages don't duplicate when conversation history exists"""
    
    print("🔄 Testing Welcome Message Fix with Existing History")
    page.set_viewport_size({"width": 1200, "height": 800})
    
    # Navigate to the page
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Simulate existing conversation history that already includes a welcome message
    page.evaluate("""
        // Clear any existing localStorage first
        localStorage.clear();
        
        // Simulate conversation history with welcome message already included 
        const existingHistory = [
            {
                role: 'system',
                content: 'EXISTING WELCOME MESSAGE',
                className: 'welcome-message'
            },
            {
                role: 'user', 
                content: 'Hello, this is a test message'
            },
            {
                role: 'assistant',
                content: 'Hi there! This is a response to the test.'
            }
        ];
        
        // Store in the namespace-aware way
        if (window.StorageService && window.StorageService.saveChatHistory) {
            window.StorageService.saveChatHistory(existingHistory);
            console.log('Saved existing history with welcome message');
        } else {
            // Fallback to direct localStorage
            localStorage.setItem('hacka_re_chat_history', JSON.stringify(existingHistory));
            console.log('Saved existing history to localStorage directly');
        }
    """)
    
    # Now set up the shared link welcome message (simulating what happens during shared link load)
    page.evaluate("""
        // Set the welcome message flag that would be set by shared link processing
        window._welcomeMessageToPrepend = {
            role: 'system',
            content: 'SHARED LINK WELCOME MESSAGE',
            className: 'welcome-message'
        };
        
        console.log('Set shared link welcome message for prepending');
    """)
    
    screenshot_with_markdown(page, "before_reload", {
        "Status": "Set up existing history with welcome + shared link welcome",
        "Test": "Should detect existing welcome and not duplicate"
    })
    
    # Trigger conversation reload (simulates what happens with shared links)
    if page.evaluate("() => window.aiHackare && window.aiHackare.chatManager"):
        page.evaluate("""
            if (window.aiHackare && window.aiHackare.chatManager) {
                console.log('Triggering conversation history reload...');
                window.aiHackare.chatManager.reloadConversationHistory();
            }
        """)
        
        page.wait_for_timeout(1000)  # Wait for reload to process
        
        # Count welcome messages - should only be 1 (the existing one)
        welcome_messages = page.locator('.message .message-content:has-text("WELCOME MESSAGE")').count()
        existing_welcome = page.locator('.message .message-content:has-text("EXISTING WELCOME MESSAGE")').count() 
        shared_welcome = page.locator('.message .message-content:has-text("SHARED LINK WELCOME MESSAGE")').count()
        total_messages = page.locator('.message').count()
        
        # Debug: Show all message contents to see what the extra message is
        all_messages = page.locator('.message .message-content').all_text_contents()
        print(f"All message contents: {all_messages}")
        
        print(f"Total messages: {total_messages}")
        print(f"Existing welcome messages: {existing_welcome}")
        print(f"Shared link welcome messages: {shared_welcome}") 
        print(f"Total welcome messages: {welcome_messages}")
        
        screenshot_with_markdown(page, "after_reload", {
            "Status": "After conversation reload",
            "Total Messages": str(total_messages),
            "Existing Welcome": str(existing_welcome), 
            "Shared Welcome": str(shared_welcome),
            "Expected": "3 total messages, 1 existing welcome, 0 shared welcome"
        })
        
        # The fix should detect the existing welcome message and not add the shared link one
        assert existing_welcome == 1, f"Expected 1 existing welcome message, got {existing_welcome}"
        assert shared_welcome == 0, f"Expected 0 shared link welcome messages, got {shared_welcome}"
        assert total_messages == 3, f"Expected 3 total messages, got {total_messages}"
        
        print("✅ PASS: Existing welcome message preserved")
        print("✅ PASS: Shared link welcome message not duplicated") 
        print("✅ PASS: Total message count correct")
        
    else:
        print("❌ ChatManager not available for testing")
        
    print("🔄 Existing history welcome message fix test complete")