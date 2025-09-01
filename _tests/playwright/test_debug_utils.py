"""
Enhanced Test Debugging Utilities
==================================
This module provides comprehensive debugging capabilities for Playwright tests.
All artifacts are stored in clearly defined locations and reported to stdout.
"""

import os
import json
import time
from datetime import datetime
from typing import Dict, List, Any, Optional
from playwright.sync_api import Page

# Define artifact directories
TEST_DIR = os.path.dirname(__file__)
SCREENSHOT_DIR = os.path.join(TEST_DIR, "screenshots")
METADATA_DIR = os.path.join(TEST_DIR, "screenshots_data")
CONSOLE_LOG_DIR = os.path.join(TEST_DIR, "console_logs")

# Ensure directories exist
for dir_path in [SCREENSHOT_DIR, METADATA_DIR, CONSOLE_LOG_DIR]:
    os.makedirs(dir_path, exist_ok=True)

class TestDebugger:
    """Enhanced test debugger with comprehensive artifact capture."""
    
    def __init__(self, test_name: str):
        """Initialize debugger for a specific test."""
        self.test_name = test_name
        self.console_messages: List[Dict] = []
        self.start_time = time.time()
        self.page: Optional[Page] = None
        
        # Print artifact locations at test start
        self._print_artifact_info()
    
    def _print_artifact_info(self):
        """Print where all artifacts will be stored."""
        print("\n" + "="*60)
        print(f"🧪 TEST DEBUGGING INITIALIZED: {self.test_name}")
        print("="*60)
        print(f"📸 Screenshots will be saved to:")
        print(f"   {SCREENSHOT_DIR}")
        print(f"📝 Metadata will be saved to:")
        print(f"   {METADATA_DIR}")
        print(f"🖥️ Console logs will be saved to:")
        print(f"   {CONSOLE_LOG_DIR}")
        print("="*60 + "\n")
    
    def setup_console_capture(self, page: Page):
        """Set up comprehensive console message capture."""
        self.page = page
        
        def capture_console(msg):
            """Capture console message with all details."""
            timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
            message_data = {
                'timestamp': timestamp,
                'type': msg.type,
                'text': msg.text,
                'location': str(msg.location) if msg.location else None,
                'args': []
            }
            
            # Try to get argument values
            try:
                for arg in msg.args:
                    message_data['args'].append(arg.json_value())
            except:
                pass
            
            self.console_messages.append(message_data)
            
            # Print to stdout for immediate visibility
            prefix = {
                'error': '❌',
                'warning': '⚠️',
                'info': 'ℹ️',
                'log': '📝',
                'debug': '🔍'
            }.get(msg.type, '📌')
            
            print(f"[{timestamp}] {prefix} Console {msg.type.upper()}: {msg.text}")
            
            # If it's an error, print location
            if msg.type == 'error' and message_data['location']:
                print(f"           Location: {message_data['location']}")
        
        page.on("console", capture_console)
        
        # Also capture page errors
        def capture_error(error):
            timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
            print(f"[{timestamp}] 🚨 PAGE ERROR: {error}")
            self.console_messages.append({
                'timestamp': timestamp,
                'type': 'page_error',
                'text': str(error),
                'location': None,
                'args': []
            })
        
        page.on("pageerror", capture_error)
        
        print(f"✅ Console capture enabled for: {self.test_name}")
    
    def capture_state(self, name: str, debug_info: Optional[Dict] = None):
        """Capture complete state including screenshot, console, and metadata."""
        if not self.page:
            print("⚠️ No page configured for state capture")
            return None, None, None
        
        # Generate unique name with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_name = f"{self.test_name}_{name}_{timestamp}"
        
        # Capture screenshot
        screenshot_path = os.path.join(SCREENSHOT_DIR, f"{unique_name}.png")
        self.page.screenshot(path=screenshot_path)
        print(f"📸 Screenshot saved: {screenshot_path}")
        
        # Save console log
        console_log_path = os.path.join(CONSOLE_LOG_DIR, f"{unique_name}.json")
        with open(console_log_path, 'w') as f:
            json.dump({
                'test_name': self.test_name,
                'capture_point': name,
                'timestamp': timestamp,
                'messages': self.console_messages,
                'message_count': len(self.console_messages),
                'error_count': sum(1 for m in self.console_messages if m['type'] == 'error'),
                'warning_count': sum(1 for m in self.console_messages if m['type'] == 'warning')
            }, f, indent=2)
        print(f"🖥️ Console log saved: {console_log_path}")
        
        # Save metadata
        metadata_path = os.path.join(METADATA_DIR, f"{unique_name}.md")
        self._save_metadata(metadata_path, name, debug_info, screenshot_path, console_log_path)
        print(f"📝 Metadata saved: {metadata_path}")
        
        # Print summary
        error_count = sum(1 for m in self.console_messages if m['type'] == 'error')
        warning_count = sum(1 for m in self.console_messages if m['type'] == 'warning')
        if error_count > 0:
            print(f"   ❌ {error_count} console errors detected!")
        if warning_count > 0:
            print(f"   ⚠️ {warning_count} console warnings detected!")
        
        return screenshot_path, console_log_path, metadata_path
    
    def _save_metadata(self, path: str, name: str, debug_info: Optional[Dict], 
                       screenshot_path: str, console_log_path: str):
        """Save comprehensive metadata in markdown format."""
        with open(path, 'w') as f:
            f.write(f"# Test Debug Information\n\n")
            f.write(f"**Test**: {self.test_name}\n")
            f.write(f"**Capture Point**: {name}\n")
            f.write(f"**Timestamp**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"**Duration**: {time.time() - self.start_time:.2f}s\n\n")
            
            # Console summary
            f.write("## Console Summary\n\n")
            error_count = sum(1 for m in self.console_messages if m['type'] == 'error')
            warning_count = sum(1 for m in self.console_messages if m['type'] == 'warning')
            f.write(f"- Total messages: {len(self.console_messages)}\n")
            f.write(f"- Errors: {error_count}\n")
            f.write(f"- Warnings: {warning_count}\n\n")
            
            # Recent console messages
            if self.console_messages:
                f.write("### Recent Messages (last 10)\n\n")
                f.write("```\n")
                for msg in self.console_messages[-10:]:
                    f.write(f"[{msg['timestamp']}] {msg['type'].upper()}: {msg['text']}\n")
                f.write("```\n\n")
            
            # Debug info
            if debug_info:
                f.write("## Debug Context\n\n")
                for key, value in debug_info.items():
                    f.write(f"- **{key}**: {value}\n")
                f.write("\n")
            
            # Page state
            if self.page:
                try:
                    f.write("## Page State\n\n")
                    f.write(f"- **URL**: {self.page.url}\n")
                    f.write(f"- **Title**: {self.page.title()}\n")
                    
                    # Check for modals
                    modals = self.page.evaluate("""() => {
                        const modals = document.querySelectorAll('.modal.active');
                        return Array.from(modals).map(m => m.id || 'unnamed');
                    }""")
                    if modals:
                        f.write(f"- **Active Modals**: {', '.join(modals)}\n")
                    
                    # Check localStorage keys
                    storage_keys = self.page.evaluate("() => Object.keys(localStorage)")
                    f.write(f"- **LocalStorage Keys**: {len(storage_keys)}\n")
                    f.write("\n")
                except:
                    pass
            
            # File references
            f.write("## Artifacts\n\n")
            f.write(f"- [Screenshot]({screenshot_path})\n")
            f.write(f"- [Console Log]({console_log_path})\n")
    
    def print_summary(self):
        """Print test execution summary."""
        duration = time.time() - self.start_time
        error_count = sum(1 for m in self.console_messages if m['type'] == 'error')
        warning_count = sum(1 for m in self.console_messages if m['type'] == 'warning')
        
        print("\n" + "="*60)
        print(f"📊 TEST SUMMARY: {self.test_name}")
        print("="*60)
        print(f"Duration: {duration:.2f}s")
        print(f"Console messages: {len(self.console_messages)}")
        print(f"Errors: {error_count}")
        print(f"Warnings: {warning_count}")
        
        if error_count > 0:
            print("\n❌ Console Errors:")
            for msg in self.console_messages:
                if msg['type'] == 'error':
                    print(f"  [{msg['timestamp']}] {msg['text']}")
        
        print("="*60 + "\n")


def enhanced_screenshot(page: Page, name: str, debug_info: Optional[Dict] = None):
    """
    Standalone function for quick screenshot with metadata.
    Always prints location information.
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_name = f"{name}_{timestamp}"
    
    # Save screenshot
    screenshot_path = os.path.join(SCREENSHOT_DIR, f"{unique_name}.png")
    page.screenshot(path=screenshot_path)
    
    # Save metadata
    metadata_path = os.path.join(METADATA_DIR, f"{unique_name}.md")
    with open(metadata_path, 'w') as f:
        f.write(f"# Screenshot: {name}\n\n")
        f.write(f"**Timestamp**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"**URL**: {page.url}\n\n")
        
        if debug_info:
            f.write("## Debug Info\n\n")
            for key, value in debug_info.items():
                f.write(f"- **{key}**: {value}\n")
    
    print(f"\n📸 Screenshot captured: {name}")
    print(f"   File: {screenshot_path}")
    print(f"   Metadata: {metadata_path}")
    
    return screenshot_path, metadata_path