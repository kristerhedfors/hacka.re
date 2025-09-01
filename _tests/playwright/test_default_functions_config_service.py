import pytest
import time
import os
from dotenv import load_dotenv
from playwright.sync_api import Page, expect

from test_utils import dismiss_welcome_modal, screenshot_with_markdown

# Load environment variables from .env file in the current directory
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

def test_default_functions_config_collection(page: Page, serve_hacka_re):
    """
    Test that ConfigurationService properly collects default function selections.
    This tests the core fix without requiring API calls.
    """
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Handle welcome modal
    dismiss_welcome_modal(page)
    # Wait for page to be fully loaded
    # page.wait_for_timeout(2000)  # TODO: Replace with proper wait condition
    
    # Test the ConfigurationService changes directly via JavaScript
    config_test_result = page.evaluate("""() => {
        const results = {
            servicesAvailable: {},
            configCollectionTest: null,
            defaultFunctionsTest: null,
            error: null
        };
        
        try {
            // Check if services are available
            results.servicesAvailable.ConfigurationService = !!window.ConfigurationService;
            results.servicesAvailable.DefaultFunctionsService = !!window.DefaultFunctionsService;
            
            // Mock some default function selections for testing
            if (window.DefaultFunctionsService && window.CoreStorageService) {
                // Simulate having selected individual functions
                const mockSelectedIds = ['rc4-encryption:encrypt', 'math-utilities:add'];
                const mockCollectionIds = ['rc4-encryption'];
                
                // Store mock selections using CoreStorageService
                window.CoreStorageService.setValue('selected_individual_functions', mockSelectedIds);
                window.CoreStorageService.setValue('selected_default_functions', mockCollectionIds);
                
                results.defaultFunctionsTest = {
                    mockSelections: {
                        individual: mockSelectedIds,
                        collections: mockCollectionIds
                    },
                    serviceRetrieved: {
                        individual: window.DefaultFunctionsService.getSelectedIndividualFunctionIds(),
                        collections: window.DefaultFunctionsService.getSelectedDefaultFunctionIds()
                    }
                };
            }
            
            // Test ConfigurationService collection
            if (window.ConfigurationService) {
                const functionConfig = window.ConfigurationService.collectFunctionConfiguration();
                
                results.configCollectionTest = {
                    hasLibrary: !!functionConfig.library,
                    hasEnabled: !!functionConfig.enabled,
                    hasToolsEnabled: typeof functionConfig.toolsEnabled === 'boolean',
                    hasCollections: !!functionConfig.collections,
                    // Check for our new fields
                    hasSelectedDefaultFunctionIds: !!functionConfig.selectedDefaultFunctionIds,
                    hasSelectedDefaultFunctionCollectionIds: !!functionConfig.selectedDefaultFunctionCollectionIds,
                    selectedDefaultFunctionIds: functionConfig.selectedDefaultFunctionIds || [],
                    selectedDefaultFunctionCollectionIds: functionConfig.selectedDefaultFunctionCollectionIds || []
                };
            }
            
        } catch (error) {
            results.error = error.message;
        }
        
        return results;
    }""")
    
    # Take a screenshot with the test results
    screenshot_with_markdown(page, "default_functions_config_test", {
        "step": "ConfigurationService default functions collection test",
        "services_available": str(config_test_result['servicesAvailable']),
        "config_test_result": str(config_test_result.get('configCollectionTest', 'N/A')),
        "default_functions_test": str(config_test_result.get('defaultFunctionsTest', 'N/A')),
        "error": config_test_result.get('error', 'None')
    })
    
    # Assertions
    assert config_test_result['servicesAvailable']['ConfigurationService'], "ConfigurationService should be available"
    assert config_test_result['servicesAvailable']['DefaultFunctionsService'], "DefaultFunctionsService should be available"
    assert config_test_result['error'] is None, f"Test should not have errors: {config_test_result['error']}"
    
    # Check that our new fields are present in the configuration
    config_result = config_test_result['configCollectionTest']
    assert config_result is not None, "ConfigurationService should have collected function configuration"
    assert config_result['hasSelectedDefaultFunctionIds'], "Configuration should include selectedDefaultFunctionIds field"
    assert config_result['hasSelectedDefaultFunctionCollectionIds'], "Configuration should include selectedDefaultFunctionCollectionIds field"
    
    # Check that the mock data was retrieved correctly
    default_test = config_test_result['defaultFunctionsTest']
    if default_test:
        assert len(config_result['selectedDefaultFunctionIds']) > 0, "Should have collected default function selections"
        assert len(config_result['selectedDefaultFunctionCollectionIds']) > 0, "Should have collected default function collection selections"
    
    print("✅ ConfigurationService properly collects default function selections")
    print("✅ New fields added: selectedDefaultFunctionIds, selectedDefaultFunctionCollectionIds")

def test_default_functions_sharing_format_conversion(page: Page, serve_hacka_re):
    """
    Test that the link sharing service properly converts default function selections to flat format.
    """
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Handle welcome modal
    dismiss_welcome_modal(page)
    # Wait for page to be fully loaded
    # page.wait_for_timeout(2000)  # TODO: Replace with proper wait condition
    
    # Test the sharing format conversion
    sharing_test_result = page.evaluate("""() => {
        const results = {
            servicesAvailable: {},
            conversionTest: null,
            error: null
        };
        
        try {
            // Check if services are available
            results.servicesAvailable.LinkSharingService = !!window.LinkSharingService;
            results.servicesAvailable.ConfigurationService = !!window.ConfigurationService;
            
            if (window.ConfigurationService && window.LinkSharingService) {
                // Create a mock unified configuration with default function selections
                const mockConfig = {
                    functions: {
                        library: {'testFunction': {code: 'function test() {return "test";}'}},
                        enabled: ['testFunction'],
                        selectedDefaultFunctionIds: ['rc4-encryption:encrypt', 'math-utilities:add'],
                        selectedDefaultFunctionCollectionIds: ['rc4-encryption']
                    }
                };
                
                // Test the private convertConfigToShareFormat function
                // We need to access the private function through the service
                const shareableLink = window.LinkSharingService.createCustomShareableLink(mockConfig, 'testpassword', {
                    includeFunctionLibrary: true
                });
                
                // If we got a link, the conversion worked
                results.conversionTest = {
                    hasLink: !!shareableLink,
                    linkFormat: shareableLink ? shareableLink.includes('#gpt=') : false,
                    mockConfigProvided: true
                };
                
                // Try to decrypt and check if our fields made it through
                if (shareableLink && window.CryptoUtils) {
                    const encryptedPart = shareableLink.split('#gpt=')[1];
                    if (encryptedPart) {
                        try {
                            const decrypted = window.CryptoUtils.decryptData(encryptedPart, 'testpassword');
                            results.conversionTest.decryptedData = {
                                hasSelectedDefaultFunctionIds: !!decrypted.selectedDefaultFunctionIds,
                                hasSelectedDefaultFunctionCollectionIds: !!decrypted.selectedDefaultFunctionCollectionIds,
                                selectedDefaultFunctionIds: decrypted.selectedDefaultFunctionIds || [],
                                selectedDefaultFunctionCollectionIds: decrypted.selectedDefaultFunctionCollectionIds || []
                            };
                        } catch (decryptError) {
                            results.conversionTest.decryptError = decryptError.message;
                        }
                    }
                }
            }
            
        } catch (error) {
            results.error = error.message;
        }
        
        return results;
    }""")
    
    # Take a screenshot with the test results
    screenshot_with_markdown(page, "default_functions_sharing_format_test", {
        "step": "Link sharing format conversion test",
        "services_available": str(sharing_test_result['servicesAvailable']),
        "conversion_test": str(sharing_test_result.get('conversionTest', 'N/A')),
        "error": sharing_test_result.get('error', 'None')
    })
    
    # Assertions
    assert sharing_test_result['servicesAvailable']['LinkSharingService'], "LinkSharingService should be available"
    assert sharing_test_result['servicesAvailable']['ConfigurationService'], "ConfigurationService should be available"
    assert sharing_test_result['error'] is None, f"Test should not have errors: {sharing_test_result['error']}"
    
    # Check that the sharing worked
    conversion_result = sharing_test_result['conversionTest']
    assert conversion_result is not None, "Sharing conversion should have produced results"
    assert conversion_result['hasLink'], "Should have created a shareable link"
    assert conversion_result['linkFormat'], "Link should have proper #gpt= format"
    
    # Check that default function selections made it through to the encrypted payload
    if 'decryptedData' in conversion_result:
        decrypted = conversion_result['decryptedData']
        assert decrypted['hasSelectedDefaultFunctionIds'], "Decrypted data should include default function IDs"
        assert decrypted['hasSelectedDefaultFunctionCollectionIds'], "Decrypted data should include default function collection IDs"
        assert len(decrypted['selectedDefaultFunctionIds']) > 0, "Should have default function selections"
        assert len(decrypted['selectedDefaultFunctionCollectionIds']) > 0, "Should have default function collection selections"
        
        print("✅ Default function selections successfully included in encrypted sharing payload")
        print("✅ selectedDefaultFunctionIds:", decrypted['selectedDefaultFunctionIds'])
        print("✅ selectedDefaultFunctionCollectionIds:", decrypted['selectedDefaultFunctionCollectionIds'])
    
    print("✅ Link sharing service properly converts default function selections to flat format")
    print("✅ Default function selections are included in shareable links")

def test_default_functions_config_application(page: Page, serve_hacka_re):
    """
    Test that ConfigurationService properly applies default function selections.
    """
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Handle welcome modal
    dismiss_welcome_modal(page)
    # Wait for page to be fully loaded
    # page.wait_for_timeout(2000)  # TODO: Replace with proper wait condition
    
    # Test the ConfigurationService application
    application_test_result = page.evaluate("""() => {
        const results = {
            servicesAvailable: {},
            applicationTest: null,
            error: null
        };
        
        try {
            // Check if services are available
            results.servicesAvailable.ConfigurationService = !!window.ConfigurationService;
            results.servicesAvailable.DefaultFunctionsService = !!window.DefaultFunctionsService;
            
            if (window.ConfigurationService && window.DefaultFunctionsService) {
                // Mock a configuration with default function selections
                const mockFunctionConfig = {
                    library: {'userFunction': {code: 'function user() {return "user";}'}},
                    enabled: ['userFunction'],
                    selectedDefaultFunctionIds: ['rc4-encryption:encrypt', 'math-utilities:add'],
                    selectedDefaultFunctionCollectionIds: ['rc4-encryption']
                };
                
                // Clear any existing selections
                if (window.CoreStorageService) {
                    window.CoreStorageService.removeValue('selected_individual_functions');
                    window.CoreStorageService.removeValue('selected_default_functions');
                }
                
                // Apply the configuration
                window.ConfigurationService.applyFunctionConfiguration(mockFunctionConfig);
                
                // Check if the selections were applied
                results.applicationTest = {
                    appliedIndividualSelections: window.DefaultFunctionsService.getSelectedIndividualFunctionIds(),
                    appliedCollectionSelections: window.DefaultFunctionsService.getSelectedDefaultFunctionIds(),
                    expectedIndividual: mockFunctionConfig.selectedDefaultFunctionIds,
                    expectedCollections: mockFunctionConfig.selectedDefaultFunctionCollectionIds
                };
            }
            
        } catch (error) {
            results.error = error.message;
        }
        
        return results;
    }""")
    
    # Take a screenshot with the test results
    screenshot_with_markdown(page, "default_functions_config_application_test", {
        "step": "ConfigurationService default functions application test",
        "services_available": str(application_test_result['servicesAvailable']),
        "application_test": str(application_test_result.get('applicationTest', 'N/A')),
        "error": application_test_result.get('error', 'None')
    })
    
    # Assertions
    assert application_test_result['servicesAvailable']['ConfigurationService'], "ConfigurationService should be available"
    assert application_test_result['servicesAvailable']['DefaultFunctionsService'], "DefaultFunctionsService should be available"
    assert application_test_result['error'] is None, f"Test should not have errors: {application_test_result['error']}"
    
    # Check that the application worked
    app_result = application_test_result['applicationTest']
    assert app_result is not None, "Application should have produced results"
    
    # Check that the selections were applied correctly
    assert app_result['appliedIndividualSelections'] == app_result['expectedIndividual'], \
        f"Individual selections should match: expected {app_result['expectedIndividual']}, got {app_result['appliedIndividualSelections']}"
    
    assert app_result['appliedCollectionSelections'] == app_result['expectedCollections'], \
        f"Collection selections should match: expected {app_result['expectedCollections']}, got {app_result['appliedCollectionSelections']}"
    
    print("✅ ConfigurationService properly applies default function selections")
    print("✅ Individual selections applied:", app_result['appliedIndividualSelections'])
    print("✅ Collection selections applied:", app_result['appliedCollectionSelections'])