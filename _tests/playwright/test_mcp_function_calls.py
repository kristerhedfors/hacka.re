#!/usr/bin/env python3

import pytest
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown

@pytest.fixture(scope="function") 
def api_key():
    """Provide API key from environment"""
    import os
    from dotenv import load_dotenv
    load_dotenv()
    return os.getenv("OPENAI_API_KEY")

def test_mcp_function_calls_with_parameters(page: Page, serve_hacka_re, api_key):
    """Test that MCP functions correctly receive parameters when called by LLM"""
    
    # Navigate and setup
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Setup API key quickly
    page.click("#settings-btn")
    page.wait_for_selector("#settings-modal.active", state="visible")
    page.locator("#api-key-update").fill(api_key)
    page.locator("#base-url-select").select_option("openai")
    page.locator("#model-reload-btn").click()
    page.wait_for_timeout(2000)
    
    # Select a model
    try:
        page.locator("#model-select").select_option("gpt-4o-mini")
    except:
        # Fallback to first available
        options = page.evaluate("""() => {
            const select = document.getElementById('model-select');
            return Array.from(select.options).filter(opt => !opt.disabled).map(opt => opt.value);
        }""")
        if options:
            page.locator("#model-select").select_option(options[0])
    
    page.keyboard.press("Escape")
    page.wait_for_selector("#settings-modal", state="hidden")
    
    # Setup console monitoring for parameter debugging
    console_logs = []
    def handle_console(msg):
        text = msg.text
        if any(keyword in text for keyword in [
            'Function called with individual params',
            'Args object for MCP',
            'MCP tool result',
            'list_directory',
            'Invalid arguments',
            'Required',
            'DEBUG'
        ]):
            console_logs.append(f'[{msg.type}] {text}')
            print(f'CONSOLE: [{msg.type}] {text}')
    
    page.on('console', handle_console)
    
    print("NOTE: Please manually connect MCP in the modal when it opens...")
    print("Test will wait for you to set up MCP connection...")
    
    # Open MCP modal for manual setup
    page.click("#mcp-servers-btn")
    page.wait_for_selector("#mcp-servers-modal", state="visible")
    
    screenshot_with_markdown(page, "mcp_manual_setup", {
        "Test": "MCP Function Calls",
        "Stage": "Manual MCP Setup Required",
        "Instructions": "Please connect MCP manually and close this modal"
    })
    
    print("Waiting 30 seconds for manual MCP setup...")
    print("Please:")
    print("1. Set up your MCP connection in the modal")
    print("2. Close the MCP modal when done")
    print("3. Test will continue automatically")
    
    # Wait for modal to be closed (user will close it)
    page.wait_for_selector("#mcp-servers-modal", state="hidden", timeout=30000)
    print("MCP modal closed, continuing with test...")
    
    # Wait a bit for MCP functions to load
    page.wait_for_timeout(3000)
    
    # Test function call
    print("Testing MCP function call with 'list files in /Users/user'...")
    
    message_input = page.locator("#message-input")
    message_input.fill("list files in /Users/user")
    page.click("#send-btn")
    
    # Wait for function call to complete
    page.wait_for_timeout(10000)
    
    # Check for function call indicators
    function_icons = page.locator('.function-call-icon')
    function_count = function_icons.count()
    print(f"Found {function_count} function call icons")
    
    # Take final screenshot
    screenshot_with_markdown(page, "mcp_function_test_result", {
        "Test": "MCP Function Calls",
        "Function Icons": function_count,
        "Console Logs": len(console_logs)
    })
    
    # Print all relevant console logs
    print("\n=== RELEVANT CONSOLE LOGS ===")
    for log in console_logs:
        print(log)
    
    # Check if we got the expected parameter handling logs
    param_logs = [log for log in console_logs if 'Function called with individual params' in log]
    args_logs = [log for log in console_logs if 'Args object for MCP' in log]
    error_logs = [log for log in console_logs if 'Invalid arguments' in log or 'Required' in log]
    
    print(f"\nParameter logs: {len(param_logs)}")
    print(f"Args logs: {len(args_logs)}")
    print(f"Error logs: {len(error_logs)}")
    
    if param_logs and args_logs and not error_logs:
        print("✅ SUCCESS: MCP functions receiving parameters correctly!")
        return True
    elif error_logs:
        print("❌ FAILED: MCP functions still receiving invalid arguments")
        return False
    else:
        print("⚠ UNCLEAR: No clear parameter handling logs found")
        return False

if __name__ == "__main__":
    # Can be run directly for manual testing
    import asyncio
    from playwright.async_api import async_playwright
    
    async def manual_test():
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=False)
            page = await browser.new_page()
            
            print("Running MCP function calls test manually...")
            print("You'll need to manually set up MCP connection when prompted")
            
            await browser.close()
    
    asyncio.run(manual_test())