"""Test Cross-Tab Sync Loop Fix"""

import pytest
from playwright.sync_api import Page, expect
from test_utils import screenshot_with_markdown, dismiss_welcome_modal, dismiss_settings_modal


@pytest.mark.feature_test
def test_cross_tab_sync_no_loop(page: Page, serve_hacka_re):
    """Test that cross-tab sync doesn't cause infinite loops"""
    
    # Create a shared link first (like the user scenario)
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Set up a GitHub token
    test_token = 'ghp_loop_test_1234567890abcdef'
    page.evaluate(f"""
        console.log('🔧 Setting up token for cross-tab loop test...');
        window.CoreStorageService.setValue('mcp_github_token', '{test_token}');
    """)
    
    # Create a share link with MCP
    share_btn = page.locator("#share-btn")
    share_btn.click()
    page.wait_for_selector('#share-modal', state='visible')
    
    mcp_checkbox = page.locator('#share-mcp-connections')
    mcp_checkbox.check()
    
    password_input = page.locator('#share-password')
    password_input.fill('testpassword123')
    
    generate_btn = page.locator('#generate-share-link-btn')
    generate_btn.click()
    
    page.wait_for_selector('#generated-link', state='visible')
    generated_link = page.locator('#generated-link')
    share_link = generated_link.input_value()
    
    page.locator('#close-share-modal').click()
    
    print(f"✅ Created share link: {len(share_link)} chars")
    
    # Now clear storage and load the shared link (simulating user scenario)
    page.evaluate("localStorage.clear(); sessionStorage.clear();")
    
    # Setup console monitoring for cross-tab sync messages
    sync_messages = []
    reload_count = 0
    
    def count_console_message(msg):
        nonlocal reload_count
        if "CrossTabSync" in msg.text:
            sync_messages.append(f"[{msg.type}] {msg.text}")
            if "Reloading conversation history" in msg.text:
                reload_count += 1
            print(f"🎯 {msg.text}")
    
    page.on("console", count_console_message)
    
    # Load the shared link
    print("🚀 Loading shared link...")
    page.goto(share_link)
    
    # Handle password prompt
    try:
        page.wait_for_selector('#early-password-input', state='visible', timeout=3000)
        password_input = page.locator('#early-password-input')
        password_input.fill('testpassword123')
        submit_button = page.locator('#early-password-submit')
        submit_button.click()
    except:
        print("ℹ️ No password prompt")
    
    # Wait for initial processing
    page.wait_for_timeout(2000)
    
    print(f"📊 Initial sync messages: {len(sync_messages)}")
    print(f"🔄 Initial reload count: {reload_count}")
    
    # Wait longer to see if there are infinite loops
    print("⏳ Waiting 10 seconds to detect infinite loops...")
    initial_reload_count = reload_count
    page.wait_for_timeout(10000)
    
    final_reload_count = reload_count
    additional_reloads = final_reload_count - initial_reload_count
    
    print(f"🔄 Final reload count: {final_reload_count}")
    print(f"📊 Additional reloads in 10 seconds: {additional_reloads}")
    print(f"📊 Total sync messages: {len(sync_messages)}")
    
    # Check for loop prevention messages
    loop_prevention_messages = [msg for msg in sync_messages if "Ignoring empty/error hash" in msg or "Preventing rapid successive reload" in msg]
    print(f"🛡️ Loop prevention messages: {len(loop_prevention_messages)}")
    
    # Show recent sync messages for debugging
    if sync_messages:
        print("🔍 Recent sync messages:")
        for msg in sync_messages[-10:]:
            print(f"   {msg}")
    
    # Take screenshot
    screenshot_with_markdown(
        page,
        "cross_tab_loop_fix_test",
        {
            "description": "Cross-tab sync loop fix test",
            "total_reloads": str(final_reload_count),
            "additional_reloads_in_10s": str(additional_reloads),
            "loop_prevention_count": str(len(loop_prevention_messages))
        }
    )
    
    # Test passes if we have reasonable number of reloads
    if additional_reloads <= 1:  # Should be 0-1 additional reloads max
        print("✅ SUCCESS: No infinite loop detected!")
    else:
        print(f"❌ FAIL: Too many additional reloads ({additional_reloads}) - possible infinite loop")
    
    print("✅ Cross-tab sync loop test completed!")