# Playwright Tests for hacka.re

This directory contains browser-based tests for the hacka.re web client using Playwright and pytest.

## Setup

The tests are set up to run in a Python virtual environment. The environment and dependencies are already configured.

### Prerequisites

- Python 3.11+

### Installation

1. Create a `.env` file in the `_tests/playwright` directory with your API key:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```

2. Activate the virtual environment:
   ```bash
   source .venv/bin/activate
   ```

3. Install dependencies (if not already installed):
   ```bash
   pip install -r requirements.txt
   ```

## Running Tests

To run all tests:

```bash
pytest
```

To run a specific test file:

```bash
pytest test_page.py
```

To run a specific test:

```bash
pytest test_page.py::test_page_loads
```

To run tests with more verbose output:

```bash
pytest -v
```

## Test Structure

The tests are organized into the following files:

- `conftest.py`: Contains pytest fixtures and setup for the tests
- `test_utils.py`: Common utility functions used by all tests
- `test_page.py`: Tests related to page loading and basic UI elements
- `test_modals.py`: Tests related to modals (settings, prompts, share)
- `test_api.py`: Tests related to API functionality
- `test_chat.py`: Tests related to chat functionality
- `test_default_prompts.py`: Tests related to the default prompts feature
- `test_model_context_window.py`: Tests related to displaying model context window size in the model selection menu
- `test_context_window_scaling.py`: Tests related to context window meter scaling with model context size
- `test_mcp.py`: Tests related to Model Context Protocol (MCP) functionality
- `test_token_counter_debounce.py`: Tests related to token counter debouncing for improved performance
- `test_themes.py`: Tests related to theme switching functionality and mobile responsiveness
- `test_function_calling.py`: Tests related to the function calling (OpenAPI) feature and JavaScript function execution, including error handling and RC4 encryption/decryption functionality
- `test_function_calling_with_api.py`: Tests related to function calling with a configured API key, using a function calling model, and validating function invocation through chat conversations

## Testing MCP Functionality

> **Note**: MCP functionality is currently under development and temporarily disabled. All MCP tests are currently skipped with `pytestmark = pytest.mark.skip(reason="MCP functionality is currently under development and temporarily disabled")`.

The Model Context Protocol (MCP) tests are divided into two categories:

1. **UI Tests**: These tests verify the MCP UI elements and basic functionality without requiring an actual MCP server.
2. **Integration Tests**: These tests require an actual running MCP server to test the full integration.

### Running MCP UI Tests (Currently Disabled)

When MCP functionality is re-enabled, the basic MCP UI tests can be run like any other test:

```bash
pytest test_mcp.py -k "not test_filesystem_mcp_server_integration"
```

### Running MCP Integration Tests (Currently Disabled)

When MCP functionality is re-enabled, to run the MCP integration tests, you'll need to:

1. Start an MCP server using supergateway. For example, to start a filesystem MCP server:

   ```bash
   npx -y supergateway \
     --stdio "npx -y @modelcontextprotocol/server-filesystem ./my-folder" \
     --port 8000 \
     --baseUrl http://localhost:8000 \
     --ssePath /sse \
     --messagePath /message
   ```

   Replace `./my-folder` with the path to a directory you want to expose through the filesystem server.

2. Run the specific integration test:

   ```bash
   pytest test_mcp.py::test_filesystem_mcp_server_integration -v
   ```

Note that the integration test is marked with `@pytest.mark.skip` by default since it requires an actual running MCP server. You'll need to remove this mark or use the `-k` flag to run it.

## Test Categories

### Basic UI Tests

These tests verify that the UI elements of the application are present and visible:

- Page loads correctly with proper title and logo
- Chat interface elements are present
- Settings modal opens and contains expected elements
- Prompts modal opens and contains expected elements
- Share modal opens and contains expected elements

### Functional Tests

These tests verify the behavior of the application with mocked API responses:

- API key configuration works correctly
- Model selection works correctly
- Sending a message and receiving a response works correctly
- Context window meter scales with model context size
- Token counter debouncing works correctly for typing and pasting
- MCP server management (adding, starting, stopping, and removing servers)
- MCP tool integration with the chat interface
  - Basic UI tests for adding, starting, stopping, and removing MCP servers
  - Integration tests with actual MCP servers (requires running an MCP server)
- Theme switching functionality
  - Cycling through different themes (Modern, Sunset, Ocean, etc.)
  - Coexistence of theme toggle and MCP buttons in the header
- Mobile responsiveness
  - Proper CSS classes added for mobile devices
  - Responsive layout adjustments for different screen sizes
  - Function calling feature
    - UI for adding, editing, and removing JavaScript functions
    - Validation of function syntax, naming, and format
    - Error handling for function execution
    - Integration with the chat interface for tool calling
    - Enabling and disabling functions
    - Handling of various error scenarios (syntax errors, execution errors, timeouts, etc.)
    - RC4 encryption/decryption functions for testing complex operations
      - Encryption and decryption of text with a secret key
      - Validation of encryption/decryption results
      - Testing with known test vectors
      - Error handling for missing parameters
      - Error handling for invalid hex format in ciphertext
      - Proper user feedback for all error conditions
    - Function calling with API key integration
      - Configuring API key using .env file
      - Selecting function calling models
      - Enabling function calling in settings
      - Adding example functions with JSDoc comments for better tool definitions
      - Testing function invocation through natural language chat conversations
      - Validating function execution and response integration
      - Testing multiple functions in the same conversation

## Function Calling Test Implementation Notes

### Default Test Function

The default function in the function calling menu is a `multiply_numbers` function that takes two numeric arguments. This function was chosen for testing purposes for several reasons:

1. **Easy to invoke**: The function requires just two numeric arguments, making it straightforward to call from the LLM.
2. **Easy to validate**: Multiplication produces deterministic results that can be easily verified.
3. **Unlikely to be solved by an LLM**: Unlike functions that retrieve information (like getting the time in Berlin), multiplication requires actual computation rather than knowledge retrieval, ensuring the function is actually executed rather than the LLM attempting to simulate the result.

This approach provides a more reliable test case than functions that depend on external APIs or that produce results an LLM might be able to guess or approximate.

When implementing or modifying function calling tests, be aware of these important considerations:

### Key Implementation Details

1. **Function Name Field Behavior**: The function name input field is **read-only** and auto-populated from the function declaration in the code editor. Tests must:
   - First set the function code with a properly named function
   - Wait for the function name field to be auto-populated
   - Then proceed with validation and submission

2. **Correct Test Flow**:
   ```python
   # First, set the function code - the name field will be auto-populated
   function_code = page.locator("#function-code")
   function_code.fill("""function test_function() { ... }""")
   
   # Check that the function name field was auto-populated
   function_name = page.locator("#function-name")
   expect(function_name).to_have_value("test_function")
   
   # Then validate and submit
   ```

3. **Element Visibility**: Always ensure elements are visible before interacting with them using `scroll_into_view_if_needed()` to prevent test failures.

### Common Pitfalls

1. **Decorator Issues**: The `timed_test` decorator in `test_utils.py` can cause issues with function calling tests. It expects the first argument to be a `page` object, but this may not be passed correctly in all test configurations. If you encounter `IndexError: tuple index out of range` errors, consider removing the decorator.

2. **Direct Interaction with Read-Only Fields**: Attempting to directly fill the function name field will fail with timeout errors:
   ```
   TimeoutError: Locator.fill: Timeout 30000ms exceeded.
   Call log:
     - locator resolved to <input readonly="readonly" .../>
     - element is not editable
   ```

3. **Waiting Strategies**: Avoid arbitrary waits (e.g., `page.wait_for_timeout()`). Instead, use proper waiting strategies:
   ```python
   # Good practice
   page.wait_for_selector("#validation-result:not(:empty)", state="visible")
   
   # Avoid
   page.wait_for_timeout(500)  # Arbitrary wait
   ```

The working implementation can be found in `test_function_calling_correct.py` and `test_function_calling_simple.py`, which demonstrate the proper approach to testing the function calling features.

## Adding New Tests

To add new tests:

1. Create a new test file or add tests to an existing file
2. Use the existing fixtures from `conftest.py`
3. Follow the pattern of existing tests
4. Run the tests to verify they work correctly

## Notes

- The tests use a local HTTP server to serve the application
- The tests use Playwright's `expect` assertions to verify the state of the application
- **Important**: Unlike many test suites, we do NOT mock ANY API calls. All tests go against the real Groq Cloud API with the API key in the `.env` file. This ensures the application works correctly with actual LLM providers.
- Be mindful of token usage in tests. Tests should be designed to minimize the number of API calls and token usage while still providing adequate test coverage.
- We prefer using `llama-3.1-8b-instant` from Groq during tests due to its lower token costs and faster response times.
- The `.env` file should contain a valid API key for the LLM provider you're testing with (e.g., Groq, OpenAI).
- Do not add any mocking code to the tests, as this defeats the purpose of testing against real APIs.
