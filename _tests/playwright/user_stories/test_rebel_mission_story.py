#!/usr/bin/env python3
"""
Rebel Mission User Story Test
Complete end-to-end test simulating a user creating a rebel mission to blow up the Death Star.
Includes full video recording and console logging for documentation.
"""

import os
import sys
import time
import json
from datetime import datetime
from pathlib import Path
from playwright.sync_api import Page, expect, sync_playwright

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from test_utils import dismiss_welcome_modal, screenshot_with_markdown
from conftest import ACTIVE_TEST_CONFIG

class RebelMissionStory:
    """Rebel Mission to Blow Up Death Star - User Story Test"""

    def __init__(self, headless=False, slowmo=0, video_size=None):
        self.headless = headless
        self.slowmo = slowmo
        self.video_size = video_size or {'width': 1280, 'height': 720}
        self.console_messages = []
        self.story_steps = []
        self.start_time = None
        self.video_path = None

    def setup_console_logging(self, page: Page):
        """Setup comprehensive console logging with timestamps"""

        def log_console_message(msg):
            timestamp = time.strftime("%H:%M:%S.%f")[:-3]
            message_data = {
                'timestamp': timestamp,
                'elapsed': time.time() - self.start_time if self.start_time else 0,
                'type': msg.type,
                'text': msg.text,
                'location': str(msg.location) if msg.location else None
            }
            self.console_messages.append(message_data)

            # Print to console for real-time visibility
            if msg.type in ['error', 'warning']:
                print(f"[{timestamp}] {msg.type.upper()}: {msg.text}")
            elif 'DO IT' in msg.text or 'BOOM' in msg.text:
                print(f"[{timestamp}] 🎬 {msg.text}")

        def log_page_error(err):
            timestamp = time.strftime("%H:%M:%S.%f")[:-3]
            self.console_messages.append({
                'timestamp': timestamp,
                'elapsed': time.time() - self.start_time,
                'type': 'pageerror',
                'text': str(err),
                'location': None
            })
            print(f"[{timestamp}] PAGE ERROR: {err}")

        page.on("console", log_console_message)
        page.on("pageerror", log_page_error)

    def log_step(self, step_name, details=None):
        """Log a major step in the user story"""
        timestamp = time.strftime("%H:%M:%S")
        elapsed = time.time() - self.start_time if self.start_time else 0

        step_data = {
            'name': step_name,
            'timestamp': timestamp,
            'elapsed': elapsed,
            'details': details
        }
        self.story_steps.append(step_data)

        # Visual separator for console output
        print(f"\n{'='*60}")
        print(f"📍 STEP: {step_name}")
        if details:
            print(f"   Details: {details}")
        print(f"   Time: {timestamp} (elapsed: {elapsed:.1f}s)")
        print(f"{'='*60}\n")

    def dramatic_pause(self, page: Page, duration=1500, message=None):
        """Add a dramatic pause for better video pacing"""
        if message:
            print(f"⏸️  {message} ({duration}ms)")
        page.wait_for_timeout(duration)

    def type_naturally(self, page: Page, selector: str, text: str):
        """Type text at natural speed for presentations"""
        import random

        input_element = page.locator(selector)
        input_element.click()

        # Clear existing content first
        input_element.clear()

        # For presentations, type in smooth chunks with consistent speed
        # This creates a professional appearance without being too slow
        if len(text) <= 30:
            # Short messages: type quickly but visibly
            input_element.type(text, delay=15)
        else:
            # Longer messages: type in natural phrases
            # Split on punctuation and conjunctions for natural breaks
            import re
            # Split on punctuation, conjunctions, or every 5-7 words
            chunks = re.split(r'([,!?.]|\band\b|\bor\b|\bbut\b)', text)
            chunks = [c.strip() for c in chunks if c.strip()]

            for i, chunk in enumerate(chunks):
                if i > 0 and chunk not in '.,!?':
                    input_element.type(' ', delay=5)

                # Type each chunk smoothly
                input_element.type(chunk, delay=8)

                # Brief pause after punctuation
                if chunk in '.,!?':
                    page.wait_for_timeout(150)
                elif i < len(chunks) - 1:
                    # Small pause between chunks
                    page.wait_for_timeout(50)

    def smooth_scroll_to(self, page: Page, selector: str):
        """Smoothly scroll element into view for better video"""
        page.evaluate(f'''
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
        page.wait_for_timeout(500)  # Wait for scroll animation

    def highlight_element(self, page: Page, selector: str):
        """Briefly highlight an element for video emphasis"""
        page.evaluate(f'''
            (() => {{
                const element = document.querySelector("{selector}");
                if (element) {{
                    const originalStyle = element.style.cssText;
                    element.style.cssText = originalStyle + "; box-shadow: 0 0 20px 5px rgba(255, 0, 0, 0.8); transition: box-shadow 0.3s;";
                    setTimeout(() => {{
                        element.style.cssText = originalStyle;
                    }}, 1000);
                }}
            }})()
        ''')

    def run_story(self):
        """Run the complete rebel mission story"""

        # Generate video filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        video_dir = Path("../../videos/user_stories")
        video_dir.mkdir(parents=True, exist_ok=True)
        self.video_path = str(video_dir / f"rebel_mission_{timestamp}")

        print(f"\n🎬 Starting Rebel Mission Story")
        print(f"📹 Video will be saved to: {self.video_path}.webm")
        print(f"📊 Console log will be saved to: {self.video_path}_console.json")

        with sync_playwright() as p:
            # Launch browser with video recording
            browser = p.chromium.launch(
                headless=self.headless,
                slow_mo=self.slowmo
            )

            context = browser.new_context(
                viewport={'width': self.video_size['width'], 'height': self.video_size['height']},
                record_video_dir=str(video_dir),
                record_video_size=self.video_size
            )

            page = context.new_page()
            self.setup_console_logging(page)
            self.start_time = time.time()

            try:
                # Run the actual story
                self._execute_story(page)

                print(f"\n✅ Story completed successfully!")

            except Exception as e:
                print(f"\n❌ Story failed: {e}")
                screenshot_with_markdown(page, "error_state", {
                    "Error": str(e),
                    "Step": self.story_steps[-1]['name'] if self.story_steps else "Unknown"
                })
                raise

            finally:
                # Save console logs
                self._save_console_logs()

                # Close context to save video
                context.close()
                browser.close()

                # Rename video to our custom name
                self._rename_video_file(video_dir)

    def _execute_story(self, page: Page):
        """Execute the rebel mission story steps"""

        # === STEP 1: Initial Setup ===
        self.log_step("Initial Setup", "Navigate to hacka.re and dismiss welcome modal")
        page.goto("http://localhost:8000")
        self.dramatic_pause(page, 1000, "Page loading...")

        dismiss_welcome_modal(page)
        screenshot_with_markdown(page, "01_initial_state", {
            "Status": "Initial page loaded",
            "Step": "Setup Complete"
        })

        # === STEP 2: Configure API Settings ===
        self.log_step("Configure API Settings", "Set up OpenAI API key and model")

        # Open settings
        self.highlight_element(page, "#settings-btn")
        page.locator("#settings-btn").click()
        self.dramatic_pause(page, 500, "Opening settings...")

        # Configure API key - just fill it instantly
        api_key_input = page.locator("#api-key-update")
        api_key_input.fill(ACTIVE_TEST_CONFIG["api_key"])

        # Select provider immediately
        base_url_select = page.locator("#base-url-select")
        base_url_select.select_option(ACTIVE_TEST_CONFIG["provider_value"])

        # Enable YOLO mode FIRST (before selecting model)
        # This prevents the model from being reset
        print("🎯 Enabling YOLO mode first...")
        page.wait_for_timeout(300)  # Pause to see settings

        yolo_checkbox = page.locator("#yolo-mode")
        if not yolo_checkbox.is_checked():
            # Handle confirmation dialog
            page.on("dialog", lambda dialog: dialog.accept())
            yolo_checkbox.click()
            print("✅ YOLO mode enabled")
            page.wait_for_timeout(300)  # Pause after YOLO

        # NOW select the model (after YOLO is enabled)
        page.wait_for_timeout(1000)  # Wait for models to load
        model_select = page.locator("#model-select")
        selected_model = "gpt-4.1"  # Store the model we're selecting

        if model_select.is_visible():
            # Select GPT-4.1 model
            print(f"📊 Selecting {selected_model} model...")
            page.wait_for_timeout(300)  # Pause before selection

            model_select.select_option(selected_model)
            print(f"✅ Selected {selected_model} model")
            page.wait_for_timeout(300)  # Pause to see selection

            # Verify model stayed selected
            current_value = model_select.input_value()
            if current_value == selected_model:
                print(f"✅ Model confirmed: {current_value}")
            else:
                print(f"⚠️ Model is {current_value}, expected {selected_model}")
            page.wait_for_timeout(300)  # Final pause

        screenshot_with_markdown(page, "02_api_configured", {
            "Status": "API Configured",
            "Provider": ACTIVE_TEST_CONFIG["provider_value"],
            "Model": selected_model,  # Use the actual selected model
            "YOLO": "Enabled"
        })

        # Close settings with pause
        page.wait_for_timeout(300)  # Pause before closing
        page.locator("#close-settings").click()
        self.dramatic_pause(page, 500, "Settings saved")

        # === STEP 3: Create System Prompt ===
        self.log_step("Create System Prompt", "Ask AI for rebel mission prompt")

        # Type message asking for system prompt - simpler and more direct
        prompt_request = "gimme system prompt for rebel mission to blow up death star"

        # Type with natural human-like speed
        self.type_naturally(page, "#message-input", prompt_request)

        self.dramatic_pause(page, 500, "Message typed")
        screenshot_with_markdown(page, "03_prompt_request", {
            "Status": "Requesting system prompt",
            "Message": prompt_request[:50] + "..."
        })

        # Send message
        self.highlight_element(page, "#send-btn")
        page.locator("#send-btn").click()

        # Wait for response
        print("⏳ Waiting for AI response...")
        try:
            page.wait_for_function(
                "() => !document.querySelector('#send-btn').hasAttribute('data-generating')",
                timeout=30000
            )
            self.dramatic_pause(page, 2000, "AI response received")

            # Wait for the assistant message to appear
            page.wait_for_selector(".message.assistant .message-content", state="visible", timeout=5000)

            # Get the response
            response = page.locator(".message.assistant .message-content").last
            response_text = response.inner_text()
        except Exception as e:
            print(f"⚠️ Failed to get AI response, using fallback prompt")
            response_text = """MISSION BRIEFING: OPERATION DEATH STAR

You are a Rebel Alliance operative on a critical mission to destroy the Death Star.

Primary Objective: Guide the attack run on the Death Star's thermal exhaust port.
Secondary Objectives:
- Coordinate rebel squadrons
- Monitor Imperial defenses
- Execute precision targeting
- Ensure the survival of key personnel

Remember: The fate of the galaxy rests in your hands. May the Force be with you."""
        print(f"📝 AI Response Preview: {response_text[:100]}...")

        screenshot_with_markdown(page, "04_prompt_response", {
            "Status": "System prompt generated",
            "Response Length": f"{len(response_text)} characters"
        })

        # === STEP 4: Save as System Prompt ===
        self.log_step("Save System Prompt", "Save the response as 'Mission' prompt")

        # Open prompts modal
        self.highlight_element(page, "#prompts-btn")
        page.locator("#prompts-btn").click()
        self.dramatic_pause(page, 1000, "Opening prompts modal...")

        # Add new prompt
        if page.locator("#add-prompt-btn").is_visible():
            page.locator("#add-prompt-btn").click()
            self.dramatic_pause(page, 500)

            # Fill prompt details
            page.locator("#prompt-name").fill("Mission: Destroy Death Star")
            page.locator("#prompt-content").fill(response_text)

            # Save prompt
            page.locator("#save-prompt-btn").click()
            self.dramatic_pause(page, 1000, "Prompt saved")

        screenshot_with_markdown(page, "05_prompt_saved", {
            "Status": "System prompt saved",
            "Name": "Mission: Destroy Death Star"
        })

        # Close prompts modal
        page.locator("#close-prompts-modal").click()
        self.dramatic_pause(page, 500)

        # === STEP 5: Create Function ===
        self.log_step("Create Torpedo Function", "Create blow_up_death_star function")

        # Open function modal
        self.highlight_element(page, "#function-btn")
        page.locator("#function-btn").click()
        self.dramatic_pause(page, 1000, "Opening function editor...")

        # Create the function
        function_code = '''/**
 * @tool
 * Fires a proton torpedo at the Death Star's exhaust port
 * @param {string} torpedo - Type of torpedo to fire
 * @returns {string} Result of the attack
 */
function blow_up_death_star(torpedo) {
    console.log(`Firing ${torpedo} at exhaust port...`);
    console.log("Use the Force, Luke!");
    return "💥💥💥 BOOOOOOOOOOOOM!!!! 💥💥💥\\nDeath Star destroyed! The Rebellion wins!";
}'''

        code_editor = page.locator("#function-code")
        code_editor.fill(function_code)
        self.dramatic_pause(page, 2000, "Function code entered")

        # Validate function
        self.highlight_element(page, "#function-validate-btn")
        page.locator("#function-validate-btn").click()
        self.dramatic_pause(page, 1000, "Validating function...")

        # Check for success
        validation_result = page.locator("#validation-result")
        if validation_result.is_visible():
            validation_text = validation_result.inner_text()
            print(f"✅ Function validation: {validation_text}")

        screenshot_with_markdown(page, "06_function_created", {
            "Status": "Function created and validated",
            "Function": "blow_up_death_star"
        })

        # Save the function - look for the save/submit button after validation
        self.dramatic_pause(page, 500, "Looking for save button...")

        # Try different button selectors that might appear after validation
        save_selectors = [
            "button:has-text('Save Function')",
            "button:has-text('Add Function')",
            "button:has-text('Save')",
            "#save-function-btn",
            "#add-function-btn",
            "#function-editor-form button[type='submit']",
            ".modal-footer button.primary",
            ".modal-footer button:not(#close-function-modal)"
        ]

        saved = False
        for selector in save_selectors:
            try:
                btn = page.locator(selector).first
                if btn.is_visible(timeout=500):
                    print(f"✅ Found save button with selector: {selector}")
                    self.highlight_element(page, selector)
                    btn.click()
                    saved = True
                    self.dramatic_pause(page, 1000, "Function saved!")
                    break
            except:
                continue

        if not saved:
            print("⚠️ Could not find save button, trying to close modal...")
            page.locator("#close-function-modal").click()

        # Wait for modal to actually close or for function to be saved
        try:
            # Either modal closes or we see a success message
            page.wait_for_selector("#function-modal", state="hidden", timeout=3000)
            print("✅ Function modal closed")
        except:
            # If modal is still open, force close it
            print("⚠️ Modal still open, force closing...")
            page.locator("#close-function-modal").click()
            page.wait_for_timeout(500)

        # === STEP 6: Trigger the Function ===
        self.log_step("Execute Mission", "Send the attack command")

        # Clear chat for dramatic effect
        if page.locator("#clear-chat-btn").is_visible():
            page.locator("#clear-chat-btn").click()
            page.wait_for_timeout(500)

        # Send the trigger message with dramatic typing
        # Short powerful command that triggers the function
        trigger_message = "DO IT!! LAUNCH!!!"

        # Type with natural speed
        self.type_naturally(page, "#message-input", trigger_message)

        self.dramatic_pause(page, 1000, "Ready to fire...")

        screenshot_with_markdown(page, "07_trigger_message", {
            "Status": "Attack command ready",
            "Message": trigger_message
        })

        # Send the message
        self.highlight_element(page, "#send-btn")
        page.locator("#send-btn").click()

        # === STEP 7: Function Auto-Execution with YOLO ===
        self.log_step("Function Execution", "YOLO mode - auto-launching torpedo!")

        # With YOLO mode, function executes automatically - no modal!
        print("🎯 YOLO mode active - function auto-executing!")
        self.dramatic_pause(page, 1500, "Target acquired!")

        screenshot_with_markdown(page, "08_auto_execution", {
            "Status": "Auto-executing function",
            "Function": "blow_up_death_star",
            "Mode": "YOLO - No approval needed!"
        })

        # Dramatic pause while function executes
        self.dramatic_pause(page, 2000, "Targeting exhaust port...")

        # === STEP 8: Victory! ===
        self.log_step("Mission Complete", "Death Star destroyed!")

        # Wait for response
        page.wait_for_function(
            "() => !document.querySelector('#send-btn').hasAttribute('data-generating')",
            timeout=30000
        )
        self.dramatic_pause(page, 2000, "Explosion in progress...")

        # Get the final response
        final_response = page.locator(".message.assistant .message-content").last
        if final_response.is_visible():
            victory_message = final_response.inner_text()
            print(f"\n🎆 VICTORY: {victory_message}")

        # Scroll to show the result
        self.smooth_scroll_to(page, ".message.assistant:last-child")

        screenshot_with_markdown(page, "09_mission_complete", {
            "Status": "MISSION ACCOMPLISHED",
            "Result": "Death Star destroyed",
            "Rebels": "Victorious"
        })

        # Final dramatic pause
        self.dramatic_pause(page, 3000, "The Force is with us!")

    def _save_console_logs(self):
        """Save console logs to JSON file"""
        console_log = {
            'story': 'rebel_mission',
            'timestamp': datetime.now().isoformat(),
            'duration': time.time() - self.start_time if self.start_time else 0,
            'steps': self.story_steps,
            'console_messages': self.console_messages,
            'video_path': f"{self.video_path}.webm"
        }

        log_path = f"{self.video_path}_console.json"
        with open(log_path, 'w') as f:
            json.dump(console_log, f, indent=2)

        print(f"📊 Console log saved to: {log_path}")

    def _rename_video_file(self, video_dir):
        """Rename the auto-generated video file to our custom name"""
        import glob
        import shutil

        # Find the most recent video file
        video_files = glob.glob(str(video_dir / "*.webm"))
        if video_files:
            latest_video = max(video_files, key=os.path.getctime)
            target_path = f"{self.video_path}.webm"

            if latest_video != target_path:
                shutil.move(latest_video, target_path)
                print(f"📹 WebM saved to: {target_path}")

            # Convert to presentation-optimized MP4
            self._convert_to_presentation_mp4(target_path)

    def _convert_to_presentation_mp4(self, webm_path):
        """Convert WebM to presentation-optimized MP4"""
        import subprocess
        import os

        mp4_path = webm_path.replace('.webm', '_presentation.mp4')

        # Check if ffmpeg is available
        try:
            subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("⚠️ FFmpeg not found. Install it for MP4 conversion.")
            return

        print("🎬 Converting to presentation-optimized MP4...")

        # Presentation-optimized conversion command
        # - Scale to 854x666 for smaller file size
        # - 15 fps for smooth UI demos
        # - H.264 codec for universal compatibility
        # - CRF 28 for balanced quality/size
        # - No audio (most demos don't need it)
        cmd = [
            'ffmpeg',
            '-i', webm_path,
            '-vf', 'scale=854:666',  # Reduced resolution
            '-r', '15',  # Reduced framerate
            '-c:v', 'h264',  # H.264 codec
            '-preset', 'slow',  # Better compression
            '-crf', '28',  # Balanced quality
            '-pix_fmt', 'yuv420p',  # Compatibility
            '-movflags', '+faststart',  # Instant playback
            '-an',  # No audio
            '-y',  # Overwrite output
            mp4_path
        ]

        try:
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode == 0:
                # Get file sizes
                webm_size = os.path.getsize(webm_path) / (1024 * 1024)  # MB
                mp4_size = os.path.getsize(mp4_path) / (1024 * 1024)  # MB

                print(f"✅ MP4 created: {mp4_path}")
                print(f"📦 Size: {webm_size:.1f}MB → {mp4_size:.1f}MB")

                # Remove original WebM
                os.remove(webm_path)
                print(f"🗑️ Removed original WebM")
            else:
                print(f"❌ FFmpeg error: {result.stderr}")
        except Exception as e:
            print(f"❌ Conversion failed: {e}")


def test_rebel_mission_story():
    """Pytest-compatible test function"""
    story = RebelMissionStory(headless=False, slowmo=100)
    story.run_story()


if __name__ == "__main__":
    # Allow running directly or with custom options
    import argparse

    parser = argparse.ArgumentParser(description="Run the Rebel Mission user story")
    parser.add_argument("--headless", action="store_true", help="Run in headless mode")
    parser.add_argument("--slowmo", type=int, default=100, help="Slow motion delay in ms")
    parser.add_argument("--width", type=int, default=1280, help="Video width")
    parser.add_argument("--height", type=int, default=720, help="Video height")

    args = parser.parse_args()

    story = RebelMissionStory(
        headless=args.headless,
        slowmo=args.slowmo,
        video_size={'width': args.width, 'height': args.height}
    )

    story.run_story()