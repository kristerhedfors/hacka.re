#!/usr/bin/env python3
"""
Simple test for API Key Auto-Detection Feature
"""

import pytest
from playwright.sync_api import Page, expect
import time

def test_api_key_detection_simple(page: Page, serve_hacka_re):
    """Test API key detection shows correct messages"""
    # Navigate to the application
    page.goto(serve_hacka_re)
    print("Navigated to hacka.re")
    
    # Wait for page to load
    page.wait_for_load_state("networkidle")
    
    # Try to close any modals that might be open
    page.keyboard.press("Escape")
    time.sleep(0.5)
    
    # Click settings button
    settings_btn = page.locator("#settings-btn")
    settings_btn.click()
    
    # Wait for settings modal
    page.wait_for_selector("#settings-modal.active", timeout=5000)
    print("Settings modal opened")
    
    # Get the API key input
    api_key_input = page.locator("#api-key-update")
    expect(api_key_input).to_be_visible()
    
    # Clear any existing value
    api_key_input.clear()
    
    # Test GroqCloud key detection
    groq_test_key = "gsk_testGroqCloudKey1234567890123456789012"
    api_key_input.fill(groq_test_key)
    
    # Wait for detection
    time.sleep(0.5)
    
    # Check detection message
    detection_element = page.locator('#api-key-update-detection')
    detection_text = page.locator('#api-key-update-detection-text')
    
    # Wait for detection to appear
    expect(detection_element).to_be_visible(timeout=2000)
    expect(detection_text).to_contain_text("GroqCloud")
    print("✅ GroqCloud API key detected")
    
    # Check provider dropdown
    provider_select = page.locator('#base-url-select')
    expect(provider_select).to_have_value('groq')
    print("✅ Provider auto-selected to 'groq'")
    
    # Clear and test OpenAI key
    api_key_input.clear()
    openai_test_key = "sk-proj-" + "A" * 60
    api_key_input.fill(openai_test_key)
    
    # Wait for detection
    time.sleep(0.5)
    
    # Check detection message changed
    expect(detection_element).to_be_visible()
    expect(detection_text).to_contain_text("OpenAI")
    print("✅ OpenAI API key detected")
    
    # Check provider dropdown changed
    expect(provider_select).to_have_value('openai')
    print("✅ Provider auto-selected to 'openai'")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])