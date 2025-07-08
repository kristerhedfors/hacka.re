#!/usr/bin/env python3
"""
Simple test for model selector modal functionality
"""
import pytest
import os
import time
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown

# Load environment variables from .env file in the current directory
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
API_KEY = os.getenv("OPENAI_API_KEY")

def quick_api_setup(page):
    """Quick API setup without waiting for modal to close"""
    print("🔧 Quick API setup...")
    
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Click settings
    page.click("#settings-btn")
    page.wait_for_selector("#settings-modal.active", timeout=2000)
    
    # Fill API key
    page.fill("#api-key-update", API_KEY)
    page.select_option("#base-url-select", "openai")
    
    # Click reload and save without waiting
    page.click("#model-reload-btn")
    time.sleep(2)  # Let models load
    page.click("#save-settings-btn")
    time.sleep(1)  # Let settings save
    
    print("✅ API setup complete")

def test_model_selector():
    if not API_KEY:
        print("❌ No API key")
        return
        
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=300)
        page = browser.new_page()
        
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}") if "🚀" in msg.text or "🔧" in msg.text else None)
        
        page.goto("http://localhost:8000")
        page.wait_for_load_state("networkidle", timeout=5000)
        
        quick_api_setup(page)
        
        print("🔍 Testing model selector...")
        
        # Test keyboard shortcut first (easier to debug)
        print("🔍 Testing Ctrl+Shift+M...")
        page.keyboard.press('Control+Shift+M')
        time.sleep(1)
        
        modal = page.locator('#model-selector-modal')
        if modal.is_visible():
            print("✅ Keyboard shortcut works!")
            screenshot_with_markdown(page, "modal_opened_keyboard")
            
            # Check if modal has content
            select_element = page.locator('#model-selector-select')
            if select_element.count() > 0:
                options = select_element.locator('option').all()
                print(f"✅ Modal has {len(options)} options")
                
                # Check buttons
                apply_btn = page.locator('#model-selector-apply-btn')
                cancel_btn = page.locator('#model-selector-cancel-btn')
                
                print(f"Apply button visible: {apply_btn.is_visible() if apply_btn.count() > 0 else False}")
                print(f"Cancel button visible: {cancel_btn.is_visible() if cancel_btn.count() > 0 else False}")
                
                # Test cancel button
                if cancel_btn.count() > 0 and cancel_btn.is_visible():
                    print("🔍 Testing cancel button...")
                    cancel_btn.click()
                    time.sleep(0.5)
                    
                    if not modal.is_visible():
                        print("✅ Cancel button works!")
                    else:
                        print("❌ Cancel button doesn't work")
                        # Try escape instead
                        page.keyboard.press('Escape')
                        time.sleep(0.5)
                        print(f"Escape worked: {not modal.is_visible()}")
                else:
                    print("❌ Cancel button not found/visible")
            else:
                print("❌ No select element in modal")
        else:
            print("❌ Keyboard shortcut doesn't work")
            
        # Test model name click
        print("🔍 Testing model name click...")
        model_name = page.locator('.model-name-display')
        if model_name.count() > 0:
            print(f"Model name text: '{model_name.inner_text()}'")
            print(f"Model name visible: {model_name.is_visible()}")
            
            if model_name.is_visible():
                model_name.click()
                time.sleep(1)
                
                if modal.is_visible():
                    print("✅ Model name click works!")
                    screenshot_with_markdown(page, "modal_opened_click")
                    page.keyboard.press('Escape')  # Close it
                    time.sleep(0.5)
                else:
                    print("❌ Model name click doesn't work")
            else:
                print("❌ Model name not visible")
        else:
            print("❌ Model name not found")
            
        print("🔍 Test complete")
        time.sleep(3)
        browser.close()

if __name__ == "__main__":
    test_model_selector()