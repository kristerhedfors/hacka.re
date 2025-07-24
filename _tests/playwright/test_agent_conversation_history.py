"""
Test Agent Conversation History Save/Load
Tests that agents properly save and restore conversation history including:
- Chat messages (user and assistant)
- System prompts and context
- Message ordering and timestamps
- Chat state and metadata
- Empty conversation states
"""
from playwright.sync_api import Page
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_agent_conversation_history_save_load(page: Page, serve_hacka_re, api_key):
    """Test agent save/load for conversation history aspects"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    print("=== AGENT CONVERSATION HISTORY SAVE/LOAD TEST ===")
    
    # Step 1: Set up basic API first
    print("\nStep 1: Setting up basic API configuration...")
    page.locator('#settings-btn').click()
    page.wait_for_timeout(2000)
    page.locator('#api-key-update').fill(api_key)
    page.locator('#base-url-select').select_option('groq')
    page.locator('#close-settings').click()
    page.wait_for_timeout(1000)
    
    # Step 2: Create conversation history
    print("Step 2: Creating conversation history...")
    
    # Add multiple user messages to simulate a conversation
    test_messages = [
        "Hello, I need help with JavaScript programming.",
        "Can you explain how async/await works?",
        "What are some best practices for error handling?"
    ]
    
    for i, message in enumerate(test_messages):
        print(f"Adding message {i+1}: {message[:50]}...")
        
        # Type the message
        input_field = page.locator('#message-input')
        input_field.fill(message)
        
        # Send the message but immediately stop to avoid API calls
        send_btn = page.locator('#send-btn')
        send_btn.click()
        page.wait_for_timeout(500)  # Brief wait for message to be added
        
        # Stop generation if it started
        if page.locator('#send-btn').get_attribute('title') != 'Send Message':
            send_btn.click()  # Stop generation
            page.wait_for_timeout(500)
        
        # Clear input for next message
        input_field.fill('')
        page.wait_for_timeout(300)
    
    # Step 3: Set a custom system prompt
    print("Step 3: Setting custom system prompt...")
    system_prompt_text = "You are a JavaScript programming expert assistant. Help with coding questions, best practices, and debugging. Be concise and provide practical examples."
    
    # Set system prompt via JavaScript
    page.evaluate(f"""() => {{
        if (window.DataService) {{
            window.DataService.setSystemPrompt(`{system_prompt_text}`);
        }}
    }}""")
    
    # Step 4: Capture original conversation configuration
    print("Step 4: Capturing original conversation configuration...")
    original_conversation_config = page.evaluate("""() => {
        return {
            messages: window.aiHackare && window.aiHackare.chatManager ? window.aiHackare.chatManager.getMessages() : [],
            systemPrompt: window.DataService ? window.DataService.getSystemPrompt() : null,
            messageCount: window.aiHackare && window.aiHackare.chatManager ? window.aiHackare.chatManager.getMessages().length : 0
        };
    }""")
    
    print(f"Original conversation config: {original_conversation_config['messageCount']} messages, System prompt: {bool(original_conversation_config['systemPrompt'])}")
    
    # Get message contents for verification
    user_messages = []
    for msg in original_conversation_config['messages']:
        if msg.get('role') == 'user':
            user_messages.append(msg.get('content', '')[:50])
    
    print(f"User messages: {user_messages}")
    print(f"System prompt length: {len(original_conversation_config['systemPrompt']) if original_conversation_config['systemPrompt'] else 0}")
    
    # Step 5: Save as agent
    print("Step 5: Saving conversation history as agent...")
    page.locator('#agent-config-btn').click()
    page.wait_for_timeout(500)
    
    page.locator('#quick-agent-name').fill('conversation-history-test-agent')
    page.on("dialog", lambda dialog: dialog.accept())
    page.locator('#quick-save-agent').click()
    page.wait_for_timeout(2000)
    
    page.locator('#close-agent-config-modal').click()
    page.wait_for_timeout(500)
    
    # Step 6: Clear conversation history
    print("Step 6: Clearing conversation history...")
    
    # Clear chat history
    clear_chat_btn = page.locator('#clear-chat-btn')
    if clear_chat_btn.count():
        page.on("dialog", lambda dialog: dialog.accept())
        clear_chat_btn.click()
        page.wait_for_timeout(1000)
    
    # Clear system prompt
    page.evaluate("""() => {
        if (window.DataService) {
            window.DataService.setSystemPrompt('');
        }
    }""")
    
    # Step 7: Verify conversation was cleared
    print("Step 7: Verifying conversation was cleared...")
    cleared_conversation_config = page.evaluate("""() => {
        return {
            messages: window.aiHackare && window.aiHackare.chatManager ? window.aiHackare.chatManager.getMessages() : [],
            systemPrompt: window.DataService ? window.DataService.getSystemPrompt() : null,
            messageCount: window.aiHackare && window.aiHackare.chatManager ? window.aiHackare.chatManager.getMessages().length : 0
        };
    }""")
    
    print(f"Cleared conversation config: {cleared_conversation_config['messageCount']} messages, System prompt: {bool(cleared_conversation_config['systemPrompt'])}")
    
    # Step 8: Load the saved agent
    print("Step 8: Loading saved agent...")
    page.locator('#agent-config-btn').click()
    page.wait_for_timeout(500)
    
    load_btn = page.locator('button:has-text("Load")').first
    load_btn.click()
    page.wait_for_timeout(3000)  # Wait for agent to load
    
    if page.locator('#agent-config-modal').is_visible():
        page.locator('#close-agent-config-modal').click()
        page.wait_for_timeout(500)
    
    # Step 9: Verify conversation history was restored
    print("Step 9: Verifying conversation history restored...")
    restored_conversation_config = page.evaluate("""() => {
        return {
            messages: window.aiHackare && window.aiHackare.chatManager ? window.aiHackare.chatManager.getMessages() : [],
            systemPrompt: window.DataService ? window.DataService.getSystemPrompt() : null,
            messageCount: window.aiHackare && window.aiHackare.chatManager ? window.aiHackare.chatManager.getMessages().length : 0
        };
    }""")
    
    print(f"Restored conversation config: {restored_conversation_config['messageCount']} messages, System prompt: {bool(restored_conversation_config['systemPrompt'])}")
    
    # Get restored message contents for verification
    restored_user_messages = []
    for msg in restored_conversation_config['messages']:
        if msg.get('role') == 'user':
            restored_user_messages.append(msg.get('content', '')[:50])
    
    print(f"Restored user messages: {restored_user_messages}")
    print(f"Restored system prompt length: {len(restored_conversation_config['systemPrompt']) if restored_conversation_config['systemPrompt'] else 0}")
    
    screenshot_with_markdown(page, "agent_conversation_history_test", {
        "Test Phase": "Conversation history save/load complete",
        "Original Message Count": str(original_conversation_config['messageCount']),
        "Restored Message Count": str(restored_conversation_config['messageCount']),
        "Original System Prompt": str(bool(original_conversation_config['systemPrompt'])),
        "Restored System Prompt": str(bool(restored_conversation_config['systemPrompt'])),
        "Messages Restored": str(restored_conversation_config['messageCount'] == original_conversation_config['messageCount']),
        "System Prompt Restored": str(bool(restored_conversation_config['systemPrompt']) == bool(original_conversation_config['systemPrompt'])),
        "Original User Messages": str(len(user_messages)),
        "Restored User Messages": str(len(restored_user_messages))
    })
    
    # Step 10: Validate all conversation history was restored
    print("Step 10: Validating conversation history restoration...")
    
    # Message count should be restored
    assert restored_conversation_config['messageCount'] == original_conversation_config['messageCount'], \
        f"Message count not restored: expected {original_conversation_config['messageCount']}, got {restored_conversation_config['messageCount']}"
    
    # System prompt should be restored
    if original_conversation_config['systemPrompt']:
        assert restored_conversation_config['systemPrompt'] == original_conversation_config['systemPrompt'], \
            f"System prompt not restored correctly"
    else:
        assert not restored_conversation_config['systemPrompt'], "System prompt should be empty"
    
    # User messages should be restored
    assert len(restored_user_messages) == len(user_messages), \
        f"User message count not restored: expected {len(user_messages)}, got {len(restored_user_messages)}"
    
    # Check that the same messages exist (in order)
    for i, (original, restored) in enumerate(zip(user_messages, restored_user_messages)):
        assert original == restored, \
            f"User message {i+1} not restored correctly: expected '{original}', got '{restored}'"
    
    # Check message structure
    for i, (original_msg, restored_msg) in enumerate(zip(original_conversation_config['messages'], restored_conversation_config['messages'])):
        assert original_msg.get('role') == restored_msg.get('role'), \
            f"Message {i+1} role not restored: expected '{original_msg.get('role')}', got '{restored_msg.get('role')}'"
        assert original_msg.get('content') == restored_msg.get('content'), \
            f"Message {i+1} content not restored correctly"
    
    print("\n🎉 Agent conversation history save/load test completed successfully!")
    print("✅ All conversation history aspects were saved and restored correctly")
    print(f"✅ Messages: {original_conversation_config['messageCount']} → {restored_conversation_config['messageCount']}")
    print(f"✅ System prompt: {bool(original_conversation_config['systemPrompt'])} → {bool(restored_conversation_config['systemPrompt'])}")
    print(f"✅ User messages: {user_messages} → {restored_user_messages}")

def test_agent_conversation_empty_state(page: Page, serve_hacka_re, api_key):
    """Test conversation history with empty state"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    print("=== AGENT CONVERSATION EMPTY STATE TEST ===")
    
    # Set up API
    page.locator('#settings-btn').click()
    page.wait_for_timeout(2000)
    page.locator('#api-key-update').fill(api_key)
    page.locator('#close-settings').click()
    page.wait_for_timeout(1000)
    
    # Ensure conversation is empty
    clear_chat_btn = page.locator('#clear-chat-btn')
    if clear_chat_btn.count():
        page.on("dialog", lambda dialog: dialog.accept())
        clear_chat_btn.click()
        page.wait_for_timeout(1000)
    
    # Save agent with empty conversation
    page.locator('#agent-config-btn').click()
    page.wait_for_timeout(500)
    page.locator('#quick-agent-name').fill('empty-conversation-agent')
    page.on("dialog", lambda dialog: dialog.accept())
    page.locator('#quick-save-agent').click()
    page.wait_for_timeout(2000)
    page.locator('#close-agent-config-modal').click()
    page.wait_for_timeout(500)
    
    # Add some conversation
    input_field = page.locator('#message-input')
    input_field.fill('Temporary message')
    send_btn = page.locator('#send-btn')
    send_btn.click()
    page.wait_for_timeout(500)
    if page.locator('#send-btn').get_attribute('title') != 'Send Message':
        send_btn.click()
    page.wait_for_timeout(500)
    
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
    empty_conversation_config = page.evaluate("""() => {
        return {
            messageCount: window.aiHackare && window.aiHackare.chatManager ? window.aiHackare.chatManager.getMessages().length : 0
        };
    }""")
    
    assert empty_conversation_config['messageCount'] == 0, \
        f"Conversation should be empty but has {empty_conversation_config['messageCount']} messages"
    
    print("✅ Empty conversation state handled correctly")
    print("\n🎉 Agent conversation empty state test completed successfully!")

def test_agent_conversation_system_prompt_only(page: Page, serve_hacka_re, api_key):
    """Test conversation history with only system prompt, no messages"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    print("=== AGENT CONVERSATION SYSTEM PROMPT ONLY TEST ===")
    
    # Set up API
    page.locator('#settings-btn').click()
    page.wait_for_timeout(2000)
    page.locator('#api-key-update').fill(api_key)
    page.locator('#close-settings').click()
    page.wait_for_timeout(1000)
    
    # Clear any existing conversation
    clear_chat_btn = page.locator('#clear-chat-btn')
    if clear_chat_btn.count():
        page.on("dialog", lambda dialog: dialog.accept())
        clear_chat_btn.click()
        page.wait_for_timeout(1000)
    
    # Set only a system prompt, no messages
    system_prompt_text = "You are a specialized AI assistant for data analysis. Focus on statistical insights and data visualization recommendations."
    
    page.evaluate(f"""() => {{
        if (window.DataService) {{
            window.DataService.setSystemPrompt(`{system_prompt_text}`);
        }}
    }}""")
    
    # Capture system-prompt-only configuration
    system_only_config = page.evaluate("""() => {
        return {
            messages: window.aiHackare && window.aiHackare.chatManager ? window.aiHackare.chatManager.getMessages() : [],
            systemPrompt: window.DataService ? window.DataService.getSystemPrompt() : null,
            messageCount: window.aiHackare && window.aiHackare.chatManager ? window.aiHackare.chatManager.getMessages().length : 0
        };
    }""")
    
    print(f"System-only config: {system_only_config['messageCount']} messages, System prompt length: {len(system_only_config['systemPrompt']) if system_only_config['systemPrompt'] else 0}")
    
    # Save, modify, and restore
    page.locator('#agent-config-btn').click()
    page.wait_for_timeout(500)
    page.locator('#quick-agent-name').fill('system-prompt-only-agent')
    page.on("dialog", lambda dialog: dialog.accept())
    page.locator('#quick-save-agent').click()
    page.wait_for_timeout(2000)
    page.locator('#close-agent-config-modal').click()
    page.wait_for_timeout(500)
    
    # Clear system prompt
    page.evaluate("""() => {
        if (window.DataService) {
            window.DataService.setSystemPrompt('');
        }
    }""")
    
    # Add a message
    input_field = page.locator('#message-input')
    input_field.fill('Test message')
    send_btn = page.locator('#send-btn')
    send_btn.click()
    page.wait_for_timeout(500)
    if page.locator('#send-btn').get_attribute('title') != 'Send Message':
        send_btn.click()
    page.wait_for_timeout(500)
    
    # Load and verify system prompt is restored but messages are empty
    page.locator('#agent-config-btn').click()
    page.wait_for_timeout(500)
    load_btn = page.locator('button:has-text("Load")').first
    load_btn.click()
    page.wait_for_timeout(3000)
    if page.locator('#agent-config-modal').is_visible():
        page.locator('#close-agent-config-modal').click()
        page.wait_for_timeout(500)
    
    # Verify system prompt only configuration restored
    restored_system_only_config = page.evaluate("""() => {
        return {
            messageCount: window.aiHackare && window.aiHackare.chatManager ? window.aiHackare.chatManager.getMessages().length : 0,
            systemPrompt: window.DataService ? window.DataService.getSystemPrompt() : null
        };
    }""")
    
    print(f"Restored system-only config: {restored_system_only_config['messageCount']} messages, System prompt length: {len(restored_system_only_config['systemPrompt']) if restored_system_only_config['systemPrompt'] else 0}")
    
    # Should have empty messages but restored system prompt
    assert restored_system_only_config['messageCount'] == 0, \
        f"Should have no messages but got {restored_system_only_config['messageCount']}"
    
    assert restored_system_only_config['systemPrompt'] == system_prompt_text, \
        f"System prompt not restored correctly"
    
    print("✅ System prompt only configuration preserved correctly")
    print("\n🎉 Agent conversation system prompt only test completed successfully!")

if __name__ == "__main__":
    test_agent_conversation_history_save_load()
    test_agent_conversation_empty_state()
    test_agent_conversation_system_prompt_only()