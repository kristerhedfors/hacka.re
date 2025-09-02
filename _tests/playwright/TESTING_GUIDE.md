# Playwright Testing Guide for hacka.re

This guide provides common patterns, utilities, and best practices for testing the hacka.re web application using Playwright.

## Common Testing Patterns

### Standard Test Setup

All tests should follow this basic setup pattern:

```python
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown
from playwright.sync_api import Page, expect

def test_feature(page: Page, serve_hacka_re):
    """Test description"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)  # Only if needed
    
    # Test implementation
    # ...
    
    screenshot_with_markdown(page, "test_name", {
        "Status": "Test completed",
        "Component": "Component name",
        "Action": "Action performed"
    })
```

### Modal Operations

#### Opening Modals
```python
# Standard modal opening pattern
def open_modal(page: Page, button_id: str, modal_id: str):
    page.locator(f"#{button_id}").click()
    modal = page.locator(f"#{modal_id}")
    expect(modal).to_be_visible()
    return modal

# Examples:
settings_modal = open_modal(page, "settings-btn", "settings-modal")
prompts_modal = open_modal(page, "prompts-btn", "prompts-modal")
function_modal = open_modal(page, "function-btn", "function-modal")
share_modal = open_modal(page, "share-btn", "share-modal")
```

#### Closing Modals
```python
# Standard modal closing pattern
def close_modal(page: Page, modal_id: str, close_button_id: str = None):
    if close_button_id is None:
        close_button_id = f"close-{modal_id.replace('-modal', '')}"
    
    page.locator(f"#{close_button_id}").click()
    modal = page.locator(f"#{modal_id}")
    expect(modal).not_to_be_visible()

# Examples:
close_modal(page, "settings-modal")  # Uses #close-settings
close_modal(page, "prompts-modal")   # Uses #close-prompts
close_modal(page, "function-modal")  # Uses #close-function
```

#### Modal State Verification
```python
# Verify modal is in expected state
def verify_modal_state(page: Page, modal_id: str, should_be_visible: bool = True):
    modal = page.locator(f"#{modal_id}")
    if should_be_visible:
        expect(modal).to_be_visible()
        expect(modal).to_have_class("active")
    else:
        expect(modal).not_to_be_visible()
        expect(modal).not_to_have_class("active")
```

### Dialog Handling

#### Confirmation Dialogs
```python
# Handle confirmation dialogs (accept/dismiss)
def handle_dialog(page: Page, accept: bool = True):
    dialog_handled = False
    
    def on_dialog(dialog):
        nonlocal dialog_handled
        dialog_handled = True
        if accept:
            dialog.accept()
        else:
            dialog.dismiss()
    
    page.on("dialog", on_dialog)
    return lambda: dialog_handled

# Usage:
dialog_handler = handle_dialog(page, accept=True)
delete_button.click()
# Verify dialog was handled if needed
assert dialog_handler()
```

#### Alert Dialogs
```python
# Handle alert dialogs
def handle_alert(page: Page):
    alert_message = None
    
    def on_dialog(dialog):
        nonlocal alert_message
        alert_message = dialog.message
        dialog.accept()
    
    page.on("dialog", on_dialog)
    return lambda: alert_message

# Usage:
get_alert = handle_alert(page)
trigger_action.click()
alert_text = get_alert()
```

### Form Operations

#### Form Filling
```python
# Standard form filling pattern
def fill_form_field(page: Page, field_id: str, value: str, field_type: str = "input"):
    if field_type == "select":
        page.locator(f"#{field_id}").select_option(value)
    elif field_type == "checkbox":
        if value.lower() in ["true", "checked", "1"]:
            page.locator(f"#{field_id}").check()
        else:
            page.locator(f"#{field_id}").uncheck()
    else:
        page.locator(f"#{field_id}").fill(value)

# Examples:
fill_form_field(page, "api-key-update", "sk-test123")
fill_form_field(page, "base-url-select", "openai", "select")
fill_form_field(page, "enable-tool-calling", "true", "checkbox")
```

#### Form Submission
```python
# Standard form submission with validation
def submit_form(page: Page, form_selector: str, submit_button_id: str = None):
    if submit_button_id:
        page.locator(f"#{submit_button_id}").click()
    else:
        page.locator(f"{form_selector} button[type='submit']").click()

# Examples:
submit_form(page, "#settings-form", "save-settings-btn")
submit_form(page, "#function-editor-form")  # Uses default submit button
```

### Element Waiting Strategies

#### Wait for Element States
```python
# Wait for element to be in specific state
def wait_for_element_state(page: Page, selector: str, state: str = "visible", timeout: int = 5000):
    page.wait_for_selector(selector, state=state, timeout=timeout)

# Wait for element content to change
def wait_for_content_change(page: Page, selector: str, expected_content: str = None, timeout: int = 5000):
    if expected_content:
        page.wait_for_function(f"""
            () => document.querySelector('{selector}').textContent.includes('{expected_content}')
        """, timeout=timeout)
    else:
        page.wait_for_selector(f"{selector}:not(:empty)", state="visible", timeout=timeout)

# Wait for attribute change
def wait_for_attribute(page: Page, selector: str, attribute: str, value: str, timeout: int = 5000):
    page.wait_for_function(f"""
        () => document.querySelector('{selector}').getAttribute('{attribute}') === '{value}'
    """, timeout=timeout)
```

#### Scroll and Visibility
```python
# Ensure element is visible before interaction
def ensure_element_visible(page: Page, selector: str):
    element = page.locator(selector)
    element.scroll_into_view_if_needed()
    expect(element).to_be_visible()
    return element

# Wait for element and ensure visibility
def wait_and_ensure_visible(page: Page, selector: str, timeout: int = 5000):
    wait_for_element_state(page, selector, "visible", timeout)
    return ensure_element_visible(page, selector)
```

### API Configuration Patterns

#### Configure API Key and Model
```python
def configure_api_key_and_model(page: Page, api_key: str, model: str = "gpt-5-nano"):
    # Open settings modal
    page.locator("#settings-btn").click()
    expect(page.locator("#settings-modal")).to_be_visible()
    
    # Set API key
    api_key_field = page.locator("#api-key-update")
    api_key_field.fill(api_key)
    
    # Select model
    model_select = page.locator("#model-select")
    model_select.select_option(model)
    
    # Save settings
    page.locator("#save-settings-btn").click()
    expect(page.locator("#settings-modal")).not_to_be_visible()

# Enable tool calling
def enable_tool_calling_and_function_tools(page: Page):
    page.locator("#settings-btn").click()
    
    # Enable tool calling if available
    tool_calling_checkbox = page.locator("#enable-tool-calling")
    if tool_calling_checkbox.count() > 0:
        tool_calling_checkbox.check()
    
    # Enable function tools if available
    function_tools_checkbox = page.locator("#enable-function-tools")
    if function_tools_checkbox.count() > 0:
        function_tools_checkbox.check()
    
    page.locator("#save-settings-btn").click()
    expect(page.locator("#settings-modal")).not_to_be_visible()
```

### Storage and State Management

#### LocalStorage Operations
```python
# Get localStorage value
def get_local_storage(page: Page, key: str):
    return page.evaluate(f"() => localStorage.getItem('{key}')")

# Set localStorage value
def set_local_storage(page: Page, key: str, value: str):
    page.evaluate(f"() => localStorage.setItem('{key}', '{value}')")

# Clear localStorage
def clear_local_storage(page: Page, key: str = None):
    if key:
        page.evaluate(f"() => localStorage.removeItem('{key}')")
    else:
        page.evaluate("() => localStorage.clear()")

# Check if localStorage key exists
def has_local_storage_key(page: Page, key: str):
    return page.evaluate(f"() => localStorage.getItem('{key}') !== null")
```

#### Application State Verification
```python
# Check if API key is configured
def is_api_key_configured(page: Page):
    return has_local_storage_key(page, "openai_api_key")

# Check if functions are defined
def get_function_count(page: Page):
    js_functions = get_local_storage(page, "js_functions")
    if js_functions and js_functions != "null":
        return len(eval(js_functions))
    return 0

# Check current model
def get_current_model(page: Page):
    return get_local_storage(page, "openai_api_model") or "gpt-5-nano"
```

### Console Logging and Debugging

#### Setup Console Logging
```python
def setup_console_logging(page: Page):
    """Capture and log console messages for debugging"""
    def log_console_message(msg):
        print(f"Console {msg.type}: {msg.text}")
    
    page.on("console", log_console_message)

# Setup error tracking
def setup_error_tracking(page: Page):
    """Capture JavaScript errors for debugging"""
    errors = []
    
    def log_error(msg):
        if msg.type == "error":
            errors.append(msg.text)
    
    page.on("console", log_error)
    return lambda: errors
```

#### Debug Information Collection
```python
def collect_debug_info(page: Page, test_phase: str):
    """Collect comprehensive debug information"""
    return {
        "Test Phase": test_phase,
        "Page URL": page.url,
        "Page Title": page.title(),
        "Local Storage Keys": str(page.evaluate("() => Object.keys(localStorage)")),
        "API Key Configured": str(is_api_key_configured(page)),
        "Current Model": get_current_model(page),
        "Function Count": str(get_function_count(page))
    }
```

### Asynchronous Operations

#### Wait for API Responses
```python
# Wait for model list to load
def wait_for_models_loaded(page: Page, timeout: int = 10000):
    page.wait_for_function("""
        () => {
            const select = document.querySelector('#model-select');
            return select && select.options.length > 1;
        }
    """, timeout=timeout)

# Wait for token count update
def wait_for_token_count_update(page: Page, timeout: int = 5000):
    page.wait_for_function("""
        () => {
            const counter = document.querySelector('.token-counter');
            return counter && counter.textContent !== '0 tokens';
        }
    """, timeout=timeout)

# Wait for validation result
def wait_for_validation_result(page: Page, timeout: int = 5000):
    page.wait_for_selector("#validation-result:not(:empty)", state="visible", timeout=timeout)
```

### Error Handling Patterns

#### Try-Catch with Fallbacks
```python
def safe_element_interaction(page: Page, selector: str, action: str, value: str = None, timeout: int = 5000):
    """Safely interact with element with fallback handling"""
    try:
        element = page.locator(selector)
        page.wait_for_selector(selector, state="visible", timeout=timeout)
        
        if action == "click":
            element.click()
        elif action == "fill" and value:
            element.fill(value)
        elif action == "check":
            element.check()
        elif action == "uncheck":
            element.uncheck()
        
        return True
    except Exception as e:
        print(f"Element interaction failed: {selector} - {action} - {e}")
        return False

# Retry mechanism
def retry_action(page: Page, action_func, max_retries: int = 3, delay: int = 1000):
    """Retry an action with exponential backoff"""
    for attempt in range(max_retries):
        try:
            return action_func()
        except Exception as e:
            if attempt == max_retries - 1:
                raise e
            page.wait_for_timeout(delay * (2 ** attempt))
```

### Screenshot and Debug Documentation

#### Enhanced Screenshot Function
```python
def take_debug_screenshot(page: Page, name: str, debug_info: dict, component: str = "Unknown"):
    """Take screenshot with comprehensive debug information"""
    enhanced_debug_info = {
        "Component": component,
        "Timestamp": str(datetime.now()),
        **debug_info,
        **collect_debug_info(page, debug_info.get("Status", "Unknown"))
    }
    
    screenshot_with_markdown(page, name, enhanced_debug_info)
```

## Best Practices

### Test Organization
1. **Use descriptive test names** that explain what is being tested
2. **Group related tests** in the same file or class
3. **Follow the AAA pattern** (Arrange, Act, Assert)
4. **Include debug information** with all screenshots

### Element Selection
1. **Prefer ID selectors** over class or text-based selectors
2. **Use data-testid attributes** for elements specifically for testing
3. **Avoid complex CSS selectors** that are brittle
4. **Check element visibility** before interaction

### Waiting Strategies
1. **Never use arbitrary timeouts** (`page.wait_for_timeout()`)
2. **Wait for specific conditions** rather than fixed time periods
3. **Use appropriate timeout values** (5s for UI, 10s for API calls)
4. **Handle slow operations** with longer timeouts

### Error Handling
1. **Always handle expected dialogs** before triggering them
2. **Provide meaningful error messages** in assertions
3. **Include debug information** when tests fail
4. **Clean up state** after tests (localStorage, server state)

### Performance
1. **Minimize browser interactions** by batching operations
2. **Reuse page instances** when possible
3. **Use headless mode** for CI/CD pipelines
4. **Cache expensive operations** (API key configuration)

## Common Pitfalls

### Modal Interference
- Always dismiss welcome and settings modals before starting tests
- Check for existing modals that might block interactions
- Handle modal animations and transitions properly

### Timing Issues
- Don't rely on arbitrary waits
- Wait for specific element states or content changes
- Handle asynchronous operations properly

### State Contamination
- Clear localStorage between tests when needed
- Reset application state to known conditions
- Handle persistent server-side state

### Element Not Found
- Check element visibility before interaction
- Scroll elements into view when needed
- Verify element exists before attempting interaction

This guide provides the foundation for consistent, reliable testing across the hacka.re application. Refer to specific modal documentation for component-specific patterns and examples.