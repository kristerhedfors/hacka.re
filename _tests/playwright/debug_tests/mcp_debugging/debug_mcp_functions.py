#!/usr/bin/env python3

import asyncio
from playwright.async_api import async_playwright

async def debug_mcp_functions():
    """Debug MCP function registration and parameter handling"""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()
        
        # Capture all console logs
        console_logs = []
        def handle_console(msg):
            text = msg.text
            console_logs.append(f'[{msg.type}] {text}')
            print(f'CONSOLE: [{msg.type}] {text}')
        
        page.on('console', handle_console)
        
        print('Opening hacka.re...')
        await page.goto('file:///Users/user/dev/hacka.re/index.html')
        await page.wait_for_timeout(2000)
        
        # Close any modals
        try:
            await page.keyboard.press('Escape')
            await page.wait_for_timeout(500)
            await page.evaluate("""() => {
                document.querySelectorAll('.modal.active').forEach(modal => {
                    modal.classList.remove('active');
                });
            }""")
        except:
            pass
        
        print('Step 1: Check MCP connection status...')
        # Open MCP modal to see connection status
        await page.click('#mcp-servers-btn')
        await page.wait_for_selector('#mcp-servers-modal', state='visible')
        
        # Check proxy status
        proxy_status = await page.text_content('#proxy-status')
        print(f'Proxy status: {proxy_status}')
        
        # Close modal
        await page.keyboard.press('Escape')
        await page.wait_for_timeout(1000)
        
        print('Step 2: Check current MCP tool registry...')
        registry_state = await page.evaluate("""() => {
            if (window.MCPToolRegistry) {
                const tools = window.MCPToolRegistry.getAllTools();
                return {
                    totalTools: Object.keys(tools).length,
                    toolNames: Object.keys(tools),
                    servers: window.MCPToolRegistry.getConnectedServers ? window.MCPToolRegistry.getConnectedServers() : 'method not available'
                };
            }
            return { error: 'MCPToolRegistry not available' };
        }""")
        print(f'MCP Tool Registry state: {registry_state}')
        
        print('Step 3: Check function tools service...')
        function_state = await page.evaluate("""() => {
            if (window.FunctionToolsService) {
                const functions = window.FunctionToolsService.getJsFunctions();
                const names = Object.keys(functions);
                const mcpFunctions = names.filter(name => 
                    name.includes('list_directory') || 
                    name.includes('read_file') ||
                    name.includes('write_file') ||
                    name.includes('create_directory')
                );
                return {
                    totalFunctions: names.length,
                    allFunctionNames: names,
                    mcpFunctions: mcpFunctions,
                    mcpCount: mcpFunctions.length
                };
            }
            return { error: 'FunctionToolsService not available' };
        }""")
        print(f'Function Tools Service state: {function_state}')
        
        print('Step 4: Check MCPToolsManager...')
        mcp_tools_state = await page.evaluate("""() => {
            if (window.MCPToolsManager) {
                return {
                    available: true,
                    hasRegisterMethod: typeof window.MCPToolsManager.registerServerTools === 'function',
                    hasGenerateMethod: typeof window.MCPToolsManager.generateFunctionCode === 'function'
                };
            }
            return { available: false };
        }""")
        print(f'MCPToolsManager state: {mcp_tools_state}')
        
        print('Step 5: Check function calling manager...')
        fcm_state = await page.evaluate("""() => {
            if (window.functionCallingManager) {
                return {
                    available: true,
                    hasAddFunction: typeof window.functionCallingManager.addFunction === 'function',
                    hasHasFunction: typeof window.functionCallingManager.hasFunction === 'function'
                };
            }
            return { available: false };
        }""")
        print(f'Function Calling Manager state: {fcm_state}')
        
        print('Step 6: Manually trigger MCP function registration...')
        registration_result = await page.evaluate("""() => {
            console.log('=== MANUAL MCP FUNCTION REGISTRATION TEST ===');
            
            if (!window.MCPToolRegistry || !window.MCPToolsManager || !window.functionCallingManager) {
                return { error: 'Missing required components' };
            }
            
            try {
                // Get all tools from registry
                const allTools = window.MCPToolRegistry.getAllTools();
                console.log('All MCP tools:', Object.keys(allTools));
                
                // Try to register tools for each server
                const servers = Object.keys(allTools);
                const results = [];
                
                for (const serverName of servers) {
                    console.log(`Registering tools for server: ${serverName}`);
                    try {
                        const result = window.MCPToolsManager.registerServerTools(serverName);
                        results.push({ server: serverName, result: result });
                        console.log(`Registration result for ${serverName}:`, result);
                    } catch (error) {
                        console.error(`Registration failed for ${serverName}:`, error);
                        results.push({ server: serverName, error: error.message });
                    }
                }
                
                return { success: true, results: results };
            } catch (error) {
                console.error('Manual registration failed:', error);
                return { error: error.message };
            }
        }""")
        print(f'Manual registration result: {registration_result}')
        
        await page.wait_for_timeout(2000)
        
        print('Step 7: Check functions after manual registration...')
        final_function_state = await page.evaluate("""() => {
            if (window.FunctionToolsService) {
                const functions = window.FunctionToolsService.getJsFunctions();
                const names = Object.keys(functions);
                const mcpFunctions = names.filter(name => 
                    name.includes('list_directory') || 
                    name.includes('read_file') ||
                    name.includes('write_file') ||
                    name.includes('create_directory')
                );
                return {
                    totalFunctions: names.length,
                    mcpFunctions: mcpFunctions,
                    mcpCount: mcpFunctions.length
                };
            }
            return { error: 'FunctionToolsService not available' };
        }""")
        print(f'Final function state: {final_function_state}')
        
        print('\\n=== CONSOLE LOGS ===')
        for log in console_logs[-20:]:  # Show last 20 logs
            print(log)
        
        print('\\nDone. Press Ctrl+C to close...')
        try:
            while True:
                await asyncio.sleep(5)
        except KeyboardInterrupt:
            print('Closing browser...')
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(debug_mcp_functions())