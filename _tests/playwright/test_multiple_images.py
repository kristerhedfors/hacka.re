"""
Test multiple image generations in sequence
"""
import pytest
from playwright.sync_api import Page
import os

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

def test_multiple_sequential_images(page: Page, serve_hacka_re):
    """Test that multiple images generated in sequence all render properly"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)

    # Enable console logging to debug
    console_logs = []
    page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

    # Inject three test images
    page.evaluate("""
        () => {
            window.functionImageData = {
                'test_img_1': {
                    type: 'base64',
                    data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                    mimeType: 'image/png',
                    toolCallId: 'call_1'
                },
                'test_img_2': {
                    type: 'base64',
                    data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
                    mimeType: 'image/png',
                    toolCallId: 'call_2'
                },
                'test_img_3': {
                    type: 'base64',
                    data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
                    mimeType: 'image/png',
                    toolCallId: 'call_3'
                }
            };
            console.log('[Test] Injected 3 test images:', Object.keys(window.functionImageData));
        }
    """)

    import urllib.parse
    import json

    # Create three messages with image results
    for i in range(1, 4):
        result_json = {
            "success": True,
            "result": {
                "content": [{
                    "type": "image_ref",
                    "imageId": f"test_img_{i}",
                    "message": f"Image {i} generated"
                }]
            }
        }
        encoded_json = urllib.parse.quote(json.dumps(result_json))
        test_content = f"""Image {i}:

[FUNCTION_RESULT:test_func:object:{encoded_json}:3000:call_{i}]"""

        page.evaluate("""
            (args) => {
                const [content, msgId] = args;
                const chatMessages = document.getElementById('chat-messages');
                const messageElement = window.UIUtils.createMessageElement('assistant', content, msgId);
                chatMessages.appendChild(messageElement);
                console.log(`[Test] Added message ${msgId}`);
            }
        """, [test_content, f"msg_{i}"])

        page.wait_for_timeout(500)

    # Check that all three images are rendered
    for i in range(1, 4):
        message = page.locator(f'.message.assistant[data-id="msg_{i}"]')

        # Check for inline image
        inline_image = message.locator('img')

        if inline_image.count() == 0:
            print(f"\n❌ Image {i} NOT found!")
            print(f"Message HTML: {message.inner_html()}")

            # Print relevant console logs
            image_logs = [log for log in console_logs if f'test_img_{i}' in log or f'msg_{i}' in log]
            print(f"Relevant logs for image {i}:")
            for log in image_logs:
                print(f"  {log}")
        else:
            print(f"✓ Image {i} rendered")

    # Final check
    total_images = page.locator('.message.assistant img').count()
    print(f"\nTotal images rendered: {total_images}/3")

    assert total_images == 3, f"Expected 3 images, but found {total_images}"
