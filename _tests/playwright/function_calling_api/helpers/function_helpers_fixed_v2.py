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
    # The function name field will be auto-populated from the function declaration
    function_code = page.locator("#function-code")
    function_code.fill("""/**
 * @description Get the current weather for a location
 * @param {string} location - The city or location to get weather for
 * @param {string} unit - The temperature unit (celsius or fahrenheit)
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
    
    # Check that the function name field was auto-populated
    function_name = page.locator("#function-name")
    expect(function_name).to_be_visible()
    expect(function_name).to_have_value("get_weather")
    
    # Validate the function
    page.locator("#function-validate-btn").click()
    
    # Check for validation result
    validation_result = page.locator("#function-validation-result")
    expect(validation_result).to_be_visible()
    
    # Get the validation result text
    validation_text = validation_result.text_content()
    print(f"Validation result: {validation_text}")
    
    # Check if validation was successful or if there was an error
    has_error_class = validation_result.evaluate("el => el.classList.contains('error')")
    
    if has_error_class:
        print(f"ERROR: Validation failed with message: {validation_text}")
        raise Exception(f"Function validation failed: {validation_text}")
    
    expect(validation_result).to_contain_text("Function validated successfully")
    
    # Submit the form
    page.locator("#function-editor-form button[type='submit']").click()
    
    # Check if the function was added to the list
    function_list = page.locator("#function-list")
    try:
        expect(function_list.locator(".function-item-name:has-text('get_weather')")).to_be_visible()
    except Exception as e:
        # Take a screenshot for debugging
        page.screenshot(path="_tests/playwright/videos/function_not_added.png")
        # Check if there are any error messages
        error_messages = page.locator(".error-message")
        if error_messages.count() > 0:
            error_text = error_messages.first.text_content()
            print(f"ERROR: Failed to add function: {error_text}")
            raise Exception(f"Failed to add function: {error_text}") from e
        raise
    
    # Check if the function is enabled by default
    function_checkbox = function_list.locator("input[type='checkbox']").first
    expect(function_checkbox).to_be_checked()
    
    # Close the function modal
    page.locator("#close-function-modal").click()
    expect(function_modal).not_to_be_visible()

def add_multiple_test_functions(page):
    """Add multiple test functions for different purposes."""
    print("Adding multiple test functions...")
    
    # Click the function button
    function_btn = page.locator("#function-btn")
    function_btn.click()
    
    # Wait for the function modal to be visible
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    # Add weather function
    add_function(
        page,
        """/**
 * @description Get the current weather for a location
 * @param {string} location - The city or location to get weather for
 * @param {string} unit - The temperature unit (celsius or fahrenheit)
 */
function get_weather(location, unit = "celsius") {
  console.log(`Getting weather for ${location} in ${unit}`);
  
  const lowercaseLocation = location.toLowerCase();
  if (lowercaseLocation.includes("london")) {
    temperature = unit === "celsius" ? 15 : 59;
    condition = "Rainy";
  } else if (lowercaseLocation.includes("tokyo")) {
    temperature = unit === "celsius" ? 20 : 68;
    condition = "Sunny";
  } else {
    temperature = unit === "celsius" ? 18 : 64;
    condition = "Fair";
  }
  
  return {
    location: location,
    temperature: temperature,
    unit: unit,
    condition: condition,
    humidity: Math.floor(Math.random() * 30) + 40,
    timestamp: new Date().toISOString()
  };
}"""
    )
    
    # Add calculator function
    add_function(
        page,
        """/**
 * @description Perform a mathematical calculation
 * @param {string} operation - The operation to perform (add, subtract, multiply, divide)
 * @param {number} num1 - The first number
 * @param {number} num2 - The second number
 */
function calculate(operation, num1, num2) {
  console.log(`Calculating ${operation} with ${num1} and ${num2}`);
  
  let result;
  switch(operation.toLowerCase()) {
    case "add":
      result = num1 + num2;
      break;
    case "subtract":
      result = num1 - num2;
      break;
    case "multiply":
      result = num1 * num2;
      break;
    case "divide":
      if (num2 === 0) {
        throw new Error("Cannot divide by zero");
      }
      result = num1 / num2;
      break;
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
  
  return {
    operation: operation,
    num1: num1,
    num2: num2,
    result: result
  };
}"""
    )
    
    # Close the function modal
    page.locator("#close-function-modal").click()
    expect(function_modal).not_to_be_visible()

def add_function(page, code):
    """Helper function to add a function with validation."""
    # Fill in the function code - the name field will be auto-populated
    function_code = page.locator("#function-code")
    function_code.fill(code)
    
    # Extract the function name from the code
    function_name_match = page.evaluate("""(code) => {
        const match = code.match(/function\\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\\s*\\(/);
        return match ? match[1] : null;
    }""", code)
    
    if not function_name_match:
        print("ERROR: Could not extract function name from code")
        raise Exception("Could not extract function name from code")
    
    print(f"Extracted function name: {function_name_match}")
    
    # Check that the function name field was auto-populated
    function_name = page.locator("#function-name")
    expect(function_name).to_be_visible()
    
    # Wait for the function name to be auto-populated
    try:
        expect(function_name).to_have_value(function_name_match, timeout=5000)
    except Exception as e:
        actual_value = function_name.input_value()
        print(f"ERROR: Function name field was not auto-populated correctly. Expected: '{function_name_match}', Actual: '{actual_value}'")
        # Take a screenshot for debugging
        page.screenshot(path="_tests/playwright/videos/function_name_not_populated.png")
        raise Exception(f"Function name field was not auto-populated correctly. Expected: '{function_name_match}', Actual: '{actual_value}'") from e
    
    # Validate the function
    page.locator("#function-validate-btn").click()
    
    # Check for validation result
    validation_result = page.locator("#function-validation-result")
    expect(validation_result).to_be_visible()
    
    # Get the validation result text
    validation_text = validation_result.text_content()
    print(f"Validation result for {function_name_match}: {validation_text}")
    
    # Check if validation was successful or if there was an error
    has_error_class = validation_result.evaluate("el => el.classList.contains('error')")
    
    if has_error_class:
        print(f"ERROR: Validation failed for {function_name_match} with message: {validation_text}")
        raise Exception(f"Function validation failed for {function_name_match}: {validation_text}")
    
    expect(validation_result).to_contain_text("Function validated successfully")
    
    # Submit the form
    page.locator("#function-editor-form button[type='submit']").click()
    
    # Check if the function was added to the list
    function_list = page.locator("#function-list")
    try:
        expect(function_list.locator(f".function-item-name:has-text('{function_name_match}')")).to_be_visible()
    except Exception as e:
        # Take a screenshot for debugging
        page.screenshot(path=f"_tests/playwright/videos/function_{function_name_match}_not_added.png")
        # Check if there are any error messages
        error_messages = page.locator(".error-message")
        if error_messages.count() > 0:
            error_text = error_messages.first.text_content()
            print(f"ERROR: Failed to add function {function_name_match}: {error_text}")
            raise Exception(f"Failed to add function {function_name_match}: {error_text}") from e
        raise

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
    
    # Delete all functions
    delete_buttons = function_list.locator(".function-item-delete")
    delete_count = delete_buttons.count()
    print(f"Found {delete_count} functions to delete")
    
    while delete_buttons.count() > 0:
        # Get the function name before deleting
        function_name = function_list.locator(".function-item-name").first.text_content()
        print(f"Deleting function: {function_name}")
        
        delete_buttons.first.click()
        # Small wait to allow the UI to update
        page.wait_for_timeout(100)
    
    # Check if all functions were deleted
    remaining_count = function_list.locator(".function-item").count()
    if remaining_count > 0:
        print(f"WARNING: {remaining_count} functions remain after cleanup")
    else:
        print("All functions successfully deleted")
    
    # Close the function modal
    page.locator("#close-function-modal").click()
    expect(function_modal).not_to_be_visible()
