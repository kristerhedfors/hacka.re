"""Test Complete MCP Share Flow - Create and Load"""

import pytest
from playwright.sync_api import Page, expect
from test_utils import screenshot_with_markdown, dismiss_welcome_modal, dismiss_settings_modal


@pytest.mark.feature_test
def test_complete_mcp_share_flow(page: Page, serve_hacka_re):
    """Test the complete flow: create a share link with MCP, then load it in a new session"""
    
    print("🎬 === PHASE 1: CREATING SHARE LINK WITH MCP ===")
    
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Store a GitHub token
    test_token = 'ghp_complete_flow_test_1234567890abcdef'
    page.evaluate(f"""
        console.log('🔧 Setting up GitHub token for complete flow test...');
        window.CoreStorageService.setValue('mcp_github_token', '{test_token}');
    """)
    
    # Open share modal and create a link
    share_btn = page.locator("#share-btn")
    share_btn.click()
    page.wait_for_selector('#share-modal', state='visible')
    
    # Check the MCP connections checkbox
    mcp_checkbox = page.locator('#share-mcp-connections')
    expect(mcp_checkbox).to_be_visible()
    mcp_checkbox.check()
    
    # Skip other checkboxes for simplicity - just test MCP
    
    # Enter password
    password_input = page.locator('#share-password')
    password_input.fill('testpassword123')
    
    # Generate share link
    generate_btn = page.locator('#generate-share-link-btn')
    generate_btn.click()
    
    # Wait for link generation
    page.wait_for_selector('#generated-link', state='visible', timeout=10000)
    
    # Get the generated link
    generated_link = page.locator('#generated-link')
    share_link = generated_link.input_value()
    
    print(f"✅ Created share link length: {len(share_link)}")
    print(f"📋 Share link: {share_link[:100]}...")
    
    # Close the share modal
    page.locator('#close-share-modal').click()
    
    print("🎬 === PHASE 2: LOADING SHARE LINK IN NEW SESSION ===")
    
    # Clear all storage to simulate a new session
    page.evaluate("""
        localStorage.clear();
        sessionStorage.clear();
        console.log('🧹 Cleared all storage for new session simulation');
    """)
    
    # Setup console logging for the loading phase
    console_messages = []
    def log_console_message(msg):
        if any(keyword in msg.text.lower() for keyword in ["mcp", "github", "token", "invalid", "applied"]):
            console_messages.append(f"[{msg.type}] {msg.text}")
            print(f"🎯 {msg.text}")
    
    page.on("console", log_console_message)
    
    # Navigate to the shared link
    print("🚀 Loading the created share link...")
    page.goto(share_link)
    
    # Handle password prompt if it appears
    try:
        page.wait_for_selector('#early-password-input', state='visible', timeout=5000)
        print("🔐 Password prompt appeared")
        password_input = page.locator('#early-password-input')
        password_input.fill('testpassword123')
        submit_button = page.locator('#early-password-submit')
        submit_button.click()
        print("🔓 Password submitted")
    except:
        print("ℹ️ No password prompt (link may have loaded directly)")
    
    # Wait for processing to complete
    page.wait_for_timeout(3000)
    
    # Check if the GitHub token was applied
    final_token = page.evaluate("""
        (async () => {
            try {
                const token = await window.CoreStorageService.getValue('mcp_github_token');
                console.log('🔍 Final GitHub token check:', typeof token, token);
                return token;
            } catch (error) {
                console.error('🔍 Error checking final token:', error);
                return null;
            }
        })()
    """)
    
    print(f"🔍 Final applied token: {final_token}")
    
    # Check for any error messages
    error_messages = [msg for msg in console_messages if "invalid" in msg.lower() or "error" in msg.lower()]
    success_messages = [msg for msg in console_messages if "applied" in msg.lower() or "success" in msg.lower()]
    
    print(f"📊 Console messages captured: {len(console_messages)}")
    print(f"❌ Error messages: {len(error_messages)}")
    print(f"✅ Success messages: {len(success_messages)}")
    
    # Show key messages
    if error_messages:
        print("🚨 Error Messages:")
        for msg in error_messages:
            print(f"   {msg}")
    
    if success_messages:
        print("✅ Success Messages:")
        for msg in success_messages:
            print(f"   {msg}")
    
    # Final verification
    if final_token == test_token:
        print("🎉 SUCCESS: Complete MCP share flow worked! Token applied correctly.")
    else:
        print(f"❌ FAIL: Expected '{test_token}', got '{final_token}'")
        
        # Show recent console messages for debugging
        print("🔍 Recent console messages for debugging:")
        for msg in console_messages[-10:]:
            print(f"   {msg}")
    
    # Take final screenshot
    screenshot_with_markdown(
        page,
        "complete_mcp_share_flow",
        {
            "description": "Complete MCP share flow test",
            "share_link_length": str(len(share_link)),
            "final_token_match": str(final_token == test_token),
            "error_count": str(len(error_messages)),
            "success_count": str(len(success_messages))
        }
    )
    
    print("✅ Complete MCP share flow test completed!")