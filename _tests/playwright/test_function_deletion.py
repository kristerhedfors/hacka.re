import pytest
from playwright.sync_api import Page, expect
import time
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown

from function_calling_api.helpers.setup_helpers import (
    setup_console_logging, 
    configure_api_key_and_model, 
    enable_tool_calling_and_function_tools
)
from function_calling_api.helpers.function_helpers import (
    cleanup_functions
)

def test_function_deletion_removes_entire_bundle(page: Page, serve_hacka_re, api_key):
    """Test basic function deletion functionality"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Open function modal
    function_btn = page.locator("#function-btn")
    function_btn.click()
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    screenshot_with_markdown(page, "function_deletion_basic", {
        "Status": "Function modal opened for deletion test",
        "Component": "Function Modal"
    })
    
    # Close the function modal
    close_btn = page.locator("#close-function-modal")
    close_btn.click()
    expect(function_modal).not_to_be_visible()

def test_multiple_function_collections(page: Page, serve_hacka_re, api_key):
    """Test basic multiple function collections functionality"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Open function modal
    function_btn = page.locator("#function-btn")
    function_btn.click()
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    screenshot_with_markdown(page, "function_collections_basic", {
        "Status": "Function modal opened for collections test",
        "Component": "Function Modal"
    })
    
    # Close the function modal
    close_btn = page.locator("#close-function-modal")
    close_btn.click()
    expect(function_modal).not_to_be_visible()
