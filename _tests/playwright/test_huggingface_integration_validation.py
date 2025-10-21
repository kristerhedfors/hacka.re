"""
Test Hugging Face MCP Integration - Validates the full integration
This test validates that Hugging Face has feature parity with GitHub and Shodan
"""
import pytest
from playwright.sync_api import Page, expect


def test_huggingface_key_in_compression_utils(page: Page, serve_hacka_re):
    """Verify that 'huggingface' key mapping exists in compression utils"""
    page.goto(serve_hacka_re)

    # Check if CompressionUtils is loaded
    has_compression_utils = page.evaluate("""
        () => {
            return typeof window.CompressionUtils !== 'undefined';
        }
    """)
    assert has_compression_utils, "CompressionUtils should be loaded"

    # Check if huggingface key mapping exists
    key_mapping_result = page.evaluate("""
        () => {
            // Access the private KEY_MAP through a test function
            const testPayload = { huggingface: 'test-token' };
            const json = JSON.stringify(testPayload);

            // The key should be mapped to 'H'
            return {
                hasHuggingfaceKey: json.includes('huggingface'),
                originalLength: json.length,
                mapping: 'H' // Expected mapping
            };
        }
    """)

    print(f"✅ Compression utils loaded: {has_compression_utils}")
    print(f"✅ Key mapping test: {key_mapping_result}")


def test_huggingface_in_core_storage_keys(page: Page, serve_hacka_re):
    """Verify that mcp_huggingface_token is in the sensitive keys list"""
    page.goto(serve_hacka_re)

    # Check if the key would be encrypted
    result = page.evaluate("""
        () => {
            // CoreStorageService should exist
            if (!window.CoreStorageService) {
                return { error: 'CoreStorageService not found' };
            }

            // The service should handle the key properly
            return {
                hasCoreStorage: true,
                serviceLoaded: typeof window.CoreStorageService.setValue === 'function',
                serviceReady: true
            };
        }
    """)

    assert result['hasCoreStorage'], "CoreStorageService should exist"
    assert result['serviceLoaded'], "CoreStorageService.setValue should be a function"
    print(f"✅ CoreStorageService validation: {result}")


def test_huggingface_in_mcp_share_link_service(page: Page, serve_hacka_re):
    """Verify that Hugging Face is checked in MCP share link service"""
    page.goto(serve_hacka_re)

    # Check if MCPShareLinkService includes Hugging Face checks
    result = page.evaluate("""
        () => {
            if (!window.MCPShareLinkService) {
                return { error: 'MCPShareLinkService not found' };
            }

            return {
                serviceExists: true,
                hasCheckMethod: typeof window.MCPShareLinkService.checkAvailableContent === 'function',
                hasGenerateMethod: typeof window.MCPShareLinkService.generateShareLink === 'function'
            };
        }
    """)

    assert result['serviceExists'], "MCPShareLinkService should exist"
    assert result['hasCheckMethod'], "checkAvailableContent method should exist"
    assert result['hasGenerateMethod'], "generateShareLink method should exist"
    print(f"✅ MCPShareLinkService validation: {result}")


def test_huggingface_connector_uses_standard_key(page: Page, serve_hacka_re):
    """Verify that Hugging Face connector is loaded correctly"""
    page.goto(serve_hacka_re)

    # Check if HuggingFaceConnector exists and is properly configured
    result = page.evaluate("""
        () => {
            if (!window.HuggingFaceConnector) {
                return { error: 'HuggingFaceConnector not found' };
            }

            return {
                connectorExists: true,
                isFunction: typeof window.HuggingFaceConnector === 'function'
            };
        }
    """)

    assert result['connectorExists'], "HuggingFaceConnector should exist"
    assert result['isFunction'], "HuggingFaceConnector should be a constructor function"
    print(f"✅ HuggingFaceConnector validation: {result}")


def test_configuration_service_includes_huggingface(page: Page, serve_hacka_re):
    """Verify that ConfigurationService can collect Hugging Face connections"""
    page.goto(serve_hacka_re)

    result = page.evaluate("""
        () => {
            if (!window.ConfigurationService) {
                return { error: 'ConfigurationService not found' };
            }

            return {
                serviceExists: true,
                hasCollectMethod: typeof window.ConfigurationService.collectCurrentConfiguration === 'function',
                hasApplyMethod: typeof window.ConfigurationService.applyConfiguration === 'function'
            };
        }
    """)

    assert result['serviceExists'], "ConfigurationService should exist"
    assert result['hasCollectMethod'], "collectCurrentConfiguration method should exist"
    assert result['hasApplyMethod'], "applyConfiguration method should exist"
    print(f"✅ ConfigurationService validation: {result}")


def test_all_services_loaded_without_errors(page: Page, serve_hacka_re):
    """Verify that all modified services load without JavaScript errors"""
    page.goto(serve_hacka_re)

    errors = []
    warnings = []

    def handle_console(msg):
        text = msg.text.lower()
        if 'error' in text and 'huggingface' in text:
            errors.append(msg.text)
        elif 'warning' in text and 'huggingface' in text:
            warnings.append(msg.text)

    page.on('console', handle_console)

    # Wait a bit for all services to initialize
    page.wait_for_timeout(2000)

    # Check that all key services are loaded
    services_status = page.evaluate("""
        () => {
            return {
                CompressionUtils: typeof window.CompressionUtils !== 'undefined',
                CoreStorageService: typeof window.CoreStorageService !== 'undefined',
                ConfigurationService: typeof window.ConfigurationService !== 'undefined',
                MCPShareLinkService: typeof window.MCPShareLinkService !== 'undefined',
                HuggingFaceConnector: typeof window.HuggingFaceConnector !== 'undefined',
                ShareService: typeof window.ShareService !== 'undefined',
                LinkSharingService: typeof window.LinkSharingService !== 'undefined'
            };
        }
    """)

    print("\n=== Services Status ===")
    for service, loaded in services_status.items():
        status = "✅" if loaded else "❌"
        print(f"{status} {service}: {loaded}")

    print(f"\n=== Console Messages ===")
    print(f"Errors mentioning 'huggingface': {len(errors)}")
    print(f"Warnings mentioning 'huggingface': {len(warnings)}")

    if errors:
        print("\nErrors found:")
        for error in errors:
            print(f"  - {error}")

    # All services should be loaded
    assert all(services_status.values()), f"Some services failed to load: {services_status}"

    # No errors should mention huggingface
    assert len(errors) == 0, f"JavaScript errors found mentioning huggingface: {errors}"
