import pytest
from playwright.sync_api import Page, expect

from test_utils import timed_test, dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown

def test_user_prompts_before_default_prompts(page: Page, serve_hacka_re):
    """Test that user-defined prompts appear before Default Prompts in the prompt modal."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Take a screenshot at the start
    screenshot_with_markdown(page, "prompt_order_test_start.png", {
        "Status": "Test started",
        "Test Name": "User Prompts Before Default Prompts",
        "Description": "Verifying that user-defined prompts appear before default prompts"
    })
    
    # Click the prompts button to open the prompts modal
    prompts_button = page.locator("#prompts-btn")
    prompts_button.click()
    
    # Check that the prompts modal is visible
    prompts_modal = page.locator("#prompts-modal")
    expect(prompts_modal).to_be_visible()
    
    # Create a user-defined prompt
    page.locator("#new-prompt-label").fill("Test User Prompt")
    page.locator("#new-prompt-content").fill("This is a test user prompt")
    page.locator(".new-prompt-save").click()
    
    # Wait for the prompt to be saved and the list to be reloaded
    page.wait_for_timeout(500)
    
    # Take a screenshot after creating the user prompt
    screenshot_with_markdown(page, "user_prompt_created.png", {
        "Status": "User prompt created",
        "Prompt Name": "Test User Prompt",
        "Test Name": "User Prompts Before Default Prompts"
    })
    
    # Get all elements in the prompts list
    prompts_list = page.locator("#prompts-list")
    
    # Find the user prompt element
    user_prompt = page.locator(".prompt-item:has-text('Test User Prompt')")
    expect(user_prompt).to_be_visible()
    
    # Find the default prompts section
    default_prompts_section = page.locator(".default-prompts-section")
    expect(default_prompts_section).to_be_visible()
    
    # Get the bounding boxes to determine positions
    user_prompt_box = user_prompt.bounding_box()
    default_prompts_box = default_prompts_section.bounding_box()
    
    # Assert that the user prompt appears before (above) the default prompts section
    assert user_prompt_box['y'] < default_prompts_box['y'], "User prompt should appear before default prompts"
    
    # Take a screenshot showing the order
    screenshot_with_markdown(page, "prompt_order_verification.png", {
        "Status": "Verifying prompt order",
        "User Prompt Y Position": user_prompt_box['y'],
        "Default Prompts Y Position": default_prompts_box['y'],
        "Result": "User prompt appears before default prompts"
    })
    
    # Clean up - delete the test prompt
    delete_button = user_prompt.locator(".prompt-item-delete")
    delete_button.click()
    
    # Confirm deletion
    page.once("dialog", lambda dialog: dialog.accept())
    
    # Wait for the prompt to be deleted
    page.wait_for_timeout(500)
    
    # Close the prompts modal
    page.locator("#close-prompts-modal").click()
    expect(prompts_modal).not_to_be_visible()

def test_function_library_default_prompt(page: Page, serve_hacka_re):
    """Test that the 'All Javascript functions in Function Library' default prompt is available and works correctly."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Take a screenshot at the start
    screenshot_with_markdown(page, "function_library_prompt_test_start.png", {
        "Status": "Test started",
        "Test Name": "Function Library Default Prompt",
        "Description": "Verifying that the Function Library default prompt exists and works correctly"
    })
    
    # First, create a function in the function library
    page.locator("#function-btn").click()
    
    # Wait for the function modal to be visible
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    # Fill in the function code
    function_code = """
/**
 * A test function for the function library prompt
 * @description This is a test function
 * @param {string} input - Input string
 * @returns {Object} Result object
 */
function test_function(input) {
  return {
    result: `Processed: ${input}`,
    timestamp: new Date().toISOString()
  };
}
"""
    page.locator("#function-code").fill(function_code)
    
    # Save the function
    page.locator("#function-editor-form button[type='submit']").click()
    
    # Wait for the function to be saved
    page.wait_for_timeout(500)
    
    # Take a screenshot after creating the function
    screenshot_with_markdown(page, "function_created.png", {
        "Status": "Function created",
        "Function Name": "test_function",
        "Test Name": "Function Library Default Prompt"
    })
    
    # Close the function modal
    page.locator("#close-function-modal").click()
    expect(function_modal).not_to_be_visible()
    
    # Open the prompts modal
    page.locator("#prompts-btn").click()
    
    # Check that the prompts modal is visible
    prompts_modal = page.locator("#prompts-modal")
    expect(prompts_modal).to_be_visible()
    
    # Expand the default prompts section
    page.locator(".default-prompts-header").click()
    
    # Wait for the default prompts list to be visible
    default_prompts_list = page.locator(".default-prompts-list")
    expect(default_prompts_list).to_be_visible()
    
    # Check if the "All Javascript functions in Function Library" prompt exists
    function_library_prompt = page.locator(".default-prompt-item:has-text('All Javascript functions in Function Library')")
    expect(function_library_prompt).to_be_visible()
    
    # Take a screenshot showing the function library prompt
    screenshot_with_markdown(page, "function_library_prompt_exists.png", {
        "Status": "Function Library prompt found",
        "Prompt Name": "All Javascript functions in Function Library",
        "Test Name": "Function Library Default Prompt"
    })
    
    # Click the info icon to view the prompt content
    info_icon = function_library_prompt.locator(".prompt-item-info")
    info_icon.click()
    
    # Check if the prompt content contains the function we added
    content_field = page.locator("#new-prompt-content")
    expect(content_field).to_be_visible()
    
    # Get the content text
    content_text = content_field.input_value()
    
    # Check that the content contains the function name and description
    assert "test_function" in content_text, "Function library prompt should contain the function name"
    assert "This is a test function" in content_text, "Function library prompt should contain the function description"
    
    # Take a screenshot showing the function library prompt content
    screenshot_with_markdown(page, "function_library_prompt_content.png", {
        "Status": "Function Library prompt content verified",
        "Contains Function Name": "test_function" in content_text,
        "Contains Function Description": "This is a test function" in content_text,
        "Test Name": "Function Library Default Prompt"
    })
    
    # Close the prompts modal
    page.locator("#close-prompts-modal").click()
    expect(prompts_modal).not_to_be_visible()
    
    # Clean up - delete the test function
    page.locator("#function-btn").click()
    expect(function_modal).to_be_visible()
    
    # Find and delete the function
    function_item = page.locator(".function-item:has-text('test_function')")
    expect(function_item).to_be_visible()
    
    # Click the delete button
    delete_button = function_item.locator(".function-item-delete")
    
    # Set up dialog handler before clicking delete
    page.once("dialog", lambda dialog: dialog.accept())
    delete_button.click()
    
    # Wait for the function to be deleted
    page.wait_for_timeout(500)
    
    # Close the function modal
    page.locator("#close-function-modal").click()
    expect(function_modal).not_to_be_visible()
