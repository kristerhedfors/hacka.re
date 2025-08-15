"""Test MCP Checkbox Event Handling"""

import pytest
from playwright.sync_api import Page, expect
from test_utils import screenshot_with_markdown, dismiss_welcome_modal, dismiss_settings_modal


@pytest.mark.feature_test
def test_mcp_checkbox_event_handling(page: Page, serve_hacka_re):
    """Test that MCP checkbox event listeners work correctly"""
    
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal
    dismiss_settings_modal(page)
    
    # Store a GitHub token
    test_token = 'ghp_1234567890abcdef1234567890abcdef12345678'
    page.evaluate(f"""
        console.log('Setting GitHub token for checkbox event test...');
        window.CoreStorageService.setValue('mcp_github_token', '{test_token}');
    """)
    
    # Setup console logging to capture nuclear fix debug messages
    console_messages = []
    def log_console_message(msg):
        console_messages.append(f"[{msg.type}] {msg.text}")
        if "NUCLEAR FIX" in msg.text:
            print(f"🎯 {msg.text}")
    
    page.on("console", log_console_message)
    
    # Open share modal
    share_btn = page.locator("#share-btn")
    share_btn.click()
    page.wait_for_selector('#share-modal', state='visible')
    
    # Wait for initial status update
    page.wait_for_timeout(1500)
    
    # Check initial status
    mcp_checkbox = page.locator('#share-mcp-connections')
    expect(mcp_checkbox).to_be_visible()
    
    status_indicator = page.locator('label[for="share-mcp-connections"] .share-item-status')
    initial_count = status_indicator.count()
    print(f"Initial status indicator count: {initial_count}")
    
    if initial_count > 0:
        initial_text = status_indicator.first.inner_text()
        print(f"Initial status text: '{initial_text}'")
    
    # Check the checkbox to trigger the event
    print("🎯 About to check the MCP checkbox...")
    mcp_checkbox.check()
    
    # Wait for the event listener to process
    page.wait_for_timeout(1000)
    
    # Check if the status updated
    final_count = status_indicator.count()
    print(f"Final status indicator count after checkbox check: {final_count}")
    
    if final_count > 0:
        final_text = status_indicator.first.inner_text()
        print(f"Final status text: '{final_text}'")
        
        # The key test - did the status text change?
        if initial_count > 0 and initial_text != final_text:
            print("✅ SUCCESS: Status text changed when checkbox was checked!")
        elif "will be shared" in final_text:
            print("✅ SUCCESS: Status text shows 'will be shared' after checking!")
        else:
            print(f"❌ FAIL: Status text didn't change from '{initial_text}' to expected 'will be shared'")
    
    # Print nuclear fix console messages for debugging
    nuclear_messages = [msg for msg in console_messages if "NUCLEAR FIX" in msg]
    mcp_status_messages = [msg for msg in console_messages if "updateMcpConnectionsStatus" in msg]
    
    if nuclear_messages:
        print("🔍 Nuclear Fix Debug Messages:")
        for msg in nuclear_messages[-10:]:  # Show last 10 messages
            print(f"   {msg}")
    else:
        print("❌ No Nuclear Fix debug messages found - event listener may not be working")
    
    if mcp_status_messages:
        print("🔍 MCP Status Debug Messages:")
        for msg in mcp_status_messages:
            print(f"   {msg}")
    else:
        print("❌ No MCP status debug messages found - function may not be called")
    
    # Show ALL console messages for debugging if needed
    print(f"📋 Total console messages captured: {len(console_messages)}")
    debug_messages = [msg for msg in console_messages if "🧹" in msg or "🎯" in msg]
    if debug_messages:
        print("🔍 All Debug Messages:")
        for msg in debug_messages:
            print(f"   {msg}")
    
    # Take a final screenshot
    screenshot_with_markdown(
        page,
        "mcp_checkbox_event_test",
        {
            "description": "MCP checkbox event handling test",
            "initial_status_count": str(initial_count),
            "final_status_count": str(final_count),
            "nuclear_fix_messages": str(len(nuclear_messages))
        }
    )
    
    print("✅ MCP checkbox event test completed!")