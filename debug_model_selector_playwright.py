#!/usr/bin/env python3
"""
Debug script to test model selector modal with Playwright
"""
import time
from playwright.sync_api import sync_playwright

def test_model_selector():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=1000)  # Show browser with slow motion
        page = browser.new_page()
        
        # Enable console logging
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        
        print("🔍 Navigating to localhost:8000...")
        page.goto("http://localhost:8000")
        
        # Wait for page to load
        print("🔍 Waiting for page to load...")
        page.wait_for_timeout(3000)
        
        # Check if model name display exists
        print("🔍 Checking if model name display exists...")
        model_name = page.locator('.model-name-display')
        if model_name.count() > 0:
            print(f"✅ Found model name display: {model_name.inner_text()}")
        else:
            print("❌ Model name display not found")
            
        # Check if modal exists
        print("🔍 Checking if modal exists...")
        modal = page.locator('#model-selector-modal')
        if modal.count() > 0:
            print("✅ Found model selector modal")
        else:
            print("❌ Model selector modal not found")
            
        # Try clicking model name
        print("🔍 Trying to click model name...")
        try:
            model_name.click(timeout=5000)
            print("✅ Clicked model name")
            
            # Wait a bit and check if modal is visible
            page.wait_for_timeout(1000)
            
            if modal.is_visible():
                print("✅ Modal is visible after click")
                
                # Check if modal has content
                modal_content = modal.locator('.modal-content')
                if modal_content.count() > 0:
                    print("✅ Modal has content")
                    
                    # Check for buttons
                    apply_btn = page.locator('#model-selector-apply-btn')
                    cancel_btn = page.locator('#model-selector-cancel-btn')
                    
                    print(f"Apply button exists: {apply_btn.count() > 0}")
                    print(f"Cancel button exists: {cancel_btn.count() > 0}")
                    
                    if cancel_btn.count() > 0:
                        print("🔍 Trying to click cancel button...")
                        try:
                            cancel_btn.click(timeout=2000)
                            print("✅ Clicked cancel button")
                            
                            # Check if modal closed
                            page.wait_for_timeout(500)
                            if not modal.is_visible():
                                print("✅ Modal closed successfully")
                            else:
                                print("❌ Modal did not close")
                        except Exception as e:
                            print(f"❌ Failed to click cancel button: {e}")
                    
                    # Reopen modal to test other functions
                    print("🔍 Reopening modal to test escape key...")
                    model_name.click()
                    page.wait_for_timeout(500)
                    
                    if modal.is_visible():
                        print("✅ Modal reopened")
                        
                        # Test escape key
                        print("🔍 Testing escape key...")
                        page.keyboard.press('Escape')
                        page.wait_for_timeout(500)
                        
                        if not modal.is_visible():
                            print("✅ Escape key works")
                        else:
                            print("❌ Escape key doesn't work")
                            
                        # Reopen and test outside click
                        print("🔍 Reopening modal to test outside click...")
                        model_name.click()
                        page.wait_for_timeout(500)
                        
                        if modal.is_visible():
                            print("✅ Modal reopened for outside click test")
                            
                            # Click outside modal (on the modal backdrop)
                            print("🔍 Testing click outside modal...")
                            modal.click(position={'x': 10, 'y': 10})  # Click near top-left of modal (backdrop area)
                            page.wait_for_timeout(500)
                            
                            if not modal.is_visible():
                                print("✅ Outside click works")
                            else:
                                print("❌ Outside click doesn't work")
                else:
                    print("❌ Modal has no content")
            else:
                print("❌ Modal is not visible after click")
                
        except Exception as e:
            print(f"❌ Failed to click model name: {e}")
            
        # Test keyboard shortcut
        print("🔍 Testing keyboard shortcut Ctrl+Shift+M...")
        try:
            page.keyboard.press('Control+Shift+M')
            page.wait_for_timeout(1000)
            
            if modal.is_visible():
                print("✅ Keyboard shortcut works")
                
                # Close it
                page.keyboard.press('Escape')
                page.wait_for_timeout(500)
            else:
                print("❌ Keyboard shortcut doesn't work")
        except Exception as e:
            print(f"❌ Failed to test keyboard shortcut: {e}")
            
        # Test Alt+M
        print("🔍 Testing keyboard shortcut Alt+M...")
        try:
            page.keyboard.press('Alt+M')
            page.wait_for_timeout(1000)
            
            if modal.is_visible():
                print("✅ Alt+M shortcut works")
                
                # Close it
                page.keyboard.press('Escape')
                page.wait_for_timeout(500)
            else:
                print("❌ Alt+M shortcut doesn't work")
        except Exception as e:
            print(f"❌ Failed to test Alt+M shortcut: {e}")
            
        # Keep browser open for manual inspection
        print("🔍 Test complete. Keeping browser open for 10 seconds for manual inspection...")
        page.wait_for_timeout(10000)
        
        browser.close()

if __name__ == "__main__":
    test_model_selector()