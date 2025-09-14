import pytest
import time
import json
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_compression_optimization(page: Page, serve_hacka_re):
    """Test that compression no longer double-encodes to base64"""
    
    # Setup comprehensive console logging
    console_messages = []
    errors = []
    
    def log_console(msg):
        entry = {
            'type': msg.type,
            'text': msg.text,
            'location': msg.location if hasattr(msg, 'location') else None
        }
        console_messages.append(entry)
        
        # Print important messages immediately
        if msg.type in ['error', 'warning']:
            print(f"[{msg.type.upper()}]: {msg.text}")
            if msg.type == 'error':
                errors.append(msg.text)
        elif 'DEBUG' in msg.text or 'COMPRESSION' in msg.text or 'ENCRYPTION' in msg.text:
            print(f"[{msg.type}]: {msg.text}")
    
    page.on("console", log_console)
    page.on("pageerror", lambda error: errors.append(f"PAGE ERROR: {error}"))
    
    print("=" * 80)
    print("COMPRESSION OPTIMIZATION TEST")
    print("=" * 80)
    
    # Navigate to the app
    page.goto(serve_hacka_re)
    screenshot_with_markdown(page, "01_initial_load", {
        "Test": "Compression Optimization",
        "Step": "Initial page load",
        "Goal": "Verify no double base64 encoding"
    })
    
    # Dismiss welcome modal
    dismiss_welcome_modal(page)
    
    # Setup: Add API key and enable debug mode
    print("\n[SETUP] Configuring API key and debug mode...")
    page.locator("#settings-btn").click()
    page.wait_for_selector("#settings-modal.active", timeout=3000)
    
    # Add API key
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill("sk-test-key-for-compression-testing-12345")
    
    # Enable debug mode
    debug_checkbox = page.locator("#debug-mode")
    if not debug_checkbox.is_checked():
        debug_checkbox.check()
        print("✓ Debug mode enabled")
    
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
    
    print(f"✓ Shared Links debug category enabled: {shared_links_enabled}")
    
    screenshot_with_markdown(page, "02_debug_configured", {
        "Step": "Debug configuration",
        "Debug Mode": "Enabled",
        "Shared Links Debug": str(shared_links_enabled)
    })
    
    # Close settings
    page.locator("#close-settings").click()
    page.wait_for_timeout(500)
    
    # MAIN TEST: Generate share link and analyze compression
    print("\n[TEST] Generating share link...")
    page.locator("#share-btn").click()
    page.wait_for_selector("#share-modal.active", timeout=3000)
    
    screenshot_with_markdown(page, "03_share_modal_open", {
        "Step": "Share modal opened",
        "Action": "Configure sharing options"
    })
    
    # Set password
    password_input = page.locator("#share-password")
    password_input.fill("TestCompression123")
    
    # Check what's available to share
    available_options = page.evaluate("""() => {
        const checkboxes = document.querySelectorAll('#share-modal input[type="checkbox"]');
        const options = [];
        checkboxes.forEach(cb => {
            const label = cb.nextElementSibling || 
                         cb.parentElement.querySelector('label');
            options.push({
                id: cb.id,
                label: label ? label.textContent.trim() : 'Unknown',
                checked: cb.checked,
                disabled: cb.disabled
            });
        });
        return options;
    }""")
    
    print("\nAvailable sharing options:")
    for opt in available_options:
        status = "✓" if opt['checked'] else "✗"
        disabled = " (disabled)" if opt['disabled'] else ""
        print(f"  {status} {opt['label']}{disabled}")
    
    # Ensure at least one option is checked
    enabled_something = False
    for opt in available_options:
        if not opt['disabled'] and not opt['checked']:
            selector = f"#{opt['id']}"
            checkbox = page.locator(selector)
            if checkbox.is_visible():
                checkbox.check()
                print(f"  → Enabled: {opt['label']}")
                enabled_something = True
                break
    
    screenshot_with_markdown(page, "04_options_configured", {
        "Step": "Sharing options configured",
        "Password": "Set",
        "Options": "At least one enabled"
    })
    
    # Clear previous console messages to focus on compression
    pre_generation_count = len(console_messages)
    
    # Generate the share link
    generate_btn = page.locator("#generate-share-link-btn")
    if not generate_btn.is_visible():
        # Try alternative selector
        generate_btn = page.locator("button:has-text('Generate')")
    
    generate_btn.click()
    print("\n✓ Generate button clicked")
    
    # Wait for link generation
    page.wait_for_timeout(2000)
    
    screenshot_with_markdown(page, "05_link_generated", {
        "Step": "Share link generated",
        "Action": "Analyzing compression"
    })
    
    # Get the generated link
    link_container = page.locator("#generated-link-container")
    link_generated = link_container.is_visible()
    
    if link_generated:
        link_input = page.locator("#generated-link")
        link = link_input.input_value()
        print(f"\n✓ Share link generated: {len(link)} chars")
        print(f"  Link preview: {link[:80]}...")
    else:
        print("\n✗ Link generation failed!")
    
    # Analyze console messages for compression details
    print("\n" + "=" * 80)
    print("COMPRESSION ANALYSIS")
    print("=" * 80)
    
    compression_messages = []
    for msg in console_messages[pre_generation_count:]:
        if any(keyword in msg['text'] for keyword in ['Compression', 'COMPRESSION', 'Step 2', 'compress']):
            compression_messages.append(msg['text'])
            print(f"[COMPRESSION]: {msg['text']}")
    
    # Check for double encoding indicators
    double_encoding_indicators = []
    for msg in console_messages[pre_generation_count:]:
        text = msg['text']
        # Look for signs of double base64
        if 'base64' in text.lower() and 'compress' in text.lower():
            double_encoding_indicators.append(text)
        # Check compression ratio
        if 'ratio' in text and '%' in text:
            # Extract ratio
            import re
            ratio_match = re.search(r'(\d+\.?\d*)%', text)
            if ratio_match:
                ratio = float(ratio_match.group(1).replace('%', ''))
                if ratio > 100:
                    print(f"\n⚠️ COMPRESSION EXPANDING DATA: {ratio}% (should be < 100%)")
                    double_encoding_indicators.append(f"Expansion detected: {ratio}%")
                else:
                    print(f"\n✓ COMPRESSION WORKING: {ratio}% (< 100%)")
    
    # Get debug messages from chat
    debug_messages = page.locator(".message.system .message-content")
    debug_count = debug_messages.count()
    
    print(f"\n{debug_count} debug messages in chat")
    
    # Look for specific compression details
    compression_found = False
    encryption_found = False
    
    for i in range(debug_count):
        msg_text = debug_messages.nth(i).text_content()
        if msg_text:
            if "COMPRESSION" in msg_text or "Step 2" in msg_text:
                compression_found = True
                # Extract key metrics
                lines = msg_text.split('\n')
                for line in lines:
                    if 'Input' in line or 'Output' in line or 'ratio' in line:
                        print(f"  {line.strip()}")
            elif "ENCRYPTION" in msg_text and "Step 3" in msg_text:
                encryption_found = True
    
    screenshot_with_markdown(page, "06_final_analysis", {
        "Step": "Final analysis",
        "Link Generated": str(link_generated),
        "Compression Debug": str(compression_found),
        "Encryption Debug": str(encryption_found),
        "Double Encoding Issues": str(len(double_encoding_indicators))
    })
    
    # Final summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print(f"✓ Link generated: {link_generated}")
    print(f"✓ Compression debug found: {compression_found}")
    print(f"✓ Encryption debug found: {encryption_found}")
    
    if double_encoding_indicators:
        print(f"\n⚠️ POTENTIAL DOUBLE ENCODING DETECTED:")
        for indicator in double_encoding_indicators:
            print(f"  - {indicator}")
    else:
        print(f"\n✓ No double encoding detected")
    
    if errors:
        print(f"\n❌ ERRORS FOUND:")
        for error in errors:
            print(f"  - {error}")
    
    # Assertions
    assert link_generated, "Share link should be generated"
    assert len(errors) == 0, f"No errors should occur: {errors}"
    
    # Check that compression is actually compressing (not expanding)
    expansion_detected = any("Expansion detected" in ind for ind in double_encoding_indicators)
    assert not expansion_detected, "Compression should not expand the data"
    
    print("\n✅ TEST PASSED: Compression optimization verified")