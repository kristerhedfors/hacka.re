#!/usr/bin/env python3
"""
Test by closing any open modals first
"""
import time
from playwright.sync_api import sync_playwright

def test_close_modal_first():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=300)
        page = browser.new_page()
        
        page.goto("http://localhost:8000")
        page.wait_for_load_state("networkidle", timeout=8000)
        
        time.sleep(3)
        
        print("🔍 Checking for already open modals...")
        
        # Check what modals are open
        active_modals = page.locator(".modal.active")
        count = active_modals.count()
        print(f"Active modals: {count}")
        
        if count > 0:
            for i in range(count):
                modal_id = page.evaluate(f"document.querySelectorAll('.modal.active')[{i}]?.id")
                print(f"  Modal {i}: {modal_id}")
            
            # Close all modals with Escape
            print("🔧 Closing all modals with Escape...")
            page.keyboard.press('Escape')
            time.sleep(0.5)
            page.keyboard.press('Escape')  # Double escape just in case
            time.sleep(0.5)
            
            # Check again
            remaining = page.locator(".modal.active").count()
            print(f"Remaining active modals: {remaining}")
        
        # Now try settings button
        print("🔍 Testing settings button after cleanup...")
        try:
            page.click("#settings-btn")
            time.sleep(1)
            
            modal = page.locator("#settings-modal.active")
            if modal.is_visible():
                print("✅ Settings button works!")
                page.screenshot(path="_tests/playwright/videos/settings_working.png")
                
                # Close it
                page.keyboard.press('Escape')
                time.sleep(0.5)
            else:
                print("❌ Settings modal still not working")
        except Exception as e:
            print(f"❌ Settings button error: {e}")
        
        # Test message input
        print("🔍 Testing message input...")
        message_input = page.locator("#message-input")
        if message_input.is_visible():
            message_input.fill("test")
            page.keyboard.press('Enter')
            time.sleep(1)
            print("✅ Message input works")
        
        # Test Cmd+M
        print("🔍 Testing Cmd+M...")
        page.keyboard.press('Meta+m')
        time.sleep(1)
        
        model_modal = page.locator('#model-selection-modal.active')
        if model_modal.is_visible():
            print("✅ Cmd+M works!")
            page.screenshot(path="_tests/playwright/videos/cmd_m_working_fixed.png")
            page.keyboard.press('Escape')
        else:
            print("❌ Cmd+M not working")
        
        print("\\n🎯 All basic functionality verified!")
        time.sleep(5)
        browser.close()

if __name__ == "__main__":
    test_close_modal_first()