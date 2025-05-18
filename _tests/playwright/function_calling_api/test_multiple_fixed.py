"""
Multiple Function Calling API Tests

This module contains tests for multiple function calling with API key.
"""
import pytest
import os
import time
from urllib.parse import urljoin
from playwright.sync_api import Page, expect

from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown

from function_calling_api.helpers.setup_helpers import (
    setup_console_logging, 
    configure_api_key_and_model, 
    enable_tool_calling_and_function_tools
)
from function_calling_api.helpers.function_helpers_fixed import (
    add_multiple_test_functions, 
    cleanup_functions
)
from function_calling_api.helpers.chat_helpers_fixed import multiple_function_invocation

def test_multiple_functions_with_api_key(page: Page, serve_hacka_re, api_key):
    """Test multiple function calling with a configured API key and function calling model."""
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
        screenshot_with_markdown(page, "initial_navigation_error_multiple", {
            "Error": str(e),
            "Navigation Target": base_url
        })
    
    # Wait for the page to be fully loaded
    try:
        page.wait_for_load_state("networkidle", timeout=5000)
        print("Network idle state reached")
    except Exception as e:
        print(f"Error waiting for network idle: {e}")
        # Take a screenshot for debugging
        screenshot_with_markdown(page, "network_idle_timeout_multiple", {
            "Error": str(e),
            "Timeout": "5000ms"
        })
    
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
        screenshot_with_markdown(page, "api_key_config_error_multiple", {
            "Error": str(e),
            "Component": "API Key Configuration"
        })
        pytest.fail(f"Failed to configure API key and model: {e}")
    
    # Enable tool calling and function tools
    try:
        enable_tool_calling_and_function_tools(page)
        print("Tool calling and function tools enabled successfully")
    except Exception as e:
        print(f"Error enabling tool calling and function tools: {e}")
        # Take a screenshot for debugging
        screenshot_with_markdown(page, "enable_tools_error_multiple", {
            "Error": str(e),
            "Component": "Tool Calling and Function Tools"
        })
        pytest.fail(f"Failed to enable tool calling and function tools: {e}")
    
    # Add multiple test functions
    try:
        add_multiple_test_functions(page)
        print("Multiple test functions added successfully")
    except Exception as e:
        print(f"Error adding multiple test functions: {e}")
        # Take a screenshot for debugging
        screenshot_with_markdown(page, "add_multiple_functions_error", {
            "Error": str(e),
            "Component": "Function Addition"
        })
        pytest.fail(f"Failed to add multiple test functions: {e}")
    
    # Test multiple function invocation through chat
    try:
        multiple_function_invocation(page)
        print("Multiple function invocation test completed successfully")
    except Exception as e:
        print(f"Error during multiple function invocation test: {e}")
        # Take a screenshot for debugging
        screenshot_with_markdown(page, "multiple_function_invocation_error", {
            "Error": str(e),
            "Component": "Function Invocation"
        })
        pytest.fail(f"Failed during multiple function invocation test: {e}")
    
    # Clean up - delete the functions
    try:
        cleanup_functions(page)
        print("Functions cleaned up successfully")
    except Exception as e:
        print(f"Error cleaning up functions: {e}")
        # Take a screenshot for debugging
        screenshot_with_markdown(page, "cleanup_functions_error_multiple", {
            "Error": str(e),
            "Component": "Function Cleanup"
        })
    
    # End timing and print execution time
    end_time = time.time()
    execution_time = end_time - start_time
    print(f"\n⏱️ test_multiple_functions_with_api_key completed in {execution_time:.3f} seconds")
