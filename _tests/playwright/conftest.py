import pytest
import os
import atexit
import signal
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
        "model": "openai/gpt-oss-120b",  # Using the 120B model on Groq (same as Berget test)
        "base_url": "https://api.groq.com/openai/v1",
        "provider_value": "groq"
    },
    "berget": {
        "api_key": BERGET_API_KEY,
        "model": "mistralai/Devstral-Small-2505",  # Devstral works properly with streaming
        "base_url": "https://api.berget.ai/v1",
        "provider_value": "berget"  # Berget is a default provider in the dropdown
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
    """
    Create a new page with isolated context for each test.

    Uses a fresh browser context to ensure complete isolation between tests,
    preventing localStorage/sessionStorage/cookies from leaking between tests.
    This is critical for reliable parallel test execution.
    """
    # Create a new browser context for complete isolation
    context = browser.new_context()
    page = context.new_page()

    # Set realistic timeout for modular app (152 JS files + 13 CSS files to load)
    page.set_default_timeout(10000)

    yield page

    # Cleanup: close page and context
    page.close()
    context.close()

@pytest.fixture(scope="session")
def serve_hacka_re(tmp_path_factory, request):
    """
    Serve the hacka.re application locally for testing.

    This fixture uses Python's built-in HTTP server to serve the application.
    When running with pytest-xdist (parallel execution), it ensures only one
    worker starts the server using FileLock for coordination.

    Works with both VSCode test runner and command-line pytest.

    Args:
        tmp_path_factory: pytest fixture for creating temp directories
        request: pytest request object for accessing config

    Returns:
        str: Base URL of the running server (http://localhost:8000)
    """
    import subprocess
    import time
    import os
    import signal
    import json
    from filelock import FileLock
    from pathlib import Path

    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
    base_url = "http://localhost:8000"

    # Get worker_id if running with pytest-xdist, otherwise use "master"
    worker_id = getattr(request.config, 'workerinput', {}).get('workerid', 'master')

    if worker_id == "master":
        # Not running with pytest-xdist (sequential mode)
        # Start server directly
        process = subprocess.Popen(
            ["python3", "-m", "http.server", "8000"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            preexec_fn=os.setsid,
            cwd=project_root
        )
        time.sleep(0.5)  # Wait for server to start

        yield base_url

        # Clean up: kill the server process
        try:
            os.killpg(os.getpgid(process.pid), signal.SIGTERM)
        except ProcessLookupError:
            print("HTTP server process already terminated")
    else:
        # Running with pytest-xdist (parallel mode)
        # Use FileLock to coordinate server startup across workers
        root_tmp_dir = tmp_path_factory.getbasetemp().parent
        server_file = root_tmp_dir / "server.json"
        lock_file = str(server_file) + ".lock"

        with FileLock(lock_file):
            if server_file.is_file():
                # Server already started by another worker
                data = json.loads(server_file.read_text())
                print(f"Worker {worker_id}: Using existing server at {data['base_url']}")
            else:
                # This worker starts the server
                print(f"Worker {worker_id}: Starting HTTP server on port 8000")
                process = subprocess.Popen(
                    ["python3", "-m", "http.server", "8000"],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    preexec_fn=os.setsid,
                    cwd=project_root
                )
                time.sleep(0.5)  # Wait for server to start

                # Store server info and PID for cleanup
                server_info = {
                    "base_url": base_url,
                    "pid": process.pid
                }
                server_file.write_text(json.dumps(server_info))
                print(f"Worker {worker_id}: Server started with PID {process.pid}")

                # Register cleanup handler to run when pytest exits
                def cleanup_server():
                    try:
                        if os.path.exists(str(server_file)):
                            with open(str(server_file)) as f:
                                data = json.load(f)
                                pid = data.get("pid")
                                if pid:
                                    try:
                                        os.killpg(os.getpgid(pid), signal.SIGTERM)
                                        print(f"Cleanup: Stopped HTTP server (PID {pid})")
                                    except (ProcessLookupError, PermissionError):
                                        pass
                            os.unlink(str(server_file))
                    except Exception as e:
                        print(f"Cleanup error: {e}")

                atexit.register(cleanup_server)

        yield base_url

        # No cleanup here - server stays running for all workers
        # Cleanup happens via atexit handler when pytest exits

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

@pytest.fixture(scope="function")
def isolated_page(page, serve_hacka_re):
    """
    Provide an isolated page with unique namespace for parallel test execution.

    This fixture:
    1. Navigates to the application
    2. Sets up unique namespace to prevent data collisions
    3. Clears storage before and after test
    4. Ensures clean state for parallel testing

    Usage: Use `isolated_page` instead of `page` fixture for tests that need isolation.
    """
    import uuid

    # Generate unique namespace for this test
    unique_namespace = f"test_{uuid.uuid4().hex[:8]}"

    # Navigate to the application
    page.goto(serve_hacka_re)

    # Wait for page to load and then set up isolated environment
    page.wait_for_load_state("domcontentloaded")

    # Set unique namespace and clear storage
    page.evaluate(f"""() => {{
        // Clear all storage
        localStorage.clear();
        sessionStorage.clear();

        // Set unique namespace for this test
        localStorage.setItem('namespace', '{unique_namespace}');

        // Mark welcome as seen to skip modal
        localStorage.setItem('welcomeShown', 'true');
    }}""")

    yield page

    # Cleanup after test
    try:
        page.evaluate("""() => {
            localStorage.clear();
            sessionStorage.clear();
        }""")
    except:
        # Page may be closed, ignore cleanup errors
        pass

@pytest.fixture(scope="function", autouse=True)
def setup_test_environment(page):
    """Set up test environment to prevent welcome modal by default."""
    # This fixture runs before each test to configure the environment
    # The actual localStorage setup happens in the test utilities
    pass
