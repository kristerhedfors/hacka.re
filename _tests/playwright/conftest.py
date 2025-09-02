import pytest
import os
from playwright.sync_api import Page, expect
from dotenv import load_dotenv

# Load environment variables from .env file in the current directory
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

# Get API key, model, and base URL from environment variables
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_API_MODEL = os.getenv("OPENAI_API_MODEL", "gpt-5-nano")
OPENAI_API_BASE = os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
BERGET_API_KEY = os.getenv("BERGET_API_KEY")

# Centralized test configuration
# This determines the provider and model for ALL tests
TEST_PROVIDER = os.getenv("TEST_PROVIDER", "openai")  # Can be: openai, groq, custom
TEST_MODEL = os.getenv("TEST_MODEL", OPENAI_API_MODEL)  # Defaults to OPENAI_API_MODEL
TEST_API_KEY = os.getenv("TEST_API_KEY", OPENAI_API_KEY)  # Defaults to OPENAI_API_KEY
TEST_API_BASE = os.getenv("TEST_API_BASE", OPENAI_API_BASE)  # Defaults to OPENAI_API_BASE

# Map provider names to their configurations
PROVIDER_CONFIGS = {
    "openai": {
        "api_key": OPENAI_API_KEY,
        "model": "gpt-5-nano",
        "base_url": "https://api.openai.com/v1",
        "provider_value": "openai"
    },
    "groq": {
        "api_key": GROQ_API_KEY or OPENAI_API_KEY,  # Groq can use either key
        "model": "openai/gpt-oss-20b",  # Using the open weights model on Groq (full model ID)
        "base_url": "https://api.groq.com/openai/v1",
        "provider_value": "groq"
    },
    "custom": {
        "api_key": TEST_API_KEY,
        "model": TEST_MODEL,
        "base_url": TEST_API_BASE,
        "provider_value": "custom"
    }
}

# Get the active test configuration
ACTIVE_TEST_CONFIG = PROVIDER_CONFIGS.get(TEST_PROVIDER, PROVIDER_CONFIGS["openai"])

@pytest.fixture(scope="function")
def page(browser):
    """Create a new page for each test."""
    page = browser.new_page()
    # Set realistic timeout for modular app (152 JS files + 13 CSS files to load)
    page.set_default_timeout(10000)
    yield page
    page.close()

@pytest.fixture(scope="function")
def serve_hacka_re(page):
    """
    Serve the hacka.re application locally for testing.
    
    This fixture uses Python's built-in HTTP server to serve the application
    from the current directory.
    """
    import subprocess
    import time
    import os
    import signal
    from urllib.parse import urljoin
    
    # Start a local HTTP server in the background from the project root directory
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
    process = subprocess.Popen(
        ["python3", "-m", "http.server", "8000"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        preexec_fn=os.setsid,
        cwd=project_root
    )
    
    # Give the server a minimal moment to start
    time.sleep(0.1)
    
    # Set the base URL for tests
    base_url = "http://localhost:8000"
    
    # Yield the base URL for tests to use
    yield base_url
    
    # Clean up: kill the server process
    try:
        os.killpg(os.getpgid(process.pid), signal.SIGTERM)
    except ProcessLookupError:
        # Process is already gone, which is fine
        print("HTTP server process already terminated")

@pytest.fixture(scope="function")
def api_key():
    """Fixture to provide the API key for the active test configuration."""
    key = ACTIVE_TEST_CONFIG["api_key"]
    if not key:
        pytest.skip(f"API key is required for {TEST_PROVIDER} provider tests")
    return key

@pytest.fixture(scope="function")
def test_model():
    """Fixture to provide the test model for the active configuration."""
    return ACTIVE_TEST_CONFIG["model"]

@pytest.fixture(scope="function")
def test_provider():
    """Fixture to provide the test provider name."""
    return TEST_PROVIDER

@pytest.fixture(scope="function")
def test_base_url():
    """Fixture to provide the base URL for the active test configuration."""
    return ACTIVE_TEST_CONFIG["base_url"]

@pytest.fixture(scope="function")
def test_config():
    """Fixture to provide the complete test configuration."""
    return ACTIVE_TEST_CONFIG

@pytest.fixture(scope="function")
def groq_api_key():
    """Fixture to provide the Groq API key."""
    return GROQ_API_KEY

@pytest.fixture(scope="function")
def berget_api_key():
    """Fixture to provide the Berget API key."""
    return BERGET_API_KEY

@pytest.fixture(scope="function", autouse=True)
def setup_test_environment(page):
    """Set up test environment to prevent welcome modal by default."""
    # This fixture runs before each test to configure the environment
    # The actual localStorage setup happens in the test utilities
    pass
