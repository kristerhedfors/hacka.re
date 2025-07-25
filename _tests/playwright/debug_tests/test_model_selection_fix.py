"""
Test the fix for model selection modal mouse click issue.
"""

import pytest
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown
import time


def test_model_selection_mouse_click_fix(page: Page, serve_hacka_re, api_key):
    """Test that the mouse click fix works in model selection modal"""
    
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
    
    # Configure minimal API setup to enable model selection
    # Use evaluate to configure API key via JavaScript to avoid modal issues
    page.evaluate(f"""
        // Set API key directly in storage to enable model selection
        localStorage.setItem('openai_api_key', '{api_key}');
        localStorage.setItem('base_url', 'https://api.openai.com/v1');
    """)
    
    # Wait for everything to load
    page.wait_for_timeout(3000)
    
    screenshot_with_markdown(page, "after_api_setup", {
        "Status": "API key configured via JavaScript",
        "Console Messages": str(len(console_messages))
    })
    
    # Try to open model selection modal
    # First try the main trigger elements
    selectors_to_try = [".model-name-display", ".model-context", ".model-stats"]
    modal_opened = False
    
    for selector in selectors_to_try:
        element = page.locator(selector)
        if element.count() > 0 and element.is_visible():
            print(f"Clicking {selector} to open modal")
            element.click()
            
            # Check if modal opened
            modal = page.locator("#model-selection-modal")
            page.wait_for_timeout(1000)
            if modal.get_attribute("class") and "active" in modal.get_attribute("class"):
                modal_opened = True
                break
    
    if not modal_opened:
        # Try keyboard shortcut as fallback
        print("Trying keyboard shortcut Cmd+M to open modal")
        page.keyboard.press("Meta+m")
        page.wait_for_timeout(1000)
        
        modal = page.locator("#model-selection-modal")
        modal_opened = modal.get_attribute("class") and "active" in modal.get_attribute("class")
    
    assert modal_opened, "Could not open model selection modal"
    
    # Wait for models to load
    page.wait_for_timeout(3000)
    
    screenshot_with_markdown(page, "modal_opened", {
        "Status": "Modal opened successfully",
        "Console Messages": str(len(console_messages))
    })
    
    # Check if models are loaded
    model_items = page.locator(".model-item")
    page.wait_for_timeout(1000)  # Give time for models to load
    model_count = model_items.count()
    print(f"Found {model_count} model items")
    
    if model_count == 0:
        # Try typing in search to trigger model loading
        search_input = page.locator("#model-search-input")
        search_input.fill("gpt")
        page.wait_for_timeout(2000)
        model_count = model_items.count()
        print(f"After search: {model_count} model items")
    
    assert model_count > 0, f"No models found in modal. Console messages: {len(console_messages)}"
    
    # Test mouse click on first model
    first_model = model_items.first
    expect(first_model).to_be_visible()
    
    # Get model info for debugging
    model_name = first_model.locator(".model-name").text_content()
    model_id = first_model.get_attribute("data-model-id")
    
    print(f"Testing mouse click on: {model_name} (ID: {model_id})")
    
    # Get current model selection before clicking
    current_model_select = page.locator("#model-select")
    current_value = current_model_select.input_value() if current_model_select.count() > 0 else ""
    print(f"Current model before click: {current_value}")
    
    screenshot_with_markdown(page, "before_mouse_click", {
        "Status": "About to test mouse click",
        "Model Name": model_name,
        "Model ID": model_id,
        "Current Model": current_value,
        "Model Count": str(model_count)
    })
    
    # Perform the mouse click
    first_model.click()
    
    # Wait for the action to complete
    page.wait_for_timeout(1500)
    
    # Check results
    modal = page.locator("#model-selection-modal")
    modal_still_active = modal.get_attribute("class") and "active" in modal.get_attribute("class")
    new_model_value = current_model_select.input_value() if current_model_select.count() > 0 else ""
    
    screenshot_with_markdown(page, "after_mouse_click", {
        "Status": "After mouse click",
        "Modal Closed": "Yes" if not modal_still_active else "No",
        "Model Changed": "Yes" if new_model_value != current_value else "No",
        "Old Model": current_value,
        "New Model": new_model_value,
        "Console Messages": str(len(console_messages))
    })
    
    # Save console log for analysis
    import json
    with open("_tests/playwright/debug_tests/console_log_fix_test.json", "w") as f:
        json.dump(console_messages, f, indent=2)
    
    # Verify the fix worked
    print(f"\\n=== RESULTS ===")
    print(f"Modal closed: {not modal_still_active}")
    print(f"Model changed: {new_model_value != current_value}")
    print(f"Old model: {current_value}")  
    print(f"New model: {new_model_value}")
    print(f"Expected model: {model_id}")
    
    # The test should pass if mouse click closed the modal and changed the model
    assert not modal_still_active, "Modal should have closed after mouse click"
    assert new_model_value == model_id, f"Model should have changed to {model_id}, but got {new_model_value}"
    
    print("✅ Mouse click fix successful!")