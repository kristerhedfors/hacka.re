"""
Shodan MCP Server Test Configuration
====================================
Fixtures and utilities for testing Shodan MCP integration with real API calls.
Tests use actual Shodan API for realistic validation of functionality.
"""
import pytest
import os
import sys
import json
import time
from pathlib import Path
from typing import Dict, Any

# Add parent directory to path for imports
parent_dir = Path(__file__).parent.parent
sys.path.insert(0, str(parent_dir))

from test_utils import dismiss_welcome_modal, dismiss_settings_modal


@pytest.fixture(scope="session")
def shodan_api_key():
    """Get Shodan API key from environment"""
    api_key = os.environ.get("SHODAN_API_KEY")
    if not api_key:
        pytest.skip("SHODAN_API_KEY not set in environment")
    return api_key


@pytest.fixture(scope="session")
def serve_hacka_re():
    """Start HTTP server for testing"""
    import subprocess
    import time
    
    port = 8000
    project_root = Path(__file__).parent.parent.parent.parent
    
    # Check if server is already running
    try:
        import requests
        response = requests.get(f"http://localhost:{port}", timeout=1)
        # Server already running
        return f"http://localhost:{port}"
    except:
        pass
    
    # Start server
    server_process = subprocess.Popen(
        ["python", "-m", "http.server", str(port)],
        cwd=str(project_root),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    
    # Wait for server to start
    time.sleep(2)
    
    yield f"http://localhost:{port}"
    
    # Cleanup
    server_process.terminate()
    server_process.wait()


@pytest.fixture
def shodan_ready_page(page, serve_hacka_re, shodan_api_key):
    """
    Fixture that returns a page ready for Shodan MCP testing.
    Uses the same pattern as core tests for proper setup.
    """
    # Navigate to app
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Step 1: Configure basic API first (following core test pattern)
    page.locator('#settings-btn').click()
    page.wait_for_timeout(1000)
    
    # Basic API setup (minimal, just to get system working)
    page.locator('#api-key-update').fill(shodan_api_key)  # Use Shodan key as temp
    page.locator('#base-url-select').select_option('openai')  # Keep basic setup
    
    # Step 2: Configure Shodan via storage (simpler than modal navigation)
    page.evaluate(f"""() => {{
        // Set Shodan API key directly in storage
        if (window.CoreStorageService) {{
            window.CoreStorageService.setValue('shodan_api_key', '{shodan_api_key}');
            // Mark Shodan as configured
            window.CoreStorageService.setValue('mcp_shodan_configured', true);
        }}
    }}""")
    
    # Close settings
    page.locator('#close-settings').click()
    page.wait_for_timeout(1000)
    
    return page


@pytest.fixture
def shodan_chat_interface(shodan_ready_page):
    """
    Returns a page with Shodan MCP ready and chat interface prepared.
    """
    page = shodan_ready_page
    
    # Ensure chat input is ready (use correct selector)
    chat_input = page.locator("#message-input")
    chat_input.wait_for(state="visible", timeout=5000)
    
    return page


def execute_shodan_tool(page, tool_name: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Execute a Shodan MCP tool through the chat interface and return the result.
    
    Args:
        page: The Playwright page object
        tool_name: Name of the Shodan tool to execute
        params: Optional parameters for the tool
        
    Returns:
        Dictionary containing the tool response
    """
    # Build the prompt
    if params:
        param_str = json.dumps(params, indent=2)
        prompt = f"Use the Shodan {tool_name} tool with these parameters:\n{param_str}"
    else:
        prompt = f"Use the Shodan {tool_name} tool"
    
    # Send the message
    chat_input = page.locator("#userInput")
    chat_input.fill(prompt)
    
    send_btn = page.locator("#sendButton")
    send_btn.click()
    
    # Wait for response
    page.wait_for_timeout(3000)  # Allow time for API call
    
    # Extract the response
    messages = page.locator(".message").all()
    if messages:
        last_message = messages[-1]
        response_text = last_message.text_content()
        
        # Try to parse JSON from response
        try:
            # Look for JSON in the response
            import re
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
        except:
            pass
            
        return {"raw_response": response_text}
    
    return {"error": "No response received"}


@pytest.fixture
def shodan_test_targets():
    """
    Provides safe, ethical test targets for Shodan searches.
    These are well-known public services used for testing.
    """
    return {
        "google_dns": "8.8.8.8",
        "cloudflare_dns": "1.1.1.1",
        "example_domain": "example.com",
        "test_domain": "google.com",
        "test_port": 443,
        "test_service": "http",
        "test_country": "US",
        "test_org": "Google",
        "safe_query": "port:443 country:US",
        "facet_fields": ["country", "org", "port"]
    }