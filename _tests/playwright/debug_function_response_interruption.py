#!/usr/bin/env python3
"""
Debug script to test the actual bug: Functions execute but AI response generation stops
This tests the complete flow: user message -> function execution -> AI response to function results
"""
import pytest
import time
import json
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_function_response_interruption_debug(page: Page, serve_hacka_re):
    """Test the real bug: AI response generation stopping after function execution"""
    
    console_messages = []
    def log_console_message(msg):
        console_messages.append({
            'type': msg.type,
            'text': msg.text,
            'timestamp': time.time()
        })
        print(f"Console {msg.type}: {msg.text}")
    page.on("console", log_console_message)
    
    # Navigate to app
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Set up API key
    settings_button = page.locator("#settings-btn")
    settings_button.click()
    
    # Wait for settings modal
    page.wait_for_selector(".modal-body", state="visible", timeout=5000)
    
    # Find API key field and set it
    api_key_field = page.locator("input[placeholder*='API key'], input[id*='api'], input[name*='api']").first
    api_key_field.fill("sk-test-key-for-debugging")
    
    # Close settings
    close_btn = page.locator(".modal .close, .modal-header button").first
    close_btn.click()
    page.wait_for_timeout(1000)
    
    # Connect to MCP services manually for controlled test
    mcp_button = page.locator("#mcp-btn")
    mcp_button.click()
    
    page.wait_for_selector(".mcp-modal", state="visible", timeout=5000)
    
    # Add GitHub connection (simple test)
    github_token_input = page.locator("input[placeholder*='GitHub'], input[id*='github']").first
    if github_token_input.count() > 0:
        github_token_input.fill("ghp_test_token_for_debugging")
        
    # Add Shodan connection
    shodan_key_input = page.locator("input[placeholder*='Shodan'], input[id*='shodan']").first
    if shodan_key_input.count() > 0:
        shodan_key_input.fill("test_shodan_key_for_debugging")
        
    # Close MCP modal
    mcp_close = page.locator(".mcp-modal .close, .mcp-modal-header button").first
    mcp_close.click()
    page.wait_for_timeout(1000)
    
    screenshot_with_markdown(page, "setup_complete", {
        "Status": "API key and MCP services configured",
        "Expected": "Ready to test function execution and response generation"
    })
    
    # Wait for function registration
    print("⏳ Waiting for function registration...")
    page.wait_for_timeout(5000)
    
    # Test 1: Send a message that should trigger a function call
    print("🧪 Test 1: Sending message that should trigger GitHub function...")
    
    chat_input = page.locator("#message-input")
    send_button = page.locator("button[id*='send'], .send-btn").first
    
    chat_input.fill("find top rust repositories mentioning nmap")
    send_button.click()
    
    # Wait and monitor for function execution
    function_executed = False
    ai_response_started = False
    ai_response_completed = False
    response_interrupted = False
    
    # Monitor for 15 seconds
    for i in range(15):
        page.wait_for_timeout(1000)
        
        # Check console for function execution
        recent_logs = [msg for msg in console_messages if time.time() - msg['timestamp'] < 15]
        function_logs = [msg for msg in recent_logs if 'github_search' in msg['text'].lower()]
        response_logs = [msg for msg in recent_logs if 'response generation stopped' in msg['text'].lower()]
        
        if function_logs and not function_executed:
            function_executed = True
            print(f"✅ Function executed at second {i+1}")
            
        if response_logs and not response_interrupted:
            response_interrupted = True
            print(f"❌ Response generation stopped at second {i+1}")
            break
            
        # Check for AI response in the chat
        messages = page.locator(".message").all()
        if len(messages) >= 2:  # User message + AI response
            last_message = messages[-1]
            if last_message and "assistant" in last_message.get_attribute("class", ""):
                ai_response_started = True
                text_content = last_message.text_content()
                if text_content and len(text_content) > 50:  # Substantial response
                    ai_response_completed = True
                    print(f"✅ AI response completed at second {i+1}")
                    break
    
    screenshot_with_markdown(page, "test1_function_call_result", {
        "Status": "After GitHub function test",
        "Function Executed": str(function_executed),
        "AI Response Started": str(ai_response_started), 
        "AI Response Completed": str(ai_response_completed),
        "Response Interrupted": str(response_interrupted)
    })
    
    # Test 2: Try Shodan function
    print("🧪 Test 2: Sending message that should trigger Shodan function...")
    
    chat_input.fill("tell me about 1.1.1.1")
    send_button.click()
    
    # Reset tracking variables
    function_executed_2 = False
    ai_response_started_2 = False
    ai_response_completed_2 = False
    response_interrupted_2 = False
    
    # Monitor for 15 seconds
    for i in range(15):
        page.wait_for_timeout(1000)
        
        recent_logs = [msg for msg in console_messages if time.time() - msg['timestamp'] < 15]
        function_logs = [msg for msg in recent_logs if 'shodan_host' in msg['text'].lower()]
        response_logs = [msg for msg in recent_logs if 'response generation stopped' in msg['text'].lower()]
        
        if function_logs and not function_executed_2:
            function_executed_2 = True
            print(f"✅ Shodan function executed at second {i+1}")
            
        if response_logs and not response_interrupted_2:
            response_interrupted_2 = True
            print(f"❌ Shodan response generation stopped at second {i+1}")
            break
            
        # Check for new AI response
        messages = page.locator(".message").all()
        if len(messages) >= 4:  # 2 previous + user message + AI response
            last_message = messages[-1]
            if last_message and "assistant" in last_message.get_attribute("class", ""):
                ai_response_started_2 = True
                text_content = last_message.text_content()
                if text_content and len(text_content) > 50:
                    ai_response_completed_2 = True
                    print(f"✅ Shodan AI response completed at second {i+1}")
                    break
    
    screenshot_with_markdown(page, "test2_shodan_result", {
        "Status": "After Shodan function test",
        "Function Executed": str(function_executed_2),
        "AI Response Started": str(ai_response_started_2),
        "AI Response Completed": str(ai_response_completed_2), 
        "Response Interrupted": str(response_interrupted_2)
    })
    
    # Analyze results
    print("\n=== TEST RESULTS ===")
    print(f"GitHub Test:")
    print(f"  Function Executed: {function_executed}")
    print(f"  AI Response Started: {ai_response_started}")
    print(f"  AI Response Completed: {ai_response_completed}")
    print(f"  Response Interrupted: {response_interrupted}")
    
    print(f"Shodan Test:")
    print(f"  Function Executed: {function_executed_2}")
    print(f"  AI Response Started: {ai_response_started_2}")
    print(f"  AI Response Completed: {ai_response_completed_2}")
    print(f"  Response Interrupted: {response_interrupted_2}")
    
    # Check for specific error patterns in console
    error_patterns = {
        'streaming_errors': [msg for msg in console_messages if 'stream' in msg['text'].lower() and msg['type'] == 'error'],
        'api_errors': [msg for msg in console_messages if 'api' in msg['text'].lower() and msg['type'] == 'error'],
        'tool_errors': [msg for msg in console_messages if 'tool' in msg['text'].lower() and msg['type'] == 'error'],
        'response_stopped': [msg for msg in console_messages if 'response generation stopped' in msg['text'].lower()]
    }
    
    print(f"\n=== ERROR ANALYSIS ===")
    for pattern_name, errors in error_patterns.items():
        print(f"{pattern_name}: {len(errors)} errors")
        for error in errors[-3:]:  # Show last 3 of each type
            print(f"  - {error['text']}")
    
    screenshot_with_markdown(page, "debug_final_analysis", {
        "Status": "Debug analysis complete",
        "Bug Confirmed": str(response_interrupted or response_interrupted_2),
        "Functions Work": str(function_executed and function_executed_2),
        "AI Responses Fail": str(not ai_response_completed and not ai_response_completed_2),
        "Error Pattern": "Response generation stops after function execution"
    })
    
    # Save detailed console log
    with open('/Users/user/dev/hacka.re/_tests/playwright/function_response_debug.json', 'w') as f:
        json.dump(console_messages, f, indent=2)
    
    print(f"\n=== CONCLUSION ===")
    if (function_executed or function_executed_2) and (response_interrupted or response_interrupted_2):
        print("🔍 BUG CONFIRMED: Functions execute successfully but AI response generation stops")
        print("🎯 ROOT CAUSE: API streaming pipeline interrupted after tool call processing")
    elif not (function_executed or function_executed_2):
        print("🔍 ISSUE: Functions are not executing at all")
    else:
        print("🤔 MIXED RESULTS: Need further investigation")

if __name__ == "__main__":
    import subprocess
    import sys
    
    result = subprocess.run([
        sys.executable, "-m", "pytest", 
        __file__, 
        "-v", "-s", "--tb=short"
    ], cwd="/Users/user/dev/hacka.re/_tests/playwright")
    
    sys.exit(result.returncode)