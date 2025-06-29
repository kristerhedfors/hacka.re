#!/usr/bin/env python3

import asyncio
from playwright.async_api import async_playwright

async def test_parameter_fix():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()
        
        # Listen to console logs - focus on MCP function calls
        def handle_console(msg):
            text = msg.text
            if any(keyword in text for keyword in ['list_directory', 'Function called with individual params', 'Args object for MCP', 'MCP tool result']):
                print(f'[{msg.type}] {text}')
        
        page.on('console', handle_console)
        
        print('Opening hacka.re to test parameter fix...')
        await page.goto('file:///Users/user/dev/hacka.re/index.html')
        
        # Wait for initialization and MCP connection
        print('Waiting for MCP connection and function loading...')
        await page.wait_for_timeout(8000)
        
        print('Testing MCP function parameter passing...')
        print('Try asking: "list files in /Users/user"')
        print('Watch console for parameter debugging output.')
        print()
        print('Expected to see:')
        print('- Function called with individual params: {path: /Users/user}')
        print('- Args object for MCP: {path: /Users/user}')
        print('- MCP tool result with actual file listing')
        print()
        print('Browser open for testing. Press Ctrl+C when done.')
        
        try:
            # Keep browser open for testing
            while True:
                await asyncio.sleep(5)
        except KeyboardInterrupt:
            print('\\nTest completed. Closing browser...')
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(test_parameter_fix())