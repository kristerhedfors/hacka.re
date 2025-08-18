#!/usr/bin/env python3
"""
Simple Shodan Integration Test

Tests basic Shodan integration without complex UI interactions
"""

import pytest
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown


class TestShodanSimple:
    """Simple Shodan integration tests"""

    def test_shodan_service_connector_exists(self, page: Page, serve_hacka_re):
        """Test Shodan service connector is properly configured"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)

        # Check if MCPServiceConnectors has Shodan configured
        shodan_config = page.evaluate("""
            () => {
                try {
                    if (window.MCPServiceConnectors && window.MCPServiceConnectors.getAvailableServices) {
                        const services = window.MCPServiceConnectors.getAvailableServices();
                        return services.find(s => s.key === 'shodan') || null;
                    }
                    return null;
                } catch (e) {
                    return { error: e.message };
                }
            }
        """)

        assert shodan_config is not None, "Shodan should be configured in MCPServiceConnectors"
        assert not shodan_config.get('error'), f"Error accessing Shodan config: {shodan_config.get('error')}"
        assert shodan_config['name'] == 'Shodan'
        assert shodan_config['authType'] == 'api-key'
        
        screenshot_with_markdown(page, "shodan_service_exists", {
            "Status": "✅ Shodan service configured",
            "Name": shodan_config.get('name', 'N/A'),
            "Auth Type": shodan_config.get('authType', 'N/A')
        })

    def test_shodan_tools_configuration(self, page: Page, serve_hacka_re):
        """Test Shodan tools are properly configured"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)

        # Get Shodan tools configuration
        tools_config = page.evaluate("""
            () => {
                try {
                    if (window.MCPServiceConnectors && window.MCPServiceConnectors.getAvailableServices) {
                        const services = window.MCPServiceConnectors.getAvailableServices();
                        const shodan = services.find(s => s.key === 'shodan');
                        return shodan ? {
                            toolCount: Object.keys(shodan.tools || {}).length,
                            toolNames: Object.keys(shodan.tools || {}),
                            hasHostInfo: !!shodan.tools?.shodan_host_info,
                            hasSearch: !!shodan.tools?.shodan_search,
                            hasDNS: !!shodan.tools?.shodan_dns_resolve,
                            sampleTool: shodan.tools?.shodan_host_info
                        } : null;
                    }
                    return null;
                } catch (e) {
                    return { error: e.message };
                }
            }
        """)

        assert tools_config is not None, "Should get tools configuration"
        assert not tools_config.get('error'), f"Error: {tools_config.get('error')}"
        assert tools_config['toolCount'] > 10, f"Should have comprehensive tool coverage, got {tools_config['toolCount']}"
        assert tools_config['hasHostInfo'], "Should have host info tool"
        assert tools_config['hasSearch'], "Should have search tool" 
        assert tools_config['hasDNS'], "Should have DNS tools"

        # Check sample tool structure
        sample_tool = tools_config['sampleTool']
        assert sample_tool is not None, "Sample tool should exist"
        assert 'description' in sample_tool, "Tool should have description"
        assert 'parameters' in sample_tool, "Tool should have parameters"

        screenshot_with_markdown(page, "shodan_tools_config", {
            "Status": "✅ Tools configured",
            "Tool Count": str(tools_config['toolCount']),
            "Has Host Info": str(tools_config['hasHostInfo']),
            "Has Search": str(tools_config['hasSearch']),
            "Has DNS": str(tools_config['hasDNS'])
        })

    def test_shodan_quick_connectors_config(self, page: Page, serve_hacka_re):
        """Test Shodan quick connectors configuration"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)

        # Check quick connectors configuration
        quick_config = page.evaluate("""
            () => {
                try {
                    if (window.MCPQuickConnectors && window.MCPQuickConnectors.QUICK_CONNECTORS) {
                        const shodan = window.MCPQuickConnectors.QUICK_CONNECTORS.shodan;
                        return shodan ? {
                            name: shodan.name,
                            icon: shodan.icon,
                            iconType: shodan.iconType,
                            authType: shodan.authType,
                            description: shodan.description
                        } : null;
                    }
                    return null;
                } catch (e) {
                    return { error: e.message };
                }
            }
        """)

        assert quick_config is not None, "Shodan should be in quick connectors"
        assert not quick_config.get('error'), f"Error: {quick_config.get('error')}"
        assert quick_config['name'] == 'Shodan'
        assert quick_config['iconType'] == 'svg'
        assert quick_config['icon'] == 'images/shodan-icon.svg'
        assert quick_config['authType'] == 'api-key'

        screenshot_with_markdown(page, "shodan_quick_connectors", {
            "Status": "✅ Quick connectors configured",
            "Icon Type": quick_config['iconType'],
            "Icon Path": quick_config['icon'],
            "Auth Type": quick_config['authType']
        })

    def test_shodan_svg_icon_exists(self, page: Page, serve_hacka_re):
        """Test Shodan SVG icon file exists and is valid"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)

        # Check SVG icon
        svg_check = page.evaluate("""
            async () => {
                try {
                    const response = await fetch('images/shodan-icon.svg');
                    const content = await response.text();
                    return {
                        status: response.status,
                        exists: response.ok,
                        isSvg: content.includes('<svg') && content.includes('</svg>'),
                        hasCircles: content.includes('<circle'),
                        contentLength: content.length
                    };
                } catch (e) {
                    return { error: e.message };
                }
            }
        """)

        assert not svg_check.get('error'), f"Error checking SVG: {svg_check.get('error')}"
        assert svg_check['exists'], "SVG icon should exist"
        assert svg_check['status'] == 200, f"SVG should load successfully, got status {svg_check['status']}"
        assert svg_check['isSvg'], "Content should be valid SVG"
        assert svg_check['hasCircles'], "SVG should contain circles (Shodan bubbles)"
        assert svg_check['contentLength'] > 100, "SVG should have substantial content"

        screenshot_with_markdown(page, "shodan_svg_icon", {
            "Status": "✅ SVG icon valid",
            "File Status": str(svg_check['status']),
            "Is SVG": str(svg_check['isSvg']),
            "Has Circles": str(svg_check['hasCircles']),
            "Content Length": str(svg_check['contentLength'])
        })

    def test_shodan_error_handling_methods(self, page: Page, serve_hacka_re):
        """Test Shodan error handling methods exist"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)

        # Check error handling methods
        methods_check = page.evaluate("""
            () => {
                try {
                    const connector = window.MCPServiceConnectors;
                    if (!connector) return { error: "MCPServiceConnectors not found" };
                    
                    return {
                        hasExecuteShodanTool: typeof connector.executeShodanTool === 'function',
                        hasValidateShodanAPIKey: typeof connector.validateShodanAPIKey === 'function',
                        hasConnectWithAPIKey: typeof connector.connectWithAPIKey === 'function',
                        hasFormatShodanResponse: typeof connector.formatShodanResponse === 'function'
                    };
                } catch (e) {
                    return { error: e.message };
                }
            }
        """)

        assert not methods_check.get('error'), f"Error checking methods: {methods_check.get('error')}"
        assert methods_check['hasExecuteShodanTool'], "Should have executeShodanTool method"
        assert methods_check['hasValidateShodanAPIKey'], "Should have validateShodanAPIKey method"
        assert methods_check['hasConnectWithAPIKey'], "Should have connectWithAPIKey method"
        assert methods_check['hasFormatShodanResponse'], "Should have formatShodanResponse method"

        screenshot_with_markdown(page, "shodan_methods", {
            "Status": "✅ Error handling methods exist",
            "Execute Tool": str(methods_check['hasExecuteShodanTool']),
            "Validate Key": str(methods_check['hasValidateShodanAPIKey']),
            "Connect API": str(methods_check['hasConnectWithAPIKey']),
            "Format Response": str(methods_check['hasFormatShodanResponse'])
        })

    def test_shodan_integration_completeness(self, page: Page, serve_hacka_re):
        """Test overall Shodan integration completeness"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)

        # Comprehensive completeness check
        completeness = page.evaluate("""
            () => {
                try {
                    const results = {
                        serviceConnectors: !!window.MCPServiceConnectors,
                        quickConnectors: !!window.MCPQuickConnectors,
                        shodanInService: false,
                        shodanInQuick: false,
                        toolCount: 0,
                        authType: null,
                        iconConfig: null
                    };
                    
                    // Check service connectors
                    if (window.MCPServiceConnectors && window.MCPServiceConnectors.getAvailableServices) {
                        const services = window.MCPServiceConnectors.getAvailableServices();
                        const shodan = services.find(s => s.key === 'shodan');
                        if (shodan) {
                            results.shodanInService = true;
                            results.toolCount = Object.keys(shodan.tools || {}).length;
                            results.authType = shodan.authType;
                        }
                    }
                    
                    // Check quick connectors
                    if (window.MCPQuickConnectors && window.MCPQuickConnectors.QUICK_CONNECTORS) {
                        const shodan = window.MCPQuickConnectors.QUICK_CONNECTORS.shodan;
                        if (shodan) {
                            results.shodanInQuick = true;
                            results.iconConfig = {
                                type: shodan.iconType,
                                path: shodan.icon
                            };
                        }
                    }
                    
                    return results;
                } catch (e) {
                    return { error: e.message };
                }
            }
        """)

        assert not completeness.get('error'), f"Error in completeness check: {completeness.get('error')}"
        
        # Verify all components
        assert completeness['serviceConnectors'], "MCPServiceConnectors should be available"
        assert completeness['quickConnectors'], "MCPQuickConnectors should be available"
        assert completeness['shodanInService'], "Shodan should be in service connectors"
        assert completeness['shodanInQuick'], "Shodan should be in quick connectors"
        assert completeness['authType'] == 'api-key', "Should use API key authentication"
        assert completeness['toolCount'] > 10, f"Should have comprehensive tool coverage, got {completeness['toolCount']}"
        assert completeness['iconConfig']['type'] == 'svg', "Should use SVG icon"
        assert completeness['iconConfig']['path'] == 'images/shodan-icon.svg', "Should use correct icon path"

        screenshot_with_markdown(page, "shodan_integration_complete", {
            "Status": "✅ Integration complete",
            "Service Connectors": "✅",
            "Quick Connectors": "✅",
            "Shodan In Service": "✅",
            "Shodan In Quick": "✅",
            "Tool Count": str(completeness['toolCount']),
            "Auth Type": completeness['authType'],
            "Icon Type": completeness['iconConfig']['type']
        })


if __name__ == "__main__":
    pytest.main([__file__])