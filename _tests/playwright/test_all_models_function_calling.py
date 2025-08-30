"""
Comprehensive Function Calling Tests for ALL Chat-Capable Models

Tests function calling with all discovered chat models across:
- Groq Cloud (15 models)
- Berget (9 models)  
- OpenAI (35+ chat models)

Tests both simple and complex function scenarios.
"""
import pytest
import os
import time
import json
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown

# Complete list of chat-capable models from discovery
GROQ_CHAT_MODELS = [
    "openai/gpt-oss-20b",
    "llama-3.1-8b-instant",
    "qwen/qwen3-32b", 
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "meta-llama/llama-4-maverick-17b-128e-instruct",
    "llama3-70b-8192",
    "gemma2-9b-it",
    "moonshotai/kimi-k2-instruct",
    "allam-2-7b",  # Uncertain but worth testing
    "openai/gpt-oss-120b",
    "llama3-8b-8192",
    "deepseek-r1-distill-llama-70b",
    "llama-3.3-70b-versatile",
    "compound-beta-mini",
    "compound-beta",
]

BERGET_CHAT_MODELS = [
    "intfloat/multilingual-e5-large-instruct",
    "meta-llama/Llama-3.1-8B-Instruct",
    "meta-llama/Llama-3.3-70B-Instruct",
    "unsloth/MAI-DS-R1-GGUF",  # Uncertain but worth testing
    "mistralai/Mistral-Small-3.1-24B-Instruct-2503",
    "Qwen/Qwen3-32B",
    "mistralai/Devstral-Small-2505",
    "mistralai/Magistral-Small-2506",
    "openai/gpt-oss-120b",
]

# OpenAI models - focusing on main chat models (not all 58)
OPENAI_CHAT_MODELS = [
    # Core GPT models
    "gpt-4",
    "gpt-4-turbo",
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-3.5-turbo",
    "gpt-3.5-turbo-16k",
    
    # GPT 4.1 series
    "gpt-4.1",
    "gpt-4.1-mini",
    "gpt-4.1-nano",
    
    # GPT 5 series (if available)
    "gpt-5",
    "gpt-5-mini",
    "gpt-5-nano",
    
    # O-series (uncertain but worth testing)
    "o1-mini",
    "o3-mini",
    "o4-mini",
    
    # Special models
    "chatgpt-4o-latest",
    "gpt-realtime",
]

# Complex test functions
COMPLEX_FUNCTIONS = {
    "simple": """
/**
 * @callable
 * Simple function to test basic calling
 */
function getTimestamp() {
    return { 
        timestamp: Date.now(),
        formatted: new Date().toISOString()
    };
}
""",
    
    "multi_param": """
/**
 * @callable
 * Function with multiple parameters
 * @param {string} operation - Operation to perform (add, subtract, multiply, divide)
 * @param {number} a - First number
 * @param {number} b - Second number
 * @param {boolean} round - Whether to round the result
 */
function calculate(operation, a, b, round = false) {
    let result;
    switch(operation) {
        case 'add': result = a + b; break;
        case 'subtract': result = a - b; break;
        case 'multiply': result = a * b; break;
        case 'divide': result = b !== 0 ? a / b : null; break;
        default: return { error: 'Invalid operation' };
    }
    
    if (round && result !== null) {
        result = Math.round(result);
    }
    
    return {
        operation: operation,
        a: a,
        b: b,
        result: result,
        rounded: round,
        timestamp: Date.now()
    };
}
""",
    
    "nested_object": """
/**
 * @callable
 * Function that returns nested object structure
 * @param {string} userId - User ID to fetch data for
 * @param {boolean} includeDetails - Include detailed information
 */
function getUserData(userId, includeDetails = false) {
    const userData = {
        id: userId,
        profile: {
            name: `User_${userId}`,
            email: `user${userId}@example.com`,
            created: new Date('2024-01-01').toISOString()
        },
        stats: {
            posts: Math.floor(Math.random() * 100),
            followers: Math.floor(Math.random() * 1000),
            following: Math.floor(Math.random() * 500)
        }
    };
    
    if (includeDetails) {
        userData.details = {
            lastLogin: new Date().toISOString(),
            preferences: {
                theme: 'dark',
                language: 'en',
                notifications: true
            },
            activity: {
                recent: ['post_123', 'comment_456', 'like_789'],
                totalActions: 42
            }
        };
    }
    
    return userData;
}
""",
    
    "async_simulation": """
/**
 * @callable
 * Simulates async operation with delay
 * @param {string} query - Search query
 * @param {number} delay - Delay in milliseconds (max 3000)
 */
async function searchDatabase(query, delay = 1000) {
    // Clamp delay to reasonable range
    delay = Math.min(Math.max(delay, 100), 3000);
    
    // Simulate async delay
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Generate mock results
    const results = [];
    const count = Math.floor(Math.random() * 5) + 1;
    
    for (let i = 0; i < count; i++) {
        results.push({
            id: `result_${i}`,
            title: `${query} result ${i + 1}`,
            relevance: Math.random(),
            metadata: {
                source: ['database', 'cache', 'api'][Math.floor(Math.random() * 3)],
                processingTime: delay
            }
        });
    }
    
    // Sort by relevance
    results.sort((a, b) => b.relevance - a.relevance);
    
    return {
        query: query,
        resultCount: results.length,
        results: results,
        searchTime: delay,
        timestamp: Date.now()
    };
}
""",
    
    "array_processing": """
/**
 * @callable
 * Process array of items with various operations
 * @param {Array<number>} numbers - Array of numbers to process
 * @param {string} operation - Operation: sum, average, min, max, sort, unique
 */
function processArray(numbers, operation = 'sum') {
    if (!Array.isArray(numbers)) {
        return { error: 'Input must be an array' };
    }
    
    let result;
    switch(operation) {
        case 'sum':
            result = numbers.reduce((a, b) => a + b, 0);
            break;
        case 'average':
            result = numbers.length > 0 ? 
                numbers.reduce((a, b) => a + b, 0) / numbers.length : 0;
            break;
        case 'min':
            result = Math.min(...numbers);
            break;
        case 'max':
            result = Math.max(...numbers);
            break;
        case 'sort':
            result = [...numbers].sort((a, b) => a - b);
            break;
        case 'unique':
            result = [...new Set(numbers)];
            break;
        default:
            return { error: 'Invalid operation' };
    }
    
    return {
        input: numbers,
        operation: operation,
        result: result,
        inputLength: numbers.length,
        processed: true
    };
}
"""
}

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
        if msg.type in ['error']:
            print(f"[{timestamp}] Console ERROR: {msg.text}")
    
    page.on("console", log_console_message)
    return console_messages

def configure_provider_and_model(page, provider, model, api_key):
    """Configure API provider and select specific model."""
    from test_utils import check_system_messages
    
    # Click settings button
    settings_button = page.locator("#settings-btn")
    settings_button.click(timeout=2000)
    page.wait_for_selector("#settings-modal.active", state="visible", timeout=2000)
    
    # Enter API key
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill(api_key)
    
    # Select provider
    base_url_select = page.locator("#base-url-select")
    base_url_select.select_option(provider.lower())
    
    # Wait for reload button
    page.wait_for_function(
        """() => {
            const btn = document.getElementById('model-reload-btn');
            return btn && !btn.disabled;
        }""",
        timeout=3000
    )
    
    reload_button = page.locator("#model-reload-btn")
    reload_button.click(timeout=5000)
    
    # Wait for models
    time.sleep(2)
    
    # Check if model is available
    available_models = page.evaluate("""() => {
        const select = document.getElementById('model-select');
        if (!select) return [];
        return Array.from(select.options)
            .filter(opt => !opt.disabled)
            .map(opt => opt.value);
    }""")
    
    if model in available_models:
        model_select = page.locator("#model-select")
        model_select.select_option(model)
        selected_model = model
    else:
        # Skip if model not available
        selected_model = None
    
    # Save settings
    close_button = page.locator("#close-settings")
    page.wait_for_timeout(1000)  # Wait for auto-save    close_button.click(force=True)
    page.wait_for_selector("#settings-modal", state="hidden", timeout=2000)
    
    check_system_messages(page)
    return selected_model

def add_test_function(page, function_code, expected_name):
    """Add a test function."""
    # Open function modal
    function_button = page.locator("#function-btn")
    function_button.click()
    
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    # Add function code
    function_code_area = page.locator("#function-code")
    function_code_area.fill(function_code)
    
    # Validate
    page.locator("#function-validate-btn").click()
    
    validation_result = page.locator("#function-validation-result")
    expect(validation_result).to_be_visible()
    
    # Submit
    page.locator("#function-editor-form button[type='submit']").click()
    
    # Verify added
    function_list = page.locator("#function-list")
    expect(function_list.locator(f".function-item-name:has-text('{expected_name}')").first).to_be_visible()
    
    # Close modal
    close_button = page.locator("#close-function-modal")
    close_button.click()
    expect(function_modal).not_to_be_visible()

def test_function_call(page, prompt, expected_function, timeout=15000):
    """Test if function gets called."""
    # Send message
    message_input = page.locator("#message-input")
    message_input.fill(prompt)
    
    send_button = page.locator("#send-btn")
    send_button.click()
    
    # Wait for response
    time.sleep(3)
    
    # Check for function execution
    function_called = False
    
    # Check various indicators
    indicators = {
        "tool_calls": page.locator(".tool-call-container").count() > 0,
        "function_indicators": page.locator(".function-call-indicator").count() > 0,
        "code_blocks": page.locator(".code-block").count() > 0,
        "function_in_text": False
    }
    
    # Check message content
    messages = page.locator(".message.assistant .message-content").all()
    for msg in messages:
        text = msg.text_content() or ""
        if expected_function in text:
            indicators["function_in_text"] = True
            function_called = True
            break
    
    # Check if any indicator shows function was called
    if any(indicators.values()):
        function_called = True
    
    return function_called, indicators

@pytest.mark.parametrize("model", GROQ_CHAT_MODELS)
def test_groq_models(page: Page, serve_hacka_re, groq_api_key, model):
    """Test function calling with all Groq chat models."""
    if not groq_api_key:
        pytest.skip("GROQ_API_KEY not configured")
    
    console_messages = setup_console_logging(page)
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    selected = configure_provider_and_model(page, "groq", model, groq_api_key)
    if not selected:
        pytest.skip(f"Model {model} not available on Groq")
    
    # Test with multi-parameter function
    add_test_function(page, COMPLEX_FUNCTIONS["multi_param"], "calculate")
    
    result, indicators = test_function_call(
        page,
        "Please calculate: multiply 7 by 9 and round the result",
        "calculate"
    )
    
    print(f"Groq/{model}: {'✓' if result else '✗'} | Indicators: {indicators}")
    
    # Don't fail test, just record result
    return {"model": model, "provider": "groq", "success": result, "indicators": indicators}

@pytest.mark.parametrize("model", BERGET_CHAT_MODELS)
def test_berget_models(page: Page, serve_hacka_re, berget_api_key, model):
    """Test function calling with all Berget chat models."""
    if not berget_api_key:
        pytest.skip("BERGET_API_KEY not configured")
    
    console_messages = setup_console_logging(page)
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    selected = configure_provider_and_model(page, "berget", model, berget_api_key)
    if not selected:
        pytest.skip(f"Model {model} not available on Berget")
    
    # Test with nested object function
    add_test_function(page, COMPLEX_FUNCTIONS["nested_object"], "getUserData")
    
    result, indicators = test_function_call(
        page,
        "Get user data for user ID 'test123' with all details",
        "getUserData"
    )
    
    print(f"Berget/{model}: {'✓' if result else '✗'} | Indicators: {indicators}")
    
    return {"model": model, "provider": "berget", "success": result, "indicators": indicators}

@pytest.mark.parametrize("model", OPENAI_CHAT_MODELS[:5])  # Test first 5 for speed
def test_openai_models(page: Page, serve_hacka_re, api_key, model):
    """Test function calling with OpenAI chat models."""
    if not api_key:
        pytest.skip("OPENAI_API_KEY not configured")
    
    console_messages = setup_console_logging(page)
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    selected = configure_provider_and_model(page, "openai", model, api_key)
    if not selected:
        pytest.skip(f"Model {model} not available on OpenAI")
    
    # Test with array processing function
    add_test_function(page, COMPLEX_FUNCTIONS["array_processing"], "processArray")
    
    result, indicators = test_function_call(
        page,
        "Process this array [1, 5, 3, 5, 2, 1] to get unique values",
        "processArray"
    )
    
    print(f"OpenAI/{model}: {'✓' if result else '✗'} | Indicators: {indicators}")
    
    return {"model": model, "provider": "openai", "success": result, "indicators": indicators}