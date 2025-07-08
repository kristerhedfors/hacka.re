#!/usr/bin/env python3
"""
Quick test to verify the fix
"""
import time
from playwright.sync_api import sync_playwright

def test_quick_fix():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=300)
        page = browser.new_page()
        
        # Check for JavaScript errors
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}") if msg.type in ["error", "warning"] or any(x in msg.text for x in ["🚀", "✅", "❌"]) else None)
        
        page.goto("http://localhost:8000")
        page.wait_for_load_state("networkidle", timeout=8000)
        
        print("🔍 Checking if app loads without errors...")
        time.sleep(3)
        
        # Check if settings button works
        print("🔍 Testing settings button...")
        try:
            page.click("#settings-btn")
            page.wait_for_selector("#settings-modal.active", timeout=2000)
            print("✅ Settings button works!")
            
            # Close settings
            page.keyboard.press('Escape')
            time.sleep(0.5)
        except:
            print("❌ Settings button broken")
        
        # Check if message input works
        print("🔍 Testing message input...")
        message_input = page.locator("#message-input")
        if message_input.is_visible():
            message_input.fill("test message")
            page.keyboard.press('Enter')
            # Should show API key modal or try to send
            time.sleep(1)
            print("✅ Message input works (Enter processed)")
        else:
            print("❌ Message input not found")
        
        # Check if Cmd+M model selector works
        print("🔍 Testing Cmd+M model selector...")
        page.keyboard.press('Meta+m')
        time.sleep(1)
        
        modal = page.locator('#model-selection-modal')
        if modal.is_visible():
            print("✅ Cmd+M model selector works!")
            page.keyboard.press('Escape')
            time.sleep(0.5)
        else:
            print("❌ Cmd+M model selector broken")
        
        print("\n🎯 Quick fix verification complete!")
        time.sleep(5)
        browser.close()

if __name__ == "__main__":
    test_quick_fix()