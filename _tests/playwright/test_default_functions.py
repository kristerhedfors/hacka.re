import pytest
from playwright.sync_api import expect

"""
Default Functions Test
Tests the default functions feature in the function calling manager
"""

from test_utils import dismiss_welcome_modal, dismiss_settings_modal

# Import helper functions from function_calling_api
try:
    from function_calling_api.helpers.setup_helpers import (
        setup_console_logging, 
        configure_api_key_and_model, 
        enable_tool_calling_and_function_tools
    )
except ImportError:
    # Define fallback functions if the imports fail
    def setup_console_logging(page):
        """Set up console error logging."""
        page.evaluate("""() => {
            window.consoleErrors = [];
            const originalConsoleError = console.error;
            console.error = function() {
                window.consoleErrors.push(Array.from(arguments).join(' '));
                originalConsoleError.apply(console, arguments);
            };
        }""")
    
    def configure_api_key_and_model(page, api_key):
        """Configure API key and model."""
        # Open settings
        page.locator("#settings-btn").click()
        settings_modal = page.locator("#settings-modal")
        expect(settings_modal).to_be_visible()
        
        # Set API key
        api_key_input = page.locator("#api-key")
        api_key_input.fill(api_key or "dummy-api-key-for-testing")
        
        # Select a model that supports function calling
        model_select = page.locator("#model-select")
        model_select.select_option("o4-mini")
        
        # Save settings
        page.locator("#save-settings-btn").click()
        expect(settings_modal).not_to_be_visible()
    
    def enable_tool_calling_and_function_tools(page):
        """Enable tool calling and function tools."""
        # Open settings
        page.locator("#settings-btn").click()
        settings_modal = page.locator("#settings-modal")
        expect(settings_modal).to_be_visible()
        
        # Scroll to the bottom to see the tool calling section
        page.evaluate("""() => {
            const modal = document.querySelector('#settings-modal .modal-content');
            if (modal) {
                modal.scrollTop = modal.scrollHeight;
            }
        }""")
        
        # Enable tool calling
        tool_calling_checkbox = page.locator("#tool-calling-enabled")
        if not tool_calling_checkbox.is_checked():
            tool_calling_checkbox.check()
        
        # Enable function tools
        function_tools_checkbox = page.locator("#function-tools-enabled")
        if not function_tools_checkbox.is_checked():
            function_tools_checkbox.check()
        
        # Save settings
        page.locator("#save-settings-btn").click()
        expect(settings_modal).not_to_be_visible()

def test_default_functions_section_exists(page, serve_hacka_re, api_key):
    """Test that the default functions section exists in the function calling modal"""
    # Set up console error logging
    setup_console_logging(page)
    
    # Navigate to the main page
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if present
    dismiss_settings_modal(page)
    
    # Configure API key and model
    configure_api_key_and_model(page, api_key)
    
    # Enable tool calling and function tools
    enable_tool_calling_and_function_tools(page)
    
    # Open the function calling modal
    page.click("button#function-btn")
    
    # Wait for the modal to be visible
    expect(page.locator("#function-modal")).to_be_visible()
    
    # Check if the default functions section exists
    default_functions_header = page.locator(".default-functions-header")
    expect(default_functions_header).to_be_visible()
    expect(default_functions_header).to_contain_text("Default Functions")

def test_default_functions_expandable(page, serve_hacka_re, api_key):
    """Test that the default functions section is expandable"""
    # Set up console error logging
    setup_console_logging(page)
    
    # Navigate to the main page
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if present
    dismiss_settings_modal(page)
    
    # Configure API key and model
    configure_api_key_and_model(page, api_key)
    
    # Enable tool calling and function tools
    enable_tool_calling_and_function_tools(page)
    
    # Open the function calling modal
    page.click("button#function-btn")
    
    # Wait for the modal to be visible
    expect(page.locator("#function-modal")).to_be_visible()
    
    # Default functions list should be initially hidden
    default_functions_list = page.locator(".default-functions-list")
    expect(default_functions_list).to_be_hidden()
    
    # Click on the default functions header to expand
    page.click(".default-functions-header")
    
    # Container should now be visible
    expect(default_functions_list).to_be_visible()
    
    # Click again to collapse
    page.click(".default-functions-header")
    
    # Container should be hidden again
    expect(default_functions_list).to_be_hidden()

def test_default_function_item_exists(page, serve_hacka_re, api_key):
    """Test that the getProgramPrivateKey function exists in the default functions section"""
    # Set up console error logging
    setup_console_logging(page)
    
    # Navigate to the main page
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if present
    dismiss_settings_modal(page)
    
    # Configure API key and model
    configure_api_key_and_model(page, api_key)
    
    # Enable tool calling and function tools
    enable_tool_calling_and_function_tools(page)
    
    # Open the function calling modal
    page.click("button#function-btn")
    
    # Wait for the modal to be visible
    expect(page.locator("#function-modal")).to_be_visible()
    
    # Expand the default functions section
    page.click(".default-functions-header")
    
    # Check if the getProgramPrivateKey function exists
    default_function_item = page.locator(".default-function-item")
    expect(default_function_item).to_be_visible()
    expect(default_function_item).to_contain_text("getProgramPrivateKey")

def test_default_function_view_only(page, serve_hacka_re, api_key):
    """Test that default functions are view-only and cannot be edited"""
    # Set up console error logging
    setup_console_logging(page)
    
    # Navigate to the main page
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if present
    dismiss_settings_modal(page)
    
    # Configure API key and model
    configure_api_key_and_model(page, api_key)
    
    # Enable tool calling and function tools
    enable_tool_calling_and_function_tools(page)
    
    # Open the function calling modal
    page.click("button#function-btn")
    
    # Wait for the modal to be visible
    expect(page.locator("#function-modal")).to_be_visible()
    
    # Expand the default functions section
    page.click(".default-functions-header")
    
    # Click on the getProgramPrivateKey function to view it
    page.click(".default-function-item:has-text('getProgramPrivateKey')")
    
    # Check if the function code editor is read-only
    function_code = page.locator("#function-code")
    expect(function_code).to_have_attribute("readonly", "readonly")
    
    # Check if the validation result shows the info message
    validation_result = page.locator(".function-validation-result.info")
    expect(validation_result).to_be_visible()
    expect(validation_result).to_contain_text("This is a default function and cannot be edited")

def test_default_function_cannot_be_deleted(page, serve_hacka_re, api_key):
    """Test that default functions cannot be deleted"""
    # Set up console error logging
    setup_console_logging(page)
    
    # Navigate to the main page
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if present
    dismiss_settings_modal(page)
    
    # Configure API key and model
    configure_api_key_and_model(page, api_key)
    
    # Enable tool calling and function tools
    enable_tool_calling_and_function_tools(page)
    
    # Open the function calling modal
    page.click("button#function-btn")
    
    # Wait for the modal to be visible
    expect(page.locator("#function-modal")).to_be_visible()
    
    # Expand the default functions section
    page.click(".default-functions-header")
    
    # Check that the default function item doesn't have a delete button
    default_function_item = page.locator(".default-function-item:has-text('getProgramPrivateKey')")
    delete_button = default_function_item.locator(".function-item-delete")
    expect(delete_button).to_have_count(0)

def test_default_function_checkbox(page, serve_hacka_re, api_key):
    """Test that default functions have checkboxes for enabling/disabling"""
    # Set up console error logging
    setup_console_logging(page)
    
    # Navigate to the main page
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if present
    dismiss_settings_modal(page)
    
    # Configure API key and model
    configure_api_key_and_model(page, api_key)
    
    # Enable tool calling and function tools
    enable_tool_calling_and_function_tools(page)
    
    # Open the function calling modal
    page.click("button#function-btn")
    
    # Wait for the modal to be visible
    expect(page.locator("#function-modal")).to_be_visible()
    
    # Expand the default functions section
    page.click(".default-functions-header")
    
    # Check that the default function item has a checkbox
    default_function_item = page.locator(".default-function-item:has-text('getProgramPrivateKey')")
    checkbox = default_function_item.locator(".function-item-checkbox")
    expect(checkbox).to_be_visible()
    
    # Check if the checkbox is initially checked (default functions are enabled by default)
    expect(checkbox).to_be_checked()
    
    # Uncheck the checkbox
    checkbox.uncheck()
    
    # Check that the checkbox is now unchecked
    expect(checkbox).not_to_be_checked()
    
    # Check it again
    checkbox.check()
    
    # Check that the checkbox is checked again
    expect(checkbox).to_be_checked()

def test_default_functions_readme(page, serve_hacka_re, api_key):
    """Create a README file for the default functions test"""
    readme_content = """# Default Functions Test

This test verifies the default functions feature in the function calling manager.

## What is being tested

1. The default functions section exists in the function calling modal
2. The default functions section is expandable/collapsible
3. The getProgramPrivateKey function exists in the default functions section
4. Default functions are view-only and cannot be edited
5. Default functions cannot be deleted
6. Default functions have checkboxes for enabling/disabling

## How to run the test

```bash
cd _tests/playwright
python -m pytest test_default_functions.py -v
```

## Expected results

All tests should pass, confirming that:
- The default functions section is properly displayed
- The getProgramPrivateKey function is available
- Default functions are protected from editing and deletion
- Default functions can be enabled/disabled using checkboxes
"""
    
    # Write the README file
    with open("_tests/playwright/DEFAULT_FUNCTIONS_README.md", "w") as f:
        f.write(readme_content)
    
    # Return success
    return True
