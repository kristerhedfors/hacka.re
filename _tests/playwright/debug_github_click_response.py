"""
Debug what happens when clicking GitHub Connect button
"""
import pytest
import time
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_debug_github_click_response(page: Page, serve_hacka_re):
    """Debug what happens when clicking GitHub Connect button"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Open MCP servers modal
    mcp_btn = page.locator("#mcp-servers-btn")
    mcp_btn.click()
    page.wait_for_selector("#mcp-servers-modal", state="visible", timeout=5000)
    
    screenshot_with_markdown(page, "before_github_click", {
        "Step": "Before clicking GitHub Connect",
        "Status": "MCP modal open"
    })
    
    # Click first Connect button (GitHub)
    connect_buttons = page.locator("button:has-text('Connect')")
    print(f"Found {connect_buttons.count()} Connect buttons")
    
    github_connect = connect_buttons.nth(0)
    print("Clicking GitHub Connect button...")
    github_connect.click()
    
    # Wait a moment
    time.sleep(2)
    
    screenshot_with_markdown(page, "after_github_click", {
        "Step": "After clicking GitHub Connect",
        "Status": "Checking what appeared"
    })
    
    # Check for all visible modals
    print("=== CHECKING ALL VISIBLE MODALS ===")
    all_modals = page.locator("[id*='modal']")
    print(f"Total modals found: {all_modals.count()}")
    
    for i in range(all_modals.count()):
        modal = all_modals.nth(i)
        modal_id = modal.get_attribute("id")
        is_visible = modal.is_visible()
        print(f"Modal {i}: id='{modal_id}', visible={is_visible}")
        
        if is_visible:
            modal_content = modal.text_content()
            print(f"  Content preview: {modal_content[:150]}...")
            
            # Look for input fields in this modal
            inputs = modal.locator("input")
            print(f"  Input fields: {inputs.count()}")
            
            for j in range(inputs.count()):
                input_field = inputs.nth(j)
                input_id = input_field.get_attribute("id") or "no-id"
                input_placeholder = input_field.get_attribute("placeholder") or "no-placeholder"
                print(f"    Input {j}: id='{input_id}', placeholder='{input_placeholder}'")
    
    # Check for any elements with "github" text (case insensitive)
    github_elements = page.locator("text=/github/i")
    print(f"\\nElements containing 'github': {github_elements.count()}")
    
    # Check for any elements with "token" text
    token_elements = page.locator("text=/token/i")
    print(f"Elements containing 'token': {token_elements.count()}")
    
    # Check for any elements with "access" text
    access_elements = page.locator("text=/access/i")
    print(f"Elements containing 'access': {access_elements.count()}")

if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s", "--timeout=300"])