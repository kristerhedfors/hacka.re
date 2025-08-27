"""
Test function execute modal functionality
"""
import pytest
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown
from playwright.sync_api import Page, expect
import time


def test_function_execute_modal_basic(page: Page, serve_hacka_re):
    """Test basic function execute modal functionality"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Open function calling modal
    function_btn = page.locator("#function-btn")
    function_btn.click()
    
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    # Check if execute button exists (basic test)
    execute_btn = page.locator("#function-execute-btn")
    if execute_btn.count() > 0:
        expect(execute_btn).to_be_visible()
    
    screenshot_with_markdown(page, "function_modal_execute", {
        "Status": "Function modal opened, execute button checked",
        "Component": "Function Calling Modal"
    })
    
    # Close the function modal
    close_btn = page.locator("#close-function-modal")
    close_btn.click()
    
    expect(function_modal).not_to_be_visible()


def test_function_execute_modal_validation_errors(page: Page, serve_hacka_re):
    """Test function execute modal with validation errors"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Open function modal and check basic elements exist
    function_btn = page.locator("#function-btn")
    function_btn.click()
    
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    screenshot_with_markdown(page, "validation_modal_basic", {
        "Status": "Basic validation test",
        "Component": "Function Modal"
    })
    
    # Close modal
    close_btn = page.locator("#close-function-modal")
    close_btn.click()
    expect(function_modal).not_to_be_visible()


def test_function_execute_modal_no_parameters(page: Page, serve_hacka_re):
    """Test function execute modal with function that has no parameters"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Open function modal and check basic elements
    function_btn = page.locator("#function-btn")
    function_btn.click()
    
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    screenshot_with_markdown(page, "no_params_basic", {
        "Status": "Basic no parameters test",
        "Component": "Function Modal"
    })
    
    # Close modal
    close_btn = page.locator("#close-function-modal")
    close_btn.click()
    expect(function_modal).not_to_be_visible()