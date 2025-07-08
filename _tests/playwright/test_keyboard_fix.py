#!/usr/bin/env python3
"""
Test keyboard navigation fix - should now move one step at a time
"""
import os
import time
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

from test_utils import dismiss_welcome_modal, dismiss_settings_modal

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
API_KEY = os.getenv("OPENAI_API_KEY")

def setup_api_key(page):
    """Quick API setup"""
    print("🔧 Setting up API key...")
    
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
    print("✅ API setup complete")

def test_keyboard_fix():
    if not API_KEY:
        print("❌ No API key - skipping test")
        return
        
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=300)
        page = browser.new_page()
        
        page.goto("http://localhost:8000")
        page.wait_for_load_state("networkidle", timeout=8000)
        
        time.sleep(3)
        setup_api_key(page)
        
        print("\\n🔍 Testing FIXED keyboard navigation...")
        
        # Open modal
        page.keyboard.press('Meta+m')
        time.sleep(2)
        
        modal = page.locator('#model-selection-modal')
        if modal.is_visible():
            print("✅ Modal opened")
            
            visible_models = page.locator('.model-item:not(.filtered-out)')
            model_count = visible_models.count()
            print(f"📊 Found {model_count} visible models")
            
            if model_count > 0:
                # Add debugging
                page.evaluate("""
                    let stepCount = 0;
                    document.addEventListener('keydown', function(e) {
                        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                            stepCount++;
                            setTimeout(() => {
                                const highlighted = document.querySelector('.model-item.highlighted');
                                const allVisible = document.querySelectorAll('.model-item:not(.filtered-out)');
                                
                                if (highlighted) {
                                    const modelName = highlighted.querySelector('.model-name')?.textContent || 'Unknown';
                                    const visibleIndex = Array.from(allVisible).indexOf(highlighted);
                                    console.log(`✅ Step ${stepCount}: ${e.key} → "${modelName}" (index: ${visibleIndex})`);
                                } else {
                                    console.log(`❌ Step ${stepCount}: ${e.key} → No highlight`);
                                }
                            }, 10);
                        }
                    });
                """)
                
                print("\\n📝 Testing SEQUENTIAL navigation (should be 0,1,2,3...):")
                
                # Test 10 arrow down presses
                for i in range(10):
                    page.keyboard.press('ArrowDown')
                    time.sleep(0.6)
                
                print("\\n📝 Now testing Arrow Up:")
                for i in range(5):
                    page.keyboard.press('ArrowUp') 
                    time.sleep(0.6)
                    
                print("\\n🎯 Check console logs above:")
                print("✅ FIXED: Should show consecutive indices (0,1,2,3...)")
                print("❌ BROKEN: Would show skipping indices (1,3,5,7...)")
                    
            else:
                print("❌ No models loaded")
        else:
            print("❌ Modal didn't open")
        
        print("\\n🔍 Manual test time...")
        time.sleep(15)
        browser.close()

if __name__ == "__main__":
    test_keyboard_fix()