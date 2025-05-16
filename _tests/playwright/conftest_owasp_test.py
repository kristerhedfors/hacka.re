import pytest
import os
from dotenv import load_dotenv

# Load environment variables from .env file in the current directory
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

@pytest.fixture
def api_key():
    """Fixture to provide API key for tests."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        pytest.skip("API key is required for this test")
    return api_key
