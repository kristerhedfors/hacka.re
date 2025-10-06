"""
Basic Hugging Face MCP Integration Tests
Tests connection, tool discovery, and basic tool execution
"""

import pytest
from playwright.sync_api import Page, expect
import time


def dismiss_welcome_modal(page: Page):
    """Dismiss welcome modal if present"""
    try:
        close_btn = page.locator("#close-welcome-modal")
        if close_btn.is_visible(timeout=2000):
            close_btn.click()
            page.wait_for_timeout(500)
    except:
        pass


def test_huggingface_quick_connector_visible(page: Page, serve_hacka_re):
    """Test that Hugging Face quick connector is visible in MCP modal"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)

    # Open MCP servers modal
    page.locator("#mcp-servers-btn").click()
    page.wait_for_selector("#mcp-servers-modal", state="visible")

    # Look for Hugging Face quick connector
    hf_connector = page.locator('.quick-connector-card[data-service="huggingface"]')
    expect(hf_connector).to_be_visible()

    # Check connector has correct info
    expect(hf_connector.locator('h4')).to_contain_text('Hugging Face')
    expect(hf_connector.locator('p')).to_contain_text('Access Hugging Face Hub')

    # Check connect button is visible
    connect_btn = hf_connector.locator('button.connect-btn')
    expect(connect_btn).to_be_visible()
    expect(connect_btn).to_contain_text('Connect')


def test_huggingface_icon_loads(page: Page, serve_hacka_re):
    """Test that Hugging Face icon SVG loads properly"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)

    page.locator("#mcp-servers-btn").click()
    page.wait_for_selector("#mcp-servers-modal", state="visible")

    # Check icon image element exists
    hf_connector = page.locator('.quick-connector-card[data-service="huggingface"]')
    icon_img = hf_connector.locator('img[alt="Hugging Face"]')

    expect(icon_img).to_be_visible()
    expect(icon_img).to_have_attribute('src', 'images/huggingface-icon.svg')


def test_huggingface_connector_registered(page: Page, serve_hacka_re):
    """Test that Hugging Face connector is registered in service manager"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)

    # Check that HuggingFaceConnector is loaded
    hf_connector_exists = page.evaluate("""
        () => {
            return !!(window.HuggingFaceConnector && window.mcpServiceManager);
        }
    """)

    assert hf_connector_exists, "HuggingFaceConnector or mcpServiceManager not loaded"

    # Check connector is registered
    connector_registered = page.evaluate("""
        () => {
            const connector = window.mcpServiceManager.getConnector('huggingface');
            return !!connector && connector.serviceKey === 'huggingface';
        }
    """)

    assert connector_registered, "Hugging Face connector not registered in service manager"


def test_huggingface_config(page: Page, serve_hacka_re):
    """Test Hugging Face connector configuration"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)

    # Get connector config
    config = page.evaluate("""
        () => {
            const connector = window.mcpServiceManager.getConnector('huggingface');
            return connector ? connector.config : null;
        }
    """)

    assert config is not None, "Connector config not found"
    assert config['name'] == 'Hugging Face', f"Unexpected name: {config.get('name')}"
    assert config['authType'] == 'mcp-introspection', f"Unexpected authType: {config.get('authType')}"
    assert 'huggingface.co/mcp' in config['mcpServerUrl'], f"Unexpected URL: {config.get('mcpServerUrl')}"


def test_huggingface_prompt_registered(page: Page, serve_hacka_re):
    """Test that Hugging Face integration guide prompt is registered"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)

    # Check that the prompt is loaded
    prompt_exists = page.evaluate("""
        () => {
            return !!(window.HuggingFaceIntegrationGuide);
        }
    """)

    assert prompt_exists, "HuggingFaceIntegrationGuide not loaded"

    # Check prompt structure
    prompt_data = page.evaluate("""
        () => {
            return {
                name: window.HuggingFaceIntegrationGuide.name,
                category: window.HuggingFaceIntegrationGuide.category,
                isMcpPrompt: window.HuggingFaceIntegrationGuide.isMcpPrompt,
                hasContent: !!window.HuggingFaceIntegrationGuide.content
            };
        }
    """)

    assert prompt_data['name'] == 'Hugging Face MCP prompt', f"Unexpected prompt name: {prompt_data['name']}"
    assert prompt_data['category'] == 'ai-ml', f"Unexpected category: {prompt_data['category']}"
    assert prompt_data['isMcpPrompt'] is True, "Prompt not marked as MCP prompt"
    assert prompt_data['hasContent'] is True, "Prompt has no content"


def test_gmail_removed(page: Page, serve_hacka_re):
    """Test that Gmail connector has been removed"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)

    # Check Gmail connector not in window
    gmail_exists = page.evaluate("""
        () => {
            return !!(window.GmailConnector);
        }
    """)

    assert not gmail_exists, "GmailConnector should not exist"

    # Open MCP modal and check Gmail not in quick connectors
    page.locator("#mcp-servers-btn").click()
    page.wait_for_selector("#mcp-servers-modal", state="visible")

    gmail_connector = page.locator('.quick-connector-card[data-service="gmail"]')
    expect(gmail_connector).not_to_be_visible()


def test_huggingface_setup_instructions(page: Page, serve_hacka_re):
    """Test that setup instructions are accessible"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)

    # Get setup instructions
    instructions = page.evaluate("""
        () => {
            const connector = window.mcpServiceManager.getConnector('huggingface');
            return connector ? connector.config.setupInstructions : null;
        }
    """)

    assert instructions is not None, "Setup instructions not found"
    assert instructions['title'] == 'Hugging Face MCP Setup', f"Unexpected title: {instructions.get('title')}"
    assert len(instructions['steps']) > 0, "No setup steps found"
    assert 'huggingface.co' in instructions['docUrl'], f"Unexpected doc URL: {instructions.get('docUrl')}"


# Note: Actual connection tests require HF authentication and are more complex
# These would need to be added once the MCP server integration is working

@pytest.mark.skip(reason="Requires actual Hugging Face MCP server connection")
def test_huggingface_connection(page: Page, serve_hacka_re):
    """Test actual connection to Hugging Face MCP server (requires auth)"""
    # This test would need:
    # 1. Mock or real HF authentication
    # 2. MCP server connectivity
    # 3. Tool discovery verification
    pass


@pytest.mark.skip(reason="Requires actual Hugging Face MCP server connection")
def test_huggingface_tool_discovery(page: Page, serve_hacka_re):
    """Test that tools are discovered via introspection (requires connection)"""
    # This test would need:
    # 1. Successful connection
    # 2. MCP introspection call
    # 3. Verify tools are registered
    pass


@pytest.mark.skip(reason="Requires actual Hugging Face MCP server connection")
def test_huggingface_tool_execution(page: Page, serve_hacka_re):
    """Test executing a Hugging Face tool (requires connection)"""
    # This test would need:
    # 1. Successful connection
    # 2. Discovered tools
    # 3. Execute a simple tool (e.g., search models)
    # 4. Verify result
    pass
