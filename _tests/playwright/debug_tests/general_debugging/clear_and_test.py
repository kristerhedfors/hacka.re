#!/usr/bin/env python3

import asyncio
from playwright.async_api import async_playwright

async def clear_and_test():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()
        
        # Listen to console logs
        def handle_console(msg):
            text = msg.text
            if 'list_directory' in text or 'Function called with params' in text or 'Args to send' in text:
                print(f'[{msg.type}] {text}')
        
        page.on('console', handle_console)
        
        print('Opening browser and clearing functions...')
        await page.goto('file:///Users/user/dev/hacka.re/index.html')
        
        # Wait for initialization
        await page.wait_for_timeout(5000)
        
        print('Clearing existing functions and forcing MCP reconnection...')
        
        # Clear functions and force reload
        result = await page.evaluate("""() => {
            // Clear existing functions
            if (window.FunctionToolsService) {
                // Get all function names
                const functions = window.FunctionToolsService.getJsFunctions();
                const names = Object.keys(functions);
                console.log('Clearing functions:', names);
                
                // Remove each function
                names.forEach(name => {
                    window.FunctionToolsService.removeJsFunction(name);
                });
            }
            
            return 'Functions cleared';
        }""")
        
        print(f'Clear result: {result}')
        
        # Wait a bit then trigger MCP reconnection
        await page.wait_for_timeout(2000)
        
        print('Opening MCP modal to trigger reconnection...')
        await page.click('#mcp-servers-btn')
        await page.wait_for_timeout(1000)
        
        # Close modal
        await page.keyboard.press('Escape')
        await page.wait_for_timeout(2000)
        
        print('Now test the list_directory function...')
        print('Browser is ready for testing - watch console for debug output')
        
        # Keep browser open
        try:
            await asyncio.Event().wait()
        except KeyboardInterrupt:
            print('Closing...')
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(clear_and_test())