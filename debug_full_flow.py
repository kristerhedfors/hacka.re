#!/usr/bin/env python3

from playwright.sync_api import sync_playwright
import time
import json

def debug_full_flow():
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
        
        # First, add a function
        print("📝 Adding a test function...")
        function_btn = page.locator("#function-btn")
        function_btn.click()
        
        function_modal = page.locator("#function-modal")
        function_modal.wait_for(state="visible")
        
        # Add a function
        function_code = """function test_function(text, count = 1) {
    return {
        result: text.repeat(count),
        timestamp: new Date().toISOString()
    };
}"""
        
        function_code_input = page.locator("#function-code")
        function_code_input.fill(function_code)
        
        # Trigger auto-population
        page.evaluate("""() => {
            const codeTextarea = document.getElementById('function-code');
            if (codeTextarea) {
                codeTextarea.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }""")
        
        # Validate the function
        validate_btn = page.locator("#function-validate-btn")
        validate_btn.click()
        
        # Wait for validation
        time.sleep(1)
        
        # Save the function
        save_btn = page.locator("#function-editor-form button[type='submit']")
        save_btn.click()
        
        # Close function modal
        time.sleep(1)
        page.locator("#close-function-modal").click()
        
        print("✅ Function added successfully")
        
        # Now open share modal
        print("\n🔗 Generating share link...")
        share_btn = page.locator("#share-btn")
        share_btn.click()
        
        share_modal = page.locator("#share-modal")
        share_modal.wait_for(state="visible")
        
        # Set password
        password_input = page.locator("#share-password")
        password_input.fill("TestPassword123")
        
        # Enable function library sharing (should be enabled now)
        function_library_checkbox = page.locator("#share-function-library")
        if not function_library_checkbox.is_checked():
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
        
        # Delete the function
        print("\n🗑️ Deleting function...")
        function_btn.click()
        function_modal.wait_for(state="visible")
        
        page.on("dialog", lambda dialog: dialog.accept())
        delete_btn = page.locator(".function-collection-delete").first
        delete_btn.click()
        
        time.sleep(1)
        page.locator("#close-function-modal").click()
        print("✅ Function deleted")
        
        # Navigate to the shared link
        print(f"\n🔄 Navigating to share link...")
        page.goto(generated_link)
        
        # Wait for automatic processing
        time.sleep(3)
        
        # Check if function was restored
        print("\n📋 Checking if function was restored...")
        function_btn = page.locator("#function-btn")
        function_btn.click()
        
        function_modal = page.locator("#function-modal")
        function_modal.wait_for(state="visible")
        
        # Check if function exists
        function_items = page.locator(".function-item-name:has-text('test_function')")
        if function_items.count() > 0:
            print("✅ Function was successfully restored from share link!")
        else:
            print("❌ Function was NOT restored")
            
            # Print recent console messages
            print("\n=== Recent Console Messages ===")
            for msg in console_messages[-30:]:
                if msg['type'] in ['error', 'warning']:
                    print(f"{msg['type'].upper()}: {msg['text']}")
                    if msg['location'] and msg['type'] == 'error':
                        print(f"  at {msg['location']['url']}:{msg['location']['lineNumber']}")
        
        # Keep browser open for inspection
        input("\nPress Enter to close browser...")
        browser.close()

if __name__ == "__main__":
    debug_full_flow()