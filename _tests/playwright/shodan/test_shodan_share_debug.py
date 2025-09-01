"""
Debug Test for Shodan MCP Share Link Issues
==========================================
This test investigates why shared links don't properly restore Shodan MCP connections.
"""
import pytest
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, select_recommended_test_model


def test_shodan_share_link_debug_data_flow(page: Page, serve_hacka_re, shodan_api_key):
    """Debug the data flow for Shodan MCP sharing"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    # Add Shodan API key using CoreStorageService
    page.evaluate(f"""() => {{
        if (window.CoreStorageService) {{
            window.CoreStorageService.setValue('shodan_api_key', '{shodan_api_key}');
        }} else {{
            localStorage.setItem('shodan_api_key', '{shodan_api_key}');
        }}
    }}""")
    
    # Wait for system to initialize
    page.wait_for_timeout(3000)
    
    # Debug: Check if collectMcpConnectionsData is available and working
    collection_result = page.evaluate("""async () => {
        const result = {
            collectFunctionExists: !!window.collectMcpConnectionsData,
            shodanKeyInStorage: !!localStorage.getItem('shodan_api_key'),
            coreStorageServiceExists: !!window.CoreStorageService
        };
        
        // Also check via CoreStorageService
        if (window.CoreStorageService) {
            try {
                const shodanKey = await window.CoreStorageService.getValue('shodan_api_key');
                result.coreStorageHasShodan = !!shodanKey;
                result.shodanKeyType = typeof shodanKey;
            } catch (e) {
                result.coreStorageError = e.message;
            }
        }
        
        if (window.collectMcpConnectionsData) {
            try {
                const collected = await window.collectMcpConnectionsData();
                result.collectedData = collected;
                result.collectedKeys = Object.keys(collected || {});
                result.hasShodan = !!(collected && collected.shodan);
            } catch (e) {
                result.collectionError = e.message;
            }
        }
        
        return result;
    }""")
    
    print(f"DEBUG Collection Result: {collection_result}")
    
    # Test share link generation with MCP checkbox checked
    share_button = page.locator("#share-btn")
    share_button.click()
    
    # Wait for share modal
    page.wait_for_selector("#share-modal", state="visible", timeout=5000)
    
    # Check MCP checkbox
    mcp_checkbox = page.locator("#share-mcp-connections")
    expect(mcp_checkbox).to_be_visible()
    mcp_checkbox.check()
    
    # Wait for checkbox to be processed
    page.wait_for_timeout(1000)
    
    # Generate a share link
    password_input = page.locator("#share-password")
    password_input.fill("test123")
    
    # Check what buttons are available in the share modal
    available_buttons = page.evaluate("""() => {
        const modal = document.getElementById('share-modal');
        if (!modal) return 'No share modal found';
        
        const buttons = modal.querySelectorAll('button');
        return Array.from(buttons).map(btn => ({
            id: btn.id,
            text: btn.textContent.trim(),
            classes: btn.className
        }));
    }""")
    print(f"Available buttons in share modal: {available_buttons}")
    
    # Use the correct generate button ID
    generate_button = page.locator("#generate-share-link-btn")
    generate_button.click()
    
    # Wait for link generation
    page.wait_for_timeout(3000)
    
    # Get the generated link
    generated_link = page.locator("#generated-link").input_value()
    
    print(f"Generated link: {generated_link}")
    
    # Extract the encrypted data from the link
    if "#gpt=" in generated_link:
        encrypted_data = generated_link.split("#gpt=")[1]
        
        # Try to decrypt it to see what's inside
        decryption_result = page.evaluate(f"""() => {{
            try {{
                const decrypted = window.CryptoUtils.decryptData('{encrypted_data}', 'test123');
                return {{
                    success: true,
                    data: decrypted,
                    hasMcpConnections: !!(decrypted && decrypted.mcpConnections),
                    mcpKeys: decrypted && decrypted.mcpConnections ? Object.keys(decrypted.mcpConnections) : []
                }};
            }} catch (e) {{
                return {{
                    success: false,
                    error: e.message
                }};
            }}
        }}""")
        
        print(f"Decryption result: {decryption_result}")
        
        # Now test the shared link restoration
        # First clear any existing session storage to simulate fresh tab
        page.evaluate("() => sessionStorage.clear()")
        page.goto(generated_link)
        
        # Handle password prompt
        page.wait_for_selector("#early-password-input", state="visible", timeout=10000)
        password_input_early = page.locator("#early-password-input")
        password_input_early.fill("test123")
        
        submit_button = page.locator("#early-password-submit")
        submit_button.click()
        
        # Wait for link processing
        page.wait_for_timeout(5000)
        
        # Check what happened during link processing
        processing_result = page.evaluate("""() => {
            return {
                sharedLinkProcessed: !!window._sharedLinkProcessed,
                shodanKeyInStorage: !!localStorage.getItem('shodan_api_key'),
                coreStorageHasShodan: false
            };
        }""")
        
        # Check CoreStorageService
        if page.evaluate("() => !!window.CoreStorageService"):
            shodan_check = page.evaluate("""async () => {
                try {
                    const shodanKey = await window.CoreStorageService.getValue('shodan_api_key');
                    return {
                        found: !!shodanKey,
                        type: typeof shodanKey,
                        value: shodanKey ? String(shodanKey).substring(0, 10) + '...' : null
                    };
                } catch (e) {
                    return {
                        error: e.message
                    };
                }
            }""")
            processing_result['coreStorageCheck'] = shodan_check
        
        print(f"Processing result: {processing_result}")
        
        # Check if MCP connections were properly applied
        if page.evaluate("() => !!window.MCPServiceConnectors"):
            mcp_status = page.evaluate("""() => {
                try {
                    const services = window.MCPServiceConnectors.getConnectedServices();
                    return {
                        connectedServices: services.map(s => s.key),
                        serviceCount: services.length
                    };
                } catch (e) {
                    return {
                        error: e.message
                    };
                }
            }""")
            processing_result['mcpStatus'] = mcp_status
            print(f"MCP Status: {mcp_status}")
    
    # Final assertion - this test is for debugging, so we mainly print info
    assert collection_result['collectFunctionExists'], "collectMcpConnectionsData should exist"