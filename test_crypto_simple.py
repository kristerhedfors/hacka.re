#!/usr/bin/env python3

from playwright.sync_api import sync_playwright
import time

def test_crypto():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        
        # Capture console messages
        console_messages = []
        page.on("console", lambda msg: console_messages.append({
            'type': msg.type,
            'text': msg.text
        }))
        
        # Navigate to test page
        page.goto("http://localhost:8000/test_crypto.html")
        
        # Wait for tests to complete
        time.sleep(2)
        
        # Get the results from the page
        results = page.locator("#results").inner_html()
        
        # Print results
        print("=== Test Results ===")
        # Parse and print results in text format
        import re
        text = re.sub('<[^<]+?>', '', results)
        print(text)
        
        # Print any console errors
        print("\n=== Console Messages ===")
        for msg in console_messages:
            if msg['type'] in ['error', 'warning']:
                print(f"{msg['type'].upper()}: {msg['text']}")
        
        browser.close()

if __name__ == "__main__":
    test_crypto()