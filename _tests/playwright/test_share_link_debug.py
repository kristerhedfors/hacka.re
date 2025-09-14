import pytest
import time
import json
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_share_link_debug_output(page: Page, serve_hacka_re):
    """Test share link generation with enhanced debug output"""
    
    # Setup console logging
    console_messages = []
    def log_console(msg):
        console_messages.append({
            'type': msg.type,
            'text': msg.text,
            'args': [str(arg) for arg in msg.args]
        })
        print(f"[CONSOLE {msg.type}]: {msg.text}")
    
    page.on("console", log_console)
    
    # Setup error handling
    page.on("pageerror", lambda error: print(f"[PAGE ERROR]: {error}"))
    
    print("=" * 60)
    print("STARTING SHARE LINK DEBUG TEST")
    print("=" * 60)
    
    # Navigate to the app
    page.goto(serve_hacka_re)
    screenshot_with_markdown(page, "01_initial_load", {
        "Step": "Initial page load",
        "Status": "Page loaded"
    })
    
    # Dismiss welcome modal
    dismiss_welcome_modal(page)
    screenshot_with_markdown(page, "02_welcome_dismissed", {
        "Step": "Welcome modal dismissed",
        "Status": "Ready to configure"
    })
    
    # Add API key first
    print("\n[STEP 1] Adding API key...")
    page.locator("#settings-btn").click()
    page.wait_for_selector("#settings-modal.active", timeout=2000)
    
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill("test-api-key-12345")
    
    # Enable debug mode
    print("\n[STEP 2] Enabling debug mode...")
    debug_checkbox = page.locator("#debug-mode")
    if not debug_checkbox.is_checked():
        debug_checkbox.check()
    
    # Enable Shared Links debug category
    print("\n[STEP 3] Enabling Shared Links debug category...")
    page.wait_for_selector("#debug-categories-dropdown", timeout=2000)
    
    enabled = page.evaluate("""() => {
        const dropdown = document.getElementById("debug-categories-dropdown");
        if (dropdown) {
            const labels = dropdown.querySelectorAll("label");
            for (const label of labels) {
                if (label.textContent.includes("Shared Links")) {
                    const checkbox = label.previousElementSibling || label.querySelector("input[type=checkbox]");
                    if (checkbox && checkbox.type === "checkbox") {
                        checkbox.checked = true;
                        checkbox.dispatchEvent(new Event("change", { bubbles: true }));
                        return true;
                    }
                }
            }
        }
        return false;
    }""")
    
    print(f"Shared Links debug category enabled: {enabled}")
    
    screenshot_with_markdown(page, "03_settings_configured", {
        "Step": "Settings configured",
        "Debug Mode": "Enabled",
        "Shared Links Debug": "Enabled"
    })
    
    # Close settings
    page.locator("#close-settings").click()
    page.wait_for_timeout(500)
    
    # Open share modal
    print("\n[STEP 4] Opening share modal...")
    page.locator("#share-btn").click()
    
    # Wait and check what state the modal is in
    page.wait_for_timeout(1000)
    
    # Check if modal is active
    is_active = page.evaluate("""() => {
        const modal = document.getElementById('share-modal');
        return modal ? modal.classList.contains('active') : false;
    }""")
    
    print(f"Share modal is active: {is_active}")
    
    screenshot_with_markdown(page, "04_share_modal_opened", {
        "Step": "Share modal opened",
        "Modal Active": str(is_active)
    })
    
    # Check what checkboxes are available
    print("\n[STEP 5] Checking available checkboxes...")
    checkboxes = page.evaluate("""() => {
        const modal = document.getElementById('share-modal');
        if (!modal) return [];
        
        const checkboxes = modal.querySelectorAll('input[type="checkbox"]');
        const result = [];
        
        checkboxes.forEach(cb => {
            const label = cb.nextElementSibling || cb.parentElement.querySelector('label');
            result.push({
                id: cb.id,
                checked: cb.checked,
                disabled: cb.disabled,
                label: label ? label.textContent.trim() : 'Unknown'
            });
        });
        
        return result;
    }""")
    
    print("Available checkboxes:")
    for cb in checkboxes:
        print(f"  - {cb['id']}: {cb['label']} (checked={cb['checked']}, disabled={cb['disabled']})")
    
    # Set password
    print("\n[STEP 6] Setting password...")
    password_input = page.locator("#share-password")
    password_input.fill("TestPassword123")
    
    # Find an enabled checkbox to check
    print("\n[STEP 7] Finding an enabled checkbox to check...")
    enabled_checkbox = None
    for cb in checkboxes:
        if not cb['disabled'] and not cb['checked']:
            selector = f"#{cb['id']}"
            checkbox = page.locator(selector)
            if checkbox.is_visible():
                checkbox.check()
                print(f"Checked {cb['id']}: {cb['label']}")
                enabled_checkbox = cb
                break
    
    if not enabled_checkbox:
        # If no unchecked enabled checkboxes, just check if any are already checked
        for cb in checkboxes:
            if cb['checked']:
                print(f"Already checked: {cb['id']}: {cb['label']}")
                enabled_checkbox = cb
                break
    
    if not enabled_checkbox:
        print("WARNING: No enabled checkboxes available to check!")
    
    screenshot_with_markdown(page, "05_ready_to_generate", {
        "Step": "Ready to generate link",
        "Password": "Set",
        "Conversation Data": "Checked"
    })
    
    # Look for generate button
    print("\n[STEP 8] Looking for generate button...")
    
    # Check what buttons are available
    buttons = page.evaluate("""() => {
        const modal = document.getElementById('share-modal');
        if (!modal) return [];
        
        const buttons = modal.querySelectorAll('button');
        const result = [];
        
        buttons.forEach(btn => {
            result.push({
                id: btn.id,
                text: btn.textContent.trim(),
                disabled: btn.disabled,
                visible: btn.offsetParent !== null
            });
        });
        
        return result;
    }""")
    
    print("Available buttons in share modal:")
    for btn in buttons:
        print(f"  - {btn['id']}: '{btn['text']}' (disabled={btn['disabled']}, visible={btn['visible']})")
    
    # Try to find and click generate button
    generate_btn = None
    # First try the buttons we found by text
    for btn in buttons:
        if 'generate' in btn['text'].lower() and not btn['disabled'] and btn['visible']:
            selector = f"#{btn['id']}" if btn['id'] else f"button:has-text('{btn['text']}')"
            try:
                btn_element = page.locator(selector).first
                if btn_element.is_visible():
                    generate_btn = btn_element
                    print(f"Found generate button: {btn['text']} (id={btn['id']})")
                    break
            except:
                continue
    
    # Fallback to known selectors
    if not generate_btn:
        for selector in ["#generate-share-link-btn", "#generate-share-link", "#generate-link-btn"]:
            try:
                btn = page.locator(selector)
                if btn.is_visible():
                    generate_btn = btn
                    print(f"Found generate button with selector: {selector}")
                    break
            except:
                continue
    
    if generate_btn:
        print("\n[STEP 9] Clicking generate button...")
        generate_btn.click()
        
        # Wait for link generation
        page.wait_for_timeout(2000)
        
        # Check if link was generated
        link_container = page.locator("#generated-link-container")
        if link_container.is_visible():
            link_input = page.locator("#generated-link")
            if link_input.is_visible():
                link = link_input.input_value()
                print(f"\n✅ SHARE LINK GENERATED!")
                print(f"Link length: {len(link)} chars")
                print(f"Link preview: {link[:100]}...")
            else:
                print("❌ Link input not visible")
        else:
            print("❌ Link container not visible")
    else:
        print("❌ Could not find generate button!")
    
    screenshot_with_markdown(page, "06_final_state", {
        "Step": "Final state",
        "Link Generated": str(generate_btn is not None)
    })
    
    # Print console messages summary
    print("\n" + "=" * 60)
    print("CONSOLE MESSAGES SUMMARY")
    print("=" * 60)
    error_count = sum(1 for m in console_messages if m['type'] == 'error')
    warning_count = sum(1 for m in console_messages if m['type'] == 'warning')
    
    print(f"Total messages: {len(console_messages)}")
    print(f"Errors: {error_count}")
    print(f"Warnings: {warning_count}")
    
    if error_count > 0:
        print("\nErrors found:")
        for msg in console_messages:
            if msg['type'] == 'error':
                print(f"  - {msg['text']}")
    
    # Check for debug messages in chat
    print("\n" + "=" * 60)
    print("DEBUG MESSAGES IN CHAT")
    print("=" * 60)
    
    debug_messages = page.locator(".message.system .message-content")
    debug_count = debug_messages.count()
    print(f"Debug messages in chat: {debug_count}")
    
    if debug_count > 0:
        print("\nDebug message preview:")
        for i in range(min(3, debug_count)):
            text = debug_messages.nth(i).text_content()
            if text and len(text) > 100:
                print(f"  Message {i+1}: {text[:100]}...")
            elif text:
                print(f"  Message {i+1}: {text}")
    
    print("\n" + "=" * 60)
    print("TEST COMPLETE")
    print("=" * 60)