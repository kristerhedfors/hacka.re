# JavaScript Function Execution in hacka.re CLI

The hacka.re CLI includes a built-in JavaScript engine (Goja) that enables execution of JavaScript functions compatible with the web application's function calling features. This allows you to use the same functions in both the web interface and command line.

## Features

- **Sandboxed Execution**: Functions run in an isolated JavaScript environment with controlled globals
- **Timeout Protection**: 5-second default timeout prevents infinite loops
- **Type Safety**: Automatic type conversion and validation for function parameters
- **JSDoc Support**: Full parsing of JSDoc comments for function metadata
- **OpenAI Compatible**: Generates tool definitions for AI function calling
- **Thread-Safe**: Concurrent execution with proper synchronization

## Built-in Functions

### RC4 Encryption Functions
- `rc4_encrypt(plaintext, key)` - Encrypts text using RC4 cipher
- `rc4_decrypt(ciphertext, key)` - Decrypts RC4 ciphertext

### Math Utility Functions
- `factorial(n)` - Calculate n! (n factorial)
- `isPrime(n)` - Check if a number is prime
- `gcd(a, b)` - Calculate greatest common divisor
- `fibonacci(n)` - Get nth Fibonacci number

## Command Reference

### List Functions
```bash
./hacka.re function list
```
Shows all available functions with their parameters and descriptions.

### Execute with JSON Arguments
```bash
./hacka.re function test <name> '<json>'

# Example
./hacka.re function test rc4_encrypt '{"plaintext":"Hello","key":"secret"}'
```

### Execute with Command-Line Arguments
```bash
./hacka.re function call <name> [args...]

# Examples
./hacka.re function call rc4_encrypt "Hello World" "secret"
./hacka.re function call factorial 7
./hacka.re function call isPrime 23
./hacka.re function call gcd 120 45
```

The `call` command automatically converts arguments to the correct types based on function parameters.

### Add Custom Functions
```bash
./hacka.re function add <file.js>
```

Custom functions must use JSDoc format:
```javascript
/**
 * Convert text to uppercase
 * @param {string} text - The text to convert
 * @returns {Object} Result object
 * @callable
 */
function toUpperCase(text) {
    return {
        success: true,
        result: text.toUpperCase()
    };
}
```

### Remove Functions
```bash
./hacka.re function remove <name>
```

### List Function Groups
```bash
./hacka.re function groups
```

## Shell Scripting

The `call` command's clean output makes it perfect for shell scripts:

```bash
#!/bin/bash

# Encrypt a message
encrypted=$(./hacka.re function call rc4_encrypt "Secret Message" "password")
echo "Encrypted: $encrypted"

# Decrypt it back
decrypted=$(./hacka.re function call rc4_decrypt "$encrypted" "password")
echo "Decrypted: $decrypted"

# Use in conditionals
if ./hacka.re function call isPrime 17 | grep -q "true"; then
    echo "17 is prime"
fi

# Process multiple values
for num in 5 6 7 8; do
    result=$(./hacka.re function call factorial $num)
    echo "Factorial of $num is $result"
done
```

## Function Format

Functions support multiple formats:

### Simple Functions
```javascript
function add(a, b) {
    return a + b;
}
```

### Functions with JSDoc
```javascript
/**
 * Calculate sum of two numbers
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {number} The sum
 * @callable
 */
function add(a, b) {
    return a + b;
}
```

### Functions with Error Handling
```javascript
/**
 * Safe division
 * @param {number} a - Numerator
 * @param {number} b - Denominator
 * @returns {Object} Result or error
 * @callable
 */
function divide(a, b) {
    if (b === 0) {
        return {
            success: false,
            error: "Division by zero"
        };
    }
    return {
        success: true,
        result: a / b
    };
}
```

## Technical Details

### JavaScript Engine
- **Engine**: Goja (ECMAScript 5.1+ implementation in pure Go)
- **Binary Impact**: ~7MB increase (from 13MB to 20MB with web assets)
- **Performance**: 6-7x faster than Otto, suitable for production use

### Sandboxing
Functions execute in a controlled environment with access to:
- Standard JavaScript built-ins (Math, String, Array, Object, etc.)
- JSON operations
- Console logging (for debugging)
- Limited async operations (setTimeout, Promise)

Functions do NOT have access to:
- File system operations
- Network requests (unless explicitly provided)
- Process execution
- Environment variables

### Type Conversion
The `call` command automatically converts string arguments:
- **Numbers**: Parsed as float64 (supports decimals)
- **Booleans**: true/false, yes/no, 1/0, on/off
- **Strings**: Used as-is (default)

### Error Handling
Functions can return error states:
```javascript
{
    success: false,
    error: "Error message"
}
```

The CLI will:
- Display errors to stderr
- Exit with non-zero status
- Preserve error context

## Testing

The implementation includes comprehensive test coverage:

### Unit Tests
```bash
go test ./internal/jsruntime -v
```

### Integration Tests
```bash
go test ./cmd/hacka.re -v
```

### Test Coverage Areas
- Engine execution and timeouts
- JSDoc parsing
- Type conversion
- Registry operations
- Concurrent access
- Error handling
- CLI command integration

## Examples

### File Encryption Script
```bash
#!/bin/bash
# encrypt_file.sh - Encrypt files using RC4

FILE=$1
PASSWORD=$2

if [ -z "$FILE" ] || [ -z "$PASSWORD" ]; then
    echo "Usage: $0 <file> <password>"
    exit 1
fi

# Read file and encrypt
CONTENT=$(cat "$FILE")
ENCRYPTED=$(./hacka.re function call rc4_encrypt "$CONTENT" "$PASSWORD")

# Save encrypted content
echo "$ENCRYPTED" > "${FILE}.enc"
echo "Encrypted to ${FILE}.enc"
```

### Prime Number Checker
```bash
#!/bin/bash
# Find all primes up to N

MAX=${1:-100}

for ((i=2; i<=MAX; i++)); do
    if ./hacka.re function call isPrime $i 2>/dev/null | grep -q "true"; then
        echo $i
    fi
done
```

### Math Operations
```bash
# Calculate combinations C(n,k) = n!/(k!(n-k)!)
n=10
k=3

n_fact=$(./hacka.re function call factorial $n)
k_fact=$(./hacka.re function call factorial $k)
nk_fact=$(./hacka.re function call factorial $((n-k)))

# Calculate using bc or awk
result=$(echo "$n_fact / ($k_fact * $nk_fact)" | bc)
echo "C($n,$k) = $result"
```

## Future Enhancements

Potential improvements for future versions:
- Persistent function storage
- Function composition and chaining
- WebAssembly support for performance
- Debugger integration
- ES6+ features via transpilation
- Network function support (fetch API)
- Database function templates

## Troubleshooting

### Function Not Found
- Check function name with `./hacka.re function list`
- Ensure function is loaded (custom functions don't persist between runs)

### Type Errors
- Verify parameter types with `function list`
- Use quotes for strings with spaces
- Numbers should not have quotes in `call` command

### Execution Timeout
- Default timeout is 5 seconds
- Check for infinite loops
- Async operations may need adjustment

### Parse Errors
- Ensure valid JavaScript syntax
- JSDoc comments must precede function
- Use @callable or @tool tags for recognition