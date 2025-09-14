"""
Test capture utilities to ensure all tests capture console and screenshots.
"""
import os
import json
import time
from datetime import datetime
from pathlib import Path


def screenshot_with_markdown(page, phase_name, metadata=None):
    """
    Take a screenshot and save metadata in markdown format.
    
    Args:
        page: Playwright page object
        phase_name: Name of the test phase (e.g., "01_initial", "02_after_action")
        metadata: Dict of metadata to save with screenshot
    """
    # Get the test name from the current test context
    import inspect
    frame = inspect.currentframe()
    test_name = "unknown_test"
    
    # Walk up the stack to find the test function
    while frame:
        func_name = frame.f_code.co_name
        if func_name.startswith("test_"):
            test_name = func_name
            break
        frame = frame.f_back
    
    # Create directories if they don't exist
    screenshots_dir = Path("screenshots")
    metadata_dir = Path("screenshots_data")
    screenshots_dir.mkdir(exist_ok=True)
    metadata_dir.mkdir(exist_ok=True)
    
    # Generate filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{test_name}_{phase_name}_{timestamp}"
    
    # Take screenshot
    screenshot_path = screenshots_dir / f"{filename}.png"
    page.screenshot(path=str(screenshot_path))
    
    # Save metadata
    if metadata:
        metadata_path = metadata_dir / f"{filename}.md"
        with open(metadata_path, 'w') as f:
            f.write(f"# Screenshot: {filename}\n\n")
            f.write(f"**Test**: {test_name}\n")
            f.write(f"**Phase**: {phase_name}\n")
            f.write(f"**Timestamp**: {timestamp}\n\n")
            f.write("## Metadata\n\n")
            for key, value in metadata.items():
                f.write(f"- **{key}**: {value}\n")
    
    print(f"📸 Screenshot saved: {screenshot_path}")
    if metadata:
        print(f"📝 Metadata saved: {metadata_path}")
    
    return str(screenshot_path)


def setup_console_capture(page, test_name=None):
    """
    Set up console message capture for a test.
    
    Args:
        page: Playwright page object
        test_name: Optional test name for logging
        
    Returns:
        list: List to collect console messages
    """
    console_messages = []
    
    def log_console_message(msg):
        timestamp = time.strftime("%H:%M:%S")
        message_data = {
            'timestamp': timestamp,
            'type': msg.type,
            'text': msg.text,
            'location': str(msg.location) if msg.location else None
        }
        console_messages.append(message_data)
        
        # Print to stdout for immediate visibility
        prefix = f"[{test_name}]" if test_name else ""
        print(f"{prefix}[{timestamp}] Console {msg.type.upper()}: {msg.text}")
    
    # Attach the handler
    page.on("console", log_console_message)
    
    # Also capture page errors
    def log_page_error(error):
        timestamp = time.strftime("%H:%M:%S")
        error_data = {
            'timestamp': timestamp,
            'type': 'error',
            'text': str(error),
            'location': None
        }
        console_messages.append(error_data)
        prefix = f"[{test_name}]" if test_name else ""
        print(f"{prefix}[{timestamp}] PAGE ERROR: {error}")
    
    page.on("pageerror", log_page_error)
    
    return console_messages


def save_console_log(console_messages, test_name):
    """
    Save console messages to a JSON file.
    
    Args:
        console_messages: List of console message dicts
        test_name: Name of the test
    """
    console_dir = Path("console_logs")
    console_dir.mkdir(exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{test_name}_{timestamp}.json"
    filepath = console_dir / filename
    
    with open(filepath, 'w') as f:
        json.dump(console_messages, f, indent=2)
    
    print(f"💾 Console log saved: {filepath}")
    print(f"   Total messages: {len(console_messages)}")
    
    # Also print summary
    message_types = {}
    for msg in console_messages:
        msg_type = msg.get('type', 'unknown')
        message_types[msg_type] = message_types.get(msg_type, 0) + 1
    
    if message_types:
        print("   Message types:")
        for msg_type, count in message_types.items():
            print(f"     - {msg_type}: {count}")
    
    return str(filepath)


def capture_test_artifacts(page, phase="test", metadata=None):
    """
    Capture both screenshot and current page state.
    
    Args:
        page: Playwright page object
        phase: Phase of the test
        metadata: Optional metadata dict
    """
    # Take screenshot
    screenshot_with_markdown(page, phase, metadata)
    
    # Capture current page state
    page_state = {
        "url": page.url,
        "title": page.title(),
        "viewport": page.viewport_size,
    }
    
    # Try to capture any visible error messages
    try:
        error_elements = page.locator(".error, .alert-danger, .message.system.error").all()
        if error_elements:
            page_state["errors"] = [elem.text_content() for elem in error_elements[:5]]
    except:
        pass
    
    return page_state


def setup_test_with_capture(page, test_name=None):
    """
    Set up a test with full console and screenshot capture.
    
    Args:
        page: Playwright page object
        test_name: Optional test name
        
    Returns:
        dict: Dictionary with console_messages list and helper functions
    """
    # Get test name if not provided
    if not test_name:
        import inspect
        frame = inspect.currentframe()
        while frame:
            func_name = frame.f_code.co_name
            if func_name.startswith("test_"):
                test_name = func_name
                break
            frame = frame.f_back
        if not test_name:
            test_name = "unknown_test"
    
    # Set up console capture
    console_messages = setup_console_capture(page, test_name)
    
    # Return helper object
    return {
        "console_messages": console_messages,
        "test_name": test_name,
        "screenshot": lambda phase, meta=None: screenshot_with_markdown(page, phase, meta),
        "capture": lambda phase="test", meta=None: capture_test_artifacts(page, phase, meta),
        "save_console": lambda: save_console_log(console_messages, test_name)
    }