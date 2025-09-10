"""
Debug GitHub MCP modal to see what connectors are available
"""
import pytest
import time
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_debug_github_mcp_modal(page: Page, serve_hacka_re):
    """Debug what's in the MCP modal"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Open MCP servers modal
    mcp_btn = page.locator("#mcp-servers-btn")
    expect(mcp_btn).to_be_visible()
    mcp_btn.click()
    
    page.wait_for_selector("#mcp-servers-modal", state="visible", timeout=5000)
    
    # Get full modal content
    modal = page.locator("#mcp-servers-modal")
    modal_content = modal.text_content()
    
    print("=== MCP MODAL CONTENT ===")
    print(modal_content)
    print("=========================")
    
    # Look for all buttons
    all_buttons = modal.locator("button")
    print(f"Total buttons found: {all_buttons.count()}")
    
    for i in range(all_buttons.count()):
        button = all_buttons.nth(i)
        button_text = button.text_content()
        button_id = button.get_attribute("id") or "no-id"
        print(f"Button {i}: text='{button_text}', id='{button_id}'")
    
    # Look specifically for Connect buttons
    connect_buttons = modal.locator("button:has-text('Connect')")
    print(f"Connect buttons found: {connect_buttons.count()}")
    
    for i in range(connect_buttons.count()):
        button = connect_buttons.nth(i)
        button_text = button.text_content()
        print(f"Connect button {i}: '{button_text}'")
    
    # Look for any text containing "GitHub"
    github_elements = modal.locator("text=*GitHub*")
    print(f"GitHub text elements found: {github_elements.count()}")
    
    for i in range(github_elements.count()):
        element = github_elements.nth(i)
        element_text = element.text_content()
        print(f"GitHub element {i}: '{element_text}'")
    
    screenshot_with_markdown(page, "debug_github_mcp_modal", {
        "Total Buttons": str(all_buttons.count()),
        "Connect Buttons": str(connect_buttons.count()),
        "GitHub Elements": str(github_elements.count()),
        "Modal Content Preview": modal_content[:200] + "..." if len(modal_content) > 200 else modal_content
    })

if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s", "--timeout=300"])