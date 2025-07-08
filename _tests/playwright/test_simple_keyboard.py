#!/usr/bin/env python3
"""
Simple test to verify keyboard navigation is fixed
"""
import os
import time
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

from test_utils import dismiss_welcome_modal, dismiss_settings_modal

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
API_KEY = os.getenv("OPENAI_API_KEY")

def test_simple_keyboard():
    if not API_KEY:
        print("❌ No API key")
        return
        
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=400)
        page = browser.new_page()
        
        page.goto("http://localhost:8000")
        page.wait_for_load_state("networkidle", timeout=8000)
        time.sleep(3)
        
        # Setup API
        dismiss_welcome_modal(page)
        dismiss_settings_modal(page)
        page.keyboard.press('Escape')
        time.sleep(0.5)
        
        page.click("#settings-btn")
        page.wait_for_selector("#settings-modal.active", timeout=5000)
        page.fill("#api-key-update", API_KEY)
        page.select_option("#base-url-select", "openai")
        page.click("#model-reload-btn")
        time.sleep(3)
        page.click("#save-settings-btn")
        time.sleep(2)
        
        # Test navigation
        print("\\n🔍 Testing keyboard navigation fix...")
        page.keyboard.press('Meta+m')
        time.sleep(2)
        
        # Get the model names in order to verify sequential navigation
        models = page.locator('.model-item:not(.filtered-out) .model-name').all()
        if len(models) > 5:
            print(f"Found {len(models)} models")
            
            # Get first 5 model names
            model_names = [models[i].inner_text() for i in range(5)]
            print("First 5 models:")
            for i, name in enumerate(model_names):
                print(f"  {i}: {name}")
            
            print("\\nTesting arrow down navigation:")
            
            # Press arrow down 4 times and check which models get highlighted
            highlighted_models = []
            
            for step in range(5):
                page.keyboard.press('ArrowDown')
                time.sleep(0.5)
                
                # Get highlighted model
                highlighted = page.locator('.model-item.highlighted .model-name')
                if highlighted.count() > 0:
                    model_name = highlighted.inner_text()
                    highlighted_models.append(model_name)
                    print(f"  Step {step+1}: {model_name}")
                else:
                    highlighted_models.append("None")
                    print(f"  Step {step+1}: No highlight")
            
            # Check if navigation is sequential
            print("\\n🎯 Results Analysis:")
            
            # The first highlighted should be index 0, second should be index 1, etc.
            sequential = True
            for i, highlighted_name in enumerate(highlighted_models):
                if i < len(model_names) and highlighted_name != model_names[i]:
                    sequential = False
                    break
            
            if sequential:
                print("✅ FIXED: Navigation is sequential (one step at a time)")
            else:
                print("❌ BROKEN: Navigation is still skipping steps")
                print("Expected sequence:", model_names)
                print("Actual sequence:  ", highlighted_models)
        
        print("\\n🔧 Manual test - press arrow keys to verify...")
        time.sleep(10)
        browser.close()

if __name__ == "__main__":
    test_simple_keyboard()