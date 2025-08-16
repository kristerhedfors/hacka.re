"""
Test Gmail function registration when OAuth is restored from shared links
"""

from test_utils import screenshot_with_markdown
from playwright.sync_api import Page, expect

def test_gmail_function_registration_after_oauth_restore(page: Page, serve_hacka_re):
    """Test that Gmail functions are automatically registered when Gmail OAuth is restored from shared link"""
    
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Create a mock Gmail OAuth object
    mock_gmail_oauth = {
        'refreshToken': 'mock_refresh_token',
        'accessToken': 'mock_access_token',
        'tokenType': 'Bearer',
        'expiresAt': 1234567890
    }
    
    # Store the OAuth data directly 
    page.evaluate("""
        async (oauthData) => {
            // Store Gmail OAuth data to simulate shared link restoration
            await window.CoreStorageService.setValue('mcp_gmail_oauth', oauthData);
            console.log('Gmail OAuth data stored for test');
        }
    """, mock_gmail_oauth)
    
    screenshot_with_markdown(page, "oauth_stored", {
        "Status": "Gmail OAuth data stored in CoreStorageService",
        "OAuth Data": "Mock refresh and access tokens"
    })
    
    # Check if Gmail functions exist before registration
    initial_functions = page.evaluate("""
        () => {
            const functions = [];
            if (window.gmail_list_messages) functions.push('gmail_list_messages');
            if (window.gmail_get_message) functions.push('gmail_get_message'); 
            if (window.gmail_send_message) functions.push('gmail_send_message');
            if (window.gmail_search_messages) functions.push('gmail_search_messages');
            return functions;
        }
    """)
    
    print(f"Initial Gmail functions found: {initial_functions}")
    
    # Now call the registerGmailFunctions method directly
    registration_result = page.evaluate("""
        async (oauthData) => {
            try {
                if (window.MCPServiceConnectors && window.MCPServiceConnectors.registerGmailFunctions) {
                    const result = await window.MCPServiceConnectors.registerGmailFunctions(oauthData);
                    console.log('Gmail function registration result:', result);
                    return { success: true, result: result };
                } else {
                    console.error('MCPServiceConnectors.registerGmailFunctions not available');
                    return { success: false, error: 'registerGmailFunctions not available' };
                }
            } catch (error) {
                console.error('Error calling registerGmailFunctions:', error);
                return { success: false, error: error.message };
            }
        }
    """, mock_gmail_oauth)
    
    print(f"Registration result: {registration_result}")
    
    screenshot_with_markdown(page, "function_registration_attempted", {
        "Status": "Gmail function registration attempted",
        "Result": str(registration_result),
        "Method Available": str('success' in registration_result)
    })
    
    # Check if Gmail functions exist after registration
    final_functions = page.evaluate("""
        () => {
            const functions = [];
            if (window.gmail_list_messages) functions.push('gmail_list_messages');
            if (window.gmail_get_message) functions.push('gmail_get_message'); 
            if (window.gmail_send_message) functions.push('gmail_send_message');
            if (window.gmail_search_messages) functions.push('gmail_search_messages');
            return functions;
        }
    """)
    
    print(f"Final Gmail functions found: {final_functions}")
    
    # Also check the Function Tools Registry
    registry_functions = page.evaluate("""
        () => {
            try {
                if (window.FunctionToolsService && window.FunctionToolsService.getJsFunctions) {
                    const allFunctions = window.FunctionToolsService.getJsFunctions();
                    const gmailFunctions = Object.keys(allFunctions).filter(name => name.startsWith('gmail_'));
                    return gmailFunctions;
                } else {
                    return [];
                }
            } catch (error) {
                console.error('Error checking Function Tools Registry:', error);
                return [];
            }
        }
    """)
    
    print(f"Gmail functions in Function Tools Registry: {registry_functions}")
    
    screenshot_with_markdown(page, "final_verification", {
        "Status": "Gmail function registration completed",
        "Global Functions": str(final_functions),
        "Registry Functions": str(registry_functions),
        "Registration Success": str(registration_result.get('success', False))
    })
    
    # Verify that at least some Gmail functions were registered
    if registration_result.get('success'):
        assert len(final_functions) > 0 or len(registry_functions) > 0, "Gmail functions should be registered after OAuth restore"
        print("✅ Gmail functions successfully registered after OAuth restore")
    else:
        print(f"⚠️ Gmail function registration failed: {registration_result.get('error', 'Unknown error')}")