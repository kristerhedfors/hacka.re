#!/usr/bin/env python3
"""
Debug settings button issue
"""
import time
from playwright.sync_api import sync_playwright

def test_settings_debug():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=500)
        page = browser.new_page()
        
        page.goto("http://localhost:8000")
        page.wait_for_load_state("networkidle", timeout=8000)
        
        time.sleep(3)  # Wait for initialization
        
        print("🔍 Debugging settings button...")
        
        # Check if settings button exists
        settings_btn = page.locator("#settings-btn")
        print(f"Settings button exists: {settings_btn.count() > 0}")
        print(f"Settings button visible: {settings_btn.is_visible()}")
        
        # Try clicking with more patience
        if settings_btn.is_visible():
            print("Clicking settings button...")
            settings_btn.click()
            
            # Wait longer and check if modal appears
            time.sleep(2)
            
            modal = page.locator("#settings-modal")
            print(f"Settings modal exists: {modal.count() > 0}")
            print(f"Settings modal visible: {modal.is_visible()}")
            print(f"Settings modal has active class: {modal.locator('.active').count() > 0}")
            
            # Check for any modal
            active_modal = page.locator(".modal.active")
            print(f"Any active modal: {active_modal.count() > 0}")
            
            if active_modal.count() > 0:
                modal_id = page.evaluate("document.querySelector('.modal.active')?.id")
                print(f"Active modal ID: {modal_id}")
        
        print("\\n🔍 Manual check - keeping browser open...")
        time.sleep(10)
        browser.close()

if __name__ == "__main__":
    test_settings_debug()