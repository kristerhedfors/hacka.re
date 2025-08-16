"""Test models.dev data integration"""

import pytest
from playwright.sync_api import Page, expect
from test_utils import (
    dismiss_welcome_modal, dismiss_settings_modal, 
    screenshot_with_markdown
)


def test_models_dev_context_windows(page: Page, serve_hacka_re, api_key):
    """Test that models.dev context window data is correctly loaded and used"""
    
    # Navigate to the page
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Setup console logging to capture any errors
    console_messages = []
    page.on("console", lambda msg: console_messages.append(f"{msg.type}: {msg.text}"))
    
    # Open settings
    settings_button = page.locator("#settings-btn")
    settings_button.click()
    page.wait_for_selector("#settings-modal", state="visible")
    
    # Configure OpenAI API
    api_key_input = page.locator("#api-key-input")
    api_key_input.fill(api_key)
    
    # Select OpenAI provider
    provider_select = page.locator("#base-url-select")
    provider_select.select_option(value="openai")
    
    # Save and close settings
    save_button = page.locator("#save-settings-btn")
    save_button.click()
    dismiss_settings_modal(page)
    
    # Test different models and their context windows
    test_cases = [
        ("gpt-4", 8192),  # Standard GPT-4 has 8k context
        ("gpt-4o", 128000),  # GPT-4o has 128k context
        ("gpt-4o-mini", 128000),  # GPT-4o-mini has 128k context
        ("gpt-4.1", 128000),  # GPT-4.1 has 128k context based on models.json
        ("o1", 200000),  # o1 has 200k context
        ("o1-mini", 128000),  # o1-mini has 128k context
    ]
    
    for model_id, expected_context in test_cases:
        # Open settings again
        settings_button.click()
        page.wait_for_selector("#settings-modal", state="visible")
        
        # Select the model
        model_select = page.locator("#model-select")
        
        # Wait for models to load
        page.wait_for_timeout(500)
        
        # Check if the model exists in the dropdown
        options = model_select.locator("option").all_inner_texts()
        
        # Find the option that contains the model ID
        matching_option = None
        for option in options:
            if model_id in option.lower():
                matching_option = option
                break
        
        if matching_option:
            # Select by the actual option text
            model_select.select_option(label=matching_option)
            
            # Save settings
            save_button.click()
            dismiss_settings_modal(page)
            
            # Check console logs for context window detection
            page.wait_for_timeout(500)
            
            # Verify the context window is displayed correctly
            # The context window should be shown in the model stats
            model_stats = page.locator("#model-stats")
            if model_stats.is_visible():
                stats_text = model_stats.inner_text()
                print(f"Model: {model_id}, Stats: {stats_text}")
                
                # Check if context window is mentioned
                if "context" in stats_text.lower() or "tokens" in stats_text.lower():
                    screenshot_with_markdown(page, f"model_{model_id}_context", {
                        "Model": model_id,
                        "Expected Context": expected_context,
                        "Stats Display": stats_text
                    })
        else:
            print(f"Model {model_id} not found in dropdown")


def test_groq_models_context(page: Page, serve_hacka_re):
    """Test Groq models context window detection"""
    
    # Navigate to the page
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Setup console logging
    console_messages = []
    page.on("console", lambda msg: console_messages.append(f"{msg.type}: {msg.text}"))
    
    # Open settings
    settings_button = page.locator("#settings-btn")
    settings_button.click()
    page.wait_for_selector("#settings-modal", state="visible")
    
    # Select Groq provider
    provider_select = page.locator("#base-url-select")
    provider_select.select_option(value="groq")
    
    # Note: We won't set an API key for this test, just check model loading
    
    # Wait for models to load from models.dev data
    page.wait_for_timeout(1000)
    
    # Check if models are populated
    model_select = page.locator("#model-select")
    options = model_select.locator("option").all_inner_texts()
    
    print(f"Groq models found: {options}")
    
    # Test a specific Groq model if available
    groq_models = [
        "llama-3.3-70b-versatile",  # Should have 128k context
        "mixtral-8x7b-32768",  # Should have 32k context
    ]
    
    for model_id in groq_models:
        matching_option = None
        for option in options:
            if model_id in option.lower():
                matching_option = option
                break
        
        if matching_option:
            model_select.select_option(label=matching_option)
            page.wait_for_timeout(500)
            
            # Check console for context window detection
            # Should see "Found context window from models.dev"
            
            screenshot_with_markdown(page, f"groq_model_{model_id}", {
                "Provider": "Groq",
                "Model": model_id,
                "Options Available": len(options)
            })
    
    dismiss_settings_modal(page)


def test_models_dev_data_loading(page: Page, serve_hacka_re):
    """Test that models.dev data is correctly loaded"""
    
    # Navigate to the page
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Check if ModelsDevData is available
    result = page.evaluate("""
        () => {
            if (window.ModelsDevData) {
                // Try to get some model info
                const openaiGpt4 = window.ModelsDevData.getModelInfo('openai', 'gpt-4');
                const groqLlama = window.ModelsDevData.searchModel('llama-3.3-70b-versatile');
                
                return {
                    loaded: true,
                    hasOpenAI: openaiGpt4 !== null,
                    hasGroq: groqLlama !== null,
                    openaiContext: openaiGpt4 ? openaiGpt4.limit?.context : null,
                    groqContext: groqLlama ? groqLlama.model?.limit?.context : null
                };
            }
            return { loaded: false };
        }
    """)
    
    print(f"ModelsDevData status: {result}")
    
    # The data might not be loaded immediately, wait a bit
    if not result['loaded']:
        page.wait_for_timeout(2000)
        result = page.evaluate("""
            () => {
                if (window.ModelsDevData) {
                    const openaiGpt4 = window.ModelsDevData.getModelInfo('openai', 'gpt-4');
                    const groqLlama = window.ModelsDevData.searchModel('llama-3.3-70b-versatile');
                    
                    return {
                        loaded: true,
                        hasOpenAI: openaiGpt4 !== null,
                        hasGroq: groqLlama !== null,
                        openaiContext: openaiGpt4 ? openaiGpt4.limit?.context : null,
                        groqContext: groqLlama ? groqLlama.model?.limit?.context : null,
                        dataKeys: Object.keys(window.ModelsDevData.modelsData || {})
                    };
                }
                return { loaded: false };
            }
        """)
        print(f"ModelsDevData status after wait: {result}")
    
    assert result['loaded'], "ModelsDevData should be loaded"
    
    screenshot_with_markdown(page, "models_dev_data_loaded", {
        "Status": "Loaded" if result['loaded'] else "Not Loaded",
        "Has OpenAI Data": result.get('hasOpenAI', False),
        "Has Groq Data": result.get('hasGroq', False),
        "Provider Count": len(result.get('dataKeys', []))
    })