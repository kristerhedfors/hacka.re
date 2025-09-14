#!/usr/bin/env python3

from playwright.sync_api import sync_playwright
import time
import json

def debug_share_link():
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
        
        # Generate the share link
        generate_link_btn = page.locator("#generate-share-link-btn")
        generate_link_btn.click()
        
        # Wait a moment for any errors
        time.sleep(2)
        
        # Check if link was generated
        generated_link_container = page.locator("#generated-link-container")
        if generated_link_container.is_visible():
            link = page.locator("#generated-link").input_value()
            print(f"✅ Share link generated: {link[:50]}...")
        else:
            print("❌ Share link container not visible")
            
        # Print console messages
        print("\n=== Console Messages ===")
        for msg in console_messages:
            if msg['type'] in ['error', 'warning']:
                print(f"{msg['type'].upper()}: {msg['text']}")
                if msg['location']:
                    print(f"  at {msg['location']['url']}:{msg['location']['lineNumber']}")
        
        # Keep browser open for inspection
        input("Press Enter to close browser...")
        browser.close()

if __name__ == "__main__":
    debug_share_link()