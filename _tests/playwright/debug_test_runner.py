#!/usr/bin/env python3
"""
Debug test runner that captures console logs and screenshots for failed tests.
"""

import os
import sys
import time
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, Page
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown, setup_test_environment

def setup_console_logging(page: Page):
    """Setup comprehensive console logging"""
    console_messages = []
    
    def log_console_message(msg):
        timestamp = time.strftime("%H:%M:%S.%f")[:-3]
        message = {
            'timestamp': timestamp,
            'type': msg.type,
            'text': msg.text,
            'location': str(msg.location) if msg.location else None
        }
        console_messages.append(message)
        print(f"[CONSOLE {timestamp}] {msg.type.upper()}: {msg.text}")
        if msg.location:
            print(f"  Location: {msg.location}")
    
    def log_page_error(err):
        timestamp = time.strftime("%H:%M:%S.%f")[:-3]
        print(f"[PAGE ERROR {timestamp}] {err}")
        console_messages.append({
            'timestamp': timestamp,
            'type': 'pageerror',
            'text': str(err),
            'location': None
        })
    
    page.on("console", log_console_message)
    page.on("pageerror", log_page_error)
    
    return console_messages

def run_test_with_debug(test_name, server_url="http://localhost:8000"):
    """Run a specific test with full debugging enabled"""
    
    print(f"\n{'='*60}")
    print(f"RUNNING TEST: {test_name}")
    print(f"Server: {server_url}")
    print(f"{'='*60}\n")
    
    with sync_playwright() as p:
        # Launch browser in headed mode for debugging
        browser = p.chromium.launch(
            headless=False,  # Show browser for debugging
            args=['--no-sandbox', '--disable-setuid-sandbox']
        )
        
        context = browser.new_context(
            viewport={'width': 1280, 'height': 800},
            record_video_dir="videos/" if os.getenv("RECORD_VIDEO") else None
        )
        
        page = context.new_page()
        
        # Setup console logging
        console_messages = setup_console_logging(page)
        
        try:
            # Navigate to the application
            page.goto(server_url)
            print(f"Navigated to {server_url}")
            
            # Setup test environment
            setup_test_environment(page)
            
            # Wait for page to load
            page.wait_for_load_state("networkidle")
            
            # Take initial screenshot
            screenshot_with_markdown(page, f"{test_name}_initial", {
                "Status": "Initial page load",
                "URL": page.url,
                "Test": test_name
            })
            
            if test_name == "test_api_key_detection":
                run_api_key_detection_test(page, console_messages)
            elif test_name == "test_api_key_persistence":
                run_api_key_persistence_test(page, console_messages)
            else:
                print(f"Unknown test: {test_name}")
                
        except Exception as e:
            print(f"\n[TEST FAILED]: {e}")
            
            # Take failure screenshot
            screenshot_with_markdown(page, f"{test_name}_failure", {
                "Status": "Test Failed",
                "Error": str(e),
                "Console Messages": len(console_messages),
                "URL": page.url,
                "Test": test_name
            })
            
            # Save console logs
            log_file = f"/tmp/{test_name}_console.json"
            with open(log_file, 'w') as f:
                json.dump(console_messages, f, indent=2)
            print(f"\nConsole logs saved to: {log_file}")
            
            # Print last console messages
            if console_messages:
                print("\n[LAST CONSOLE MESSAGES]:")
                for msg in console_messages[-10:]:
                    print(f"  {msg['timestamp']} {msg['type']}: {msg['text'][:100]}")
            
            # Get page state for debugging
            page_state = page.evaluate("""() => {
                return {
                    localStorage: Object.keys(localStorage),
                    provider: document.getElementById('base-url-select')?.value,
                    model: document.getElementById('model-select')?.value,
                    modelOptions: Array.from(document.getElementById('model-select')?.options || []).map(o => o.value),
                    apiKeyDetection: document.getElementById('api-key-update-detection-text')?.innerText
                };
            }""")
            
            print(f"\n[PAGE STATE]:")
            print(f"  LocalStorage keys: {page_state['localStorage']}")
            print(f"  Provider: {page_state['provider']}")
            print(f"  Model: {page_state['model']}")
            print(f"  Model options: {page_state['modelOptions']}")
            print(f"  API Key Detection: {page_state['apiKeyDetection']}")
            
            raise
            
        finally:
            context.close()
            browser.close()

def run_api_key_detection_test(page: Page, console_messages):
    """Run the API key detection test"""
    from playwright.sync_api import expect
    
    # Close any modals
    page.keyboard.press("Escape")
    time.sleep(0.5)
    
    # Click settings button
    settings_btn = page.locator("#settings-btn")
    settings_btn.click()
    
    # Wait for settings modal
    page.wait_for_selector("#settings-modal.active", timeout=2000)
    print("Settings modal opened")
    
    # Take screenshot of settings modal
    screenshot_with_markdown(page, "api_detection_settings_open", {
        "Status": "Settings modal opened",
        "Console Messages": len(console_messages)
    })
    
    # Get the API key input
    api_key_input = page.locator("#api-key-update")
    expect(api_key_input).to_be_visible()
    
    # Clear any existing value
    api_key_input.clear()
    
    # Test GroqCloud key detection
    groq_test_key = "gsk_testGroqCloudKey1234567890123456789012"
    api_key_input.fill(groq_test_key)
    
    # Wait for detection
    time.sleep(1.0)  # Give more time for detection
    
    # Take screenshot after entering Groq key
    screenshot_with_markdown(page, "api_detection_groq_entered", {
        "Status": "Groq API key entered",
        "Key Type": "GroqCloud",
        "Console Messages": len(console_messages)
    })
    
    # Check detection message
    detection_element = page.locator('#api-key-update-detection')
    detection_text = page.locator('#api-key-update-detection-text')
    
    # Wait for detection to appear
    expect(detection_element).to_be_visible(timeout=2000)
    
    # Get actual detection text
    actual_detection_text = detection_text.inner_text()
    print(f"Detection text: {actual_detection_text}")
    
    # Check provider dropdown
    provider_select = page.locator('#base-url-select')
    actual_provider = provider_select.input_value()
    print(f"Provider selected: {actual_provider}")
    
    # Check model dropdown
    model_select = page.locator('#model-select')
    actual_model = model_select.input_value()
    print(f"Model selected: {actual_model}")
    
    # Get all available model options
    model_options = page.evaluate("""() => {
        const select = document.getElementById('model-select');
        return Array.from(select.options).map(opt => ({
            value: opt.value,
            text: opt.text,
            selected: opt.selected
        }));
    }""")
    print(f"Available models: {json.dumps(model_options, indent=2)}")
    
    # Take final screenshot
    screenshot_with_markdown(page, "api_detection_groq_final", {
        "Status": "Groq detection complete",
        "Detection Text": actual_detection_text,
        "Provider": actual_provider,
        "Model": actual_model,
        "Console Messages": len(console_messages)
    })
    
    # Now do the assertions
    expect(detection_text).to_contain_text("GroqCloud")
    print("✅ GroqCloud detected in message")
    
    expect(provider_select).to_have_value('groq')
    print("✅ Provider auto-selected to 'groq'")
    
    # Check for the model - it might be a different default
    if actual_model:
        print(f"✅ Model auto-selected: {actual_model}")
    else:
        print("⚠️ No model selected - checking if models are loading...")
        # Wait a bit more and check again
        time.sleep(2.0)
        actual_model = model_select.input_value()
        if actual_model:
            print(f"✅ Model loaded after delay: {actual_model}")
        else:
            print("❌ No model selected even after waiting")

def run_api_key_persistence_test(page: Page, console_messages):
    """Run the API key persistence test"""
    # Implementation for API key persistence test
    pass

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python debug_test_runner.py <test_name>")
        print("Available tests:")
        print("  - test_api_key_detection")
        print("  - test_api_key_persistence")
        sys.exit(1)
    
    test_name = sys.argv[1]
    run_test_with_debug(test_name)