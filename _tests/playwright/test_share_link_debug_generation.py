"""Test debug mode display when generating a share link"""
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown
import time

def test_share_link_generation_debug(page: Page, serve_hacka_re, api_key):
    """Test that debug mode shows JSON structure when generating a share link"""
    
    # Navigate to the app
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Configure API key first (needed for share link generation)
    settings_btn = page.locator("#settings-btn")
    expect(settings_btn).to_be_visible()
    settings_btn.click()
    
    # Wait for settings modal
    page.wait_for_selector("#settings-modal", state="visible")
    
    # Set API key
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill(api_key)
    
    # Enable debug mode
    debug_checkbox = page.locator("#debug-mode")
    expect(debug_checkbox).to_be_visible()
    if not debug_checkbox.is_checked():
        debug_checkbox.click()
    
    # Wait for debug categories to appear
    page.wait_for_selector(".debug-category-item", state="visible")
    
    # Enable shared-links category
    shared_links_checkbox = page.locator('#debug-category-shared-links')
    expect(shared_links_checkbox).to_be_visible()
    if not shared_links_checkbox.is_checked():
        shared_links_checkbox.click()
    
    # Close settings
    close_btn = page.locator("#close-settings")
    close_btn.click()
    page.wait_for_selector("#settings-modal", state="hidden")
    
    # Clear any existing debug messages
    page.evaluate("""
        const debugMessages = document.querySelectorAll('.debug-message');
        debugMessages.forEach(msg => msg.remove());
    """)
    
    # Now open share modal
    share_btn = page.locator("#share-btn")
    expect(share_btn).to_be_visible()
    share_btn.click()
    
    # Wait for share modal
    page.wait_for_selector("#share-modal", state="visible")
    
    # Add a welcome message (optional data to include)
    welcome_msg_input = page.locator("#share-welcome-message")
    if welcome_msg_input.is_visible():
        welcome_msg_input.fill("Test welcome message for debug display")
    
    # Set a password
    password_input = page.locator("#share-password")
    password_input.fill("testpassword123")
    
    # Click generate link
    generate_btn = page.locator("#generate-share-link-btn")
    generate_btn.click()
    
    # Wait for link to be generated
    page.wait_for_selector("#generated-link-container", state="visible", timeout=5000)
    
    # Wait for debug messages to appear
    page.wait_for_selector(".debug-message.debug-shared-links", timeout=5000)
    
    # Check that debug messages are present
    debug_messages = page.locator(".debug-message.debug-shared-links")
    expect(debug_messages.first).to_be_visible()
    
    # Get all debug message text
    debug_count = debug_messages.count()
    print(f"Found {debug_count} debug messages")
    
    # Collect all debug text
    all_debug_text = []
    for i in range(debug_count):
        text = debug_messages.nth(i).text_content()
        all_debug_text.append(text)
        if i < 10:  # Only print first 10 lines to avoid clutter
            print(f"Debug line {i}: {text[:100]}...")
    
    # Join all debug text
    full_debug_text = '\n'.join(all_debug_text)
    
    # Verify key elements are present in the debug output
    assert "SHARE LINK GENERATION - DATA STRUCTURE" in full_debug_text
    assert "timestamp" in full_debug_text
    assert "source" in full_debug_text
    assert "Share Link Generation" in full_debug_text
    assert "dataKeys" in full_debug_text
    assert "contents" in full_debug_text
    assert "statistics" in full_debug_text
    
    # If we added a welcome message, it should be in the debug output
    if welcome_msg_input.is_visible():
        assert "welcomeMessage" in full_debug_text or "welcome_message" in full_debug_text
    
    # Take screenshot
    screenshot_with_markdown(page, "share_link_generation_debug", {
        "Status": "Debug messages displayed during generation",
        "Debug Count": str(debug_count),
        "Contains JSON": "Yes" if "contents" in full_debug_text else "No",
        "Has Statistics": "Yes" if "statistics" in full_debug_text else "No"
    })
    
    # Close share modal
    close_share = page.locator("#close-share-modal")
    close_share.click()
    
    print("✅ Debug mode successfully displays share link JSON structure during generation")