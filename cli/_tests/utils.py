"""
Utilities for CLI testing.
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


def dismiss_welcome_modal(page):
    """
    Dismiss the welcome modal if present.
    
    Args:
        page: Playwright page object
    """
    try:
        # Check if welcome modal is visible
        welcome_modal = page.locator("#welcome-modal")
        if welcome_modal.is_visible(timeout=1000):
            # Look for close button
            close_button = page.locator("#close-welcome-modal")
            if close_button.is_visible():
                close_button.click()
                page.wait_for_selector("#welcome-modal", state="hidden", timeout=3000)
                print("Welcome modal dismissed")
    except Exception as e:
        # Modal not present or already dismissed
        pass