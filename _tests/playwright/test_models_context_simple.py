"""Simple test for models context window display"""

from playwright.sync_api import Page
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown


def test_context_window_display(page: Page, serve_hacka_re, api_key):
    """Test that context window is displayed in the UI"""
    
    # Navigate to the page
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if already open
    dismiss_settings_modal(page)
    
    # Open settings
    settings_btn = page.locator("#settings-btn")
    settings_btn.click()
    page.wait_for_selector("#settings-modal", state="visible")
    
    # Configure OpenAI API
    api_key_input = page.locator("#api-key-input")
    api_key_input.fill(api_key)
    
    # Select OpenAI provider
    provider_select = page.locator("#base-url-select")
    provider_select.select_option(value="openai")
    
    # Wait for models to load
    page.wait_for_timeout(1000)
    
    # Select gpt-4o-mini model
    model_select = page.locator("#model-select")
    model_select.select_option(value="gpt-4o-mini")
    
    # Save settings
    save_button = page.locator("#save-settings-btn")
    save_button.click()
    dismiss_settings_modal(page)
    
    # Check if context window is displayed
    # Look for model info display area
    model_info = page.locator(".model-info")
    if model_info.is_visible():
        model_text = model_info.inner_text()
        print(f"Model info: {model_text}")
        
        # Check console logs for context window detection
        console_logs = []
        page.on("console", lambda msg: console_logs.append(f"{msg.type}: {msg.text}"))
        
        # Trigger a re-render by typing something
        chat_input = page.locator("#chat-input")
        chat_input.fill("Test message")
        page.wait_for_timeout(500)
        
        # Check logs for context window messages
        context_logs = [log for log in console_logs if "context" in log.lower()]
        print(f"Context-related console logs: {context_logs}")
        
        screenshot_with_markdown(page, "context_window_display", {
            "Model": "gpt-4o-mini",
            "Model Info": model_text,
            "Expected Context": "128000 tokens"
        })
    
    # Now test with a different model
    settings_btn.click()
    page.wait_for_selector("#settings-modal", state="visible")
    
    # Select gpt-4 model (should have 8192 context)
    model_select.select_option(value="gpt-4")
    save_button.click()
    dismiss_settings_modal(page)
    
    # Check model info again
    if model_info.is_visible():
        model_text = model_info.inner_text()
        print(f"Model info for gpt-4: {model_text}")
        
        screenshot_with_markdown(page, "context_window_gpt4", {
            "Model": "gpt-4",
            "Model Info": model_text,
            "Expected Context": "8192 tokens"
        })


def test_groq_context_windows(page: Page, serve_hacka_re):
    """Test Groq models context window display"""
    
    # Navigate to the page
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if already open
    dismiss_settings_modal(page)
    
    # Open settings
    settings_btn = page.locator("#settings-btn")
    settings_btn.click()
    page.wait_for_selector("#settings-modal", state="visible")
    
    # Select Groq provider
    provider_select = page.locator("#base-url-select")
    provider_select.select_option(value="groq")
    
    # Wait for models to load
    page.wait_for_timeout(1000)
    
    # Check available models
    model_select = page.locator("#model-select")
    options = model_select.locator("option").all()
    
    print(f"Groq models available: {len(options)}")
    
    # Try to select a model if available
    if len(options) > 1:  # More than just the placeholder option
        # Select the first real model
        options[1].click()
        page.wait_for_timeout(500)
        
        # Save settings
        save_button = page.locator("#save-settings-btn")
        save_button.click()
        dismiss_settings_modal(page)
        
        # Check model info
        model_info = page.locator(".model-info")
        if model_info.is_visible():
            model_text = model_info.inner_text()
            print(f"Groq model info: {model_text}")
            
            screenshot_with_markdown(page, "groq_context_window", {
                "Provider": "Groq",
                "Model Info": model_text
            })
    else:
        print("No Groq models found in dropdown")
        dismiss_settings_modal(page)