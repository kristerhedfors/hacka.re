#!/usr/bin/env python3
"""
Debug script to test model selector modal functionality
Uses the same pattern as existing function calling tests
"""
import pytest
import os
import time
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright, Page

from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown

# Load environment variables from .env file in the current directory
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
# Get API key from environment variables
API_KEY = os.getenv("OPENAI_API_KEY")

def configure_api_key_and_model(page):
    """Configure API key and model following the exact pattern from existing tests."""
    print("🔧 Configuring API key and model...")
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if already open
    dismiss_settings_modal(page)
    
    # Click the settings button
    settings_button = page.locator("#settings-btn")
    settings_button.click(timeout=2000)
    
    # Wait for the settings modal to become visible
    page.wait_for_selector("#settings-modal.active", state="visible", timeout=2000)
    
    # Enter the API key
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill(API_KEY)
    
    # Select OpenAI as the API provider
    base_url_select = page.locator("#base-url-select")
    base_url_select.select_option("openai")
    
    # Click the reload models button
    reload_button = page.locator("#model-reload-btn")
    reload_button.click()
    
    # Wait for the models to be loaded
    try:
        page.wait_for_selector("#model-select option:not([disabled])", state="visible", timeout=5000)
        print("✅ Models loaded successfully")
    except Exception as e:
        print(f"❌ Error waiting for models to load: {e}")
        
    # Save the settings
    save_button = page.locator("#save-settings-btn")
    save_button.click()
    
    # Wait for settings modal to close
    page.wait_for_selector("#settings-modal:not(.active)", timeout=2000)
    print("✅ Settings saved and modal closed")
    
    # Wait a bit for everything to settle
    time.sleep(1)

def test_model_selector_functionality():
    """Test model selector modal functionality with proper setup."""
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
        page.wait_for_load_state("networkidle", timeout=5000)
        print("🔍 Page loaded")
        
        # Configure API key and model
        configure_api_key_and_model(page)
        
        # Now test model selector functionality
        print("🔍 Testing model selector functionality...")
        
        # Check if model name display is visible now
        model_name = page.locator('.model-name-display')
        if model_name.count() > 0:
            try:
                text = model_name.inner_text()
                print(f"✅ Model name display found with text: '{text}'")
                
                if model_name.is_visible():
                    print("✅ Model name display is visible")
                    
                    # Test clicking model name
                    print("🔍 Testing click on model name...")
                    model_name.click()
                    time.sleep(1)
                    
                    # Check if modal opened
                    modal = page.locator('#model-selector-modal')
                    if modal.is_visible():
                        print("✅ Modal opened via model name click")
                        screenshot_with_markdown(page, "model_selector_opened_via_click")
                        
                        # Check modal content
                        select_element = page.locator('#model-selector-select')
                        if select_element.count() > 0:
                            options = select_element.locator('option').all()
                            print(f"✅ Found {len(options)} model options in modal")
                            
                            # Show first few options
                            for i, option in enumerate(options[:3]):
                                try:
                                    value = option.get_attribute('value')
                                    text = option.inner_text()
                                    print(f"  Option {i+1}: {text} (value: {value})")
                                except:
                                    pass
                        
                        # Test cancel button
                        print("🔍 Testing cancel button...")
                        cancel_btn = page.locator('#model-selector-cancel-btn')
                        if cancel_btn.count() > 0 and cancel_btn.is_visible():
                            print("✅ Cancel button found and visible")
                            cancel_btn.click()
                            time.sleep(0.5)
                            
                            if not modal.is_visible():
                                print("✅ Cancel button works - modal closed")
                            else:
                                print("❌ Cancel button clicked but modal still visible")
                        else:
                            print("❌ Cancel button not found or not visible")
                            
                    else:
                        print("❌ Modal did not open via model name click")
                        
                else:
                    print("❌ Model name display exists but is not visible")
            except Exception as e:
                print(f"❌ Error with model name display: {e}")
        else:
            print("❌ Model name display not found")
            
        # Test keyboard shortcuts
        print("🔍 Testing keyboard shortcut Ctrl+Shift+M...")
        page.keyboard.press('Control+Shift+M')
        time.sleep(1)
        
        modal = page.locator('#model-selector-modal')
        if modal.is_visible():
            print("✅ Ctrl+Shift+M works - modal opened")
            screenshot_with_markdown(page, "model_selector_opened_via_keyboard")
            
            # Test escape key
            print("🔍 Testing escape key...")
            page.keyboard.press('Escape')
            time.sleep(0.5)
            
            if not modal.is_visible():
                print("✅ Escape key works - modal closed")
            else:
                print("❌ Escape key pressed but modal still visible")
                
        else:
            print("❌ Ctrl+Shift+M doesn't work")
            
        # Test Alt+M
        print("🔍 Testing keyboard shortcut Alt+M...")
        page.keyboard.press('Alt+M')
        time.sleep(1)
        
        if modal.is_visible():
            print("✅ Alt+M works - modal opened")
            
            # Test clicking outside modal
            print("🔍 Testing click outside modal...")
            # Click on the modal backdrop (not the content)
            modal.click(position={'x': 10, 'y': 10})
            time.sleep(0.5)
            
            if not modal.is_visible():
                print("✅ Click outside works - modal closed")
            else:
                print("❌ Clicked outside but modal still visible")
        else:
            print("❌ Alt+M doesn't work")
            
        print("🔍 Test complete. Keeping browser open for 5 seconds...")
        time.sleep(5)
        
        browser.close()

if __name__ == "__main__":
    test_model_selector_functionality()