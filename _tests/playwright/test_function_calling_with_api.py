"""
Function Calling with API Tests

This module is a wrapper around the refactored function calling API tests.
It imports and re-exports the tests from the function_calling_api package.

For better organization and maintainability, the tests have been refactored into:
- function_calling_api/test_basic.py: Basic function calling tests
- function_calling_api/test_multiple.py: Tests for multiple functions
- function_calling_api/test_validation.py: Tests for validation errors
- function_calling_api/test_rc4.py: Tests for RC4 encryption/decryption functions

Helper functions have been moved to:
- function_calling_api/helpers/setup_helpers.py: Setup helper functions
- function_calling_api/helpers/function_helpers.py: Function-related helper functions
- function_calling_api/helpers/chat_helpers.py: Chat interaction helper functions
"""
import os
import pytest
from playwright.sync_api import Page
from dotenv import load_dotenv

# Import the original test functions from the refactored modules
from function_calling_api.test_basic import test_function_calling_with_api_key as original_test_basic
from function_calling_api.test_multiple import test_multiple_functions_with_api_key as original_test_multiple
from function_calling_api.test_validation import test_function_validation_errors_with_api as original_test_validation
from function_calling_api.test_rc4 import test_rc4_encryption_functions_with_api as original_test_rc4

# Load environment variables from .env file in the current directory
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
# Get API key from environment variables
API_KEY = os.getenv("OPENAI_API_KEY")

# Skip the test if no API key is provided
pytestmark = pytest.mark.skipif(
    not API_KEY, 
    reason="API key is required for function calling tests"
)

# Create wrapper functions that properly pass the arguments to the original test functions
def test_function_calling_with_api_key(page: Page, serve_hacka_re, api_key):
    """Test function calling with a configured API key and function calling model."""
    return original_test_basic(page, serve_hacka_re, api_key)

def test_multiple_functions_with_api_key(page: Page, serve_hacka_re, api_key):
    """Test multiple functions with a configured API key."""
    return original_test_multiple(page, serve_hacka_re, api_key)

def test_function_validation_errors_with_api(page: Page, serve_hacka_re, api_key):
    """Test function validation errors with a configured API key."""
    return original_test_validation(page, serve_hacka_re, api_key)

def test_rc4_encryption_functions_with_api(page: Page, serve_hacka_re, api_key):
    """Test RC4 encryption/decryption functions with a configured API key."""
    return original_test_rc4(page, serve_hacka_re, api_key)
