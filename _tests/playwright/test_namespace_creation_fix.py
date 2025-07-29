"""
Test namespace creation functionality to ensure it doesn't result in blank pages
"""

import pytest
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown
import time


def test_namespace_creation_works(page: Page, serve_hacka_re):
    """Test that creating a new namespace works properly and doesn't result in blank page"""
    
    # Set up console logging to capture errors
    console_messages = []
    def log_console(msg):
        console_messages.append(f"{msg.type}: {msg.text}")
        print(f"Console {msg.type}: {msg.text}")
    
    page.on("console", log_console)
    
    # Navigate to application
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    screenshot_with_markdown(page, "before_namespace_creation", {
        "Phase": "Initial page load",
        "Status": "Ready to test namespace creation"
    })
    
    # Open heart menu to access namespaces
    heart_logo = page.locator('.heart-logo')
    expect(heart_logo).to_be_visible()
    
    # Click on heart logo to trigger the tooltip (try click instead of hover)
    heart_logo.click()
    page.wait_for_timeout(1000)  # Wait for tooltip to appear
    
    # Alternative: use force click if needed
    try:
        # Look for Namespaces submenu toggle
        namespaces_toggle = page.locator('[data-target="namespaces"]')
        page.wait_for_selector('[data-target="namespaces"]', state="attached", timeout=3000)
        
        # Click to expand namespaces submenu
        namespaces_toggle.click(force=True)
        page.wait_for_timeout(500)
        
        # Verify the submenu items are now visible
        page.wait_for_selector('[data-feature="create-namespace"]', state="visible", timeout=3000)
        
        # Find and click "Create New Namespace"
        create_namespace_link = page.locator('[data-feature="create-namespace"]')
        expect(create_namespace_link).to_be_visible()
    except Exception as e:
        # Debug: Take screenshot and get page content
        screenshot_with_markdown(page, "namespace_debug", {
            "Error": str(e),
            "Heart logo visible": str(heart_logo.is_visible()),
            "Page title": page.title()
        })
        
        # Try to find all elements with tree-toggle class
        all_toggles = page.locator('.tree-toggle').all()
        print(f"Found {len(all_toggles)} tree toggles")
        for i, toggle in enumerate(all_toggles):
            try:
                print(f"Toggle {i}: {toggle.text_content()}")
            except:
                print(f"Toggle {i}: could not get text")
        
        raise
    
    screenshot_with_markdown(page, "namespace_menu_expanded", {
        "Phase": "Namespace menu expanded",
        "Status": "About to click create namespace"
    })
    
    # Set up dialog handler to accept the confirmation
    dialog_messages = []
    def handle_dialog(dialog):
        dialog_messages.append(dialog.message)
        print(f"Dialog message: {dialog.message}")
        dialog.accept()
    
    page.on("dialog", handle_dialog)
    
    # Click create new namespace
    create_namespace_link.click()
    
    # Wait for dialog and page reload
    page.wait_for_timeout(3000)
    
    # Verify dialogs appeared
    assert len(dialog_messages) >= 1, "Expected at least one dialog did not appear"
    
    # First dialog should be confirmation
    assert "Create new namespace" in dialog_messages[0], f"Unexpected first dialog: {dialog_messages[0]}"
    
    # If there's a second dialog, it should be success message
    if len(dialog_messages) > 1:
        assert "created successfully" in dialog_messages[1] or "Reloading" in dialog_messages[1], f"Unexpected second dialog: {dialog_messages[1]}"
    
    # Wait for page to reload and initialize
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)  # Additional wait for initialization
    
    screenshot_with_markdown(page, "after_namespace_creation", {
        "Phase": "After namespace creation and reload",
        "Status": "Checking if page loaded properly",
        "URL": page.url
    })
    
    # Verify page is not blank - check for key UI elements
    chat_container = page.locator('#chat-container')
    expect(chat_container).to_be_visible(timeout=5000)
    
    chat_input = page.locator('#chat-input')
    expect(chat_input).to_be_visible()
    
    # Verify settings button exists
    settings_btn = page.locator('#settings-btn')
    expect(settings_btn).to_be_visible()
    
    # Check that we have a functioning namespace by checking localStorage
    namespace_data = page.evaluate("""
        () => {
            const keys = Object.keys(localStorage);
            const namespaceKeys = keys.filter(key => key.includes('_namespace'));
            const masterKeys = keys.filter(key => key.includes('_master_key'));
            
            return {
                hasNamespaceKeys: namespaceKeys.length > 0,
                hasMasterKeys: masterKeys.length > 0,
                namespaceKeys: namespaceKeys,
                masterKeys: masterKeys,
                totalKeys: keys.length
            };
        }
    """)
    
    print(f"Namespace data after creation: {namespace_data}")
    
    # Verify we have namespace-related keys
    assert namespace_data['hasNamespaceKeys'], "No namespace keys found in localStorage"
    assert namespace_data['hasMasterKeys'], "No master keys found in localStorage"
    assert namespace_data['totalKeys'] > 0, "localStorage appears to be empty"
    
    screenshot_with_markdown(page, "namespace_creation_verified", {
        "Phase": "Verification complete",
        "Status": "New namespace created successfully",
        "Namespace Keys": str(namespace_data['namespaceKeys']),
        "Master Keys": str(namespace_data['masterKeys']),
        "Total Keys": str(namespace_data['totalKeys'])
    })
    
    print("✅ Namespace creation test passed - page loaded correctly with new namespace")


def test_namespace_current_info_display(page: Page, serve_hacka_re):
    """Test that current namespace info displays correctly"""
    
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Open heart menu and namespaces
    heart_logo = page.locator('.heart-logo')
    heart_logo.hover()
    page.wait_for_timeout(500)
    
    namespaces_toggle = page.locator('[data-target="namespaces"]')
    
    # The toggle should be visible, but force the visibility if needed
    page.wait_for_selector('[data-target="namespaces"]', state="attached")
    
    # Click to expand namespaces submenu
    namespaces_toggle.click()
    page.wait_for_timeout(500)
    
    # Verify the submenu items are now visible
    page.wait_for_selector('[data-feature="current-namespace"]', state="visible")
    
    # Set up alert handler
    alert_message = None
    def handle_alert(dialog):
        nonlocal alert_message
        alert_message = dialog.message
        print(f"Alert message: {dialog.message}")
        dialog.accept()
    
    page.on("dialog", handle_alert)
    
    # Click "Current Namespace Info"
    current_info_link = page.locator('[data-feature="current-namespace"]')
    current_info_link.click()
    
    page.wait_for_timeout(1000)
    
    # Verify alert appeared with namespace info
    assert alert_message is not None, "Expected namespace info alert did not appear"
    assert "Current Namespace:" in alert_message, f"Unexpected alert message: {alert_message}"
    
    print(f"✅ Current namespace info displayed: {alert_message}")


if __name__ == "__main__":
    # Run with: python test_namespace_creation_fix.py
    pytest.main([__file__, "-v", "-s"])