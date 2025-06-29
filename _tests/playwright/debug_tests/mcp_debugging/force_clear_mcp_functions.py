#!/usr/bin/env python3

import asyncio
from playwright.async_api import async_playwright

async def force_clear_mcp_functions():
    """Force clear and regenerate MCP functions to apply the parameter fix"""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()
        
        # Monitor console logs
        console_logs = []
        def handle_console(msg):
            text = msg.text
            console_logs.append(f'[{msg.type}] {text}')
            if any(keyword in text for keyword in [
                'Async function match',
                'Matched parameters',
                'Generated parameter extractions',
                'Generated execution code',
                'Successfully added and enabled MCP function',
                'list_directory'
            ]):
                print(f'🔍 {text}')
        
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
        
        print("🗑️ Step 1: Clear all MCP functions...")
        
        # Clear all existing MCP functions
        cleared = await page.evaluate("""() => {
            if (!window.FunctionToolsService) {
                return { error: 'FunctionToolsService not available' };
            }
            
            const functions = window.FunctionToolsService.getJsFunctions();
            const functionNames = Object.keys(functions);
            console.log('All functions before clearing:', functionNames);
            
            // Clear all functions (since we want to regenerate MCP ones)
            const mcpFunctions = functionNames.filter(name => 
                name.includes('read_file') || 
                name.includes('list_directory') ||
                name.includes('write_file') ||
                name.includes('create_directory') ||
                name.includes('search_files') ||
                name.includes('get_file_info') ||
                name.includes('edit_file') ||
                name.includes('move_file') ||
                name.includes('directory_tree') ||
                name.includes('read_multiple_files') ||
                name.includes('list_allowed_directories')
            );
            
            console.log('Clearing MCP functions:', mcpFunctions);
            mcpFunctions.forEach(name => {
                window.FunctionToolsService.removeJsFunction(name);
                console.log(`Removed function: ${name}`);
            });
            
            const remaining = Object.keys(window.FunctionToolsService.getJsFunctions());
            console.log('Functions after clearing:', remaining);
            
            return { 
                cleared: mcpFunctions.length,
                remaining: remaining.length,
                mcpFunctions: mcpFunctions
            };
        }""")
        
        print(f"✅ Cleared {cleared.get('cleared', 0)} MCP functions")
        print(f"📊 Remaining functions: {cleared.get('remaining', 0)}")
        
        await page.wait_for_timeout(1000)
        
        print("🔌 Step 2: Trigger MCP reconnection...")
        
        # Open MCP modal to trigger reconnection and re-registration
        await page.click('#mcp-servers-btn')
        await page.wait_for_selector('#mcp-servers-modal', state='visible')
        
        # Wait for reconnection and registration
        await page.wait_for_timeout(5000)
        
        # Close modal
        await page.keyboard.press('Escape')
        await page.wait_for_timeout(2000)
        
        print("🔍 Step 3: Check regenerated functions...")
        
        regenerated = await page.evaluate("""() => {
            if (!window.FunctionToolsService) {
                return { error: 'FunctionToolsService not available' };
            }
            
            const functions = window.FunctionToolsService.getJsFunctions();
            const functionNames = Object.keys(functions);
            const mcpFunctions = functionNames.filter(name => 
                name.includes('list_directory') ||
                name.includes('read_file')
            );
            
            return {
                total: functionNames.length,
                mcpFunctions: mcpFunctions,
                mcpCount: mcpFunctions.length,
                allFunctions: functionNames
            };
        }""")
        
        print(f"📋 Total functions: {regenerated.get('total', 0)}")
        print(f"📋 MCP functions: {regenerated.get('mcpCount', 0)}")
        print(f"📋 MCP function names: {regenerated.get('mcpFunctions', [])}")
        
        if regenerated.get('mcpCount', 0) > 0:
            print("✅ SUCCESS: MCP functions regenerated!")
            
            print("🧪 Step 4: Test the function call...")
            print("Testing with: 'list files in /Users/user'")
            
            # Send test message
            await page.fill('#message-input', 'list files in /Users/user')
            await page.click('#send-btn')
            
            # Wait for execution
            await page.wait_for_timeout(6000)
            
            print("\n📊 ANALYSIS:")
            
            # Check for our new debug logs
            param_logs = [log for log in console_logs if 'Matched parameters' in log]
            extraction_logs = [log for log in console_logs if 'Generated parameter extractions' in log]
            execution_logs = [log for log in console_logs if 'Generated execution code' in log]
            
            print(f"📋 Parameter match logs: {len(param_logs)}")
            print(f"📋 Parameter extraction logs: {len(extraction_logs)}")
            print(f"📋 Execution code logs: {len(execution_logs)}")
            
            if param_logs:
                print("✅ Parameters are being extracted!")
            if extraction_logs:
                print("✅ Parameter extractions are being generated!")
            if execution_logs:
                print("✅ Execution code is being generated!")
                
            # Show recent important logs
            print("\n🔍 RECENT DEBUG LOGS:")
            for log in (param_logs + extraction_logs + execution_logs)[-5:]:
                print(f"  {log}")
                
        else:
            print("❌ FAILED: No MCP functions found after regeneration")
        
        print("\nPress Ctrl+C to close...")
        try:
            while True:
                await asyncio.sleep(5)
        except KeyboardInterrupt:
            print("🔚 Closing...")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(force_clear_mcp_functions())