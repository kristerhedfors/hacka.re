#!/usr/bin/env python3
import time
import json
from playwright.sync_api import sync_playwright

def debug_shodan_functions():
    test_link = 'file:///Users/user/dev/hacka.re/index.html#gpt=A46yGx_d5jojYqQAn5XL1cPtZg0O68yA2hJPXwA9pgtqRfwYBlejmCanuXCXeGsRlHZQsabpLo6xB8iwYLzVfPzRD7dSor_7SjZkRiWV_6HQK4_XlLdFT8BQAWd314aYcaVQF-HfbUlPPHcXJR9a1wUNpWjoZ707PCqh1U7t0cN6KXJrW8aNySjvaK6RwDgSayxWS9Xdkf4dQI8_V73Inws7RJiGhocubFo_IY4_QF8FcfuIy3MZUA8XhpZkueJOMg5_aiss3y1YgRltz9SAGyvKdSgcH4rBVBtt0NuVuadWMgvLUyXmtENlTRMjXNqeOSHIT2kG-KbJQQS6GRNthqeB12SzpyizQpHNJLk5zxBUJrleMqWGQwK2Kdlwvq50Vqc5SmlyUXExwYPTXiRqmFE3sAj0nCZT2wdhy5mXmgIo6_bxyVqIc7jYOBnn9GBK8_1gAPHF_Uietwb4h94HljXYbWzk'
    
    console_messages = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        
        # Setup console logging
        def log_console(msg):
            if any(keyword in msg.text for keyword in ['MCP Service Connectors', 'registerServiceTools', 'Function', 'Shodan', 'tools']):
                print(f'Console: {msg.text}')
                console_messages.append(msg.text)
        page.on('console', log_console)
        
        print('Opening test link...')
        page.goto(test_link)
        
        # Handle password modal
        try:
            print('Waiting for password modal...')
            password_input = page.locator('#password-input')
            password_input.wait_for(state='visible', timeout=10000)
            print('Password input found, entering "asd"')
            password_input.fill('asd')
            page.locator('#unlock-button').click()
            print('Password submitted')
            
            # Wait for modal to disappear
            page.locator('#password-modal').wait_for(state='hidden', timeout=10000)
            print('Password modal closed')
            
        except Exception as e:
            print(f'Password modal handling failed: {e}')
            # Continue anyway
        
        # Wait for MCP processing
        print('Waiting 8 seconds for MCP connection processing...')
        time.sleep(8)
        
        # Check Function Calling modal
        print('Opening Function Calling modal...')
        try:
            page.locator('#function-calling-btn').click()
            time.sleep(2)
            
            # Count functions
            functions = page.locator('.user-function-item').count()
            shodan_functions = page.locator('.user-function-item:has-text("shodan_")').count()
            
            print(f'Total functions: {functions}')
            print(f'Shodan functions: {shodan_functions}')
            
            if shodan_functions == 0:
                print('No Shodan functions found - examining function list...')
                function_items = page.locator('.user-function-item')
                count = function_items.count()
                for i in range(count):
                    function_name = function_items.nth(i).locator('.function-name').text_content()
                    print(f'  Function {i}: {function_name}')
            
        except Exception as e:
            print(f'Function modal error: {e}')
        
        # Take screenshot
        page.screenshot(path='debug_shodan_functions.png')
        
        # Save console logs
        with open('debug_console_logs.json', 'w') as f:
            json.dump(console_messages, f, indent=2)
        
        print('\\nConsole messages saved to debug_console_logs.json')
        print('Screenshot saved to debug_shodan_functions.png')
        print(f'\\nCaptured {len(console_messages)} relevant console messages')
        
        # Keep browser open for inspection
        print('\\nBrowser will stay open for manual inspection. Press Enter to close...')
        input()
        
        browser.close()

if __name__ == '__main__':
    debug_shodan_functions()