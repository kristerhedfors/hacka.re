"""
Debug GitHub PAT input field to find the correct ID and selectors
"""
import pytest
import time
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_debug_github_input_field(page: Page, serve_hacka_re):
    """Debug GitHub PAT input field selectors"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Open MCP servers modal
    mcp_btn = page.locator("#mcp-servers-btn")
    mcp_btn.click()
    page.wait_for_selector("#mcp-servers-modal", state="visible", timeout=5000)
    
    # Click first Connect button (GitHub)
    connect_buttons = page.locator("button:has-text('Connect')")
    github_connect = connect_buttons.nth(0)
    github_connect.click()
    time.sleep(3)
    
    # Wait for the API key input modal
    page.wait_for_selector("#service-apikey-input-modal", state="visible", timeout=10000)
    
    # Find all input fields in the modal
    modal = page.locator("#service-apikey-input-modal")
    all_inputs = modal.locator("input")
    
    print(f"=== GITHUB PAT INPUT FIELD DEBUG ===")
    print(f"Total input fields in modal: {all_inputs.count()}")
    
    for i in range(all_inputs.count()):
        input_field = all_inputs.nth(i)
        input_id = input_field.get_attribute("id") or "no-id"
        input_placeholder = input_field.get_attribute("placeholder") or "no-placeholder"
        input_type = input_field.get_attribute("type") or "no-type"
        input_name = input_field.get_attribute("name") or "no-name"
        input_class = input_field.get_attribute("class") or "no-class"
        
        print(f"Input {i}:")
        print(f"  ID: '{input_id}'")
        print(f"  Placeholder: '{input_placeholder}'")
        print(f"  Type: '{input_type}'")
        print(f"  Name: '{input_name}'")
        print(f"  Class: '{input_class}'")
        print()
    
    # Get modal content to see the full structure
    modal_content = modal.text_content()
    print(f"Modal content preview:")
    print(modal_content[:300] + "..." if len(modal_content) > 300 else modal_content)
    
    screenshot_with_markdown(page, "github_input_debug", {
        "Step": "GitHub PAT input field debugging",
        "Input Fields": str(all_inputs.count()),
        "Modal Visible": str(modal.is_visible())
    })

if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s", "--timeout=300"])