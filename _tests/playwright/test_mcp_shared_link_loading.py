"""Test MCP Shared Link Loading"""

import pytest
from playwright.sync_api import Page, expect
from test_utils import screenshot_with_markdown


@pytest.mark.feature_test
def test_mcp_shared_link_loading(page: Page, serve_hacka_re):
    """Test loading a shared link with MCP connections"""
    
    # Create a test shared link with MCP connections
    test_token = 'ghp_shared_link_test_1234567890abcdef'
    
    # Create the payload structure that should be in a working shared link
    test_payload = {
        'apiKey': 'sk-test1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        'baseUrl': 'https://api.openai.com/v1',
        'model': 'gpt-4o-mini',
        'mcpConnections': {
            'github': test_token
        }
    }
    
    # First navigate to get access to CryptoUtils
    page.goto(serve_hacka_re)
    page.wait_for_load_state('domcontentloaded')
    
    # Encrypt the payload to create a proper shared link
    encrypted_data = page.evaluate(f"""
        (async () => {{
            // Wait for CryptoUtils to be available
            if (!window.CryptoUtils) {{
                console.error('CryptoUtils not available');
                return null;
            }}
            const payload = {test_payload};
            const password = 'testpassword123';
            console.log('🔧 Creating encrypted payload:', payload);
            const encrypted = window.CryptoUtils.encryptData(payload, password);
            console.log('🔧 Encrypted data length:', encrypted.length);
            return encrypted;
        }})()
    """)
    
    print(f"📦 Created encrypted payload length: {len(encrypted_data)}")
    
    # Construct the shared link URL
    shared_link_url = f"{serve_hacka_re}#gpt={encrypted_data}"
    print(f"🔗 Shared link length: {len(shared_link_url)}")
    
    # Setup console logging to capture MCP processing messages
    console_messages = []
    def log_console_message(msg):
        if any(keyword in msg.text for keyword in ["🚨", "INVALID TOKEN", "mcpConnections", "applyMcpConnections", "SharedLinkDataProcessor"]):
            console_messages.append(f"[{msg.type}] {msg.text}")
            print(f"🎯 {msg.text}")
    
    page.on("console", log_console_message)
    
    # Navigate to the shared link
    print("🚀 Loading shared link...")
    page.goto(shared_link_url)
    
    # Handle the password prompt
    page.wait_for_selector('#early-password-input', state='visible', timeout=10000)
    password_input = page.locator('#early-password-input')
    password_input.fill('testpassword123')
    
    submit_button = page.locator('#early-password-submit')
    submit_button.click()
    
    # Wait for the link to be processed
    page.wait_for_timeout(5000)
    
    # Check if the GitHub token was applied correctly
    stored_token = page.evaluate("""
        (async () => {
            try {
                const token = await window.CoreStorageService.getValue('mcp_github_token');
                console.log('🔍 Checking applied GitHub token:', typeof token, token);
                return token;
            } catch (error) {
                console.error('🔍 Error checking GitHub token:', error);
                return null;
            }
        })()
    """)
    
    print(f"🔍 Applied GitHub token: {stored_token}")
    
    # Check if there were any error messages about invalid tokens
    invalid_token_messages = [msg for msg in console_messages if "INVALID TOKEN" in msg]
    
    if invalid_token_messages:
        print("❌ Found INVALID TOKEN errors:")
        for msg in invalid_token_messages:
            print(f"   {msg}")
    else:
        print("✅ No INVALID TOKEN errors found")
    
    # Verify the token was applied correctly
    if stored_token == test_token:
        print("✅ SUCCESS: GitHub token applied correctly from shared link!")
    else:
        print(f"❌ FAIL: Expected token '{test_token}', got '{stored_token}'")
    
    # Show all relevant console messages
    if console_messages:
        print("🔍 MCP Processing Debug Messages:")
        for msg in console_messages[-20:]:  # Show last 20 messages
            print(f"   {msg}")
    
    # Take screenshot
    screenshot_with_markdown(
        page,
        "mcp_shared_link_loading",
        {
            "description": "Loading shared link with MCP connections",
            "applied_token": str(stored_token),
            "invalid_token_errors": str(len(invalid_token_messages)),
            "console_messages": str(len(console_messages))
        }
    )
    
    print("✅ MCP shared link loading test completed!")