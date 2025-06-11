# Function System Overview

This document provides comprehensive information about hacka.re's function calling system, including architecture, testing patterns, and implementation details.

## 🔄 Major Refactoring - New Architecture

The function calling system has been completely refactored from a monolithic structure into a modern, modular architecture.

## Function System Architecture

### Core Components (Refactored)

**Function Tools Service Layer** (`js/services/function-tools-*.js`) - 8 Modules:
1. `function-tools-config.js` - Configuration constants and storage keys
2. `function-tools-logger.js` - Centralized logging utilities
3. `function-tools-storage.js` - Storage operations and state management
4. `function-tools-parser.js` - Argument parsing and tool definition generation
5. `function-tools-executor.js` - Sandboxed function execution
6. `function-tools-registry.js` - Function registry management
7. `function-tools-processor.js` - Tool call processing from API responses
8. `function-tools-service.js` - Main orchestrator (public API)

**Function UI Components** (`js/components/function-calling/`) - 11 Modules:
- `function-calling-manager.js` - Main orchestrator for function calling UI
- `default-functions-manager.js` - Built-in function management
- `function-code-editor.js` - Code editor component
- `function-copy-manager.js` - Function copying and sharing
- `function-editor-manager.js` - Function editing interface
- `function-executor.js` - Function execution handling
- `function-library-manager.js` - Function library operations
- `function-list-renderer.js` - Function list display and rendering
- `function-modal-manager.js` - Function modal UI management
- `function-parser.js` - Function parsing and validation
- `function-validator.js` - Function validation logic

**API Integration Services** (`js/services/`) - Supporting Services:
- `api-tool-call-handler.js` - Tool call handling in API responses
- `api-tools-service.js` - API tools integration service
- `chat-tools-service.js` - Chat tools integration

**MCP Integration** (`js/components/mcp/` and `js/services/mcp-*.js`):
- Complete Model Context Protocol support
- MCP server management for function calling
- Tool registry integration with MCP tools

**Function Modal** (`#function-modal`)
- Modal interface for function creation and editing
- Function list with enable/disable toggles
- Code editor with validation and preview
- Tool definition display and copying

### Function Lifecycle

```
Creation → Validation → Registration → Execution → Management
    ↓         ↓           ↓            ↓          ↓
  Editor → Syntax → Tool Definition → AI Call → Enable/Disable
            Check     Generation      Response   Delete/Edit
```

## Function Types and Categories

### Default Functions

**Built-in Functions:**
- `getProgramPrivateKey()` - Cryptographic key generation for RC4
- Located in default functions section (view-only)
- Cannot be edited or deleted
- Can be enabled/disabled via checkboxes

### User Functions

**Standard Functions:**
- Created by users in the function modal
- Full CRUD operations (Create, Read, Update, Delete)
- Can be organized into groups
- Support for helper/auxiliary functions

**Multi-Function Libraries:**
- Multiple functions defined in single code block
- Helper functions and callable functions together
- Automatic grouping and color coding
- Group deletion (all functions in group removed together)

### Function Tagging System

**Tagging Options:**
```javascript
// Option 1: @callable in JSDoc
/**
 * @callable This function will be exposed to the LLM
 */

// Option 2: @tool in JSDoc  
/**
 * @tool This function will be exposed to the LLM
 */

// Option 3: Single-line comment
// @callable

// Option 4: Single-line comment
// @tool
```

**Tagging Rules:**
- **No tags present**: All functions are callable
- **At least one tag present**: Only tagged functions are callable
- **Helper functions**: Functions without tags when tags are present become helpers
- **Legacy support**: `@callable_function` replaced by `@callable` and `@tool`

## Function Editor Features

### Code Editor Interface

**Key Components:**
- `#function-code` - Main code textarea with syntax highlighting
- `#function-validate-btn` - Validation and tool definition generation
- `#function-clear-btn` - Reset editor with current functions
- `#copy-function-code-btn` - Copy current editor content
- `#copy-tool-definition-btn` - Copy generated tool definitions

**Editor Functionality:**
- Syntax highlighting for JavaScript
- Auto-indentation and bracket matching
- Multi-function support in single editor
- Real-time validation feedback

### Validation System

**Validation Process:**
1. **Syntax Check** - JavaScript syntax validation
2. **Function Extraction** - Parse function declarations
3. **JSDoc Processing** - Extract documentation and tags
4. **Tool Definition Generation** - Create OpenAI tool definitions
5. **Callable Detection** - Determine which functions are callable

**Validation Results:**
- Success: "Library validated successfully" with function count
- Syntax errors: Specific error messages with line numbers
- Tool definition preview with parameter schemas

### Function Storage (Refactored)

**Service-Based Storage Architecture:**
- `function-tools-storage.js` - Centralized storage operations
- `core-storage-service.js` - Core storage service
- `namespace-service.js` - Multi-tenant data isolation
- `encryption-service.js` - Data encryption/decryption

**Storage Structure (Managed by Services):**
```javascript
{
  "js_functions": {
    "functionName": {
      "code": "function code...",
      "toolDefinition": {...},
      "groupId": "unique-group-id"
    }
  },
  "enabled_functions": ["function1", "function2"],
  "function_groups": {
    "functionName": "group-id"
  }
}
```

**Service Coordination:**
- `function-tools-registry.js` manages function registration
- `function-tools-storage.js` handles persistence
- `function-tools-config.js` provides configuration constants

## Function Management Interface

### Function List Display

**List Components:**
- Function items with names and descriptions
- Enable/disable checkboxes (checked by default)
- Delete buttons with confirmation dialogs
- Visual group indicators (color-coded borders)

**Group Management:**
- Functions defined together share the same group ID
- Visual color coding (5 distinct colors cycling)
- Group deletion (deleting one function removes entire group)
- Helpful confirmation messages showing affected functions

### Function Operations

**Adding Functions:**
```python
# Fill function code
function_code = page.locator("#function-code")
function_code.fill("""
/**
 * @description Multiplies two numbers
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {Object} Result object
 * @tool
 */
function multiply(a, b) {
    return { result: a * b, success: true };
}
""")

# Validate
page.locator("#function-validate-btn").click()
expect(page.locator("#function-validation-result")).to_contain_text("validated successfully")

# Submit
page.locator("#function-editor-form button[type='submit']").click()
```

**Deleting Functions:**
```python
# Set up dialog handler
page.on("dialog", lambda dialog: dialog.accept())

# Delete function (removes entire group)
page.locator(".function-item-delete").first.click()
```

**Managing Function State:**
```python
# Enable/disable functions
function_checkbox = page.locator(".function-item input[type='checkbox']")
function_checkbox.check()   # Enable
function_checkbox.uncheck() # Disable
```

## Testing Patterns

### Function Modal Testing

**Modal Operations:**
```python
# Open function modal
page.locator("#function-btn").click()
expect(page.locator("#function-modal")).to_be_visible()

# Close function modal
page.locator("#close-function").click()
expect(page.locator("#function-modal")).not_to_be_visible()
```

**Editor Testing:**
```python
# Test editor functionality
function_code = page.locator("#function-code")
expect(function_code).to_be_visible()
expect(function_code).to_be_editable()

# Test validation
page.locator("#function-validate-btn").click()
validation_result = page.locator("#function-validation-result")
expect(validation_result).to_be_visible()
```

### Function Execution Testing

**Integration with Chat:**
```python
# Configure API and enable function calling
configure_api_key_and_model(page, api_key)
enable_tool_calling_and_function_tools(page)

# Add function and test execution
# ... add function code ...

# Send message that should trigger function
page.locator("#user-input").fill("multiply 6 and 7")
page.locator("#send-btn").click()

# Verify function execution in chat
expect(page.locator(".message.assistant")).to_contain_text("42")
```

### Default Functions Testing

**Default Functions Section:**
```python
# Verify default functions section exists
default_section = page.locator(".default-functions-section")
expect(default_section).to_be_visible()

# Test default function properties
default_function = page.locator(".default-function-item")
expect(default_function).to_be_visible()

# Verify cannot edit/delete default functions
expect(page.locator(".default-function-item .function-item-delete")).not_to_be_visible()
```

## Advanced Features

### Function Library Integration

**Prompts Integration:**
- Function Library prompt automatically includes all enabled functions
- Dynamic updates when functions are added/removed/modified
- Integration with system prompt composition

**Copy Function Library:**
```python
# Copy entire function library as JSON
page.locator("#copy-function-library-btn").click()

# Verify system message
system_message = page.locator(".message.system .message-content").last
expect(system_message).to_contain_text("Function library copied to clipboard as JSON")
```

### RC4 Encryption Functions

**Built-in Crypto Functions:**
- RC4 encryption and decryption for testing complex operations
- Encryption with secret key and plain text input
- Decryption with secret key and hex ciphertext input
- Error handling for invalid formats and missing parameters

**Testing Crypto Functions:**
```python
# Test RC4 encryption
page.locator("#user-input").fill("encrypt 'hello world' with key 'secret'")
page.locator("#send-btn").click()

# Verify encryption result
expect(page.locator(".message.assistant")).to_contain_text("encrypted")

# Test RC4 decryption
page.locator("#user-input").fill("decrypt the result with key 'secret'")
page.locator("#send-btn").click()

# Verify decryption result
expect(page.locator(".message.assistant")).to_contain_text("hello world")
```

## Function Definition Best Practices

### Function Structure

**Recommended Pattern:**
```javascript
/**
 * @description Clear description of function purpose
 * @param {type} paramName - Parameter description
 * @returns {Object} Return value description
 * @tool
 */
function functionName(paramName) {
    try {
        // Input validation
        if (typeof paramName !== 'expected_type') {
            return { error: "Invalid parameter type", success: false };
        }
        
        // Function logic
        const result = processInput(paramName);
        
        // Return structured result
        return {
            result: result,
            success: true
        };
    } catch (error) {
        return {
            error: error.message,
            success: false
        };
    }
}
```

### JSDoc Documentation

**Required Elements:**
- `@description` - Clear function purpose
- `@param {type} name` - Parameter documentation
- `@returns {Object}` - Return value documentation
- `@tool` or `@callable` - Tagging for AI exposure

**Best Practices:**
- Use descriptive parameter names
- Document expected types clearly
- Explain return object structure
- Include error conditions in documentation

### Error Handling

**Consistent Error Format:**
```javascript
// Success response
return { result: data, success: true };

// Error response
return { error: "Error message", success: false };

// Validation error
return { error: "Invalid input", success: false, details: validationDetails };
```

## Common Issues and Solutions

### Function Name Handling

**Issue:** Tests looking for separate function name field
**Solution:** Function names are auto-extracted from code; no separate field exists

**Issue:** Function name not updating after code change
**Solution:** Function names are extracted during validation; click validate button

### Function Tagging

**Issue:** Functions not appearing in list after adding
**Solution:** Check tagging rules; ensure proper @callable or @tool tags if any exist

**Issue:** Helper functions appearing in list
**Solution:** Helper functions only appear when no tags are present anywhere

### Validation Problems

**Issue:** "No callable functions found" error
**Solution:** Add @callable or @tool tags, or remove all tags to make all functions callable

**Issue:** Syntax errors not showing clearly
**Solution:** Check console logs for detailed JavaScript syntax errors

### Function Execution

**Issue:** Functions not being called by AI
**Solution:** Verify API key, model supports function calling, and functions are enabled

**Issue:** Function execution errors not visible
**Solution:** Check console logs and function return values for error details

## Integration Points

### Chat Interface Integration

**Tool Calling Flow:**
1. User sends message requiring tool use
2. AI model identifies need for function call
3. Function execution request sent to FunctionToolsService
4. Function executed with provided arguments
5. Result returned to AI model
6. AI incorporates result into response

### Settings Integration

**Configuration Dependencies:**
- API key required for function calling
- Model must support tool calling (gpt-4, gpt-3.5-turbo-1106+)
- Tool calling must be enabled in settings
- Function tools must be enabled in settings

### Prompts Integration

**Function Library Prompt:**
- Automatically generated prompt containing all enabled functions
- Updates dynamically when functions change
- Provides AI with function definitions and usage examples
- Integrated into system prompt composition

This overview provides comprehensive coverage of hacka.re's function calling system. Refer to [TESTING_GUIDE.md](TESTING_GUIDE.md) for common testing patterns and [MODAL_SYSTEM_OVERVIEW.md](MODAL_SYSTEM_OVERVIEW.md) for modal-specific guidance.