"""Test share link functionality with new crypto system"""

import pytest
from playwright.sync_api import Page, expect
import time
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_new_crypto_share_link(page: Page, serve_hacka_re):
    """Test that share links work with the new crypto system"""
    
    # Navigate to the application
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Set an API key first
    settings_btn = page.locator("#settings-btn")
    settings_btn.click()
    
    settings_modal = page.locator("#settings-modal")
    expect(settings_modal).to_be_visible()
    
    # Set API key
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill("test-api-key-12345")
    
    # Close settings
    page.locator("#close-settings").click()
    expect(settings_modal).to_be_hidden()
    
    # Create a share link
    share_btn = page.locator("#share-btn")
    share_btn.click()
    
    share_modal = page.locator("#share-modal")
    expect(share_modal).to_be_visible()
    
    # Set password
    password_input = page.locator("#share-password")
    password_input.fill("TestPassword123")
    
    # Make sure API key is included
    api_key_checkbox = page.locator("#share-api-key")
    if not api_key_checkbox.is_checked():
        api_key_checkbox.check()
    
    # Generate the share link
    generate_btn = page.locator("#generate-share-link-btn")
    generate_btn.click()
    
    # Wait for link generation
    generated_link_container = page.locator("#generated-link-container")
    expect(generated_link_container).to_be_visible()
    
    # Get the generated link
    generated_link = page.locator("#generated-link").input_value()
    assert generated_link and "#gpt=" in generated_link
    print(f"✅ Share link generated: {generated_link[:80]}...")
    
    # Close share modal
    page.locator("#close-share-modal").click()
    
    # Navigate to the shared link in a new context (simulating new session)
    context2 = page.context.browser.new_context()
    page2 = context2.new_page()
    
    # Capture console messages from page2
    console_messages = []
    page2.on("console", lambda msg: console_messages.append({
        'type': msg.type,
        'text': msg.text
    }))
    
    # Navigate to the shared link
    print(f"\n🔄 Navigating to share link in new session...")
    page2.goto(generated_link)
    
    # Wait for password modal
    password_modal = page2.locator('.modal.password-modal, #password-modal')
    expect(password_modal).to_be_visible(timeout=5000)
    print("✅ Password modal appeared")
    
    # Enter the password
    password_input2 = page2.locator('#early-password-input')
    password_input2.fill('TestPassword123')
    
    # Submit the password
    submit_button = page2.locator('#early-password-submit')
    submit_button.click()
    
    # Wait for modal to disappear
    expect(password_modal).not_to_be_visible(timeout=10000)
    print("✅ Password accepted, modal closed")
    
    # Wait for initialization
    time.sleep(2)
    
    # Check if API key was restored
    settings_btn2 = page2.locator("#settings-btn")
    settings_btn2.click()
    
    settings_modal2 = page2.locator("#settings-modal")
    expect(settings_modal2).to_be_visible()
    
    # Check API key value
    api_key_input2 = page2.locator("#api-key-update")
    restored_api_key = api_key_input2.input_value()
    
    # The API key should be restored (though it might be masked)
    assert restored_api_key, "API key should be restored"
    print(f"✅ API key restored: {restored_api_key[:20]}...")
    
    # Close settings
    page2.locator("#close-settings").click()
    
    # Print any errors from console
    errors = [msg for msg in console_messages if msg['type'] == 'error']
    if errors:
        print("\n⚠️ Console errors:")
        for error in errors[:5]:  # First 5 errors
            print(f"  - {error['text']}")
    
    # Clean up
    context2.close()
    
    print("\n✅ Share link test completed successfully!")


def test_share_link_with_conversation(page: Page, serve_hacka_re):
    """Test that conversations are preserved in share links"""
    
    # Navigate to the application
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Send a test message
    message_input = page.locator("#message-input")
    message_input.fill("Test message for share link")
    
    send_btn = page.locator("#send-btn")
    send_btn.click()
    
    # Wait for response
    assistant_message = page.locator(".message.assistant").first
    expect(assistant_message).to_be_visible(timeout=10000)
    
    # Create a share link with conversation
    share_btn = page.locator("#share-btn")
    share_btn.click()
    
    share_modal = page.locator("#share-modal")
    expect(share_modal).to_be_visible()
    
    # Set password
    password_input = page.locator("#share-password")
    password_input.fill("ConvoTest123")
    
    # Include conversation
    conversation_checkbox = page.locator("#share-conversation")
    if not conversation_checkbox.is_checked():
        conversation_checkbox.check()
    
    # Generate the share link
    generate_btn = page.locator("#generate-share-link-btn")
    generate_btn.click()
    
    # Wait for link generation
    generated_link_container = page.locator("#generated-link-container")
    expect(generated_link_container).to_be_visible()
    
    # Get the generated link
    generated_link = page.locator("#generated-link").input_value()
    print(f"✅ Share link with conversation generated: {generated_link[:80]}...")
    
    # Close share modal
    page.locator("#close-share-modal").click()
    
    # Navigate to the shared link in a new context
    context2 = page.context.browser.new_context()
    page2 = context2.new_page()
    
    # Navigate to the shared link
    page2.goto(generated_link)
    
    # Wait for password modal
    password_modal = page2.locator('.modal.password-modal, #password-modal')
    expect(password_modal).to_be_visible(timeout=5000)
    
    # Enter the password
    password_input2 = page2.locator('#early-password-input')
    password_input2.fill('ConvoTest123')
    
    # Submit the password
    submit_button = page2.locator('#early-password-submit')
    submit_button.click()
    
    # Wait for modal to disappear
    expect(password_modal).not_to_be_visible(timeout=10000)
    
    # Wait for conversation to load
    time.sleep(2)
    
    # Check if conversation was restored
    user_messages = page2.locator(".message.user")
    expect(user_messages).to_have_count(1, timeout=5000)
    
    first_user_message = user_messages.first
    message_text = first_user_message.text_content()
    assert "Test message for share link" in message_text
    print(f"✅ Conversation restored: {message_text[:50]}...")
    
    # Clean up
    context2.close()
    
    print("\n✅ Share link with conversation test completed!")