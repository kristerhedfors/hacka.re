import pytest
import time
import json
from test_utils import screenshot_with_markdown, dismiss_welcome_modal
from playwright.sync_api import Page, expect

@pytest.mark.feature_test
def test_cross_tab_sync_reduced_frequency(page: Page, serve_hacka_re):
    """Test that cross-tab sync operates at reduced frequency and logs less noise"""
    # Navigate to the application
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Set up console logging
    console_messages = []
    def log_console_message(msg):
        console_messages.append({
            'type': msg.type,
            'text': msg.text,
            'timestamp': time.time()
        })
    page.on("console", log_console_message)
    
    # Wait for page to fully load and services to initialize
    page.wait_for_selector("textarea[placeholder*='Type your message']", state="visible", timeout=10000)
    time.sleep(3)  # Allow services to initialize
    
    # Clear console messages and start fresh monitoring
    console_messages.clear()
    
    # Monitor for 12 seconds to see sync behavior
    start_time = time.time()
    page.wait_for_timeout(12000)
    end_time = time.time()
    
    # Filter for cross-tab sync messages
    sync_messages = [msg for msg in console_messages if 'CrossTabSync' in msg['text']]
    
    screenshot_with_markdown(page, "sync_monitoring", {
        "Test Duration": f"{end_time - start_time:.1f} seconds",
        "Total Console Messages": str(len(console_messages)),
        "CrossTabSync Messages": str(len(sync_messages)),
        "Status": "Monitoring cross-tab sync frequency"
    })
    
    # Should have reduced sync activity
    # With 5-second interval, we should see at most 2-3 sync checks in 12 seconds
    periodic_checks = [msg for msg in sync_messages if 'update check' in msg['text']]
    print(f"Periodic checks detected: {len(periodic_checks)}")
    
    # Should not have excessive logging
    assert len(sync_messages) < 20, f"Too many sync messages: {len(sync_messages)}"
    
    # Verify that empty check reduction is working
    empty_skips = [msg for msg in sync_messages if 'reduce logging frequency' in msg['text']]
    if len(empty_skips) > 0:
        print(f"Successfully reduced empty check frequency: {len(empty_skips)} skip messages")

@pytest.mark.feature_test  
def test_cross_tab_sync_stable_hash(page: Page, serve_hacka_re):
    """Test that history hash generation is stable and doesn't change without content changes"""
    # Navigate to the application
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Set up console logging
    console_messages = []
    def log_console_message(msg):
        console_messages.append({
            'type': msg.type, 
            'text': msg.text
        })
    page.on("console", log_console_message)
    
    # Wait for initialization
    page.wait_for_selector("textarea[placeholder*='Type your message']", state="visible", timeout=10000)
    time.sleep(2)
    
    # Clear messages and monitor for hash changes
    console_messages.clear()
    
    # Monitor for 10 seconds without any user interaction
    page.wait_for_timeout(10000)
    
    # Check for hash change messages
    hash_changes = [msg for msg in console_messages if 'Hash change:' in msg['text']]
    
    screenshot_with_markdown(page, "stable_hash_test", {
        "Hash Changes": str(len(hash_changes)),
        "Status": "No user interaction - should be stable"
    })
    
    # Without any content changes, hash should remain stable
    assert len(hash_changes) == 0, f"Hash changed without content changes: {len(hash_changes)} changes detected"
    
    print("✅ Hash generation is stable - no unnecessary changes detected")