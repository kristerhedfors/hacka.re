#!/usr/bin/env python3
"""
Test Shodan MCP Integration

Tests the comprehensive Shodan integration including:
- Quick connector UI
- Service connector registration  
- Function calling tools
- API key authentication
- Response formatting
"""

import json
import pytest
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown


def dismiss_settings_modal(page: Page):
    """Dismiss settings modal if it's open"""
    try:
        if page.locator('#settings-modal.modal.active').is_visible():
            page.locator('#settings-modal .close-btn, #settings-modal .btn-secondary').first.click()
            page.wait_for_selector('#settings-modal:not(.active)', timeout=2000)
    except Exception:
        # Modal might not be open, that's fine
        pass


class TestShodanIntegration:
    """Test Shodan MCP integration functionality"""

    def test_shodan_quick_connector_ui(self, page: Page, serve_hacka_re):
        """Test Shodan appears in MCP quick connectors"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        dismiss_settings_modal(page)
        dismiss_settings_modal(page)

        # Open MCP modal
        mcp_button = page.locator('#mcp-servers-btn')
        expect(mcp_button).to_be_visible()
        mcp_button.click()

        # Wait for modal to appear
        page.wait_for_selector('.modal.active', timeout=5000)
        
        # Check for Shodan quick connector
        shodan_card = page.locator('[data-service="shodan"]')
        expect(shodan_card).to_be_visible()

        # Verify Shodan card content
        expect(shodan_card.locator('h4')).to_contain_text('Shodan')
        expect(shodan_card.locator('p')).to_contain_text('Search engine for Internet-connected devices')
        
        # Check for Shodan SVG icon
        shodan_icon = shodan_card.locator('.connector-icon img')
        expect(shodan_icon).to_be_visible()
        expect(shodan_icon).to_have_attribute('src', 'images/shodan-icon.svg')

        # Check for Connect button
        connect_btn = shodan_card.locator('.connect-btn')
        expect(connect_btn).to_be_visible()
        expect(connect_btn).to_contain_text('Connect')

        screenshot_with_markdown(page, "shodan_quick_connector", {
            "Status": "Shodan quick connector visible",
            "Component": "MCP Modal",
            "Icon": "SVG icon loaded",
            "Connect Button": "Available"
        })

    def test_shodan_service_connector_config(self, page: Page, serve_hacka_re):
        """Test Shodan service connector configuration"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        dismiss_settings_modal(page)

        # Check if MCPServiceConnectors is available and configured
        shodan_config = page.evaluate("""
            () => {
                if (window.MCPServiceConnectors && window.MCPServiceConnectors.getAvailableServices) {
                    const services = window.MCPServiceConnectors.getAvailableServices();
                    return services.find(s => s.key === 'shodan');
                }
                return null;
            }
        """)

        assert shodan_config is not None, "Shodan should be configured in MCPServiceConnectors"
        assert shodan_config['name'] == 'Shodan'
        assert shodan_config['authType'] == 'api-key'
        assert 'shodan_host_info' in shodan_config.get('tools', {})

        screenshot_with_markdown(page, "shodan_service_config", {
            "Status": "Service connector configured",
            "Auth Type": shodan_config.get('authType', 'None'),
            "Tools Count": str(len(shodan_config.get('tools', {})))
        })

    def test_shodan_api_key_modal(self, page: Page, serve_hacka_re):
        """Test Shodan API key input modal"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        dismiss_settings_modal(page)

        # Open MCP modal
        page.locator('#mcp-servers-btn').click()
        page.wait_for_selector('.modal.active', timeout=5000)

        # Click Shodan connect button
        shodan_connect = page.locator('[data-service="shodan"] .connect-btn')
        shodan_connect.click()

        # Wait for API key modal
        page.wait_for_selector('#api-key-modal', timeout=5000)
        
        api_key_modal = page.locator('#api-key-modal')
        expect(api_key_modal).to_be_visible()

        # Check modal content
        expect(api_key_modal.locator('h3')).to_contain_text('Shodan API Key')
        
        # Check setup instructions
        instructions = api_key_modal.locator('.api-key-instructions')
        expect(instructions).to_be_visible()
        expect(instructions).to_contain_text('Go to shodan.io and create an account')

        # Check API key input field
        api_input = page.locator('#api-key-input')
        expect(api_input).to_be_visible()
        expect(api_input).to_have_attribute('type', 'password')

        # Check buttons
        expect(page.locator('#api-key-connect')).to_be_visible()
        expect(page.locator('#api-key-cancel')).to_be_visible()

        screenshot_with_markdown(page, "shodan_api_key_modal", {
            "Status": "API key modal displayed",
            "Input Field": "Password type field visible",
            "Instructions": "Setup steps shown",
            "Buttons": "Connect and Cancel available"
        })

    def test_shodan_function_tools_registration(self, page: Page, serve_hacka_re):
        """Test that Shodan function tools are properly registered"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        dismiss_settings_modal(page)

        # Check if Shodan functions would be registered (mock connection)
        shodan_tools = page.evaluate("""
            () => {
                // Simulate what happens when Shodan is connected
                const MCPServiceConnectors = window.MCPServiceConnectors;
                if (!MCPServiceConnectors) return null;
                
                // Get Shodan service config
                const services = MCPServiceConnectors.getAvailableServices();
                const shodanService = services.find(s => s.key === 'shodan');
                
                if (!shodanService) return null;
                
                // Return the tools that would be registered
                return {
                    serviceKey: 'shodan',
                    toolCount: Object.keys(shodanService.tools || {}).length,
                    toolNames: Object.keys(shodanService.tools || {}),
                    sampleTool: shodanService.tools?.shodan_host_info
                };
            }
        """)

        assert shodan_tools is not None, "Shodan tools configuration should be available"
        assert shodan_tools['toolCount'] > 0, "Shodan should have configured tools"
        assert 'shodan_host_info' in shodan_tools['toolNames'], "Should include host info tool"
        assert 'shodan_search' in shodan_tools['toolNames'], "Should include search tool"

        # Verify sample tool structure
        sample_tool = shodan_tools['sampleTool']
        assert sample_tool is not None, "Sample tool should be available"
        assert 'description' in sample_tool, "Tool should have description"
        assert 'parameters' in sample_tool, "Tool should have parameters"

        screenshot_with_markdown(page, "shodan_function_tools", {
            "Status": "Function tools configured",
            "Tool Count": str(shodan_tools['toolCount']),
            "Sample Tool": "Host info tool configured",
            "Parameters": "Tool parameters defined"
        })

    def test_shodan_comprehensive_api_coverage(self, page: Page, serve_hacka_re):
        """Test that all major Shodan API categories are covered"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        dismiss_settings_modal(page)

        # Get Shodan service configuration
        shodan_config = page.evaluate("""
            () => {
                const MCPServiceConnectors = window.MCPServiceConnectors;
                if (!MCPServiceConnectors) return null;
                
                const services = MCPServiceConnectors.getAvailableServices();
                const shodan = services.find(s => s.key === 'shodan');
                return shodan ? shodan.tools : null;
            }
        """)

        assert shodan_config is not None, "Shodan config should be available"

        # Check for major API categories
        search_tools = [name for name in shodan_config.keys() if 'search' in name]
        dns_tools = [name for name in shodan_config.keys() if 'dns' in name]
        account_tools = [name for name in shodan_config.keys() if 'account' in name or 'api_info' in name]
        security_tools = [name for name in shodan_config.keys() if 'honeyscore' in name]

        assert len(search_tools) >= 3, f"Should have multiple search tools, found: {search_tools}"
        assert len(dns_tools) >= 2, f"Should have DNS tools, found: {dns_tools}"
        assert len(account_tools) >= 1, f"Should have account tools, found: {account_tools}"
        assert len(security_tools) >= 1, f"Should have security tools, found: {security_tools}"

        # Check specific important tools
        expected_tools = [
            'shodan_host_info',
            'shodan_search', 
            'shodan_dns_resolve',
            'shodan_account_profile',
            'shodan_labs_honeyscore'
        ]

        for tool in expected_tools:
            assert tool in shodan_config, f"Missing expected tool: {tool}"

        screenshot_with_markdown(page, "shodan_api_coverage", {
            "Status": "Comprehensive API coverage verified",
            "Total Tools": str(len(shodan_config)),
            "Search Tools": str(len(search_tools)),
            "DNS Tools": str(len(dns_tools)),
            "Security Tools": str(len(security_tools))
        })

    def test_shodan_svg_icon_rendering(self, page: Page, serve_hacka_re):
        """Test that Shodan SVG icon renders correctly"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        dismiss_settings_modal(page)

        # Open MCP modal
        page.locator('#mcp-servers-btn').click()
        page.wait_for_selector('.modal.active', timeout=5000)

        # Check Shodan icon
        shodan_icon = page.locator('[data-service="shodan"] .connector-icon img')
        expect(shodan_icon).to_be_visible()
        
        # Verify SVG properties
        icon_src = shodan_icon.get_attribute('src')
        icon_width = shodan_icon.get_attribute('style')
        
        assert icon_src == 'images/shodan-icon.svg', f"Expected SVG icon, got: {icon_src}"
        assert 'width: 32px' in icon_width, "Icon should be 32px wide"
        assert 'height: 32px' in icon_width, "Icon should be 32px tall"

        # Check that SVG file exists and loads
        icon_response = page.evaluate("""
            async (src) => {
                try {
                    const response = await fetch(src);
                    const content = await response.text();
                    return {
                        status: response.status,
                        contentType: response.headers.get('content-type'),
                        isSvg: content.includes('<svg') && content.includes('</svg>'),
                        hasCircles: content.includes('<circle')
                    };
                } catch (error) {
                    return { error: error.message };
                }
            }
        """, icon_src)

        assert icon_response.get('status') == 200, "SVG icon should load successfully"
        assert icon_response.get('isSvg'), "Content should be valid SVG"
        assert icon_response.get('hasCircles'), "SVG should contain circles (Shodan bubbles)"

        screenshot_with_markdown(page, "shodan_svg_icon", {
            "Status": "SVG icon renders correctly", 
            "Source": icon_src,
            "Size": "32x32px",
            "Content": "Valid SVG with circles"
        })

    def test_shodan_error_handling_config(self, page: Page, serve_hacka_re):
        """Test Shodan error handling configuration"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        dismiss_settings_modal(page)

        # Check error handling in executeShodanTool method
        error_handling = page.evaluate("""
            () => {
                const MCPServiceConnectors = window.MCPServiceConnectors;
                if (!MCPServiceConnectors) return null;
                
                // Check if the method exists and has error handling
                const method = MCPServiceConnectors.executeShodanTool;
                if (!method) return { method: false };
                
                // Get method source to verify error handling patterns
                const source = method.toString();
                const hasErrorHandling = source.includes('response.status === 401') &&
                                       source.includes('response.status === 402') &&
                                       source.includes('response.status === 429') &&
                                       source.includes('Invalid Shodan API key');
                
                return {
                    method: true,
                    hasErrorHandling: hasErrorHandling,
                    sourceLength: source.length
                };
            }
        """)

        assert error_handling is not None, "Error handling check should succeed"
        assert error_handling.get('method'), "executeShodanTool method should exist"
        assert error_handling.get('hasErrorHandling'), "Should have comprehensive error handling"

        screenshot_with_markdown(page, "shodan_error_handling", {
            "Status": "Error handling configured",
            "Method": "executeShodanTool exists", 
            "Error Codes": "401, 402, 429 handled",
            "Source Length": str(error_handling.get('sourceLength', 0))
        })

    def test_shodan_integration_completeness(self, page: Page, serve_hacka_re):
        """Test overall Shodan integration completeness"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        dismiss_settings_modal(page)

        # Comprehensive integration check
        integration_status = page.evaluate("""
            () => {
                const checks = {};
                
                // Check MCPServiceConnectors
                checks.serviceConnectors = !!window.MCPServiceConnectors;
                
                // Check Shodan in quick connectors
                const quickConnectors = (window.MCPQuickConnectors && window.MCPQuickConnectors.QUICK_CONNECTORS);
                checks.quickConnectors = quickConnectors && quickConnectors.shodan;
                
                // Check service configuration
                if (window.MCPServiceConnectors) {
                    try {
                        const services = window.MCPServiceConnectors.getAvailableServices();
                        const shodan = services.find(s => s.key === 'shodan');
                        checks.serviceConfig = !!shodan;
                        checks.authType = shodan ? shodan.authType : null;
                        checks.toolCount = shodan ? Object.keys(shodan.tools || {}).length : 0;
                    } catch (e) {
                        checks.serviceConfigError = e.message;
                    }
                }
                
                // Check icon configuration
                if (checks.quickConnectors) {
                    const shodan = quickConnectors.shodan;
                    checks.iconType = shodan.iconType;
                    checks.iconPath = shodan.icon;
                }
                
                return checks;
            }
        """)

        # Verify all components are properly integrated
        assert integration_status.get('serviceConnectors'), "MCPServiceConnectors should be available"
        assert integration_status.get('quickConnectors'), "Shodan should be in quick connectors"
        assert integration_status.get('serviceConfig'), "Shodan service should be configured"
        assert integration_status.get('authType') == 'api-key', "Should use API key authentication"
        assert integration_status.get('toolCount', 0) > 10, "Should have comprehensive tool coverage"
        assert integration_status.get('iconType') == 'svg', "Should use SVG icon"
        assert integration_status.get('iconPath') == 'images/shodan-icon.svg', "Should use custom SVG icon"

        screenshot_with_markdown(page, "shodan_integration_complete", {
            "Status": "✅ Integration complete",
            "Service Connectors": "✅ Available",
            "Quick Connectors": "✅ Configured", 
            "Auth Type": integration_status.get('authType', 'None'),
            "Tool Count": str(integration_status.get('toolCount', 0)),
            "Icon": f"✅ {integration_status.get('iconType', 'None')}"
        })


if __name__ == "__main__":
    pytest.main([__file__])