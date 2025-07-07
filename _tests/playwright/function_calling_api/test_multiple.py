"""
Multiple Functions API Tests

This module contains tests for multiple functions with API key.
"""
import pytest
import os
import time
from urllib.parse import urljoin
from playwright.sync_api import Page, expect

from test_utils import dismiss_welcome_modal, dismiss_settings_modal

from function_calling_api.helpers.setup_helpers import (
    setup_console_logging, 
    configure_api_key_and_model, 
    enable_tool_calling_and_function_tools
)
from function_calling_api.helpers.function_helpers import (
    add_multiple_test_functions, 
    cleanup_functions
)
from function_calling_api.helpers.chat_helpers import multiple_function_invocation

def test_multiple_functions_with_api_key(page: Page, serve_hacka_re, api_key):
    """Test multiple functions with a configured API key."""
    # Start timing the test
    start_time = time.time()
    
    # Set up console error logging
    setup_console_logging(page)
    
    # Ensure serve_hacka_re ends with a trailing slash for proper URL joining
    base_url = serve_hacka_re if serve_hacka_re.endswith('/') else f"{serve_hacka_re}/"
    print(f"Base URL: {base_url}")
    
    # Navigate to the page with explicit wait for load
    print(f"Navigating to {base_url}")
    try:
        page.goto(base_url, wait_until="domcontentloaded")
        print("Initial navigation successful")
    except Exception as e:
        print(f"Error during initial navigation: {e}")
        # Take a screenshot for debugging
        page.screenshot(path="_tests/playwright/videos/initial_navigation_error_multiple.png")
    
    # Wait for the page to be fully loaded
    try:
        page.wait_for_load_state("networkidle", timeout=2000)
        print("Network idle state reached")
    except Exception as e:
        print(f"Error waiting for network idle: {e}")
        # Take a screenshot for debugging
        page.screenshot(path="_tests/playwright/videos/network_idle_timeout_multiple.png")
    
    # Verify the page loaded correctly
    title = page.title()
    print(f"Page title: {title}")
    
    # Check if the page loaded correctly
    if not title or "hacka.re" not in title.lower():
        print("WARNING: Page may not have loaded correctly")
        # Take a screenshot for debugging
        page.screenshot(path="_tests/playwright/videos/page_load_issue_multiple.png")
        
        # Try to navigate directly to index.html using proper URL joining
        index_url = urljoin(base_url, "index.html")
        print(f"Trying direct navigation to: {index_url}")
        
        try:
            page.goto(index_url, wait_until="domcontentloaded")
            print("Direct navigation to index.html successful")
            page.wait_for_load_state("networkidle", timeout=2000)
            title = page.title()
            print(f"After direct navigation, page title: {title}")
        except Exception as e:
            print(f"Error during direct navigation to index.html: {e}")
            # Take a screenshot for debugging
            page.screenshot(path="_tests/playwright/videos/direct_navigation_error_multiple.png")
    
    # Check for any console errors
    console_errors = page.evaluate("""() => {
        return window.consoleErrors || [];
    }""")
    if console_errors and len(console_errors) > 0:
        print("Console errors detected:")
        for error in console_errors:
            print(f"  - {error}")
    
    # Take a screenshot of the page after navigation
    page.screenshot(path="_tests/playwright/videos/page_after_navigation_multiple.png")
    
    # Check if essential elements are present
    settings_btn_visible = page.locator("#settings-btn").is_visible()
    print(f"Settings button visible: {settings_btn_visible}")
    
    if not settings_btn_visible:
        # Try to wait a bit longer and check again
        print("Settings button not immediately visible, waiting longer...")
        try:
            page.wait_for_selector("#settings-btn", state="visible", timeout=2000)
            print("Settings button became visible after waiting")
        except Exception as e:
            print(f"Error waiting for settings button: {e}")
            # Take a screenshot for debugging
            page.screenshot(path="_tests/playwright/videos/settings_btn_not_found_multiple.png")
            # Check the DOM structure
            body_html = page.evaluate("() => document.body.innerHTML")
            print(f"Body HTML (first 200 chars): {body_html[:200]}...")
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if already open
    dismiss_settings_modal(page)
    
    # Configure API key and model
    try:
        configure_api_key_and_model(page, api_key)
        print("API key and model configured successfully")
    except Exception as e:
        print(f"Error configuring API key and model: {e}")
        # Take a screenshot for debugging
        page.screenshot(path="_tests/playwright/videos/api_key_config_error_multiple.png")
        pytest.fail(f"Failed to configure API key and model: {e}")
    
    # Enable tool calling and function tools
    try:
        enable_tool_calling_and_function_tools(page)
        print("Tool calling and function tools enabled successfully")
    except Exception as e:
        print(f"Error enabling tool calling and function tools: {e}")
        # Take a screenshot for debugging
        page.screenshot(path="_tests/playwright/videos/enable_tools_error_multiple.png")
        pytest.fail(f"Failed to enable tool calling and function tools: {e}")
    
    # Add multiple test functions
    try:
        add_multiple_test_functions(page)
        print("Multiple test functions added successfully")
    except Exception as e:
        print(f"Error adding multiple test functions: {e}")
        # Take a screenshot for debugging
        page.screenshot(path="_tests/playwright/videos/add_multiple_functions_error.png")
        pytest.fail(f"Failed to add multiple test functions: {e}")
    
    # Test function invocation through chat with a message that could trigger multiple functions
    try:
        multiple_function_invocation(page)
        print("Multiple function invocation test completed successfully")
    except Exception as e:
        print(f"Error during multiple function invocation test: {e}")
        # Take a screenshot for debugging
        page.screenshot(path="_tests/playwright/videos/multiple_function_invocation_error.png")
        pytest.fail(f"Failed during multiple function invocation test: {e}")
    
    # Clean up - delete the functions
    try:
        cleanup_functions(page)
        print("Functions cleaned up successfully")
    except Exception as e:
        print(f"Error cleaning up functions: {e}")
        # Take a screenshot for debugging
        page.screenshot(path="_tests/playwright/videos/cleanup_functions_error_multiple.png")
    
    # End timing and print execution time
    end_time = time.time()
    execution_time = end_time - start_time
    print(f"\n⏱️ test_multiple_functions_with_api_key completed in {execution_time:.3f} seconds")
