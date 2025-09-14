import pytest
import time
import json
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_debug_output_reduction(page: Page, serve_hacka_re):
    """Test that debug output is reduced for small encryption operations"""
    
    # Setup comprehensive console logging
    console_messages = []
    errors = []
    encryption_debug_count = 0
    
    def log_console(msg):
        entry = {
            'type': msg.type,
            'text': msg.text,
            'location': msg.location if hasattr(msg, 'location') else None
        }
        console_messages.append(entry)
        
        # Count encryption debug messages
        if 'ENCRYPTION DETAILS' in msg.text:
            nonlocal encryption_debug_count
            encryption_debug_count += 1
            print(f"[ENCRYPTION DEBUG #{encryption_debug_count}]: Input size unknown")
        
        # Print errors immediately
        if msg.type == 'error':
            print(f"[ERROR]: {msg.text}")
            errors.append(msg.text)
    
    page.on("console", log_console)
    page.on("pageerror", lambda error: errors.append(f"PAGE ERROR: {error}"))
    
    print("=" * 80)
    print("DEBUG OUTPUT REDUCTION TEST")
    print("=" * 80)
    print("Goal: Verify encryption debug only shows for share links (>100 chars)")
    print("")
    
    # Navigate to the app
    page.goto(serve_hacka_re)
    page.wait_for_timeout(2000)  # Let initial loads complete
    
    screenshot_with_markdown(page, "01_initial_load", {
        "Test": "Debug Output Reduction",
        "Step": "Initial page load",
        "Goal": "Check for unwanted debug messages"
    })
    
    # Check initial encryption debug count
    print(f"\n[INITIAL LOAD] Encryption debug messages: {encryption_debug_count}")
    
    # Dismiss welcome modal
    dismiss_welcome_modal(page)
    
    # Enable debug mode to see if small encryptions trigger debug
    print("\n[SETUP] Enabling debug mode with Shared Links category...")
    page.locator("#settings-btn").click()
    page.wait_for_selector("#settings-modal.active", timeout=3000)
    
    # Add an API key (small encryption)
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill("test-key-12345")
    print("  ✓ Added API key (small value)")
    
    # Enable debug mode
    debug_checkbox = page.locator("#debug-mode")
    if not debug_checkbox.is_checked():
        debug_checkbox.check()
        print("  ✓ Debug mode enabled")
    
    # Reset count before enabling Shared Links debug
    pre_shared_links_count = encryption_debug_count
    
    # Enable Shared Links debug category
    page.wait_for_selector("#debug-categories-dropdown", timeout=2000)
    
    shared_links_enabled = page.evaluate("""() => {
        const dropdown = document.getElementById("debug-categories-dropdown");
        if (!dropdown) return false;
        
        const labels = dropdown.querySelectorAll("label");
        for (const label of labels) {
            if (label.textContent.includes("Shared Links")) {
                const checkbox = label.previousElementSibling || 
                               label.querySelector("input[type=checkbox]");
                if (checkbox && checkbox.type === "checkbox") {
                    checkbox.checked = true;
                    checkbox.dispatchEvent(new Event("change", { bubbles: true }));
                    return true;
                }
            }
        }
        return false;
    }""")
    
    print(f"  ✓ Shared Links debug enabled: {shared_links_enabled}")
    
    # Close settings
    page.locator("#close-settings").click()
    page.wait_for_timeout(1000)
    
    screenshot_with_markdown(page, "02_debug_enabled", {
        "Step": "Debug mode enabled",
        "Shared Links Debug": "Active",
        "Expected": "No debug for small encryptions"
    })
    
    # Count encryption debug messages added after enabling debug
    post_settings_count = encryption_debug_count - pre_shared_links_count
    print(f"\n[AFTER SETTINGS] Additional encryption debug messages: {post_settings_count}")
    
    # Check debug messages in chat UI
    debug_messages_in_chat = page.locator(".message.system .message-content")
    chat_debug_count = debug_messages_in_chat.count()
    
    print(f"\n[CHAT UI] System messages in chat: {chat_debug_count}")
    
    # Count encryption debug messages in chat
    encryption_in_chat = 0
    for i in range(chat_debug_count):
        msg_text = debug_messages_in_chat.nth(i).text_content()
        if msg_text and "ENCRYPTION DETAILS" in msg_text:
            encryption_in_chat += 1
            # Check the input size mentioned
            if "Input (compressed string):" in msg_text:
                lines = msg_text.split('\n')
                for line in lines:
                    if "Input (compressed string):" in line:
                        print(f"  Found encryption debug in chat for: {line.strip()}")
    
    print(f"  Encryption debug messages in chat: {encryption_in_chat}")
    
    screenshot_with_markdown(page, "03_chat_check", {
        "Step": "Chat UI checked",
        "System Messages": str(chat_debug_count),
        "Encryption Debug": str(encryption_in_chat)
    })
    
    # Now generate a share link to verify debug DOES show for large payloads
    print("\n[TEST] Generating share link (should show debug)...")
    page.locator("#share-btn").click()
    page.wait_for_selector("#share-modal.active", timeout=3000)
    
    # Set password
    page.locator("#share-password").fill("TestDebug123")
    
    # Enable something to share
    checkboxes = page.evaluate("""() => {
        const checkboxes = document.querySelectorAll('#share-modal input[type="checkbox"]:not(:disabled)');
        let enabled = false;
        checkboxes.forEach(cb => {
            if (!cb.checked && !cb.disabled) {
                cb.click();
                enabled = true;
            }
        });
        return enabled;
    }""")
    
    # Reset count before generation
    pre_generation_count = encryption_debug_count
    
    # Generate link
    generate_btn = page.locator("#generate-share-link-btn")
    if not generate_btn.is_visible():
        generate_btn = page.locator("button:has-text('Generate')")
    
    generate_btn.click()
    page.wait_for_timeout(2000)
    
    # Check if debug appeared for share link
    post_generation_count = encryption_debug_count - pre_generation_count
    print(f"  Encryption debug after share link: {post_generation_count} new messages")
    
    # Check chat for new debug messages
    new_chat_debug_count = page.locator(".message.system .message-content").count()
    new_debug_messages = new_chat_debug_count - chat_debug_count
    
    print(f"  New system messages in chat: {new_debug_messages}")
    
    screenshot_with_markdown(page, "04_share_link_generated", {
        "Step": "Share link generated",
        "New Debug Messages": str(new_debug_messages),
        "Should Show Debug": "Yes (>100 chars)"
    })
    
    # Final analysis
    print("\n" + "=" * 80)
    print("TEST RESULTS")
    print("=" * 80)
    
    # Check for unwanted debug (small values)
    unwanted_debug = False
    if encryption_in_chat > 0:
        print("⚠️ ISSUE: Found encryption debug for small values in chat")
        unwanted_debug = True
    
    if post_settings_count > 2:  # Allow a couple for legitimate operations
        print(f"⚠️ ISSUE: Too many encryption debug messages after settings: {post_settings_count}")
        unwanted_debug = True
    
    # Check that share link DOES show debug
    share_link_debug_shown = new_debug_messages > 0
    
    print(f"\n✓ Small value encryption debug suppressed: {not unwanted_debug}")
    print(f"✓ Share link debug shown (>100 chars): {share_link_debug_shown}")
    
    if errors:
        print(f"\n❌ ERRORS FOUND:")
        for error in errors:
            print(f"  - {error}")
    
    # Assertions
    assert not unwanted_debug, "Small encryption operations should not show debug output"
    assert share_link_debug_shown, "Share link generation should show debug output"
    assert len(errors) == 0, f"No errors should occur: {errors}"
    
    print("\n✅ TEST PASSED: Debug output properly limited to share links only")