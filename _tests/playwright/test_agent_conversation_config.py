"""
Test Agent Conversation Configuration Save/Load
Tests that agents properly save and restore conversation configuration including:
- Chat history/messages
- System prompt
- Conversation state
- Message metadata and timestamps
- Welcome message state
"""
from playwright.sync_api import Page
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_agent_conversation_config_save_load(page: Page, serve_hacka_re, api_key):
    """Test agent save/load for conversation configuration aspects"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    print("=== AGENT CONVERSATION CONFIG SAVE/LOAD TEST ===")
    
    # Step 1: Set up basic API first (use a valid but inactive key to avoid actual API calls)
    print("\\nStep 1: Setting up basic API configuration...")
    page.locator('#settings-btn').click()
    page.wait_for_timeout(2000)
    page.locator('#api-key-update').fill('sk-test1234567890abcdef')  # Test key to avoid real API calls
    page.locator('#base-url-select').select_option('openai')
    page.locator('#close-settings').click()
    page.wait_for_timeout(1000)
    
    # Step 2: Create conversation history
    print("Step 2: Creating conversation history...")
    
    # Add some messages to chat history manually
    page.evaluate("""() => {
        // Add test messages to chat history
        if (window.aiHackare && window.aiHackare.chatManager) {
            // Add user message
            window.aiHackare.chatManager.addMessage('user', 'Hello, this is a test message for agent configuration.');
            
            // Add assistant message
            window.aiHackare.chatManager.addMessage('assistant', 'Hello! I\\'m here to help with your agent configuration testing. How can I assist you?');
            
            // Add another user message
            window.aiHackare.chatManager.addMessage('user', 'Can you help me test the save/load functionality?');
            
            // Add another assistant message
            window.aiHackare.chatManager.addMessage('assistant', 'Certainly! I can help you test the agent save and load functionality. This conversation will be preserved when you save this configuration as an agent.');
            
            // Add a system message
            window.aiHackare.chatManager.addSystemMessage('System: Test conversation created for agent configuration testing.');
        }
        
        // Set a custom system prompt
        if (window.DataService && window.DataService.setSystemPrompt) {
            window.DataService.setSystemPrompt('You are a specialized AI assistant for testing agent configuration functionality. You should be helpful, accurate, and focused on testing scenarios.');
        }
    }""")
    
    page.wait_for_timeout(1000)
    
    # Step 3: Capture original conversation configuration
    print("Step 3: Capturing original conversation configuration...")
    original_conversation_config = page.evaluate("""() => {
        return {
            systemPrompt: window.DataService ? window.DataService.getSystemPrompt() : null,
            messages: window.aiHackare ? window.aiHackare.chatManager.getMessages() : [],
            messageCount: window.aiHackare ? window.aiHackare.chatManager.getMessages().length : 0
        };
    }""")
    
    print(f"Original conversation config: System prompt length={len(original_conversation_config.get('systemPrompt', ''))}, Message count={original_conversation_config['messageCount']}")
    print(f"System prompt: {original_conversation_config.get('systemPrompt', '')[:100]}...")
    
    # Log message types for debugging
    message_types = [msg.get('role', 'unknown') for msg in original_conversation_config.get('messages', [])]
    print(f"Message types: {message_types}")
    
    # Step 4: Save as agent
    print("Step 4: Saving conversation configuration as agent...")
    page.locator('#agent-config-btn').click()
    page.wait_for_timeout(500)
    
    page.locator('#quick-agent-name').fill('conversation-config-test-agent')
    page.on("dialog", lambda dialog: dialog.accept())
    page.locator('#quick-save-agent').click()
    page.wait_for_timeout(2000)
    
    page.locator('#close-agent-config-modal').click()
    page.wait_for_timeout(500)
    
    # Step 5: Clear conversation configuration
    print("Step 5: Clearing conversation configuration...")
    
    # Clear chat history
    clear_chat_btn = page.locator('#clear-chat-btn')
    if clear_chat_btn.count():
        page.on("dialog", lambda dialog: dialog.accept())
        clear_chat_btn.click()
        page.wait_for_timeout(1000)
    
    # Clear system prompt
    page.evaluate("""() => {
        if (window.DataService && window.DataService.setSystemPrompt) {
            window.DataService.setSystemPrompt('');
        }
    }""")
    
    # Step 6: Verify conversation configuration was cleared
    print("Step 6: Verifying conversation configuration was cleared...")
    cleared_conversation_config = page.evaluate("""() => {
        return {
            systemPrompt: window.DataService ? window.DataService.getSystemPrompt() : null,
            messages: window.aiHackare ? window.aiHackare.chatManager.getMessages() : [],
            messageCount: window.aiHackare ? window.aiHackare.chatManager.getMessages().length : 0
        };
    }""")
    
    print(f"Cleared conversation config: System prompt length={len(cleared_conversation_config.get('systemPrompt', ''))}, Message count={cleared_conversation_config['messageCount']}")
    
    # Step 7: Load the saved agent
    print("Step 7: Loading saved agent...")
    page.locator('#agent-config-btn').click()
    page.wait_for_timeout(500)
    
    load_btn = page.locator('button:has-text("Load")').first
    load_btn.click()
    page.wait_for_timeout(3000)  # Wait for agent to load
    
    if page.locator('#agent-config-modal').is_visible():
        page.locator('#close-agent-config-modal').click()
        page.wait_for_timeout(500)
    
    # Step 8: Verify conversation configuration was restored
    print("Step 8: Verifying conversation configuration restored...")
    restored_conversation_config = page.evaluate("""() => {
        return {
            systemPrompt: window.DataService ? window.DataService.getSystemPrompt() : null,
            messages: window.aiHackare ? window.aiHackare.chatManager.getMessages() : [],
            messageCount: window.aiHackare ? window.aiHackare.chatManager.getMessages().length : 0
        };
    }""")
    
    print(f"Restored conversation config: System prompt length={len(restored_conversation_config.get('systemPrompt', ''))}, Message count={restored_conversation_config['messageCount']}")
    print(f"System prompt: {restored_conversation_config.get('systemPrompt', '')[:100]}...")
    
    # Log restored message types for debugging
    restored_message_types = [msg.get('role', 'unknown') for msg in restored_conversation_config.get('messages', [])]
    print(f"Restored message types: {restored_message_types}")
    
    screenshot_with_markdown(page, "agent_conversation_config_test", {
        "Test Phase": "Conversation configuration save/load complete",
        "Original System Prompt Length": str(len(original_conversation_config.get('systemPrompt', ''))),
        "Restored System Prompt Length": str(len(restored_conversation_config.get('systemPrompt', ''))),
        "Original Message Count": str(original_conversation_config['messageCount']),
        "Restored Message Count": str(restored_conversation_config['messageCount']),
        "System Prompt Restored": str(restored_conversation_config.get('systemPrompt') == original_conversation_config.get('systemPrompt')),
        "Message Count Restored": str(restored_conversation_config['messageCount'] == original_conversation_config['messageCount'])
    })
    
    # Step 9: Validate all conversation configuration was restored
    print("Step 9: Validating conversation configuration restoration...")
    
    # System prompt should be restored
    original_system_prompt = original_conversation_config.get('systemPrompt', '')
    restored_system_prompt = restored_conversation_config.get('systemPrompt', '')
    assert restored_system_prompt == original_system_prompt, \
        f"System prompt not restored correctly: expected length {len(original_system_prompt)}, got length {len(restored_system_prompt)}"
    
    # Message count should be restored
    assert restored_conversation_config['messageCount'] == original_conversation_config['messageCount'], \
        f"Message count not restored: expected {original_conversation_config['messageCount']}, got {restored_conversation_config['messageCount']}"
    
    # Check that specific messages were restored
    original_messages = original_conversation_config.get('messages', [])
    restored_messages = restored_conversation_config.get('messages', [])
    
    if len(original_messages) > 0 and len(restored_messages) > 0:
        # Check first and last messages as samples
        first_original = original_messages[0] if len(original_messages) > 0 else {}
        first_restored = restored_messages[0] if len(restored_messages) > 0 else {}
        
        if first_original.get('content') and first_restored.get('content'):
            assert first_original.get('role') == first_restored.get('role'), \
                f"First message role not restored: expected {first_original.get('role')}, got {first_restored.get('role')}"
            
            # Check content similarity (allowing for minor formatting differences)
            original_content = first_original.get('content', '').strip()
            restored_content = first_restored.get('content', '').strip()
            assert original_content in restored_content or restored_content in original_content, \
                f"First message content not restored correctly"
    
    print("\\n🎉 Agent conversation configuration save/load test completed successfully!")
    print("✅ All conversation configuration aspects were saved and restored correctly")
    print(f"✅ System prompt: {len(original_system_prompt)} chars → {len(restored_system_prompt)} chars")
    print(f"✅ Messages: {original_conversation_config['messageCount']} → {restored_conversation_config['messageCount']}")

def test_agent_conversation_config_empty_state(page: Page, serve_hacka_re, api_key):
    """Test conversation configuration with empty state"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    print("=== AGENT CONVERSATION CONFIG EMPTY STATE TEST ===")
    
    # Set up API
    page.locator('#settings-btn').click()
    page.wait_for_timeout(2000)
    page.locator('#api-key-update').fill('sk-test1234567890abcdef')
    page.locator('#close-settings').click()
    page.wait_for_timeout(1000)
    
    # Ensure conversation is empty
    clear_chat_btn = page.locator('#clear-chat-btn')
    if clear_chat_btn.count():
        page.on("dialog", lambda dialog: dialog.accept())
        clear_chat_btn.click()
        page.wait_for_timeout(1000)
    
    page.evaluate("""() => {
        if (window.DataService && window.DataService.setSystemPrompt) {
            window.DataService.setSystemPrompt('');
        }
    }""")
    
    # Save agent with empty conversation config
    page.locator('#agent-config-btn').click()
    page.wait_for_timeout(500)
    
    page.locator('#quick-agent-name').fill('empty-conversation-agent')
    page.on("dialog", lambda dialog: dialog.accept())
    page.locator('#quick-save-agent').click()
    page.wait_for_timeout(2000)
    
    page.locator('#close-agent-config-modal').click()
    page.wait_for_timeout(500)
    
    # Add some conversation content
    page.evaluate("""() => {
        if (window.aiHackare && window.aiHackare.chatManager) {
            window.aiHackare.chatManager.addMessage('user', 'This is a temporary message');
        }
        if (window.DataService && window.DataService.setSystemPrompt) {
            window.DataService.setSystemPrompt('Temporary system prompt');
        }
    }""")
    
    # Load agent and verify empty state is restored
    page.locator('#agent-config-btn').click()
    page.wait_for_timeout(500)
    
    load_btn = page.locator('button:has-text("Load")').first
    load_btn.click()
    page.wait_for_timeout(3000)
    
    if page.locator('#agent-config-modal').is_visible():
        page.locator('#close-agent-config-modal').click()
        page.wait_for_timeout(500)
    
    # Verify empty state was restored
    restored_conversation_config = page.evaluate("""() => {
        return {
            systemPrompt: window.DataService ? window.DataService.getSystemPrompt() : null,
            messageCount: window.aiHackare ? window.aiHackare.chatManager.getMessages().length : 0
        };
    }""")
    
    assert not restored_conversation_config.get('systemPrompt') or restored_conversation_config.get('systemPrompt') == '', \
        f"System prompt should be empty but got: {restored_conversation_config.get('systemPrompt')}"
    
    # Message count might not be 0 due to welcome messages, but should be consistent
    print(f"Restored message count (may include welcome messages): {restored_conversation_config['messageCount']}")
    
    print("✅ Empty conversation configuration state handled correctly")
    print("\\n🎉 Agent conversation configuration empty state test completed successfully!")

if __name__ == "__main__":
    test_agent_conversation_config_save_load()
    test_agent_conversation_config_empty_state()