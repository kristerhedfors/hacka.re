"""Debug MCP form visibility issue"""
import pytest
from playwright.sync_api import Page, expect
import time
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown


def test_debug_mcp_form_visibility(page: Page, serve_hacka_re):
    """Debug the MCP form visibility issue"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Open MCP modal
    page.locator("#mcp-servers-btn").click()
    expect(page.locator("#mcp-servers-modal")).to_be_visible()
    
    # Check if form is visible
    form = page.locator("#mcp-server-form")
    print(f"Form visible: {form.is_visible()}")
    
    # Check form fields
    fields = [
        "#mcp-server-name",
        "#mcp-transport-type", 
        "#mcp-server-command",
        "#mcp-server-url"
    ]
    
    for field_id in fields:
        field = page.locator(field_id)
        print(f"{field_id} visible: {field.is_visible()}")
        if field.is_visible():
            print(f"  {field_id} enabled: {field.is_enabled()}")
        
    # Check transport-specific divs
    transport_divs = [
        ".transport-stdio",
        ".transport-sse", 
        ".transport-oauth"
    ]
    
    for div_class in transport_divs:
        divs = page.locator(div_class)
        count = divs.count()
        print(f"{div_class} count: {count}")
        for i in range(count):
            div = divs.nth(i)
            print(f"  {div_class}[{i}] visible: {div.is_visible()}")
    
    # Check if OAuth integration is loaded
    page.evaluate("""
        console.log('MCPOAuthIntegration available:', !!window.MCPOAuthIntegration);
        console.log('MCPManager available:', !!window.MCPManager);
        console.log('MCPUIManager available:', !!window.MCPUIManager);
    """)
    
    screenshot_with_markdown(page, "debug_mcp_form_visibility", {
        "Status": "Debugging MCP form visibility",
        "Component": "MCP Form Debug",
        "Test Phase": "Form State Investigation"
    })