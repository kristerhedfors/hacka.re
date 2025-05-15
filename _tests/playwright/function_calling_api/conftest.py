"""
Conftest for Function Calling API Tests

This module contains fixtures and setup for the function calling API tests.
"""
import os
import pytest
from dotenv import load_dotenv

# Load environment variables from .env file in the current directory
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

# Get API key from environment variables
API_KEY = os.getenv("OPENAI_API_KEY")

# Skip all tests in this package if no API key is provided
pytestmark = pytest.mark.skipif(
    not API_KEY, 
    reason="API key is required for function calling tests"
)

# Set up console error logging
console_errors = []

@pytest.fixture
def api_key():
    """Fixture to provide the API key."""
    return API_KEY
