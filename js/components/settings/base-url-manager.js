/**
 * Base URL Manager Module
 * Handles base URL and provider-related functionality for the AIHackare application
 */

window.BaseUrlManager = (function() {
    /**
     * Create a Base URL Manager instance
     * @param {Object} elements - DOM elements
     * @returns {Object} Base URL Manager instance
     */
    function createBaseUrlManager(elements) {
        // Base URL state
        let baseUrl = null;
        
        /**
         * Initialize the base URL manager
         */
        function init() {
            // Load saved base URL and provider
            baseUrl = StorageService.getBaseUrl();
            const baseUrlProvider = StorageService.getBaseUrlProvider();
            
            // Set the provider dropdown
            if (elements.baseUrlSelect) {
                elements.baseUrlSelect.value = baseUrlProvider;
                
                // Show/hide custom URL field based on selection
                if (baseUrlProvider === 'custom') {
                    elements.customBaseUrlGroup.style.display = 'block';
                    if (elements.baseUrl) {
                        elements.baseUrl.value = baseUrl;
                    }
                } else {
                    elements.customBaseUrlGroup.style.display = 'none';
                }
                
                // Add event listener for provider change
                elements.baseUrlSelect.addEventListener('change', function() {
                    const selectedProvider = this.value;
                    
                    // Handle custom URL field visibility
                    if (selectedProvider === 'custom') {
                        // Show custom URL field
                        elements.customBaseUrlGroup.style.display = 'block';
                    } else {
                        // Hide custom URL field and set to default URL for the provider
                        elements.customBaseUrlGroup.style.display = 'none';
                        const defaultUrl = StorageService.getDefaultBaseUrlForProvider(selectedProvider);
                        if (elements.baseUrl) {
                            elements.baseUrl.value = defaultUrl;
                        }
                    }
                    
                    // Handle Azure OpenAI settings visibility
                    if (selectedProvider === 'azure-openai') {
                        // Show Azure OpenAI settings
                        if (elements.azureSettingsGroup) {
                            elements.azureSettingsGroup.style.display = 'block';
                            
                            // Load saved Azure settings
                            if (elements.azureApiBase) {
                                elements.azureApiBase.value = StorageService.getAzureApiBase() || '';
                            }
                            if (elements.azureApiVersion) {
                                elements.azureApiVersion.value = StorageService.getAzureApiVersion() || '2023-05-15';
                            }
                            if (elements.azureDeploymentName) {
                                elements.azureDeploymentName.value = StorageService.getAzureDeploymentName() || '';
                            }
                        }
                    } else {
                        // Hide Azure OpenAI settings
                        if (elements.azureSettingsGroup) {
                            elements.azureSettingsGroup.style.display = 'none';
                        }
                    }
                });
            }
        }
        
        /**
         * Get the current base URL
         * @returns {string} Current base URL
         */
        function getBaseUrl() {
            // Always get the base URL from storage to ensure we have the latest value
            // This is especially important when the namespace changes due to title/subtitle changes
            return StorageService.getBaseUrl();
        }
        
        /**
         * Save the base URL and provider
         * @param {string} url - The base URL to save
         * @param {string} provider - The provider to save
         */
        function saveBaseUrl(url, provider) {
            StorageService.saveBaseUrl(url);
            StorageService.saveBaseUrlProvider(provider);
            baseUrl = url;
        }
        
        /**
         * Get the current base URL provider
         * @returns {string} Current base URL provider
         */
        function getBaseUrlProvider() {
            return StorageService.getBaseUrlProvider();
        }
        
        /**
         * Get the default base URL for a provider
         * @param {string} provider - The provider identifier
         * @returns {string} The default base URL for the provider
         */
        function getDefaultBaseUrlForProvider(provider) {
            return StorageService.getDefaultBaseUrlForProvider(provider);
        }
        
        /**
         * Determine the base URL based on the selected provider
         * @param {string} selectedProvider - The selected provider
         * @param {string} customUrl - The custom URL (if provider is 'custom')
         * @returns {string} The base URL to use
         */
        function determineBaseUrl(selectedProvider, customUrl) {
            if (selectedProvider === 'custom') {
                return customUrl.trim();
            } else if (selectedProvider === 'azure-openai') {
                // For Azure OpenAI, we need to store the API base URL as is
                // The actual endpoint URL will be constructed in the ApiService
                // based on the API base, API version, and deployment name
                return customUrl.trim();
            } else {
                return StorageService.getDefaultBaseUrlForProvider(selectedProvider);
            }
        }
        
        // Public API
        return {
            init,
            getBaseUrl,
            saveBaseUrl,
            getBaseUrlProvider,
            getDefaultBaseUrlForProvider,
            determineBaseUrl
        };
    }

    // Public API
    return {
        createBaseUrlManager
    };
})();
