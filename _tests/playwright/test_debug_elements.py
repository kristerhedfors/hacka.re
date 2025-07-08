#!/usr/bin/env python3
"""
Debug test to check elements object
"""
import time
from playwright.sync_api import sync_playwright

def test_debug_elements():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=500)
        page = browser.new_page()
        
        # Enable console logging
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        
        page.goto("http://localhost:8000")
        page.wait_for_load_state("networkidle", timeout=10000)
        
        print("🔍 Debugging elements object...")
        
        # Check what elements are available
        elements_check = page.evaluate("""
            () => {
                if (!window.aiHackare || !window.aiHackare.elements) {
                    return { error: 'aiHackare or elements not available' };
                }
                
                const elements = window.aiHackare.elements;
                const modelSelectionElements = {
                    modelSelectionModal: !!elements.modelSelectionModal,
                    closeModelSelectionModal: !!elements.closeModelSelectionModal,
                    modelSearchInput: !!elements.modelSearchInput,
                    modelCardInfo: !!elements.modelCardInfo,
                    modelListContainer: !!elements.modelListContainer,
                    modelSelectionCancel: !!elements.modelSelectionCancel,
                    modelSelectionSelect: !!elements.modelSelectionSelect
                };
                
                // Check if DOM elements actually exist
                const domCheck = {
                    modalExists: !!document.getElementById('model-selection-modal'),
                    searchExists: !!document.getElementById('model-search-input'),
                    listExists: !!document.getElementById('model-list-container')
                };
                
                return { elements: modelSelectionElements, dom: domCheck };
            }
        """)
        
        print(f"Elements check result: {elements_check}")
        
        # Try manual initialization
        print("🔍 Trying manual initialization...")
        init_result = page.evaluate("""
            () => {
                if (!window.ModelSelectionManager || !window.aiHackare) {
                    return { error: 'Missing dependencies' };
                }
                
                try {
                    window.ModelSelectionManager.init(window.aiHackare.elements);
                    return { success: true };
                } catch (error) {
                    return { error: error.toString() };
                }
            }
        """)
        
        print(f"Manual init result: {init_result}")
        
        # Now try showModal again
        if init_result.get('success'):
            print("🔍 Trying showModal after manual init...")
            try:
                page.evaluate("window.ModelSelectionManager.showModal()")
                time.sleep(2)
                
                modal_visible = page.locator('#model-selection-modal.active').is_visible()
                print(f"Modal visible: {modal_visible}")
                
                if modal_visible:
                    print("✅ Success! Modal is working!")
                    page.screenshot(path="_tests/playwright/videos/modal_working.png")
                    
                    # Test Cmd+M
                    page.keyboard.press('Escape')  # Close first
                    time.sleep(0.5)
                    
                    page.keyboard.press('Meta+m')  # Try Cmd+M
                    time.sleep(1)
                    
                    cmd_m_works = page.locator('#model-selection-modal.active').is_visible()
                    print(f"Cmd+M works: {cmd_m_works}")
                    
                    if cmd_m_works:
                        page.screenshot(path="_tests/playwright/videos/cmd_m_working.png")
                
            except Exception as e:
                print(f"❌ Error: {e}")
        
        print("\\n🔍 Keeping browser open for 15 seconds...")
        time.sleep(15)
        browser.close()

if __name__ == "__main__":
    test_debug_elements()