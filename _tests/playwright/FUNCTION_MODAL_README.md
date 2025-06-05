# Function Modal Documentation

This document provides detailed information about the Function Modal in hacka.re and its elements for testing and development purposes.

## Overview

The Function Modal is a powerful component of the hacka.re interface that allows users to:

1. Create and edit JavaScript functions that can be called by the AI model
2. Validate function syntax and generate tool definitions
3. Enable/disable functions for AI tool calling
4. Manage a library of functions with support for auxiliary helper functions

## Key Components

### Modal Structure

- **Function List**: Displays all callable functions with enable/disable toggles and delete buttons
- **Function Editor**: Code editor for writing and editing JavaScript functions
- **Validation Area**: Shows validation results and generated tool definitions
- **Action Buttons**: Validate, Add/Update, Clear, and Copy buttons

### Important DOM Elements

| Element ID | Description | Notes |
|------------|-------------|-------|
| `#function-modal` | The main modal container | |
| `#function-list` | Container for the list of functions | |
| `#empty-function-state` | Message shown when no functions exist | |
| `#function-editor-form` | Form for adding/editing functions | |
| `#function-code` | Textarea for function code | Main input for function definition |
| `#function-validation-result` | Shows validation results | |
| `#function-tool-definition` | Shows generated tool definition | Hidden until validation |
| `#function-validate-btn` | Button to validate function | |
| `#function-clear-btn` | Button to reset the editor | |
| `#copy-function-code-btn` | Button to copy function code | |
| `#copy-tool-definition-btn` | Button to copy tool definition | |
| `#copy-function-library-btn` | Button to copy entire function library as JSON | |
| `#close-function-modal` | Button to close the modal | |
| `.function-item` | Individual function item | Multiple elements with this class |
| `.function-item-checkbox` | Checkbox to enable/disable a function | |
| `.function-item-name` | Display name of the function | |
| `.function-item-description` | Description of the function | |
| `.function-item-delete` | Button to delete a function | |

## Key Behaviors

### Function Management

1. **Creating Functions**:
   - Enter JavaScript code in the function editor
   - The function name is automatically extracted from the code
   - Click "Validate" to check the function syntax
   - Click "Add Function" to save the function
   - The function is added to the list and saved to localStorage

2. **Editing Functions**:
   - Click on a function in the list to load it into the editor
   - Modify the code
   - Click "Validate" to check the updated function
   - Click "Add Function" to update the function

3. **Deleting Functions**:
   - Click the delete icon on a function item
   - Confirm the deletion in the dialog
   - The function and any related functions in the same group are removed

4. **Enabling/Disabling Functions**:
   - Check/uncheck the checkbox next to a function to enable/disable it
   - Enabled functions are available for AI tool calling
   - Disabled functions are stored but not exposed to the AI

### Multi-Function Support

1. **Function Groups**:
   - Multiple functions can be defined in a single code block
   - Functions defined together are grouped with the same color
   - When a function is deleted, all functions in its group are also deleted

2. **Auxiliary Functions**:
   - Helper functions can be defined alongside callable functions
   - By default, all functions are callable unless at least one function is tagged with `@callable` or `@tool`
   - If any function is tagged, only tagged functions will be exposed to the AI
   - Auxiliary functions are not displayed in the function list but are available for use by callable functions

### Function Validation

1. **Syntax Checking**:
   - The "Validate" button checks for JavaScript syntax errors
   - Validation results are displayed in the validation area

2. **Tool Definition Generation**:
   - Tool definitions are automatically generated from function code
   - JSDoc comments are parsed to extract parameter types and descriptions
   - The generated tool definition is displayed and can be copied

## Interactions with Other Components

### Chat Interface

The Function Modal interacts with the chat interface:
1. Enabled functions are available for the AI to call during chat
2. When a function is called, its result is returned to the AI
3. System messages notify the user when functions are enabled, disabled, or deleted

### Prompts Modal

The Function Modal interacts with the Prompts Modal:
1. The Function Library prompt in the Default Prompts section dynamically reflects the current state of the Function Library
2. This allows for LLM-assisted function updates and integration between the function calling system and system prompt

## Testing the Function Modal

### Test Setup

Before testing the Function Modal, ensure:
1. The welcome modal is dismissed (if present)
2. Tool calling is enabled in settings

```python
# Standard setup for function modal tests
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

### Creating a Function

```python
# Fill in the function code
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

### Testing Function Enabling/Disabling

```python
# Get the checkbox for the function
function_checkbox = page.locator(".function-item:has-text('multiply_numbers') input[type='checkbox']")

# Verify it's checked by default
expect(function_checkbox).to_be_checked()

# Uncheck to disable the function
function_checkbox.uncheck()

# Verify it's unchecked
expect(function_checkbox).not_to_be_checked()

# Check to re-enable the function
function_checkbox.check()

# Verify it's checked again
expect(function_checkbox).to_be_checked()
```

### Testing Function Deletion

```python
# Handle the confirmation dialog
page.on("dialog", lambda dialog: dialog.accept())

# Delete the function
delete_button = page.locator(".function-item:has-text('multiply_numbers') .function-item-delete")
delete_button.click()

# Verify the function was removed from the list
expect(page.locator(".function-item-name:has-text('multiply_numbers')")).not_to_be_visible()
```

## Common Testing Pitfalls

### 1. Not Handling Confirmation Dialogs

When deleting a function, a confirmation dialog appears. Always set up a dialog handler before triggering the action:

```python
# Set up dialog handler before triggering action
page.on("dialog", lambda dialog: dialog.accept())
delete_button.click()  # Action that triggers a dialog
```

### 2. Not Accounting for Function Grouping

Functions are grouped together based on when they were defined. When testing deletion:
1. Be aware that deleting one function may delete others in the same group
2. Check that all functions in the group are removed

```python
# After deleting a function, verify all functions in its group are gone
for function_name in ["function1", "function2", "function3"]:
    expect(page.locator(f".function-item-name:has-text('{function_name}')")).not_to_be_visible()
```

### 3. Not Waiting for Validation Results

Validation can take time, especially for complex functions. Wait for the validation result to appear:

```python
# Wait for validation result to appear
page.wait_for_selector("#function-validation-result:not(:empty)", state="visible")
```

## Implementation Details

### Function Storage

Functions are stored in the browser's localStorage:
- `js_functions`: Object containing all defined functions with their code and tool definitions
- `enabled_functions`: Array of function names that are enabled for tool calling
- `function_groups`: Object mapping function names to group IDs, used to track which functions were defined together

### Function Tagging

Functions can be tagged in several ways to control whether they are callable:
1. `@callable` in JSDoc comments
2. `@tool` in JSDoc comments (equivalent to `@callable`)
3. `// @callable` as a single-line comment
4. `// @tool` as a single-line comment

If no functions are tagged, all functions are callable by default. If at least one function is tagged, only tagged functions are callable.

### Tool Definition Generation

Tool definitions are generated from function code:
1. Function name is extracted from the code
2. Parameter names, types, and descriptions are extracted from JSDoc comments
3. Function description is extracted from the `@description` tag
4. The tool definition follows the OpenAI function calling format

### Function Execution

When a function is called by the AI:
1. The function name and arguments are extracted from the tool call
2. The function is executed in a sandboxed environment
3. The result is returned to the AI as a tool response

## Conclusion

The Function Modal is a powerful feature that allows users to define custom JavaScript functions for the AI to use. By following the guidelines in this document, you can write robust tests that accurately verify the functionality of this feature.
