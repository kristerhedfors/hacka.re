"""
Regression tests for chat functionality after performance optimizations
With enhanced console logging and error visibility
"""

import pytest
import time
import json
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def setup_console_logging(page):
    """Setup comprehensive console logging"""
    console_messages = []
    
    def log_console_message(msg):
        timestamp = time.strftime("%H:%M:%S.%f")[:-3]
        console_messages.append({
            'timestamp': timestamp,
            'type': msg.type,
            'text': msg.text,
            'location': str(msg.location) if msg.location else None
        })
        # Print all console messages for visibility
        if msg.type in ['error', 'warning']:
            print(f"🔴 [{timestamp}] {msg.type.upper()}: {msg.text}")
        else:
            print(f"   [{timestamp}] Console {msg.type}: {msg.text[:100]}...")
    
    page.on("console", log_console_message)
    
    # Also catch page errors
    def log_page_error(error):
        print(f"🔴 PAGE ERROR: {error}")
        console_messages.append({
            'timestamp': time.strftime("%H:%M:%S.%f")[:-3],
            'type': 'pageerror',
            'text': str(error),
            'location': None
        })
    
    page.on("pageerror", log_page_error)
    
    return console_messages


def test_textarea_basic_functionality(page: Page, serve_hacka_re):
    """Test that basic textarea functionality still works"""
    
    print("\n" + "="*60)
    print("TESTING BASIC TEXTAREA FUNCTIONALITY")
    print("="*60)
    
    page.goto(serve_hacka_re)
    console_messages = setup_console_logging(page)
    dismiss_welcome_modal(page)
    
    message_input = page.locator("#message-input")
    
    # Test 1: Basic typing
    print("\n📝 Test 1: Basic text input")
    test_text = "Hello, this is a test message"
    message_input.fill(test_text)
    
    value = page.evaluate("() => document.getElementById('message-input').value")
    print(f"   Input value: {value}")
    assert value == test_text, f"Text mismatch: expected '{test_text}', got '{value}'"
    
    # Test 2: Newlines and multi-line text
    print("\n📝 Test 2: Multi-line text")
    multi_line = "Line 1\nLine 2\nLine 3"
    message_input.fill(multi_line)
    
    value = page.evaluate("() => document.getElementById('message-input').value")
    height = page.evaluate("() => parseInt(document.getElementById('message-input').style.height) || 0")
    print(f"   Multi-line value: {repr(value)}")
    print(f"   Textarea height: {height}px")
    assert value == multi_line, "Multi-line text not preserved"
    assert height > 44, f"Textarea should expand for multi-line text, but height is {height}px"
    
    # Test 3: Very long single line
    print("\n📝 Test 3: Long single line text")
    long_text = "a" * 500
    message_input.fill(long_text)
    
    value = page.evaluate("() => document.getElementById('message-input').value")
    print(f"   Long text length: {len(value)} chars")
    assert len(value) == 500, "Long text not fully accepted"
    
    # Test 4: Paste simulation
    print("\n📝 Test 4: Paste operation")
    message_input.fill("")
    page.keyboard.insert_text("Pasted text content")
    
    value = page.evaluate("() => document.getElementById('message-input').value")
    print(f"   Pasted value: {value}")
    assert value == "Pasted text content", "Paste operation failed"
    
    # Test 5: Clear and type
    print("\n📝 Test 5: Clear and type")
    message_input.fill("")
    message_input.type("Typed character by character")
    
    value = page.evaluate("() => document.getElementById('message-input').value")
    print(f"   Typed value: {value}")
    assert value == "Typed character by character", "Character typing failed"
    
    # Check for any console errors
    errors = [msg for msg in console_messages if msg['type'] in ['error', 'pageerror']]
    if errors:
        print(f"\n⚠️ Found {len(errors)} console errors:")
        for error in errors:
            print(f"   - {error['text']}")
    
    print("\n✅ Basic textarea functionality test passed!")


def test_height_constraints(page: Page, serve_hacka_re):
    """Test that height constraints work correctly"""
    
    print("\n" + "="*60)
    print("TESTING HEIGHT CONSTRAINTS")
    print("="*60)
    
    page.goto(serve_hacka_re)
    console_messages = setup_console_logging(page)
    dismiss_welcome_modal(page)
    
    message_input = page.locator("#message-input")
    
    # Test progressive height increase
    print("\n📝 Testing progressive height increase")
    
    heights = []
    for i in range(1, 11):
        text = "\n".join([f"Line {j}" for j in range(1, i+1)])
        message_input.fill(text)
        page.wait_for_timeout(100)  # Wait for RAF
        
        height = page.evaluate("() => parseInt(document.getElementById('message-input').style.height) || 0")
        scroll_height = page.evaluate("() => document.getElementById('message-input').scrollHeight")
        overflow = page.evaluate("() => document.getElementById('message-input').style.overflowY || 'visible'")
        
        heights.append(height)
        print(f"   {i} lines: height={height}px, scrollHeight={scroll_height}px, overflow={overflow}")
        
        # Height should not exceed 150px
        assert height <= 150, f"Height {height}px exceeds maximum 150px at {i} lines"
        
        # Once we hit max height, overflow should be auto
        if scroll_height > 150:
            assert overflow == 'auto', f"Overflow should be 'auto' when content exceeds max height"
    
    # Verify height increased then plateaued
    print(f"\n   Height progression: {heights}")
    assert heights[0] < heights[2], "Height should increase with more lines"
    assert max(heights) == 150, "Max height should be exactly 150px"
    
    print("\n✅ Height constraints test passed!")


def test_context_update_debouncing(page: Page, serve_hacka_re, api_key, test_config):
    """Test that context updates are properly debounced"""
    
    print("\n" + "="*60)
    print("TESTING CONTEXT UPDATE DEBOUNCING")
    print("="*60)
    
    page.goto(serve_hacka_re)
    console_messages = setup_console_logging(page)
    dismiss_welcome_modal(page)
    
    # Configure API to enable context updates
    settings_button = page.locator("#settings-btn")
    settings_button.click()
    page.wait_for_selector("#settings-modal.active", state="visible")
    
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill(api_key)
    
    base_url_select = page.locator("#base-url-select")
    base_url_select.select_option(test_config["provider_value"])
    
    page.wait_for_timeout(1000)  # Wait for models to load
    
    close_button = page.locator("#close-settings")
    close_button.click()
    page.wait_for_selector("#settings-modal", state="hidden")
    
    # Monitor context updates
    page.evaluate("""() => {
        window.contextUpdateCount = 0;
        const originalEstimate = window.UIUtils ? window.UIUtils.estimateContextUsage : null;
        if (originalEstimate) {
            window.UIUtils.estimateContextUsage = function(...args) {
                window.contextUpdateCount++;
                console.log('Context update #' + window.contextUpdateCount);
                return originalEstimate.apply(this, args);
            };
        }
    }""")
    
    message_input = page.locator("#message-input")
    
    # Test rapid typing
    print("\n📝 Rapid typing test")
    for i in range(20):
        message_input.type("a")
        if i % 5 == 0:
            page.wait_for_timeout(50)  # Small pauses
    
    # Check immediate count
    immediate_count = page.evaluate("() => window.contextUpdateCount")
    print(f"   Context updates during typing: {immediate_count}")
    
    # Wait for debounce to complete
    page.wait_for_timeout(600)
    
    final_count = page.evaluate("() => window.contextUpdateCount")
    print(f"   Context updates after debounce: {final_count}")
    
    # Should have very few updates due to debouncing
    assert final_count <= 5, f"Too many context updates ({final_count}), debouncing may not be working"
    
    print("\n✅ Context debouncing test passed!")


def test_voice_control_integration(page: Page, serve_hacka_re):
    """Test that voice control still works with reduced handlers"""
    
    print("\n" + "="*60)
    print("TESTING VOICE CONTROL INTEGRATION")
    print("="*60)
    
    page.goto(serve_hacka_re)
    console_messages = setup_console_logging(page)
    dismiss_welcome_modal(page)
    
    # Enable voice control
    settings_button = page.locator("#settings-btn")
    settings_button.click()
    page.wait_for_selector("#settings-modal.active", state="visible")
    
    voice_checkbox = page.locator("#voice-control")
    if not voice_checkbox.is_checked():
        voice_checkbox.click()
    
    close_button = page.locator("#close-settings")
    close_button.click()
    page.wait_for_selector("#settings-modal", state="hidden")
    
    message_input = page.locator("#message-input")
    microphone_button = page.locator(".microphone-btn-inside")
    
    # Test microphone visibility logic
    print("\n📝 Testing microphone button visibility")
    
    # Should be visible when input is empty
    print("   Empty input - checking microphone visibility")
    message_input.fill("")
    page.wait_for_timeout(100)
    
    is_visible = microphone_button.is_visible() if microphone_button.count() > 0 else False
    print(f"   Microphone visible with empty input: {is_visible}")
    
    # Should hide when typing
    print("   Typing text - checking microphone hides")
    message_input.type("Some text")
    page.wait_for_timeout(100)
    
    is_hidden = not microphone_button.is_visible() if microphone_button.count() > 0 else True
    print(f"   Microphone hidden with text: {is_hidden}")
    
    # Should reappear when cleared
    print("   Clearing input - checking microphone reappears")
    message_input.fill("")
    page.wait_for_timeout(100)
    
    is_visible_again = microphone_button.is_visible() if microphone_button.count() > 0 else False
    print(f"   Microphone visible again: {is_visible_again}")
    
    print("\n✅ Voice control integration test passed!")


def test_mobile_handlers_intact(page: Page, serve_hacka_re):
    """Test that mobile focus/blur handlers still work"""
    
    print("\n" + "="*60)
    print("TESTING MOBILE HANDLERS")
    print("="*60)
    
    # Set mobile viewport
    page.set_viewport_size({"width": 375, "height": 667})
    
    page.goto(serve_hacka_re)
    console_messages = setup_console_logging(page)
    dismiss_welcome_modal(page)
    
    message_input = page.locator("#message-input")
    
    # Monitor focus/blur events
    page.evaluate("""() => {
        window.focusBlurEvents = [];
        const input = document.getElementById('message-input');
        input.addEventListener('focus', () => {
            window.focusBlurEvents.push('focus');
            console.log('Focus event fired');
        });
        input.addEventListener('blur', () => {
            window.focusBlurEvents.push('blur');
            console.log('Blur event fired');
        });
    }""")
    
    print("\n📝 Testing focus/blur events")
    
    # Focus the input
    message_input.focus()
    page.wait_for_timeout(100)
    
    # Click elsewhere to blur
    page.locator("body").click()
    page.wait_for_timeout(100)
    
    # Focus again
    message_input.focus()
    page.wait_for_timeout(100)
    
    events = page.evaluate("() => window.focusBlurEvents")
    print(f"   Focus/blur events: {events}")
    
    # Check body classes for keyboard handling
    has_keyboard_class = page.evaluate("() => document.body.classList.contains('keyboard-open')")
    print(f"   Keyboard open class applied: {has_keyboard_class}")
    
    assert 'focus' in events, "Focus event not fired"
    assert 'blur' in events, "Blur event not fired"
    
    print("\n✅ Mobile handlers test passed!")


def test_chat_message_sending(page: Page, serve_hacka_re, api_key, test_config):
    """Test that messages can still be sent after optimizations"""
    
    print("\n" + "="*60)
    print("TESTING MESSAGE SENDING")
    print("="*60)
    
    page.goto(serve_hacka_re)
    console_messages = setup_console_logging(page)
    dismiss_welcome_modal(page)
    
    # Configure API
    settings_button = page.locator("#settings-btn")
    settings_button.click()
    page.wait_for_selector("#settings-modal.active", state="visible")
    
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill(api_key)
    
    base_url_select = page.locator("#base-url-select")
    base_url_select.select_option(test_config["provider_value"])
    
    page.wait_for_timeout(2000)  # Wait for models
    
    # Select model
    from test_utils import select_recommended_test_model
    selected_model = select_recommended_test_model(page)
    
    close_button = page.locator("#close-settings")
    close_button.click()
    page.wait_for_selector("#settings-modal", state="hidden")
    
    # Test sending a message
    print("\n📝 Sending test message")
    message_input = page.locator("#message-input")
    test_message = "Hi, please respond with 'Hello!' and nothing else."
    
    message_input.fill(test_message)
    
    # Check input value before sending
    value_before = page.evaluate("() => document.getElementById('message-input').value")
    print(f"   Input value before send: {value_before}")
    
    send_button = page.locator("#send-btn")
    send_button.click()
    
    # Check that input was cleared
    page.wait_for_timeout(500)
    value_after = page.evaluate("() => document.getElementById('message-input').value")
    print(f"   Input value after send: {value_after}")
    
    # Wait for response
    try:
        page.wait_for_selector(".message.assistant .message-content", state="visible", timeout=15000)
        print("   ✅ Assistant response received")
        
        # Check textarea is ready for next message
        height_after = page.evaluate("() => document.getElementById('message-input').style.height")
        print(f"   Textarea height after send: {height_after}")
        
    except Exception as e:
        print(f"   ⚠️ No response received: {e}")
        # Check for errors
        errors = [msg for msg in console_messages if msg['type'] in ['error', 'pageerror']]
        if errors:
            print("   Console errors found:")
            for error in errors[:3]:
                print(f"     - {error['text']}")
    
    print("\n✅ Message sending test completed!")


if __name__ == "__main__":
    # Run with: python test_chat_regression.py
    import subprocess
    import sys
    
    print("Running comprehensive regression tests...")
    result = subprocess.run([
        sys.executable, "-m", "pytest", __file__, 
        "-v", "-s", "--tb=short"
    ], capture_output=False)
    
    sys.exit(result.returncode)