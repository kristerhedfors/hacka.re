#!/usr/bin/env python3
"""
Enhanced test runner with comprehensive error tracking including:
- Console log capture
- Screenshots on failure
- Detailed error context
- JSON output for analysis
"""

import os
import sys
import json
import time
import subprocess
from datetime import datetime
from pathlib import Path

# Ensure we use the correct Python
VENV_PYTHON = "/Users/user/dev/hacka.re/_venv/bin/python"

def setup_console_logging_code():
    """JavaScript code to inject into test for console logging"""
    return """
# Setup enhanced console logging
console_messages = []
def setup_console_logging(page):
    def log_console_message(msg):
        timestamp = time.strftime("%H:%M:%S.%f")[:-3]
        message = {
            'timestamp': timestamp,
            'type': msg.type,
            'text': msg.text,
            'location': str(msg.location) if msg.location else None
        }
        console_messages.append(message)
        print(f"[CONSOLE {timestamp}] {msg.type.upper()}: {msg.text}")
        if msg.location:
            print(f"  Location: {msg.location}")
    page.on("console", log_console_message)
    page.on("pageerror", lambda err: print(f"[PAGE ERROR] {err}"))
    return console_messages

# Call this after page.goto()
console_messages = setup_console_logging(page)
"""

def create_enhanced_test_wrapper(test_file, test_name=None):
    """Create a wrapper test file with enhanced error tracking"""
    
    wrapper_file = f"/tmp/enhanced_{Path(test_file).stem}.py"
    
    with open(wrapper_file, 'w') as f:
        f.write(f"""
import sys
import os
import json
import time
import traceback
from pathlib import Path

# Add test directory to path
sys.path.insert(0, '/Users/user/dev/hacka.re/_tests/playwright')

# Import the original test
from {Path(test_file).stem} import *
from test_utils import screenshot_with_markdown
import pytest
from playwright.sync_api import Page

# Enhanced test wrapper
def enhanced_test_wrapper(original_test):
    def wrapper(page: Page, *args, **kwargs):
        console_messages = []
        error_info = {{}}
        
        try:
            # Setup console logging
            def log_console_message(msg):
                timestamp = time.strftime("%H:%M:%S.%f")[:-3]
                message = {{
                    'timestamp': timestamp,
                    'type': msg.type,
                    'text': msg.text,
                    'location': str(msg.location) if msg.location else None
                }}
                console_messages.append(message)
                print(f"[CONSOLE {{timestamp}}] {{msg.type.upper()}}: {{msg.text}}")
            
            page.on("console", log_console_message)
            page.on("pageerror", lambda err: print(f"[PAGE ERROR] {{err}}"))
            
            # Run the original test
            result = original_test(page, *args, **kwargs)
            
            # Take success screenshot
            screenshot_with_markdown(page, f"{{original_test.__name__}}_success", {{
                "Status": "Test Passed",
                "Console Messages": len(console_messages),
                "Test": original_test.__name__
            }})
            
            return result
            
        except Exception as e:
            # Capture error details
            error_info = {{
                'error_type': type(e).__name__,
                'error_message': str(e),
                'traceback': traceback.format_exc(),
                'console_messages': console_messages,
                'page_url': page.url,
                'page_title': page.title(),
                'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
            }}
            
            # Take failure screenshot with detailed context
            try:
                screenshot_with_markdown(page, f"{{original_test.__name__}}_failure", {{
                    "Status": "Test Failed",
                    "Error Type": error_info['error_type'],
                    "Error Message": error_info['error_message'][:200],
                    "Console Messages": len(console_messages),
                    "Page URL": page.url,
                    "Test": original_test.__name__
                }})
            except:
                print("Failed to take screenshot")
            
            # Save error details to JSON
            error_file = f"/tmp/{{original_test.__name__}}_error.json"
            with open(error_file, 'w') as f:
                json.dump(error_info, f, indent=2)
            print(f"\\n[ERROR DETAILS SAVED TO: {{error_file}}]")
            
            # Print console messages for debugging
            if console_messages:
                print("\\n[CONSOLE LOG HISTORY]:")
                for msg in console_messages[-20:]:  # Last 20 messages
                    print(f"  {{msg['timestamp']}} {{msg['type']}}: {{msg['text'][:100]}}")
            
            raise
    
    return wrapper

# Wrap all test functions
for name in dir():
    if name.startswith('test_'):
        original = globals()[name]
        if callable(original):
            globals()[name] = enhanced_test_wrapper(original)
""")
    
    return wrapper_file

def run_single_test_with_tracking(test_file, test_name=None):
    """Run a single test with comprehensive error tracking"""
    
    print(f"\n{'='*60}")
    print(f"RUNNING TEST WITH ENHANCED TRACKING")
    print(f"Test file: {test_file}")
    if test_name:
        print(f"Test name: {test_name}")
    print(f"{'='*60}\n")
    
    # Create output directory for this test run
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_dir = Path(f"/tmp/test_results_{timestamp}")
    output_dir.mkdir(exist_ok=True)
    
    # Build pytest command
    cmd = [
        VENV_PYTHON, "-m", "pytest",
        test_file,
        "-v", "-s",
        "--tb=short",
        "--capture=no"
    ]
    
    if test_name:
        cmd.append(f"::{test_name}")
    
    # Run the test
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        cwd="/Users/user/dev/hacka.re/_tests/playwright"
    )
    
    # Save all output
    output_file = output_dir / "test_output.txt"
    with open(output_file, 'w') as f:
        f.write("STDOUT:\n")
        f.write(result.stdout)
        f.write("\n\nSTDERR:\n")
        f.write(result.stderr)
    
    # Parse for error files
    error_files = []
    for line in result.stdout.split('\n'):
        if "ERROR DETAILS SAVED TO:" in line:
            error_file = line.split("ERROR DETAILS SAVED TO:")[1].strip().rstrip(']')
            if os.path.exists(error_file):
                error_files.append(error_file)
    
    # Create summary
    summary = {
        'test_file': test_file,
        'test_name': test_name,
        'exit_code': result.returncode,
        'success': result.returncode == 0,
        'timestamp': timestamp,
        'output_dir': str(output_dir),
        'error_files': error_files
    }
    
    summary_file = output_dir / "summary.json"
    with open(summary_file, 'w') as f:
        json.dump(summary, f, indent=2)
    
    print(f"\n{'='*60}")
    print(f"TEST EXECUTION COMPLETE")
    print(f"Success: {summary['success']}")
    print(f"Output saved to: {output_dir}")
    if error_files:
        print(f"Error details in: {', '.join(error_files)}")
    print(f"{'='*60}\n")
    
    return summary

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python enhanced_test_runner.py <test_file> [test_name]")
        sys.exit(1)
    
    test_file = sys.argv[1]
    test_name = sys.argv[2] if len(sys.argv) > 2 else None
    
    # Make sure test file exists
    test_path = Path("/Users/user/dev/hacka.re/_tests/playwright") / test_file
    if not test_path.exists():
        print(f"Error: Test file {test_path} does not exist")
        sys.exit(1)
    
    # Run the test with tracking
    result = run_single_test_with_tracking(str(test_path), test_name)
    
    # Exit with test result code
    sys.exit(0 if result['success'] else 1)