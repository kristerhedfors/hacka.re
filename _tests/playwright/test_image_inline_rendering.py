"""
Test that Hugging Face generated images render inline in chat
"""
import pytest
from playwright.sync_api import Page, expect
import os
import json

@pytest.fixture
def api_key():
    """Get API key from environment"""
    key = os.getenv('OPENAI_API_KEY')
    if not key:
        pytest.skip("OPENAI_API_KEY not set")
    return key

def dismiss_welcome_modal(page: Page):
    """Dismiss the welcome modal if present"""
    try:
        close_btn = page.locator("#close-welcome-modal")
        if close_btn.is_visible(timeout=2000):
            close_btn.click()
            page.wait_for_timeout(500)
    except:
        pass

def configure_api(page: Page, api_key: str):
    """Configure API settings"""
    page.locator("#settings-btn").click()
    page.wait_for_selector("#settings-modal", state="visible")

    # Set API key
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill(api_key)

    # Select gpt-5-nano model
    model_select = page.locator("#model-select")
    model_select.select_option("gpt-5-nano")

    # Close settings
    page.locator("#close-settings").click()
    page.wait_for_timeout(500)

def test_image_renders_inline(page: Page, serve_hacka_re, api_key):
    """Test that generated images appear inline in chat, not just as icons"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    configure_api(page, api_key)

    # Enable Hugging Face MCP (assuming it's already configured)
    # For this test we'll simulate an image generation result by injecting it directly

    # Inject test image data into the global store
    page.evaluate("""
        () => {
            window.functionImageData = {
                'test_img_123': {
                    type: 'base64',
                    data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                    mimeType: 'image/png',
                    toolCallId: 'test_123'
                }
            };
        }
    """)

    # Create a test message with an image result marker (URL-encoded JSON)
    import urllib.parse
    result_json = {"success":True,"result":{"content":[{"type":"image_ref","imageId":"test_img_123","message":"Image generated successfully"}]}}
    encoded_json = urllib.parse.quote(json.dumps(result_json))
    test_content = f"""Here is your generated image:

[FUNCTION_RESULT:huggingface_gr1_flux1_schnell_infer:object:{encoded_json}:5000:test_123]"""

    # Inject the message directly into the chat
    page.evaluate("""
        (content) => {
            const chatMessages = document.getElementById('chat-messages');
            const messageElement = window.UIUtils.createMessageElement('assistant', content, 'test_msg_1');
            chatMessages.appendChild(messageElement);
        }
    """, test_content)

    page.wait_for_timeout(1000)

    # Check that an actual <img> tag is rendered in the assistant message
    message = page.locator('.message.assistant[data-id="test_msg_1"]')
    expect(message).to_be_visible()

    # Look for the inline image
    inline_image = message.locator('img')
    expect(inline_image).to_be_visible()

    # Verify the image has a data URL
    img_src = inline_image.get_attribute('src')
    assert img_src is not None
    assert img_src.startswith('data:image/png;base64,')

    # Verify the image has proper styling
    img_style = inline_image.get_attribute('style')
    assert 'max-width: 100%' in img_style

    # Also verify the function result icon is present (for modal access)
    result_icon = message.locator('.function-result-icon')
    expect(result_icon).to_be_visible()

    print("✓ Image renders inline in chat")
    print("✓ Image has proper base64 data URL")
    print("✓ Image has proper styling")
    print("✓ Function result icon is also present for modal access")

def test_image_not_in_tooltip_text(page: Page, serve_hacka_re, api_key):
    """Test that base64 image data is NOT shown in the tooltip text"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)

    # Inject test image data
    page.evaluate("""
        () => {
            window.functionImageData = {
                'test_img_456': {
                    type: 'base64',
                    data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                    mimeType: 'image/png',
                    toolCallId: 'test_456'
                }
            };
        }
    """)

    # Create a test message with an image result marker (URL-encoded JSON)
    import urllib.parse
    result_json = {"success":True,"result":{"content":[{"type":"image_ref","imageId":"test_img_456","message":"Image generated"}]}}
    encoded_json = urllib.parse.quote(json.dumps(result_json))
    test_content = f"""[FUNCTION_RESULT:test_image_gen:object:{encoded_json}:3000:test_456]"""

    # Inject the message
    page.evaluate("""
        (content) => {
            const chatMessages = document.getElementById('chat-messages');
            const messageElement = window.UIUtils.createMessageElement('assistant', content, 'test_msg_2');
            chatMessages.appendChild(messageElement);
        }
    """, test_content)

    page.wait_for_timeout(1000)

    # Hover over the function result icon to show tooltip
    result_icon = page.locator('.function-result-icon')
    result_icon.hover()
    page.wait_for_timeout(500)

    # Get the tooltip content
    tooltip = page.locator('.function-icon-tooltip')
    tooltip_text = tooltip.inner_text()

    # Verify base64 data is NOT in tooltip
    assert 'iVBORw0KGgo' not in tooltip_text
    assert 'base64' not in tooltip_text.lower()

    # Verify tooltip shows useful info instead
    assert 'Image generated' in tooltip_text or 'object' in tooltip_text

    print("✓ Tooltip does not contain base64 image data")
    print("✓ Tooltip shows useful summary instead")
