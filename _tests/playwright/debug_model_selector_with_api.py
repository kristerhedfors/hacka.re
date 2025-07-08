#!/usr/bin/env python3
"""
Debug script to test model selector modal with API key configured
"""
import os
import time
from playwright.sync_api import sync_playwright
from dotenv import load_dotenv

# Load environment variables from .env file in the current directory
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
# Get API key from environment
API_KEY = os.getenv("OPENAI_API_KEY")

def test_model_selector_with_api():
    if not API_KEY:
        print("❌ OPENAI_API_KEY environment variable not set")
        return
        
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=500)
        page = browser.new_page()
        
        # Enable console logging
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        
        print("🔍 Navigating to localhost:8000...")
        page.goto("http://localhost:8000")
        
        # Wait for page to load
        print("🔍 Waiting for page to load...")
        page.wait_for_timeout(3000)
        
        # Configure API key
        print("🔍 Configuring API key...")
        
        # Click settings button
        settings_btn = page.locator("#settings-btn")
        if settings_btn.count() > 0:
            settings_btn.click()
            page.wait_for_timeout(1000)
            
            # Enter API key
            api_key_input = page.locator("#api-key-update")
            if api_key_input.count() > 0:
                api_key_input.fill(API_KEY)
                
                # Save settings
                save_btn = page.locator("#save-settings-btn")
                if save_btn.count() > 0:
                    save_btn.click()
                    page.wait_for_timeout(3000)  # Wait for models to load
                    print("✅ API key configured and settings saved")
                else:
                    print("❌ Save button not found")
            else:
                print("❌ API key input not found")
        else:
            print("❌ Settings button not found")
        
        # Now check if model name display is visible
        print("🔍 Checking if model name display is visible...")
        model_name = page.locator('.model-name-display')
        if model_name.count() > 0:
            print(f"✅ Found model name display")
            try:
                text = model_name.inner_text()
                print(f"Model name text: '{text}'")
                
                if model_name.is_visible():
                    print("✅ Model name display is visible")
                    
                    # Try clicking it
                    print("🔍 Clicking model name...")
                    model_name.click()
                    page.wait_for_timeout(1000)
                    
                    # Check if modal opened
                    modal = page.locator('#model-selector-modal')
                    if modal.is_visible():
                        print("✅ Modal opened via click")
                        
                        # Check modal content
                        select_element = page.locator('#model-selector-select')
                        if select_element.count() > 0:
                            print("✅ Found model selector dropdown")
                            options = select_element.locator('option').all()
                            print(f"Found {len(options)} model options")
                            
                            if len(options) > 0:
                                for i, option in enumerate(options[:3]):  # Show first 3
                                    try:
                                        value = option.get_attribute('value')
                                        text = option.inner_text()
                                        print(f"  Option {i+1}: {text} (value: {value})")
                                    except:
                                        pass
                        else:
                            print("❌ Model selector dropdown not found")
                        
                        # Test cancel button
                        print("🔍 Testing cancel button...")
                        cancel_btn = page.locator('#model-selector-cancel-btn')
                        if cancel_btn.count() > 0 and cancel_btn.is_visible():
                            print("✅ Cancel button found and visible")
                            cancel_btn.click()
                            page.wait_for_timeout(500)
                            
                            if not modal.is_visible():
                                print("✅ Cancel button works")
                            else:
                                print("❌ Cancel button doesn't work")
                        else:
                            print("❌ Cancel button not found or not visible")
                            
                        # Test escape key
                        print("🔍 Testing escape key...")
                        # Reopen modal first
                        model_name.click()
                        page.wait_for_timeout(500)
                        
                        if modal.is_visible():
                            page.keyboard.press('Escape')
                            page.wait_for_timeout(500)
                            
                            if not modal.is_visible():
                                print("✅ Escape key works")
                            else:
                                print("❌ Escape key doesn't work")
                        
                    else:
                        print("❌ Modal did not open via click")
                else:
                    print("❌ Model name display is not visible")
            except Exception as e:
                print(f"❌ Error with model name display: {e}")
        else:
            print("❌ Model name display not found")
            
        # Test keyboard shortcuts anyway
        print("🔍 Testing keyboard shortcut Ctrl+Shift+M...")
        page.keyboard.press('Control+Shift+M')
        page.wait_for_timeout(1000)
        
        modal = page.locator('#model-selector-modal')
        if modal.is_visible():
            print("✅ Ctrl+Shift+M works")
            
            # Check if modal has proper content
            select_element = page.locator('#model-selector-select')
            if select_element.count() > 0:
                options = select_element.locator('option').all()
                print(f"Modal has {len(options)} options in dropdown")
                
                # Test apply button
                apply_btn = page.locator('#model-selector-apply-btn')
                if apply_btn.count() > 0 and apply_btn.is_visible():
                    print("✅ Apply button found and visible")
                    # Don't click apply to avoid changing the model
                else:
                    print("❌ Apply button not found or not visible")
            
            # Close modal
            page.keyboard.press('Escape')
            page.wait_for_timeout(500)
        else:
            print("❌ Ctrl+Shift+M doesn't work")
            
        print("🔍 Test complete. Keeping browser open for 5 seconds...")
        page.wait_for_timeout(5000)
        
        browser.close()

if __name__ == "__main__":
    test_model_selector_with_api()