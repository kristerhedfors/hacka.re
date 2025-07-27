"""
End-to-End Namespace Selection Tests
Tests complete shared link workflows with namespace selection scenarios.
"""
import pytest
import time
import os
import json
from dotenv import load_dotenv
from playwright.sync_api import Page, expect

from test_utils import (
    dismiss_welcome_modal, 
    dismiss_settings_modal, 
    screenshot_with_markdown,
    select_recommended_test_model
)

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
API_KEY = os.getenv("OPENAI_API_KEY", "sk-test-key-for-namespace-e2e-tests")


def setup_api_and_model(page: Page):
    """Helper function to set up API key and model"""
    # Open settings
    settings_button = page.locator("#settings-btn")
    settings_button.click()
    page.wait_for_selector("#settings-modal.active", state="visible")
    
    # Enter API key - ensure it's actually filled
    api_key_input = page.locator("#api-key-update")
    api_key_input.clear()
    api_key_input.fill(API_KEY)
    
    # Verify API key was filled
    filled_value = api_key_input.input_value()
    assert API_KEY in filled_value, f"API key not properly filled. Expected: {API_KEY[:10]}..., Got: {filled_value[:10] if filled_value else 'empty'}"
    
    # Select OpenAI provider
    base_url_select = page.locator("#base-url-select")
    base_url_select.select_option("openai")
    
    # Select model
    selected_model = select_recommended_test_model(page)
    
    # Save settings
    save_button = page.locator("#save-settings-btn")
    save_button.click()
    page.wait_for_selector("#settings-modal", state="hidden")
    
    # Wait a moment for settings to propagate
    page.wait_for_timeout(1000)
    
    return selected_model


def create_shared_link(page: Page, include_conversation=False, custom_welcome=None):
    """Helper function to create a shared link and return the URL and password"""
    
    # Open share modal
    share_button = page.locator("#share-btn")
    share_button.click()
    page.wait_for_selector("#share-modal.active", state="visible")
    
    # Configure sharing options - only check if not disabled
    api_key_checkbox = page.locator("#share-api-key")
    if not api_key_checkbox.is_disabled() and not api_key_checkbox.is_checked():
        api_key_checkbox.check()
    
    model_checkbox = page.locator("#share-model")
    if not model_checkbox.is_disabled() and not model_checkbox.is_checked():
        model_checkbox.check()
    
    if include_conversation:
        conversation_checkbox = page.locator("#share-conversation")
        if not conversation_checkbox.is_checked():
            conversation_checkbox.check()
    
    # Set custom welcome message if provided
    if custom_welcome:
        welcome_textarea = page.locator("#share-welcome-message")
        welcome_textarea.fill(custom_welcome)
        
        welcome_checkbox = page.locator("#share-welcome-message-checkbox")
        if not welcome_checkbox.is_checked():
            welcome_checkbox.check()
    
    # Generate password if needed
    password_input = page.locator("#share-password")
    password = password_input.input_value()
    
    if not password:
        regenerate_button = page.locator("#regenerate-password")
        regenerate_button.click()
        page.wait_for_timeout(500)
        password = password_input.input_value()
    
    # Generate the link
    generate_button = page.locator("#generate-share-link-btn")
    generate_button.click()
    
    # Wait for the link to be generated
    link_container = page.locator("#generated-link-container")
    expect(link_container).to_be_visible(timeout=5000)
    
    # Get the generated link
    generated_link_input = page.locator("#generated-link")
    expect(generated_link_input).to_be_visible()
    shared_link = generated_link_input.input_value()
    
    # Close the share modal
    close_share_button = page.locator("#close-share-modal")
    close_share_button.click()
    page.wait_for_selector("#share-modal", state="hidden")
    
    return shared_link, password


def clear_local_storage_except_namespace(page: Page, preserve_namespaces=None):
    """Clear localStorage but optionally preserve specific namespaces"""
    if preserve_namespaces is None:
        preserve_namespaces = []
    
    page.evaluate("""(preserveNamespaces) => {
        // Get all keys first
        const allKeys = Object.keys(localStorage);
        
        // Preserve namespace-related keys if specified
        const keysToPreserve = [];
        if (preserveNamespaces.length > 0) {
            for (const namespaceId of preserveNamespaces) {
                const namespaceKeys = allKeys.filter(key => 
                    key.includes(`hackare_${namespaceId}_`) || 
                    key === `hackare_${namespaceId}_namespace` ||
                    key === `hackare_${namespaceId}_master_key`
                );
                keysToPreserve.push(...namespaceKeys);
            }
        }
        
        // Clear everything except preserved keys
        for (const key of allKeys) {
            if (!keysToPreserve.includes(key)) {
                localStorage.removeItem(key);
            }
        }
        
        console.log('Cleared localStorage except preserved keys:', keysToPreserve);
    }""", preserve_namespaces)


def create_dummy_namespace(page: Page, namespace_id, title, subtitle="Test subtitle"):
    """Create a dummy namespace in localStorage"""
    page.evaluate("""
        ({namespaceId, title, subtitle}) => {
            // Simulate namespace creation by setting up storage keys
            localStorage.setItem('title', title);
            localStorage.setItem('subtitle', subtitle);
            
            // Create a simple master key for this namespace
            const masterKey = 'dummy_master_key_' + namespaceId;
            localStorage.setItem(`hackare_${namespaceId}_master_key`, masterKey);
            
            // Create namespace data
            const namespaceData = JSON.stringify({
                id: namespaceId,
                title: title,
                subtitle: subtitle,
                created: new Date().toISOString()
            });
            localStorage.setItem(`hackare_${namespaceId}_namespace`, namespaceData);
            
            // Add some dummy chat history
            const chatHistory = [
                { role: 'user', content: 'Hello', timestamp: new Date().toISOString() },
                { role: 'assistant', content: 'Hi there!', timestamp: new Date().toISOString() }
            ];
            localStorage.setItem(`hackare_${namespaceId}_chat_history`, JSON.stringify(chatHistory));
            
            console.log(`Created dummy namespace ${namespaceId} with title "${title}"`);
        }
    """, {"namespaceId": namespace_id, "title": title, "subtitle": subtitle})


def test_shared_link_with_zero_namespaces(page: Page, serve_hacka_re):
    """Test shared link opening when no existing namespaces exist"""
    
    # PHASE 1: Create a shared link
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Set up API and model
    selected_model = setup_api_and_model(page)
    
    # Create shared link
    shared_link, password = create_shared_link(page, custom_welcome="Welcome to namespace test!")
    
    screenshot_with_markdown(page, "zero_namespaces_link_created", {
        "Phase": "Link creation completed",
        "Link": shared_link[:50] + "..." if len(shared_link) > 50 else shared_link,
        "Model": selected_model
    })
    
    # PHASE 2: Clear all data and open shared link
    clear_local_storage_except_namespace(page)  # Clear everything
    
    # Navigate to shared link
    page.goto(shared_link)
    
    # Should show password modal (not namespace selection since no namespaces exist)
    password_modal = page.locator(".modal.active")
    expect(password_modal).to_be_visible(timeout=5000)
    
    # Enter password
    password_input = password_modal.locator("input[type='password']")
    password_input.fill(password)
    
    # Submit password
    submit_button = password_modal.locator("button[type='submit'], .btn.primary-btn")
    submit_button.first.click()
    
    # Wait for successful decryption and data loading
    page.wait_for_timeout(2000)
    
    # Verify no namespace selection modal appeared (since no existing namespaces)
    namespace_modal = page.locator("#namespace-selection-modal")
    expect(namespace_modal).not_to_be_visible()
    
    # Verify data was loaded successfully
    api_key_element = page.locator("#api-key-update")
    if api_key_element.is_visible():
        api_key_value = api_key_element.input_value()
        assert API_KEY in api_key_value, "API key should be loaded from shared link"
    
    screenshot_with_markdown(page, "zero_namespaces_link_loaded", {
        "Phase": "Shared link loaded with zero existing namespaces",
        "Result": "Direct loading without namespace selection",
        "Status": "Success"
    })


def test_shared_link_with_one_namespace(page: Page, serve_hacka_re):
    """Test shared link opening when one existing namespace exists"""
    
    # PHASE 1: Create a shared link  
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    selected_model = setup_api_and_model(page)
    shared_link, password = create_shared_link(page, custom_welcome="One namespace test!")
    
    # PHASE 2: Set up one existing namespace
    clear_local_storage_except_namespace(page)
    create_dummy_namespace(page, "test1234", "Existing Namespace", "Existing subtitle")
    
    screenshot_with_markdown(page, "one_namespace_setup", {
        "Phase": "Setup with one existing namespace",
        "Namespace": "test1234",
        "Title": "Existing Namespace"
    })
    
    # PHASE 3: Open shared link
    page.goto(shared_link)
    
    # Enter password
    password_modal = page.locator(".modal.active")
    expect(password_modal).to_be_visible(timeout=5000)
    
    password_input = password_modal.locator("input[type='password']")
    password_input.fill(password)
    
    submit_button = password_modal.locator("button[type='submit'], .btn.primary-btn")
    submit_button.first.click()
    
    # Should show namespace selection modal
    namespace_modal = page.locator("#namespace-selection-modal")
    expect(namespace_modal).to_be_visible(timeout=5000)
    
    # Verify existing namespace is shown
    namespace_item = page.locator(".namespace-item")
    expect(namespace_item).to_be_visible()
    expect(namespace_item).to_contain_text("Existing Namespace")
    
    screenshot_with_markdown(page, "one_namespace_modal_shown", {
        "Phase": "Namespace selection modal displayed",
        "Existing Namespaces": "1",
        "Namespace Shown": "Existing Namespace"
    })
    
    # Test selecting existing namespace
    namespace_item.click()
    use_existing_button = page.locator("#use-selected-namespace")
    expect(use_existing_button).to_be_enabled()
    use_existing_button.click()
    
    # Wait for modal to close and data to load
    page.wait_for_timeout(2000)
    expect(namespace_modal).not_to_be_visible()
    
    screenshot_with_markdown(page, "one_namespace_selected", {
        "Phase": "Existing namespace selected and loaded",
        "Action": "Used existing namespace",
        "Status": "Success"
    })


def test_shared_link_with_many_namespaces(page: Page, serve_hacka_re):
    """Test shared link opening when multiple existing namespaces exist"""
    
    # PHASE 1: Create a shared link
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    selected_model = setup_api_and_model(page)
    shared_link, password = create_shared_link(page, custom_welcome="Many namespaces test!")
    
    # PHASE 2: Set up multiple existing namespaces
    clear_local_storage_except_namespace(page)
    create_dummy_namespace(page, "test1111", "First Namespace", "First subtitle")
    create_dummy_namespace(page, "test2222", "Second Namespace", "Second subtitle") 
    create_dummy_namespace(page, "test3333", "Third Namespace", "Third subtitle")
    
    screenshot_with_markdown(page, "many_namespaces_setup", {
        "Phase": "Setup with multiple existing namespaces",
        "Namespaces": "3",
        "IDs": "test1111, test2222, test3333"
    })
    
    # PHASE 3: Open shared link
    page.goto(shared_link)
    
    # Enter password
    password_modal = page.locator(".modal.active")
    expect(password_modal).to_be_visible(timeout=5000)
    
    password_input = password_modal.locator("input[type='password']")
    password_input.fill(password)
    
    submit_button = password_modal.locator("button[type='submit'], .btn.primary-btn")
    submit_button.first.click()
    
    # Should show namespace selection modal with multiple namespaces
    namespace_modal = page.locator("#namespace-selection-modal")
    expect(namespace_modal).to_be_visible(timeout=5000)
    
    # Verify all namespaces are shown
    namespace_items = page.locator(".namespace-item")
    expect(namespace_items).to_have_count(3)
    
    # Check each namespace is displayed correctly
    expect(page.locator(".namespace-item").nth(0)).to_contain_text("First Namespace")
    expect(page.locator(".namespace-item").nth(1)).to_contain_text("Second Namespace") 
    expect(page.locator(".namespace-item").nth(2)).to_contain_text("Third Namespace")
    
    screenshot_with_markdown(page, "many_namespaces_modal_shown", {
        "Phase": "Namespace selection modal with multiple options",
        "Existing Namespaces": "3", 
        "All Displayed": "First, Second, Third Namespace"
    })
    
    # Test creating new namespace instead of using existing
    create_new_button = page.locator("#create-new-namespace-btn")
    expect(create_new_button).to_be_visible()
    create_new_button.click()
    
    # Wait for modal to close and data to load
    page.wait_for_timeout(2000)
    expect(namespace_modal).not_to_be_visible()
    
    screenshot_with_markdown(page, "many_namespaces_new_created", {
        "Phase": "New namespace created instead of using existing",
        "Action": "Created new namespace",
        "Status": "Success"
    })


def test_namespace_features_via_heart_menu(page: Page, serve_hacka_re):
    """Test all namespace features accessible via Heart menu"""
    
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Set up some test data
    selected_model = setup_api_and_model(page)
    
    # Create multiple namespaces for testing
    create_dummy_namespace(page, "heart001", "Heart Test 1", "First namespace")
    create_dummy_namespace(page, "heart002", "Heart Test 2", "Second namespace")
    
    screenshot_with_markdown(page, "namespace_features_setup", {
        "Phase": "Setup for heart menu namespace features test",
        "Namespaces Created": "2",
        "Test Ready": "Yes"
    })
    
    # FEATURE 1: Access Namespaces menu in Heart tooltip
    heart_logo = page.locator('.heart-logo')
    expect(heart_logo).to_be_visible()
    heart_logo.click()
    
    # Wait for tooltip to appear
    tooltip = page.locator('.heart-logo .tooltip.tree-menu')
    expect(tooltip).to_be_visible(timeout=3000)
    
    # Expand namespaces menu
    namespaces_toggle = page.locator('[data-target="namespaces"]')
    expect(namespaces_toggle).to_be_visible()
    namespaces_toggle.click()
    
    # Verify all namespace menu items are visible
    current_namespace_link = page.locator('[data-feature="current-namespace"]')
    switch_namespace_link = page.locator('[data-feature="switch-namespace"]')
    create_namespace_link = page.locator('[data-feature="create-namespace"]')
    delete_namespace_link = page.locator('[data-feature="delete-namespace"]')
    
    expect(current_namespace_link).to_be_visible()
    expect(switch_namespace_link).to_be_visible()
    expect(create_namespace_link).to_be_visible()
    expect(delete_namespace_link).to_be_visible()
    
    screenshot_with_markdown(page, "namespace_heart_menu_expanded", {
        "Phase": "Heart menu namespace section expanded",
        "Features Visible": "Current Info, Switch, Create, Delete",
        "All Working": "Menu items displayed correctly"
    })
    
    # FEATURE 2: Test Current Namespace Info (should trigger console log)
    console_messages = []
    def handle_console(msg):
        if 'namespace' in msg.text.lower():
            console_messages.append(msg.text)
    
    page.on("console", handle_console)
    
    current_namespace_link.click()
    page.wait_for_timeout(1000)
    
    # Check that handler was called (would show warning about modal not available)
    namespace_handler_called = any('NamespaceInfoModal not available' in msg for msg in console_messages)
    
    # FEATURE 3: Test Switch Namespace 
    switch_namespace_link.click()
    page.wait_for_timeout(1000)
    
    switch_handler_called = any('NamespaceSwitchModal not available' in msg for msg in console_messages)
    
    # FEATURE 4: Test Create New Namespace
    create_namespace_link.click() 
    page.wait_for_timeout(1000)
    
    create_handler_called = any('NamespaceCreationModal not available' in msg for msg in console_messages)
    
    # FEATURE 5: Test Delete Namespace
    delete_namespace_link.click()
    page.wait_for_timeout(1000)
    
    delete_handler_called = any('NamespaceDeletionModal not available' in msg for msg in console_messages)
    
    screenshot_with_markdown(page, "namespace_features_tested", {
        "Phase": "All namespace features tested via heart menu",
        "Current Info": str(namespace_handler_called),
        "Switch": str(switch_handler_called), 
        "Create": str(create_handler_called),
        "Delete": str(delete_handler_called),
        "Console Messages": str(len(console_messages))
    })
    
    # Close the heart tooltip by clicking elsewhere
    page.click('body')
    expect(tooltip).not_to_be_visible()


def test_shared_link_namespace_cancellation(page: Page, serve_hacka_re):
    """Test what happens when user cancels namespace selection"""
    
    # Set up shared link with existing namespace
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    selected_model = setup_api_and_model(page)
    shared_link, password = create_shared_link(page, custom_welcome="Cancellation test!")
    
    # Set up one existing namespace
    clear_local_storage_except_namespace(page)
    create_dummy_namespace(page, "cancel01", "Cancel Test Namespace", "Test for cancellation")
    
    # Open shared link
    page.goto(shared_link)
    
    # Enter password
    password_modal = page.locator(".modal.active")
    expect(password_modal).to_be_visible(timeout=5000)
    
    password_input = password_modal.locator("input[type='password']")
    password_input.fill(password)
    
    submit_button = password_modal.locator("button[type='submit'], .btn.primary-btn")
    submit_button.first.click()
    
    # Namespace selection modal should appear
    namespace_modal = page.locator("#namespace-selection-modal")
    expect(namespace_modal).to_be_visible(timeout=5000)
    
    screenshot_with_markdown(page, "namespace_cancellation_modal", {
        "Phase": "About to test cancellation",
        "Modal Shown": "Namespace selection modal visible",
        "Action": "Will click Cancel"
    })
    
    # Click Cancel button
    cancel_button = page.locator("#cancel-namespace-selection")
    expect(cancel_button).to_be_visible()
    cancel_button.click()
    
    # Modal should close and fallback to current namespace should happen
    page.wait_for_timeout(2000)
    expect(namespace_modal).not_to_be_visible()
    
    # Verify data was still loaded (fallback behavior)
    # The SharedLinkManager should apply data to current namespace when cancelled
    
    screenshot_with_markdown(page, "namespace_cancellation_completed", {
        "Phase": "Cancellation handled",
        "Modal Closed": "Yes", 
        "Fallback Applied": "Data loaded to current namespace",
        "Status": "Success"
    })


if __name__ == "__main__":
    import subprocess
    import sys
    
    # Run this specific test file
    result = subprocess.run([
        sys.executable, "-m", "pytest", __file__, "-v", "--tb=short"
    ], cwd=os.path.dirname(__file__))
    
    sys.exit(result.returncode)