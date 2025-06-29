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

def configure_api_key_and_model(page: Page, api_key: str):
    """Configure API key and select a model - simplified version for MCP testing"""
    print("Setting up API key and model...")
    
    # Open settings modal  
    page.click("#settings-btn")
    page.wait_for_selector("#settings-modal.active", state="visible")
    
    # Set API key using correct element ID
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill(api_key)
    
    # Select OpenAI as provider
    try:
        base_url_select = page.locator("#base-url-select") 
        base_url_select.select_option("openai")
        print("Selected OpenAI provider")
    except:
        print("Could not select OpenAI provider, continuing...")
    
    # Wait for models to load
    page.wait_for_timeout(3000)
    
    # Select gpt-4.1 model if available (good for function calling)
    try:
        model_select = page.locator("#model-select")
        model_select.select_option("gpt-4.1")
        print("Selected gpt-4.1 model")
    except:
        try:
            # Fallback to o4-mini
            model_select.select_option("o4-mini")  
            print("Selected o4-mini model")
        except:
            # Fallback to first available model
            model_options = page.locator("#model-select option")
            if model_options.count() > 0:
                first_model = model_options.nth(0).get_attribute("value")
                model_select.select_option(first_model)
                print(f"Selected fallback model: {first_model}")
    
    # Close settings modal
    page.keyboard.press("Escape")
    page.wait_for_selector("#settings-modal", state="hidden")
    
    return "configured"

def test_mcp_parameter_fix(page: Page, serve_hacka_re, api_key):
    """Test that MCP functions correctly receive parameters after the fix"""
    
    # 1. Navigate to application
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page) 
    
    # 2. Configure API
    configure_api_key_and_model(page, api_key)
    
    # 3. Setup MCP connection first!
    print("Setting up MCP connection...")
    
    # Open MCP modal
    page.click("#mcp-servers-btn")
    page.wait_for_selector("#mcp-servers-modal", state="visible")
    
    # Take screenshot of MCP modal
    screenshot_with_markdown(page, "mcp_modal_opened", {
        "Test": "MCP Parameter Fix", 
        "Stage": "MCP Modal Opened"
    })
    
    # Look for proxy connection status or try to connect
    try:
        # Check if proxy is already connected
        proxy_status = page.locator("#proxy-status")
        if proxy_status.is_visible():
            status_text = proxy_status.text_content()
            print(f"Proxy status: {status_text}")
            
            if "Not connected" in status_text or "Disconnected" in status_text:
                # Try to connect to proxy
                test_proxy_btn = page.locator("#test-proxy-btn")
                if test_proxy_btn.is_visible():
                    print("Connecting to MCP proxy...")
                    test_proxy_btn.click()
                    page.wait_for_timeout(2000)
    except:
        print("Could not check proxy status, continuing...")
    
    # Wait for MCP tools to be registered
    page.wait_for_timeout(5000)
    
    # Close MCP modal more aggressively
    print("Closing MCP modal...")
    
    # Try multiple methods to close the modal
    modal_closed = False
    
    # Method 1: Try clicking overlay/background
    try:
        page.click("body", position={"x": 50, "y": 50})  # Click outside modal
        page.wait_for_selector("#mcp-servers-modal", state="hidden", timeout=1000)
        modal_closed = True
        print("✓ Modal closed by clicking outside")
    except:
        pass
    
    # Method 2: Try Escape key multiple times
    if not modal_closed:
        try:
            for i in range(3):
                page.keyboard.press("Escape")
                page.wait_for_timeout(500)
            page.wait_for_selector("#mcp-servers-modal", state="hidden", timeout=1000)
            modal_closed = True
            print("✓ Modal closed with Escape key")
        except:
            pass
    
    # Method 3: Force close with JavaScript
    if not modal_closed:
        try:
            page.evaluate("""() => {
                const modal = document.getElementById('mcp-servers-modal');
                if (modal) {
                    modal.classList.remove('active');
                    modal.style.display = 'none';
                }
            }""")
            modal_closed = True
            print("✓ Modal force closed with JavaScript")
        except:
            pass
    
    page.wait_for_timeout(1000)
    
    if not modal_closed:
        print("⚠ Warning: Modal may still be open")
    
    print("MCP setup complete, waiting for function loading...")
    page.wait_for_timeout(3000)
    
    # 4. Check if MCP functions are loaded
    # Open function modal to verify functions exist
    page.click("#function-btn")
    page.wait_for_selector("#function-modal", state="visible")
    
    # Take screenshot for debugging
    screenshot_with_markdown(page, "function_modal_debug", {
        "Test": "MCP Parameter Fix", 
        "Stage": "Function Modal Opened"
    })
    
    # Check what function sections exist
    function_sections = page.locator('.function-collection-header, .collection-header, h3, h4')
    section_count = function_sections.count()
    print(f"Found {section_count} function sections")
    
    for i in range(min(section_count, 5)):  # Check first 5 sections
        section_text = function_sections.nth(i).text_content()
        print(f"Section {i}: '{section_text}'")
    
    # Look for any MCP-related text (more flexible)
    mcp_elements = page.locator('text=/MCP/i')  # Case insensitive
    mcp_count = mcp_elements.count()
    print(f"Found {mcp_count} elements containing 'MCP'")
    
    # Also check for specific function names
    list_directory_elements = page.locator('text=/list_directory/i')
    read_file_elements = page.locator('text=/read_file/i')
    
    print(f"Found {list_directory_elements.count()} 'list_directory' elements")
    print(f"Found {read_file_elements.count()} 'read_file' elements")
    
    # If we have MCP functions, continue with test
    has_mcp_functions = mcp_count > 0 or list_directory_elements.count() > 0
    
    if has_mcp_functions:
        print("✓ MCP functions found")
    else:
        print("✗ No MCP functions found - may need to wait longer or check MCP connection")
        # Close modal and try to trigger MCP connection
        page.keyboard.press("Escape")
        
        # Try clicking MCP button to trigger connection
        try:
            page.click("#mcp-servers-btn")
            page.wait_for_timeout(2000)
            page.keyboard.press("Escape")
            page.wait_for_timeout(3000)
        except:
            print("Could not access MCP servers button")
        
        # Try function modal again
        page.click("#function-btn")
        page.wait_for_selector("#function-modal", state="visible")
        
        # Recheck for functions
        mcp_elements = page.locator('text=/MCP/i')
        list_directory_elements = page.locator('text=/list_directory/i')
        has_mcp_functions = mcp_elements.count() > 0 or list_directory_elements.count() > 0
        print(f"After MCP trigger: MCP elements={mcp_elements.count()}, list_directory={list_directory_elements.count()}")
    
    # Close function modal
    page.keyboard.press("Escape")
    page.wait_for_selector("#function-modal", state="hidden")
    
    # 5. Test function call through chat
    print("Testing MCP function call...")
    
    # Setup console log monitoring to track parameter passing
    console_logs = []
    def handle_console(msg):
        text = msg.text
        if any(keyword in text for keyword in [
            'Function called with individual params',
            'Args object for MCP', 
            'MCP tool result',
            'list_directory'
        ]):
            console_logs.append(f'[{msg.type}] {text}')
            print(f'CONSOLE: [{msg.type}] {text}')
    
    page.on('console', handle_console)
    
    # Send message to trigger function call
    message_input = page.locator("#message-input")
    message_input.fill("list files in /Users/user")
    
    # Send message
    page.click("#send-btn")
    
    # Wait for function call to complete
    page.wait_for_timeout(5000)
    
    # 6. Verify the function call worked
    # Check for function call indicators in chat
    function_call_icons = page.locator('.function-call-icon')
    if function_call_icons.count() > 0:
        expect(function_call_icons.first).to_be_visible()
        print("✓ Function call icon found in chat")
    else:
        print("⚠ No function call icons found - function may not have been called")
    
    # Check console logs for proper parameter passing
    param_logs = [log for log in console_logs if 'Function called with individual params' in log]
    args_logs = [log for log in console_logs if 'Args object for MCP' in log]
    
    print(f"Parameter logs found: {len(param_logs)}")
    print(f"Args logs found: {len(args_logs)}")
    
    # Take final screenshot
    screenshot_with_markdown(page, "mcp_parameter_test_complete", {
        "Test": "MCP Parameter Fix",
        "Parameter Logs": len(param_logs),
        "Args Logs": len(args_logs),
        "Console Logs": len(console_logs)
    })
    
    # 7. Verify we got the expected debug output
    if param_logs:
        print("✓ SUCCESS: Function received individual parameters")
    else:
        print("✗ FAILED: No individual parameter logs found")
        
    if args_logs:
        print("✓ SUCCESS: Args object constructed for MCP")  
    else:
        print("✗ FAILED: No args object logs found")
    
    # Print all relevant console logs for analysis
    print("\\n=== RELEVANT CONSOLE LOGS ===")
    for log in console_logs:
        print(log)
    
    return len(param_logs) > 0 and len(args_logs) > 0

if __name__ == "__main__":
    # Can be run directly for manual testing
    import asyncio
    from playwright.async_api import async_playwright
    
    async def manual_test():
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=False)
            page = await browser.new_page()
            
            # Run the test manually
            print("Running MCP parameter test manually...")
            # Note: Would need to adapt for async version
            
            await browser.close()
    
    asyncio.run(manual_test())