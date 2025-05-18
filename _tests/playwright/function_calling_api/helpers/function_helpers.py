"""
Function Helpers for Function Calling API Tests

This module contains helper functions for managing JavaScript functions
in function calling API tests.
"""
from playwright.sync_api import Page, expect
from test_utils import screenshot_with_markdown

def add_test_function(page):
    """Add a test function for weather information."""
    print("Adding test function...")
    
    # Click the function button
    function_btn = page.locator("#function-btn")
    function_btn.click()
    
    # Wait for the function modal to be visible
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    # Take a screenshot of the function modal
    screenshot_with_markdown(page, "function_modal_initial", {
        "Status": "Function modal opened",
        "Component": "Function Calling Modal"
    })
    
    # Fill in the function code with JSDoc comments for better tool definition
    # Include @tool tag to mark it as callable
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
    # Updated to check for the new validation message format
    expect(validation_result).to_contain_text("Library validated successfully")
    
    # Take a screenshot after validation
    screenshot_with_markdown(page, "function_validation", {
        "Status": "After validation",
        "Validation Result": page.locator("#function-validation-result").text_content()
    })
    
    # Submit the form
    page.locator("#function-editor-form button[type='submit']").click()
    
    # Check if the function was added to the list
    function_list = page.locator("#function-list")
    expect(function_list.locator(".function-item-name:has-text('get_weather')")).to_be_visible()
    
    # Check if the function is enabled by default
    function_checkbox = function_list.locator("input[type='checkbox']").first
    expect(function_checkbox).to_be_checked()
    
    # Take a screenshot after adding the function
    screenshot_with_markdown(page, "function_added", {
        "Status": "Function added",
        "Function Name": "get_weather",
        "Enabled": "Yes"
    })
    
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
    
    # Add both functions in a single code block to demonstrate function grouping
    function_code = page.locator("#function-code")
    function_code.fill("""/**
 * Helper function to format results (not exposed to LLM)
 */
function formatResult(data) {
  return JSON.stringify(data, null, 2);
}

/**
 * @description Get the current weather for a location
 * @param {string} location - The city or location to get weather for
 * @param {string} unit - The temperature unit (celsius or fahrenheit)
 * @tool This function will be exposed to the LLM
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
  
  const result = {
    location: location,
    temperature: temperature,
    unit: unit,
    condition: condition,
    humidity: Math.floor(Math.random() * 30) + 40
  };
  
  return {
    data: result,
    formatted: formatResult(result)
  };
}

/**
 * @description Perform a mathematical calculation
 * @param {string} operation - The operation to perform (add, subtract, multiply, divide)
 * @param {number} num1 - The first number
 * @param {number} num2 - The second number
 * @tool This function will be exposed to the LLM
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
    result: result,
    formatted: formatResult({
      operation: operation,
      result: result
    })
  };
}""")
    
    # Validate the functions
    page.locator("#function-validate-btn").click()
    
    # Check for validation result
    validation_result = page.locator("#function-validation-result")
    expect(validation_result).to_be_visible()
    # Updated to check for the new validation message format
    expect(validation_result).to_contain_text("Library validated successfully")
    
    # Submit the form
    page.locator("#function-editor-form button[type='submit']").click()
    
    # Check if both callable functions were added to the list
    function_list = page.locator("#function-list")
    expect(function_list.locator(".function-item-name:has-text('get_weather')")).to_be_visible()
    expect(function_list.locator(".function-item-name:has-text('calculate')")).to_be_visible()
    
    # Verify the helper function is not in the list (it's not tagged with @tool)
    helper_function = function_list.locator(".function-item-name:has-text('formatResult')")
    if helper_function.count() > 0:
        print("WARNING: Helper function appears in the list, but it should not")
    
    # Take a screenshot after adding multiple functions
    screenshot_with_markdown(page, "multiple_functions_added", {
        "Status": "Multiple functions added",
        "Functions": "get_weather, calculate",
        "Helper Functions": "formatResult (not visible in list)"
    })
    
    # Close the function modal
    page.locator("#close-function-modal").click()
    expect(function_modal).not_to_be_visible()

def add_rc4_functions(page):
    """Add RC4 encryption and decryption functions."""
    print("Adding RC4 encryption functions...")
    
    # Click the function button
    function_btn = page.locator("#function-btn")
    function_btn.click()
    
    # Wait for the function modal to be visible
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    # Add RC4 functions with helper functions in a single code block
    function_code = page.locator("#function-code")
    function_code.fill("""/**
 * Helper function to convert string to hex
 * @param {string} str - String to convert to hex
 * @returns {string} Hex representation of the string
 */
function stringToHex(str) {
  let hex = '';
  for (let i = 0; i < str.length; i++) {
    hex += str.charCodeAt(i).toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Helper function to convert hex to string
 * @param {string} hex - Hex string to convert
 * @returns {string} String representation of the hex
 */
function hexToString(hex) {
  let str = '';
  for (let i = 0; i < hex.length; i += 2) {
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  }
  return str;
}

/**
 * RC4 key scheduling algorithm
 * @param {string} key - The encryption key
 * @returns {Array} The initialized state array
 */
function rc4Init(key) {
  const s = [];
  for (let i = 0; i < 256; i++) {
    s[i] = i;
  }
  
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + s[i] + key.charCodeAt(i % key.length)) % 256;
    [s[i], s[j]] = [s[j], s[i]]; // Swap values
  }
  
  return s;
}

/**
 * RC4 encryption/decryption function
 * @param {string} input - The input text
 * @param {string} key - The encryption/decryption key
 * @returns {Array} Array of encrypted/decrypted bytes
 */
function rc4Process(input, key) {
  const s = rc4Init(key);
  const result = [];
  
  let i = 0;
  let j = 0;
  
  for (let k = 0; k < input.length; k++) {
    i = (i + 1) % 256;
    j = (j + s[i]) % 256;
    
    [s[i], s[j]] = [s[j], s[i]]; // Swap values
    
    const keyStream = s[(s[i] + s[j]) % 256];
    result.push(input.charCodeAt(k) ^ keyStream);
  }
  
  return result;
}

/**
 * Encrypt text using RC4 algorithm
 * @description Encrypts a string using RC4 and returns the result as a hex string
 * @param {string} plaintext - The text to encrypt
 * @param {string} key - The encryption key
 * @returns {Object} Object containing the encrypted text as hex
 * @tool This function will be exposed to the LLM
 */
function rc4_encrypt(plaintext, key) {
  if (!plaintext || !key) {
    return {
      success: false,
      error: "Both plaintext and key are required"
    };
  }
  
  try {
    const encrypted = rc4Process(plaintext, key);
    const encryptedHex = Array.from(encrypted)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
    
    return {
      success: true,
      ciphertext: encryptedHex,
      key_hex: stringToHex(key),
      plaintext_length: plaintext.length,
      ciphertext_length: encryptedHex.length / 2
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Decrypt hex string using RC4 algorithm
 * @description Decrypts a hex string using RC4 and returns the original text
 * @param {string} ciphertext - The hex string to decrypt
 * @param {string} key - The decryption key
 * @returns {Object} Object containing the decrypted text
 * @tool This function will be exposed to the LLM
 */
function rc4_decrypt(ciphertext, key) {
  if (!ciphertext || !key) {
    return {
      success: false,
      error: "Both ciphertext and key are required"
    };
  }
  
  try {
    // Validate hex format
    if (!/^[0-9a-fA-F]+$/.test(ciphertext)) {
      return {
        success: false,
        error: "Ciphertext must be a valid hex string"
      };
    }
    
    // Convert hex to bytes
    const bytes = [];
    for (let i = 0; i < ciphertext.length; i += 2) {
      bytes.push(parseInt(ciphertext.substr(i, 2), 16));
    }
    
    // Convert bytes to characters
    const input = String.fromCharCode(...bytes);
    
    // Decrypt
    const decrypted = rc4Process(input, key);
    const plaintext = String.fromCharCode(...decrypted);
    
    return {
      success: true,
      plaintext: plaintext,
      key_hex: stringToHex(key),
      ciphertext_length: ciphertext.length / 2,
      plaintext_length: plaintext.length
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}""")
    
    # Validate the functions
    page.locator("#function-validate-btn").click()
    
    # Check for validation result
    validation_result = page.locator("#function-validation-result")
    expect(validation_result).to_be_visible()
    # Updated to check for the new validation message format
    expect(validation_result).to_contain_text("Library validated successfully")
    
    # Submit the form
    page.locator("#function-editor-form button[type='submit']").click()
    
    # Check if both callable functions were added to the list
    function_list = page.locator("#function-list")
    expect(function_list.locator(".function-item-name:has-text('rc4_encrypt')")).to_be_visible()
    expect(function_list.locator(".function-item-name:has-text('rc4_decrypt')")).to_be_visible()
    
    # Verify the helper functions are not in the list (they're not tagged with @tool)
    helper_functions = [
        "stringToHex", 
        "hexToString", 
        "rc4Init", 
        "rc4Process"
    ]
    
    for helper in helper_functions:
        helper_function = function_list.locator(f".function-item-name:has-text('{helper}')")
        if helper_function.count() > 0:
            print(f"WARNING: Helper function {helper} appears in the list, but it should not")
    
    # Take a screenshot after adding RC4 functions
    screenshot_with_markdown(page, "rc4_functions_added", {
        "Status": "RC4 functions added",
        "Callable Functions": "rc4_encrypt, rc4_decrypt",
        "Helper Functions": "stringToHex, hexToString, rc4Init, rc4Process (not visible in list)"
    })
    
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
    
    # Validate the function
    page.locator("#function-validate-btn").click()
    
    # Check for validation result
    validation_result = page.locator("#function-validation-result")
    expect(validation_result).to_be_visible()
    # Updated to check for the new validation message format
    expect(validation_result).to_contain_text("Library validated successfully")
    
    # Submit the form
    page.locator("#function-editor-form button[type='submit']").click()
    
    # Check if the function was added to the list
    function_list = page.locator("#function-list")
    expect(function_list.locator(f".function-item-name:has-text('{function_name_match}')")).to_be_visible()

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
    while function_list.locator(".function-item-delete").count() > 0:
        function_list.locator(".function-item-delete").first.click()
        # Small wait to allow the UI to update
        page.wait_for_timeout(100)
    
    # Take a screenshot after cleanup
    screenshot_with_markdown(page, "functions_cleaned_up", {
        "Status": "Functions cleaned up",
        "Remaining Functions": "0"
    })
    
    # Close the function modal
    page.locator("#close-function-modal").click()
    expect(function_modal).not_to_be_visible()
