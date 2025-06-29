#!/usr/bin/env python3

import asyncio
from playwright.async_api import async_playwright

async def open_browser_for_testing():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()
        
        print('Opening hacka.re application for testing...')
        await page.goto('file:///Users/user/dev/hacka.re/index.html')
        
        print('Browser opened! You can now test the MCP functions.')
        print('Try asking the AI to:')
        print('- "list files in /Users/user/Documents"')
        print('- "read the file /Users/user/.bashrc"') 
        print('- "show me what files are in my home directory"')
        print()
        print('Browser will stay open until you close it manually.')
        print('Press Ctrl+C in this terminal when done to clean up.')
        
        try:
            # Keep the script running
            while True:
                await asyncio.sleep(5)
        except KeyboardInterrupt:
            print('\\nClosing browser...')
        
        await browser.close()
        print('Browser closed.')

if __name__ == "__main__":
    asyncio.run(open_browser_for_testing())