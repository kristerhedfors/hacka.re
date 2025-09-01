"""Test for function execute modal with auxiliary functions"""
import time
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_execute_modal_with_auxiliary_functions(page: Page, serve_hacka_re):
    """Test that auxiliary functions like formatNumber are available during execution"""
    
    # Navigate to the app
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    # Open function calling modal
    function_button = page.locator("#function-btn")
    function_button.click()
    
    # Wait for modal to be visible
    page.wait_for_selector("#function-modal.active", state="visible", timeout=5000)
    
    # Click Example button to load the sample functions
    example_button = page.locator("#function-clear-btn")
    example_button.click()
    
    # Wait for code to be populated
    page.wait_for_timeout(500)
    
    # Save the functions
    save_button = page.locator("#function-save-js")
    save_button.click()
    
    # Wait for success message
    page.wait_for_selector("#function-js-success", state="visible", timeout=5000)
    
    # Find get_weather function in the list and click edit
    function_rows = page.locator(".function-row")
    get_weather_row = None
    
    for i in range(function_rows.count()):
        row = function_rows.nth(i)
        name_element = row.locator(".function-js-name")
        if name_element.text_content() == "get_weather":
            get_weather_row = row
            break
    
    assert get_weather_row is not None, "get_weather function not found"
    
    # Click the edit button
    edit_button = get_weather_row.locator(".edit-function-button")
    edit_button.click()
    
    # Wait for function to load in editor
    page.wait_for_timeout(500)
    
    # Click the Execute button
    execute_button = page.locator("#function-execute-button")
    execute_button.click()
    
    # Wait for execute modal to open
    page.wait_for_selector("#function-execute-modal.show", state="visible", timeout=5000)
    
    # Fill in parameters
    location_input = page.locator('[data-param-name="location"]')
    location_input.fill("London")
    
    units_input = page.locator('[data-param-name="units"]')
    units_input.fill("metric")
    
    # Execute the function
    run_button = page.locator("#function-execute-run")
    run_button.click()
    
    # Wait for output
    page.wait_for_selector("#function-execute-output-section", state="visible", timeout=5000)
    
    # Check that there's no error
    error_section = page.locator("#function-execute-error-section")
    if error_section.is_visible():
        error_message = page.locator("#function-execute-error-message").text_content()
        screenshot_with_markdown(page, "execute_error", {
            "Error": error_message,
            "Test": "Execute modal with auxiliary functions"
        })
        assert False, f"Execution failed with error: {error_message}"
    
    # Get the output
    output_content = page.locator("#function-execute-output-content").text_content()
    
    # Verify the output contains formatted temperature (should use formatNumber)
    assert "formatted_temp" in output_content, "Output should contain formatted_temp field"
    assert "22°C" in output_content or "22°F" in output_content, "Output should contain formatted temperature"
    
    screenshot_with_markdown(page, "execute_success", {
        "Status": "Successfully executed get_weather with formatNumber",
        "Output": output_content[:100] + "..." if len(output_content) > 100 else output_content
    })
    
    print(f"✅ Function executed successfully with auxiliary functions available")
    print(f"Output: {output_content}")