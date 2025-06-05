# OpenAI API Proxy Test

This document describes the tests for the OpenAI API Proxy default prompt feature in hacka.re.

## Feature Description

The OpenAI API Proxy is a pure Python implementation of an OpenAI API proxy without external dependencies. It provides a lightweight HTTP server that proxies requests to the OpenAI API, implementing core endpoints like completions and chat completions, with support for streaming responses.

The proxy is implemented as a default prompt in the Code section of the System Prompt Menu, allowing users to easily include it in their system prompt.

## Test Coverage

The OpenAI API Proxy is tested as part of the default prompts tests in `test_default_prompts.py`. The tests verify:

1. **Existence**: The OpenAI API Proxy prompt exists in the Code section of the default prompts.
2. **Selection**: The OpenAI API Proxy prompt can be selected and deselected, and the token usage bar updates accordingly.
3. **Info Button**: Clicking the info button shows a popup with the correct title and description.
4. **Content Loading**: Clicking on the prompt name loads the prompt content into the editor fields.

## Test Implementation

The tests use Playwright to interact with the UI and verify the expected behavior. The OpenAI API Proxy is tested alongside other default prompts to ensure consistent behavior.

### Key Test Cases

- `test_default_prompts_content`: Verifies that the OpenAI API Proxy prompt exists in the Code section.
- `test_default_prompts_selection`: Tests that the OpenAI API Proxy prompt can be selected and deselected.
- `test_default_prompts_info_button`: Checks that the info button shows a popup with the correct description.
- `test_default_prompts_name_click`: Verifies that clicking on the prompt name loads the prompt content into the editor.

## Running the Tests

To run the tests for the OpenAI API Proxy:

```bash
cd /path/to/hacka.re
_tests/playwright/run_tests.sh test_default_prompts.py
```

This will run all the default prompts tests, including those for the OpenAI API Proxy.
