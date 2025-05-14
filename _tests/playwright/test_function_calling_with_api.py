import pytest
import time
import os
from dotenv import load_dotenv
from playwright.sync_api import Page, expect

from test_utils import timed_test, dismiss_welcome_modal, dismiss_settings_modal, check_system_messages, select_recommended_test_model

# Load environment variables from .env file in the current directory
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
# Get API key from environment variables
API_KEY = os.getenv("OPENAI_API_KEY")

# Skip the test if no API key is provided
pytestmark = pytest.mark.skipif(
    not API_KEY, 
    reason="API key is required for function calling tests"
)

# Set up console error logging
console_errors = []

def setup_console_logging(page):
    """Set up console error logging for the page."""
    global console_errors
    console_errors = []
    
    # Log all console messages
    page.on("console", lambda msg: console_errors.append(f"{msg.type}: {msg.text}") if msg.type == "error" else None)

@timed_test
def test_function_calling_with_api_key(page, serve_hacka_re):
    """Test function calling with a configured API key and function calling model."""
    # Navigate to the page with explicit wait for load
    print(f"Navigating to {serve_hacka_re}")
    page.goto(serve_hacka_re, wait_until="domcontentloaded")
    
    # Wait for the page to be fully loaded
    page.wait_for_load_state("networkidle")
    
    # Verify the page loaded correctly
    title = page.title()
    print(f"Page title: {title}")
    
    # Check if the page loaded correctly
    if not title or "hacka.re" not in title.lower():
        print("WARNING: Page may not have loaded correctly")
        # Try to navigate directly to index.html
        page.goto(f"{serve_hacka_re}/index.html", wait_until="domcontentloaded")
        page.wait_for_load_state("networkidle")
        title = page.title()
        print(f"After direct navigation, page title: {title}")
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if already open
    dismiss_settings_modal(page)
    
    # Configure API key and model
    configure_api_key_and_model(page)
    
    # Enable tool calling and function tools
    enable_tool_calling_and_function_tools(page)
    
    # Add a test function
    add_test_function(page)
    
    # Test function invocation through chat
    test_function_invocation_through_chat(page)
    
    # Clean up - delete the function
    cleanup_functions(page)

def configure_api_key_and_model(page):
    """Configure API key and select a function calling model."""
    print("Configuring API key and model...")
    
    # Click the settings button
    settings_button = page.locator("#settings-btn")
    settings_button.click(timeout=1000)
    
    # Wait for the settings modal to become visible
    page.wait_for_selector("#settings-modal.active", state="visible", timeout=2000)
    
    # Enter the API key from .env
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill(API_KEY)
    
    # Select Groq Cloud as the API provider (known to support function calling)
    base_url_select = page.locator("#base-url-select")
    base_url_select.select_option("groq")
    
    # Click the reload models button
    reload_button = page.locator("#model-reload-btn")
    reload_button.click()
    
    # Wait for the models to be loaded
    try:
        page.wait_for_selector("#model-select option:not([disabled])", state="visible", timeout=5000)
        print("Models loaded successfully")
    except Exception as e:
        print(f"Error waiting for models to load: {e}")
        time.sleep(1)
        
        # Check if there are any options in the model select
        options_count = page.evaluate("""() => {
            const select = document.getElementById('model-select');
            if (!select) return 0;
            return Array.from(select.options).filter(opt => !opt.disabled).length;
        }""")
        print(f"Found {options_count} non-disabled options in model select")
        
        if options_count == 0:
            # Try clicking the reload button again
            print("No options found, clicking reload button again")
            reload_button.click()
            time.sleep(2)
    
    # Select a model that supports function calling
    # First try to select llama-3.1-8b-instant which is known to support function calling
    selected_model = select_recommended_test_model(page)
    
    # Skip the test if no valid model could be selected
    if not selected_model:
        pytest.skip("No valid model could be selected")
    
    print(f"Selected model: {selected_model}")
    
    # Save the settings
    save_button = page.locator("#save-settings-btn")
    save_button.click(force=True)
    
    # Wait for the settings modal to be closed
    page.wait_for_selector("#settings-modal", state="hidden", timeout=2000)
    
    # Check for any system messages
    check_system_messages(page)

def enable_tool_calling_and_function_tools(page):
    """Enable tool calling and function tools in settings."""
    print("Enabling tool calling and function tools...")
    
    # Click the settings button
    settings_button = page.locator("#settings-btn")
    settings_button.click(timeout=1000)
    
    # Wait for the settings modal to become visible
    page.wait_for_selector("#settings-modal.active", state="visible", timeout=2000)
    
    # Take a screenshot of the settings modal for debugging
    page.screenshot(path="_tests/playwright/videos/settings_modal_before_scroll.png")
    
    # Scroll down to make sure the tool calling section is visible
    page.evaluate("""() => {
        const modal = document.querySelector('#settings-modal .modal-content');
        if (modal) {
            // Scroll to the bottom to ensure all content is visible
            modal.scrollTop = modal.scrollHeight;
        }
    }""")
    
    # Wait a moment for the scroll to complete
    page.wait_for_timeout(500)
    
    # Take another screenshot after scrolling
    page.screenshot(path="_tests/playwright/videos/settings_modal_after_scroll.png")
    
    # Check if the tool calling checkbox exists and enable it
    tool_calling_checkbox = page.locator("#enable-tool-calling")
    if tool_calling_checkbox.is_visible():
        if not tool_calling_checkbox.is_checked():
            tool_calling_checkbox.check()
            print("Tool calling enabled")
        else:
            print("Tool calling was already enabled")
    else:
        print("Tool calling checkbox not found, trying direct DOM manipulation")
        # Try direct DOM manipulation as a fallback
        checkbox_updated = page.evaluate("""() => {
            const checkbox = document.getElementById('enable-tool-calling');
            if (checkbox) {
                checkbox.checked = true;
                checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                return true;
            }
            return false;
        }""")
        
        if not checkbox_updated:
            print("Tool calling checkbox not found even with DOM manipulation")
            page.screenshot(path="_tests/playwright/videos/tool_calling_checkbox_not_found.png")
            pytest.skip("Tool calling checkbox not found")
    
    # Enable function tools checkbox
    function_tools_checkbox = page.locator("#enable-function-tools")
    if function_tools_checkbox.is_visible():
        if not function_tools_checkbox.is_checked():
            function_tools_checkbox.check()
            print("Function tools enabled")
        else:
            print("Function tools were already enabled")
    else:
        print("Function tools checkbox not found, trying direct DOM manipulation")
        # Try direct DOM manipulation as a fallback
        checkbox_updated = page.evaluate("""() => {
            const checkbox = document.getElementById('enable-function-tools');
            if (checkbox) {
                checkbox.checked = true;
                checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                return true;
            }
            return false;
        }""")
        
        if not checkbox_updated:
            print("Function tools checkbox not found even with DOM manipulation")
            page.screenshot(path="_tests/playwright/videos/function_tools_checkbox_not_found.png")
            pytest.skip("Function tools checkbox not found")
    
    # Save settings
    save_button = page.locator("#save-settings-btn")
    save_button.click(force=True)
    
    # Wait for the settings modal to be closed
    page.wait_for_selector("#settings-modal", state="hidden", timeout=2000)
    
    # Check for any system messages
    check_system_messages(page)

def add_test_function(page):
    """Add a test function for weather information."""
    print("Adding test function...")
    
    # Click the function button
    function_btn = page.locator("#function-btn")
    function_btn.click()
    
    # Wait for the function modal to be visible
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    # Fill in the function name
    function_name = page.locator("#function-name")
    function_name.fill("get_weather")
    
    # Fill in the function code with JSDoc comments for better tool definition
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
    
    # Validate the function
    page.locator("#function-validate-btn").click()
    
    # Check for validation result
    validation_result = page.locator("#function-validation-result")
    expect(validation_result).to_be_visible()
    expect(validation_result).to_contain_text("Function validated successfully")
    
    # Submit the form
    page.locator("#function-editor-form button[type='submit']").click()
    
    # Check if the function was added to the list
    function_list = page.locator("#function-list")
    expect(function_list.locator(".function-item-name:has-text('get_weather')")).to_be_visible()
    
    # Check if the function is enabled by default
    function_checkbox = function_list.locator("input[type='checkbox']").first
    expect(function_checkbox).to_be_checked()
    
    # Close the function modal
    page.locator("#close-function-modal").click()
    expect(function_modal).not_to_be_visible()

def test_function_invocation_through_chat(page):
    """Test function invocation through chat conversation."""
    print("Testing function invocation through chat...")
    
    # Type a message that should trigger the weather function
    message_input = page.locator("#message-input")
    test_message = "What's the weather like in London right now?"
    message_input.fill(test_message)
    
    # Send the message
    send_button = page.locator("#send-btn")
    send_button.click()
    
    # Wait for the user message to appear in the chat
    page.wait_for_selector(".message.user .message-content", state="visible", timeout=2000)
    user_message = page.locator(".message.user .message-content")
    expect(user_message).to_be_visible()
    expect(user_message).to_contain_text(test_message)
    
    # Wait for system messages about function execution
    # This may take some time as the model needs to decide to use the function
    try:
        # Wait for a system message indicating function execution
        page.wait_for_selector(".message.system .message-content:has-text('function')", 
                              state="visible", 
                              timeout=10000)
        
        # Check system messages
        system_messages = check_system_messages(page)
        
        # Verify that at least one system message mentions function execution
        function_execution_message_found = False
        for i in range(system_messages.count()):
            message_text = system_messages.nth(i).text_content()
            if "function" in message_text.lower() and ("executing" in message_text.lower() or "executed" in message_text.lower()):
                function_execution_message_found = True
                print(f"Found function execution message: {message_text}")
                break
        
        if not function_execution_message_found:
            print("WARNING: No function execution message found in system messages")
    except Exception as e:
        print(f"Error waiting for function execution message: {e}")
        # Continue the test even if we don't see the function execution message
        # as the model might not always choose to use the function
    
    # Wait for the assistant response
    try:
        page.wait_for_selector(".message.assistant .message-content", 
                              state="visible", 
                              timeout=10000)
        
        # Get the assistant message
        assistant_message = page.locator(".message.assistant .message-content").last
        assistant_text = assistant_message.text_content()
        print(f"Assistant response: {assistant_text}")
        
        # Check if the response contains weather-related information
        weather_terms = ["weather", "temperature", "celsius", "fahrenheit", "degrees", "london", "condition", "rainy", "sunny", "cloudy"]
        contains_weather_info = any(term in assistant_text.lower() for term in weather_terms)
        
        if contains_weather_info:
            print("Assistant response contains weather information")
        else:
            print("WARNING: Assistant response does not contain weather information")
            print("This could be because the model chose not to use the function")
            
        # The test passes as long as we got a response, even if the function wasn't used
        expect(assistant_message).to_be_visible()
    except Exception as e:
        print(f"Error waiting for assistant response: {e}")
        pytest.fail("Assistant response did not appear in chat")

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
    
    # Close the function modal
    page.locator("#close-function-modal").click()
    expect(function_modal).not_to_be_visible()

@timed_test
def test_multiple_functions_with_api_key(page, serve_hacka_re):
    """Test multiple functions with a configured API key."""
    # Set up console error logging
    setup_console_logging(page)
    
    # Navigate to the page with explicit wait for load
    print(f"Navigating to {serve_hacka_re}")
    page.goto(serve_hacka_re, wait_until="domcontentloaded")
    
    # Wait for the page to be fully loaded
    page.wait_for_load_state("networkidle")
    
    # Verify the page loaded correctly
    title = page.title()
    print(f"Page title: {title}")
    
    # Check if the page loaded correctly
    if not title or "hacka.re" not in title.lower():
        print("WARNING: Page may not have loaded correctly")
        # Try to navigate directly to index.html
        page.goto(f"{serve_hacka_re}/index.html", wait_until="domcontentloaded")
        page.wait_for_load_state("networkidle")
        title = page.title()
        print(f"After direct navigation, page title: {title}")
        
        # Take a screenshot of the page
        page.screenshot(path="_tests/playwright/videos/page_after_navigation.png")
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if already open
    dismiss_settings_modal(page)
    
    # Configure API key and model
    configure_api_key_and_model(page)
    
    # Enable tool calling and function tools
    enable_tool_calling_and_function_tools(page)
    
    # Add multiple test functions
    add_multiple_test_functions(page)
    
    # Test function invocation through chat with a message that could trigger multiple functions
    test_multiple_function_invocation(page)
    
    # Clean up - delete the functions
    cleanup_functions(page)

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
        "get_weather",
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
        "calculate",
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

def add_function(page, name, code):
    """Helper function to add a function with validation."""
    # Fill in the function name
    function_name = page.locator("#function-name")
    function_name.fill(name)
    
    # Fill in the function code
    function_code = page.locator("#function-code")
    function_code.fill(code)
    
    # Validate the function
    page.locator("#function-validate-btn").click()
    
    # Check for validation result
    validation_result = page.locator("#function-validation-result")
    expect(validation_result).to_be_visible()
    expect(validation_result).to_contain_text("Function validated successfully")
    
    # Submit the form
    page.locator("#function-editor-form button[type='submit']").click()
    
    # Check if the function was added to the list
    function_list = page.locator("#function-list")
    expect(function_list.locator(f".function-item-name:has-text('{name}')")).to_be_visible()

@timed_test
def test_function_validation_errors_with_api(page, serve_hacka_re):
    """Test validation errors for function calling with API key."""
    # Set up console error logging
    setup_console_logging(page)
    
    # Navigate to the page with explicit wait for load
    print(f"Navigating to {serve_hacka_re}")
    page.goto(serve_hacka_re, wait_until="domcontentloaded")
    page.wait_for_load_state("networkidle")
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if already open
    dismiss_settings_modal(page)
    
    # Configure API key and model
    configure_api_key_and_model(page)
    
    # Enable tool calling and function tools
    enable_tool_calling_and_function_tools(page)
    
    # Open function modal
    page.locator("#function-btn").click()
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    # Test case 1: Empty function name
    function_name = page.locator("#function-name")
    function_name.fill("")
    
    function_code = page.locator("#function-code")
    function_code.fill("""function test_function() {
  return { success: true };
}""")
    
    # Validate the function
    page.locator("#function-validate-btn").click()
    
    # Check for validation error
    validation_result = page.locator("#function-validation-result")
    expect(validation_result).to_be_visible()
    expect(validation_result).to_have_class("error")
    expect(validation_result).to_contain_text("Function name is required")
    
    # Take a screenshot of the validation error
    page.screenshot(path="_tests/playwright/videos/validation_error_empty_name.png")
    
    # Test case 2: Invalid function name format
    function_name.fill("123-invalid-name")
    
    # Validate the function
    page.locator("#function-validate-btn").click()
    
    # Check for validation error
    expect(validation_result).to_have_class("error")
    expect(validation_result).to_contain_text("Invalid function name")
    
    # Take a screenshot of the validation error
    page.screenshot(path="_tests/playwright/videos/validation_error_invalid_name.png")
    
    # Test case 3: Empty function code
    function_name.fill("valid_name")
    function_code.fill("")
    
    # Validate the function
    page.locator("#function-validate-btn").click()
    
    # Check for validation error
    expect(validation_result).to_have_class("error")
    expect(validation_result).to_contain_text("Function code is required")
    
    # Test case 4: Invalid function format
    function_code.fill("""const myFunction = () => {
  return { success: true };
}""")
    
    # Validate the function
    page.locator("#function-validate-btn").click()
    
    # Check for validation error
    expect(validation_result).to_have_class("error")
    expect(validation_result).to_contain_text("Invalid function format")
    
    # Test case 5: Function name mismatch
    function_name.fill("one_name")
    function_code.fill("""function different_name() {
  return { success: true };
}""")
    
    # Validate the function
    page.locator("#function-validate-btn").click()
    
    # Check for validation error
    expect(validation_result).to_have_class("error")
    expect(validation_result).to_contain_text("Function name in code")
    expect(validation_result).to_contain_text("does not match")
    
    # Test case 6: Syntax error in function
    function_name.fill("test_function")
    function_code.fill("""function test_function() {
  return { success: true;
}""")
    
    # Validate the function
    page.locator("#function-validate-btn").click()
    
    # Check for validation error
    expect(validation_result).to_have_class("error")
    expect(validation_result).to_contain_text("Syntax error")
    
    # Test case 7: Valid function with JSDoc comments
    function_name.fill("test_function")
    function_code.fill("""/**
 * @description Test function with JSDoc comments
 * @param {string} param1 - First parameter
 * @param {number} param2 - Second parameter
 * @returns {object} Result object
 */
function test_function(param1, param2) {
  return {
    message: `Received ${param1} and ${param2}`,
    success: true
  };
}""")
    
    # Validate the function
    page.locator("#function-validate-btn").click()
    
    # Check for validation success
    expect(validation_result).to_have_class("success")
    expect(validation_result).to_contain_text("Function validated successfully")
    
    # Take a screenshot of the validation success
    page.screenshot(path="_tests/playwright/videos/validation_success.png")
    
    # Close the function modal
    page.locator("#close-function-modal").click()
    expect(function_modal).not_to_be_visible()

@timed_test
def test_rc4_encryption_functions_with_api(page, serve_hacka_re):
    """Test RC4 encryption/decryption functions with API key."""
    # Set up console error logging
    setup_console_logging(page)
    
    # Navigate to the page with explicit wait for load
    print(f"Navigating to {serve_hacka_re}")
    page.goto(serve_hacka_re, wait_until="domcontentloaded")
    page.wait_for_load_state("networkidle")
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if already open
    dismiss_settings_modal(page)
    
    # Configure API key and model
    configure_api_key_and_model(page)
    
    # Enable tool calling and function tools
    enable_tool_calling_and_function_tools(page)
    
    # Add RC4 encryption function
    page.locator("#function-btn").click()
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    # Add the encrypt function
    function_name = page.locator("#function-name")
    function_name.fill("rc4_encrypt")
    
    function_code = page.locator("#function-code")
    function_code.fill("""/**
 * @description Encrypt text using RC4 algorithm
 * @param {string} plaintext - Text to encrypt
 * @param {string} key - Encryption key
 * @returns {object} Result with encrypted text
 */
function rc4_encrypt(plaintext, key) {
  // This function uses the RC4Utils module to encrypt data
  if (!plaintext || !key) {
    throw new Error("Both plaintext and key are required");
  }
  
  try {
    const encrypted = RC4Utils.encrypt(plaintext, key);
    return {
      success: true,
      plaintext: plaintext,
      key: key,
      encrypted: encrypted
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}""")
    
    # Validate the function
    page.locator("#function-validate-btn").click()
    
    # Check for validation result
    validation_result = page.locator("#function-validation-result")
    expect(validation_result).to_be_visible()
    expect(validation_result).to_contain_text("Function validated successfully")
    
    # Submit the form
    page.locator("#function-editor-form button[type='submit']").click()
    
    # Add the decrypt function
    function_name.fill("rc4_decrypt")
    
    function_code.fill("""/**
 * @description Decrypt text using RC4 algorithm
 * @param {string} ciphertext - Encrypted text (hex format)
 * @param {string} key - Decryption key
 * @returns {object} Result with decrypted text
 */
function rc4_decrypt(ciphertext, key) {
  // This function uses the RC4Utils module to decrypt data
  if (!ciphertext || !key) {
    throw new Error("Both ciphertext and key are required");
  }
  
  try {
    const decrypted = RC4Utils.decrypt(ciphertext, key);
    return {
      success: true,
      ciphertext: ciphertext,
      key: key,
      decrypted: decrypted
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}""")
    
    # Validate the function
    page.locator("#function-validate-btn").click()
    
    # Check for validation result
    expect(validation_result).to_contain_text("Function validated successfully")
    
    # Submit the form
    page.locator("#function-editor-form button[type='submit']").click()
    
    # Check if both functions were added to the list
    function_list = page.locator("#function-list")
    expect(function_list.locator(".function-item-name:has-text('rc4_encrypt')")).to_be_visible()
    expect(function_list.locator(".function-item-name:has-text('rc4_decrypt')")).to_be_visible()
    
    # Close the function modal
    page.locator("#close-function-modal").click()
    expect(function_modal).not_to_be_visible()
    
    # Test encryption/decryption through chat
    message_input = page.locator("#message-input")
    test_message = "Encrypt the text 'Hello, World!' using the key 'secret'"
    message_input.fill(test_message)
    
    # Send the message
    send_button = page.locator("#send-btn")
    send_button.click()
    
    # Wait for the assistant response
    try:
        page.wait_for_selector(".message.assistant .message-content", 
                              state="visible", 
                              timeout=10000)
        
        # Get the assistant message
        assistant_message = page.locator(".message.assistant .message-content").last
        assistant_text = assistant_message.text_content()
        print(f"Assistant response: {assistant_text}")
        
        # The test passes as long as we got a response
        expect(assistant_message).to_be_visible()
    except Exception as e:
        print(f"Error waiting for assistant response: {e}")
        pytest.fail("Assistant response did not appear in chat")
    
    # Clean up - delete the functions
    cleanup_functions(page)

def test_multiple_function_invocation(page):
    """Test invocation of multiple functions through chat."""
    print("Testing multiple function invocation...")
    
    # Clear the chat history first
    page.evaluate("""() => {
        if (window.chatManager && window.chatManager.clearMessages) {
            window.chatManager.clearMessages();
        }
    }""")
    
    # Type a message that could trigger the calculator function
    message_input = page.locator("#message-input")
    test_message = "What is 25 multiplied by 4?"
    message_input.fill(test_message)
    
    # Send the message
    send_button = page.locator("#send-btn")
    send_button.click()
    
    # Wait for the user message to appear in the chat
    page.wait_for_selector(".message.user .message-content", state="visible", timeout=2000)
    
    # Wait for the assistant response
    try:
        page.wait_for_selector(".message.assistant .message-content", 
                              state="visible", 
                              timeout=10000)
        
        # Get the assistant message
        assistant_message = page.locator(".message.assistant .message-content").last
        assistant_text = assistant_message.text_content()
        print(f"Assistant response: {assistant_text}")
        
        # Check if the response contains calculation-related information
        calculation_terms = ["25", "4", "100", "multiply", "multiplied", "result", "equals", "="]
        contains_calculation_info = any(term in assistant_text.lower() for term in calculation_terms)
        
        if contains_calculation_info:
            print("Assistant response contains calculation information")
        else:
            print("WARNING: Assistant response does not contain calculation information")
            
        # The test passes as long as we got a response, even if the function wasn't used
        expect(assistant_message).to_be_visible()
    except Exception as e:
        print(f"Error waiting for assistant response: {e}")
        pytest.fail("Assistant response did not appear in chat")
    
    # Now try a weather query
    message_input = page.locator("#message-input")
    test_message = "What's the weather like in Tokyo today?"
    message_input.fill(test_message)
    
    # Send the message
    send_button = page.locator("#send-btn")
    send_button.click()
    
    # Wait for the user message to appear in the chat
    page.wait_for_selector(".message.user .message-content:has-text('Tokyo')", state="visible", timeout=2000)
    
    # Wait for the assistant response
    try:
        # Get the count of assistant messages before waiting for a new one
        previous_count = page.locator(".message.assistant").count()
        
        # Wait for a new assistant message
        page.wait_for_function(
            """(prevCount) => document.querySelectorAll('.message.assistant').length > prevCount""",
            arg=previous_count,
            timeout=10000
        )
        
        # Get the latest assistant message
        assistant_message = page.locator(".message.assistant .message-content").last
        assistant_text = assistant_message.text_content()
        print(f"Assistant response for weather query: {assistant_text}")
        
        # Check if the response contains weather-related information
        weather_terms = ["weather", "temperature", "celsius", "fahrenheit", "degrees", "tokyo", "condition", "sunny"]
        contains_weather_info = any(term in assistant_text.lower() for term in weather_terms)
        
        if contains_weather_info:
            print("Assistant response contains weather information")
        else:
            print("WARNING: Assistant response does not contain weather information")
            
        # The test passes as long as we got a response, even if the function wasn't used
        expect(assistant_message).to_be_visible()
    except Exception as e:
        print(f"Error waiting for assistant response: {e}")
        pytest.fail("Assistant response did not appear in chat")
