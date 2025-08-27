"""
Function Helpers for Function Calling API Tests

This module contains helper functions for managing JavaScript functions
in function calling API tests.
"""
from playwright.sync_api import Page, expect

def add_test_function(page):
    """Add a test function for weather information."""
    print("Adding test function...")
    
    # Click the function button
    function_btn = page.locator("#function-btn")
    function_btn.click()
    
    # Wait for the function modal to be visible
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    # Fill in the function code with JSDoc comments for better tool definition
    function_code = page.locator("#function-code")
    function_code.fill("""/**
 * @description Get the current weather for a location
 * @param {string} location - The city or location to get weather for
 * @param {string} unit - The temperature unit (celsius or fahrenheit)
 * @tool This function will be exposed to the LLM
 */
function get_weather(location, unit = "celsius") {
  // This is a mock function that returns fake weather data
  console.log(`Getting weather for ${location} in ${unit}`);
  
  // Simulate different weather conditions based on location
  let temperature, condition;
  
  const lowercaseLocation = location.toLowerCase();
  if (lowercaseLocation.includes("london")) {
    temperature = unit === "celsius" ? 15 : 59;
    condition = "Rainy";
  } else if (lowercaseLocation.includes("tokyo")) {
    temperature = unit === "celsius" ? 20 : 68;
    condition = "Sunny";
  } else if (lowercaseLocation.includes("new york")) {
    temperature = unit === "celsius" ? 22 : 72;
    condition = "Partly Cloudy";
  } else if (lowercaseLocation.includes("sydney")) {
    temperature = unit === "celsius" ? 25 : 77;
    condition = "Clear";
  } else {
    temperature = unit === "celsius" ? 18 : 64;
    condition = "Fair";
  }
  
  return {
    location: location,
    temperature: temperature,
    unit: unit,
    condition: condition,
    humidity: Math.floor(Math.random() * 30) + 40, // Random humidity between 40-70%
    timestamp: new Date().toISOString()
  };
}""")
    
    # Validate the function
    page.locator("#function-validate-btn").click()
    
    # Check for validation result
    validation_result = page.locator("#function-validation-result")
    expect(validation_result).to_be_visible()
    expect(validation_result).to_contain_text("Library validated successfully")
    
    # Submit the form
    page.locator("#function-editor-form button[type='submit']").click()
    
    # Check if the function was added to the list
    function_list = page.locator("#function-list")
    expect(function_list.locator(".function-item-name:has-text('get_weather')").first).to_be_visible()
    
    # Check if the function is enabled by default
    function_checkbox = function_list.locator(".function-item-checkbox").first
    expect(function_checkbox).to_be_checked()
    
    # Close the function modal
    page.locator("#close-function-modal").click()
    expect(function_modal).not_to_be_visible()

def add_multiple_test_functions(page):
    """Add a simple calculator function for testing."""
    print("Adding simple calculator function...")
    
    # Click the function button
    function_btn = page.locator("#function-btn")
    function_btn.click()
    
    # Wait for the function modal to be visible
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    # Fill in the function code with a simple calculator function
    function_code = page.locator("#function-code")
    function_code.fill("""/**
 * @description Multiply two numbers together
 * @param {number} a - First number
 * @param {number} b - Second number
 * @tool This function will be exposed to the LLM
 */
function multiply(a, b) {
  console.log(`Multiplying ${a} and ${b}`);
  return {
    a: a,
    b: b,
    result: a * b
  };
}""")
    
    # Validate the functions
    page.locator("#function-validate-btn").click()
    
    # Check for validation result
    validation_result = page.locator("#function-validation-result")
    expect(validation_result).to_be_visible()
    expect(validation_result).to_contain_text("Library validated successfully")
    
    # Submit the form
    page.locator("#function-editor-form button[type='submit']").click()
    
    # Check if the function was added to the list
    function_list = page.locator("#function-list")
    expect(function_list.locator(".function-item-name:has-text('multiply')").first).to_be_visible()
    
    # Check if the function is enabled by default
    function_checkbox = function_list.locator(".function-item-checkbox").first
    expect(function_checkbox).to_be_checked()
    
    # Close the function modal
    page.locator("#close-function-modal").click()
    expect(function_modal).not_to_be_visible()

def add_function(page, code):
    """Helper function to add a function with validation."""
    # Fill in the function code
    function_code = page.locator("#function-code")
    function_code.fill(code)
    
    # Extract the function name from the code
    function_name_match = page.evaluate("""(code) => {
        const match = code.match(/function\\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\\s*\\(/);
        return match ? match[1] : null;
    }""", code)
    
    # Validate the function
    page.locator("#function-validate-btn").click()
    
    # Check for validation result
    validation_result = page.locator("#function-validation-result")
    expect(validation_result).to_be_visible()
    expect(validation_result).to_contain_text("Library validated successfully")
    
    # Submit the form
    page.locator("#function-editor-form button[type='submit']").click()
    
    # Check if the function was added to the list
    function_list = page.locator("#function-list")
    expect(function_list.locator(f".function-item-name:has-text('{function_name_match}')").first).to_be_visible()

def cleanup_functions(page):
    """Clean up by deleting the test function."""
    print("Cleaning up functions...")
    
    # Open the function modal
    function_btn = page.locator("#function-btn")
    function_btn.click()
    
    # Wait for the function modal to be visible
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    # Get the function list
    function_list = page.locator("#function-list")
    
    # Handle the confirmation dialog for deletion
    page.on("dialog", lambda dialog: dialog.accept())
    
    # Delete all function collections (which deletes all functions)
    while function_list.locator(".function-collection-delete:not([disabled])").count() > 0:
        function_list.locator(".function-collection-delete:not([disabled])").first.click()
        # Small wait to allow the UI to update
        page.wait_for_timeout(100)
    
    # Close the function modal
    page.locator("#close-function-modal").click()
    expect(function_modal).not_to_be_visible()
