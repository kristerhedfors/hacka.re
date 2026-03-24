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
            baseUrl = DataService.getBaseUrl();
            const baseUrlProvider = DataService.getBaseUrlProvider();
            
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
                    
                    // Reset model manager state when switching providers to avoid model confusion
                    // Access through global window object if available
                    if (window.aiHackare && window.aiHackare.settingsManager && 
                        window.aiHackare.settingsManager.modelManager && 
                        window.aiHackare.settingsManager.modelManager.resetMemoryState) {
                        window.aiHackare.settingsManager.modelManager.resetMemoryState();
                        console.log('Provider changed - resetting model manager state');
                    }
                    
                    // Save the provider selection immediately
                    const newBaseUrl = selectedProvider === 'custom' 
                        ? (elements.baseUrl ? elements.baseUrl.value : '') 
                        : DataService.getDefaultBaseUrlForProvider(selectedProvider);
                    saveBaseUrl(newBaseUrl, selectedProvider);
                    
                    // Disable RAG for non-OpenAI providers (only OpenAI has embeddings API)
                    if (selectedProvider !== 'openai') {
                        const ragEnabledCheckbox = document.getElementById('rag-enabled-checkbox');
                        if (ragEnabledCheckbox && ragEnabledCheckbox.checked) {
                            ragEnabledCheckbox.checked = false;
                            ragEnabledCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
                            console.log('RAG disabled - only available with OpenAI provider');
                        }
                        // Disable the checkbox to prevent enabling
                        if (ragEnabledCheckbox) {
                            ragEnabledCheckbox.disabled = true;
                            ragEnabledCheckbox.title = 'RAG is only available with OpenAI provider';
                        }
                    } else {
                        // Re-enable the checkbox for OpenAI
                        const ragEnabledCheckbox = document.getElementById('rag-enabled-checkbox');
                        if (ragEnabledCheckbox) {
                            ragEnabledCheckbox.disabled = false;
                            ragEnabledCheckbox.title = '';
                        }
                    }
                    
                    // Handle custom URL field visibility
                    if (selectedProvider === 'custom') {
                        // Show custom URL field
                        elements.customBaseUrlGroup.style.display = 'block';
                    } else {
                        // Hide custom URL field and set to default URL for the provider
                        elements.customBaseUrlGroup.style.display = 'none';
                        const defaultUrl = DataService.getDefaultBaseUrlForProvider(selectedProvider);
                        if (elements.baseUrl) {
                            elements.baseUrl.value = defaultUrl;
                        }
                    }
                    
                    // Handle special case for llamafile - auto-set API key to "no-key"
                    if (selectedProvider === 'llamafile' && elements.apiKeyUpdate) {
                        elements.apiKeyUpdate.value = 'no-key';
                    }
                    
                    // Show model dropdown and reload button for all providers
                    if (elements.modelSelect && elements.modelSelect.parentNode) {
                        elements.modelSelect.parentNode.style.display = 'flex';
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
            return DataService.getBaseUrl();
        }
        
        /**
         * Save the base URL and provider
         * @param {string} url - The base URL to save
         * @param {string} provider - The provider to save
         */
        function saveBaseUrl(url, provider) {
            DataService.saveBaseUrl(url);
            DataService.saveBaseUrlProvider(provider);
            baseUrl = url;
        }
        
        /**
         * Get the current base URL provider
         * @returns {string} Current base URL provider
         */
        function getBaseUrlProvider() {
            return DataService.getBaseUrlProvider();
        }
        
        /**
         * Get the default base URL for a provider
         * @param {string} provider - The provider identifier
         * @returns {string} The default base URL for the provider
         */
        function getDefaultBaseUrlForProvider(provider) {
            return DataService.getDefaultBaseUrlForProvider(provider);
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
            } else {
                return DataService.getDefaultBaseUrlForProvider(selectedProvider);
            }
        }

        /**
         * Update provider from API key detection
         * @param {Object} detection - The detection result object
         */
        function updateProviderFromDetection(detection) {
            if (!detection || !detection.provider) return;
            
            var detectedProvider = detection.provider;
            
            // Map detection results to provider values
            var providerMapping = {
                'openai': 'openai',
                'groq': 'groq',
                'berget': 'berget'
            };

            var mappedProvider = providerMapping[detectedProvider];
            if (!mappedProvider) return;

            // Always save the base URL and provider when detected
            var newBaseUrl = DataService.getDefaultBaseUrlForProvider(mappedProvider);
            saveBaseUrl(newBaseUrl, mappedProvider);
            
            // Disable RAG for non-OpenAI providers (only OpenAI has embeddings API)
            if (mappedProvider !== 'openai') {
                const ragEnabledCheckbox = document.getElementById('rag-enabled-checkbox');
                if (ragEnabledCheckbox && ragEnabledCheckbox.checked) {
                    ragEnabledCheckbox.checked = false;
                    ragEnabledCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
                    console.log('RAG disabled - only available with OpenAI provider');
                }
                // Disable the checkbox to prevent enabling
                if (ragEnabledCheckbox) {
                    ragEnabledCheckbox.disabled = true;
                    ragEnabledCheckbox.title = 'RAG is only available with OpenAI provider';
                }
            } else {
                // Re-enable the checkbox for OpenAI
                const ragEnabledCheckbox = document.getElementById('rag-enabled-checkbox');
                if (ragEnabledCheckbox) {
                    ragEnabledCheckbox.disabled = false;
                    ragEnabledCheckbox.title = '';
                }
            }
            
            // Update the UI if the dropdown exists (in settings modal)
            if (elements.baseUrlSelect && elements.baseUrlSelect.value !== mappedProvider) {
                // Update the provider dropdown
                elements.baseUrlSelect.value = mappedProvider;
                
                // Trigger the change event to update the UI properly
                var changeEvent;
                if (typeof Event === 'function') {
                    changeEvent = new Event('change', { bubbles: true });
                } else {
                    // IE11 fallback
                    changeEvent = document.createEvent('Event');
                    changeEvent.initEvent('change', true, true);
                }
                elements.baseUrlSelect.dispatchEvent(changeEvent);
            }
            
            // Return the default model if available
            return detection.defaultModel;
        }
        
        // Public API
        return {
            init,
            getBaseUrl,
            saveBaseUrl,
            getBaseUrlProvider,
            getDefaultBaseUrlForProvider,
            determineBaseUrl,
            updateProviderFromDetection
        };
    }

    // Public API
    return {
        createBaseUrlManager
    };
})();
