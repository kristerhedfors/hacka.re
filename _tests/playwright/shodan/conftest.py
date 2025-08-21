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


# serve_hacka_re fixture removed - using the main one from conftest.py


@pytest.fixture
def shodan_ready_page(page, serve_hacka_re, shodan_api_key):
    """
    Fixture that returns a page ready for Shodan MCP testing.
    Properly configures API keys through the UI to avoid modal issues.
    """
    # Get OpenAI API key from environment
    openai_api_key = os.environ.get("OPENAI_API_KEY")
    if not openai_api_key:
        pytest.skip("OPENAI_API_KEY not set in environment - needed for Shodan chat integration")
    
    # Navigate to app
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal
    dismiss_welcome_modal(page)
    
    # Check if API key modal appears and configure it properly
    try:
        api_key_modal = page.locator('#api-key-modal')
        if api_key_modal.is_visible(timeout=2000):
            # Fill in the API key
            api_key_input = page.locator('#api-key-input')
            api_key_input.fill(openai_api_key)
            
            # Click save
            save_btn = page.locator('#save-api-key-btn')
            save_btn.click()
            
            # Wait for modal to close
            page.wait_for_selector('#api-key-modal', state='hidden', timeout=5000)
    except:
        # Modal didn't appear, configure through settings
        pass
    
    # Dismiss settings modal if it appears
    dismiss_settings_modal(page)
    
    # Ensure API key is configured through settings if not done via modal
    try:
        # Open settings if needed
        if not page.locator('#api-key-update').is_visible(timeout=1000):
            page.locator('#settings-btn').click()
            page.wait_for_timeout(1000)
        
        # Configure API key if field is visible and empty
        api_key_field = page.locator('#api-key-update')
        if api_key_field.is_visible() and api_key_field.input_value() == "":
            api_key_field.fill(openai_api_key)
        
        # Close settings
        close_settings = page.locator('#close-settings')
        if close_settings.is_visible():
            close_settings.click()
            page.wait_for_timeout(1000)
            
    except:
        # Settings configuration failed, use direct storage as fallback
        page.evaluate(f"""() => {{
            if (window.CoreStorageService) {{
                window.CoreStorageService.setValue('openai_api_key', '{openai_api_key}');
                window.CoreStorageService.setValue('openai_base_url', 'https://api.openai.com/v1');
                window.CoreStorageService.setValue('openai_model', 'gpt-4o-mini');
            }}
        }}""")
    
    # Set Shodan API key in storage first
    page.evaluate(f"""() => {{
        if (window.CoreStorageService) {{
            window.CoreStorageService.setValue('shodan_api_key', '{shodan_api_key}');
            window.CoreStorageService.setValue('mcp_service_shodan_api_key', '{shodan_api_key}');
            console.log('Shodan API key set in storage');
        }}
    }}""")
    
    # Handle any API key modal that appears
    try:
        api_key_modal = page.locator('#service-apikey-input-modal')
        if api_key_modal.is_visible(timeout=2000):
            print("API key modal is visible, filling it out")
            api_key_input = page.locator('#service-api-key-input')
            if api_key_input.is_visible():
                api_key_input.fill(shodan_api_key)
                save_btn = page.locator('#save-service-api-key-btn')
                if save_btn.is_visible():
                    save_btn.click()
                    page.wait_for_selector('#service-apikey-input-modal', state='hidden', timeout=5000)
                    print("API key modal handled")
    except Exception as e:
        print(f"No API key modal or handled: {e}")
    
    # Now try to connect Shodan service
    page.evaluate("""() => {
        if (window.mcpServiceManager) {
            window.mcpServiceManager.connectService('shodan').then(result => {
                console.log('Shodan service connection result:', result);
            }).catch(error => {
                console.error('Shodan service connection error:', error);
            });
        }
    }""")
    
    # Wait a moment for the service to connect
    page.wait_for_timeout(3000)
    
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
    chat_input = page.locator("#message-input")
    chat_input.fill(prompt)
    
    send_btn = page.locator("#send-btn")
    send_btn.click()
    
    # Wait for response
    page.wait_for_timeout(3000)  # Allow time for API call
    
    # Extract the response
    message_content = page.locator(".message.assistant .message-content").last
    if message_content:
        response_text = message_content.text_content()
        
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