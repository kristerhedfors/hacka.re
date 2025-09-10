"""
Debug YOLO mode enablement - why is it not actually working?
"""
import pytest
import time
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_debug_yolo_enablement(page: Page, serve_hacka_re):
    """Debug why YOLO mode appears enabled but function modals still appear"""
    
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Open settings modal
    settings_btn = page.locator("#settings-btn")
    settings_btn.click()
    page.wait_for_selector("#settings-modal", state="visible", timeout=5000)
    
    screenshot_with_markdown(page, "debug_yolo_before", {
        "Step": "Before YOLO mode interaction",
        "Status": "Settings modal opened"
    })
    
    # Find YOLO checkbox
    yolo_checkbox = page.locator("#yolo-mode")
    print(f"YOLO checkbox found: {yolo_checkbox.count()}")
    
    if yolo_checkbox.count() > 0:
        initial_state = yolo_checkbox.is_checked()
        print(f"Initial YOLO state: {initial_state}")
        
        # Try different ways to enable it
        print("Method 1: Regular click")
        yolo_checkbox.click()
        time.sleep(1)
        state_after_click = yolo_checkbox.is_checked()
        print(f"State after click: {state_after_click}")
        
        screenshot_with_markdown(page, "debug_yolo_after_click", {
            "Step": "After clicking YOLO checkbox",
            "Initial State": str(initial_state),
            "After Click": str(state_after_click)
        })
        
        if not state_after_click:
            print("Method 2: Force click")
            yolo_checkbox.click(force=True)
            time.sleep(1)
            state_after_force = yolo_checkbox.is_checked()
            print(f"State after force click: {state_after_force}")
            
            if not state_after_force:
                print("Method 3: JavaScript click")
                page.evaluate("document.getElementById('yolo-mode').click()")
                time.sleep(1)
                state_after_js = yolo_checkbox.is_checked()
                print(f"State after JS click: {state_after_js}")
                
                if not state_after_js:
                    print("Method 4: JavaScript property set")
                    page.evaluate("document.getElementById('yolo-mode').checked = true")
                    time.sleep(1)
                    state_after_js_prop = yolo_checkbox.is_checked()
                    print(f"State after JS property set: {state_after_js_prop}")
                    
                    # Try triggering change event
                    page.evaluate("""
                        const checkbox = document.getElementById('yolo-mode');
                        checkbox.checked = true;
                        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                        checkbox.dispatchEvent(new Event('input', { bubbles: true }));
                    """)
                    time.sleep(1)
                    state_after_js_event = yolo_checkbox.is_checked()
                    print(f"State after JS with events: {state_after_js_event}")
        
        # Check final state
        final_state = yolo_checkbox.is_checked()
        print(f"Final YOLO state: {final_state}")
        
        # Look for any visual indicators that YOLO is enabled
        yolo_text = page.locator("text=YOLO mode")
        yolo_container = yolo_text.locator("..")
        container_text = yolo_container.text_content()
        print(f"YOLO container text: '{container_text}'")
        
        # Check if text changes from "Disabled" to something else
        if "Disabled" in container_text:
            print("⚠️ YOLO still shows 'Disabled' - not actually enabled!")
        elif "Enabled" in container_text:
            print("✅ YOLO shows 'Enabled'")
        else:
            print(f"? YOLO text unclear: {container_text}")
    
    # Close settings and test if YOLO actually works
    close_settings = page.locator("#close-settings")
    close_settings.click()
    page.wait_for_selector("#settings-modal", state="hidden", timeout=5000)
    
    screenshot_with_markdown(page, "debug_yolo_final", {
        "Step": "After YOLO configuration attempt",
        "Final State": str(final_state) if 'final_state' in locals() else "unknown",
        "Status": "Ready to test if YOLO actually works"
    })

if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s", "--timeout=300"])