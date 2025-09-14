"""Test share link password validation and error handling."""

import pytest
from playwright.sync_api import Page, expect
import time
from test_utils import dismiss_welcome_modal, screenshot_with_markdown


def test_share_link_invalid_password(page: Page, serve_hacka_re):
    """Test that invalid passwords are properly rejected with error messages."""
    
    # Navigate to the application
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Open settings and configure API
    settings_button = page.locator("#settings-btn")
    settings_button.click()
    page.wait_for_selector("#settings-modal.active", state="visible")
    
    # Set API key
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill("test-key-123")
    
    # Close settings
    page.locator("#close-settings").click()
    page.wait_for_selector("#settings-modal", state="hidden")
    
    # Open share modal
    share_btn = page.locator("#share-btn")
    share_btn.click()
    
    share_modal = page.locator("#share-modal")
    expect(share_modal).to_be_visible()
    
    # Enter password for share link
    password_input = page.locator("#share-password")
    password_input.fill("correct-password-123")
    
    # Generate share link
    generate_btn = page.locator("#generate-share-link-btn")
    generate_btn.click()
    
    # Wait for link generation
    generated_link_container = page.locator("#generated-link-container")
    expect(generated_link_container).to_be_visible()
    
    # Get the generated link
    generated_link = page.locator("#generated-link").input_value()
    assert generated_link and "#gpt=" in generated_link
    
    # Close share modal
    page.locator("#close-share-modal").click()
    
    # Create a new incognito context to test password entry
    # This ensures we don't have the password cached in session
    browser = page.context.browser
    incognito_context = browser.new_context()
    incognito_page = incognito_context.new_page()
    
    # Navigate to the shared link in incognito
    incognito_page.goto(generated_link)
    
    # Look for password input (could be early-password-input or decrypt-password)
    password_field = incognito_page.locator('#early-password-input, #decrypt-password').first
    expect(password_field).to_be_visible(timeout=5000)
    
    # CRITICAL TEST 1: Try with wrong password
    password_field.fill("wrong-password-456")
    incognito_page.keyboard.press('Enter')
    
    # Wait a moment for decryption attempt
    time.sleep(1)
    
    # Check for error message in the error div
    error_div = incognito_page.locator('#early-password-error')
    expect(error_div).to_be_visible(timeout=5000)
    error_text = error_div.text_content()
    assert "invalid password" in error_text.lower(), f"Expected 'Invalid password' error, got: {error_text}"
    
    screenshot_with_markdown(incognito_page, "invalid_password_error", {
        "Test": "Invalid password rejection",
        "Expected": "Error message visible",
        "Password": "wrong-password-456"
    })
    
    # CRITICAL TEST 2: Verify password field is still visible (not dismissed)
    # and data is NOT decrypted/loaded
    expect(password_field).to_be_visible()
    
    # The modal should still be blocking the UI, so we can't check settings directly
    # But we can verify the password field is still there waiting for correct input
    assert incognito_page.locator('#early-password-input').is_visible(), "Password field should still be visible after wrong password"
    
    # CRITICAL TEST 3: Try with correct password after failure
    password_field = incognito_page.locator('#early-password-input, #decrypt-password').first
    
    # Clear and enter correct password
    password_field.clear()
    password_field.fill("correct-password-123")
    incognito_page.keyboard.press('Enter')
    
    # Wait for successful decryption and modal dismissal
    time.sleep(3)
    
    # Password modal should be gone now
    expect(incognito_page.locator('#early-password-input')).not_to_be_visible(timeout=5000)
    
    # Now verify data IS loaded - first dismiss welcome modal if it appears
    welcome_modal = incognito_page.locator("#welcome-modal")
    if welcome_modal.is_visible():
        close_btn = incognito_page.locator("#close-welcome-modal")
        if close_btn.is_visible():
            close_btn.click()
    
    # Now check settings
    incognito_page.locator("#settings-btn").click()
    incognito_page.wait_for_selector("#settings-modal.active", state="visible")
    
    api_key_field = incognito_page.locator("#api-key-update")
    api_key_value = api_key_field.input_value()
    
    # API key should be loaded (but may be masked in UI)
    # Check that it's not empty and has content (masked keys show bullets but end with visible suffix)
    assert api_key_value != "", "API key should be loaded after correct password"
    assert len(api_key_value) > 0, "API key field should have content"
    # Masked keys often show the last few characters
    assert "-123" in api_key_value or "•" in api_key_value, f"API key should be loaded (possibly masked), got: {api_key_value}"
    
    screenshot_with_markdown(incognito_page, "correct_password_success", {
        "Test": "Correct password after failure",
        "Expected": "Data successfully loaded",
        "API Key Loaded": "Yes"
    })
    
    # Clean up
    incognito_context.close()


def test_share_link_empty_password(page: Page, serve_hacka_re):
    """Test that empty passwords are properly handled."""
    
    # Navigate to the application
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Create a share link with password
    page.locator("#settings-btn").click()
    page.wait_for_selector("#settings-modal.active", state="visible")
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill("test-key-789")
    page.locator("#close-settings").click()
    
    # Generate share link
    page.locator("#share-btn").click()
    password_input = page.locator("#share-password")
    password_input.fill("test-password")
    page.locator("#generate-share-link-btn").click()
    
    generated_link_container = page.locator("#generated-link-container")
    expect(generated_link_container).to_be_visible()
    generated_link = page.locator("#generated-link").input_value()
    
    page.locator("#close-share-modal").click()
    
    # Navigate to shared link in incognito to ensure password prompt
    browser = page.context.browser
    incognito_context = browser.new_context()
    incognito_page = incognito_context.new_page()
    incognito_page.goto(generated_link)
    
    password_field = incognito_page.locator('#early-password-input, #decrypt-password').first
    expect(password_field).to_be_visible(timeout=5000)
    
    # Try submitting empty password
    password_field.fill("")
    incognito_page.keyboard.press('Enter')
    
    time.sleep(1)
    
    # Should show error for empty password or keep field visible
    error_div = incognito_page.locator('#early-password-error')
    password_still_visible = password_field.is_visible()
    
    assert error_div.is_visible() or password_still_visible, "Should show error or keep password field visible for empty password"
    
    # Password field should still be there - data NOT loaded
    assert incognito_page.locator('#early-password-input').is_visible(), "Password field should still be visible with empty password"
    
    # Clean up
    incognito_context.close()


def test_share_link_special_chars_password(page: Page, serve_hacka_re):
    """Test passwords with special characters and edge cases."""
    
    # Navigate to the application
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Test with password containing special characters
    special_password = "P@$$w0rd!#%&*()[]{}|\\<>?~`"
    
    # Create share link with special password
    page.locator("#settings-btn").click()
    page.wait_for_selector("#settings-modal.active", state="visible")
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill("special-test-key")
    page.locator("#close-settings").click()
    
    page.locator("#share-btn").click()
    password_input = page.locator("#share-password")
    password_input.fill(special_password)
    page.locator("#generate-share-link-btn").click()
    
    generated_link_container = page.locator("#generated-link-container")
    expect(generated_link_container).to_be_visible()
    generated_link = page.locator("#generated-link").input_value()
    
    page.locator("#close-share-modal").click()
    
    # Navigate to shared link in incognito to ensure password prompt
    browser = page.context.browser
    incognito_context = browser.new_context()
    incognito_page = incognito_context.new_page()
    incognito_page.goto(generated_link)
    
    password_field = incognito_page.locator('#early-password-input, #decrypt-password').first
    expect(password_field).to_be_visible(timeout=5000)
    
    # First try with slightly wrong special password (missing one char)
    wrong_special = "P@$$w0rd!#%&*()[]{}|\\<>?~"  # Missing last backtick
    password_field.fill(wrong_special)
    incognito_page.keyboard.press('Enter')
    
    time.sleep(1)
    
    # Should show error
    error_div = incognito_page.locator('#early-password-error')
    expect(error_div).to_be_visible(timeout=5000)
    assert incognito_page.locator('#early-password-input').is_visible(), "Password field should still be visible with wrong password"
    
    # Now try with correct special password
    password_field = incognito_page.locator('#early-password-input, #decrypt-password').first
    password_field.clear()
    password_field.fill(special_password)
    incognito_page.keyboard.press('Enter')
    
    time.sleep(3)
    
    # Should succeed - password modal gone
    expect(incognito_page.locator('#early-password-input')).not_to_be_visible(timeout=5000)
    
    # Dismiss welcome modal if it appears
    welcome_modal = incognito_page.locator("#welcome-modal")
    if welcome_modal.is_visible():
        close_btn = incognito_page.locator("#close-welcome-modal")
        if close_btn.is_visible():
            close_btn.click()
    
    # Verify data loaded
    incognito_page.locator("#settings-btn").click()
    incognito_page.wait_for_selector("#settings-modal.active", state="visible")
    api_key_value = incognito_page.locator("#api-key-update").input_value()
    
    # Check API key is loaded (may be masked)
    assert api_key_value != "", "API key should be loaded with correct special password"
    assert len(api_key_value) > 0, "API key should have content"
    
    screenshot_with_markdown(incognito_page, "special_chars_password", {
        "Test": "Special characters in password",
        "Password Length": str(len(special_password)),
        "Success": "Yes"
    })
    
    # Clean up
    incognito_context.close()