#!/usr/bin/env python3

import asyncio
from playwright.async_api import async_playwright

async def test_mcp_parameter_fix_live():
    """
    Live test of MCP parameter fix with console monitoring
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()
        
        # Monitor all console logs
        console_logs = []
        def handle_console(msg):
            text = msg.text
            console_logs.append(f'[{msg.type}] {text}')
            
            # Print important logs immediately
            if any(keyword in text for keyword in [
                'Function match details',
                'Matched parameters',
                'Function called with individual params',
                'Args object for MCP',
                'MCP tool result',
                'list_directory',
                'executeJsFunction',
                'Function signature match',
                'Actual function name',
                'Invalid arguments',
                'Required'
            ]):
                print(f'🔍 CONSOLE: [{msg.type}] {text}')
        
        page.on('console', handle_console)
        
        print("🚀 Opening hacka.re...")
        await page.goto('file:///Users/user/dev/hacka.re/index.html')
        
        # Wait for initialization
        await page.wait_for_timeout(1000)
        
        # Close any modals
        print("📱 Closing modals...")
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
        
        print("🔑 Setting up API key...")
        # Quick API setup
        await page.click('#settings-btn')
        await page.wait_for_selector('#settings-modal.active', state='visible')
        
        # Use a dummy API key for testing (function execution will work locally)
        await page.fill('#api-key-update', 'sk-test-dummy-key-for-testing')
        await page.select_option('#base-url-select', 'openai')
        await page.click('#model-reload-btn')
        await page.wait_for_timeout(1000)
        
        # Select any available model
        try:
            await page.select_option('#model-select', 'gpt-4o-mini')
        except:
            options = await page.evaluate("""() => {
                const select = document.getElementById('model-select');
                return Array.from(select.options).filter(opt => !opt.disabled).map(opt => opt.value);
            }""")
            if options:
                await page.select_option('#model-select', options[0])
        
        await page.keyboard.press('Escape')
        await page.wait_for_timeout(1000)
        
        print("🔌 Setting up MCP connection...")
        # Open MCP modal
        await page.click('#mcp-servers-btn')
        await page.wait_for_selector('#mcp-servers-modal', state='visible')
        
        # Check proxy status
        try:
            proxy_status = await page.text_content('#proxy-status')
            print(f"📡 Proxy status: {proxy_status}")
        except:
            print("📡 Could not read proxy status")
        
        # Close MCP modal
        await page.keyboard.press('Escape')
        await page.wait_for_timeout(1000)
        
        print("🧪 Testing function call...")
        print("=" * 60)
        print("SENDING: 'list files in /Users/user/mnt'")
        print("=" * 60)
        
        # Send the test message
        await page.fill('#message-input', 'list files in /Users/user/mnt')
        await page.click('#send-btn')
        
        # Wait for function execution to complete
        await page.wait_for_timeout(1000)
        
        print("\n" + "=" * 60)
        print("📊 ANALYSIS OF CONSOLE LOGS")
        print("=" * 60)
        
        # Analyze the logs
        regex_logs = [log for log in console_logs if 'Function match details' in log]
        param_logs = [log for log in console_logs if 'Matched parameters' in log]
        individual_param_logs = [log for log in console_logs if 'Function called with individual params' in log]
        args_logs = [log for log in console_logs if 'Args object for MCP' in log]
        error_logs = [log for log in console_logs if 'Invalid arguments' in log or 'Required' in log]
        
        print(f"📋 Regex match logs: {len(regex_logs)}")
        print(f"📋 Parameter extraction logs: {len(param_logs)}")
        print(f"📋 Individual params logs: {len(individual_param_logs)}")
        print(f"📋 Args construction logs: {len(args_logs)}")
        print(f"❌ Error logs: {len(error_logs)}")
        
        print("\n🔍 KEY LOGS:")
        for log in regex_logs + param_logs + individual_param_logs + args_logs[:2]:
            print(f"  {log}")
        
        if error_logs:
            print("\n❌ ERROR LOGS:")
            for log in error_logs[:3]:
                print(f"  {log}")
        
        # Determine result
        if individual_param_logs and args_logs and not error_logs:
            print("\n✅ SUCCESS: Parameter fix appears to be working!")
        elif error_logs:
            print("\n❌ FAILED: Still seeing parameter errors")
        else:
            print("\n⚠️ UNCLEAR: Need to check MCP server logs")
        
        print(f"\n📊 Total console logs captured: {len(console_logs)}")
        print("\nPress Ctrl+C to close browser...")
        
        try:
            # Keep browser open for manual inspection
            while True:
                await asyncio.sleep(5)
        except KeyboardInterrupt:
            print("\n🔚 Closing browser...")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(test_mcp_parameter_fix_live())