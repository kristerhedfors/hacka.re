import pytest
import time
import os
import inspect
from playwright.sync_api import Page, expect

# Import API key persistence fixes
try:
    from test_helpers.api_key_fix import (
        ensure_api_key_persisted,
        configure_api_key_with_retry,
        wait_for_api_ready
    )
except ImportError:
    # Fallback if helper not available
    ensure_api_key_persisted = None
    configure_api_key_with_retry = None
    wait_for_api_ready = None

def setup_test_environment(page):
    """Set up test environment after page navigation to prevent welcome modal."""
    # Create a hackare_ variable to indicate user has visited before
    page.evaluate("localStorage.setItem('hackare_test_mode', 'true')")
    print("Test environment configured: hackare_test_mode=true")

def setup_api_key_properly(page, api_key):
    """
    Properly configure API key with retry logic to handle persistence issues.
    
    Args:
        page: Playwright page object
        api_key: API key to configure
        
    Returns:
        bool: True if API key was successfully configured
    """
    # Wait for API system to be ready
    if wait_for_api_ready:
        if not wait_for_api_ready(page):
            print("Warning: API system may not be fully initialized")
    
    # Try to configure with retry logic
    if configure_api_key_with_retry:
        success = configure_api_key_with_retry(page, api_key, use_modal=False)
        if success:
            print("API key configured successfully with persistence fix")
            return True
    
    # Fallback to standard method
    try:
        page.evaluate(f"""
            () => {{
                // Try multiple storage methods
                localStorage.setItem('openai_api_key', '{api_key}');
                
                // Also try with namespace
                const namespace = localStorage.getItem('namespace') || 'default';
                localStorage.setItem(namespace + '_openai_api_key', '{api_key}');
                
                // Force a storage event
                window.dispatchEvent(new StorageEvent('storage', {{
                    key: 'openai_api_key',
                    newValue: '{api_key}',
                    storageArea: localStorage
                }}));
            }}
        """)
        print("API key configured using fallback method")
        return True
    except Exception as e:
        print(f"Failed to configure API key: {e}")
        return False

# Maximum allowed time for any operation (in seconds)
MAX_OPERATION_TIME = 1.5

# Import OPENAI_API_MODEL from conftest
import os
import sys
sys.path.append(os.path.dirname(__file__))
try:
    from conftest import ACTIVE_TEST_CONFIG, TEST_PROVIDER
    # Recommended model for tests (from centralized config)
    RECOMMENDED_TEST_MODEL = ACTIVE_TEST_CONFIG["model"]
    TEST_PROVIDER_NAME = TEST_PROVIDER
    TEST_BASE_URL = ACTIVE_TEST_CONFIG["base_url"]
    TEST_API_KEY = ACTIVE_TEST_CONFIG["api_key"]
except ImportError:
    # Fallback to default model if import fails
    RECOMMENDED_TEST_MODEL = "gpt-5-nano"
    TEST_PROVIDER_NAME = "openai"
    TEST_BASE_URL = "https://api.openai.com/v1"
    TEST_API_KEY = None

class OperationTimeoutError(Exception):
    """Exception raised when an operation takes too long."""
    pass

# Helper function to measure and print execution time
def timed_test(func):
    def wrapper(*args, **kwargs):
        # Check if args is empty or if the first argument is not a page object
        if not args or not hasattr(args[0], 'goto'):
            print(f"Warning: timed_test decorator used on {func.__name__} but page object not found as first argument")
            return func(*args, **kwargs)
            
        # Extract the page object from args
        page = args[0]
        
        # Store original methods to time them
        original_goto = page.goto
        original_locator = page.locator
        
        # Create timed version of goto
        def timed_goto(url, **kwargs):
            start_time = time.time()
            result = original_goto(url, **kwargs)
            end_time = time.time()
            operation_time = end_time - start_time
            print(f"goto({url}): {operation_time:.3f}s")
            if operation_time > MAX_OPERATION_TIME:
                raise OperationTimeoutError(f"goto({url}) took {operation_time:.3f}s, which exceeds the maximum allowed time of {MAX_OPERATION_TIME}s")
            return result
        
        # Create timed version of locator.click
        def timed_locator(selector):
            loc = original_locator(selector)
            original_click = loc.click
            
            def timed_click(**kwargs):
                start_time = time.time()
                result = original_click(**kwargs)
                end_time = time.time()
                operation_time = end_time - start_time
                print(f"click({selector}): {operation_time:.3f}s")
                if operation_time > MAX_OPERATION_TIME:
                    raise OperationTimeoutError(f"click({selector}) took {operation_time:.3f}s, which exceeds the maximum allowed time of {MAX_OPERATION_TIME}s")
                return result
            
            loc.click = timed_click
            return loc
        
        # Replace methods with timed versions
        page.goto = timed_goto
        page.locator = timed_locator
        
        # Time the entire test
        start_time = time.time()
        result = func(*args, **kwargs)
        end_time = time.time()
        execution_time = end_time - start_time
        print(f"\n⏱️ {func.__name__} completed in {execution_time:.3f} seconds")
        
        # Restore original methods
        page.goto = original_goto
        page.locator = original_locator
        
        return result
    return wrapper

# Helper function to dismiss any modal if present
def dismiss_modal(page, modal_id):
    """Dismiss a modal if it's visible."""
    modal = page.locator(f"#{modal_id}")
    if modal.is_visible():
        print(f"{modal_id} is visible, closing it")
        
        # Try to find a close button with various selectors, but use first() to avoid strict mode violations
        selectors = [
            f"#close-{modal_id}",
            f"#{modal_id} .close-btn",
            f"#{modal_id} .close"
        ]
        
        for selector in selectors:
            close_button = page.locator(selector)
            if close_button.count() > 0:
                print(f"Found close button with selector: {selector}")
                try:
                    # Use first() to avoid strict mode violations when multiple elements match
                    close_button.first.click(force=True, timeout=2000)
                    print("Clicked close button")
                    # Check if modal is still visible
                    if not modal.is_visible():
                        print("Modal closed successfully")
                        return
                except Exception as e:
                    print(f"Error clicking close button: {e}")
        
        # If we need to handle multiple buttons, use a more specific approach
        if modal_id == "settings-modal":
            try:
                # Use the specific ID for the close button
                close_settings = page.locator("#close-settings")
                if close_settings.is_visible():
                    close_settings.click(force=True, timeout=2000)
                    print("Clicked close-settings button")
                    if not modal.is_visible():
                        print("Settings modal closed successfully")
                        return
            except Exception as e:
                print(f"Error clicking close-settings button: {e}")
        
        # If no close button works, try JavaScript to remove the modal
        print("Trying JavaScript to remove modal")
        page.evaluate(f"""() => {{
            const modal = document.querySelector('#{modal_id}');
            if (modal) {{
                modal.classList.remove('active');
                modal.style.display = 'none';
            }}
        }}""")
        
        # Check if modal is still visible after JavaScript
        if not modal.is_visible():
            print("Modal closed successfully with JavaScript")
            return
            
        # As a last resort, try clicking at different positions
        print("Trying to click at different positions")
        positions = [(10, 10), (50, 50), (100, 100), (200, 200)]
        for x, y in positions:
            try:
                page.mouse.click(x, y)
                print(f"Clicked at position ({x}, {y})")
                # Check if modal is gone
                if not modal.is_visible():
                    print(f"Modal closed successfully by clicking at ({x}, {y})")
                    return
            except Exception as e:
                print(f"Error clicking at position ({x}, {y}): {e}")
                
        print(f"WARNING: Could not close {modal_id}")

# Helper function to dismiss welcome modal if present
def dismiss_welcome_modal(page):
    """Dismiss the welcome modal if it's visible."""
    dismiss_modal(page, "welcome-modal")
    
# Helper function to dismiss settings modal if present
def dismiss_settings_modal(page):
    """Dismiss the settings modal if it's visible."""
    dismiss_modal(page, "settings-modal")

# Helper function to dismiss API key modal if present
def dismiss_api_key_modal(page):
    """Dismiss the API key modal if it's visible."""
    dismiss_modal(page, "api-key-modal")

# Helper function to check for system messages in the chat window
def check_system_messages(page):
    """Check for system messages in the chat window and print them."""
    # System messages have a different background color and class
    system_messages = page.locator(".message.system .message-content")
    count = system_messages.count()
    
    if count > 0:
        print(f"Found {count} system messages:")
        for i in range(count):
            message = system_messages.nth(i).text_content()
            print(f"  System message {i+1}: {message}")
            
            # Categorize messages based on content
            if "error" in message.lower():
                print(f"  ⚠️ ERROR: {message}")
            elif "warning" in message.lower():
                print(f"  ⚠️ WARNING: {message}")
            elif "key" in message.lower() or "decrypt" in message.lower() or "encrypt" in message.lower():
                print(f"  🔑 CRYPTO: {message}")
            elif "load" in message.lower() or "save" in message.lower() or "storage" in message.lower():
                print(f"  💾 STORAGE: {message}")
            elif "api" in message.lower():
                print(f"  🌐 API: {message}")
            else:
                print(f"  ℹ️ INFO: {message}")
    
    return system_messages

# Helper function to take a screenshot and save a corresponding markdown file
def screenshot_with_markdown(page, name, debug_info=None):
    """
    Take a screenshot and save a corresponding markdown file with debug information.
    
    Args:
        page: The Playwright page object
        name: The name of the screenshot (without extension)
        debug_info: Optional dictionary with additional debug information to include in the markdown
    
    Returns:
        tuple: (screenshot_path, markdown_path) - Paths to the created files
    """
    # Construct paths using the screenshots and screenshots_data directories in the correct location
    # Get the directory where this test_utils.py file is located (_tests/playwright/)
    test_dir = os.path.dirname(__file__)
    screenshot_dir = os.path.join(test_dir, "screenshots")
    screenshot_data_dir = os.path.join(test_dir, "screenshots_data")
    
    # Ensure the name doesn't have an extension
    name = name.replace('.png', '')
    
    # Construct the full paths
    screenshot_path = os.path.join(screenshot_dir, f"{name}.png")
    md_path = os.path.join(screenshot_data_dir, f"{name}.md")
    
    # Ensure the directories exist
    os.makedirs(screenshot_dir, exist_ok=True)
    os.makedirs(screenshot_data_dir, exist_ok=True)
    
    # Take the screenshot
    page.screenshot(path=screenshot_path)
    
    # Get the calling test information
    frame = inspect.currentframe().f_back
    test_file = frame.f_code.co_filename
    test_name = frame.f_code.co_name
    
    # Prepare the markdown content
    md_content = f"# Screenshot Debug Info\n\n"
    md_content += f"## Test Information\n\n"
    md_content += f"- **Test File**: {os.path.basename(test_file)}\n"
    md_content += f"- **Test Name**: {test_name}\n"
    md_content += f"- **Screenshot Time**: {time.strftime('%Y-%m-%d %H:%M:%S')}\n\n"
    
    # Add page information
    md_content += f"## Page Information\n\n"
    md_content += f"- **URL**: {page.url}\n"
    md_content += f"- **Title**: {page.title()}\n\n"
    
    # Add custom debug information if provided
    if debug_info:
        md_content += f"## Debug Information\n\n"
        for key, value in debug_info.items():
            md_content += f"- **{key}**: {value}\n"
        md_content += "\n"
    
    # Add console logs if available
    console_logs = page.evaluate("""() => {
        return window.consoleErrors || [];
    }""")
    
    if console_logs and len(console_logs) > 0:
        md_content += f"## Console Logs\n\n"
        for log in console_logs:
            md_content += f"- {log}\n"
        md_content += "\n"
    
    # Write the markdown file
    with open(md_path, 'w') as f:
        f.write(md_content)
    
    return screenshot_path, md_path

def enable_yolo_mode(page):
    """
    Enable YOLO mode to bypass Function Execution Modal during tests.
    
    Args:
        page: Playwright page object
    """
    # Open settings modal
    settings_btn = page.locator("#settings-btn")
    settings_btn.click()
    page.wait_for_selector("#settings-modal.active", timeout=5000)
    
    # Check YOLO mode checkbox
    yolo_checkbox = page.locator("#yolo-mode")
    if not yolo_checkbox.is_checked():
        # Set up dialog handler to accept the warning
        page.once("dialog", lambda dialog: dialog.accept())
        yolo_checkbox.click()
        page.wait_for_timeout(500)  # Brief wait for dialog handling
    
    # Close settings
    close_settings = page.locator("#close-settings")
    close_settings.click()
    page.wait_for_selector("#settings-modal.active", state="hidden", timeout=5000)
    print("YOLO mode enabled - Function Execution Modal bypassed")

def handle_function_execution_modal(page, action="execute", timeout=5000):
    """
    Handle the Function Execution Modal that appears for function calls.
    
    Args:
        page: Playwright page object
        action: Action to take - "execute", "execute-intercept", or "block"
        timeout: Timeout in milliseconds to wait for modal
        
    Returns:
        bool: True if modal was handled, False if no modal appeared
    """
    try:
        # Check if Function Execution Modal appears
        modal = page.locator("#function-execution-modal")
        modal.wait_for(state="visible", timeout=timeout)
        
        # Perform the requested action
        if action == "execute":
            execute_btn = modal.locator("#exec-execute-btn")
            execute_btn.click()
            print("Function Execution Modal: Clicked Execute")
        elif action == "execute-intercept":
            intercept_btn = modal.locator("#exec-intercept-btn")
            intercept_btn.click()
            print("Function Execution Modal: Clicked Execute and Intercept")
        elif action == "block":
            block_btn = modal.locator("#exec-block-btn")
            block_btn.click()
            print("Function Execution Modal: Clicked Block")
        else:
            raise ValueError(f"Unknown action: {action}")
        
        # Wait for modal to close
        modal.wait_for(state="hidden", timeout=5000)
        return True
        
    except Exception as e:
        # Modal didn't appear (might be in YOLO mode or function already approved)
        print(f"Function Execution Modal did not appear or error: {e}")
        return False

def configure_test_provider_and_model(page, api_key=None):
    """
    Configure the provider, API key, and model based on centralized test configuration.
    This replaces hardcoded provider/model selections throughout tests.
    
    Args:
        page: The Playwright page object
        api_key: Optional API key override (uses TEST_API_KEY by default)
        
    Returns:
        dict: Configuration with provider, model, api_key, and base_url
    """
    from conftest import ACTIVE_TEST_CONFIG, TEST_PROVIDER
    
    config = ACTIVE_TEST_CONFIG.copy()
    if api_key:
        config["api_key"] = api_key
    
    # Open settings modal
    settings_button = page.locator("#settings-btn")
    settings_button.click(timeout=2000)
    page.wait_for_selector("#settings-modal.active", state="visible", timeout=2000)
    
    # Set API key
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill(config["api_key"])
    
    # Select provider
    base_url_select = page.locator("#base-url-select")
    if config["provider_value"] == "custom":
        base_url_select.select_option("custom")
        custom_url_input = page.locator("#custom-base-url")
        custom_url_input.fill(config["base_url"])
    else:
        base_url_select.select_option(config["provider_value"])
    
    # Wait for models to load
    page.wait_for_timeout(500)  # Brief wait for models to populate
    
    # Select model
    model_select = page.locator("#model-select")
    try:
        model_select.select_option(config["model"])
        selected_model = config["model"]
    except:
        # If configured model not available, use select_recommended_test_model
        selected_model = select_recommended_test_model(page)
    
    # Close settings
    close_button = page.locator("#close-settings")
    close_button.click()
    page.wait_for_selector("#settings-modal", state="hidden", timeout=2000)
    
    config["selected_model"] = selected_model
    return config

# Helper function to select the recommended test model
def select_recommended_test_model(page):
    """
    Select the recommended test model from the centralized configuration.
    The model is determined by the TEST_PROVIDER environment variable.
    If the recommended model is not available, it will select the first available model.
    
    Args:
        page: The Playwright page object
        
    Returns:
        str: The selected model ID
    """
    # Print the available options in the model select dropdown
    print("Available options in model select dropdown:")
    options = page.evaluate("""() => {
        const select = document.getElementById('model-select');
        if (!select) return [];
        return Array.from(select.options).map(option => ({
            value: option.value,
            text: option.textContent,
            disabled: option.disabled
        }));
    }""")
    
    for option in options:
        print(f"  Option: {option.get('text', '')} (value: {option.get('value', '')}, disabled: {option.get('disabled', False)})")
    
    # Check if the recommended model is available
    recommended_model_available = False
    for option in options:
        if option.get('value', '') == RECOMMENDED_TEST_MODEL and not option.get('disabled', False):
            recommended_model_available = True
            break
    
    model_select = page.locator("#model-select")
    
    if recommended_model_available:
        print(f"Selecting recommended test model: {RECOMMENDED_TEST_MODEL}")
        model_select.select_option(RECOMMENDED_TEST_MODEL)
        return RECOMMENDED_TEST_MODEL
    else:
        # If the recommended model is not available, select the first non-disabled option
        for option in options:
            if not option.get('disabled', False):
                first_option_value = option.get('value', '')
                print(f"Recommended model not available. Selecting first option: {first_option_value}")
                model_select.select_option(first_option_value)
                return first_option_value
        
        print("No valid options found in model select dropdown")
        return None

def set_test_model_in_storage(page):
    """
    Set the test model directly in localStorage based on centralized configuration.
    This is for tests that bypass the UI and set the model directly.
    
    Args:
        page: The Playwright page object
        
    Returns:
        str: The model that was set
    """
    from conftest import ACTIVE_TEST_CONFIG
    model = ACTIVE_TEST_CONFIG["model"]
    page.evaluate(f"localStorage.setItem('selected_model', '{model}')")
    print(f"Set test model in localStorage: {model}")
    return model

def set_test_provider_in_storage(page):
    """
    Set the test provider directly in localStorage based on centralized configuration.
    
    Args:
        page: The Playwright page object
        
    Returns:
        str: The provider that was set
    """
    from conftest import ACTIVE_TEST_CONFIG, TEST_PROVIDER
    
    # Map provider names to what the UI expects
    provider_map = {
        "openai": "openai",
        "groq": "groq",
        "custom": "custom"
    }
    
    provider = provider_map.get(TEST_PROVIDER, "openai")
    base_url = ACTIVE_TEST_CONFIG["base_url"]
    api_key = ACTIVE_TEST_CONFIG["api_key"]
    model = ACTIVE_TEST_CONFIG["model"]
    
    # Set all relevant localStorage items
    page.evaluate(f"""
        localStorage.setItem('selected_base_url', '{provider}');
        localStorage.setItem('selected_model', '{model}');
        localStorage.setItem('openai_api_key', '{api_key}');
        {f"localStorage.setItem('custom_base_url', '{base_url}');" if provider == "custom" else ""}
    """)
    
    print(f"Set test provider in localStorage: {provider} with model {model}")
    return provider
