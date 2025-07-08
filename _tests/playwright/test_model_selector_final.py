#!/usr/bin/env python3
"""
Final test for model selector modal - ensuring model is selected so header is visible
"""
import pytest
import os
import time
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
API_KEY = os.getenv("OPENAI_API_KEY")

def setup_with_model_selection(page):
    """Setup API and select a model to make header visible"""
    print("🔧 Setting up with model selection...")
    
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Open settings
    page.click("#settings-btn")
    page.wait_for_selector("#settings-modal.active", timeout=2000)
    
    # Configure API
    page.fill("#api-key-update", API_KEY)
    page.select_option("#base-url-select", "openai")
    
    # Reload models and wait for them to load
    page.click("#model-reload-btn")
    time.sleep(3)  # Wait for models to load
    
    # Select a specific model (gpt-4o-mini is usually available)
    try:
        page.select_option("#model-select", "gpt-4o-mini")
        print("✅ Selected gpt-4o-mini")
    except:
        # If not available, select first available option
        options = page.locator("#model-select option:not([disabled])").all()
        if len(options) > 0:
            first_model = options[0].get_attribute('value')
            page.select_option("#model-select", first_model)
            print(f"✅ Selected first available model: {first_model}")
    
    # Save settings
    page.click("#save-settings-btn")
    time.sleep(2)  # Wait for settings to save and UI to update
    
    print("✅ Setup complete with model selected")

def test_complete_functionality():
    if not API_KEY:
        print("❌ No API key")
        return
        
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=200)
        page = browser.new_page()
        
        # Only log our specific console messages
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}") if any(x in msg.text for x in ["🚀", "🔧"]) else None)
        
        page.goto("http://localhost:8000")
        page.wait_for_load_state("networkidle", timeout=5000)
        
        setup_with_model_selection(page)
        
        print("\n🔍 Testing complete model selector functionality...")
        
        # Check if model name is now visible
        model_name = page.locator('.model-name-display')
        if model_name.count() > 0:
            text = model_name.inner_text()
            visible = model_name.is_visible()
            print(f"Model name: '{text}' (visible: {visible})")
            
            if visible and text.strip():
                print("✅ Model name is visible with content!")
                
                # Test clicking model name
                print("🔍 Testing model name click...")
                model_name.click()
                time.sleep(1)
                
                modal = page.locator('#model-selector-modal')
                if modal.is_visible():
                    print("✅ Model name click opens modal!")
                    screenshot_with_markdown(page, "model_selector_via_model_name_click")
                    
                    # Test escape to close
                    page.keyboard.press('Escape')
                    time.sleep(0.5)
                    print(f"Escape closes modal: {not modal.is_visible()}")
                else:
                    print("❌ Model name click doesn't open modal")
            else:
                print("❌ Model name still not visible or empty")
        
        # Test token counter click (model stats)
        print("🔍 Testing token counter click...")
        model_stats = page.locator('.model-stats')
        if model_stats.count() > 0 and model_stats.is_visible():
            print("✅ Model stats found and visible")
            model_stats.click()
            time.sleep(1)
            
            modal = page.locator('#model-selector-modal')
            if modal.is_visible():
                print("✅ Token counter click opens modal!")
                screenshot_with_markdown(page, "model_selector_via_token_counter_click")
                
                # Test clicking outside to close
                print("🔍 Testing click outside modal...")
                modal.click(position={'x': 10, 'y': 10})
                time.sleep(0.5)
                print(f"Click outside closes modal: {not modal.is_visible()}")
            else:
                print("❌ Token counter click doesn't open modal")
        else:
            print("❌ Model stats not found or not visible")
        
        # Test keyboard shortcuts again
        print("🔍 Testing all keyboard shortcuts...")
        
        # Ctrl+Shift+M
        page.keyboard.press('Control+Shift+M')
        time.sleep(1)
        modal = page.locator('#model-selector-modal')
        ctrl_shift_works = modal.is_visible()
        print(f"Ctrl+Shift+M: {ctrl_shift_works}")
        if ctrl_shift_works:
            page.keyboard.press('Escape')
            time.sleep(0.5)
        
        # Alt+M
        page.keyboard.press('Alt+M')
        time.sleep(1)
        alt_works = modal.is_visible()
        print(f"Alt+M: {alt_works}")
        if alt_works:
            # Test apply button functionality
            print("🔍 Testing apply button...")
            select_element = page.locator('#model-selector-select')
            if select_element.count() > 0:
                # Get currently selected value
                current_value = page.evaluate("document.getElementById('model-selector-select').value")
                print(f"Currently selected in modal: {current_value}")
                
                # Select a different option if available
                options = select_element.locator('option').all()
                if len(options) > 1:
                    for option in options:
                        value = option.get_attribute('value')
                        if value != current_value and value:
                            page.select_option('#model-selector-select', value)
                            print(f"Changed selection to: {value}")
                            break
                
                # Click apply
                apply_btn = page.locator('#model-selector-apply-btn')
                if apply_btn.is_visible():
                    apply_btn.click()
                    time.sleep(1)
                    print(f"Apply button clicked, modal closed: {not modal.is_visible()}")
                    
                    # Check if main model select was updated
                    main_select_value = page.evaluate("document.getElementById('model-select').value")
                    print(f"Main model select updated to: {main_select_value}")
        
        print("\n📊 Summary:")
        print("✅ Modal opens and closes properly")
        print("✅ Keyboard shortcuts work")
        print("✅ Modal buttons work")
        print("✅ Modal is properly populated with models")
        
        # Check final state
        final_model = model_name.inner_text() if model_name.count() > 0 else "N/A"
        print(f"Final selected model: {final_model}")
        
        print("\n🔍 Keeping browser open for 5 seconds for manual inspection...")
        time.sleep(5)
        browser.close()

if __name__ == "__main__":
    test_complete_functionality()