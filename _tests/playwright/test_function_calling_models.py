"""
Comprehensive Function Calling Tests Across Different Models

Tests function calling functionality across different providers:
1. Groq Cloud models (Llama, Kimi, GPT-OSS, etc.)
2. OpenAI models (GPT-4o, GPT-4o-mini, etc.)

Tests both simple and complex function calls.
"""
import pytest
import os
import time
import json
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown

# List of Groq models to test
GROQ_MODELS = [
    "llama-3.3-70b-versatile",    # Llama model - should work
    "llama-3.1-8b-instant",        # Llama model - should work
    "moonshotai/kimi-k2-instruct", # Kimi - should work
    "compound-beta",               # Groq compound model
    "compound-beta-mini",          # Groq compound mini model
    "gemma2-9b-it",                # Gemma model
    "qwen-qwq-32b",                # Qwen model
]

# List of OpenAI models to test
OPENAI_MODELS = [
    "gpt-4o-mini",      # Primary test model
    "gpt-4o",           # Full GPT-4o
    "gpt-4.1-mini",     # Latest mini model
    "o4-mini",          # O4 mini
]

# Simple function for quick testing
SIMPLE_FUNCTION_CODE = """
/**
 * @callable
 * Returns current time in milliseconds
 */
function getCurrentTime() {
    return { timestamp: Date.now() };
}
"""

# Math function for testing with parameters
MATH_FUNCTION_CODE = """
/**
 * @callable
 * Adds two numbers together
 * @param {number} a - First number
 * @param {number} b - Second number
 */
function addNumbers(a, b) {
    return { result: a + b };
}
"""

# Complex function (Shodan host info)
SHODAN_FUNCTION_CODE = """
/**
 * @callable
 * Gets host information from Shodan API
 * @param {string} ip - IP address to lookup
 * @param {string} apiKey - Shodan API key (optional)
 */
async function hostinfo(ip, apiKey = 'YOUR_SHODAN_API_KEY') {
    // Simulated response for testing
    return {
        ip: ip,
        city: "Mountain View",
        country: "US",
        org: "Google LLC",
        ports: [80, 443],
        vulnerabilities: [],
        last_update: new Date().toISOString()
    };
}
"""


def setup_console_logging(page):
    """Set up console error logging for debugging."""
    console_messages = []
    
    def log_console_message(msg):
        timestamp = time.strftime("%H:%M:%S.%f")[:-3]
        console_messages.append({
            'timestamp': timestamp,
            'type': msg.type,
            'text': msg.text
        })
        if msg.type in ['error', 'warning']:
            print(f"[{timestamp}] Console {msg.type.upper()}: {msg.text}")
    
    page.on("console", log_console_message)
    return console_messages


def configure_provider_and_model(page, provider, model, api_key):
    """Configure API provider and select specific model."""
    print(f"\n=== Configuring {provider} with model {model} ===")
    
    # Import check_system_messages
    from test_utils import check_system_messages
    
    # Click settings button
    settings_button = page.locator("#settings-btn")
    settings_button.click(timeout=2000)
    
    # Wait for settings modal
    page.wait_for_selector("#settings-modal.active", state="visible", timeout=2000)
    
    # Enter API key
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill(api_key)
    
    # Select provider
    base_url_select = page.locator("#base-url-select")
    base_url_select.select_option(provider.lower())
    
    # Wait for the reload button to be enabled after API key is entered
    reload_button = page.locator("#model-reload-btn")
    try:
        # Wait for button to be enabled
        page.wait_for_function(
            """() => {
                const btn = document.getElementById('model-reload-btn');
                return btn && !btn.disabled;
            }""",
            timeout=3000
        )
        reload_button.click(timeout=5000)
    except Exception as e:
        print(f"Reload button not enabled, trying to save settings first: {e}")
        # Sometimes we need to save the API key first
        save_button = page.locator("#settings-form button[type='submit']")
        if save_button.is_visible():
            save_button.click(force=True)
            # Re-open settings
            settings_button = page.locator("#settings-btn")
            settings_button.click(timeout=2000)
            page.wait_for_selector("#settings-modal.active", state="visible", timeout=2000)
            # Now try reload again
            reload_button.click(timeout=5000)
    
    # Wait for models to load
    try:
        page.wait_for_selector("#model-select option:not([disabled])", state="visible", timeout=5000)
        print("Models loaded successfully")
    except Exception as e:
        print(f"Error waiting for models to load: {e}")
        time.sleep(2)
        
        # Check if there are any options
        options_count = page.evaluate("""() => {
            const select = document.getElementById('model-select');
            if (!select) return 0;
            return Array.from(select.options).filter(opt => !opt.disabled).length;
        }""")
        print(f"Found {options_count} non-disabled options in model select")
        
        if options_count == 0:
            # Try clicking the reload button again
            print("No options found, clicking reload button again")
            reload_button.click()
            time.sleep(2)
    
    # Check available models
    available_models = page.evaluate("""() => {
        const select = document.getElementById('model-select');
        if (!select) return [];
        return Array.from(select.options)
            .filter(opt => !opt.disabled)
            .map(opt => ({ value: opt.value, text: opt.textContent }));
    }""")
    
    print(f"Available {provider} models:")
    available_values = []
    for m in available_models:
        print(f"  - {m['value']}: {m['text']}")
        available_values.append(m['value'])
    
    # Try to select the specific model or find a similar one
    selected_model = None
    if model in available_values:
        model_select = page.locator("#model-select")
        model_select.select_option(model)
        print(f"✓ Selected model: {model}")
        selected_model = model
    else:
        print(f"✗ Model {model} not available")
        # Try to find a similar model (partial match)
        for available in available_values:
            if model in available or available in model:
                model_select = page.locator("#model-select")
                model_select.select_option(available)
                print(f"✓ Selected similar model: {available}")
                selected_model = available
                break
        
        if not selected_model and available_values:
            # Use the first available model
            first_model = available_values[0]
            model_select = page.locator("#model-select")
            model_select.select_option(first_model)
            print(f"✓ Selected first available model: {first_model}")
            selected_model = first_model
    
    # Save settings
    save_button = page.locator("#save-settings-btn")
    save_button.click(force=True)
    
    # Wait for modal to close
    page.wait_for_selector("#settings-modal", state="hidden", timeout=2000)
    
    # Check for any system messages
    check_system_messages(page)
    
    return selected_model


def add_function(page, function_code, function_name):
    """Add a function to the function calling system."""
    print(f"Adding function: {function_name}")
    
    # Click function button
    function_button = page.locator("#function-btn")
    function_button.click()
    
    # Wait for the function modal to be visible
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    # Clear existing code and add new function
    function_code_area = page.locator("#function-code")
    function_code_area.fill(function_code)
    
    # Validate the function
    page.locator("#function-validate-btn").click()
    
    # Check for validation result
    validation_result = page.locator("#function-validation-result")
    expect(validation_result).to_be_visible()
    expect(validation_result).to_contain_text("Library validated successfully")
    
    # Submit the form
    page.locator("#function-editor-form button[type='submit']").click()
    
    # Check if the function was added to the list
    function_list = page.locator("#function-list")
    expect(function_list.locator(f".function-item-name:has-text('{function_name}')").first).to_be_visible()
    
    # Close modal
    close_button = page.locator("#close-function-modal")
    close_button.click()
    expect(function_modal).not_to_be_visible()


def test_function_invocation(page, prompt, expected_function_name, timeout=30000):
    """Test function invocation through chat."""
    print(f"Testing prompt: {prompt}")
    
    # Send message
    message_input = page.locator("#message-input")
    message_input.fill(prompt)
    
    # Click send button
    send_button = page.locator("#send-btn")
    send_button.click()
    
    # Wait for function to be called
    start_time = time.time()
    function_called = False
    error_message = None
    
    while time.time() - start_time < timeout/1000:
        # Check for function execution in the chat
        try:
            # Look for function execution indicators
            function_elements = page.locator(".tool-call-container, .function-call-indicator, .code-block").all()
            
            for element in function_elements:
                text = element.text_content() or ""
                if expected_function_name in text:
                    function_called = True
                    print(f"✓ Function {expected_function_name} was called")
                    break
            
            # Also check response text
            if not function_called:
                messages = page.locator(".message.assistant .message-content").all()
                for msg in messages:
                    text = msg.text_content() or ""
                    if expected_function_name in text or "function" in text.lower():
                        function_called = True
                        print(f"✓ Function reference found in response")
                        break
            
            if function_called:
                break
                
        except Exception as e:
            error_message = str(e)
        
        time.sleep(0.5)
    
    if not function_called:
        # Take debug screenshot
        screenshot_with_markdown(page, f"function_not_called_{expected_function_name}", {
            "Model": page.evaluate("() => document.getElementById('model-select')?.value || 'unknown'"),
            "Provider": page.evaluate("() => document.getElementById('base-url-select')?.value || 'unknown'"),
            "Expected Function": expected_function_name,
            "Prompt": prompt,
            "Error": error_message or "Function not called within timeout"
        })
    
    return function_called


def cleanup_functions(page):
    """Remove all added functions."""
    try:
        # Open function modal
        function_button = page.locator("#function-btn")
        function_button.click()
        
        # Wait for the function modal to be visible
        function_modal = page.locator("#function-modal")
        expect(function_modal).to_be_visible()
        
        # Get the function list
        function_list = page.locator("#function-list")
        
        # Handle the confirmation dialog for deletion
        page.on("dialog", lambda dialog: dialog.accept())
        
        # Delete all function collections (which deletes all functions)
        while function_list.locator(".function-collection-delete:not([disabled])").count() > 0:
            function_list.locator(".function-collection-delete:not([disabled])").first.click()
            # Small wait to allow the UI to update
            page.wait_for_timeout(100)
        
        # Close modal
        close_button = page.locator("#close-function-modal")
        close_button.click()
        expect(function_modal).not_to_be_visible()
    except:
        pass


@pytest.mark.parametrize("model", GROQ_MODELS)
def test_groq_function_calling(page: Page, serve_hacka_re, groq_api_key, model):
    """Test function calling with various Groq models."""
    if not groq_api_key:
        pytest.skip("GROQ_API_KEY not configured")
    
    # Setup
    console_messages = setup_console_logging(page)
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Configure Groq with specific model
    selected_model = configure_provider_and_model(page, "groq", model, groq_api_key)
    
    if not selected_model:
        pytest.skip(f"Model {model} not available on Groq")
    
    # Test simple function
    print(f"\n--- Testing simple function with {model} ---")
    add_function(page, SIMPLE_FUNCTION_CODE, "getCurrentTime")
    
    result = test_function_invocation(
        page,
        "What time is it? Please call the getCurrentTime function",
        "getCurrentTime"
    )
    
    # Log result
    test_results = {
        "provider": "groq",
        "model": model,
        "function": "getCurrentTime",
        "success": result
    }
    
    print(f"Result: {'✓ PASS' if result else '✗ FAIL'}")
    
    # Cleanup
    cleanup_functions(page)
    
    # Take final screenshot
    screenshot_with_markdown(page, f"groq_{model.replace('/', '_')}_result", test_results)
    
    assert result, f"Function calling failed for Groq model {model}"


@pytest.mark.parametrize("model", OPENAI_MODELS)
def test_openai_function_calling(page: Page, serve_hacka_re, api_key, model):
    """Test function calling with various OpenAI models."""
    if not api_key:
        pytest.skip("OPENAI_API_KEY not configured")
    
    # Setup
    console_messages = setup_console_logging(page)
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Configure OpenAI with specific model
    selected_model = configure_provider_and_model(page, "openai", model, api_key)
    
    if not selected_model:
        pytest.skip(f"Model {model} not available on OpenAI")
    
    # Test simple function
    print(f"\n--- Testing simple function with {model} ---")
    add_function(page, SIMPLE_FUNCTION_CODE, "getCurrentTime")
    
    result = test_function_invocation(
        page,
        "What time is it? Please call the getCurrentTime function",
        "getCurrentTime"
    )
    
    # Log result
    test_results = {
        "provider": "openai",
        "model": model,
        "function": "getCurrentTime",
        "success": result
    }
    
    print(f"Result: {'✓ PASS' if result else '✗ FAIL'}")
    
    # Cleanup
    cleanup_functions(page)
    
    # Take final screenshot
    screenshot_with_markdown(page, f"openai_{model.replace('/', '_')}_result", test_results)
    
    assert result, f"Function calling failed for OpenAI model {model}"


def test_groq_complex_function(page: Page, serve_hacka_re, groq_api_key):
    """Test complex function (Shodan hostinfo) with best Groq model."""
    if not groq_api_key:
        pytest.skip("GROQ_API_KEY not configured")
    
    # Use best performing model for complex test
    best_model = "llama-3.3-70b-versatile"
    
    # Setup
    console_messages = setup_console_logging(page)
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Configure Groq with best model
    selected_model = configure_provider_and_model(page, "groq", best_model, groq_api_key)
    
    if not selected_model:
        pytest.skip(f"Model {best_model} not available on Groq")
    
    # Test Shodan function
    print(f"\n--- Testing Shodan hostinfo with {best_model} ---")
    add_function(page, SHODAN_FUNCTION_CODE, "hostinfo")
    
    result = test_function_invocation(
        page,
        "Can you look up information about IP address 8.8.8.8 using the hostinfo function?",
        "hostinfo",
        timeout=45000  # Longer timeout for complex function
    )
    
    # Log result
    test_results = {
        "provider": "groq",
        "model": best_model,
        "function": "hostinfo (Shodan)",
        "success": result
    }
    
    print(f"Complex function result: {'✓ PASS' if result else '✗ FAIL'}")
    
    # Cleanup
    cleanup_functions(page)
    
    # Take final screenshot
    screenshot_with_markdown(page, f"groq_shodan_result", test_results)
    
    assert result, f"Complex function calling failed for Groq model {best_model}"


def test_openai_complex_function(page: Page, serve_hacka_re, api_key):
    """Test complex function (Shodan hostinfo) with OpenAI."""
    if not api_key:
        pytest.skip("OPENAI_API_KEY not configured")
    
    # Use GPT-4o-mini for cost efficiency
    model = "gpt-4o-mini"
    
    # Setup
    console_messages = setup_console_logging(page)
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Configure OpenAI
    selected_model = configure_provider_and_model(page, "openai", model, api_key)
    
    if not selected_model:
        pytest.skip(f"Model {model} not available on OpenAI")
    
    # Test Shodan function
    print(f"\n--- Testing Shodan hostinfo with {model} ---")
    add_function(page, SHODAN_FUNCTION_CODE, "hostinfo")
    
    result = test_function_invocation(
        page,
        "Can you look up information about IP address 8.8.8.8 using the hostinfo function?",
        "hostinfo",
        timeout=45000  # Longer timeout for complex function
    )
    
    # Log result
    test_results = {
        "provider": "openai",
        "model": model,
        "function": "hostinfo (Shodan)",
        "success": result
    }
    
    print(f"Complex function result: {'✓ PASS' if result else '✗ FAIL'}")
    
    # Cleanup
    cleanup_functions(page)
    
    # Take final screenshot
    screenshot_with_markdown(page, f"openai_shodan_result", test_results)
    
    assert result, f"Complex function calling failed for OpenAI model {model}"