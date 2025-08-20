#!/usr/bin/env python3

import subprocess
import time
import json
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

def test_shodan_connection_debug():
    """Test Shodan connection with debug output to identify where boolean conversion happens."""
    
    # Start HTTP server
    server_process = subprocess.Popen(
        ['python', '-m', 'http.server', '8000'],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd='/Users/user/dev/hacka.re'
    )
    time.sleep(2)
    
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=False)
            context = browser.new_context()
            page = context.new_page()
            
            # Capture console messages for debugging
            console_messages = []
            def log_console_message(msg):
                timestamp = time.strftime("%H:%M:%S.%f")[:-3] 
                console_messages.append({
                    'timestamp': timestamp,
                    'type': msg.type,
                    'text': msg.text
                })
                print(f"[{timestamp}] Console {msg.type.upper()}: {msg.text}")
                
            page.on("console", log_console_message)
            
            # Navigate to the app
            page.goto('http://localhost:8000')
            page.wait_for_load_state('networkidle')
            
            # Dismiss welcome modal if present
            try:
                welcome_modal = page.locator('.modal')
                if welcome_modal.is_visible():
                    dismiss_btn = page.locator('button:has-text("Dismiss")')
                    if dismiss_btn.is_visible():
                        dismiss_btn.click()
                        page.wait_for_selector('.modal', state='detached', timeout=2000)
            except:
                pass
                
            # Find and click Shodan connect button
            print("Looking for Shodan MCP connect button...")
            
            # Find and expand MCP section
            mcp_section = page.locator('text=Model Context Protocol (MCP)')
            if mcp_section.count() == 0:
                print("MCP section not found, checking for collapsed state...")
                # Look for collapsed section
                collapsed_section = page.locator('.collapsed-section:has-text("Model Context Protocol")')
                if collapsed_section.count() > 0:
                    print("Found collapsed MCP section, expanding...")
                    collapsed_section.click()
                    page.wait_for_timeout(1000)
            
            # Now wait for MCP section content
            page.wait_for_selector('.mcp-quick-connectors', timeout=5000)
            
            # Find Shodan connector
            shodan_connector = page.locator('.mcp-connector-card:has-text("Shodan")')
            shodan_connector.wait_for(timeout=5000)
            
            print("Found Shodan connector, clicking connect...")
            
            connect_btn = shodan_connector.locator('button:has-text("Connect")')
            connect_btn.click()
            
            # Wait for API key modal
            print("Waiting for API key input modal...")
            page.wait_for_selector('#service-apikey-input-modal', timeout=5000)
            
            # Enter API key
            api_key_input = page.locator('#apikey-input')
            test_api_key = "test_api_key_12345_debug"
            api_key_input.fill(test_api_key)
            
            print(f"Entered API key: {test_api_key}")
            
            # Click connect button in modal
            modal_connect_btn = page.locator('#apikey-connect-btn')
            modal_connect_btn.click()
            
            # Wait for response and capture any errors
            print("Waiting for connection attempt...")
            time.sleep(3)
            
            # Check final connection state
            print("\n=== Final State ===")
            print("Connection debug logs should show where the boolean conversion happens.")
            
            # Try to call a Shodan function to trigger the error
            try:
                print("Testing function call...")
                page.evaluate("""
                    if (window.shodan_host_info) {
                        window.shodan_host_info('8.8.8.8').then(result => {
                            console.log('Function result:', result);
                        }).catch(error => {
                            console.log('Function error:', error);
                        });
                    } else {
                        console.log('shodan_host_info not found');
                    }
                """)
                time.sleep(2)
            except Exception as e:
                print(f"Function test error: {e}")
            
            # Save console logs
            with open('/Users/user/dev/hacka.re/debug_console_logs.json', 'w') as f:
                json.dump(console_messages, f, indent=2)
            
            print(f"\nCaptured {len(console_messages)} console messages")
            print("Console logs saved to debug_console_logs.json")
            
            browser.close()
            
    finally:
        server_process.terminate()
        server_process.wait()

if __name__ == "__main__":
    test_shodan_connection_debug()