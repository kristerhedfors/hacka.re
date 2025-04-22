# hacka.re Unit Tests

This directory contains unit tests for the hacka.re application, specifically focusing on the crypto and link sharing functionality.

## Test Structure

The tests are organized into the following files:

- `test-runner.html`: HTML page that loads and runs all tests
- `test-framework.js`: Simple test framework for running tests in the browser
- `crypto-utils.test.js`: Tests for the CryptoUtils module
- `link-sharing-service.test.js`: Tests for the LinkSharingService module
- `share-service.test.js`: Tests for the ShareService module

## Running the Tests

### In a Browser

To run the tests in a browser:

1. Open `test-runner.html` in a web browser
2. The tests will run automatically and display the results
3. Green checkmarks (✓) indicate passing tests
4. Red X marks (✗) indicate failing tests, with error messages

### From the Command Line (Optional)

To run the tests from the command line (useful for CI/CD):

1. Install Puppeteer: `npm install puppeteer`
2. Edit `run-tests.js` to uncomment the code
3. Run the script: `node _tests/run-tests.js`

The script will run the tests in a headless browser and output the results to the console.

## Test Coverage

### CryptoUtils Tests

Tests for the cryptographic utility functions:

- Deriving seeds from passwords and salts
- Generating key pairs
- Encrypting and decrypting data
- Handling different data types
- Error cases (wrong password, etc.)

### LinkSharingService Tests

Tests for the link sharing service:

- Creating shareable links with API key only
- Creating shareable links with API key and system prompt
- Creating custom shareable links with various data combinations
- Detecting shared API keys in URLs
- Extracting and decrypting shared data (API keys, system prompts, models, conversation history)
- Handling error cases and model mismatches
- Clearing shared data from URLs

### ShareService Tests

Tests for the ShareService wrapper:

- Verifying that ShareService correctly delegates to LinkSharingService
- Testing password generation functionality
- Testing comprehensive sharing options (API key, system prompt, model, conversation)
- Ensuring backward compatibility is maintained

## Notes

- These tests are not included in the GitHub Pages site since they're in a directory starting with an underscore (`_tests`).
- The tests use a simple custom test framework rather than a full testing library to avoid adding dependencies.
- The tests mock browser APIs like `window.location` and `window.history` to test URL manipulation without actually changing the page.
