"""Test to compare response differences between Berget.ai and Groq Cloud deployments of GPT OSS 120B model."""

import pytest
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown
from playwright.sync_api import Page, expect
import time
import json


@pytest.fixture
def berget_api_key():
    """Berget.ai API key for testing."""
    return "sk_ber_3p6tTmkcEdBgEfIbAdU2BDxmyKbXB30RKoVfv_1f097c4eed0dac42"


@pytest.fixture
def groq_api_key():
    """Groq Cloud API key for testing."""
    return "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"


def setup_provider_and_send_message(page: Page, api_key: str, provider_name: str, message: str):
    """Setup API provider and send a test message."""
    # Clear any existing data
    page.evaluate("() => localStorage.clear()")
    
    # Navigate and dismiss modal
    page.reload()
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Open settings
    settings_button = page.locator("#settings-btn")
    settings_button.click()
    page.wait_for_selector("#settings-modal", state="visible", timeout=5000)
    
    # Set API key - the UI should auto-detect the provider
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill(api_key)
    
    # Wait for provider auto-detection
    page.wait_for_timeout(1000)
    
    # Capture provider detection
    screenshot_with_markdown(page, f"provider_detection_{provider_name.lower()}", {
        "Provider": provider_name,
        "API Key": f"{api_key[:20]}...",
        "Status": "Provider should be auto-detected",
        "Expected": f"{provider_name} provider selected"
    })
    
    # Close settings
    page.keyboard.press("Escape")
    page.wait_for_selector("#settings-modal", state="hidden", timeout=5000)
    
    # Send test message
    chat_input = page.locator("#message-input")
    chat_input.fill(message)
    
    # Send message
    send_button = page.locator("#send-btn")
    send_button.click()
    
    # Wait for response
    page.wait_for_selector(".message.assistant:last-child .message-content", state="visible", timeout=30000)
    
    # Get the response text
    response_element = page.locator(".message.assistant:last-child .message-content")
    response_text = response_element.text_content()
    
    return response_text


def test_provider_response_comparison(page: Page, serve_hacka_re, berget_api_key, groq_api_key):
    """Compare responses between Berget.ai and Groq Cloud for the same prompt."""
    page.goto(serve_hacka_re)
    
    # Test message designed to elicit a clear response
    test_message = "What is the capital of France? Please provide a direct answer."
    
    # Test Berget.ai
    print(f"\n=== Testing Berget.ai Provider ===")
    berget_response = setup_provider_and_send_message(page, berget_api_key, "Berget.ai", test_message)
    
    screenshot_with_markdown(page, "berget_response", {
        "Provider": "Berget.ai",
        "Prompt": test_message,
        "Response Length": f"{len(berget_response)} characters",
        "Response Preview": berget_response[:100] + "..." if len(berget_response) > 100 else berget_response,
        "Analysis Prefix": "YES" if berget_response.lower().startswith("analysis") else "NO"
    })
    
    # Clear chat for next test
    page.evaluate("() => localStorage.removeItem('chatMessages')")
    
    # Test Groq Cloud
    print(f"\n=== Testing Groq Cloud Provider ===")
    groq_response = setup_provider_and_send_message(page, groq_api_key, "Groq Cloud", test_message)
    
    screenshot_with_markdown(page, "groq_response", {
        "Provider": "Groq Cloud", 
        "Prompt": test_message,
        "Response Length": f"{len(groq_response)} characters",
        "Response Preview": groq_response[:100] + "..." if len(groq_response) > 100 else groq_response,
        "Analysis Prefix": "YES" if groq_response.lower().startswith("analysis") else "NO"
    })
    
    # Analyze differences
    berget_starts_with_analysis = berget_response.lower().startswith("analysis")
    groq_starts_with_analysis = groq_response.lower().startswith("analysis")
    
    comparison_data = {
        "berget_response": berget_response,
        "groq_response": groq_response,
        "berget_has_analysis_prefix": berget_starts_with_analysis,
        "groq_has_analysis_prefix": groq_starts_with_analysis,
        "response_length_difference": len(berget_response) - len(groq_response),
        "test_prompt": test_message
    }
    
    # Save detailed comparison
    with open("_tests/playwright/provider_comparison_results.json", "w") as f:
        json.dump(comparison_data, f, indent=2)
    
    # Final comparison screenshot
    screenshot_with_markdown(page, "provider_comparison_summary", {
        "Test Prompt": test_message,
        "Berget Analysis Prefix": "YES" if berget_starts_with_analysis else "NO",
        "Groq Analysis Prefix": "YES" if groq_starts_with_analysis else "NO",
        "Berget Response Length": f"{len(berget_response)} chars",
        "Groq Response Length": f"{len(groq_response)} chars",
        "Length Difference": f"{len(berget_response) - len(groq_response)} chars",
        "Results Saved": "provider_comparison_results.json"
    })
    
    # Print results to console
    print(f"\n=== COMPARISON RESULTS ===")
    print(f"Berget.ai starts with 'analysis': {berget_starts_with_analysis}")
    print(f"Groq Cloud starts with 'analysis': {groq_starts_with_analysis}")
    print(f"Berget response length: {len(berget_response)}")
    print(f"Groq response length: {len(groq_response)}")
    print(f"\nBerget.ai response:")
    print(f"{berget_response}")
    print(f"\nGroq Cloud response:")
    print(f"{groq_response}")
    
    # Assertions
    assert berget_response != groq_response, "Responses should be different"
    
    if berget_starts_with_analysis and not groq_starts_with_analysis:
        print(f"\n✓ CONFIRMED: Berget.ai prefixes with 'analysis', Groq Cloud does not")
    elif not berget_starts_with_analysis and not groq_starts_with_analysis:
        print(f"\n? Both providers do not prefix with 'analysis' for this prompt")
    else:
        print(f"\n? Unexpected result - need further investigation")


def test_multiple_prompts_comparison(page: Page, serve_hacka_re, berget_api_key, groq_api_key):
    """Test multiple different prompts to see consistency of the 'analysis' prefix pattern."""
    page.goto(serve_hacka_re)
    
    test_prompts = [
        "Hello, how are you?",
        "Explain quantum computing in simple terms.",
        "Write a short poem about cats.",
        "What is 2+2?",
        "List three benefits of exercise."
    ]
    
    results = []
    
    for i, prompt in enumerate(test_prompts):
        print(f"\n=== Testing Prompt {i+1}: {prompt} ===")
        
        # Test Berget.ai
        berget_response = setup_provider_and_send_message(page, berget_api_key, "Berget.ai", prompt)
        page.evaluate("() => localStorage.removeItem('chatMessages')")
        
        # Test Groq Cloud  
        groq_response = setup_provider_and_send_message(page, groq_api_key, "Groq Cloud", prompt)
        page.evaluate("() => localStorage.removeItem('chatMessages')")
        
        # Analyze results
        berget_analysis = berget_response.lower().startswith("analysis")
        groq_analysis = groq_response.lower().startswith("analysis")
        
        result = {
            "prompt": prompt,
            "berget_response": berget_response,
            "groq_response": groq_response,
            "berget_analysis_prefix": berget_analysis,
            "groq_analysis_prefix": groq_analysis
        }
        results.append(result)
        
        print(f"Berget 'analysis' prefix: {berget_analysis}")
        print(f"Groq 'analysis' prefix: {groq_analysis}")
    
    # Save all results
    with open("_tests/playwright/multiple_prompts_comparison.json", "w") as f:
        json.dump(results, f, indent=2)
    
    # Summary analysis
    berget_analysis_count = sum(1 for r in results if r["berget_analysis_prefix"])
    groq_analysis_count = sum(1 for r in results if r["groq_analysis_prefix"])
    
    screenshot_with_markdown(page, "multiple_prompts_summary", {
        "Total Prompts Tested": f"{len(test_prompts)}",
        "Berget Analysis Prefix Count": f"{berget_analysis_count}/{len(test_prompts)}",
        "Groq Analysis Prefix Count": f"{groq_analysis_count}/{len(test_prompts)}",
        "Pattern Confirmed": "YES" if berget_analysis_count > groq_analysis_count else "UNCLEAR",
        "Results File": "multiple_prompts_comparison.json"
    })
    
    print(f"\n=== MULTIPLE PROMPTS SUMMARY ===")
    print(f"Berget.ai 'analysis' prefix: {berget_analysis_count}/{len(test_prompts)} prompts")
    print(f"Groq Cloud 'analysis' prefix: {groq_analysis_count}/{len(test_prompts)} prompts")
    
    # Final assertion
    assert len(results) == len(test_prompts), "Should have tested all prompts"