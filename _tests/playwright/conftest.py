import pytest
import os
from playwright.sync_api import Page, expect
from dotenv import load_dotenv

# Load environment variables from .env file in the current directory
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
# Get API key, model, and base URL from environment variables
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_API_MODEL = os.getenv("OPENAI_API_MODEL", "o4-mini")
OPENAI_API_BASE = os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

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
    """Fixture to provide the API key."""
    if not OPENAI_API_KEY:
        pytest.skip("API key is required for function calling tests")
    return OPENAI_API_KEY

@pytest.fixture(scope="function")
def groq_api_key():
    """Fixture to provide the Groq API key."""
    return GROQ_API_KEY

@pytest.fixture(scope="function", autouse=True)
def setup_test_environment(page):
    """Set up test environment to prevent welcome modal by default."""
    # This fixture runs before each test to configure the environment
    # The actual localStorage setup happens in the test utilities
    pass
