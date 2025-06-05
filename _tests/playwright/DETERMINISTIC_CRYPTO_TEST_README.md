# Deterministic Crypto System Tests

This directory contains Playwright tests for the Deterministic Crypto System. These tests verify that the system works correctly by testing key generation, encryption, and decryption functionality.

## Test Overview

The test suite (`test_deterministic_crypto.py`) includes the following tests:

1. **Basic Functionality Test**: Verifies that the core functionality works correctly:
   - Generating deterministic key pairs
   - Encrypting messages
   - Decrypting messages
   - Verifying that the same inputs produce the same keys

2. **Different Inputs Test**: Verifies that different inputs produce different keys:
   - Different master keys
   - Different namespaces
   - Different program names

3. **Multiple Messages Test**: Verifies that the system can handle various message types:
   - Simple messages
   - Messages with arrays
   - Messages with nested objects

## Running the Tests

### Prerequisites

1. Make sure you have Python and Playwright installed:
   ```bash
   pip install pytest playwright
   playwright install
   ```

2. Ensure the server is running:
   ```bash
   ./_tests/playwright/start_server.sh
   ```

### Running All Tests

To run all the deterministic crypto tests:

```bash
pytest _tests/playwright/test_deterministic_crypto.py -v
```

### Running Specific Tests

To run a specific test:

```bash
pytest _tests/playwright/test_deterministic_crypto.py::test_deterministic_crypto -v
pytest _tests/playwright/test_deterministic_crypto.py::test_different_inputs_produce_different_keys -v
pytest _tests/playwright/test_deterministic_crypto.py::test_encrypt_decrypt_multiple_messages -v
```

## Test Details

### `test_deterministic_crypto`

This test verifies the basic functionality of the deterministic crypto system:

1. Generates deterministic key pairs for a server and client
2. Verifies that the same inputs produce the same keys
3. Encrypts a message from the server to the client
4. Decrypts the message and verifies it matches the original

### `test_different_inputs_produce_different_keys`

This test verifies that different inputs produce different keys:

1. Generates a reference key pair with base inputs
2. Generates key pairs with different master keys, namespaces, and program names
3. Verifies that all generated keys are different from the reference key

### `test_encrypt_decrypt_multiple_messages`

This test verifies that the system can handle various message types:

1. Generates key pairs for a server and client
2. Encrypts and decrypts multiple messages with different data types
3. Verifies that all messages are correctly decrypted

## Screenshots

The tests generate screenshots in the `_tests/playwright/screenshots/` directory. These can be useful for debugging or documentation purposes.

## Troubleshooting

If the tests fail, check the following:

1. Make sure the server is running
2. Verify that the required JavaScript files are available:
   - `/lib/tweetnacl/nacl-fast.min.js`
   - `/lib/tweetnacl/nacl-util.min.js`
   - `/js/utils/deterministic-crypto.js`
3. Check the browser console for any JavaScript errors
4. Review the test output for specific assertion failures

## Adding New Tests

To add new tests:

1. Add a new test function to `test_deterministic_crypto.py`
2. Use the `setup_page` fixture to get a page with the necessary libraries
3. Define JavaScript functions to test specific functionality
4. Use `page.evaluate()` to run the JavaScript functions
5. Assert the expected results
