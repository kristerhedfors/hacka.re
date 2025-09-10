"""
Debug Shodan MCP Connection
Simple test to debug the MCP connection flow step by step
"""
import pytest
import time
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

SHODAN_API_KEY = "t2hW0hPlKpQY1KF0bn3kuhp3Mef7hptV"

def test_debug_shodan_mcp_connection(page: Page, serve_hacka_re):
    """Debug the Shodan MCP connection step by step"""
    
    # Navigate and setup
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    screenshot_with_markdown(page, "debug_01_initial", {
        "Step": "Initial page load",
        "Status": "After dismissing welcome modal"
    })
    
    # Open MCP servers modal
    print("Looking for MCP servers button...")
    mcp_btn = page.locator("#mcp-servers-btn")
    print(f"MCP button visible: {mcp_btn.is_visible()}")
    print(f"MCP button count: {mcp_btn.count()}")
    
    if mcp_btn.count() == 0:
        # Try the MCP icon in the top bar
        mcp_icon = page.locator("button:has-text('MCP')")
        if mcp_icon.count() > 0:
            print("Found MCP icon in top bar")
            mcp_icon.click()
        else:
            # Look for any MCP related button
            all_buttons = page.locator("button")
            button_texts = []
            for i in range(all_buttons.count()):
                text = all_buttons.nth(i).text_content()
                if text:
                    button_texts.append(text)
            print(f"All button texts: {button_texts}")
            
            # Try clicking on the MCP hat icon
            mcp_hat = page.locator("svg[class*='mcp']")
            if mcp_hat.count() > 0:
                print("Found MCP hat icon")
                mcp_hat.click()
            else:
                # Try finding any element with MCP in it
                mcp_elements = page.locator("*:has-text('MCP')")
                print(f"MCP elements found: {mcp_elements.count()}")
                if mcp_elements.count() > 0:
                    mcp_elements.first.click()
    else:
        expect(mcp_btn).to_be_visible()
        mcp_btn.click()
    
    # Wait a bit and check what happened
    time.sleep(2)
    
    screenshot_with_markdown(page, "debug_02_after_mcp_click", {
        "Step": "After clicking MCP button",
        "Modal Visible": str(page.locator("#mcp-servers-modal").is_visible()),
        "Modal Count": str(page.locator("#mcp-servers-modal").count())
    })
    
    # Check if modal is visible
    modal_visible = page.wait_for_selector("#mcp-servers-modal", state="visible", timeout=5000)
    if modal_visible:
        print("MCP modal is now visible")
        
        # Look for Shodan-related elements
        shodan_elements = page.locator("*:has-text('Shodan')")
        print(f"Shodan elements found: {shodan_elements.count()}")
        
        for i in range(shodan_elements.count()):
            element = shodan_elements.nth(i)
            text = element.text_content()
            tag = element.evaluate("el => el.tagName")
            print(f"Shodan element {i}: {tag} - '{text}'")
        
        screenshot_with_markdown(page, "debug_03_modal_content", {
            "Step": "MCP modal content",
            "Shodan Elements": str(shodan_elements.count()),
            "Modal Content": "Visible"
        })
        
        # Try to find and click Shodan connector
        shodan_connector = page.locator("button:has-text('Connect to Shodan')")
        if shodan_connector.count() > 0:
            print("Found 'Connect to Shodan' button")
            shodan_connector.click()
            
            time.sleep(2)
            
            screenshot_with_markdown(page, "debug_04_after_shodan_click", {
                "Step": "After clicking Connect to Shodan",
                "API Key Modal": str(page.locator("*:has-text('API Key')").count())
            })
            
            # Look for API key input
            api_key_inputs = [
                "#shodan-api-key",
                "#api-key-input", 
                "#mcp-api-key",
                "input[placeholder*='API']",
                "input[placeholder*='key']"
            ]
            
            api_key_input = None
            for selector in api_key_inputs:
                element = page.locator(selector)
                if element.count() > 0:
                    print(f"Found API key input: {selector}")
                    api_key_input = element
                    break
            
            if api_key_input:
                api_key_input.fill(SHODAN_API_KEY)
                
                # Look for connect button
                connect_btns = page.locator("button:has-text('Connect')")
                if connect_btns.count() > 0:
                    connect_btns.first.click()
                    print("Clicked Connect button")
                    
                    time.sleep(3)  # Wait for connection
                    
                    screenshot_with_markdown(page, "debug_05_after_connect", {
                        "Step": "After API key and connect",
                        "Status": "Connection attempt completed"
                    })
        else:
            # Look for other Shodan-related buttons or links
            shodan_btn = page.locator("*:has-text('Shodan')")
            if shodan_btn.count() > 0:
                print("Found generic Shodan element, clicking first one")
                shodan_btn.first.click()
                time.sleep(2)
    
    # Close any open modals
    close_btns = [
        "#close-mcp-servers-modal",
        "#close-modal",
        ".modal-close",
        "button:has-text('Close')"
    ]
    
    for selector in close_btns:
        element = page.locator(selector)
        if element.count() > 0 and element.is_visible():
            print(f"Closing modal with: {selector}")
            element.click()
            break
    
    time.sleep(1)
    
    # Now check if functions are available
    function_btn = page.locator("#function-btn")
    if function_btn.count() > 0:
        print("Opening function modal to check for Shodan functions")
        function_btn.click()
        
        time.sleep(2)
        
        # Check function list
        function_list = page.locator("#function-list")
        if function_list.count() > 0:
            list_content = function_list.text_content()
            print(f"Function list content: {list_content}")
        
        screenshot_with_markdown(page, "debug_06_function_list", {
            "Step": "Function list check",
            "Function Modal": str(page.locator("#function-modal").is_visible()),
            "Function List": str(function_list.count() if function_list else 0)
        })

if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s", "--timeout=300"])