"""
Debug test for AgentContextManager to see console logs
"""

import pytest
from playwright.sync_api import Page, expect
import time
import json

def test_agent_context_manager_debug(page: Page):
    """Test AgentContextManager debugging with console capture"""
    
    # Capture all console messages
    console_messages = []
    def handle_console(msg):
        message = f"[{msg.type.upper()}] {msg.text}"
        console_messages.append(message)
        print(f"CONSOLE: {message}")
    
    page.on('console', handle_console)
    
    # Navigate to the main page
    page.goto('http://localhost:8000')
    
    # Wait for scripts to load
    time.sleep(3)
    
    # Check if AgentContextManager exists
    has_context_manager = page.evaluate('() => typeof window.AgentContextManager !== "undefined"')
    print(f"AgentContextManager exists: {has_context_manager}")
    
    # Check if AgentService exists
    has_agent_service = page.evaluate('() => typeof window.AgentService !== "undefined"')
    print(f"AgentService exists: {has_agent_service}")
    
    if not has_context_manager:
        print("❌ AgentContextManager not loaded - checking for errors...")
        for msg in console_messages:
            if 'error' in msg.lower() or 'failed' in msg.lower():
                print(f"ERROR: {msg}")
        return
    
    if not has_agent_service:
        print("❌ AgentService not loaded - checking for errors...")
        for msg in console_messages:
            if 'error' in msg.lower() or 'failed' in msg.lower():
                print(f"ERROR: {msg}")
        return
    
    # Create a test agent configuration
    test_config = {
        'llm': {
            'apiKey': 'test-key-debug',
            'model': 'test-model-debug',
            'provider': 'test-provider-debug'
        },
        'prompts': {
            'selectedIds': ['test-prompt-debug']
        }
    }
    
    # Save the test agent
    print("Creating test agent...")
    save_result = page.evaluate(f'''
        () => {{
            const config = {json.dumps(test_config)};
            return window.AgentService.saveAgent('debug_test_agent', config);
        }}
    ''')
    print(f"Agent save result: {save_result}")
    
    if not save_result:
        print("❌ Failed to save test agent")
        return
    
    # Clear previous console messages to focus on the test
    console_messages.clear()
    
    # Try applyAgentFast
    print("🔥 Testing applyAgentFast...")
    apply_result = page.evaluate('''
        async () => {
            try {
                console.log('🔥 DEBUG: About to call applyAgentFast...');
                const result = await window.AgentService.applyAgentFast('debug_test_agent', { 
                    silent: false,
                    differential: false 
                });
                console.log('🔥 DEBUG: applyAgentFast returned:', result);
                return result;
            } catch (error) {
                console.log('🔥 DEBUG: applyAgentFast error:', error.message);
                return false;
            }
        }
    ''')
    
    print(f"ApplyAgentFast result: {apply_result}")
    
    # Wait a bit more for any async operations
    time.sleep(2)
    
    # Test direct AgentContextManager call
    print("🔥 Testing direct AgentContextManager.switchToAgent...")
    direct_result = page.evaluate(f'''
        () => {{
            try {{
                console.log('🔥 DEBUG: About to call AgentContextManager.switchToAgent directly...');
                const config = {json.dumps(test_config)};
                const result = window.AgentContextManager.switchToAgent('debug_test_agent', config);
                console.log('🔥 DEBUG: Direct switchToAgent returned:', result);
                return result ? 'success' : 'failed';
            }} catch (error) {{
                console.log('🔥 DEBUG: Direct switchToAgent error:', error.message);
                return 'error: ' + error.message;
            }}
        }}
    ''')
    
    print(f"Direct AgentContextManager result: {direct_result}")
    
    # Wait for any remaining async operations
    time.sleep(1) 
    
    # Print all console messages captured during the test
    print("\\n--- Console Messages During Test ---")
    for msg in console_messages:
        print(msg)
    
    # Check if we got the expected debug logs
    context_manager_logs = [msg for msg in console_messages if '🔥 DEBUG: AgentContextManager' in msg or 'AgentContextManager' in msg]
    print(f"\\nFound {len(context_manager_logs)} AgentContextManager debug messages:")
    for log in context_manager_logs:
        print(f"  {log}")
    
    service_logs = [msg for msg in console_messages if '🔥 DEBUG:' in msg and 'AgentService' not in msg]
    print(f"\\nFound {len(service_logs)} other debug messages:")
    for log in service_logs:
        print(f"  {log}")

if __name__ == "__main__":
    # Run with pytest
    pytest.main([__file__, "-v", "-s"])