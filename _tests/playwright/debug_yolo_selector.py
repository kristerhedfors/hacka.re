"""
Debug YOLO mode selector in settings modal
"""
import pytest
import time
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_debug_yolo_selector(page: Page, serve_hacka_re):
    """Debug to find the correct YOLO mode selector"""
    
    # Navigate and setup
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Open settings modal
    settings_btn = page.locator("#settings-btn")
    expect(settings_btn).to_be_visible()
    settings_btn.click()
    
    page.wait_for_selector("#settings-modal", state="visible", timeout=5000)
    
    screenshot_with_markdown(page, "settings_modal_debug", {
        "Step": "Settings modal opened",
        "Purpose": "Find YOLO mode checkbox"
    })
    
    # Look for YOLO-related text
    yolo_text = page.locator("text=YOLO mode")
    print(f"YOLO text elements found: {yolo_text.count()}")
    
    for i in range(yolo_text.count()):
        element = yolo_text.nth(i)
        text_content = element.text_content()
        print(f"YOLO text {i}: '{text_content}'")
    
    # Look for the specific text pattern you mentioned
    yolo_pattern = page.locator("text=YOLO mode(Disabled: Prompt user for every function call)")
    print(f"YOLO pattern elements found: {yolo_pattern.count()}")
    
    # Try partial text match
    yolo_partial = page.locator("text*=YOLO mode")
    print(f"YOLO partial text elements found: {yolo_partial.count()}")
    
    for i in range(yolo_partial.count()):
        element = yolo_partial.nth(i)
        text_content = element.text_content()
        print(f"YOLO partial {i}: '{text_content}'")
    
    # Look for function approval text
    function_approval = page.locator("text*=function approval")
    print(f"Function approval elements found: {function_approval.count()}")
    
    for i in range(function_approval.count()):
        element = function_approval.nth(i)
        text_content = element.text_content()
        print(f"Function approval {i}: '{text_content}'")
    
    # Look for checkboxes in the settings modal
    checkboxes = page.locator("#settings-modal input[type='checkbox']")
    print(f"Total checkboxes found: {checkboxes.count()}")
    
    for i in range(checkboxes.count()):
        checkbox = checkboxes.nth(i)
        checkbox_id = checkbox.get_attribute("id") or "no-id"
        checkbox_name = checkbox.get_attribute("name") or "no-name"
        is_checked = checkbox.is_checked()
        
        # Get parent/container text to understand what this checkbox is for
        parent = checkbox.locator("..")
        parent_text = parent.text_content() or "no-text"
        
        print(f"Checkbox {i}: id='{checkbox_id}', name='{checkbox_name}', checked={is_checked}")
        print(f"  Parent text: '{parent_text[:100]}...'")
    
    # Try to find by the "Disabled: Prompt user" text
    disabled_prompt = page.locator("text*=Disabled: Prompt user")
    print(f"'Disabled: Prompt user' elements found: {disabled_prompt.count()}")
    
    for i in range(disabled_prompt.count()):
        element = disabled_prompt.nth(i)
        text_content = element.text_content()
        print(f"Disabled prompt {i}: '{text_content}'")
        
        # Look for nearby checkboxes
        container = element.locator("..")
        nearby_checkboxes = container.locator("input[type='checkbox']")
        print(f"  Nearby checkboxes: {nearby_checkboxes.count()}")
        
        for j in range(nearby_checkboxes.count()):
            cb = nearby_checkboxes.nth(j)
            cb_id = cb.get_attribute("id") or "no-id"
            print(f"    Checkbox {j}: id='{cb_id}'")

if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s", "--timeout=300"])