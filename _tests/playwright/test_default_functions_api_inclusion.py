"""
Test that default functions are properly included in API calls when checked
"""

import pytest
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown
import json
import time


def test_default_rc4_functions_included_in_api(page: Page, serve_hacka_re, api_key):
    """Test that RC4 default functions are included in API calls when checked"""
    
    # Navigate to the application
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Set up console logging to capture API requests
    api_requests = []
    
    def log_request(request):
        if 'chat/completions' in request.url:
            try:
                post_data = request.post_data
                if post_data:
                    request_body = json.loads(post_data)
                    api_requests.append(request_body)
                    print(f"API request captured with {len(request_body.get('tools', []))} tools")
            except:
                pass
    
    page.on("request", log_request)
    
    # Open function modal
    function_btn = page.locator("#function-btn")
    function_btn.click()
    page.wait_for_selector("#function-modal", state="visible")
    
    # Wait a moment for default functions to load
    page.wait_for_timeout(1000)
    
    # First expand the Default Functions section
    default_functions_header = page.locator('.default-functions-header')
    if default_functions_header.is_visible():
        default_functions_header.click()
        page.wait_for_timeout(500)
    
    # Now look for the RC4 collection and expand it
    rc4_collection = page.locator('.default-function-collection-item').filter(has_text="RC4 Encryption")
    
    # Click the collection header to expand it if needed
    if rc4_collection.is_visible():
        # Click the header to expand
        rc4_collection.locator('.function-collection-header').click()
        page.wait_for_timeout(500)
    
    # Now find the individual function checkboxes
    rc4_encrypt_checkbox = page.locator('[data-function="rc4_encrypt"]')
    rc4_decrypt_checkbox = page.locator('[data-function="rc4_decrypt"]')
    
    # Ensure checkboxes are visible and check them
    if rc4_encrypt_checkbox.is_visible():
        if not rc4_encrypt_checkbox.is_checked():
            rc4_encrypt_checkbox.click()
    
    if rc4_decrypt_checkbox.is_visible():
        if not rc4_decrypt_checkbox.is_checked():
            rc4_decrypt_checkbox.click()
    
    # Verify they are checked
    expect(rc4_encrypt_checkbox).to_be_checked()
    expect(rc4_decrypt_checkbox).to_be_checked()
    
    # Close function modal
    close_btn = page.locator("#close-function-modal")
    close_btn.click()
    page.wait_for_selector("#function-modal", state="hidden")
    
    # Configure API key and settings
    settings_btn = page.locator("#settings-btn")
    settings_btn.click()
    page.wait_for_selector("#settings-modal", state="visible")
    
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill(api_key)
    
    # Close settings
    close_settings = page.locator("#close-settings")
    close_settings.click()
    page.wait_for_selector("#settings-modal", state="hidden")
    
    # Send a message that should trigger RC4 function
    message_input = page.locator("#message-input")
    message_input.fill("Encrypt the text 'Hello World' using RC4 with key 'secret'")
    
    # Clear previous requests
    api_requests.clear()
    
    # Send message
    send_btn = page.locator("#send-btn")
    send_btn.click()
    
    # Wait for API request to be made
    page.wait_for_timeout(2000)
    
    # Check that API request includes RC4 functions
    assert len(api_requests) > 0, "No API requests captured"
    
    request_body = api_requests[0]
    assert 'tools' in request_body, "No tools in API request"
    
    tools = request_body['tools']
    tool_names = [tool['function']['name'] for tool in tools if 'function' in tool]
    
    print(f"Tools in API request: {tool_names}")
    
    # Verify RC4 functions are included
    assert 'rc4_encrypt' in tool_names, "rc4_encrypt not in API tools"
    assert 'rc4_decrypt' in tool_names, "rc4_decrypt not in API tools"
    
    screenshot_with_markdown(page, "default_functions_included", {
        "Status": "Test completed",
        "Tools in request": str(len(tools)),
        "RC4 functions included": "Yes" if 'rc4_encrypt' in tool_names else "No"
    })


def test_default_functions_not_included_when_unchecked(page: Page, serve_hacka_re, api_key):
    """Test that default functions are NOT included when unchecked"""
    
    # Navigate to the application
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Set up console logging to capture API requests
    api_requests = []
    
    def log_request(request):
        if 'chat/completions' in request.url:
            try:
                post_data = request.post_data
                if post_data:
                    request_body = json.loads(post_data)
                    api_requests.append(request_body)
            except:
                pass
    
    page.on("request", log_request)
    
    # Open function modal
    function_btn = page.locator("#function-btn")
    function_btn.click()
    page.wait_for_selector("#function-modal", state="visible")
    
    # Wait a moment for default functions to load
    page.wait_for_timeout(1000)
    
    # First expand the Default Functions section
    default_functions_header = page.locator('.default-functions-header')
    if default_functions_header.is_visible():
        default_functions_header.click()
        page.wait_for_timeout(500)
    
    # Now look for the RC4 collection and expand it
    rc4_collection = page.locator('.default-function-collection-item').filter(has_text="RC4 Encryption")
    
    # Click the collection header to expand it if needed
    if rc4_collection.is_visible():
        # Click the header to expand
        rc4_collection.locator('.function-collection-header').click()
        page.wait_for_timeout(500)
    
    # Now find the individual function checkboxes
    rc4_encrypt_checkbox = page.locator('[data-function="rc4_encrypt"]')
    rc4_decrypt_checkbox = page.locator('[data-function="rc4_decrypt"]')
    
    # Uncheck RC4 functions if checked
    if rc4_encrypt_checkbox.is_visible():
        if rc4_encrypt_checkbox.is_checked():
            rc4_encrypt_checkbox.click()
    
    if rc4_decrypt_checkbox.is_visible():
        if rc4_decrypt_checkbox.is_checked():
            rc4_decrypt_checkbox.click()
    
    # Verify they are unchecked
    expect(rc4_encrypt_checkbox).not_to_be_checked()
    expect(rc4_decrypt_checkbox).not_to_be_checked()
    
    # Close function modal
    close_btn = page.locator("#close-function-modal")
    close_btn.click()
    page.wait_for_selector("#function-modal", state="hidden")
    
    # Configure API key
    settings_btn = page.locator("#settings-btn")
    settings_btn.click()
    page.wait_for_selector("#settings-modal", state="visible")
    
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill(api_key)
    
    close_settings = page.locator("#close-settings")
    close_settings.click()
    page.wait_for_selector("#settings-modal", state="hidden")
    
    # Send a message
    message_input = page.locator("#message-input")
    message_input.fill("What is 2 + 2?")
    
    # Clear previous requests
    api_requests.clear()
    
    send_btn = page.locator("#send-btn")
    send_btn.click()
    
    # Wait for API request
    page.wait_for_timeout(2000)
    
    # Check API request
    if len(api_requests) > 0:
        request_body = api_requests[0]
        
        if 'tools' in request_body:
            tools = request_body['tools']
            tool_names = [tool['function']['name'] for tool in tools if 'function' in tool]
            
            # Verify RC4 functions are NOT included
            assert 'rc4_encrypt' not in tool_names, "rc4_encrypt should not be in API tools when unchecked"
            assert 'rc4_decrypt' not in tool_names, "rc4_decrypt should not be in API tools when unchecked"
        else:
            # No tools at all is also valid when nothing is checked
            pass
    
    screenshot_with_markdown(page, "default_functions_not_included", {
        "Status": "Test completed",
        "RC4 functions checked": "No",
        "RC4 functions in API": "No"
    })