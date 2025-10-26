"""
Test third image generation issue with comprehensive debugging
"""
import pytest
from playwright.sync_api import Page, expect
import json
import time

from test_utils import enable_yolo_mode, dismiss_welcome_modal

def send_message(page: Page, message: str):
    """Send a message in the chat"""
    page.locator("#message-input").fill(message)
    page.locator("#send-btn").click()

def wait_for_generation_complete(page: Page, timeout_ms: int = 180000):
    """Wait for message generation to complete"""
    try:
        page.wait_for_function(
            "() => !document.querySelector('#send-btn').hasAttribute('data-generating')",
            timeout=timeout_ms
        )
        return True
    except Exception as e:
        print(f"⚠ Timeout waiting for generation: {e}")
        return False

def test_third_image_generation(page: Page, serve_hacka_re):
    """Test that third image generation works correctly"""

    # Track console messages
    console_messages = []

    def handle_console(msg):
        console_messages.append({
            'type': msg.type,
            'text': msg.text
        })

    page.on("console", handle_console)

    # Load page
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)

    # Enable YOLO mode
    enable_yolo_mode(page)

    # Generate three images
    prompts = [
        "Generate image of an elk",
        "Generate image of a penguin",
        "Generate image of a fish"
    ]

    for i, prompt in enumerate(prompts, 1):
        print(f"\n{'='*60}")
        print(f"IMAGE {i}/3: {prompt}")
        print(f"{'='*60}")

        # Send message
        send_message(page, prompt)

        # Wait for completion
        success = wait_for_generation_complete(page)

        if not success:
            pytest.fail(f"Image {i} generation timed out")

        # Wait for UI to settle
        page.wait_for_timeout(2000)

        print(f"✓ Image {i} generation complete")

    # Wait for all rendering
    print("\n=== Waiting for rendering to complete ===")
    page.wait_for_timeout(3000)

    # Take screenshot
    page.screenshot(path="_tests/playwright/screenshots/third_image_debug.png", full_page=True)
    print("✓ Screenshot saved")

    # Print relevant console logs
    print("\n=== Relevant Console Logs ===")
    image_logs = []

    for msg in console_messages:
        text = msg['text']
        # Filter for debug messages
        if any(keyword in text for keyword in [
            '[insertFunctionResultMarkers]',
            '[Function Markers]',
            'Created image reference',
            'Content (stringified',
            'Rendering inline image',
            'Processing image'
        ]):
            print(f"{msg['type']}: {text}")
            image_logs.append(msg)

    # Save filtered logs
    with open('_tests/playwright/screenshots/third_image_console.json', 'w') as f:
        json.dump(image_logs, f, indent=2)
    print("\n✓ Filtered console logs saved")

    # Check that all three images were processed
    render_logs = [msg for msg in console_messages if 'Rendering inline image' in msg['text']]
    print(f"\n=== Summary ===")
    print(f"Found {len(render_logs)} 'Rendering inline image' logs")
    print(f"Expected: 3")

    if len(render_logs) < 3:
        print(f"\n⚠ WARNING: Only {len(render_logs)}/3 images were rendered inline!")

        # Print why third image wasn't rendered
        third_image_logs = [msg for msg in console_messages if 'Processing image function' in msg['text']]
        if len(third_image_logs) >= 3:
            print(f"\nThird image processing log found")
        else:
            print(f"\n✗ Third image was never processed by function-markers.js")

    # Verify images in the chat
    messages = page.locator(".message.assistant .message-content img").all()
    print(f"\nFound {len(messages)} <img> tags in chat")

    if len(messages) < 3:
        pytest.fail(f"Expected 3 images in chat, found {len(messages)}")

    print("\n✓ All three images rendered successfully")
