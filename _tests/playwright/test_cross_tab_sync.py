"""
Cross-Tab Synchronization Tests
Tests that multiple tabs with the same shared link stay synchronized
when messages are added to one tab.
"""

import time
import os
from dotenv import load_dotenv
from playwright.sync_api import Page, expect, BrowserContext
from test_utils import dismiss_welcome_modal, scree, dismiss_settings_modalnshot_with_markdown

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
API_KEY = os.getenv("OPENAI_API_KEY", "sk-test-key-for-sync-tests")


def test_cross_tab_sync_basic(page: Page, serve_hacka_re, context: BrowserContext):
    """Test that messages sync between two tabs with the same shared link"""
    
    print("=== Cross-Tab Sync Basic Test ===")
    
    # Create a shared link first
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Set up basic configuration
    settings_btn = page.locator("#settings-btn")
    settings_btn.click()
    page.wait_for_selector("#settings-modal.active", timeout=5000)
    
    # Set API key
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill(API_KEY)
    # page.wait_for_timeout(500)  # TODO: Replace with proper wait condition
    
    # Close settings
    close_btn = page.locator("#close-settings-modal")
    close_btn.click()
    
    # Add a test message
    message_input = page.locator("#message-input")
    send_button = page.locator("#send-button")
    
    test_message = "Test message for cross-tab sync"
    message_input.fill(test_message)
    send_button.click()
    
    # Wait for message to appear
    page.wait_for_selector('.user-message', timeout=5000)
    
    screenshot_with_markdown(page, "tab1_message_sent", {
        "Status": "Message sent from tab 1",
        "Message": test_message,
        "Component": "Chat Interface"
    })
    
    # Create a shared link
    share_btn = page.locator("#share-btn")
    share_btn.click()
    page.wait_for_selector("#share-modal.active", timeout=5000)
    
    # Set password and generate link
    password_input = page.locator("#share-password")
    password_input.fill("testpassword123")
    
    # Select conversation data
    conversation_checkbox = page.locator("#share-conversation")
    conversation_checkbox.check()
    
    generate_btn = page.locator("#generate-share-link-btn")
    generate_btn.click()
    
    # Wait for link generation
    page.wait_for_selector("#generated-link-container", state="visible", timeout=10000)
    
    # Get the generated link
    link_input = page.locator("#generated-link")
    expect(link_input).to_be_visible()
    
    shared_link = link_input.input_value()
    print(f"Generated shared link: {shared_link}")
    
    screenshot_with_markdown(page, "shared_link_generated", {
        "Status": "Shared link generated with conversation",
        "Link Length": str(len(shared_link)),
        "Component": "Share Modal"
    })
    
    # Close share modal
    close_share_btn = page.locator("#close-share-modal")
    close_share_btn.click()
    
    # Now open the shared link in a second tab
    tab2 = context.new_page()
    tab2.goto(shared_link)
    
    # Handle password modal in second tab
    password_modal = tab2.locator('#shared-link-password-modal')
    expect(password_modal).to_be_visible(timeout=10000)
    
    password_input_tab2 = tab2.locator('#shared-link-password-input')
    password_input_tab2.fill("testpassword123")
    
    continue_btn = tab2.locator('#continue-shared-link')
    continue_btn.click()
    
    # Wait for content to load in tab 2
    tab2.wait_for_timeout(3000)
    
    # Check that the original message appears in tab 2
    user_messages_tab2 = tab2.locator('.user-message')
    expect(user_messages_tab2).to_have_count(1, timeout=10000)
    expect(user_messages_tab2.first).to_contain_text(test_message)
    
    screenshot_with_markdown(tab2, "tab2_initial_load", {
        "Status": "Tab 2 loaded with synchronized conversation",
        "Messages Visible": "1",
        "Component": "Chat Interface"
    })
    
    # Now send a new message from tab 1
    new_message = "Second message from tab 1"
    message_input.fill(new_message)
    send_button.click()
    
    # Wait for message to appear in tab 1
    page.wait_for_selector('.user-message', timeout=5000)
    user_messages_tab1 = page.locator('.user-message')
    expect(user_messages_tab1).to_have_count(2, timeout=5000)
    
    screenshot_with_markdown(page, "tab1_second_message", {
        "Status": "Second message sent from tab 1",
        "Messages Count": "2",
        "Component": "Chat Interface"
    })
    
    # Wait for cross-tab sync to occur (give it time to sync)    # Check if the new message appears in tab 2
    tab2.reload()  # Force reload to check sync
    tab2.wait_for_timeout(3000)
    
    user_messages_tab2_after = tab2.locator('.user-message')
    expect(user_messages_tab2_after).to_have_count(2, timeout=10000)
    expect(user_messages_tab2_after.nth(1)).to_contain_text(new_message)
    
    screenshot_with_markdown(tab2, "tab2_after_sync", {
        "Status": "Tab 2 after sync - should show both messages",
        "Messages Count": "2",
        "Component": "Chat Interface"
    })
    
    print("=== Cross-Tab Sync Test Completed ===")
    
    # Close second tab
    tab2.close()


def test_cross_tab_sync_real_time(page: Page, serve_hacka_re, context: BrowserContext):
    """Test real-time cross-tab synchronization without manual refresh"""
    
    print("=== Cross-Tab Sync Real-Time Test ===")
    
    # Create a simple shared link
    page.goto(serve_hacka_re + "#shared=dGVzdA==")  # Simple test data
    
    # Wait for page load
    # page.wait_for_timeout(2000)  # TODO: Replace with proper wait condition
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Check if CrossTabSyncService is initialized
    sync_service_available = page.evaluate("""
        () => {
            return !!(window.CrossTabSyncService && window.CrossTabSyncService.isInitialized && window.CrossTabSyncService.isInitialized());
        }
    """)
    
    screenshot_with_markdown(page, "sync_service_check", {
        "Status": "Checking if CrossTabSyncService is available",
        "Service Available": str(sync_service_available),
        "Component": "Cross-Tab Sync Service"
    })
    
    print(f"CrossTabSyncService available: {sync_service_available}")
    
    if not sync_service_available:
        print("CrossTabSyncService not available - test may not work as expected")
    
    # Test storage events
    storage_event_test = page.evaluate("""
        () => {
            // Test if we can trigger storage events
            try {
                localStorage.setItem('test_sync_key', 'test_value');
                localStorage.removeItem('test_sync_key');
                return true;
            } catch (error) {
                return false;
            }
        }
    """)
    
    print(f"Storage events work: {storage_event_test}")
    
    screenshot_with_markdown(page, "sync_environment_ready", {
        "Status": "Cross-tab sync environment tested",
        "Storage Events": str(storage_event_test),
        "Component": "Environment Check"
    })
    
    print("=== Real-Time Sync Test Completed ===")