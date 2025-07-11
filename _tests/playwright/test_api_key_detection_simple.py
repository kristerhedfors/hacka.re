#!/usr/bin/env python3
"""
Simple test for API Key Auto-Detection Feature
"""

import pytest
from playwright.sync_api import Page, expect
import time
from test_utils import setup_test_environment

def test_api_key_detection_simple(page: Page, serve_hacka_re):
    """Test API key detection shows correct messages"""
    # Navigate to the application
    page.goto(serve_hacka_re)
    print("Navigated to hacka.re")
    
    # Set up test environment to prevent welcome modal
    setup_test_environment(page)
    
    # Wait for page to load
    page.wait_for_load_state("networkidle")
    
    # Try to close any modals that might be open
    page.keyboard.press("Escape")
    time.sleep(0.5)
    
    # Click settings button
    settings_btn = page.locator("#settings-btn")
    settings_btn.click()
    
    # Wait for settings modal
    page.wait_for_selector("#settings-modal.active", timeout=2000)
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
    expect(detection_element).to_be_visible(timeout=1000)
    expect(detection_text).to_contain_text("GroqCloud")
    expect(detection_text).to_contain_text("qwen3-32b")
    print("✅ GroqCloud API key detected with model info")
    
    # Check provider dropdown
    provider_select = page.locator('#base-url-select')
    expect(provider_select).to_have_value('groq')
    print("✅ Provider auto-selected to 'groq'")
    
    # Check model dropdown for default Groq model
    model_select = page.locator('#model-select')
    expect(model_select).to_have_value('qwen/qwen3-32b')
    print("✅ Default model auto-selected: qwen3-32b")
    
    # Clear and test OpenAI key
    api_key_input.clear()
    openai_test_key = "sk-proj-" + "A" * 60
    api_key_input.fill(openai_test_key)
    
    # Wait for detection
    time.sleep(0.5)
    
    # Check detection message changed
    expect(detection_element).to_be_visible()
    expect(detection_text).to_contain_text("OpenAI")
    expect(detection_text).to_contain_text("gpt-4.1-mini")
    print("✅ OpenAI API key detected with model info")
    
    # Check provider dropdown changed
    expect(provider_select).to_have_value('openai')
    print("✅ Provider auto-selected to 'openai'")
    
    # Check model dropdown for default OpenAI model
    expect(model_select).to_have_value('gpt-4.1-mini')
    print("✅ Default model auto-selected: gpt-4.1-mini")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])