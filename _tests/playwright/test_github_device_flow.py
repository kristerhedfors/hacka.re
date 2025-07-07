"""Test GitHub OAuth Device Flow in MCP Quick Connectors"""

import pytest
from playwright.sync_api import Page, expect
import time
from test_utils import screenshot_with_markdown, dismiss_welcome_modal, dismiss_settings_modal


@pytest.mark.feature_test
def test_github_device_flow(page: Page, serve_hacka_re):
    """Test that GitHub quick connector uses Device Flow instead of redirect flow"""
    
    # Navigate to the app
    page.goto("http://localhost:8000")
    
    # Set up console event listener to capture errors
    console_messages = []
    page.on("console", lambda msg: console_messages.append(f"{msg.type}: {msg.text}"))
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Close settings modal if it's open
    dismiss_settings_modal(page)
    
    # Open MCP modal
    page.click("#mcp-servers-btn")
    
    # Wait for modal to be visible
    page.wait_for_selector('.modal-content:has-text("MCP Servers")', state='visible')
    
    # Take screenshot of MCP modal with quick connectors
    screenshot_with_markdown(
        page,
        "mcp_modal_with_quick_connectors",
        {"description": "MCP modal showing GitHub quick connector"}
    )
    
    # Find GitHub connector
    github_section = page.locator('.quick-connector-card[data-service="github"]')
    expect(github_section).to_be_visible()
    
    # Click Connect button for GitHub
    print("Clicking Connect button for GitHub...")
    github_section.locator('button:has-text("Connect")').click()
    
    # Should show setup dialog asking for Client ID
    print("Waiting for setup dialog...")
    page.wait_for_selector('#quick-connector-setup-modal', state='visible')
    
    # Take screenshot of setup dialog
    screenshot_with_markdown(
        page,
        "github_setup_dialog",
        {"description": "GitHub OAuth setup dialog"}
    )
    
    # Enter a test client ID
    print("Entering test client ID...")
    page.fill('#quick-setup-client-id', 'test_client_id_123')
    
    # Click Save & Connect
    print("Clicking Save & Connect...")
    page.click('button:has-text("Save & Connect")')
    
    # Wait a bit for the modal to close and connection to start
    page.wait_for_timeout(1000)
    
    # Wait for device flow modal to appear (should be manual due to CORS)
    try:
        print("Waiting for device flow modal...")
        page.wait_for_selector('.device-flow-modal', state='visible', timeout=2000)
        device_flow_modal = page.locator('.device-flow-modal')
        print("Device flow modal appeared!")
        
        # Check if it's the manual flow
        is_manual_flow = page.locator('.manual-device-flow').is_visible()
        print(f"Is manual flow: {is_manual_flow}")
        
        if is_manual_flow:
            print("✅ Manual device flow triggered correctly due to CORS")
        else:
            print("✅ Automatic device flow worked (unexpected but good)")
            
    except Exception as e:
        print(f"Device flow modal did not appear: {e}")
        # Take a screenshot to see what's on screen
        screenshot_with_markdown(
            page,
            "github_device_flow_error",
            {"description": "State when device flow modal failed to appear"}
        )
        # Check for any error messages
        error_messages = page.locator('.error-message, .notification-error, .status-error').all()
        for msg in error_messages:
            print(f"Error message found: {msg.text_content()}")
        
        # Print console messages
        print("\nConsole messages:")
        for msg in console_messages:
            print(msg)
        
        raise
    
    # Check if it's manual or automatic device flow
    is_manual_flow = page.locator('.manual-device-flow').is_visible()
    
    if is_manual_flow:
        # Verify manual device flow UI elements
        print("Testing manual device flow UI...")
        expect(device_flow_modal).to_contain_text('Manual GitHub Device Flow')
        expect(device_flow_modal).to_contain_text('Manual Setup Required')
        expect(device_flow_modal).to_contain_text('Due to browser security restrictions (CORS)')
        expect(device_flow_modal).to_contain_text('Step 1: Get Device Code')
        expect(device_flow_modal).to_contain_text('Step 2: Enter the Response')
        
        # Check for curl command
        curl_command = page.locator('#curl-command')
        expect(curl_command).to_be_visible()
        curl_text = curl_command.text_content()
        assert 'curl -X POST https://github.com/login/device/code' in curl_text
        assert 'test_client_id_123' in curl_text
        
        # Check for textarea
        textarea = page.locator('#device-response-input')
        expect(textarea).to_be_visible()
        
        # Take screenshot of manual device flow modal
        screenshot_with_markdown(
            page,
            "github_manual_device_flow_modal",
            {"description": "GitHub Manual Device Flow modal due to CORS restrictions"}
        )
        
    else:
        # Verify automatic device flow UI elements
        print("Testing automatic device flow UI...")
        expect(device_flow_modal).to_contain_text('GitHub Device Flow Authorization')
        expect(device_flow_modal).to_contain_text('Step 1: Copy this code')
        expect(device_flow_modal).to_contain_text('Step 2: Visit GitHub and enter the code')
        expect(device_flow_modal).to_contain_text('Step 3: Authorization Status')
        
        # Check for device code input
        device_code_input = page.locator('#device-user-code')
        expect(device_code_input).to_be_visible()
        device_code_value = device_code_input.input_value()
        
        # Device code should be in format XXXX-XXXX
        assert len(device_code_value) > 0, "Device code should not be empty"
        assert '-' in device_code_value, "Device code should contain hyphen"
        
        # Check for GitHub link
        github_link = device_flow_modal.locator('a:has-text("Open GitHub")')
        expect(github_link).to_be_visible()
        
        # Take screenshot of device flow modal
        screenshot_with_markdown(
            page,
            "github_device_flow_modal",
            {"description": f"GitHub Device Flow modal showing device code: {device_code_value}"}
        )
        
        # Verify polling status
        expect(device_flow_modal).to_contain_text('Waiting for authorization...')
        expect(device_flow_modal).to_contain_text('Server: mcp-github')
    
    # Cancel the flow
    page.click('.device-flow-modal button:has-text("Cancel")')
    
    # Modal should close
    expect(device_flow_modal).not_to_be_visible()
    
    # Verify no redirect occurred
    assert page.url == "http://localhost:8000/", "Page should not have redirected"


@pytest.mark.feature_test  
def test_github_redirect_intercept(page: Page, serve_hacka_re):
    """Test that GitHub OAuth redirects are intercepted and show device flow message"""
    
    # Navigate to the app with OAuth callback parameters (simulating redirect)
    page.goto("http://localhost:8000/?code=test_code&state=test_state:uAZq54AQ")
    
    # Wait for the GitHub device flow message modal
    device_flow_message = page.wait_for_selector('.github-device-flow-message-modal', state='visible', timeout=2000)
    
    # Verify the modal content
    expect(device_flow_message).to_contain_text('GitHub OAuth - Device Flow Required')
    expect(device_flow_message).to_contain_text('Important Notice')
    expect(device_flow_message).to_contain_text('Device Flow instead of redirect-based authorization')
    
    # Check for instructions
    expect(device_flow_message).to_contain_text('How to properly authorize with GitHub:')
    expect(device_flow_message).to_contain_text('Click the "MCP" button in the top toolbar')
    expect(device_flow_message).to_contain_text('Find your GitHub MCP server configuration')
    expect(device_flow_message).to_contain_text('Click the "Authorize" button next to it')
    
    # Take screenshot
    screenshot_with_markdown(
        page,
        "github_redirect_intercept_modal",
        {"description": "Modal shown when GitHub redirect is intercepted"}
    )
    
    # Click "Open MCP Modal" button
    page.click('button:has-text("Open MCP Modal")')
    
    # Should close the message modal and open MCP modal
    expect(device_flow_message).not_to_be_visible()
    page.wait_for_selector('.modal-content:has-text("MCP Servers")', state='visible')
    
    # Verify URL was cleaned up (no OAuth params)
    assert "code=" not in page.url, "OAuth code parameter should be removed from URL"
    assert "state=" not in page.url, "OAuth state parameter should be removed from URL"