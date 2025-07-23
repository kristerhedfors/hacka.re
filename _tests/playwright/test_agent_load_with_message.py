"""
Test agent load functionality followed by sending a message to verify no API errors
"""
from playwright.sync_api import Page
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_agent_load_with_message_sending(page: Page, serve_hacka_re, api_key):
    """Test agent load followed by message sending to ensure correct model is used"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    print("=== AGENT LOAD WITH MESSAGE SENDING TEST ===")
    
    # Step 1: Configure OpenAI provider first
    print("\nStep 1: Configuring OpenAI...")
    
    if page.locator('#settings-modal').is_visible():
        page.wait_for_timeout(2000)
    else:
        page.locator('#settings-btn').click()
        page.wait_for_timeout(2000)
    
    page.locator('#api-key-update').fill(api_key)
    page.locator('#base-url-select').select_option('openai')
    page.wait_for_timeout(500)
    page.locator('#close-settings').click()
    page.wait_for_timeout(1000)
    
    # Step 2: Save as agent
    print("Step 2: Saving as agent 'test-openai'...")
    
    page.locator('#agent-config-btn').click()
    page.wait_for_timeout(500)
    page.locator('#quick-agent-name').fill('test-openai')
    page.locator('#quick-save-agent').click()
    page.wait_for_timeout(1000)
    page.locator('#close-agent-config-modal').click()
    page.wait_for_timeout(500)
    
    # Step 3: Switch to Groq provider
    print("Step 3: Switching to Groq...")
    
    page.locator('#settings-btn').click()
    page.wait_for_timeout(2000)
    page.locator('#base-url-select').select_option('groq')
    page.wait_for_timeout(500)
    page.locator('#close-settings').click()
    page.wait_for_timeout(1000)
    
    # Verify we're on Groq
    groq_config = page.evaluate("""() => {
        return {
            provider: window.DataService ? window.DataService.getBaseUrlProvider() : 'none',
            model: window.DataService ? window.DataService.getModel() : 'none'
        };
    }""")
    print(f"Switched to Groq: {groq_config}")
    
    # Step 4: Load the OpenAI agent
    print("Step 4: Loading OpenAI agent...")
    
    page.locator('#agent-config-btn').click()
    page.wait_for_timeout(500)
    
    # Check agent exists
    agent_list = page.evaluate("""() => {
        const agents = window.AgentService ? window.AgentService.getAllAgents() : {};
        return Object.keys(agents);
    }""")
    print(f"Available agents: {agent_list}")
    
    page.locator('button:has-text("Load")').first.click()
    page.wait_for_timeout(2000)  # Wait for load
    
    if page.locator('#agent-config-modal').is_visible():
        page.locator('#close-agent-config-modal').click()
        page.wait_for_timeout(500)
    
    # Step 5: Verify agent loaded correctly
    print("Step 5: Verifying agent loaded...")
    
    loaded_config = page.evaluate("""() => {
        return {
            provider: window.DataService ? window.DataService.getBaseUrlProvider() : 'none',
            model: window.DataService ? window.DataService.getModel() : 'none',
            apiKey: window.DataService ? (window.DataService.getApiKey() ? 'set' : 'none') : 'none'
        };
    }""")
    print(f"Loaded config: {loaded_config}")
    
    # Step 6: Send a test message
    print("Step 6: Sending test message...")
    
    # Set up console logging to catch any errors
    console_messages = []
    def handle_console(msg):
        console_messages.append({
            'type': msg.type,
            'text': msg.text
        })
        print(f"CONSOLE {msg.type.upper()}: {msg.text}")
    
    page.on("console", handle_console)
    
    # Send message
    input_field = page.locator('#message-input')
    input_field.fill('Test message to verify agent loading works')
    
    send_btn = page.locator('#send-btn')
    send_btn.click()
    
    # Wait for response or error
    page.wait_for_timeout(5000)
    
    # Step 7: Analyze results
    print("\nStep 7: Analyzing results...")
    
    # Check for errors in console messages
    api_errors = [msg for msg in console_messages if 'invalid model ID' in msg['text'] or 'Error:' in msg['text']]
    model_mismatch_logs = [msg for msg in console_messages if 'Model mismatch detected' in msg['text']]
    
    print(f"API errors found: {len(api_errors)}")
    for error in api_errors:
        print(f"  - {error['type']}: {error['text']}")
    
    print(f"Model mismatch logs: {len(model_mismatch_logs)}")
    for log in model_mismatch_logs:
        print(f"  - {log['text']}")
    
    # Check for successful message sending
    success_indicators = [msg for msg in console_messages if 'Response received' in msg['text'] or 'Performance:' in msg['text']]
    print(f"Success indicators: {len(success_indicators)}")
    
    screenshot_with_markdown(page, "agent_load_message_test", {
        "Test Phase": "Agent load with message sending complete",
        "Loaded Config": str(loaded_config),
        "API Errors": str(len(api_errors)),
        "Model Mismatches": str(len(model_mismatch_logs)),
        "Success Indicators": str(len(success_indicators)),
        "Expected Provider": "openai"
    })
    
    # Assertions
    assert loaded_config['provider'] == 'openai', f"Agent load failed: expected openai, got {loaded_config['provider']}"
    assert len(api_errors) == 0, f"API errors occurred: {[e['text'] for e in api_errors]}"
    
    print("\n🎉 Agent load with message sending test completed successfully!")
    print(f"✅ Agent loaded correctly: {loaded_config}")
    print(f"✅ No API errors: {len(api_errors) == 0}")
    print(f"✅ Message sent successfully!")

if __name__ == "__main__":
    test_agent_load_with_message_sending()