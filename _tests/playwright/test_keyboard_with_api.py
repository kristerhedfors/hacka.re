#!/usr/bin/env python3
"""
Test keyboard navigation with actual models loaded
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
    
    # Close any open modals first
    page.keyboard.press('Escape')
    time.sleep(0.5)
    
    page.click("#settings-btn")
    page.wait_for_selector("#settings-modal.active", timeout=5000)
    
    page.fill("#api-key-update", API_KEY)
    page.select_option("#base-url-select", "openai")
    page.click("#model-reload-btn")
    time.sleep(3)  # Wait for models to load
    
    page.click("#save-settings-btn")
    time.sleep(2)
    print("✅ API setup complete")

def test_keyboard_with_api():
    if not API_KEY:
        print("❌ No API key - skipping test")
        return
        
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=400)
        page = browser.new_page()
        
        # Enable console logging for debugging
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}") if any(x in msg.text for x in ["🔍", "❌", "✅"]) else None)
        
        page.goto("http://localhost:8000")
        page.wait_for_load_state("networkidle", timeout=8000)
        
        time.sleep(3)
        setup_api_key(page)
        
        print("\\n🔍 Testing keyboard navigation with loaded models...")
        
        # Open modal with Cmd+M
        page.keyboard.press('Meta+m')
        time.sleep(2)  # Wait for models to load
        
        modal = page.locator('#model-selection-modal')
        if modal.is_visible():
            print("✅ Modal opened")
            
            # Check how many models are visible
            visible_models = page.locator('.model-item:not(.filtered-out)')
            model_count = visible_models.count()
            print(f"📊 Found {model_count} visible models")
            
            if model_count > 0:
                # Add debugging to track highlighting
                page.evaluate("""
                    let stepCount = 0;
                    const originalKeyHandler = document.querySelector('#model-search-input');
                    
                    document.addEventListener('keydown', function(e) {
                        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                            stepCount++;
                            setTimeout(() => {
                                const highlighted = document.querySelector('.model-item.highlighted');
                                const allVisible = document.querySelectorAll('.model-item:not(.filtered-out)');
                                
                                console.log(`🔍 Step ${stepCount}: ${e.key}`);
                                console.log(`🔍 Visible models: ${allVisible.length}`);
                                
                                if (highlighted) {
                                    const modelName = highlighted.querySelector('.model-name')?.textContent || 'Unknown';
                                    const visibleIndex = Array.from(allVisible).indexOf(highlighted);
                                    console.log(`🔍 Highlighted: "${modelName}" (visible index: ${visibleIndex})`);
                                } else {
                                    console.log(`🔍 No model highlighted`);
                                }
                            }, 10);
                        }
                    });
                """)
                
                print("\\n📝 Testing arrow navigation step by step:")
                print("(Watch console for detailed logs)")
                
                # Test arrow down navigation
                for i in range(min(6, model_count + 1)):
                    print(f"\\nStep {i+1}: Arrow Down")
                    page.keyboard.press('ArrowDown')
                    time.sleep(0.8)  # Slower for observation
                
                print("\\n📝 Now testing Arrow Up:")
                for i in range(3):
                    print(f"\\nStep {i+1}: Arrow Up")
                    page.keyboard.press('ArrowUp')
                    time.sleep(0.8)
                    
            else:
                print("❌ No models loaded")
        else:
            print("❌ Modal didn't open")
        
        print("\\n🔍 Keep browser open for manual testing...")
        time.sleep(20)
        browser.close()

if __name__ == "__main__":
    test_keyboard_with_api()