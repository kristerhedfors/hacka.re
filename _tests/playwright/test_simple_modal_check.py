#!/usr/bin/env python3
"""
Simple test to check if the new model selection modal loads
"""
import time
from playwright.sync_api import sync_playwright

def test_simple_modal_check():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=500)
        page = browser.new_page()
        
        # Enable console logging
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        
        page.goto("http://localhost:8000")
        page.wait_for_load_state("networkidle", timeout=10000)
        
        print("🔍 Checking if ModelSelectionManager is available...")
        
        # Check if ModelSelectionManager is available
        manager_available = page.evaluate("window.ModelSelectionManager !== undefined")
        print(f"ModelSelectionManager available: {manager_available}")
        
        # Check if modal element exists
        modal_exists = page.locator('#model-selection-modal').count() > 0
        print(f"Model selection modal element exists: {modal_exists}")
        
        # Check if new DOM elements exist
        search_input_exists = page.locator('#model-search-input').count() > 0
        print(f"Search input exists: {search_input_exists}")
        
        model_list_exists = page.locator('#model-list-container').count() > 0
        print(f"Model list container exists: {model_list_exists}")
        
        # Try to call ModelSelectionManager.showModal directly
        if manager_available:
            print("🔍 Trying to show modal directly...")
            try:
                page.evaluate("window.ModelSelectionManager.showModal()")
                time.sleep(2)
                
                modal_visible = page.locator('#model-selection-modal.active').is_visible()
                print(f"Modal visible after direct call: {modal_visible}")
                
                if modal_visible:
                    print("✅ Modal works! Taking screenshot...")
                    page.screenshot(path="_tests/playwright/videos/modal_direct_call.png")
                    
                    # Try to close with escape
                    page.keyboard.press('Escape')
                    time.sleep(0.5)
                    modal_closed = not page.locator('#model-selection-modal.active').is_visible()
                    print(f"Modal closes with Escape: {modal_closed}")
                else:
                    print("❌ Modal not visible")
                    
            except Exception as e:
                print(f"❌ Error calling showModal: {e}")
        
        # Check aiHackare integration
        ai_hackare_available = page.evaluate("window.aiHackare !== undefined")
        print(f"aiHackare available: {ai_hackare_available}")
        
        if ai_hackare_available:
            elements_available = page.evaluate("window.aiHackare.elements !== undefined")
            print(f"aiHackare.elements available: {elements_available}")
        
        print("\\n🔍 Keeping browser open for 10 seconds...")
        time.sleep(10)
        browser.close()

if __name__ == "__main__":
    test_simple_modal_check()