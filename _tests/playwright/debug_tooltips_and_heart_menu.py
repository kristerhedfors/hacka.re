#!/usr/bin/env python3
"""
Debug script to test tooltips and heart menu functionality
"""

import sys
import os
import time
import json
from playwright.sync_api import sync_playwright

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def log_console_messages(page):
    """Setup console logging"""
    console_messages = []
    
    def handle_console(msg):
        timestamp = time.strftime("%H:%M:%S.%f")[:-3]
        console_messages.append({
            'timestamp': timestamp,
            'type': msg.type,
            'text': msg.text
        })
        print(f"[{timestamp}] Console {msg.type.upper()}: {msg.text}")
    
    page.on("console", handle_console)
    return console_messages

def test_tooltips_and_heart_menu():
    """Test tooltips and heart menu functionality"""
    
    with sync_playwright() as p:
        # Launch browser in headed mode for debugging
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()
        
        # Setup console logging
        console_messages = log_console_messages(page)
        
        print("\n=== Testing Tooltips and Heart Menu ===\n")
        
        # Navigate to the app
        page.goto("http://localhost:8000")
        page.wait_for_load_state("networkidle")
        
        # Dismiss welcome modal if present
        try:
            welcome_modal = page.locator("#welcome-modal")
            if welcome_modal.is_visible():
                close_btn = welcome_modal.locator(".close")
                if close_btn.is_visible():
                    close_btn.click()
                    print("✓ Welcome modal dismissed")
                    page.wait_for_timeout(500)
        except:
            pass
        
        print("\n--- Testing Mini-Tooltips ---")
        
        # Test tooltips on various buttons
        buttons_to_test = [
            ("settings-btn", "Settings"),
            ("share-btn", "Share"),
            ("prompts-btn", "System Prompts"),
            ("function-btn", "Function Calling"),
            ("mcp-servers-btn", "Model Context Protocol")
        ]
        
        for button_id, expected_text in buttons_to_test:
            button = page.locator(f"#{button_id}")
            
            if button.is_visible():
                # Hover over button
                button.hover()
                page.wait_for_timeout(200)  # Wait for tooltip animation
                
                # Check if tooltip is visible
                tooltip = button.locator(".mini-tooltip")
                if tooltip.count() > 0:
                    is_visible = tooltip.is_visible()
                    has_active = "active" in (tooltip.get_attribute("class") or "")
                    tooltip_text = tooltip.text_content()
                    
                    if is_visible or has_active:
                        print(f"✓ {button_id}: Tooltip visible - '{tooltip_text}'")
                    else:
                        print(f"✗ {button_id}: Tooltip not visible (exists but not active)")
                else:
                    print(f"✗ {button_id}: No tooltip element found")
                
                # Move away to hide tooltip
                page.mouse.move(0, 0)
                page.wait_for_timeout(100)
            else:
                print(f"⚠ {button_id}: Button not found")
        
        print("\n--- Testing Heart Menu (White Hat) ---")
        
        # Test heart button menu
        heart_btn = page.locator("#heart-btn")
        
        if heart_btn.is_visible():
            print("✓ Heart button found")
            
            # Click heart button to open menu
            heart_btn.click()
            page.wait_for_timeout(500)  # Wait for menu animation
            
            # Check if menu is visible
            heart_menu = page.locator(".heart-logo .tooltip.tree-menu")
            
            if heart_menu.count() > 0:
                is_visible = heart_menu.is_visible()
                has_active = "active" in (heart_menu.get_attribute("class") or "")
                
                if is_visible or has_active:
                    print("✓ Heart menu opened successfully")
                    
                    # Check menu content
                    menu_items = [
                        ".tree-toggle[data-target='documentation']",
                        ".feature-link[data-feature='mcp-servers']",
                        ".feature-link[data-feature='function-calling']",
                        ".feature-link[data-feature='system-prompts']"
                    ]
                    
                    for selector in menu_items:
                        item = heart_menu.locator(selector)
                        if item.count() > 0 and item.is_visible():
                            text = item.text_content()
                            print(f"  ✓ Menu item visible: {text}")
                    
                    # Test expand/collapse of documentation
                    doc_toggle = heart_menu.locator(".tree-toggle[data-target='documentation']")
                    if doc_toggle.is_visible():
                        doc_toggle.click()
                        page.wait_for_timeout(300)
                        
                        # Check if documentation items are visible
                        doc_items = heart_menu.locator(".documentation-item")
                        visible_count = 0
                        for i in range(doc_items.count()):
                            if doc_items.nth(i).is_visible():
                                visible_count += 1
                        
                        if visible_count > 0:
                            print(f"  ✓ Documentation expanded ({visible_count} items visible)")
                        else:
                            print("  ✗ Documentation items not visible after expand")
                    
                    # Close menu
                    page.keyboard.press("Escape")
                    page.wait_for_timeout(300)
                    
                    if not heart_menu.is_visible():
                        print("✓ Heart menu closed successfully")
                    else:
                        print("⚠ Heart menu still visible after ESC")
                else:
                    print("✗ Heart menu not visible (exists but not active)")
                    print(f"  Classes: {heart_menu.get_attribute('class')}")
            else:
                print("✗ Heart menu element not found")
        else:
            print("✗ Heart button not found")
        
        print("\n--- Console Messages Summary ---")
        relevant_messages = [m for m in console_messages if any(
            keyword in m['text'].lower() 
            for keyword in ['tooltip', 'heart', 'logo', 'button', 'animation']
        )]
        
        if relevant_messages:
            print(f"Found {len(relevant_messages)} relevant console messages:")
            for msg in relevant_messages[-10:]:  # Last 10 messages
                print(f"  [{msg['timestamp']}] {msg['type']}: {msg['text'][:100]}")
        else:
            print("No relevant console messages found")
        
        # Keep browser open for manual inspection
        print("\n=== Test Complete ===")
        print("Browser will stay open for 5 seconds for inspection...")
        page.wait_for_timeout(5000)
        
        browser.close()

if __name__ == "__main__":
    test_tooltips_and_heart_menu()