#!/usr/bin/env python3

import asyncio
from playwright.async_api import async_playwright

async def manual_mcp_test():
    """
    Manual test for MCP parameter passing.
    
    This test opens the browser and waits for you to:
    1. Set up API key and model
    2. Connect MCP manually  
    3. Try a function call
    4. Check console logs for parameter handling
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()
        
        # Monitor console for parameter-related logs
        console_logs = []
        def handle_console(msg):
            text = msg.text
            # Look for our debug logs and parameter-related messages
            if any(keyword in text for keyword in [
                'Function called with individual params',
                'Args object for MCP',
                'MCP tool result',
                'list_directory',
                'Invalid arguments',
                'Required',
                'DEBUG',
                'generateFunctionCode',
                'registerServerTools'
            ]):
                console_logs.append(f'[{msg.type}] {text}')
                print(f'🔍 CONSOLE: [{msg.type}] {text}')
        
        page.on('console', handle_console)
        
        print("🚀 Opening hacka.re for manual MCP testing...")
        await page.goto('file:///Users/user/dev/hacka.re/index.html')
        
        print("\n📋 MANUAL TEST INSTRUCTIONS:")
        print("=" * 50)
        print("1. 🔑 Set up your API key in Settings:")
        print("   - Click Settings button")
        print("   - Enter your OpenAI API key")
        print("   - Select a model (e.g., gpt-4o-mini)")
        print("   - Save settings")
        print()
        print("2. 🔌 Connect MCP:")
        print("   - Click MCP Servers button")
        print("   - Set up your MCP connection")
        print("   - Wait for tools to load")
        print("   - Close MCP modal")
        print()
        print("3. 🧪 Test function call:")
        print("   - Type: 'list files in /Users/user'")
        print("   - Send the message")
        print("   - Watch console logs below")
        print()
        print("4. 📊 Expected logs (if fix is working):")
        print("   ✅ 'Function called with individual params: path'")
        print("   ✅ 'Args object for MCP: {\"path\": \"/Users/user\"}'")
        print("   ❌ Should NOT see: 'Invalid arguments' or empty {}")
        print()
        print("🎯 PRESS CTRL+C WHEN DONE TESTING")
        print("=" * 50)
        
        try:
            # Keep browser open for manual testing
            while True:
                await asyncio.sleep(2)
                
                # Print any new relevant logs
                if len(console_logs) > 0:
                    # Show recent logs
                    recent_logs = console_logs[-3:]  # Last 3 logs
                    for log in recent_logs:
                        pass  # Already printed in handle_console
                        
        except KeyboardInterrupt:
            print("\n📝 FINAL CONSOLE LOG SUMMARY:")
            print("=" * 40)
            
            param_logs = [log for log in console_logs if 'Function called with individual params' in log]
            args_logs = [log for log in console_logs if 'Args object for MCP' in log]
            error_logs = [log for log in console_logs if 'Invalid arguments' in log or 'Required' in log]
            registration_logs = [log for log in console_logs if 'registerServerTools' in log]
            
            print(f"🔧 Function registration logs: {len(registration_logs)}")
            print(f"📥 Parameter handling logs: {len(param_logs)}")
            print(f"📤 Args construction logs: {len(args_logs)}")
            print(f"❌ Error logs: {len(error_logs)}")
            
            print("\n📋 All relevant logs:")
            for log in console_logs:
                print(f"  {log}")
            
            if param_logs and args_logs and not error_logs:
                print("\n✅ SUCCESS: Parameter fix appears to be working!")
            elif error_logs:
                print("\n❌ FAILED: Still seeing parameter errors")
            else:
                print("\n⚠️  UNCLEAR: No clear parameter handling evidence")
                
            print("\n🔚 Closing browser...")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(manual_mcp_test())