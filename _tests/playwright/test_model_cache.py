"""Test model caching functionality"""
import time
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_model_cache_uses_cached_data(page: Page, serve_hacka_re, api_key):
    """Test that models are loaded from cache by default"""
    # Track console messages
    console_messages = []
    def log_console_message(msg):
        text = msg.text
        console_messages.append(text)
        print(f"Console: {text}")
    page.on("console", log_console_message)
    
    # Navigate to the app
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Open settings modal
    settings_button = page.locator("#settings-btn")
    settings_button.click()
    page.wait_for_selector("#settings-modal.active", timeout=5000)
    
    # Configure OpenAI
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill(api_key)
    
    base_url_select = page.locator("#base-url-select")
    base_url_select.select_option("openai")
    
    # Save settings to trigger model fetch
    save_button = page.locator("#settings-form button[type='submit']")
    save_button.click()
    
    # Wait for models to load
    page.wait_for_timeout(1000)
    
    # Check console for cache usage
    cache_used = any("Using cached models" in msg for msg in console_messages)
    api_fetch = any("Fetching models from API" in msg for msg in console_messages)
    
    screenshot_with_markdown(page, "initial_load", {
        "Cache Used": str(cache_used),
        "API Fetch": str(api_fetch),
        "Console Messages": str(len(console_messages))
    })
    
    # Should use cache on initial load
    assert cache_used, "Should use cached models on initial load"
    assert not api_fetch or "source: 'cache'" in str(console_messages), "Should not fetch from API when cache is available"
    
    print(f"✅ Initial load used cached models")


def test_model_cache_refresh_button_forces_api(page: Page, serve_hacka_re, api_key):
    """Test that refresh button forces API fetch"""
    # Track console messages
    console_messages = []
    api_fetch_count = 0
    
    def log_console_message(msg):
        nonlocal api_fetch_count
        text = msg.text
        console_messages.append(text)
        if "Fetching models from API" in text and "forceRefresh" in text:
            api_fetch_count += 1
        print(f"Console: {text}")
    
    page.on("console", log_console_message)
    
    # Navigate to the app
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Open settings modal
    settings_button = page.locator("#settings-btn")
    settings_button.click()
    page.wait_for_selector("#settings-modal.active", timeout=5000)
    
    # Configure OpenAI
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill(api_key)
    
    base_url_select = page.locator("#base-url-select")
    base_url_select.select_option("openai")
    
    # Save settings
    save_button = page.locator("#settings-form button[type='submit']")
    save_button.click()
    page.wait_for_timeout(1000)
    
    # Clear messages before refresh test
    console_messages.clear()
    api_fetch_count = 0
    
    # Click refresh button
    refresh_button = page.locator("#model-reload-btn")
    expect(refresh_button).to_be_visible()
    
    screenshot_with_markdown(page, "before_refresh", {
        "Refresh Button Visible": "Yes",
        "API Fetch Count": str(api_fetch_count)
    })
    
    refresh_button.click()
    
    # Wait for API call to complete
    page.wait_for_timeout(2000)
    
    # Check console for API fetch with forceRefresh
    force_refresh_used = any("forceRefresh" in msg and "true" in msg for msg in console_messages)
    api_fetched = api_fetch_count > 0
    
    screenshot_with_markdown(page, "after_refresh", {
        "Force Refresh Used": str(force_refresh_used),
        "API Fetched": str(api_fetched),
        "API Fetch Count": str(api_fetch_count),
        "Console Messages": str(len(console_messages))
    })
    
    # Should force API fetch when refresh button is clicked
    assert api_fetched, "Should fetch from API when refresh button is clicked"
    assert force_refresh_used, "Should use forceRefresh=true when refresh button is clicked"
    
    print(f"✅ Refresh button forced API fetch (count: {api_fetch_count})")


def test_model_cache_provider_detection(page: Page, serve_hacka_re):
    """Test that cache correctly detects provider from base URL"""
    # Track console messages
    console_messages = []
    providers_detected = []
    
    def log_console_message(msg):
        text = msg.text
        console_messages.append(text)
        if "Using cached models" in text:
            if "openai" in text.lower():
                providers_detected.append("openai")
            elif "groq" in text.lower():
                providers_detected.append("groq")
            elif "berget" in text.lower():
                providers_detected.append("berget")
        print(f"Console: {text}")
    
    page.on("console", log_console_message)
    
    # Navigate to the app
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Test with Groq
    settings_button = page.locator("#settings-btn")
    settings_button.click()
    page.wait_for_selector("#settings-modal.active", timeout=5000)
    
    # Configure Groq
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill("test-groq-key")
    
    base_url_select = page.locator("#base-url-select")
    base_url_select.select_option("groq")
    
    # Save settings
    save_button = page.locator("#settings-form button[type='submit']")
    save_button.click()
    page.wait_for_timeout(1000)
    
    # Check if Groq was detected
    groq_detected = "groq" in providers_detected
    
    # Close and reopen for Berget test
    close_button = page.locator("#close-settings")
    close_button.click()
    page.wait_for_timeout(500)
    
    providers_detected.clear()
    
    # Test with Berget
    settings_button.click()
    page.wait_for_selector("#settings-modal.active", timeout=5000)
    
    # Configure Berget
    api_key_input.fill("test-berget-key")
    base_url_select.select_option("berget")
    
    # Save settings
    save_button.click()
    page.wait_for_timeout(1000)
    
    # Check if Berget was detected
    berget_detected = "berget" in providers_detected
    
    screenshot_with_markdown(page, "provider_detection", {
        "Groq Detected": str(groq_detected),
        "Berget Detected": str(berget_detected),
        "Total Console Messages": str(len(console_messages))
    })
    
    print(f"✅ Provider detection: Groq={groq_detected}, Berget={berget_detected}")
    
    # At least one provider should be detected
    assert groq_detected or berget_detected, "Should detect provider from base URL"