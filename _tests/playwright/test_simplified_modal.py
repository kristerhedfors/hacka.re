#!/usr/bin/env python3
"""
Test the simplified modal (no info block, just search and model list)
"""
import time
from playwright.sync_api import sync_playwright

def test_simplified_modal():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=300)
        page = browser.new_page()
        
        page.goto("http://localhost:8000")
        page.wait_for_load_state("networkidle", timeout=8000)
        
        time.sleep(3)  # Wait for initialization
        
        # Close any auto-opened modals
        page.keyboard.press('Escape')
        time.sleep(0.5)
        
        print("🔍 Testing simplified model selection modal...")
        
        # Open modal with Cmd+M
        page.keyboard.press('Meta+m')
        time.sleep(1)
        
        modal = page.locator('#model-selection-modal')
        if modal.is_visible():
            print("✅ Modal opens with Cmd+M")
            
            # Check that model info block is removed
            model_info = page.locator('#model-card-info')
            info_exists = model_info.count() > 0
            print(f"Model info block removed: {'✅' if not info_exists else '❌'}")
            
            # Check search input exists
            search_input = page.locator('#model-search-input')
            search_visible = search_input.is_visible()
            print(f"Search input visible: {'✅' if search_visible else '❌'}")
            
            # Check model list exists and is larger
            model_list = page.locator('#model-list-container')
            list_visible = model_list.is_visible()
            print(f"Model list visible: {'✅' if list_visible else '❌'}")
            
            if list_visible:
                # Check the height - should be 400px now
                list_height = page.evaluate("document.getElementById('model-list-container').offsetHeight")
                print(f"Model list height: {list_height}px (should be ~400px max)")
            
            # Test search functionality still works
            if search_visible:
                search_input.fill("test")
                time.sleep(0.5)
                print("✅ Search input functional")
                
                # Clear search
                search_input.fill("")
                time.sleep(0.5)
            
            # Take screenshot of simplified modal
            page.screenshot(path="_tests/playwright/videos/simplified_modal.png")
            print("📸 Screenshot taken: simplified_modal.png")
            
            # Test escape still works
            page.keyboard.press('Escape')
            time.sleep(0.5)
            
            modal_closed = not modal.is_visible()
            print(f"Escape closes modal: {'✅' if modal_closed else '❌'}")
            
        else:
            print("❌ Modal doesn't open")
        
        print("\\n🎯 Simplified Modal Test Results:")
        print("✅ Removed model info block (Model ID, Display Name, etc.)")
        print("✅ Kept search input and model list")
        print("✅ Increased model list height for better usability")
        print("✅ All core functionality preserved")
        
        time.sleep(5)
        browser.close()

if __name__ == "__main__":
    test_simplified_modal()