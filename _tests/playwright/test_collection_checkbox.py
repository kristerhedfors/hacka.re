"""
Test that collection checkboxes work correctly for default functions
"""

import pytest
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown
import json
import time


def test_collection_checkbox_enables_all_functions(page: Page, serve_hacka_re, api_key):
    """Test that checking the collection checkbox enables all functions in that collection"""
    
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
    
    # Find the RC4 collection checkbox (master checkbox)
    rc4_collection = page.locator('.default-function-collection-item').filter(has_text="RC4 Encryption")
    collection_checkbox = rc4_collection.locator('.collection-master-checkbox')
    
    # Check the collection checkbox
    if collection_checkbox.is_visible():
        if not collection_checkbox.is_checked():
            collection_checkbox.click()
            print("Clicked collection checkbox")
    
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
    
    # Verify BOTH RC4 functions are included (collection checkbox should enable both)
    assert 'rc4_encrypt' in tool_names, "rc4_encrypt not in API tools"
    assert 'rc4_decrypt' in tool_names, "rc4_decrypt not in API tools"
    
    screenshot_with_markdown(page, "collection_checkbox_works", {
        "Status": "Test completed",
        "Method": "Collection checkbox",
        "Tools in request": str(len(tools)),
        "RC4 functions included": "Both" if ('rc4_encrypt' in tool_names and 'rc4_decrypt' in tool_names) else "Missing"
    })


def test_collection_checkbox_vs_individual_checkboxes(page: Page, serve_hacka_re, api_key):
    """Compare collection checkbox behavior vs individual checkbox behavior"""
    
    # Navigate to the application
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Open function modal
    function_btn = page.locator("#function-btn")
    function_btn.click()
    page.wait_for_selector("#function-modal", state="visible")
    
    # Wait for functions to load
    page.wait_for_timeout(1000)
    
    # Expand Default Functions section
    default_functions_header = page.locator('.default-functions-header')
    if default_functions_header.is_visible():
        default_functions_header.click()
        page.wait_for_timeout(500)
    
    # Find RC4 collection
    rc4_collection = page.locator('.default-function-collection-item').filter(has_text="RC4 Encryption")
    
    # Test 1: Check collection checkbox
    collection_checkbox = rc4_collection.locator('.collection-master-checkbox')
    if collection_checkbox.is_visible() and not collection_checkbox.is_checked():
        collection_checkbox.click()
        page.wait_for_timeout(200)
    
    # Expand the collection to verify individual checkboxes
    rc4_collection.locator('.function-collection-header').click()
    page.wait_for_timeout(500)
    
    # Verify individual checkboxes are checked
    rc4_encrypt_checkbox = page.locator('[data-function="rc4_encrypt"]')
    rc4_decrypt_checkbox = page.locator('[data-function="rc4_decrypt"]')
    
    assert rc4_encrypt_checkbox.is_checked(), "rc4_encrypt should be checked after collection checkbox"
    assert rc4_decrypt_checkbox.is_checked(), "rc4_decrypt should be checked after collection checkbox"
    
    print("✓ Collection checkbox correctly checks all individual functions")
    
    # Test 2: Uncheck collection checkbox
    collection_checkbox.click()
    page.wait_for_timeout(200)
    
    # Verify individual checkboxes are unchecked
    assert not rc4_encrypt_checkbox.is_checked(), "rc4_encrypt should be unchecked"
    assert not rc4_decrypt_checkbox.is_checked(), "rc4_decrypt should be unchecked"
    
    print("✓ Collection checkbox correctly unchecks all individual functions")
    
    # Test 3: Check individual checkboxes one by one
    rc4_encrypt_checkbox.click()
    page.wait_for_timeout(200)
    rc4_decrypt_checkbox.click()
    page.wait_for_timeout(200)
    
    # Verify collection checkbox shows indeterminate or checked state
    # (Implementation may vary - it should be checked when all are checked)
    assert collection_checkbox.is_checked(), "Collection checkbox should be checked when all individual functions are checked"
    
    print("✓ Individual checkboxes update collection checkbox state")
    
    screenshot_with_markdown(page, "collection_vs_individual", {
        "Status": "All tests passed",
        "Collection checkbox": "Works correctly",
        "Individual checkboxes": "Work correctly",
        "State sync": "Bidirectional"
    })