#!/usr/bin/env python3

from playwright.sync_api import sync_playwright
import time
import json

def debug_restore():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        
        # Capture console messages
        console_messages = []
        page.on("console", lambda msg: console_messages.append({
            'type': msg.type,
            'text': msg.text,
            'location': msg.location
        }))
        
        # Navigate to the application
        page.goto("http://localhost:8000")
        
        # Dismiss welcome modal
        page.wait_for_selector("#welcome-modal", state="visible")
        page.locator("#close-welcome-modal").click()
        page.wait_for_selector("#welcome-modal", state="hidden")
        
        # Open share modal
        share_btn = page.locator("#share-btn")
        share_btn.click()
        
        share_modal = page.locator("#share-modal")
        share_modal.wait_for(state="visible")
        
        # Set password
        password_input = page.locator("#share-password")
        password_input.fill("TestPassword123")
        
        # Enable function library sharing
        function_library_checkbox = page.locator("#share-function-library")
        function_library_checkbox.check()
        
        # Generate the share link
        generate_link_btn = page.locator("#generate-share-link-btn")
        generate_link_btn.click()
        
        # Wait for link generation
        time.sleep(1)
        
        # Get the generated link
        generated_link = page.locator("#generated-link").input_value()
        print(f"✅ Share link generated: {generated_link[:50]}...")
        
        # Close share modal
        page.locator("#close-share-modal").click()
        
        # Navigate to the shared link
        print(f"\n🔄 Navigating to share link...")
        page.goto(generated_link)
        
        # Wait for automatic processing
        time.sleep(2)
        
        # Print console messages
        print("\n=== Console Messages After Navigation ===")
        for msg in console_messages[-20:]:  # Last 20 messages
            if msg['type'] in ['error', 'warning', 'log']:
                print(f"{msg['type'].upper()}: {msg['text']}")
                if msg['location'] and msg['type'] == 'error':
                    print(f"  at {msg['location']['url']}:{msg['location']['lineNumber']}")
        
        # Keep browser open for inspection
        input("\nPress Enter to close browser...")
        browser.close()

if __name__ == "__main__":
    debug_restore()