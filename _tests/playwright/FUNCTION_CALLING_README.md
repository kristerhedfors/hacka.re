# Function Calling Modal Testing Guide

This document provides detailed information about the function calling modal in hacka.re and how to properly test it. The function calling feature allows users to define JavaScript functions that can be called by the AI model during chat interactions.

## Overview of the Function Calling Modal

The function calling modal is a UI component that allows users to:

1. Create and edit JavaScript functions
2. Validate function syntax and generate tool definitions
3. Enable/disable functions for AI tool calling
4. Manage a library of functions

## Key Components

### Modal Structure

- **Function List**: Displays all defined functions with enable/disable toggles and delete buttons
- **Function Editor**: Code editor for writing and editing JavaScript functions
- **Validation Area**: Shows validation results and generated tool definitions
- **Action Buttons**: Validate, Add/Update, Clear, and Copy buttons

### Important DOM Elements

| Element ID | Description | Notes |
|------------|-------------|-------|
| `#function-modal` | The main modal container | |
| `#function-list` | Container for the list of functions | |
| `#function-editor-form` | Form for adding/editing functions | |
| `#function-code` | Textarea for function code | Main input for function definition |
| `#function-validation-result` | Shows validation results | |
| `#function-tool-definition` | Shows generated tool definition | Hidden until validation |
| `#function-validate-btn` | Button to validate function | |
| `#function-clear-btn` | Button to reset the editor | |
| `#copy-function-code-btn` | Button to copy function code | |
| `#copy-tool-definition-btn` | Button to copy tool definition | |
| `#copy-function-library-btn` | Button to copy entire function library as JSON | Located next to "Available Functions" heading |

## Key Behavior Changes

### Function Name Handling

The function name is now automatically extracted from the function code. This is a significant change from previous versions where a separate input field was visible and required manual input.

- Function names are automatically extracted from the function declarations in the code
- Multiple functions can be defined in a single code block
- Tests should focus on the function code itself and not worry about function names separately

### Multi-Function Support

The function editor now supports defining multiple functions in a single code block:

- Helper/auxiliary functions can be defined alongside callable functions
- By default, all functions are callable unless at least one function is tagged with `@callable` or `@tool`
- If any function is tagged with `@callable` or `@tool`, then only tagged functions will be exposed to the AI
- Auxiliary functions are not displayed in the function list but are available for use by callable functions

### Function Validation Requirements

Functions must meet specific requirements to be considered valid:

1. Must have valid JavaScript syntax
2. Should return objects, not primitive values
3. Should include proper JSDoc documentation for parameters and return values
4. Can be tagged with `@callable` or `@tool` in JSDoc comments or at the beginning of a line with `// @callable` or `// @tool`

## Testing the Function Calling Modal

### Test Setup

Before testing the function calling modal, ensure:

1. The welcome modal is dismissed
2. API key and model are configured
3. Tool calling and function tools are enabled in settings

```python
# Standard setup for function calling tests
setup_console_logging(page)
page.goto(serve_hacka_re)
dismiss_welcome_modal(page)
dismiss_settings_modal(page)
configure_api_key_and_model(page, api_key)
enable_tool_calling_and_function_tools(page)
```

### Opening the Modal

```python
# Open function modal
page.locator("#function-btn").click()
function_modal = page.locator("#function-modal")
expect(function_modal).to_be_visible()
```

### Verifying Function Editor Behavior

```python
# Focus on the function code editor
function_code = page.locator("#function-code")
function_code.focus()

# Verify the editor is visible and ready for input
expect(function_code).to_be_visible()
expect(function_code).to_be_editable()
```

### Adding a Function

When adding a function, you must:

1. Fill the function code with a properly formatted function (optionally including `@callable` or `@tool` tag)
2. Validate the function
3. Submit the form

Note: If no function in your code has a tag, all functions will be callable. If at least one function has a tag, only tagged functions will be callable.

```python
# Fill in the function code with a properly formatted function
function_code = page.locator("#function-code")
function_code.fill("""/**
 * Multiplies two numbers together
 * @description A simple function that multiplies two numbers and returns the result
 * @param {number} a - The first number to multiply
 * @param {number} b - The second number to multiply
 * @returns {Object} The result of the multiplication
 * @tool This function will be exposed to the LLM
 */
function multiply_numbers(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') {
    return { 
      error: "Both inputs must be numbers",
      success: false
    };
  }
  
  const result = a * b;
  
  return {
    result: result,
    formattedResult: result.toString(),
    success: true
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
expect(function_list.locator(".function-item-name:has-text('multiply_numbers')")).to_be_visible()
```

### Adding Multiple Functions

The function editor supports defining multiple functions in a single code block:

```python
# Fill in the function code with multiple functions
function_code = page.locator("#function-code")
function_code.fill("""/**
 * Helper function that formats data (not exposed to LLM)
 * @param {Object} data - The data to format
 * @returns {string} Formatted data
 */
function formatData(data) {
  return JSON.stringify(data, null, 2);
}

/**
 * Gets the current time in Berlin
 * @description Fetches the current time for Berlin timezone
 * @returns {Object} Current time information
 * @callable This function will be exposed to the LLM
 */
async function getCurrentTimeInBerlin() {
  try {
    const response = await fetch('https://worldtimeapi.org/api/timezone/Europe/Berlin');
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    const data = await response.json();
    return {
      time: data.datetime,
      formatted: formatData(data)
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Multiplies two numbers together
 * @description A simple function that multiplies two numbers and returns the result
 * @param {number} a - The first number to multiply
 * @param {number} b - The second number to multiply
 * @returns {Object} The result of the multiplication
 * @tool This function will be exposed to the LLM
 */
function multiply_numbers(a, b) {
  // Validate inputs are numbers
  if (typeof a !== 'number' || typeof b !== 'number') {
    return { 
      error: "Both inputs must be numbers",
      success: false
    };
  }
  
  // Perform the multiplication
  const result = a * b;
  
  // Format the result using the auxiliary function
  const formattedResult = formatData(result);
  
  return {
    result: result,
    formattedResult: formattedResult,
    success: true
  };
}""")
```

### Verifying Function List

After adding functions, verify that:
- Only callable functions appear in the list
- Auxiliary functions are not displayed
- Functions are enabled by default

```python
# Check if the callable functions were added to the list
function_list = page.locator("#function-list")
expect(function_list.locator(".function-item-name:has-text('getCurrentTimeInBerlin')")).to_be_visible()
expect(function_list.locator(".function-item-name:has-text('multiply_numbers')")).to_be_visible()

# Verify the helper function is not in the list
expect(function_list.locator(".function-item-name:has-text('formatData')")).not_to_be_visible()

# Check if the callable functions are enabled by default
function_checkboxes = function_list.locator("input[type='checkbox']")
expect(function_checkboxes.first).to_be_checked()
expect(function_checkboxes.nth(1)).to_be_checked()
```

### Testing the Reset Button

The reset button should load all current functions into the editor:

```python
# First, clear the editor
function_code.fill("")

# Click the Reset button
page.locator("#function-clear-btn").click()

# Verify that the editor now contains both functions
code_content = function_code.input_value()
expect(code_content).to_contain("getCurrentTimeInBerlin")
expect(code_content).to_contain("multiply_numbers")
```

### Testing the Copy Function Library Button

The copy function library button allows users to copy the entire function library as JSON to the clipboard:

```python
# Add some functions to the library first
# (Use the steps from "Adding a Function" or "Adding Multiple Functions" sections)

# Click the copy function library button
copy_function_library_btn = page.locator("#copy-function-library-btn")
copy_function_library_btn.click()

# Wait for the system message indicating the function library was copied
system_message = page.locator(".message.system .message-content").last
expect(system_message).to_contain_text("Function library copied to clipboard as JSON")

# Take a screenshot with debug info
screenshot_with_markdown(page, "function_library_copy", {
    "Status": "After copying function library",
    "System Message": "Function library copied to clipboard as JSON"
})
```

The copied JSON contains all functions in the library, including:
- Function code
- Tool definitions
- Enabled/disabled status
- Auxiliary functions (not shown in the function list)

This feature is useful for:
- Backing up function libraries
- Sharing function libraries between instances
- Debugging function issues

### Deleting Functions

To delete functions, click the delete button and handle the confirmation dialog:

```python
# Handle the confirmation dialog
page.on("dialog", lambda dialog: dialog.accept())

# Delete all functions
while function_list.locator(".function-item-delete").count() > 0:
    function_list.locator(".function-item-delete").first.click()
    # Small wait to allow the UI to update
    page.wait_for_timeout(100)
```

## Common Testing Pitfalls

### 1. Looking for a Separate Function Name Field

The function name is now automatically extracted from the code. Tests should:
- Focus only on the function code editor
- Not look for or try to interact with a separate function name field
- Verify function names by checking the function list after submission

### 2. Function Tagging Behavior

By default, all functions are callable unless at least one function is tagged with `@callable` or `@tool` (these are equivalent and both replace the older `@callable_function` tag). If any function is tagged, then only tagged functions will be callable. Tests should be aware of this behavior:
- When no tags are present, all functions are callable
- When at least one tag is present, only tagged functions are callable
- Tags can be in JSDoc comments (like `@callable` or `@tool`) or at the beginning of a line with `// @callable` or `// @tool`

### 3. Incorrect Waiting Strategies

Avoid arbitrary waits. Instead:
- Wait for specific element states
- Use proper expectations to verify element visibility
- Ensure elements are visible before interacting with them

```python
# Good practice
page.wait_for_selector("#validation-result:not(:empty)", state="visible")

# Avoid
page.wait_for_timeout(500)  # Arbitrary wait
```

### 4. Not Handling Confirmation Dialogs

When deleting functions, a confirmation dialog appears. Always set up a dialog handler before triggering the delete action:

```python
# Set up dialog handler before triggering action
page.on("dialog", lambda dialog: dialog.accept())
delete_button.click()  # Action that triggers a dialog
```

## Function Calling Implementation Details

### Function Storage

Functions are stored in the browser's local storage:
- `js_functions`: Object containing all defined functions with their code and tool definitions
- `enabled_functions`: Array of function names that are enabled for tool calling
- `function_groups`: Object mapping function names to group IDs, used to track which functions were defined together

### Function Grouping

Functions are grouped together based on when they were defined:
- When multiple functions are defined in a single code block, they are assigned the same group ID
- Functions in the same group are visually indicated with the same color
- When a function is deleted, all functions in its group are also deleted
- This ensures that helper functions are properly removed when their main function is deleted
- The Reset button respects these groups, showing functions organized by their groups

### Visual Group Indicators

Functions that belong to the same group (defined together) are visually indicated:
- Each function group has a distinct color (from a set of 5 colors)
- Functions in the same group have the same colored border on the left side
- A subtle background tint of the same color helps identify related functions
- When deleting a function, the confirmation dialog mentions all functions in the group that will be deleted
- This makes it clear which functions are related and will be affected by operations like deletion

### Function Execution

When a function is called by the AI:
1. The function name and arguments are extracted from the tool call
2. The function is executed in a sandboxed environment with limited capabilities
3. The result is returned to the AI as a tool response

### Tool Definitions

Tool definitions are generated from function JSDoc comments:
- Function description comes from the `@description` tag
- Parameter types and descriptions come from `@param` tags
- The function name is used as the tool name

## Function Deletion Behavior

When a function is deleted:
1. The system identifies all functions in the same group
2. All functions in the group are removed from storage
3. This ensures that helper functions are properly cleaned up

This behavior prevents orphaned helper functions from remaining in storage when their main function is deleted, which could cause unexpected behavior when using the Reset button.

## Best Practices for Writing Test Functions

### 1. Function Tagging Options

```javascript
// Option 1: Using @callable in JSDoc
/**
 * @callable This function will be exposed to the LLM
 */

// Option 2: Using @tool in JSDoc
/**
 * @tool This function will be exposed to the LLM
 */

// Option 3: Using single-line comment at the beginning of a line
// @callable

// Option 4: Using single-line comment at the beginning of a line
// @tool
```

### 2. Provide Proper JSDoc Documentation

```javascript
/**
 * @description A clear description of what the function does
 * @param {type} name - Description of the parameter
 * @returns {Object} Description of the return value
 */
```

### 3. Return Objects, Not Primitive Values

```javascript
// Good
return { result: 42, success: true };

// Avoid
return 42;
```

### 4. Handle Errors Gracefully

```javascript
try {
  // Function logic
  return { result: result, success: true };
} catch (error) {
  return { error: error.message, success: false };
}
```

### 5. Validate Input Parameters

```javascript
if (typeof param !== 'expected_type') {
  return { error: "Invalid parameter type", success: false };
}
```

## Debugging Function Calling Tests

### Common Error Messages

| Error Message | Likely Cause | Solution |
|---------------|--------------|----------|
| "No callable functions found. By default, all functions are callable unless at least one function is tagged with @callable or @tool (equivalent)" | When at least one function is tagged, but a function is missing a tag | Add `@callable` or `@tool` tag to the function |
| "Element is not visible" | Test looking for removed function name field | Remove references to function name field in tests |
| "Syntax error in code" | JavaScript syntax error in function | Fix the syntax error |
| "Function returned a non-serializable result" | Function returning non-JSON value | Return an object instead |

### Debugging Strategies

1. **Check Console Logs**: Function execution errors are logged to the console
2. **Use Screenshots**: Take screenshots at key points in the test
3. **Inspect Validation Results**: The validation result element contains helpful error messages
4. **Check Local Storage**: Inspect the `js_functions` and `enabled_functions` values in local storage

```python
# Take a screenshot with debug info
screenshot_with_markdown(page, "function_validation.png", {
    "Status": "After validation",
    "Validation Result": page.locator("#function-validation-result").text_content(),
    "Function Code": page.locator("#function-code").input_value()[:100] + "..." # First 100 chars
})
```

## Conclusion

The function calling modal is a powerful feature that allows users to define custom JavaScript functions for the AI to use. By following the guidelines in this document, you can write robust tests that accurately verify the functionality of this feature.

Remember the key changes:
1. The function name field is now hidden and auto-populated
2. Multiple functions can be defined in a single code block
3. By default, all functions are callable unless at least one function is tagged with `@callable` or `@tool`
4. If any function is tagged, then only tagged functions will be callable
5. Tags can be in JSDoc comments or at the beginning of a line with `// @callable` or `// @tool`
6. The older `@callable_function` tag has been replaced by `@callable` and `@tool` (which are equivalent)

These changes simplify the user experience but require adjustments to testing strategies.
