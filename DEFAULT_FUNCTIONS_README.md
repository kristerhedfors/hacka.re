# Default Functions System

## Overview

The Default Functions system provides pre-built JavaScript function groups that can be easily enabled for use with the hacka.re function calling feature. This system mirrors the Default Prompts functionality but for executable functions.

## Architecture

### Components

1. **Default Function Groups** (`js/default-functions/`)
   - Individual JavaScript files defining function groups
   - Each group contains related functions with a common theme
   - Examples: RC4 encryption, math utilities

2. **Default Functions Service** (`js/services/default-functions-service.js`)
   - Manages loading and selection of default function groups
   - Handles persistence of selected functions
   - Integrates with the Function Tools Service

3. **UI Integration** (`js/components/function-calling-manager.js`)
   - Displays default functions in an expandable section
   - Allows enabling/disabling function groups with checkboxes
   - Shows function details and info popups

4. **Styling** (`css/default-functions.css`)
   - Consistent styling with the default prompts UI
   - Expandable tree structure with hover effects

## Creating New Default Function Groups

To add a new default function group:

1. Create a new file in `js/default-functions/`:

```javascript
window.YourFunctionGroup = {
    id: 'unique-id',
    name: 'Display Name',
    description: 'Description of what these functions do',
    groupId: 'group-id', // Used to group functions together
    functions: [
        {
            name: 'function_name',
            code: `/**
 * Function description
 * @description Detailed description for the AI
 * @param {type} paramName - Parameter description
 * @returns {Object} Return value description
 * @callable
 */
function function_name(paramName) {
    // Implementation
    return {
        success: true,
        result: value
    };
}`
        }
    ]
};
```

2. Add the script to `index.html`:
```html
<script src="js/default-functions/your-functions.js"></script>
```

3. Update `default-functions-service.js` to include your group:
```javascript
if (window.YourFunctionGroup) {
    DEFAULT_FUNCTIONS.push(window.YourFunctionGroup);
}
```

## Function Requirements

Default functions should:

1. **Always return objects** - Never return primitive values
2. **Include error handling** - Return error objects for invalid inputs
3. **Use @callable annotation** - Mark functions available to AI
4. **Provide clear JSDoc** - Help AI understand function purpose
5. **Be self-contained** - Minimize external dependencies

## Example Function Groups

### RC4 Encryption
- `rc4_encrypt(plaintext, key)` - Encrypts text using RC4
- `rc4_decrypt(ciphertext, key)` - Decrypts RC4 encrypted text

### Math Utilities
- `calculate_factorial(n)` - Calculates factorial of a number
- `calculate_fibonacci(n)` - Generates Fibonacci sequence
- `check_prime(n)` - Checks if a number is prime

## Usage

1. Open the Function Calling modal
2. Expand the "Default Functions" section
3. Check the boxes for function groups you want to enable
4. Functions are immediately available to the AI
5. Selected functions persist across sessions

## Benefits

- **Quick Testing** - Pre-built functions for immediate use
- **Learning Examples** - See how to structure functions properly
- **Common Utilities** - Frequently needed operations ready to use
- **Consistent Quality** - Well-tested, documented functions

## Technical Details

- Functions are parsed using the Function Tools Parser
- Tool definitions are generated automatically from JSDoc
- Selected functions are stored in localStorage
- Functions are loaded on app initialization
- Groups can be toggled without losing custom functions