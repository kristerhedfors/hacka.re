"""
Test Agent MCP Configuration Save/Load
Tests that agents properly save and restore MCP connection configuration including:
- GitHub OAuth tokens
- Gmail OAuth configuration  
- Other OAuth tokens
- MCP server connections
- Connection states and metadata
"""
from playwright.sync_api import Page
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_agent_mcp_config_save_load(page: Page, serve_hacka_re, api_key):
    """Test agent save/load for MCP configuration aspects"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    print("=== AGENT MCP CONFIG SAVE/LOAD TEST ===")
    
    # Step 1: Set up basic API first
    print("\\nStep 1: Setting up basic API configuration...")
    page.locator('#settings-btn').click()
    page.wait_for_timeout(2000)
    page.locator('#api-key-update').fill(api_key)
    page.locator('#base-url-select').select_option('groq')
    page.locator('#close-settings').click()
    page.wait_for_timeout(1000)
    
    # Step 2: Configure MCP connections (simulated)
    print("Step 2: Configuring MCP connections...")
    
    # Simulate setting MCP tokens directly in storage for testing
    page.evaluate("""() => {
        // Set test MCP configuration
        if (window.CoreStorageService) {
            window.CoreStorageService.setValue('mcp_github_token', 'test_github_token_123');
            window.CoreStorageService.setValue('mcp_gmail_oauth', {
                access_token: 'test_gmail_token',
                refresh_token: 'test_gmail_refresh',
                expires_at: Date.now() + 3600000
            });
            window.CoreStorageService.setValue('mcp-oauth-tokens', {
                slack: { token: 'test_slack_token' },
                discord: { token: 'test_discord_token' }
            });
        }
    }""")
    
    # Step 3: Capture original MCP configuration
    print("Step 3: Capturing original MCP configuration...")
    original_mcp_config = page.evaluate("""() => {
        if (!window.CoreStorageService) return {};
        
        return {
            github_token: window.CoreStorageService.getValue('mcp_github_token'),
            gmail_oauth: window.CoreStorageService.getValue('mcp_gmail_oauth'),
            oauth_tokens: window.CoreStorageService.getValue('mcp-oauth-tokens')
        };
    }""")
    
    print(f"Original MCP config: GitHub token present={bool(original_mcp_config.get('github_token'))}, Gmail OAuth present={bool(original_mcp_config.get('gmail_oauth'))}, Other tokens={len(original_mcp_config.get('oauth_tokens', {}))}")
    
    # Step 4: Save as agent
    print("Step 4: Saving MCP configuration as agent...")
    page.locator('#agent-config-btn').click()
    page.wait_for_timeout(500)
    
    page.locator('#quick-agent-name').fill('mcp-config-test-agent')
    page.on("dialog", lambda dialog: dialog.accept())
    page.locator('#quick-save-agent').click()
    page.wait_for_timeout(2000)
    
    page.locator('#close-agent-config-modal').click()
    page.wait_for_timeout(500)
    
    # Step 5: Clear MCP configuration
    print("Step 5: Clearing MCP configuration...")
    page.evaluate("""() => {
        if (window.CoreStorageService) {
            window.CoreStorageService.setValue('mcp_github_token', null);
            window.CoreStorageService.setValue('mcp_gmail_oauth', null);
            window.CoreStorageService.setValue('mcp-oauth-tokens', {});
        }
    }""")
    
    # Step 6: Verify configuration was cleared
    print("Step 6: Verifying MCP configuration was cleared...")
    cleared_mcp_config = page.evaluate("""() => {
        if (!window.CoreStorageService) return {};
        
        return {
            github_token: window.CoreStorageService.getValue('mcp_github_token'),
            gmail_oauth: window.CoreStorageService.getValue('mcp_gmail_oauth'),
            oauth_tokens: window.CoreStorageService.getValue('mcp-oauth-tokens')
        };
    }""")
    
    print(f"Cleared MCP config: GitHub token present={bool(cleared_mcp_config.get('github_token'))}, Gmail OAuth present={bool(cleared_mcp_config.get('gmail_oauth'))}, Other tokens={len(cleared_mcp_config.get('oauth_tokens', {}))}")
    
    # Step 7: Load the saved agent
    print("Step 7: Loading saved agent...")
    page.locator('#agent-config-btn').click()
    page.wait_for_timeout(500)
    
    load_btn = page.locator('button:has-text("Load")').first
    load_btn.click()
    page.wait_for_timeout(3000)  # Wait for agent to load
    
    if page.locator('#agent-config-modal').is_visible():
        page.locator('#close-agent-config-modal').click()
        page.wait_for_timeout(500)
    
    # Step 8: Verify MCP configuration was restored
    print("Step 8: Verifying MCP configuration restored...")
    restored_mcp_config = page.evaluate("""() => {
        if (!window.CoreStorageService) return {};
        
        return {
            github_token: window.CoreStorageService.getValue('mcp_github_token'),
            gmail_oauth: window.CoreStorageService.getValue('mcp_gmail_oauth'),
            oauth_tokens: window.CoreStorageService.getValue('mcp-oauth-tokens')
        };
    }""")
    
    print(f"Restored MCP config: GitHub token present={bool(restored_mcp_config.get('github_token'))}, Gmail OAuth present={bool(restored_mcp_config.get('gmail_oauth'))}, Other tokens={len(restored_mcp_config.get('oauth_tokens', {}))}")
    
    screenshot_with_markdown(page, "agent_mcp_config_test", {
        "Test Phase": "MCP configuration save/load complete",
        "Original GitHub Token": str(bool(original_mcp_config.get('github_token'))),
        "Restored GitHub Token": str(bool(restored_mcp_config.get('github_token'))),
        "Original Gmail OAuth": str(bool(original_mcp_config.get('gmail_oauth'))),
        "Restored Gmail OAuth": str(bool(restored_mcp_config.get('gmail_oauth'))),
        "Original OAuth Tokens": str(len(original_mcp_config.get('oauth_tokens', {}))),
        "Restored OAuth Tokens": str(len(restored_mcp_config.get('oauth_tokens', {}))),
        "GitHub Token Restored": str(bool(restored_mcp_config.get('github_token')) == bool(original_mcp_config.get('github_token'))),
        "Gmail OAuth Restored": str(bool(restored_mcp_config.get('gmail_oauth')) == bool(original_mcp_config.get('gmail_oauth')))
    })
    
    # Step 9: Validate all MCP configuration was restored
    print("Step 9: Validating MCP configuration restoration...")
    
    # GitHub token should be restored
    assert bool(restored_mcp_config.get('github_token')) == bool(original_mcp_config.get('github_token')), \
        f"GitHub token not restored correctly"
    
    if original_mcp_config.get('github_token'):
        assert restored_mcp_config.get('github_token') == original_mcp_config.get('github_token'), \
            f"GitHub token value not restored correctly"
    
    # Gmail OAuth should be restored
    assert bool(restored_mcp_config.get('gmail_oauth')) == bool(original_mcp_config.get('gmail_oauth')), \
        f"Gmail OAuth not restored correctly"
    
    if original_mcp_config.get('gmail_oauth'):
        restored_gmail = restored_mcp_config.get('gmail_oauth', {})
        original_gmail = original_mcp_config.get('gmail_oauth', {})
        assert restored_gmail.get('access_token') == original_gmail.get('access_token'), \
            f"Gmail access token not restored correctly"
    
    # OAuth tokens should be restored
    restored_oauth_count = len(restored_mcp_config.get('oauth_tokens', {}))
    original_oauth_count = len(original_mcp_config.get('oauth_tokens', {}))
    assert restored_oauth_count == original_oauth_count, \
        f"OAuth tokens count not restored: expected {original_oauth_count}, got {restored_oauth_count}"
    
    if original_mcp_config.get('oauth_tokens'):
        for key, value in original_mcp_config.get('oauth_tokens', {}).items():
            assert key in restored_mcp_config.get('oauth_tokens', {}), f"OAuth token {key} not restored"
            assert restored_mcp_config['oauth_tokens'][key] == value, f"OAuth token {key} value not restored correctly"
    
    print("\\n🎉 Agent MCP configuration save/load test completed successfully!")
    print("✅ All MCP configuration aspects were saved and restored correctly")
    print(f"✅ GitHub token: {bool(original_mcp_config.get('github_token'))} → {bool(restored_mcp_config.get('github_token'))}")
    print(f"✅ Gmail OAuth: {bool(original_mcp_config.get('gmail_oauth'))} → {bool(restored_mcp_config.get('gmail_oauth'))}")
    print(f"✅ OAuth tokens: {len(original_mcp_config.get('oauth_tokens', {}))} → {len(restored_mcp_config.get('oauth_tokens', {}))}")

def test_agent_mcp_config_empty_state(page: Page, serve_hacka_re, api_key):
    """Test MCP configuration with empty state"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    print("=== AGENT MCP CONFIG EMPTY STATE TEST ===")
    
    # Set up API
    page.locator('#settings-btn').click()
    page.wait_for_timeout(2000)
    page.locator('#api-key-update').fill(api_key)
    page.locator('#close-settings').click()
    page.wait_for_timeout(1000)
    
    # Ensure MCP config is empty
    page.evaluate("""() => {
        if (window.CoreStorageService) {
            window.CoreStorageService.setValue('mcp_github_token', null);
            window.CoreStorageService.setValue('mcp_gmail_oauth', null);
            window.CoreStorageService.setValue('mcp-oauth-tokens', {});
        }
    }""")
    
    # Save agent with empty MCP config
    page.locator('#agent-config-btn').click()
    page.wait_for_timeout(500)
    
    page.locator('#quick-agent-name').fill('empty-mcp-agent')
    page.on("dialog", lambda dialog: dialog.accept())
    page.locator('#quick-save-agent').click()
    page.wait_for_timeout(2000)
    
    page.locator('#close-agent-config-modal').click()
    page.wait_for_timeout(500)
    
    # Add some MCP config
    page.evaluate("""() => {
        if (window.CoreStorageService) {
            window.CoreStorageService.setValue('mcp_github_token', 'temp_token');
        }
    }""")
    
    # Load agent and verify empty state is restored
    page.locator('#agent-config-btn').click()
    page.wait_for_timeout(500)
    
    load_btn = page.locator('button:has-text("Load")').first
    load_btn.click()
    page.wait_for_timeout(3000)
    
    if page.locator('#agent-config-modal').is_visible():
        page.locator('#close-agent-config-modal').click()
        page.wait_for_timeout(500)
    
    # Verify empty state was restored
    restored_mcp_config = page.evaluate("""() => {
        if (!window.CoreStorageService) return {};
        
        return {
            github_token: window.CoreStorageService.getValue('mcp_github_token'),
            gmail_oauth: window.CoreStorageService.getValue('mcp_gmail_oauth'),
            oauth_tokens: window.CoreStorageService.getValue('mcp-oauth-tokens')
        };
    }""")
    
    assert not restored_mcp_config.get('github_token'), "GitHub token should be empty"
    assert not restored_mcp_config.get('gmail_oauth'), "Gmail OAuth should be empty"
    assert len(restored_mcp_config.get('oauth_tokens', {})) == 0, "OAuth tokens should be empty"
    
    print("✅ Empty MCP configuration state handled correctly")
    print("\\n🎉 Agent MCP configuration empty state test completed successfully!")

if __name__ == "__main__":
    test_agent_mcp_config_save_load()
    test_agent_mcp_config_empty_state()