#!/usr/bin/env python3

import asyncio
from playwright.async_api import async_playwright

async def test_mcp_functions():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()
        
        # Collect console logs - be more inclusive to catch issues
        mcp_logs = []
        def handle_console(msg):
            text = msg.text
            # Print all console logs to see what's happening
            print(f'[{msg.type}] {text}')
            if any(keyword in text for keyword in ['MCP', 'tool', 'function', 'Successfully', 'error']):
                mcp_logs.append(f'[{msg.type}] {text}')
        
        page.on('console', handle_console)
        
        print("Opening hacka.re application...")
        await page.goto('file:///Users/user/dev/hacka.re/index.html')
        
        # Wait for initialization
        print("Waiting for initialization...")
        await page.wait_for_timeout(8000)  # Wait longer for MCP connection
        
        print("\n=== Testing MCP Function Availability ===")
        
        # Check what functions are available
        functions_check = await page.evaluate("""() => {
            const fcm = window.functionCallingManager || (window.aiHackare && window.aiHackare.functionCallingManager);
            if (!fcm) return { error: 'No FunctionCallingManager found' };
            
            const defs = fcm.getFunctionDefinitions();
            const mcpFunctions = defs.filter(f => f.function.name.includes('directory') || f.function.name.includes('file'));
            
            return {
                totalFunctions: defs.length,
                mcpFunctions: mcpFunctions.map(f => f.function.name),
                hasListDirectory: typeof window.list_directory === 'function',
                hasReadFile: typeof window.read_file === 'function'
            };
        }""")
        
        print(f"Functions check: {functions_check}")
        
        # Test if list_directory function exists and works
        if functions_check.get('hasListDirectory'):
            print("\n=== Testing list_directory function ===")
            
            test_result = await page.evaluate("""async () => {
                try {
                    console.log('[TEST] About to call list_directory function');
                    const result = await list_directory({ path: '/Users/user' });
                    console.log('[TEST] list_directory result:', result);
                    return { success: true, result: result };
                } catch (error) {
                    console.error('[TEST] list_directory error:', error);
                    return { error: error.message, stack: error.stack };
                }
            }""")
            
            print(f"list_directory test result: {test_result}")
        else:
            print("list_directory function not found in global scope")
        
        print(f"\nCollected {len(mcp_logs)} MCP-related logs")
        
        # Keep browser open for manual inspection
        print("\nBrowser is open for manual inspection. Close this script when done.")
        try:
            await page.wait_for_timeout(30000)  # Wait 30 seconds
        except KeyboardInterrupt:
            pass
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(test_mcp_functions())