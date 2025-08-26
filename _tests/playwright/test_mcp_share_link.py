"""
Test MCP Share Link functionality
Tests the built-in Share Link MCP tool in the MCP modal's Advanced section
"""

import pytest
import json
import time
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown


def test_mcp_share_link_ui_elements(page: Page, serve_hacka_re):
    """Test that Share Link MCP UI elements are present and functional"""
    # Navigate to the application
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    dismiss_settings_modal(page)
    
    # Open MCP modal
    mcp_button = page.locator("#mcp-servers-btn")
    expect(mcp_button).to_be_visible()
    mcp_button.click()
    
    # Wait for modal to be visible
    mcp_modal = page.locator("#mcp-servers-modal")
    expect(mcp_modal).to_be_visible()
    
    # Expand Advanced section
    advanced_header = page.locator(".mcp-advanced-header")
    expect(advanced_header).to_be_visible()
    advanced_header.click()
    
    # Wait for advanced section to expand
    advanced_list = page.locator(".mcp-advanced-list")
    page.wait_for_timeout(500)  # Brief wait for animation
    
    # Check Share Link MCP section exists
    share_link_section = page.locator("#mcp-share-link-section")
    expect(share_link_section).to_be_visible()
    
    # Verify header elements
    share_link_header = share_link_section.locator(".mcp-tool-header h4")
    expect(share_link_header).to_contain_text("Share Link MCP")
    
    # Verify enable button
    enable_button = page.locator("#mcp-share-link-enable")
    expect(enable_button).to_be_visible()
    expect(enable_button).to_have_text("Enable")
    
    # Verify description
    description = share_link_section.locator(".mcp-tool-description p")
    expect(description).to_contain_text("Built-in MCP tool for creating secure share links")
    
    # Verify feature list
    features = share_link_section.locator(".mcp-tool-features li")
    expect(features).to_have_count(4)
    
    screenshot_with_markdown(page, "mcp_share_link_ui", {
        "Test": "MCP Share Link UI Elements",
        "Status": "UI elements verified",
        "Section": "Advanced section expanded"
    })


def test_mcp_share_link_enable_disable(page: Page, serve_hacka_re, api_key):
    """Test enabling and disabling the Share Link MCP"""
    # Navigate and setup
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Set API key for testing
    page.evaluate(f"localStorage.setItem('openai_api_key', '{api_key}')")
    page.evaluate("localStorage.setItem('model', 'gpt-4o-mini')")
    
    # Open MCP modal
    mcp_button = page.locator("#mcp-servers-btn")
    mcp_button.click()
    
    mcp_modal = page.locator("#mcp-servers-modal")
    expect(mcp_modal).to_be_visible()
    
    # Expand Advanced section
    advanced_header = page.locator(".mcp-advanced-header")
    advanced_header.click()
    page.wait_for_timeout(500)
    
    # Enable Share Link MCP
    enable_button = page.locator("#mcp-share-link-enable")
    expect(enable_button).to_have_text("Enable")
    enable_button.click()
    
    # Wait for status message
    status_element = page.locator("#mcp-share-link-status")
    page.wait_for_selector("#mcp-share-link-status", state="visible", timeout=5000)
    expect(status_element).to_contain_text("Share Link MCP enabled")
    
    # Button should now say "Disable"
    expect(enable_button).to_have_text("Disable")
    expect(enable_button).to_have_class("btn btn-sm btn-danger")
    
    screenshot_with_markdown(page, "mcp_share_link_enabled", {
        "Test": "Share Link MCP Enable",
        "Status": "Successfully enabled",
        "Button State": "Shows 'Disable'"
    })
    
    # Disable Share Link MCP
    enable_button.click()
    
    # Wait for status update
    page.wait_for_timeout(500)
    
    # Button should now say "Enable" again
    expect(enable_button).to_have_text("Enable")
    expect(enable_button).to_have_class("btn btn-sm btn-primary")
    
    screenshot_with_markdown(page, "mcp_share_link_disabled", {
        "Test": "Share Link MCP Disable",
        "Status": "Successfully disabled",
        "Button State": "Shows 'Enable'"
    })


def test_mcp_share_link_persistence(page: Page, serve_hacka_re, api_key):
    """Test that Share Link MCP state persists across page reloads"""
    # Navigate and setup
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Set API key
    page.evaluate(f"localStorage.setItem('openai_api_key', '{api_key}')")
    
    # Open MCP modal and enable Share Link MCP
    mcp_button = page.locator("#mcp-servers-btn")
    mcp_button.click()
    
    advanced_header = page.locator(".mcp-advanced-header")
    advanced_header.click()
    page.wait_for_timeout(500)
    
    enable_button = page.locator("#mcp-share-link-enable")
    enable_button.click()
    
    # Wait for enabled state
    page.wait_for_selector("#mcp-share-link-status", state="visible", timeout=5000)
    expect(enable_button).to_have_text("Disable")
    
    # Close modal
    close_button = page.locator("#close-mcp-servers-modal")
    close_button.click()
    
    # Reload page
    page.reload()
    dismiss_welcome_modal(page)
    
    # Open MCP modal again
    mcp_button = page.locator("#mcp-servers-btn")
    mcp_button.click()
    
    advanced_header = page.locator(".mcp-advanced-header")
    advanced_header.click()
    page.wait_for_timeout(500)
    
    # Check that Share Link MCP is still enabled
    enable_button = page.locator("#mcp-share-link-enable")
    expect(enable_button).to_have_text("Disable")
    
    screenshot_with_markdown(page, "mcp_share_link_persistence", {
        "Test": "Share Link MCP Persistence",
        "Status": "State persisted after reload",
        "Button State": "Still shows 'Disable'"
    })


def test_mcp_share_link_function_registration(page: Page, serve_hacka_re, api_key):
    """Test that Share Link MCP functions are registered in Function Calling system"""
    # Navigate and setup
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Set API key
    page.evaluate(f"localStorage.setItem('openai_api_key', '{api_key}')")
    page.evaluate("localStorage.setItem('model', 'gpt-4o-mini')")
    
    # Enable Share Link MCP
    mcp_button = page.locator("#mcp-servers-btn")
    mcp_button.click()
    
    advanced_header = page.locator(".mcp-advanced-header")
    advanced_header.click()
    page.wait_for_timeout(500)
    
    enable_button = page.locator("#mcp-share-link-enable")
    enable_button.click()
    
    # Wait for enabled state
    page.wait_for_selector("#mcp-share-link-status", state="visible", timeout=5000)
    
    # Close MCP modal
    close_button = page.locator("#close-mcp-servers-modal")
    close_button.click()
    
    # Open Function Calling modal to verify functions are registered
    function_calling_button = page.locator("#function-calling-button")
    function_calling_button.click()
    
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    # Check for Share Link MCP functions in the list
    page.wait_for_timeout(1000)  # Allow time for functions to load
    
    # Look for the Share Link MCP collection
    function_items = page.locator(".function-item")
    
    # Check if any of the Share Link functions are present
    share_link_functions = [
        "share_link_check_available",
        "share_link_generate",
        "share_link_generate_all"
    ]
    
    # Get all function names from the UI
    function_count = function_items.count()
    found_functions = []
    
    for i in range(function_count):
        func_name_elem = function_items.nth(i).locator(".function-name")
        if func_name_elem.count() > 0:
            func_name = func_name_elem.text_content()
            if func_name in share_link_functions:
                found_functions.append(func_name)
    
    # Verify at least one Share Link function is registered
    assert len(found_functions) > 0, "No Share Link MCP functions found in Function Calling modal"
    
    screenshot_with_markdown(page, "mcp_share_link_functions", {
        "Test": "Share Link MCP Function Registration",
        "Status": "Functions registered",
        "Functions Found": ", ".join(found_functions) if found_functions else "None",
        "Expected Functions": ", ".join(share_link_functions)
    })


def test_mcp_share_link_api_integration(page: Page, serve_hacka_re, api_key):
    """Test that Share Link MCP functions work through the API"""
    # Navigate and setup
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Configure API and model
    page.evaluate(f"localStorage.setItem('openai_api_key', '{api_key}')")
    page.evaluate("localStorage.setItem('model', 'gpt-4o-mini')")
    page.evaluate("localStorage.setItem('base_url', 'https://api.openai.com/v1')")
    
    # Enable function calling
    page.evaluate("localStorage.setItem('tool_calling_enabled', 'true')")
    
    # Enable Share Link MCP
    mcp_button = page.locator("#mcp-servers-btn")
    mcp_button.click()
    
    advanced_header = page.locator(".mcp-advanced-header")
    advanced_header.click()
    page.wait_for_timeout(500)
    
    enable_button = page.locator("#mcp-share-link-enable")
    enable_button.click()
    
    # Wait for enabled state
    page.wait_for_selector("#mcp-share-link-status", state="visible", timeout=5000)
    
    # Close MCP modal
    close_button = page.locator("#close-mcp-servers-modal")
    close_button.click()
    
    # Test checking available content
    page.evaluate("""
        window.MCPShareLinkService.checkAvailableContent().then(result => {
            window.testResult = result;
        });
    """)
    
    page.wait_for_timeout(1000)  # Wait for async operation
    
    # Verify the result
    available_content = page.evaluate("window.testResult")
    assert available_content is not None
    assert "apiKey" in available_content
    assert "model" in available_content
    assert "baseUrl" in available_content
    
    screenshot_with_markdown(page, "mcp_share_link_api_test", {
        "Test": "Share Link MCP API Integration",
        "Operation": "checkAvailableContent",
        "API Key Available": str(available_content.get("apiKey", False)),
        "Model Available": str(available_content.get("model", False)),
        "Base URL Available": str(available_content.get("baseUrl", False))
    })
    
    # Test generating a share link
    page.evaluate("""
        window.MCPShareLinkService.generateShareLink({
            includeApiKey: true,
            includeModel: true,
            includeWelcomeMessage: true,
            welcomeMessage: 'Test welcome message from Playwright'
        }).then(result => {
            window.shareResult = result;
        });
    """)
    
    page.wait_for_timeout(2000)  # Wait for async operation
    
    # Verify the share link result
    share_result = page.evaluate("window.shareResult")
    assert share_result is not None
    assert share_result.get("success") == True
    assert "link" in share_result
    assert "password" in share_result
    assert share_result["link"].startswith("http")
    assert "#gpt=" in share_result["link"]
    
    screenshot_with_markdown(page, "mcp_share_link_generation", {
        "Test": "Share Link Generation",
        "Success": str(share_result.get("success", False)),
        "Link Generated": "Yes" if "link" in share_result else "No",
        "Password Generated": "Yes" if "password" in share_result else "No",
        "Items Included": str(share_result.get("itemsIncluded", {}))
    })


def test_mcp_share_link_error_handling(page: Page, serve_hacka_re):
    """Test error handling in Share Link MCP"""
    # Navigate without setting up API key
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Clear any existing API key
    page.evaluate("localStorage.removeItem('openai_api_key')")
    page.evaluate("localStorage.removeItem('model')")
    
    # Enable Share Link MCP
    mcp_button = page.locator("#mcp-servers-btn")
    mcp_button.click()
    
    advanced_header = page.locator(".mcp-advanced-header")
    advanced_header.click()
    page.wait_for_timeout(500)
    
    enable_button = page.locator("#mcp-share-link-enable")
    enable_button.click()
    
    # Should still enable even without API key
    page.wait_for_selector("#mcp-share-link-status", state="visible", timeout=5000)
    expect(enable_button).to_have_text("Disable")
    
    # Close modal
    close_button = page.locator("#close-mcp-servers-modal")
    close_button.click()
    
    # Try to generate a share link without any content
    page.evaluate("""
        window.MCPShareLinkService.generateShareLink({
            includeApiKey: true,
            includeModel: true
        }).then(result => {
            window.emptyResult = result;
        });
    """)
    
    page.wait_for_timeout(1000)
    
    # Check that it handles missing content gracefully
    empty_result = page.evaluate("window.emptyResult")
    assert empty_result is not None
    
    # The link should still be generated but with minimal content
    if empty_result.get("success"):
        assert "link" in empty_result
        assert "password" in empty_result
    
    screenshot_with_markdown(page, "mcp_share_link_error_handling", {
        "Test": "Share Link MCP Error Handling",
        "Scenario": "No API key or model configured",
        "Result": "Success" if empty_result.get("success") else "Handled gracefully",
        "Items Included": str(empty_result.get("itemsIncluded", {}))
    })


def test_mcp_share_link_with_conversation(page: Page, serve_hacka_re, api_key):
    """Test Share Link MCP with conversation messages"""
    # Navigate and setup
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Configure API
    page.evaluate(f"localStorage.setItem('openai_api_key', '{api_key}')")
    page.evaluate("localStorage.setItem('model', 'gpt-4o-mini')")
    
    # Add some test messages to the conversation
    page.evaluate("""
        // Simulate adding messages to the chat
        const chatContainer = document.getElementById('chat-container');
        if (chatContainer) {
            // Add user message
            const userMsg = document.createElement('div');
            userMsg.className = 'message user-message';
            userMsg.textContent = 'Test user message';
            chatContainer.appendChild(userMsg);
            
            // Add assistant message
            const assistantMsg = document.createElement('div');
            assistantMsg.className = 'message assistant-message';
            assistantMsg.textContent = 'Test assistant response';
            chatContainer.appendChild(assistantMsg);
        }
    """)
    
    # Enable Share Link MCP
    mcp_button = page.locator("#mcp-servers-btn")
    mcp_button.click()
    
    advanced_header = page.locator(".mcp-advanced-header")
    advanced_header.click()
    page.wait_for_timeout(500)
    
    enable_button = page.locator("#mcp-share-link-enable")
    enable_button.click()
    
    page.wait_for_selector("#mcp-share-link-status", state="visible", timeout=5000)
    
    close_button = page.locator("#close-mcp-servers-modal")
    close_button.click()
    
    # Check available content should now include conversation
    page.evaluate("""
        window.MCPShareLinkService.checkAvailableContent().then(result => {
            window.availableWithChat = result;
        });
    """)
    
    page.wait_for_timeout(1000)
    
    available_with_chat = page.evaluate("window.availableWithChat")
    assert available_with_chat.get("conversation") == True
    assert available_with_chat.get("messageCount", 0) > 0
    
    # Generate a share link including conversation
    page.evaluate("""
        window.MCPShareLinkService.generateShareLink({
            includeConversation: true,
            messageCount: 2,
            includeApiKey: true,
            includeModel: true
        }).then(result => {
            window.shareWithChat = result;
        });
    """)
    
    page.wait_for_timeout(1000)
    
    share_with_chat = page.evaluate("window.shareWithChat")
    assert share_with_chat.get("success") == True
    assert share_with_chat.get("itemsIncluded", {}).get("conversation") == True
    
    screenshot_with_markdown(page, "mcp_share_link_with_chat", {
        "Test": "Share Link MCP with Conversation",
        "Messages Available": str(available_with_chat.get("messageCount", 0)),
        "Conversation Included": str(share_with_chat.get("itemsIncluded", {}).get("conversation", False)),
        "Link Generated": "Yes" if share_with_chat.get("link") else "No"
    })


if __name__ == "__main__":
    pytest.main([__file__, "-v"])