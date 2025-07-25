"""
Minimal debug test for model selection modal mouse click issue.
Focus only on the modal behavior, using existing API configuration.
"""

import pytest
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown
import time


def test_model_selection_mouse_click_minimal(page: Page, serve_hacka_re):
    """Minimal test to debug mouse click issue in model selection modal"""
    
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
    
    # Wait for page to stabilize
    page.wait_for_timeout(2000)
    
    screenshot_with_markdown(page, "initial_state", {
        "Status": "Page loaded, welcome modal dismissed",
        "Console Messages": str(len(console_messages))
    })
    
    # Try to open model selection modal by clicking model display
    model_display = page.locator(".model-name-display")
    
    # Check if model display is visible
    if model_display.count() == 0:
        print("Model display not found, looking for alternative selectors...")
        # Try alternative selectors
        selectors = [".model-context", ".model-stats", "#current-model"]
        for selector in selectors:
            element = page.locator(selector)
            if element.count() > 0:
                print(f"Found alternative: {selector}")
                model_display = element
                break
    
    if model_display.count() == 0:
        print("No model display found, listing all elements with 'model' in class or id...")
        all_model_elements = page.locator("[class*='model'], [id*='model']")
        count = all_model_elements.count()
        print(f"Found {count} elements with 'model' in class or id")
        for i in range(min(count, 5)):  # Show first 5
            element = all_model_elements.nth(i)
            tag = element.evaluate("el => el.tagName")
            class_name = element.get_attribute("class") or ""
            id_name = element.get_attribute("id") or ""
            text = element.text_content() or ""
            print(f"  {i}: <{tag} class='{class_name}' id='{id_name}'>{text[:50]}...")
        
        pytest.skip("No model display element found to test")
    
    expect(model_display).to_be_visible()
    print(f"Found model display: {model_display.text_content()}")
    
    # Click to open modal
    model_display.click()
    
    # Wait for modal to appear
    modal = page.locator("#model-selection-modal")
    expect(modal).to_have_class(lambda class_str: "active" in class_str, timeout=5000)
    
    # Wait for models to load
    page.wait_for_timeout(3000)
    
    screenshot_with_markdown(page, "modal_opened", {
        "Status": "Modal opened successfully",
        "Modal Active": "Yes" if modal.get_attribute("class") and "active" in modal.get_attribute("class") else "No",
        "Console Messages": str(len(console_messages))
    })
    
    # Check if models are loaded
    model_items = page.locator(".model-item")
    model_count = model_items.count()
    print(f"Found {model_count} model items")
    
    if model_count == 0:
        # Check if there's a loading state or error
        loading_msg = page.locator(".loading-models").text_content()
        error_msg = page.locator(".no-models-found").text_content()
        print(f"Loading message: {loading_msg}")
        print(f"Error message: {error_msg}")
        
        # Try typing to see if it triggers loading
        search_input = page.locator("#model-search-input")
        if search_input.count() > 0:
            search_input.fill("gpt")
            page.wait_for_timeout(2000)
            model_count = model_items.count()
            print(f"After search: {model_count} model items")
    
    if model_count == 0:
        screenshot_with_markdown(page, "no_models_found", {
            "Status": "No models found in modal",
            "Console Messages": str(len(console_messages))
        })
        
        # Save console messages for analysis
        import json
        with open("_tests/playwright/debug_tests/console_log_no_models.json", "w") as f:
            json.dump(console_messages, f, indent=2)
        
        pytest.skip("No models loaded to test mouse click")
    
    # Test mouse click on first model
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
    
    # Before clicking, get current selected model for comparison
    current_model_select = page.locator("#model-select")
    current_value = current_model_select.input_value() if current_model_select.count() > 0 else ""
    print(f"Current model select value: {current_value}")
    
    first_model.click()
    
    # Wait a moment and check if modal closed
    page.wait_for_timeout(1000)
    
    modal_still_active = modal.get_attribute("class") and "active" in modal.get_attribute("class")
    new_model_value = current_model_select.input_value() if current_model_select.count() > 0 else ""
    
    screenshot_with_markdown(page, "after_mouse_click", {
        "Status": "After mouse click",
        "Modal Still Active": "Yes" if modal_still_active else "No",
        "Model Changed": "Yes" if new_model_value != current_value else "No",
        "Old Value": current_value,
        "New Value": new_model_value,
        "Console Messages": str(len(console_messages))
    })
    
    print(f"Mouse click result:")
    print(f"  Modal closed: {not modal_still_active}")
    print(f"  Model changed: {new_model_value != current_value}")
    print(f"  Old value: {current_value}")
    print(f"  New value: {new_model_value}")
    
    # Test keyboard selection for comparison if modal is still open
    if modal_still_active:
        print("Modal still active, testing keyboard selection for comparison...")
        
        # Focus search input first
        search_input = page.locator("#model-search-input")
        search_input.focus()
        
        # Press arrow down to highlight first model
        page.keyboard.press("ArrowDown")
        page.wait_for_timeout(500)
        
        # Press Enter to select
        page.keyboard.press("Enter")
        page.wait_for_timeout(1000)
        
        modal_after_keyboard = modal.get_attribute("class") and "active" in modal.get_attribute("class")
        keyboard_model_value = current_model_select.input_value() if current_model_select.count() > 0 else ""
        
        screenshot_with_markdown(page, "after_keyboard_select", {
            "Status": "After keyboard selection",
            "Modal Still Active": "Yes" if modal_after_keyboard else "No",
            "Model Changed": "Yes" if keyboard_model_value != new_model_value else "No",
            "Final Value": keyboard_model_value,
            "Console Messages": str(len(console_messages))
        })
        
        print(f"Keyboard selection result:")
        print(f"  Modal closed: {not modal_after_keyboard}")
        print(f"  Model changed: {keyboard_model_value != new_model_value}")
        print(f"  Final value: {keyboard_model_value}")
    
    # Save console messages for analysis
    import json
    with open("_tests/playwright/debug_tests/console_log_model_selection.json", "w") as f:
        json.dump(console_messages, f, indent=2)
    
    # Final analysis
    print("\n=== ANALYSIS ===")
    print(f"Total console messages: {len(console_messages)}")
    
    # Show last few console messages for context
    for msg in console_messages[-5:]:
        print(f"  {msg['timestamp']} [{msg['type']}] {msg['text']}")
    
    # The test passes if we can reproduce the issue
    # We expect mouse click to work, so if modal is still active after mouse click, that's the bug
    if modal_still_active and not modal_after_keyboard:
        print("BUG CONFIRMED: Mouse click doesn't work but keyboard selection does")
    elif not modal_still_active:
        print("Mouse click worked properly - modal closed")
    else:
        print("Both mouse and keyboard have issues")