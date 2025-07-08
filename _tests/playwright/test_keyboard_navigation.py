#!/usr/bin/env python3
"""
Debug keyboard navigation issue
"""
import time
from playwright.sync_api import sync_playwright

def test_keyboard_navigation():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=500)
        page = browser.new_page()
        
        # Enable detailed console logging
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        
        page.goto("http://localhost:8000")
        page.wait_for_load_state("networkidle", timeout=8000)
        
        time.sleep(3)
        
        # Close any auto-opened modals
        page.keyboard.press('Escape')
        time.sleep(0.5)
        
        print("🔍 Testing keyboard navigation...")
        
        # Initialize ModelSelectionManager manually to ensure it's ready
        page.evaluate("""
            if (window.ModelSelectionManager && window.aiHackare && window.aiHackare.elements) {
                window.ModelSelectionManager.init(window.aiHackare.elements);
            }
        """)
        
        # Open modal
        page.keyboard.press('Meta+m')
        time.sleep(1)
        
        modal = page.locator('#model-selection-modal')
        if modal.is_visible():
            print("✅ Modal opened")
            
            # Add debugging to ModelSelectionManager
            page.evaluate("""
                // Add debugging to arrow key handling
                const originalHandleModalKeyboard = window.ModelSelectionManager.handleModalKeyboard;
                let debugIndex = 0;
                
                // Override the function to add logging
                document.addEventListener('keydown', function(e) {
                    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                        const visibleItems = document.querySelectorAll('.model-item:not(.filtered-out)');
                        console.log('🔍 Key:', e.key);
                        console.log('🔍 Visible items count:', visibleItems.length);
                        console.log('🔍 Current highlightedIndex before:', debugIndex);
                        
                        if (e.key === 'ArrowDown') {
                            debugIndex = Math.min(debugIndex + 1, visibleItems.length - 1);
                        } else if (e.key === 'ArrowUp') {
                            debugIndex = Math.max(debugIndex - 1, -1);
                        }
                        
                        console.log('🔍 New highlightedIndex after:', debugIndex);
                        
                        // Show which item should be highlighted
                        visibleItems.forEach((item, idx) => {
                            item.classList.remove('highlighted');
                            if (idx === debugIndex) {
                                item.classList.add('highlighted');
                                console.log('🔍 Highlighting item at visible index:', idx, 'Model:', item.querySelector('.model-name')?.textContent);
                            }
                        });
                    }
                });
            """)
            
            print("\\n🔍 Testing arrow key navigation...")
            print("Press Arrow Down 5 times and see what happens:")
            
            for i in range(5):
                print(f"\\nStep {i+1}: Pressing Arrow Down")
                page.keyboard.press('ArrowDown')
                time.sleep(1)  # Slow so we can observe
                
                # Check which item is highlighted
                highlighted = page.locator('.model-item.highlighted')
                if highlighted.count() > 0:
                    model_text = highlighted.locator('.model-name').inner_text()
                    print(f"  Highlighted model: {model_text}")
                else:
                    print("  No model highlighted")
            
            print("\\n🔍 Now testing Arrow Up...")
            for i in range(3):
                print(f"\\nStep {i+1}: Pressing Arrow Up")
                page.keyboard.press('ArrowUp')
                time.sleep(1)
                
                highlighted = page.locator('.model-item.highlighted')
                if highlighted.count() > 0:
                    model_text = highlighted.locator('.model-name').inner_text()
                    print(f"  Highlighted model: {model_text}")
                else:
                    print("  No model highlighted")
        
        print("\\n🔍 Keep browser open to manually test...")
        time.sleep(15)
        browser.close()

if __name__ == "__main__":
    test_keyboard_navigation()