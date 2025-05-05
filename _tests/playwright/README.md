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
- MCP server management (adding, starting, stopping, and removing servers)
- MCP tool integration with the chat interface

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
