"""Test MCP Share Link Creation"""

import pytest
from playwright.sync_api import Page, expect
from test_utils import screenshot_with_markdown, dismiss_welcome_modal, dismiss_settings_modal


@pytest.mark.feature_test
def test_mcp_share_link_creation_debug(page: Page, serve_hacka_re):
    """Test creating a share link with MCP connections and debug the output"""
    
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal
    dismiss_settings_modal(page)
    
    # Store a GitHub token
    test_token = 'ghp_test_token_for_sharing_debug_1234567890'
    page.evaluate(f"""
        console.log('🔧 Setting GitHub token for share link creation test...');
        window.CoreStorageService.setValue('mcp_github_token', '{test_token}');
        console.log('🔧 GitHub token set successfully');
    """)
    
    # Verify token is stored correctly
    stored_token = page.evaluate("""
        (async () => {
            const token = await window.CoreStorageService.getValue('mcp_github_token');
            console.log('🔧 Verified stored token:', typeof token, token);
            return token;
        })()
    """)
    print(f"✅ Stored token verified: {stored_token}")
    
    # Test the collectMcpConnectionsData function directly
    collected_data = page.evaluate("""
        (async () => {
            if (window.collectMcpConnectionsData) {
                console.log('🔧 Testing collectMcpConnectionsData function...');
                const data = await window.collectMcpConnectionsData();
                console.log('🔧 collectMcpConnectionsData returned:', data);
                return data;
            } else {
                console.error('🔧 collectMcpConnectionsData not available');
                return null;
            }
        })()
    """)
    print(f"📊 collectMcpConnectionsData result: {collected_data}")
    
    # Setup console logging to capture MCP collection messages
    console_messages = []
    def log_console_message(msg):
        if "🔌" in msg.text or "ShareManager" in msg.text or "collectMcp" in msg.text:
            console_messages.append(f"[{msg.type}] {msg.text}")
            print(f"🎯 {msg.text}")
    
    page.on("console", log_console_message)
    
    # Open share modal
    share_btn = page.locator("#share-btn")
    share_btn.click()
    page.wait_for_selector('#share-modal', state='visible')
    
    # Check the MCP connections checkbox
    mcp_checkbox = page.locator('#share-mcp-connections')
    expect(mcp_checkbox).to_be_visible()
    mcp_checkbox.check()
    
    # Enter a password
    password_input = page.locator('#share-password')
    password_input.fill('testpassword123')
    
    # Generate share link
    generate_btn = page.locator('#generate-share-link-btn')
    generate_btn.click()
    
    # Wait for link generation
    page.wait_for_selector('#generated-link', state='visible', timeout=10000)
    
    # Get the generated link
    generated_link = page.locator('#generated-link')
    link_value = generated_link.input_value()
    print(f"📋 Generated link length: {len(link_value)} characters")
    print(f"📋 Generated link starts with: {link_value[:100]}...")
    
    # Extract and try to decrypt the shared data to see what was actually included
    hash_part = link_value.split('#gpt=')[1] if '#gpt=' in link_value else ''
    if hash_part:
        decrypted_data = page.evaluate(f"""
            (async () => {{
                try {{
                    const data = window.CryptoUtils.decryptData('{hash_part}', 'testpassword123');
                    console.log('🔍 Decrypted share data:', data);
                    return data;
                }} catch (error) {{
                    console.error('🔍 Failed to decrypt share data:', error);
                    return null;
                }}
            }})()
        """)
        print(f"🔍 Decrypted share data: {decrypted_data}")
        
        if decrypted_data and 'mcpConnections' in decrypted_data:
            mcp_data = decrypted_data['mcpConnections']
            print(f"🔌 MCP data in share link: {mcp_data}")
            print(f"🔌 MCP data type: {type(mcp_data)}")
            if isinstance(mcp_data, dict):
                print(f"🔌 MCP data keys: {list(mcp_data.keys())}")
        else:
            print("❌ No MCP connections found in decrypted data")
    
    # Show relevant console messages
    if console_messages:
        print("🔍 MCP Collection Debug Messages:")
        for msg in console_messages:
            print(f"   {msg}")
    else:
        print("❌ No MCP collection debug messages captured")
    
    # Take screenshot for debugging
    screenshot_with_markdown(
        page,
        "mcp_share_link_creation_debug",
        {
            "description": "Share link creation with MCP connections debug",
            "generated_link_length": str(len(link_value)),
            "collected_data": str(collected_data),
            "mcp_messages_count": str(len(console_messages))
        }
    )
    
    print("✅ MCP share link creation debug test completed!")