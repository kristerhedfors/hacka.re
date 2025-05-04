import pytest
import time
from playwright.sync_api import Page, expect

# Maximum allowed time for any operation (in seconds)
MAX_OPERATION_TIME = 2.0

# Recommended model for tests (as per README)
RECOMMENDED_TEST_MODEL = "llama-3.1-8b-instant"

class OperationTimeoutError(Exception):
    """Exception raised when an operation takes too long."""
    pass

# Helper function to measure and print execution time
def timed_test(func):
    def wrapper(page, serve_hacka_re):
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
        result = func(page, serve_hacka_re)
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
                    close_button.first.click(force=True, timeout=1000)
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
                    close_settings.click(force=True, timeout=1000)
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

# Helper function to select the recommended test model
def select_recommended_test_model(page):
    """
    Select the recommended test model (llama-3.1-8b-instant) from the model dropdown.
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
