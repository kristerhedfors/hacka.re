/**
 * Model Info Display Module
 * Handles model information display in the UI
 */

window.ModelInfoDisplay = (function() {
    /**
     * Create a Model Info Display instance
     * @param {Object} elements - DOM elements
     * @returns {Object} Model Info Display instance
     */
    function createModelInfoDisplay(elements) {
        /**
         * Determine the provider based on model ID and base URL
         * @param {string} modelId - Model ID
         * @returns {string} Provider name
         */
        function determineProvider(modelId) {
            let provider = 'Custom';
            
            if (typeof modelId === 'string') {
                if (modelId.includes('llama')) {
                    provider = 'Meta';
                } else if (modelId.includes('gemma')) {
                    provider = 'Google';
                } else if (modelId.includes('mistral') || modelId.includes('mixtral')) {
                    provider = 'Mistral AI';
                } else if (modelId.includes('claude')) {
                    provider = 'Anthropic';
                } else if (modelId.includes('gpt')) {
                    provider = 'OpenAI';
                } else if (modelId.includes('whisper')) {
                    provider = 'OpenAI';
                } else if (modelId.includes('allam')) {
                    provider = 'Aleph Alpha';
                } else if (modelId.includes('playai')) {
                    provider = 'PlayAI';
                } else if (modelId.includes('qwen')) {
                    provider = 'Alibaba';
                } else if (modelId.includes('deepseek')) {
                    provider = 'DeepSeek';
                } else {
                    // If no specific model pattern is matched, determine by base URL
                    const baseUrl = StorageService.getBaseUrl();
                    if (baseUrl) {
                        if (baseUrl.includes('groq.com')) {
                            provider = 'Groq';
                        } else if (baseUrl.includes('openai.com')) {
                            provider = 'OpenAI';
                        } else if (baseUrl.includes('localhost:11434')) {
                            provider = 'Ollama';
                        }
                    }
                }
            }
            
            return provider;
        }
        
        /**
         * Update provider element in model stats
         * @param {string} provider - Provider name
         */
        function updateProviderDisplay(provider) {
            if (elements.modelStats) {
                // Check if provider element already exists
                let providerElement = elements.modelStats.querySelector('.model-provider');
                
                // If not, create it
                if (!providerElement) {
                    providerElement = document.createElement('span');
                    providerElement.className = 'model-provider';
                    
                    // Insert at the beginning of model stats
                    elements.modelStats.insertBefore(providerElement, elements.modelStats.firstChild);
                }
                
                // Update the provider text with "by" prefix
                providerElement.textContent = 'by ' + provider;
            }
        }
        
        /**
         * Update the model info display in the header
         * @param {string} currentModel - Current model ID
         */
        function updateModelInfoDisplay(currentModel) {
            if (!currentModel) {
                // Clear all fields if no model is selected
                if (elements.modelNameDisplay) {
                    elements.modelNameDisplay.textContent = '';
                }
                if (elements.modelContextElement) {
                    elements.modelContextElement.textContent = '';
                }
                return;
            }
            
            // Get a simplified display name for the model
            const displayName = ModelInfoService.getDisplayName(currentModel);
            
            // Update model name display
            if (elements.modelNameDisplay) {
                elements.modelNameDisplay.textContent = displayName;
            }
            
            // Determine and update provider
            const provider = determineProvider(currentModel);
            updateProviderDisplay(provider);
            
            if (elements.modelContextElement) {
                // Set initial content to make the element visible
                elements.modelContextElement.textContent = '0 tokens';
            }
        }
        
        /**
         * Refresh the model display (called during context updates)
         * @param {string} currentModel - Current model ID
         */
        function refreshModelDisplay(currentModel) {
            if (currentModel) {
                // Get a simplified display name for the model
                const displayName = ModelInfoService.getDisplayName(currentModel);
                
                // Update model name display
                if (elements.modelNameDisplay) {
                    elements.modelNameDisplay.textContent = displayName;
                }
                
                // Determine and update provider
                const provider = determineProvider(currentModel);
                updateProviderDisplay(provider);
            }
        }
        
        // Public API
        return {
            updateModelInfoDisplay,
            refreshModelDisplay
        };
    }
    
    // Public API
    return {
        createModelInfoDisplay: createModelInfoDisplay
    };
})();