#!/usr/bin/env python3

import asyncio
from playwright.async_api import async_playwright

async def inspect_mcp_function():
    """Inspect the actual generated MCP function code"""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()
        
        # Monitor console for MCP registration
        console_logs = []
        def handle_console(msg):
            text = msg.text
            console_logs.append(f'[{msg.type}] {text}')
            if any(keyword in text for keyword in [
                'Successfully added and enabled MCP function',
                'Registered tool',
                'registerServerTools',
                'MCPToolRegistry',
                'list_directory'
            ]):
                print(f'📡 {text}')
        
        page.on('console', handle_console)
        
        print("🚀 Opening hacka.re...")
        await page.goto('file:///Users/user/dev/hacka.re/index.html')
        await page.wait_for_timeout(3000)
        
        # Close modals
        try:
            await page.keyboard.press('Escape')
            await page.wait_for_timeout(500)
        except:
            pass
        
        print("🔍 Triggering MCP connection...")
        
        # Open MCP modal to trigger connection
        await page.click('#mcp-servers-btn')
        await page.wait_for_selector('#mcp-servers-modal', state='visible')
        
        # Wait for connection
        await page.wait_for_timeout(5000)
        
        # Close modal
        await page.keyboard.press('Escape')
        await page.wait_for_timeout(2000)
        
        print("🔍 Inspecting MCP function code...")
        
        # Get the actual function code
        function_code = await page.evaluate("""() => {
            if (window.FunctionToolsService) {
                const functions = window.FunctionToolsService.getJsFunctions();
                const listDirFunction = functions['list_directory'];
                if (listDirFunction) {
                    return {
                        name: 'list_directory',
                        code: listDirFunction.code,
                        collectionId: listDirFunction.collectionId,
                        collectionMetadata: listDirFunction.collectionMetadata
                    };
                }
            }
            return null;
        }""")
        
        if function_code:
            print("✅ Found list_directory function!")
            print(f"📦 Collection: {function_code['collectionId']}")
            print(f"📝 Collection metadata: {function_code['collectionMetadata']}")
            print("\n" + "="*80)
            print("🔍 GENERATED FUNCTION CODE:")
            print("="*80)
            print(function_code['code'])
            print("="*80)
            
            # Test the parameter extraction regex on this actual code
            import re
            code = function_code['code']
            
            # Test both regexes
            old_regex = r'(?:^|\s|\/\*\*[\s\S]*?\*\/\s*)(async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)'
            new_regex = r'\/\*\*[\s\S]*?\*\/\s*(async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)|(?:^|\n)\s*(async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)'
            
            print("\n🔍 REGEX TESTING:")
            print("-" * 40)
            
            old_match = re.search(old_regex, code)
            print(f"Old regex match: {bool(old_match)}")
            if old_match:
                print(f"  Groups: {old_match.groups()}")
            
            new_match = re.search(new_regex, code)
            print(f"New regex match: {bool(new_match)}")
            if new_match:
                print(f"  Groups: {new_match.groups()}")
            
            # Look for the function signature line specifically
            lines = code.split('\n')
            for i, line in enumerate(lines):
                if 'function list_directory' in line:
                    print(f"\n📍 Function signature line {i+1}: {line.strip()}")
                    break
        else:
            print("❌ list_directory function not found!")
            
            # Check what functions are available
            all_functions = await page.evaluate("""() => {
                if (window.FunctionToolsService) {
                    const functions = window.FunctionToolsService.getJsFunctions();
                    return Object.keys(functions);
                }
                return [];
            }""")
            print(f"Available functions: {all_functions}")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(inspect_mcp_function())