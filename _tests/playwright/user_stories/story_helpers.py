"""
Shared utilities for user story tests
Provides common functionality for all story recordings.
"""

import time
import json
from pathlib import Path
from datetime import datetime
from playwright.sync_api import Page


class StoryRecorder:
    """Base class for recording user stories with video and logging"""

    def __init__(self, story_name, page: Page):
        self.story_name = story_name
        self.page = page
        self.console_messages = []
        self.story_steps = []
        self.start_time = time.time()
        self.screenshots = []

    def setup_console_logging(self):
        """Setup comprehensive console logging"""

        def log_console_message(msg):
            timestamp = time.strftime("%H:%M:%S.%f")[:-3]
            elapsed = time.time() - self.start_time

            message_data = {
                'timestamp': timestamp,
                'elapsed': elapsed,
                'type': msg.type,
                'text': msg.text,
                'location': str(msg.location) if msg.location else None
            }

            self.console_messages.append(message_data)

            # Color-coded console output
            if msg.type == 'error':
                print(f"🔴 [{timestamp}] ERROR: {msg.text}")
            elif msg.type == 'warning':
                print(f"🟡 [{timestamp}] WARN: {msg.text}")
            elif msg.type == 'log' and any(key in msg.text.lower() for key in ['function', 'execute', 'call']):
                print(f"🔵 [{timestamp}] FUNC: {msg.text}")

        def log_page_error(err):
            timestamp = time.strftime("%H:%M:%S.%f")[:-3]
            self.console_messages.append({
                'timestamp': timestamp,
                'elapsed': time.time() - self.start_time,
                'type': 'pageerror',
                'text': str(err)
            })
            print(f"💥 [{timestamp}] PAGE ERROR: {err}")

        self.page.on("console", log_console_message)
        self.page.on("pageerror", log_page_error)

    def log_step(self, step_name, details=None, emoji="📍"):
        """Log a major step in the story"""
        timestamp = time.strftime("%H:%M:%S")
        elapsed = time.time() - self.start_time

        step_data = {
            'name': step_name,
            'timestamp': timestamp,
            'elapsed': elapsed,
            'details': details
        }
        self.story_steps.append(step_data)

        # Pretty console output
        print(f"\n{'='*60}")
        print(f"{emoji} STEP: {step_name}")
        if details:
            print(f"   Details: {details}")
        print(f"   Time: {timestamp} (elapsed: {elapsed:.1f}s)")
        print(f"{'='*60}\n")

    def dramatic_pause(self, duration=1500, message=None):
        """Add a pause for better video pacing"""
        if message:
            print(f"⏸️  {message} ({duration}ms)")
        self.page.wait_for_timeout(duration)

    def smooth_scroll_to(self, selector: str):
        """Smoothly scroll element into view"""
        self.page.evaluate(f'''
            (() => {{
                const element = document.querySelector("{selector}");
                if (element) {{
                    element.scrollIntoView({{
                        behavior: "smooth",
                        block: "center"
                    }});
                }}
            }})()
        ''')
        self.page.wait_for_timeout(500)

    def highlight_element(self, selector: str, color="rgba(255, 0, 0, 0.8)"):
        """Highlight an element for emphasis"""
        self.page.evaluate(f'''
            (() => {{
                const element = document.querySelector("{selector}");
                if (element) {{
                    const originalStyle = element.style.cssText;
                    element.style.cssText = originalStyle + "; box-shadow: 0 0 20px 5px {color}; transition: box-shadow 0.3s;";
                    setTimeout(() => {{
                        element.style.cssText = originalStyle;
                    }}, 1000);
                }}
            }})()
        ''')

    def type_dramatically(self, selector: str, text: str, delay=50):
        """Type text character by character for dramatic effect"""
        input_element = self.page.locator(selector)
        input_element.click()
        for char in text:
            input_element.type(char, delay=delay)

    def capture_screenshot(self, name: str, metadata=None):
        """Capture a screenshot with metadata"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        screenshot_name = f"{self.story_name}_{name}_{timestamp}"

        screenshot_data = {
            'name': screenshot_name,
            'timestamp': timestamp,
            'elapsed': time.time() - self.start_time,
            'metadata': metadata or {}
        }

        self.screenshots.append(screenshot_data)

        # Take the screenshot
        screenshots_dir = Path("_tests/playwright/screenshots/user_stories")
        screenshots_dir.mkdir(parents=True, exist_ok=True)
        self.page.screenshot(path=str(screenshots_dir / f"{screenshot_name}.png"))

        print(f"📸 Screenshot: {name}")

    def save_story_data(self, video_path=None):
        """Save all story data to JSON"""
        story_data = {
            'story': self.story_name,
            'timestamp': datetime.now().isoformat(),
            'duration': time.time() - self.start_time,
            'steps': self.story_steps,
            'console_messages': self.console_messages,
            'screenshots': self.screenshots,
            'video_path': video_path
        }

        # Save to JSON
        output_dir = Path("_tests/playwright/videos/user_stories")
        output_dir.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        json_path = output_dir / f"{self.story_name}_{timestamp}_data.json"

        with open(json_path, 'w') as f:
            json.dump(story_data, f, indent=2)

        print(f"📊 Story data saved to: {json_path}")
        return str(json_path)


class ChatHelper:
    """Helper functions for chat interactions"""

    @staticmethod
    def send_message(page: Page, message: str, wait_for_response=True):
        """Send a message in chat and optionally wait for response"""
        message_input = page.locator("#message-input")
        message_input.fill(message)
        page.locator("#send-btn").click()

        if wait_for_response:
            # Wait for generation to complete
            page.wait_for_function(
                "() => !document.querySelector('#send-btn').hasAttribute('data-generating')",
                timeout=30000
            )

    @staticmethod
    def get_last_assistant_message(page: Page) -> str:
        """Get the last assistant message from chat"""
        last_message = page.locator(".message.assistant .message-content").last
        if last_message.is_visible():
            return last_message.inner_text()
        return ""

    @staticmethod
    def clear_chat(page: Page):
        """Clear the chat history"""
        clear_btn = page.locator("#clear-chat-btn")
        if clear_btn.is_visible():
            clear_btn.click()
            page.wait_for_timeout(500)


class FunctionHelper:
    """Helper functions for function creation and execution"""

    @staticmethod
    def create_function(page: Page, function_code: str, validate=True):
        """Create a new function"""
        # Open function modal
        page.locator("#function-btn").click()
        page.wait_for_selector("#function-modal", state="visible")

        # Enter function code
        code_editor = page.locator("#function-code")
        code_editor.fill(function_code)

        if validate:
            # Validate the function
            page.locator("#function-validate-btn").click()
            page.wait_for_timeout(1000)

        # Save/close
        submit_btn = page.locator("#function-editor-form button[type='submit']")
        if submit_btn.is_visible():
            submit_btn.click()
        else:
            page.locator("#close-function-modal").click()

    @staticmethod
    def execute_function(page: Page, accept=True):
        """Handle function execution modal"""
        # Wait for execution modal
        exec_modal = page.locator("#function-execution-modal")
        exec_modal.wait_for(state="visible", timeout=10000)

        # Get function details
        function_name = page.locator("#exec-function-name").inner_text()
        print(f"🎯 Executing function: {function_name}")

        if accept:
            page.locator("#exec-execute-btn").click()
        else:
            page.locator("#exec-block-btn").click()

        # Wait for modal to close
        exec_modal.wait_for(state="hidden", timeout=5000)


class SettingsHelper:
    """Helper functions for settings configuration"""

    @staticmethod
    def configure_api(page: Page, api_key: str, provider="openai", model=None):
        """Configure API settings"""
        # Open settings
        page.locator("#settings-btn").click()
        page.wait_for_selector("#settings-modal.active", state="visible")

        # Set API key
        api_key_input = page.locator("#api-key-update")
        api_key_input.fill(api_key)

        # Set provider
        base_url_select = page.locator("#base-url-select")
        base_url_select.select_option(provider)

        # Wait for models to load
        page.wait_for_timeout(2000)

        # Select model if specified
        if model:
            model_select = page.locator("#model-select")
            try:
                model_select.select_option(model)
            except:
                # Select first available
                model_select.select_option(index=1)

        # Close settings
        page.locator("#close-settings").click()
        page.wait_for_selector("#settings-modal", state="hidden")

    @staticmethod
    def enable_yolo_mode(page: Page):
        """Enable YOLO mode for automatic function execution"""
        page.locator("#settings-btn").click()
        page.wait_for_selector("#settings-modal.active", state="visible")

        yolo_checkbox = page.locator("#yolo-mode")
        if not yolo_checkbox.is_checked():
            # Handle confirmation dialog
            page.on("dialog", lambda dialog: dialog.accept())
            yolo_checkbox.click()

        page.locator("#close-settings").click()


class PromptsHelper:
    """Helper functions for prompt management"""

    @staticmethod
    def save_prompt(page: Page, name: str, content: str):
        """Save a new system prompt"""
        # Open prompts modal
        page.locator("#prompts-btn").click()
        page.wait_for_selector("#prompts-modal", state="visible")

        # Add new prompt
        if page.locator("#add-prompt-btn").is_visible():
            page.locator("#add-prompt-btn").click()

            # Fill prompt details
            page.locator("#prompt-name").fill(name)
            page.locator("#prompt-content").fill(content)

            # Save
            page.locator("#save-prompt-btn").click()
            page.wait_for_timeout(500)

        # Close modal
        page.locator("#close-prompts-modal").click()

    @staticmethod
    def select_prompt(page: Page, prompt_name: str):
        """Select and activate a saved prompt"""
        page.locator("#prompts-btn").click()
        page.wait_for_selector("#prompts-modal", state="visible")

        # Find and select the prompt
        prompt_items = page.locator(".prompt-item")
        for i in range(prompt_items.count()):
            item = prompt_items.nth(i)
            if prompt_name in item.inner_text():
                checkbox = item.locator(".prompt-checkbox")
                if not checkbox.is_checked():
                    checkbox.click()
                break

        page.locator("#close-prompts-modal").click()


def wait_for_element_with_retry(page: Page, selector: str, max_retries=3, timeout=5000):
    """Wait for an element with retry logic"""
    for attempt in range(max_retries):
        try:
            page.wait_for_selector(selector, state="visible", timeout=timeout)
            return True
        except:
            if attempt < max_retries - 1:
                print(f"⚠️ Element {selector} not found, retrying...")
                page.wait_for_timeout(1000)
    return False


def capture_video_frame(page: Page, label: str):
    """Capture a frame annotation for video editing"""
    timestamp = time.time()
    print(f"🎬 FRAME MARKER: {label} @ {timestamp}")

    # Add visual marker on page
    page.evaluate(f'''
        (() => {{
            const marker = document.createElement('div');
            marker.textContent = "{label}";
            marker.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                background: rgba(255, 0, 0, 0.8);
                color: white;
                padding: 10px 20px;
                border-radius: 5px;
                font-family: monospace;
                font-size: 14px;
                z-index: 999999;
                animation: fadeOut 2s forwards;
            `;
            document.body.appendChild(marker);

            // CSS animation
            const style = document.createElement('style');
            style.textContent = `
                @keyframes fadeOut {{
                    0% {{ opacity: 1; }}
                    50% {{ opacity: 1; }}
                    100% {{ opacity: 0; }}
                }}
            `;
            document.head.appendChild(style);

            // Remove after animation
            setTimeout(() => marker.remove(), 2000);
        }})()
    ''')

    return timestamp