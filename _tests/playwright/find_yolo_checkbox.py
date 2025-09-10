"""
Find the exact YOLO mode checkbox selector
"""
import pytest
import time
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal

def test_find_yolo_checkbox(page: Page, serve_hacka_re):
    """Find the exact YOLO mode checkbox"""
    
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Open settings modal
    settings_btn = page.locator("#settings-btn")
    settings_btn.click()
    page.wait_for_selector("#settings-modal", state="visible", timeout=5000)
    
    # Find YOLO mode text element
    yolo_text = page.locator("text=YOLO mode")
    print(f"Found YOLO text element: {yolo_text.count()}")
    
    if yolo_text.count() > 0:
        # Get the parent container of the YOLO text
        yolo_container = yolo_text.locator("..")
        print("Looking for checkbox in YOLO container...")
        
        # Find checkbox within the container
        checkbox_in_container = yolo_container.locator("input[type='checkbox']")
        print(f"Checkboxes in YOLO container: {checkbox_in_container.count()}")
        
        for i in range(checkbox_in_container.count()):
            cb = checkbox_in_container.nth(i)
            cb_id = cb.get_attribute("id") or "no-id"
            cb_name = cb.get_attribute("name") or "no-name"
            cb_class = cb.get_attribute("class") or "no-class"
            is_checked = cb.is_checked()
            
            print(f"Checkbox {i}: id='{cb_id}', name='{cb_name}', class='{cb_class}', checked={is_checked}")
            
            # Try clicking it to see if it's the right one
            try:
                cb.click()
                print(f"Successfully clicked checkbox {i}")
                time.sleep(1)
                
                # Check if it's now checked
                new_state = cb.is_checked()
                print(f"New state after click: {new_state}")
                
                # Click again to restore original state
                cb.click()
                final_state = cb.is_checked()
                print(f"Final state after second click: {final_state}")
                
            except Exception as e:
                print(f"Failed to click checkbox {i}: {e}")

if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s", "--timeout=300"])