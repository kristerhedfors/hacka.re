#!/usr/bin/env python3
"""
Debug script to test MCP shared link functionality
Tests the specific shared link provided by user with password "asd"
"""
import pytest
import time
import json
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_mcp_shared_link_debug(page: Page, serve_hacka_re):
    """Test the specific MCP shared link provided by user"""
    
    # The shared link provided by user
    shared_link = "file:///Users/user/dev/hacka.re/index.html#gpt=GBNzGQkewPxDnPVOC5YM-gjmBt6Hd8kPkizRShaIC5nFIIu8BzTGJv6NrTrzelr73-hNSpUfUdDMOzsAtxNJu1iHCVimzHFxZ39DBSCvg4mtFBfWttEE25hxsOHHB7ubHgY9yFf1lw8mk4uUOQPq3NqC9yTUSob4tRDYI0s80NfbXRI55aqPiKXcZFOoS2mlom4rGzCT5mJBGcLv4k_r0Evm3sjTwNVNJ73zaah75NrcVuBZPvdWMGGoDnIo2cjDUW7b3ifV-q0RHam62nJq3hTPsKykwjph8jWJKdtbY2tR5F7n6JUHEFD0FTprwR_zEAK-mE2yp5K5qPwo3AuUDmT3f02Q3FsRCGuV96RHqto7kBAFVda2foYzZ5UK4MvU-RkgAyKelwxo8bmsCQebjnerMzu2L4FVCs85wv-VEz3k-2NlHws2kmFKYVYObeuv5XKIUL15pJTmOGeB8H09gsr4EWdd6h5qGv-rKpnKNfsWAHPZiTQlUspKynKN-hg3g3ZJNkzrpkccYoBW_y7ZzVk44l_HfGTQ5wOV_NweWQV8uDFy56FXz4CrR6-JyyYMO1s"
    password = "asd"
    
    # Setup console logging to capture MCP connection details
    console_messages = []
    def log_console_message(msg):
        console_messages.append({
            'type': msg.type,
            'text': msg.text,
            'timestamp': time.time()
        })
        print(f"Console {msg.type}: {msg.text}")
    page.on("console", log_console_message)
    
    # Navigate to shared link
    print(f"🔗 Navigating to shared link...")
    page.goto(shared_link)
    
    screenshot_with_markdown(page, "shared_link_loaded", {
        "Status": "Shared link loaded, password modal should appear",
        "Expected": "Password modal visible for MCP credentials"
    })
    
    # Wait for password modal and enter password - try multiple possible selectors
    password_modal = None
    password_input = None
    submit_button = None
    
    # Try different modal selectors that might be used
    possible_selectors = [
        "#password-modal",
        ".password-modal", 
        "[data-modal='password']",
        ".modal[style*='display: block']",
        ".modal:visible"
    ]
    
    for selector in possible_selectors:
        try:
            modal = page.locator(selector)
            modal.wait_for(state="visible", timeout=2000)
            password_modal = modal
            print(f"Found password modal with selector: {selector}")
            break
        except:
            continue
    
    if not password_modal:
        # Try to find any visible modal and check its content
        all_modals = page.locator(".modal, [class*='modal']").all()
        print(f"Found {len(all_modals)} potential modals")
        for i, modal in enumerate(all_modals):
            if modal.is_visible():
                text = modal.text_content()
                print(f"Modal {i} text: {text[:100]}...")
                if "password" in text.lower():
                    password_modal = modal
                    break
    
    if not password_modal:
        # Last resort - wait a bit more and take screenshot
        page.wait_for_timeout(2000)
        screenshot_with_markdown(page, "password_modal_not_found", {
            "Status": "Password modal not found",
            "Expected": "Modal should be visible",
            "Available Modals": str(len(page.locator(".modal").all()))
        })
        raise Exception("Password modal not found with any selector")
    
    # Look for password input within the modal
    password_input = password_modal.locator("input[type='password'], input[placeholder*='password'], #password-input, .password-input")
    if not password_input.count():
        password_input = password_modal.locator("input").first()
    
    password_input.fill(password)
    
    # Look for submit button within the modal  
    submit_button = password_modal.locator("button[type='submit'], .submit-btn, #password-submit, button:has-text('Submit'), button:has-text('OK')")
    if not submit_button.count():
        submit_button = password_modal.locator("button").first
        
    submit_button.click()
    
    # Wait for processing to complete
    page.wait_for_timeout(3000)
    
    screenshot_with_markdown(page, "password_submitted", {
        "Status": "Password submitted, processing shared data",
        "Expected": "Welcome message and MCP connections restored"
    })
    
    # Dismiss welcome modal if it appears
    dismiss_welcome_modal(page)
    
    # Wait longer for MCP connections and function registration (as user noted, takes several seconds)
    print("⏳ Waiting for MCP function registration to complete (takes several seconds)...")
    page.wait_for_timeout(10000)  # Wait 10 seconds for function registration
    
    screenshot_with_markdown(page, "mcp_connections_processed", {
        "Status": "MCP connections should be restored and functions registered",
        "Expected": "GitHub and Shodan services connected with functions available"
    })
    
    # Check console logs for MCP connection status
    mcp_logs = [msg for msg in console_messages if 'mcp' in msg['text'].lower() or 'github' in msg['text'].lower() or 'shodan' in msg['text'].lower()]
    
    print("\n=== MCP Connection Logs ===")
    for log in mcp_logs[-20:]:  # Show last 20 MCP-related logs
        print(f"[{log['type']}] {log['text']}")
    
    # Wait for chat interface to be fully ready
    print("\n🔧 Waiting for chat interface to be ready...")
    
    # Try multiple possible selectors for the send button
    send_button = None
    possible_send_selectors = [
        "#send-button",
        "#sendButton", 
        "button[id*='send']",
        "button:has-text('Send')",
        ".send-btn",
        "[data-action='send']"
    ]
    
    for selector in possible_send_selectors:
        try:
            btn = page.locator(selector)
            btn.wait_for(state="visible", timeout=2000)
            send_button = btn
            print(f"Found send button with selector: {selector}")
            break
        except:
            continue
    
    if not send_button:
        # Look for any button that might be the send button
        all_buttons = page.locator("button").all()
        print(f"Found {len(all_buttons)} buttons, looking for send button...")
        for i, btn in enumerate(all_buttons):
            if btn.is_visible():
                text = btn.inner_text().lower()
                if 'send' in text or '➤' in text or '▶' in text:
                    send_button = btn
                    print(f"Found send button by text: {text}")
                    break
    
    if not send_button:
        screenshot_with_markdown(page, "send_button_not_found", {
            "Status": "Send button not found",
            "Available buttons": str(len(page.locator("button").all()))
        })
        raise Exception("Send button not found")
    
    # Test GitHub function
    print("\n🔧 Testing GitHub function...")
    # Be specific to avoid conflict with function editor
    chat_input = page.locator("#message-input")  # Specific chat input selector
    
    # Wait for chat input to be ready
    chat_input.wait_for(state="visible", timeout=5000)
    chat_input.fill("search for rust repositories with nmap")
    
    send_button.click()
    
    # Wait for GitHub function to execute
    page.wait_for_timeout(8000)
    
    screenshot_with_markdown(page, "github_function_test", {
        "Status": "GitHub function call attempted",
        "Expected": "Function call should succeed with repository results",
        "Function": "github_search_repositories"
    })
    
    # Test Shodan function
    print("\n🔧 Testing Shodan function...")
    chat_input.fill("lookup 1.1.1.1 in shodan")
    send_button.click()
    
    # Wait for Shodan function to execute
    page.wait_for_timeout(8000)
    
    screenshot_with_markdown(page, "shodan_function_test", {
        "Status": "Shodan function call attempted", 
        "Expected": "Function call should succeed with host info",
        "Function": "shodan_host_info"
    })
    
    # Check function execution results in console
    function_logs = [msg for msg in console_messages if 'function' in msg['text'].lower() or 'tool' in msg['text'].lower()]
    
    print("\n=== Function Execution Logs ===")
    for log in function_logs[-15:]:  # Show last 15 function-related logs
        print(f"[{log['type']}] {log['text']}")
    
    # Check for specific connection status messages
    github_connected = any('github' in msg['text'].lower() and 'connected' in msg['text'].lower() for msg in console_messages)
    shodan_connected = any('shodan' in msg['text'].lower() and 'connected' in msg['text'].lower() for msg in console_messages)
    
    # Look for error messages
    github_errors = [msg for msg in console_messages if 'github' in msg['text'].lower() and ('error' in msg['text'].lower() or 'failed' in msg['text'].lower())]
    shodan_errors = [msg for msg in console_messages if 'shodan' in msg['text'].lower() and ('error' in msg['text'].lower() or 'failed' in msg['text'].lower())]
    
    screenshot_with_markdown(page, "final_test_results", {
        "Status": "Test completed",
        "GitHub Connected": str(github_connected),
        "Shodan Connected": str(shodan_connected), 
        "GitHub Errors": str(len(github_errors)),
        "Shodan Errors": str(len(shodan_errors)),
        "Total Console Messages": str(len(console_messages))
    })
    
    # Save detailed console logs to file for analysis
    with open('/Users/user/dev/hacka.re/_tests/playwright/mcp_debug_console.json', 'w') as f:
        json.dump(console_messages, f, indent=2)
    
    print(f"\n=== Test Summary ===")
    print(f"GitHub Connected: {github_connected}")
    print(f"Shodan Connected: {shodan_connected}")
    print(f"GitHub Errors: {len(github_errors)}")
    print(f"Shodan Errors: {len(shodan_errors)}")
    print(f"Console logs saved to: mcp_debug_console.json")
    
    if github_errors:
        print("\nGitHub Errors:")
        for error in github_errors:
            print(f"  - {error['text']}")
    
    if shodan_errors:
        print("\nShodan Errors:")
        for error in shodan_errors:
            print(f"  - {error['text']}")

if __name__ == "__main__":
    # Run this script directly for debugging
    import subprocess
    import sys
    
    # Run with pytest
    result = subprocess.run([
        sys.executable, "-m", "pytest", 
        __file__, 
        "-v", "-s", "--tb=short"
    ], cwd="/Users/user/dev/hacka.re/_tests/playwright")
    
    sys.exit(result.returncode)