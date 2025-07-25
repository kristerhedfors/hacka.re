"""
Debug test for model selection modal mouse click issue.
Keyboard selection works but mouse clicks don't work.
"""

import pytest
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown
import time


def test_model_selection_mouse_click_debug(page: Page, serve_hacka_re, api_key):
    """Debug mouse click issue in model selection modal"""
    
    # Setup console logging
    console_messages = []
    def log_console_message(msg):
        timestamp = time.strftime("%H:%M:%S.%f")[:-3]
        console_messages.append({
            'timestamp': timestamp,
            'type': msg.type,
            'text': msg.text
        })
        print(f"[{timestamp}] Console {msg.type.upper()}: {msg.text}")
    page.on("console", log_console_message)
    
    # Navigate and setup
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Check if settings modal is already open, if not open it
    settings_modal = page.locator("#settings-modal")
    if not settings_modal.get_attribute("class") or "active" not in settings_modal.get_attribute("class"):
        settings_btn = page.locator("#settings-btn")
        settings_btn.click()
    
    api_key_input = page.locator("#api-key")
    api_key_input.fill(api_key)
    
    # Set to OpenAI provider for consistent model list
    provider_select = page.locator("#base-url-select")
    provider_select.select_option("https://api.openai.com/v1")
    
    # Save settings
    save_btn = page.locator("#save-settings")
    save_btn.click()
    
    # Wait for settings to save
    page.wait_for_timeout(1000)
    
    screenshot_with_markdown(page, "after_settings_config", {
        "Status": "Settings configured",
        "API Key": "Configured",
        "Provider": "OpenAI"
    })
    
    # Open model selection modal by clicking model display
    model_display = page.locator(".model-name-display")
    expect(model_display).to_be_visible()
    model_display.click()
    
    # Wait for modal to appear
    modal = page.locator("#model-selection-modal")
    expect(modal).to_have_class(lambda class_str: "active" in class_str, timeout=5000)
    
    # Wait for models to load
    page.wait_for_timeout(2000)
    
    screenshot_with_markdown(page, "modal_opened", {
        "Status": "Modal opened",
        "Modal Active": "Yes" if modal.get_attribute("class") and "active" in modal.get_attribute("class") else "No",
        "Console Messages": str(len(console_messages))
    })
    
    # Check if models are loaded
    model_items = page.locator(".model-item")
    model_count = model_items.count()
    print(f"Found {model_count} model items")
    
    if model_count == 0:
        # Try typing to trigger model loading
        search_input = page.locator("#model-search-input")
        search_input.fill("gpt")
        page.wait_for_timeout(1000)
        model_count = model_items.count()
        print(f"After search: {model_count} model items")
    
    assert model_count > 0, "No models found in the modal"
    
    # Get the first visible model
    first_model = model_items.first
    expect(first_model).to_be_visible()
    
    # Get model info for debugging
    model_name = first_model.locator(".model-name").text_content()
    model_id = first_model.get_attribute("data-model-id")
    model_index = first_model.get_attribute("data-index")
    
    print(f"First model: {model_name} (ID: {model_id}, Index: {model_index})")
    
    screenshot_with_markdown(page, "before_mouse_click", {
        "Status": "About to click first model",
        "Model Name": model_name,
        "Model ID": model_id,
        "Model Index": model_index,
        "Model Count": str(model_count)
    })
    
    # Test mouse click
    print("Attempting mouse click on first model...")
    first_model.click()
    
    # Wait a moment and check if modal closed
    page.wait_for_timeout(1000)
    
    modal_still_active = modal.get_attribute("class") and "active" in modal.get_attribute("class")
    
    screenshot_with_markdown(page, "after_mouse_click", {
        "Status": "After mouse click",
        "Modal Still Active": "Yes" if modal_still_active else "No",
        "Console Messages": str(len(console_messages)),
        "Model Selected": model_name
    })
    
    # Test keyboard selection for comparison
    if modal_still_active:
        print("Modal still active, testing keyboard selection...")
        
        # Use arrow keys to navigate
        search_input = page.locator("#model-search-input")
        search_input.focus()
        
        # Press arrow down to highlight first model
        page.keyboard.press("ArrowDown")
        page.wait_for_timeout(500)
        
        # Press Enter to select  
        page.keyboard.press("Enter")
        page.wait_for_timeout(1000)
        
        modal_after_keyboard = modal.get_attribute("class") and "active" in modal.get_attribute("class")
        
        screenshot_with_markdown(page, "after_keyboard_select", {
            "Status": "After keyboard selection",
            "Modal Still Active": "Yes" if modal_after_keyboard else "No",
            "Console Messages": str(len(console_messages))
        })
    
    # Save console messages for analysis
    import json
    with open("_tests/playwright/debug_tests/console_log_model_selection.json", "w") as f:
        json.dump(console_messages, f, indent=2)
    
    # Analyze the issue
    print("\n=== ANALYSIS ===")
    print(f"Model count: {model_count}")
    print(f"Mouse click closed modal: {not modal_still_active}")
    print(f"Console messages: {len(console_messages)}")
    
    for msg in console_messages[-10:]:  # Last 10 messages
        print(f"  {msg['timestamp']} [{msg['type']}] {msg['text']}")