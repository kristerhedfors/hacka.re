# Playwright Tests for hacka.re

This directory contains browser-based tests for the hacka.re web client using Playwright and pytest.

## Setup

The tests are set up to run in a Python virtual environment created with `uv`. The environment and dependencies are already configured.

### Prerequisites

- Python 3.11+
- uv package manager

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
   uv pip install -r requirements.txt
   ```

## Running Tests

To run all tests:

```bash
pytest
```

To run a specific test file:

```bash
pytest test_basic_ui.py
```

To run a specific test:

```bash
pytest test_basic_ui.py::test_page_loads
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
- `test_basic_ui.py`: Re-exports tests from `test_page.py` and `test_modals.py` for backward compatibility
- `test_functional.py`: Re-exports tests from `test_api.py` and `test_chat.py` for backward compatibility

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

## Adding New Tests

To add new tests:

1. Create a new test file or add tests to an existing file
2. Use the existing fixtures from `conftest.py`
3. Follow the pattern of existing tests
4. Run the tests to verify they work correctly

## Notes

- The tests use a local HTTP server to serve the application
- API calls are mocked to avoid making real API calls
- The tests use Playwright's `expect` assertions to verify the state of the application
