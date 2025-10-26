"""
Debug script to test third image generation failure
"""
import asyncio
import json
from playwright.async_api import async_playwright, Page
import sys

async def enable_yolo_mode(page: Page):
    """Enable YOLO mode (auto-execute functions)"""
    print("\n=== Enabling YOLO mode ===")
    await page.locator("#settings-btn").click()
    await page.wait_for_selector("#settings-modal", state="visible")

    yolo = page.locator("#yolo-mode")
    is_checked = await yolo.is_checked()

    if not is_checked:
        # Handle the confirmation dialog
        page.on("dialog", lambda dialog: asyncio.create_task(dialog.accept()))
        await yolo.click()
        await page.wait_for_timeout(500)

    await page.locator("#close-settings").click()
    await page.wait_for_selector("#settings-modal", state="hidden")
    print("✓ YOLO mode enabled")

async def wait_for_generation_complete(page: Page, timeout: int = 180000):
    """Wait for message generation to complete"""
    try:
        await page.wait_for_function(
            "() => !document.querySelector('#send-btn').hasAttribute('data-generating')",
            timeout=timeout
        )
        return True
    except Exception as e:
        print(f"⚠ Timeout waiting for generation to complete: {e}")
        return False

async def send_message_and_wait(page: Page, message: str):
    """Send a message and wait for completion"""
    print(f"\n=== Sending: {message} ===")

    # Send message
    await page.locator("#message-input").fill(message)
    await page.locator("#send-btn").click()

    # Wait for completion
    success = await wait_for_generation_complete(page)

    if success:
        print("✓ Generation complete")
    else:
        print("✗ Generation timed out or failed")

    await page.wait_for_timeout(1000)  # Let UI settle
    return success

async def collect_console_messages(page: Page):
    """Collect all console messages"""
    messages = []

    def handle_console(msg):
        messages.append({
            'type': msg.type,
            'text': msg.text,
            'args': [str(arg) for arg in msg.args]
        })

    page.on("console", handle_console)
    return messages

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()

        # Collect console messages
        console_messages = await collect_console_messages(page)

        print("=== Loading hacka.re ===")
        await page.goto("http://localhost:8000")
        await page.wait_for_load_state("networkidle")

        # Dismiss welcome modal
        try:
            await page.wait_for_selector("#welcome-modal", state="visible", timeout=5000)
            await page.locator("#close-welcome-modal").click()
            await page.wait_for_selector("#welcome-modal", state="hidden")
            print("✓ Welcome modal dismissed")
        except:
            print("ℹ No welcome modal to dismiss")

        # Check for API key modal and close it
        try:
            await page.wait_for_selector("#api-key-modal.active", timeout=2000)
            await page.locator("#close-api-key-modal").click()
            await page.wait_for_selector("#api-key-modal:not(.active)", timeout=2000)
            print("✓ API key modal dismissed")
        except:
            print("ℹ No API key modal to dismiss")

        # Enable YOLO mode
        await enable_yolo_mode(page)

        # Generate three images
        prompts = [
            "Generate image of an elk",
            "Generate image of a penguin",
            "Generate image of a fish"
        ]

        for i, prompt in enumerate(prompts, 1):
            print(f"\n{'='*60}")
            print(f"IMAGE {i}/3")
            print(f"{'='*60}")
            success = await send_message_and_wait(page, prompt)

            if not success:
                print(f"\n✗ Image {i} generation failed")
                break

        # Wait a bit for all rendering to complete
        print("\n=== Waiting for rendering to complete ===")
        await page.wait_for_timeout(3000)

        # Take a screenshot
        await page.screenshot(path="_tests/debug_third_image.png", full_page=True)
        print("\n✓ Screenshot saved: _tests/debug_third_image.png")

        # Print relevant console logs
        print("\n=== Relevant Console Logs ===")
        for msg in console_messages:
            text = msg['text']
            # Filter for our debug messages
            if any(keyword in text for keyword in [
                '[insertFunctionResultMarkers]',
                '[Function Markers]',
                'Created image reference',
                'Content (stringified',
                'Rendering inline image'
            ]):
                print(f"{msg['type']}: {text}")

        # Save console logs to file
        with open('_tests/debug_third_image_console.json', 'w') as f:
            json.dump(console_messages, f, indent=2)
        print("\n✓ Console logs saved: _tests/debug_third_image_console.json")

        # Keep browser open for inspection
        print("\n=== Browser will stay open for inspection ===")
        print("Press Ctrl+C to close...")

        try:
            await page.pause()
        except KeyboardInterrupt:
            print("\n✓ Closing browser")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
