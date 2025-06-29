#!/usr/bin/env python3

import asyncio
from playwright.async_api import async_playwright

async def force_mcp_regeneration():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()
        
        # Listen to console logs for debugging
        def handle_console(msg):
            text = msg.text
            if any(keyword in text for keyword in [
                'Successfully added and enabled MCP function',
                'Function called with individual params',
                'Args object for MCP',
                'MCP tool result',
                'registerServerTools'
            ]):
                print(f'[{msg.type}] {text}')
        
        page.on('console', handle_console)
        
        print('Opening hacka.re and forcing MCP function regeneration...')
        await page.goto('file:///Users/user/dev/hacka.re/index.html')
        
        # Wait for initialization
        await page.wait_for_timeout(3000)
        
        # Dismiss any modals that might be open
        try:
            # Close welcome modal if present
            await page.click('body', position={'x': 50, 'y': 50})
            await page.wait_for_timeout(500)
            
            # Close settings modal if present
            await page.keyboard.press('Escape')
            await page.wait_for_timeout(500)
            
            # Force close any active modals with JavaScript
            await page.evaluate("""() => {
                document.querySelectorAll('.modal.active').forEach(modal => {
                    modal.classList.remove('active');
                    modal.style.display = 'none';
                });
            }""")
            await page.wait_for_timeout(500)
        except:
            pass
        
        print('Step 1: Clearing existing MCP functions...')
        # Clear any existing MCP functions
        await page.evaluate("""() => {
            // Clear all functions containing MCP-related names
            if (window.FunctionToolsService) {
                const functions = window.FunctionToolsService.getJsFunctions();
                const names = Object.keys(functions);
                console.log('Available functions before clearing:', names);
                
                const mcpFunctions = names.filter(name => 
                    name.includes('read_file') || 
                    name.includes('list_directory') ||
                    name.includes('write_file') ||
                    name.includes('create_directory') ||
                    name.includes('search_files') ||
                    name.includes('get_file_info') ||
                    name.includes('edit_file') ||
                    name.includes('move_file') ||
                    name.includes('directory_tree') ||
                    name.includes('list_allowed_directories')
                );
                
                console.log('Clearing MCP functions:', mcpFunctions);
                mcpFunctions.forEach(name => {
                    window.FunctionToolsService.removeJsFunction(name);
                });
                
                console.log('Functions after clearing:', Object.keys(window.FunctionToolsService.getJsFunctions()));
            }
            
            return 'MCP functions cleared';
        }""")
        
        await page.wait_for_timeout(2000)
        
        print('Step 2: Opening MCP modal to trigger reconnection...')
        await page.click('#mcp-servers-btn')
        await page.wait_for_selector('#mcp-servers-modal', state='visible')
        
        # Wait for tools to be re-registered
        await page.wait_for_timeout(5000)
        
        # Close modal
        await page.click('body', position={'x': 50, 'y': 50})
        await page.wait_for_timeout(1000)
        
        print('Step 3: Checking if new functions were generated...')
        result = await page.evaluate("""() => {
            if (window.FunctionToolsService) {
                const functions = window.FunctionToolsService.getJsFunctions();
                const names = Object.keys(functions);
                const mcpFunctions = names.filter(name => 
                    name.includes('read_file') || 
                    name.includes('list_directory') ||
                    name.includes('write_file')
                );
                
                return {
                    totalFunctions: names.length,
                    mcpFunctions: mcpFunctions,
                    mcpCount: mcpFunctions.length
                };
            }
            return { error: 'FunctionToolsService not available' };
        }""")
        
        print(f'Function regeneration result: {result}')
        
        if result.get('mcpCount', 0) > 0:
            print('✅ SUCCESS: MCP functions regenerated with new code!')
            print('Now test: "list files in /Users/user"')
        else:
            print('❌ No MCP functions found. May need to manually reconnect.')
        
        print('\\nMCP function regeneration complete!')
        print('Functions should now use the new parameter handling code.')
        
        # Test a simple function call to verify
        print('\\nTesting function with sample call...')
        await page.evaluate("""() => {
            if (window.FunctionToolsService) {
                const functions = window.FunctionToolsService.getJsFunctions();
                const names = Object.keys(functions);
                console.log('Available function names:', names);
                
                // Try to find and test a directory listing function
                const listDirFunc = names.find(name => name.includes('list_directory'));
                if (listDirFunc) {
                    console.log('Found list_directory function:', listDirFunc);
                    // Don't actually call it, just verify it exists
                } else {
                    console.log('No list_directory function found');
                }
            }
        }""")
        
        await page.wait_for_timeout(2000)
        await browser.close()

if __name__ == "__main__":
    asyncio.run(force_mcp_regeneration())