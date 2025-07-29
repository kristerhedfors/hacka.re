"""
Debug cross-tab storage behavior for shared links.
This script helps identify why conversations aren't persisting between tabs.
"""

import time
import pytest
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown


def test_debug_cross_tab_storage(page: Page, serve_hacka_re):
    """Debug storage behavior across tabs"""
    
    # The specific shared link from the user with password 'asd'
    shared_link_url = f"{serve_hacka_re}#gpt=EEGWCBjnHy5OER+ulp2SVa0MxHnFBugLuYrrsmyN7l/42BVoZ2z5Am9Jwh/5ewqJkGJjljOaxDie8TCvM38gvgoOf5GxWAj0gfLrjzY9jCH27GLZrxVLzmtuokCmqIZ9EQVdpSDcUHcLQ5PoxihTWLlGAV9po/lq8wA+H5FqdeCRKdKnIXRX1RV3m0GhXupKHTNnGnCrw58+oaCm0MlUT6iWVK1GSMJbSzfnjrzRhqF7nk4OTwSwOL+upPwR3C+K0F0kh7wt0DELIA7Oz/Mylz5IC/W+ef+3n/NJqwFFiLUVn7EvWMvBTOJbABORe+RIoaDgGqWtqwTbM/OG3ckxENEHQmn3HKxV+7hCe31IrnXUAKRQ85uEWPwCAJib+wt1y6V/fsZRx8Mqg4WRhCP6DeU37B6SsMADv6s2JR5PjL2h1S0VEcuok4dG/AXwAyAuA/lBEucbrwFdy9iVvAnTCQ1ta2bQn2Q2TVcTAOyjoVaHRr5vWkQf+lTMfwW22FGvsL1oDQSSOXrJUZuDejtGEHToTULcwN7UgKVUY2t6krOjkfjT+tuPtLBJ0EfI//zce6pIaIM+xen5DQ=="
    
    print(f"Opening shared link: {shared_link_url}")
    page.goto(shared_link_url)
    
    # Handle password modal
    try:
        password_modal = page.locator('.modal.password-modal, #password-modal')
        expect(password_modal).to_be_visible(timeout=5000)
        
        password_input = page.locator('#early-password-input, #decrypt-password')
        password_input.fill('asd')
        
        submit_button = page.locator('#early-password-submit')
        submit_button.click()
        
        expect(password_modal).not_to_be_visible(timeout=5000)
        print("Password entered successfully")
    except:
        print("No password modal appeared")
    
    # Wait for initialization
    time.sleep(3)
    
    # Get initial storage state
    storage_info = page.evaluate("""
        () => {
            // Check localStorage keys
            const localKeys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                localKeys.push({
                    key: key,
                    hasValue: !!localStorage.getItem(key),
                    isEncrypted: localStorage.getItem(key) && localStorage.getItem(key).length > 50
                });
            }
            
            // Check current namespace
            const namespace = window.NamespaceService ? window.NamespaceService.getNamespace() : 'unknown';
            const namespaceId = window.NamespaceService ? window.NamespaceService.getNamespaceId() : 'unknown';
            
            // Check chat history specifically
            let chatHistory = null;
            let chatHistoryError = null;
            try {
                chatHistory = window.StorageService ? window.StorageService.loadChatHistory() : null;
            } catch (e) {
                chatHistoryError = e.message;
            }
            
            return {
                namespace: namespace,
                namespaceId: namespaceId,
                localStorageKeys: localKeys,
                chatHistory: chatHistory,
                chatHistoryError: chatHistoryError,
                chatHistoryLength: chatHistory ? chatHistory.length : 0
            };
        }
    """)
    
    print("Initial storage state:")
    print(f"- Namespace: {storage_info['namespace']}")
    print(f"- Namespace ID: {storage_info['namespaceId']}")
    print(f"- Chat History Length: {storage_info['chatHistoryLength']}")
    print(f"- Chat History Error: {storage_info['chatHistoryError']}")
    print(f"- localStorage keys: {len(storage_info['localStorageKeys'])}")
    for key_info in storage_info['localStorageKeys']:
        print(f"  - {key_info['key']}: {'encrypted' if key_info['isEncrypted'] else 'plain'}")
    
    screenshot_with_markdown(page, "initial_storage_state", {
        "Status": "Initial storage state captured",
        "Namespace": storage_info['namespace'],
        "Chat History Length": str(storage_info['chatHistoryLength']),
        "LocalStorage Keys": str(len(storage_info['localStorageKeys']))
    })
    
    # Add a test message to conversation
    print("Adding test message to conversation...")
    
    # Add user message directly to storage (simulate what should happen after sending)
    test_message_result = page.evaluate("""
        () => {
            try {
                // Get current messages
                const currentHistory = window.StorageService.loadChatHistory() || [];
                console.log('Current history before adding test message:', currentHistory);
                
                // Add a test user message
                const testMessage = {
                    role: 'user',
                    content: 'Test message from tab 1',
                    timestamp: new Date().toISOString()
                };
                
                const newHistory = [...currentHistory, testMessage];
                console.log('New history to save:', newHistory);
                
                // Save the updated history
                window.StorageService.saveChatHistory(newHistory);
                console.log('Saved new history to storage');
                
                // Verify it was saved
                const verificationHistory = window.StorageService.loadChatHistory();
                console.log('Verification - loaded history after save:', verificationHistory);
                
                return {
                    success: true,
                    beforeLength: currentHistory.length,
                    afterLength: verificationHistory ? verificationHistory.length : 0,
                    testMessageAdded: verificationHistory && verificationHistory.some(msg => msg.content === 'Test message from tab 1')
                };
            } catch (error) {
                console.error('Error adding test message:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        }
    """)
    
    print(f"Test message result: {test_message_result}")
    
    screenshot_with_markdown(page, "after_adding_test_message", {
        "Status": "After adding test message",
        "Success": str(test_message_result.get('success', False)),
        "Before Length": str(test_message_result.get('beforeLength', 0)),
        "After Length": str(test_message_result.get('afterLength', 0)),
        "Test Message Added": str(test_message_result.get('testMessageAdded', False))
    })
    
    # Now open a second tab to see if the message persists
    print("Opening second tab...")
    context = page.context
    second_page = context.new_page()
    
    # Navigate to same shared link
    second_page.goto(shared_link_url)
    
    # Handle password modal in second tab
    try:
        second_password_modal = second_page.locator('.modal.password-modal, #password-modal')
        expect(second_password_modal).to_be_visible(timeout=2000)
        
        second_password_input = second_page.locator('#early-password-input, #decrypt-password')
        second_password_input.fill('asd')
        
        second_submit_button = second_page.locator('#early-password-submit')
        second_submit_button.click()
        
        expect(second_password_modal).not_to_be_visible(timeout=5000)
        print("Second tab: Password entered successfully")
    except:
        print("Second tab: No password modal appeared")
    
    # Wait for second tab initialization
    time.sleep(3)
    
    # Check storage state in second tab
    second_storage_info = second_page.evaluate("""
        () => {
            // Check current namespace
            const namespace = window.NamespaceService ? window.NamespaceService.getNamespace() : 'unknown';
            const namespaceId = window.NamespaceService ? window.NamespaceService.getNamespaceId() : 'unknown';
            
            // Check chat history specifically
            let chatHistory = null;
            let chatHistoryError = null;
            try {
                chatHistory = window.StorageService ? window.StorageService.loadChatHistory() : null;
            } catch (e) {
                chatHistoryError = e.message;
            }
            
            // Check if test message exists
            const hasTestMessage = chatHistory && chatHistory.some(msg => msg.content === 'Test message from tab 1');
            
            // Check message breakdown by role
            const messageBreakdown = {};
            if (chatHistory) {
                chatHistory.forEach(msg => {
                    messageBreakdown[msg.role] = (messageBreakdown[msg.role] || 0) + 1;
                });
            }
            
            return {
                namespace: namespace,
                namespaceId: namespaceId,
                chatHistory: chatHistory,
                chatHistoryError: chatHistoryError,
                chatHistoryLength: chatHistory ? chatHistory.length : 0,
                hasTestMessage: hasTestMessage,
                messageBreakdown: messageBreakdown
            };
        }
    """)
    
    print("Second tab storage state:")
    print(f"- Namespace: {second_storage_info['namespace']}")
    print(f"- Namespace ID: {second_storage_info['namespaceId']}")
    print(f"- Chat History Length: {second_storage_info['chatHistoryLength']}")
    print(f"- Chat History Error: {second_storage_info['chatHistoryError']}")
    print(f"- Has Test Message: {second_storage_info['hasTestMessage']}")
    print(f"- Message Breakdown: {second_storage_info['messageBreakdown']}")
    
    screenshot_with_markdown(second_page, "second_tab_storage_state", {
        "Status": "Second tab storage state captured",
        "Namespace": second_storage_info['namespace'],
        "Chat History Length": str(second_storage_info['chatHistoryLength']),
        "Has Test Message": str(second_storage_info['hasTestMessage']),
        "Message Breakdown": str(second_storage_info['messageBreakdown'])
    })
    
    # Clean up
    second_page.close()
    
    # Final assertions to understand the issue
    print("\\n=== ANALYSIS ===")
    print(f"First tab namespace: {storage_info['namespaceId']}")
    print(f"Second tab namespace: {second_storage_info['namespaceId']}")
    print(f"Namespaces match: {storage_info['namespaceId'] == second_storage_info['namespaceId']}")
    print(f"Test message persisted: {second_storage_info['hasTestMessage']}")
    
    if storage_info['namespaceId'] == second_storage_info['namespaceId']:
        if second_storage_info['hasTestMessage']:
            print("✅ PASS: Conversation persists correctly across tabs")
        else:
            print("❌ FAIL: Same namespace but conversation didn't persist")
            print(f"First tab had {storage_info['chatHistoryLength']} messages")
            print(f"Second tab had {second_storage_info['chatHistoryLength']} messages")
    else:
        print("❌ FAIL: Tabs are using different namespaces")


if __name__ == "__main__":
    print("Run this test with: python -m pytest debug_cross_tab_storage.py -v -s")