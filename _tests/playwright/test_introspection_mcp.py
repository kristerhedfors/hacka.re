"""
Test Introspection MCP functionality - verifies that the built-in Introspection MCP
tools work correctly for exploring the hacka.re codebase.
"""

import json
import time
import pytest
from test_utils import dismiss_welcome_modal, configure_api_key_via_ui, screenshot_with_markdown
from playwright.sync_api import Page, expect


def enable_introspection_mcp(page: Page):
    """Enable the Introspection MCP service"""
    # Open MCP servers modal
    mcp_btn = page.locator("#mcp-servers-btn")
    expect(mcp_btn).to_be_visible()
    mcp_btn.click()
    
    # Wait for modal to open
    page.wait_for_selector("#mcp-servers-modal", state="visible", timeout=5000)
    
    # Click on Advanced tab/section to reveal the Introspection MCP option
    advanced_tab = page.locator("text=Advanced").first
    if advanced_tab.is_visible():
        advanced_tab.click()
        page.wait_for_timeout(500)  # Wait for section to expand
    
    # Scroll to make sure the button is in view
    introspection_section = page.locator("#mcp-introspection-section")
    if introspection_section.is_visible():
        introspection_section.scroll_into_view_if_needed()
    
    # Find and click the Introspection MCP enable button
    enable_btn = page.locator("#mcp-introspection-enable")
    expect(enable_btn).to_be_visible()
    
    # Check current state
    if enable_btn.text_content() == "Enable":
        enable_btn.click()
        # Wait for status change
        page.wait_for_timeout(1000)
        
        # Verify it changed to "Disable"
        expect(enable_btn).to_have_text("Disable")
        print("✅ Introspection MCP enabled")
    else:
        print("✅ Introspection MCP already enabled")
    
    # Close modal
    close_btn = page.locator("#close-mcp-servers-modal")
    close_btn.click()
    page.wait_for_selector("#mcp-servers-modal", state="hidden", timeout=5000)


def enable_yolo_mode(page: Page):
    """Enable YOLO mode for automatic function execution"""
    # Open settings modal
    settings_btn = page.locator("#settings-btn")
    expect(settings_btn).to_be_visible()
    settings_btn.click()
    
    # Wait for modal
    page.wait_for_selector("#settings-modal", state="visible", timeout=5000)
    
    # Enable YOLO mode checkbox with dialog handling
    yolo_checkbox = page.locator("#yolo-mode")
    if not yolo_checkbox.is_checked():
        # Handle the confirmation dialog that appears when enabling YOLO mode
        def handle_yolo_dialog(dialog):
            print(f"YOLO confirmation dialog appeared: {dialog.type}")
            dialog.accept()  # Accept the warning about function execution
        
        page.on("dialog", handle_yolo_dialog)
        
        yolo_checkbox.click()
        page.wait_for_timeout(1000)  # Wait for dialog processing
        
        # Verify it's actually enabled
        if yolo_checkbox.is_checked():
            print("✅ YOLO mode enabled - functions will execute automatically")
        else:
            print("❌ YOLO mode failed to enable")
    else:
        print("✅ YOLO mode already enabled")
    
    # Close settings
    close_btn = page.locator("#close-settings")
    close_btn.click()
    page.wait_for_selector("#settings-modal", state="hidden", timeout=5000)


def test_introspection_read_file(page: Page, serve_hacka_re):
    """Test that Introspection MCP can read files from the project"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Configure API
    configure_api_key_via_ui(page, "openai")
    
    # Enable YOLO mode BEFORE enabling MCP
    enable_yolo_mode(page)
    
    # Enable Introspection MCP
    enable_introspection_mcp(page)
    
    # Send a message asking to read index.html
    message_input = page.locator("#message-input")
    message_input.fill("Use the introspection tools to read the index.html file and tell me how many script tags it has")
    
    # Send message
    send_btn = page.locator("#send-btn")
    send_btn.click()
    
    # Wait for response generation to complete
    page.wait_for_function(
        """() => {
            const btn = document.querySelector('#send-btn');
            return btn && !btn.hasAttribute('data-generating');
        }""",
        timeout=30000
    )
    
    # Check for function execution indicators
    function_indicators = page.locator(".function-call-icon, .function-result-icon")
    expect(function_indicators.first).to_be_visible(timeout=10000)
    
    # Get assistant response
    assistant_messages = page.locator(".message.assistant .message-content")
    expect(assistant_messages.first).to_be_visible(timeout=10000)
    
    # Verify the response mentions script tags
    response_found = False
    for i in range(assistant_messages.count()):
        content = assistant_messages.nth(i).text_content()
        if content and ("script" in content.lower() or "tag" in content.lower()):
            response_found = True
            print(f"✅ Assistant response mentions scripts/tags: {content[:200]}...")
            break
    
    assert response_found, "Assistant should have mentioned script tags from index.html"
    
    screenshot_with_markdown(page, "introspection_read_file", {
        "Test": "Introspection Read File",
        "Status": "Success - file read and analyzed"
    })


def test_introspection_find_definition(page: Page, serve_hacka_re):
    """Test that Introspection MCP can find function/class definitions"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Configure API
    configure_api_key_via_ui(page, "openai")
    
    # Enable YOLO mode BEFORE enabling MCP
    enable_yolo_mode(page)
    
    # Enable Introspection MCP
    enable_introspection_mcp(page)
    
    # Send a message asking to find a specific function
    message_input = page.locator("#message-input")
    message_input.fill("Find where the ChatManager component is defined in the codebase")
    
    # Send message
    send_btn = page.locator("#send-btn")
    send_btn.click()
    
    # Wait for response generation to complete
    page.wait_for_function(
        """() => {
            const btn = document.querySelector('#send-btn');
            return btn && !btn.hasAttribute('data-generating');
        }""",
        timeout=30000
    )
    
    # Check for function execution indicators
    function_indicators = page.locator(".function-call-icon, .function-result-icon")
    expect(function_indicators.first).to_be_visible(timeout=10000)
    
    # Get assistant response
    assistant_messages = page.locator(".message.assistant .message-content")
    expect(assistant_messages.first).to_be_visible(timeout=10000)
    
    # Verify the response mentions the file location
    response_found = False
    for i in range(assistant_messages.count()):
        content = assistant_messages.nth(i).text_content()
        if content and ("chat-manager" in content.lower() or "components/" in content.lower()):
            response_found = True
            print(f"✅ Assistant found ChatManager location: {content[:200]}...")
            break
    
    assert response_found, "Assistant should have found ChatManager component location"
    
    screenshot_with_markdown(page, "introspection_find_definition", {
        "Test": "Introspection Find Definition",
        "Status": "Success - component definition found"
    })


def test_introspection_search_pattern(page: Page, serve_hacka_re):
    """Test that Introspection MCP can search for patterns in code"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Configure API
    configure_api_key_via_ui(page, "openai")
    
    # Enable YOLO mode BEFORE enabling MCP
    enable_yolo_mode(page)
    
    # Enable Introspection MCP
    enable_introspection_mcp(page)
    
    # Send a message asking to search for a pattern
    message_input = page.locator("#message-input")
    message_input.fill("Search for uses of localStorage in the JavaScript files")
    
    # Send message
    send_btn = page.locator("#send-btn")
    send_btn.click()
    
    # Wait for response generation to complete
    page.wait_for_function(
        """() => {
            const btn = document.querySelector('#send-btn');
            return btn && !btn.hasAttribute('data-generating');
        }""",
        timeout=30000
    )
    
    # Check for function execution indicators
    function_indicators = page.locator(".function-call-icon, .function-result-icon")
    expect(function_indicators.first).to_be_visible(timeout=10000)
    
    # Get assistant response
    assistant_messages = page.locator(".message.assistant .message-content")
    expect(assistant_messages.first).to_be_visible(timeout=10000)
    
    # Verify the response mentions localStorage usage
    response_found = False
    for i in range(assistant_messages.count()):
        content = assistant_messages.nth(i).text_content()
        if content and ("localStorage" in content or "storage" in content.lower()):
            response_found = True
            print(f"✅ Assistant found localStorage usage: {content[:200]}...")
            break
    
    assert response_found, "Assistant should have found localStorage usage patterns"
    
    screenshot_with_markdown(page, "introspection_search_pattern", {
        "Test": "Introspection Search Pattern",
        "Status": "Success - pattern search completed"
    })


def test_introspection_get_architecture(page: Page, serve_hacka_re):
    """Test that Introspection MCP can provide architecture overview"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Configure API
    configure_api_key_via_ui(page, "openai")
    
    # Enable YOLO mode BEFORE enabling MCP
    enable_yolo_mode(page)
    
    # Enable Introspection MCP
    enable_introspection_mcp(page)
    
    # Send a message asking for architecture overview
    message_input = page.locator("#message-input")
    message_input.fill("Explain the hacka.re application architecture")
    
    # Send message
    send_btn = page.locator("#send-btn")
    send_btn.click()
    
    # Wait for response generation to complete
    page.wait_for_function(
        """() => {
            const btn = document.querySelector('#send-btn');
            return btn && !btn.hasAttribute('data-generating');
        }""",
        timeout=30000
    )
    
    # Check for function execution indicators
    function_indicators = page.locator(".function-call-icon, .function-result-icon")
    expect(function_indicators.first).to_be_visible(timeout=10000)
    
    # Get assistant response
    assistant_messages = page.locator(".message.assistant .message-content")
    expect(assistant_messages.first).to_be_visible(timeout=10000)
    
    # Verify the response mentions architecture components
    response_found = False
    for i in range(assistant_messages.count()):
        content = assistant_messages.nth(i).text_content()
        if content and ("service" in content.lower() or "component" in content.lower() or "architecture" in content.lower()):
            response_found = True
            print(f"✅ Assistant explained architecture: {content[:200]}...")
            break
    
    assert response_found, "Assistant should have explained the architecture"
    
    screenshot_with_markdown(page, "introspection_architecture", {
        "Test": "Introspection Get Architecture",
        "Status": "Success - architecture overview provided"
    })


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])