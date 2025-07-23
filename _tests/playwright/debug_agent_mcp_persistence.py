"""
Debug Agent MCP Persistence - Comprehensive Investigation

This script uses Playwright to debug the agent configuration persistence issue,
specifically focusing on GitHub MCP connections and functions restoration.
"""

import pytest
import json
import time
from playwright.sync_api import Page
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown


def debug_agent_mcp_persistence(page: Page, serve_hacka_re, api_key):
    """
    Debug the complete agent persistence flow with detailed console logging
    """
    
    # Set up comprehensive console monitoring
    console_messages = []
    js_errors = []
    
    def handle_console(msg):
        timestamp = time.strftime("%H:%M:%S.%f")[:-3]
        message_data = {
            'timestamp': timestamp,
            'type': msg.type,
            'text': msg.text,
            'location': msg.location if hasattr(msg, 'location') else None
        }
        console_messages.append(message_data)
        
        # Track JS errors separately
        if msg.type == 'error':
            js_errors.append(message_data)
            
        print(f"[{timestamp}] Console {msg.type.upper()}: {msg.text}")
    
    page.on("console", handle_console)
    
    # Navigate to the app
    print("=== STARTING DEBUG SESSION ===")
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # === PHASE 1: INVESTIGATE CURRENT STATE ===
    print("\n=== PHASE 1: INVESTIGATING CURRENT STATE ===")
    
    # Check what services are available
    available_services = page.evaluate("""
        () => {
            const services = {};
            if (typeof window.AgentService !== 'undefined') services.AgentService = true;
            if (typeof window.ConfigurationService !== 'undefined') services.ConfigurationService = true;
            if (typeof window.MCPService !== 'undefined') services.MCPService = true;
            if (typeof window.StorageService !== 'undefined') services.StorageService = true;
            if (typeof window.FunctionToolsService !== 'undefined') services.FunctionToolsService = true;
            return services;
        }
    """)
    
    print(f"Available services: {json.dumps(available_services, indent=2)}")
    
    # Check current storage state
    storage_state = page.evaluate("""
        () => {
            const localStorage_keys = Object.keys(localStorage);
            const sessionStorage_keys = Object.keys(sessionStorage);
            return {
                localStorage_keys: localStorage_keys,
                sessionStorage_keys: sessionStorage_keys,
                localStorage_count: localStorage_keys.length,
                sessionStorage_count: sessionStorage_keys.length
            };
        }
    """)
    
    print(f"Storage state: {json.dumps(storage_state, indent=2)}")
    
    screenshot_with_markdown(page, "debug_initial_state", {
        "Phase": "Initial state investigation",
        "Available Services": str(len(available_services)),
        "LocalStorage Keys": storage_state['localStorage_count'],
        "SessionStorage Keys": storage_state['sessionStorage_count']
    })
    
    # === PHASE 2: SET UP AGENT A WITH GITHUB MCP ===
    print("\n=== PHASE 2: SETTING UP AGENT A WITH GITHUB MCP ===")
    
    # First, let's see what MCP connections exist
    mcp_btn = page.locator('#mcp-servers-btn')
    mcp_btn.click()
    page.wait_for_timeout(1000)
    
    # Check initial MCP state
    initial_mcp_state = page.evaluate("""
        () => {
            // Try to get MCP service state
            let mcpState = {};
            try {
                if (window.MCPService) {
                    mcpState.serviceAvailable = true;
                    // Try to get current connections
                    if (window.MCPService.getConnections) {
                        mcpState.connections = window.MCPService.getConnections();
                    }
                    if (window.MCPService.getToolRegistry) {
                        mcpState.tools = window.MCPService.getToolRegistry();
                    }
                }
            } catch (e) {
                mcpState.error = e.message;
            }
            return mcpState;
        }
    """)
    
    print(f"Initial MCP state: {json.dumps(initial_mcp_state, indent=2)}")
    
    # Look for GitHub connector
    github_connector = page.locator('.quick-connector-card[data-service="github"]')
    if github_connector.count() > 0:
        print("✅ GitHub connector found")
        
        # Check its current state
        github_status = github_connector.locator('.status, .connection-status')
        if github_status.count() > 0:
            status_text = github_status.text_content()
            print(f"GitHub connector status: {status_text}")
        
        # Try to configure GitHub MCP - use the correct PAT flow
        connect_btn = github_connector.locator('button:has-text("Connect")')
        if connect_btn.count() > 0:
            print("Clicking GitHub Connect button...")
            connect_btn.click()
            page.wait_for_timeout(2000)
            
            # Check what modals appeared
            modals = page.locator('.modal:visible, .modal.active')
            print(f"Visible modals after connect click: {modals.count()}")
            
            for i in range(modals.count()):
                modal = modals.nth(i)
                modal_text = modal.text_content()[:200] + "..." if len(modal.text_content()) > 200 else modal.text_content()
                print(f"Modal {i+1}: {modal_text}")
            
            # First check for GitHub PAT modal (using correct modal ID)
            pat_modal = page.locator('#service-pat-modal')
            if pat_modal.count() > 0 and pat_modal.is_visible():
                print("✅ GitHub PAT modal appeared (#service-pat-modal)")
                
                # Look for the GitHub PAT input field - search for various possible selectors
                possible_pat_selectors = [
                    '#github-pat-input',
                    '#service-pat-input', 
                    '#pat-input',
                    'input[type="password"]',
                    '.service-pat-modal input[type="password"]',
                    '#service-pat-modal input[type="password"]'
                ]
                
                pat_input = None
                for selector in possible_pat_selectors:
                    potential_input = page.locator(selector)
                    if potential_input.count() > 0:
                        pat_input = potential_input
                        print(f"✅ Found PAT input using selector: {selector}")
                        break
                
                if pat_input:
                    test_token = 'ghp_1234567890abcdefghijklmnopqrstuvwxyz1234'
                    print(f"NOTE: Using test token format. For real testing, you'll need a real GitHub token.")
                    print(f"Test token: {test_token}")
                    
                    pat_input.fill(test_token)
                    
                    # Verify token was actually entered
                    entered_value = pat_input.input_value()
                    print(f"✅ Token entered in PAT input field: {entered_value[:10]}...{entered_value[-4:] if len(entered_value) > 10 else entered_value}")
                    
                    # Wait a moment for any validation
                    page.wait_for_timeout(500)
                    
                    # Look for connect button - try various selectors
                    possible_connect_selectors = [
                        '#github-pat-connect',
                        '#service-pat-connect',
                        '#service-pat-modal button:has-text("Connect")',
                        '.service-pat-modal button:has-text("Connect")',
                        'button:has-text("Connect")',
                        'button:has-text("Save")',
                        'button[type="submit"]'
                    ]
                    
                    connect_btn = None
                    for selector in possible_connect_selectors:
                        potential_btn = page.locator(selector)
                        if potential_btn.count() > 0 and potential_btn.is_visible():
                            connect_btn = potential_btn
                            print(f"✅ Found connect button using selector: {selector}")
                            break
                    
                    if connect_btn:
                        print("Clicking PAT connect button...")
                        connect_btn.click()
                        page.wait_for_timeout(3000)  # Wait longer for connection
                        print("✅ PAT connection initiated")
                    else:
                        print("❌ No PAT connect button found")
                        # List all buttons in the modal for debugging
                        all_buttons = page.locator('#service-pat-modal button')
                        print(f"All buttons in PAT modal: {all_buttons.count()}")
                        for i in range(all_buttons.count()):
                            btn_text = all_buttons.nth(i).text_content()
                            print(f"  Button {i+1}: '{btn_text}'")
                else:
                    print("❌ No PAT input field found")
                    # List all input fields in the modal for debugging
                    all_inputs = page.locator('#service-pat-modal input')
                    print(f"All inputs in PAT modal: {all_inputs.count()}")
                    for i in range(all_inputs.count()):
                        input_type = all_inputs.nth(i).get_attribute('type') or 'text'
                        input_id = all_inputs.nth(i).get_attribute('id') or 'no-id'
                        print(f"  Input {i+1}: type='{input_type}', id='{input_id}'")
            
            # Check for OAuth setup modal (secondary flow)
            elif page.locator('#quick-connector-setup-modal').count() > 0 and page.locator('#quick-connector-setup-modal').is_visible():
                print("✅ OAuth setup modal appeared")
                
                # Fill in client ID for OAuth flow
                client_id_input = page.locator('#quick-setup-client-id')
                if client_id_input.count() > 0:
                    test_client_id = 'test_debug_client_id_12345'
                    client_id_input.fill(test_client_id)
                    print(f"Filled client ID: {test_client_id}")
                    
                    # Save & Connect
                    save_connect_btn = page.locator('button:has-text("Save & Connect")')
                    if save_connect_btn.count() > 0:
                        save_connect_btn.click()
                        page.wait_for_timeout(3000)
                        print("Clicked Save & Connect")
                        
                        # After OAuth setup, look for manual token entry fallback
                        try:
                            page.wait_for_selector('#manual-access-token', state='visible', timeout=10000)
                            print("✅ Manual token entry appeared")
                            
                            # Enter token in OAuth manual entry field
                            manual_token_input = page.locator('#manual-access-token')
                            if manual_token_input.count() > 0:
                                test_token = 'ghp_1234567890abcdefghijklmnopqrstuvwxyz1234'
                                print(f"Test token: {test_token}")
                                
                                manual_token_input.fill(test_token)
                                
                                # Verify token was entered
                                entered_oauth_value = manual_token_input.input_value()
                                print(f"✅ Token entered in manual OAuth field: {entered_oauth_value[:10]}...{entered_oauth_value[-4:] if len(entered_oauth_value) > 10 else entered_oauth_value}")
                                
                                # Save the token
                                save_token_btn = page.locator('button:has-text("Save Token")')
                                if save_token_btn.count() > 0:
                                    print("Found Save Token button, clicking...")
                                    save_token_btn.click()
                                    page.wait_for_timeout(3000) # Wait longer for save
                                    print("✅ OAuth token saved")
                                else:
                                    print("❌ Save Token button not found")
                                
                        except Exception as e:
                            print(f"Manual token entry not available in OAuth flow: {e}")
            
            else:
                print("❌ No expected GitHub setup modal found")
                
                # List all visible modal IDs for debugging
                all_modals = page.locator('.modal')
                print(f"All modals found: {all_modals.count()}")
                for i in range(all_modals.count()):
                    modal_id = all_modals.nth(i).get_attribute('id') or 'no-id'
                    is_visible = all_modals.nth(i).is_visible()
                    print(f"  Modal {i+1}: {modal_id} (visible: {is_visible})")
    else:
        print("❌ GitHub connector not found")
        
        # List available connectors
        connectors = page.locator('.quick-connector-card')
        print(f"Available connectors: {connectors.count()}")
        for i in range(connectors.count()):
            connector = connectors.nth(i)
            service_name = connector.get_attribute('data-service') or 'unknown'
            print(f"  - {service_name}")
    
    # Close any open modals - use JavaScript to force close
    try:
        print("Attempting to close all modals...")
        
        # Force close PAT modal using JavaScript
        pat_modal_closed = page.evaluate("""
            () => {
                const patModal = document.getElementById('service-pat-modal');
                if (patModal) {
                    patModal.remove();
                    return true;
                }
                return false;
            }
        """)
        if pat_modal_closed:
            print("✅ PAT modal forcibly closed via JavaScript")
        
        # Force close MCP modal using JavaScript
        mcp_modal_closed = page.evaluate("""
            () => {
                const mcpModal = document.getElementById('mcp-servers-modal');
                if (mcpModal && mcpModal.classList.contains('active')) {
                    mcpModal.classList.remove('active');
                    return true;
                }
                return false;
            }
        """)
        if mcp_modal_closed:
            print("✅ MCP modal closed via JavaScript")
        
        # Remove modal-open class from body
        page.evaluate("""
            () => {
                document.body.classList.remove('modal-open');
            }
        """)
        
        # Wait for UI to settle
        page.wait_for_timeout(1000)
        
        print("✅ All modals forcibly closed")
        
    except Exception as e:
        print(f"Error closing modals: {e}")
    
    screenshot_with_markdown(page, "debug_github_mcp_setup", {
        "Phase": "GitHub MCP setup attempt",
        "GitHub Connector Found": str(github_connector.count() > 0),
        "Console Messages": str(len(console_messages))
    })
    
    # === PHASE 3: CONFIGURE BASIC SETTINGS FOR AGENT A ===
    print("\n=== PHASE 3: CONFIGURING BASIC SETTINGS FOR AGENT A ===")
    
    # Set up basic configuration
    settings_btn = page.locator('#settings-btn')
    settings_btn.click()
    page.wait_for_timeout(500)
    
    # Set API key and provider
    api_key_input = page.locator('#api-key-update')
    api_key_input.fill(api_key)
    
    provider_select = page.locator('#base-url-select')
    provider_select.select_option('openai')
    
    close_settings_btn = page.locator('#close-settings')
    close_settings_btn.click()
    page.wait_for_timeout(500)
    
    print("Basic settings configured for Agent A")
    
    # === PHASE 4: SAVE AGENT A ===
    print("\n=== PHASE 4: SAVING AGENT A ===")
    
    # Capture state before saving
    pre_save_state = page.evaluate("""
        () => {
            let state = {
                timestamp: new Date().toISOString()
            };
            
            try {
                // Check current configuration
                if (window.ConfigurationService) {
                    if (window.ConfigurationService.getCurrentConfiguration) {
                        state.currentConfig = window.ConfigurationService.getCurrentConfiguration();
                    }
                    if (window.ConfigurationService.collectCurrentConfiguration) {
                        state.collectedConfig = window.ConfigurationService.collectCurrentConfiguration({
                            includeMcpConnections: true,
                            includeFunctionLibrary: true
                        });
                    }
                }
                
                // Check MCP state
                if (window.MCPService) {
                    state.mcpConnections = window.MCPService.getConnections ? window.MCPService.getConnections() : 'method not available';
                    state.mcpTools = window.MCPService.getToolRegistry ? window.MCPService.getToolRegistry() : 'method not available';
                }
                
                // Check function state
                if (window.FunctionToolsService) {
                    state.functions = window.FunctionToolsService.getAllFunctions ? window.FunctionToolsService.getAllFunctions() : 'method not available';
                }
                
            } catch (e) {
                state.error = e.message;
            }
            
            return state;
        }
    """)
    
    print("Pre-save state captured:")
    print(json.dumps(pre_save_state, indent=2, default=str))
    
    # Save agent
    agent_btn = page.locator('#agent-config-btn')
    agent_btn.click()
    page.wait_for_timeout(500)
    
    agent_name_input = page.locator('#quick-agent-name')
    agent_name_input.fill('debug-agent-a-with-mcp')
    
    save_btn = page.locator('#quick-save-agent')
    save_btn.click()
    page.wait_for_timeout(3000)  # Wait longer for save to complete
    
    # Check console for save-related messages
    save_messages = [msg for msg in console_messages if 'save' in msg['text'].lower() or 'agent' in msg['text'].lower()]
    print(f"Save-related console messages: {len(save_messages)}")
    for msg in save_messages[-5:]:  # Last 5 messages
        print(f"  {msg['timestamp']} {msg['type']}: {msg['text']}")
    
    close_agent_btn = page.locator('#close-agent-config-modal')
    close_agent_btn.click()
    page.wait_for_timeout(500)
    
    print("✅ Agent A saved")
    
    # === PHASE 5: CREATE AGENT B (DIFFERENT CONFIG) ===
    print("\n=== PHASE 5: CREATING AGENT B WITH DIFFERENT CONFIG ===")
    
    # Change settings for Agent B
    settings_btn.click()
    page.wait_for_timeout(500)
    
    provider_select.select_option('groq')
    
    close_settings_btn.click()
    page.wait_for_timeout(500)
    
    # Save Agent B
    agent_btn.click()
    page.wait_for_timeout(500)
    
    agent_name_input.fill('debug-agent-b-groq')
    save_btn.click()
    page.wait_for_timeout(2000)
    
    close_agent_btn.click()
    page.wait_for_timeout(500)
    
    print("✅ Agent B saved")
    
    # === PHASE 6: LOAD AGENT A AND DEBUG RESTORATION ===
    print("\n=== PHASE 6: LOADING AGENT A AND DEBUGGING RESTORATION ===")
    
    # Capture state before loading
    pre_load_state = page.evaluate("""
        () => {
            let state = {};
            try {
                // Check current settings
                const providerSelect = document.getElementById('base-url-select');
                state.currentProvider = providerSelect ? providerSelect.value : 'not found';
                
                // Check agents in storage
                if (window.AgentService && window.AgentService.getAllAgents) {
                    const agents = window.AgentService.getAllAgents();
                    state.availableAgents = Object.keys(agents);
                    state.agentCount = Object.keys(agents).length;
                }
                
            } catch (e) {
                state.error = e.message;
            }
            return state;
        }
    """)
    
    print("Pre-load state:")
    print(json.dumps(pre_load_state, indent=2))
    
    # Load Agent A
    agent_btn.click()
    page.wait_for_timeout(500)
    
    # Find Agent A and load it
    load_buttons = page.locator('button:has-text("Load")')
    if load_buttons.count() > 0:
        print(f"Found {load_buttons.count()} load buttons")
        
        # Click first load button (should be Agent A)
        load_buttons.first.click()
        page.wait_for_timeout(3000)  # Wait longer for load to complete
        
        # Check console for load-related messages
        load_messages = [msg for msg in console_messages if 'load' in msg['text'].lower() or 'agent' in msg['text'].lower()]
        print(f"Load-related console messages: {len(load_messages)}")
        for msg in load_messages[-10:]:  # Last 10 messages
            print(f"  {msg['timestamp']} {msg['type']}: {msg['text']}")
    
    close_agent_btn.click()
    page.wait_for_timeout(500)
    
    # === PHASE 7: VERIFY RESTORATION ===
    print("\n=== PHASE 7: VERIFYING RESTORATION ===")
    
    # Check if settings were restored
    settings_btn.click()
    page.wait_for_timeout(500)
    
    restored_provider = provider_select.input_value()
    print(f"Restored provider: {restored_provider} (expected: openai)")
    
    close_settings_btn.click()
    page.wait_for_timeout(500)
    
    # Check MCP state after restoration
    post_load_mcp_state = page.evaluate("""
        () => {
            let mcpState = {};
            try {
                if (window.MCPService) {
                    mcpState.serviceAvailable = true;
                    mcpState.connections = window.MCPService.getConnections ? window.MCPService.getConnections() : 'method not available';
                    mcpState.tools = window.MCPService.getToolRegistry ? window.MCPService.getToolRegistry() : 'method not available';
                }
            } catch (e) {
                mcpState.error = e.message;
            }
            return mcpState;
        }
    """)
    
    print("Post-load MCP state:")
    print(json.dumps(post_load_mcp_state, indent=2))
    
    # Check GitHub connector state
    mcp_btn.click()
    page.wait_for_timeout(500)
    
    github_connector_post = page.locator('.quick-connector-card[data-service="github"]')
    if github_connector_post.count() > 0:
        github_status_post = github_connector_post.locator('.status, .connection-status')
        if github_status_post.count() > 0:
            status_text_post = github_status_post.text_content()
            print(f"GitHub connector status after load: {status_text_post}")
        
    # Close MCP modal
    close_mcp_btn = page.locator('.modal button:has-text("Close")')
    if close_mcp_btn.count() > 0:
        close_mcp_btn.first.click()
        page.wait_for_timeout(500)
    
    screenshot_with_markdown(page, "debug_final_state", {
        "Phase": "Final verification",
        "Provider Restored": restored_provider,
        "Expected Provider": "openai",
        "Restoration Success": str(restored_provider == "openai"),
        "Total Console Messages": str(len(console_messages)),
        "JS Errors": str(len(js_errors))
    })
    
    # === FINAL ANALYSIS ===
    print("\n=== FINAL ANALYSIS ===")
    print(f"Total console messages: {len(console_messages)}")
    print(f"JavaScript errors: {len(js_errors)}")
    
    if js_errors:
        print("JavaScript errors found:")
        for error in js_errors:
            print(f"  {error['timestamp']}: {error['text']}")
    
    # Save detailed logs
    debug_data = {
        'test_summary': {
            'provider_restored': restored_provider,
            'expected_provider': 'openai',
            'restoration_success': restored_provider == 'openai',
            'total_console_messages': len(console_messages),
            'js_errors_count': len(js_errors)
        },
        'pre_save_state': pre_save_state,
        'pre_load_state': pre_load_state,
        'post_load_mcp_state': post_load_mcp_state,
        'console_messages': console_messages,
        'js_errors': js_errors
    }
    
    with open('/Users/user/dev/hacka.re/_tests/playwright/debug_agent_mcp_persistence.json', 'w') as f:
        json.dump(debug_data, f, indent=2, default=str)
    
    print("Debug data saved to debug_agent_mcp_persistence.json")
    print(f"Result: {'✅ SUCCESS' if restored_provider == 'openai' else '❌ FAILED'}")
    
    return debug_data


@pytest.mark.feature_test
def test_debug_agent_mcp_persistence(page: Page, serve_hacka_re, api_key):
    """Test wrapper for the debug function"""
    debug_data = debug_agent_mcp_persistence(page, serve_hacka_re, api_key)
    
    # The test should document the issue, not necessarily pass
    # This helps us understand what's happening
    print(f"\nTest completed. Provider restoration: {debug_data['test_summary']['restoration_success']}")


if __name__ == "__main__":
    # Can be run directly for debugging
    print("This is a debug script for agent MCP persistence issues.")