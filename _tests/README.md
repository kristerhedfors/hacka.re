# hacka.re Tests

This directory contains tests for the hacka.re application, including both unit tests and browser-based tests.

## Test Types

### Unit Tests

Unit tests focus on the crypto and link sharing functionality, testing individual components in isolation.

#### Unit Test Structure

The unit tests are organized into the following files:

- `test-runner.html`: HTML page that loads and runs all unit tests
- `test-framework.js`: Simple test framework for running tests in the browser
- `crypto-utils.test.js`: Tests for the CryptoUtils module
- `link-sharing-service.test.js`: Tests for the LinkSharingService module
- `share-service.test.js`: Tests for the ShareService module
- `model-context-window-test.html`: Test for displaying model context window size in the model selection menu
- `model-selection-test.html`: Tests for model selection and SSE streaming functionality

### Browser-Based Tests (Playwright)

Browser-based tests use Playwright to test the application in a real browser environment, focusing on UI interactions and end-to-end functionality. These tests are located in the `playwright` subdirectory.

#### Playwright Test Structure

The Playwright tests are organized into the following files:

- `conftest.py`: Contains pytest fixtures and setup for the tests
- `test_basic_ui.py`: Basic UI tests that verify the presence and visibility of UI elements
- `test_functional.py`: Functional tests that verify the behavior of the application with mocked API responses
- `pytest.ini`: Configuration for pytest
- `requirements.txt`: Python dependencies for the tests
- `run_tests.sh`: Script to run the tests

## Running the Tests

### Running Unit Tests

#### In a Browser

To run the unit tests in a browser:

1. Open `test-runner.html` in a web browser
2. The tests will run automatically and display the results
3. Green checkmarks (✓) indicate passing tests
4. Red X marks (✗) indicate failing tests, with error messages

For individual feature tests, open the specific test HTML file in a browser:
- `model-selection-test.html` - Tests model selection persistence and SSE streaming
- `fallback-namespace-warning-test.html` - Tests the warning system for fallback namespace hash encryption/decryption

#### From the Command Line (Optional)

To run the unit tests from the command line (useful for CI/CD):

1. Install Puppeteer: `npm install puppeteer`
2. Edit `run-tests.js` to uncomment the code
3. Run the script: `node _tests/run-tests.js`

The script will run the tests in a headless browser and output the results to the console.

### Running Playwright Tests

The Playwright tests require Python and the uv package manager. A virtual environment has been set up in the `playwright` directory.

To run the Playwright tests:

1. Navigate to the `playwright` directory: `cd _tests/playwright`
2. Run the tests using the provided script: `./run_tests.sh`

For more options, run `./run_tests.sh --help`

Alternatively, you can run the tests manually:

1. Activate the virtual environment: `source .venv/bin/activate`
2. Run the tests: `pytest`
3. Deactivate the virtual environment when done: `deactivate`

For more information about the Playwright tests, see the [Playwright README](_tests/playwright/README.md).

## Test Coverage

### Unit Test Coverage

#### CryptoUtils Tests

Tests for the cryptographic utility functions:

- Deriving seeds from passwords and salts
- Generating key pairs
- Encrypting and decrypting data
- Handling different data types
- Error cases (wrong password, etc.)

#### LinkSharingService Tests

Tests for the link sharing service:

- Creating shareable links with API key only
- Creating shareable links with API key and system prompt
- Creating custom shareable links with various data combinations
- Detecting shared API keys in URLs
- Extracting and decrypting shared data (API keys, system prompts, models, conversation history)
- Handling error cases and model mismatches
- Clearing shared data from URLs

#### ShareService Tests

Tests for the ShareService wrapper:

- Verifying that ShareService correctly delegates to LinkSharingService
- Testing password generation functionality
- Testing comprehensive sharing options (API key, system prompt, model, conversation)
- Ensuring backward compatibility is maintained

#### Model Selection and SSE Tests

Tests for model selection and Server-Sent Events (SSE) streaming:

- Model persistence in storage
- Model selection UI updates
- SSE streaming for real-time AI responses

#### Fallback Namespace Warning Tests

Tests for the warning system when using the fallback namespace hash:

- Verifies that warnings are displayed when encrypting/decrypting data using a master key that was itself decrypted using the fallback namespace hash
- Tests the behavior with and without a session key
- Confirms that the system correctly identifies when it's using the fallback namespace hash

### Playwright Test Coverage

#### Basic UI Tests

These tests verify that the UI elements of the application are present and visible:

- Page loads correctly with proper title and logo
- Chat interface elements are present
- Settings modal opens and contains expected elements
- Prompts modal opens and contains expected elements
- Share modal opens and contains expected elements

#### Functional Tests

These tests verify the behavior of the application with mocked API responses:

- API key configuration works correctly
- Model selection works correctly
- Sending a message and receiving a response works correctly

## Recent Improvements

### Fallback Namespace Hash Warning System

- Added a warning system that displays system messages when data is encrypted/decrypted using a master key that was itself decrypted using the fallback namespace hash
- Implemented tracking of when the master key is decrypted using the fallback namespace hash
- Added warnings in the CoreStorageService for both encryption and decryption operations
- Created a test page to verify the warning system functionality

### Server-Sent Events (SSE) Streaming

- Improved SSE implementation for more reliable streaming of AI responses
- Added better buffer handling for partial messages
- Implemented fallback mechanism for browsers without native EventSource support

### Model Selection Persistence

- Fixed issues with model selection not being properly persisted
- Improved synchronization between UI and storage
- Added better error handling for model selection changes

## Notes

- These tests are not included in the GitHub Pages site since they're in a directory starting with an underscore (`_tests`).
- The unit tests use a simple custom test framework rather than a full testing library to avoid adding dependencies.
- The unit tests mock browser APIs like `window.location` and `window.history` to test URL manipulation without actually changing the page.
- The Playwright tests use a local HTTP server to serve the application.
- API calls in Playwright tests are mocked to avoid making real API calls.
