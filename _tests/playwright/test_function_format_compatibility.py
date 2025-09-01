"""
Function Calling Format Compatibility Tests

This test file specifically checks different function calling response formats
that various models might use, to identify compatibility issues.
"""
import pytest
import os
import time
import json
import re
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

# Priority models to test (known to have different behaviors)
PRIORITY_MODELS = {
    "groq": [
        "llama-3.3-70b-versatile",     # Llama - typically works
        "moonshotai/kimi-k2-instruct", # Kimi - reported to work
        "compound-beta",                # GPT-OSS equivalent
        "mixtral-8x7b-32768",           # Mixtral model
        "deepseek-r1-distill-llama-70b", # DeepSeek model
    ],
    "openai": [
        "gpt-4o-mini",                  # Standard OpenAI format
        "gpt-4o",                       # Full model
        "gpt-3.5-turbo",                # Classic model
    ],
    "berget": [
        "mistralai/Magistral-Small-2506", # Default Berget model
    ]
}

# Test function that's simple enough to work universally
ECHO_FUNCTION = """
/**
 * @callable
 * Simple echo function for testing
 * @param {string} message - Message to echo back
 */
function echo(message) {
    return { echoed: message, timestamp: Date.now() };
}
"""


def analyze_response_format(page):
    """Analyze the format of function calling in the response."""
    formats_detected = []
    
    # Check for various function call indicators
    indicators = {
        "tool_calls": page.locator(".tool-call-container").count() > 0,
        "function_call": page.locator(".function-call-indicator").count() > 0,
        "code_block": page.locator(".code-block").count() > 0,
        "json_block": False,
        "xml_tags": False,
        "plain_text": False
    }
    
    # Check message content for different formats
    messages = page.locator(".message.assistant .message-content").all()
    for msg in messages:
        text = msg.text_content() or ""
        
        # Check for JSON-style function calls
        if '"function"' in text or '"tool_calls"' in text or '"name"' in text:
            indicators["json_block"] = True
        
        # Check for XML-style tags (some models use this)
        if "<function>" in text or "<tool>" in text or "<invoke>" in text:
            indicators["xml_tags"] = True
        
        # Check for plain text mentions
        if "calling" in text.lower() or "executing" in text.lower():
            indicators["plain_text"] = True
    
    # Also check console for function execution
    console_logs = page.evaluate("""() => {
        return window.consoleMessages || [];
    }""")
    
    return {
        "indicators": indicators,
        "console_logs": console_logs[-10:] if console_logs else []  # Last 10 logs
    }


def setup_test_environment(page, provider, model, api_key):
    """Set up the test environment with specific provider and model."""
    print(f"\n=== Setting up {provider} with {model} ===")
    
    # Import needed utilities
    from test_utils import check_system_messages
    
    # Setup console message capture
    page.evaluate("""() => {
        window.consoleMessages = [];
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;
        
        console.log = function(...args) {
            window.consoleMessages.push({type: 'log', message: args.join(' ')});
            originalLog.apply(console, args);
        };
        console.error = function(...args) {
            window.consoleMessages.push({type: 'error', message: args.join(' ')});
            originalError.apply(console, args);
        };
        console.warn = function(...args) {
            window.consoleMessages.push({type: 'warn', message: args.join(' ')});
            originalWarn.apply(console, args);
        };
    }""")
    
    # Click settings
    settings_btn = page.locator("#settings-btn")
    settings_btn.click(timeout=2000)
    page.wait_for_selector("#settings-modal.active", state="visible", timeout=2000)
    
    # Configure API
    api_input = page.locator("#api-key-update")
    api_input.fill(api_key)
    
    provider_select = page.locator("#base-url-select")
    provider_select.select_option(provider)
    
    # Wait for the reload button to be enabled after API key is entered
    reload_btn = page.locator("#model-reload-btn")
    try:
        # Wait for button to be enabled
        page.wait_for_function(
            """() => {
                const btn = document.getElementById('model-reload-btn');
                return btn && !btn.disabled;
            }""",
            timeout=3000
        )
        reload_btn.click(timeout=5000)
    except Exception as e:
        print(f"Reload button not enabled, trying to save settings first: {e}")
        # Sometimes we need to save the API key first
        close_button = page.locator("#close-settings")
        if close_button.is_visible():
            page.wait_for_timeout(1000)  # Wait for auto-save

            close_button.click(force=True)
            # Re-open settings
            settings_button = page.locator("#settings-btn")
            settings_button.click(timeout=2000)
            page.wait_for_selector("#settings-modal.active", state="visible", timeout=2000)
            # Now try reload again
            reload_btn.click(timeout=5000)
    
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
            reload_btn.click()
            time.sleep(2)
    
    # Get all available models for debugging
    available_models = page.evaluate("""() => {
        const select = document.getElementById('model-select');
        if (!select) return [];
        return Array.from(select.options)
            .filter(opt => !opt.disabled)
            .map(opt => opt.value);
    }""")
    print(f"Available models: {available_models}")
    
    # Check if specific model is available
    if model in available_models:
        model_select = page.locator("#model-select")
        model_select.select_option(model)
        print(f"✓ Model {model} selected")
        selected_model = model
    else:
        # Try to find a similar model or use the first available
        print(f"✗ Model {model} not available")
        if available_models:
            # Try to find a similar model (partial match)
            similar_model = None
            for available in available_models:
                if model in available or available in model:
                    similar_model = available
                    break
            
            if similar_model:
                model_select = page.locator("#model-select")
                model_select.select_option(similar_model)
                print(f"✓ Selected similar model: {similar_model}")
                selected_model = similar_model
            else:
                # Use first available model
                first_model = available_models[0]
                model_select = page.locator("#model-select")
                model_select.select_option(first_model)
                print(f"✓ Selected first available model: {first_model}")
                selected_model = first_model
        else:
            print("No models available")
            selected_model = None
    
    # Save settings
    save_btn = page.locator("#close-settings")
    save_btn.click(force=True)
    
    # Wait for the settings modal to be closed
    page.wait_for_selector("#settings-modal", state="hidden", timeout=2000)
    
    # Check for any system messages
    check_system_messages(page)
    
    return selected_model


def add_test_function(page):
    """Add the echo test function."""
    # Open function modal
    func_btn = page.locator("#function-btn")
    func_btn.click()
    
    # Wait for the function modal to be visible
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    # Add function code
    code_area = page.locator("#function-code")
    code_area.fill(ECHO_FUNCTION)
    
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
    expect(function_list.locator(".function-item-name:has-text('echo')").first).to_be_visible()
    
    # Close modal
    close_btn = page.locator("#close-function-modal")
    close_btn.click()
    expect(function_modal).not_to_be_visible()


def test_function_invocation_format(page, prompt):
    """Test function invocation and analyze response format."""
    # Send message
    message_input = page.locator("#message-input")
    message_input.fill(prompt)
    
    send_btn = page.locator("#send-btn")
    send_btn.click()
    
    # Wait for response (be generous with timeout)
    time.sleep(3)
    
    # Try to wait for various response indicators
    try:
        page.wait_for_selector(".assistant-message", timeout=10000)
    except:
        pass
    
    # Analyze the response format
    format_analysis = analyze_response_format(page)
    
    # Check if function was actually executed
    function_executed = False
    
    # Check multiple indicators
    if format_analysis["indicators"]["tool_calls"]:
        function_executed = True
        print("  ✓ Detected tool_calls format")
    
    if format_analysis["indicators"]["function_call"]:
        function_executed = True
        print("  ✓ Detected function_call format")
    
    # Check console logs for execution
    for log in format_analysis["console_logs"]:
        if "echo" in str(log.get("message", "")).lower():
            function_executed = True
            print(f"  ✓ Function execution in console: {log['message'][:50]}...")
    
    # Check response text  
    response_text = page.locator(".message.assistant .message-content").last.text_content() if page.locator(".message.assistant .message-content").count() > 0 else ""
    if "hello test" in response_text.lower() or "echoed" in response_text.lower():
        function_executed = True
        print("  ✓ Function result in response")
    
    return {
        "executed": function_executed,
        "format": format_analysis,
        "response_preview": response_text[:200] if response_text else "No response"
    }


@pytest.mark.parametrize("provider,model", [
    (provider, model) 
    for provider, models in PRIORITY_MODELS.items() 
    for model in models
])
def test_model_function_format(page: Page, serve_hacka_re, api_key, groq_api_key, berget_api_key, provider, model):
    """Test function calling format for each model."""
    # Select appropriate API key
    if provider == "groq":
        if not groq_api_key:
            pytest.skip("GROQ_API_KEY not configured")
        current_api_key = groq_api_key
    elif provider == "berget":
        if not berget_api_key:
            pytest.skip("BERGET_API_KEY not configured")
        current_api_key = berget_api_key
    else:
        if not api_key:
            pytest.skip("OPENAI_API_KEY not configured")
        current_api_key = api_key
    
    # Navigate and setup
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    # Configure provider and model
    selected = setup_test_environment(page, provider, model, current_api_key)
    if not selected:
        pytest.skip(f"Model {model} not available on {provider}")
    
    # Add test function
    add_test_function(page)
    
    # Test with explicit function call request
    print(f"\nTesting {provider}/{model}:")
    result = test_function_invocation_format(
        page,
        'Please call the echo function with the message "Hello test"'
    )
    
    # Log detailed results
    print(f"  Executed: {result['executed']}")
    print(f"  Formats detected: {[k for k, v in result['format']['indicators'].items() if v]}")
    print(f"  Response preview: {result['response_preview'][:100]}...")
    
    # Take screenshot with results
    screenshot_with_markdown(page, f"{provider}_{model.replace('/', '_')}_format", {
        "Provider": provider,
        "Model": model,
        "Function Executed": str(result["executed"]),
        "Detected Formats": str([k for k, v in result['format']['indicators'].items() if v]),
        "Response Preview": result['response_preview'][:100]
    })
    
    # Report result
    if result["executed"]:
        print(f"✓ {provider}/{model} - Function calling works")
    else:
        print(f"✗ {provider}/{model} - Function calling failed or used unsupported format")
        # Don't fail the test, just report
        # This helps us identify which models have issues
    
    return result


def test_format_summary(page: Page, serve_hacka_re, api_key, groq_api_key, berget_api_key):
    """Run all tests and generate a summary report."""
    results = {}
    
    for provider, models in PRIORITY_MODELS.items():
        results[provider] = {}
        for model in models:
            # Skip if no API key
            if provider == "groq" and not groq_api_key:
                continue
            if provider == "openai" and not api_key:
                continue
            if provider == "berget" and not berget_api_key:
                continue
            
            try:
                # Run test for this model
                page.goto(serve_hacka_re)
                dismiss_welcome_modal(page)
                
                # Select appropriate API key
                if provider == "groq":
                    current_api_key = groq_api_key
                elif provider == "berget":
                    current_api_key = berget_api_key
                else:
                    current_api_key = api_key
                selected = setup_test_environment(page, provider, model, current_api_key)
                
                if selected:
                    add_test_function(page)
                    result = test_function_invocation_format(
                        page,
                        'Please call the echo function with the message "Hello test"'
                    )
                    results[provider][model] = result
                else:
                    results[provider][model] = {"executed": False, "error": "Model not available"}
            except Exception as e:
                results[provider][model] = {"executed": False, "error": str(e)}
    
    # Generate summary report
    print("\n" + "="*60)
    print("FUNCTION CALLING FORMAT COMPATIBILITY SUMMARY")
    print("="*60)
    
    for provider, models in results.items():
        print(f"\n{provider.upper()}:")
        for model, result in models.items():
            status = "✓" if result.get("executed") else "✗"
            formats = [k for k, v in result.get("format", {}).get("indicators", {}).items() if v]
            print(f"  {status} {model}")
            if formats:
                print(f"      Formats: {', '.join(formats)}")
            if result.get("error"):
                print(f"      Error: {result['error']}")
    
    print("\n" + "="*60)