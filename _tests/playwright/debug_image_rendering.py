"""
Debug script to check image inline rendering
"""
from playwright.sync_api import sync_playwright
import os

def dismiss_welcome_modal(page):
    """Dismiss the welcome modal if present"""
    try:
        close_btn = page.locator("#close-welcome-modal")
        if close_btn.is_visible(timeout=2000):
            close_btn.click()
            page.wait_for_timeout(500)
    except:
        pass

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()

        # Enable console logging
        page.on("console", lambda msg: print(f"[Console {msg.type}] {msg.text}"))

        page.goto("http://localhost:8000")
        dismiss_welcome_modal(page)

        # Inject test image data into the global store
        page.evaluate("""
            () => {
                console.log('[Debug] Injecting test image data...');
                window.functionImageData = {
                    'test_img_123': {
                        type: 'base64',
                        data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                        mimeType: 'image/png',
                        toolCallId: 'test_123'
                    }
                };
                console.log('[Debug] Image data injected:', window.functionImageData);
            }
        """)

        # Create a test message with an image result marker
        test_content = """Here is your generated image:

[FUNCTION_RESULT:huggingface_gr1_flux1_schnell_infer:object:%7B%22success%22%3Atrue%2C%22result%22%3A%7B%22content%22%3A%5B%7B%22type%22%3A%22image_ref%22%2C%22imageId%22%3A%22test_img_123%22%2C%22message%22%3A%22Image%20generated%20successfully%22%7D%5D%7D%7D:5000:test_123]"""

        print(f"\n[Debug] Test content:\n{test_content}\n")

        # Inject the message directly into the chat
        page.evaluate("""
            (content) => {
                console.log('[Debug] Creating message element with content:', content);
                const chatMessages = document.getElementById('chat-messages');
                const messageElement = window.UIUtils.createMessageElement('assistant', content, 'test_msg_1');
                console.log('[Debug] Message element created:', messageElement);
                chatMessages.appendChild(messageElement);
                console.log('[Debug] Message element appended to chat');
            }
        """, test_content)

        page.wait_for_timeout(2000)

        # Get the rendered HTML
        message_html = page.locator('.message.assistant[data-id="test_msg_1"]').inner_html()
        print(f"\n[Debug] Rendered message HTML:\n{message_html}\n")

        # Check for image
        img_count = page.locator('.message.assistant[data-id="test_msg_1"] img').count()
        print(f"[Debug] Image count in message: {img_count}")

        # Take screenshot
        page.screenshot(path="/tmp/image_rendering_debug.png")
        print("\n[Debug] Screenshot saved to /tmp/image_rendering_debug.png")

        # Keep browser open for inspection
        input("\nPress Enter to close browser...")

        browser.close()

if __name__ == "__main__":
    main()
