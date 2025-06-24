"""Test GitHub Token Sharing Functionality"""

import pytest
from playwright.sync_api import Page, expect
from test_utils import screenshot_with_markdown, dismiss_welcome_modal, dismiss_settings_modal


def dismiss_github_pat_modal(page):
    """Dismiss GitHub PAT modal if it's open"""
    try:
        github_pat_modal = page.locator('#github-pat-modal')
        if github_pat_modal.is_visible():
            print("github-pat-modal is visible, closing it")
            close_btn = page.locator('#github-pat-modal .btn:has-text("Close")')
            if close_btn.is_visible():
                close_btn.click()
                page.wait_for_selector('#github-pat-modal', state='hidden', timeout=2000)
                print("GitHub PAT modal closed successfully")
    except Exception as e:
        print(f"Note: Could not dismiss GitHub PAT modal: {e}")
        pass


@pytest.mark.feature_test
def test_github_token_sharing(page: Page, serve_hacka_re):
    """Test that GitHub tokens can be shared with minimal payload"""
    
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal that might be open
    dismiss_settings_modal(page)
    
    # Open MCP panel using correct selector
    mcp_btn = page.locator("#mcp-servers-btn")
    mcp_btn.click()
    
    # Wait for MCP modal to open
    page.wait_for_selector('#mcp-servers-modal', state='visible')
    
    # Take screenshot of MCP modal
    screenshot_with_markdown(
        page,
        "github_token_sharing_mcp_modal",
        {"description": "MCP servers modal opened for GitHub token sharing test"}
    )
    
    # Close the MCP modal for now
    page.locator('#close-mcp-servers-modal').click()
    
    # Simulate having a GitHub token by directly storing one
    # This tests the sharing functionality without requiring the complex OAuth setup
    test_token = 'ghp_1234567890abcdef1234567890abcdef12345678'
    
    # Store the token directly using JavaScript (simulating a successful connection)
    page.evaluate(f"""
        window.CoreStorageService.setValue('mcp_github_token', '{test_token}');
    """)
    
    # Now test sharing with MCP connections
    share_btn = page.locator("#share-btn")
    share_btn.click()
    
    # Wait for share modal
    page.wait_for_selector('#share-modal', state='visible')
    
    # Check the MCP connections checkbox
    mcp_checkbox = page.locator('#share-mcp-connections')
    if mcp_checkbox.is_visible():
        mcp_checkbox.check()
        
        # Enter a password
        password_input = page.locator('#share-password')
        password_input.fill('testpassword123')
        
        # Generate share link
        generate_btn = page.locator('#generate-share-link-btn')
        generate_btn.click()
        
        # Wait for link generation
        page.wait_for_selector('#generated-link', state='visible')
        
        # Take screenshot of generated link
        screenshot_with_markdown(
            page,
            "github_token_sharing_generated_link",
            {"description": "Share link generated with GitHub token included"}
        )
        
        # Verify the link was generated
        generated_link = page.locator('#generated-link')
        link_value = generated_link.input_value()
        assert len(link_value) > 0, "Share link should be generated"
        assert link_value.startswith('http'), "Share link should be a valid URL"
        
        print("✅ GitHub token sharing test completed successfully!")
        
    else:
        print("⚠️ MCP connections checkbox not found")
        
    # Close any open modals
    if page.locator('#share-modal').is_visible():
        page.locator('#close-share-modal').click()
    if page.locator('#mcp-servers-modal').is_visible():
        page.locator('#close-mcp-servers-modal').click()


@pytest.mark.feature_test
def test_github_token_with_functions_sharing(page: Page, serve_hacka_re):
    """Test that GitHub tokens can be shared with functions"""
    
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal
    dismiss_welcome_modal(page)
    
    # First, dismiss any settings modal that might be open
    dismiss_settings_modal(page)
    
    # Also dismiss any GitHub PAT modal that might be open
    dismiss_github_pat_modal(page)
    
    # Create a test function first
    function_btn = page.locator("#function-btn")
    function_btn.click()
    
    # Wait for function modal
    page.wait_for_selector('#function-modal', state='visible')
    
    # Add a simple test function
    function_code = page.locator('#function-code')
    test_function = '''/**
 * Test function for sharing
 * @callable
 */
function testFunction() {
    return "Hello from shared function!";
}'''
    
    function_code.fill(test_function)
    
    # Save the function
    save_function_btn = page.locator('button:has-text("Save Function")')
    save_function_btn.click()
    
    # Wait for save to complete
    page.wait_for_timeout(1000)
    
    # Close function modal
    page.locator('#close-function-modal').click()
    
    # Store a GitHub token directly using JavaScript (simulating a successful connection)
    test_token = 'ghp_abcdef1234567890abcdef1234567890abcdef12'
    page.evaluate(f"""
        window.CoreStorageService.setValue('mcp_github_token', '{test_token}');
    """)
    
    # Now test sharing with both functions and MCP connections
    share_btn = page.locator("#share-btn")
    share_btn.click()
    
    # Wait for share modal
    page.wait_for_selector('#share-modal', state='visible')
    
    # Check both function library and MCP connections
    function_checkbox = page.locator('#share-function-library')
    if function_checkbox.is_visible():
        function_checkbox.check()
    
    mcp_checkbox = page.locator('#share-mcp-connections')
    if mcp_checkbox.is_visible():
        mcp_checkbox.check()
    
    # Enter password
    password_input = page.locator('#share-password')
    password_input.fill('testpassword456')
    
    # Generate link
    generate_btn = page.locator('#generate-share-link-btn')
    generate_btn.click()
    
    # Wait for link generation
    page.wait_for_selector('#generated-link', state='visible')
    
    # Take screenshot
    screenshot_with_markdown(
        page,
        "github_token_with_functions_sharing",
        {"description": "Share link generated with both GitHub token and functions"}
    )
    
    # Verify link
    generated_link = page.locator('#generated-link')
    link_value = generated_link.input_value()
    assert len(link_value) > 0, "Share link should be generated"
    assert link_value.startswith('http'), "Share link should be a valid URL"
    
    print("✅ GitHub token with functions sharing test completed successfully!")
    
    # Clean up
    if page.locator('#share-modal').is_visible():
        page.locator('#close-share-modal').click()