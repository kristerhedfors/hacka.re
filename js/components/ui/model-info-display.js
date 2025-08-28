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
                } else if (modelId.includes('mistral') || modelId.includes('mixtral') || modelId.includes('magistral') || modelId.includes('devstral')) {
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
                } else if (modelId.includes('mai-ds')) {
                    provider = 'DeepSeek and Microsoft AI';
                } else {
                    // If no specific model pattern is matched, determine by base URL
                    const baseUrl = StorageService.getBaseUrl();
                    if (baseUrl) {
                        if (baseUrl.includes('groq.com')) {
                            provider = '🇸🇦 Groq';
                        } else if (baseUrl.includes('berget.ai')) {
                            provider = '🇸🇪 Berget.AI';
                        } else if (baseUrl.includes('openai.com')) {
                            provider = '🇺🇸 OpenAI';
                        } else if (baseUrl.includes('localhost:11434')) {
                            provider = 'Ollama';
                        }
                    }
                }
            }
            
            return provider;
        }
        
        /**
         * Update provider element inline with model name
         * @param {string} provider - Provider name
         */
        function updateProviderDisplay(provider) {
            if (elements.modelNameDisplay) {
                // Check if provider span already exists
                let providerSpan = elements.modelNameDisplay.querySelector('.model-provider-inline');
                
                // If not, create it
                if (!providerSpan) {
                    providerSpan = document.createElement('span');
                    providerSpan.className = 'model-provider-inline';
                    providerSpan.style.fontSize = '0.85rem';
                    providerSpan.style.opacity = '0.9';
                    providerSpan.style.marginLeft = '0.5rem';
                    
                    // Ensure we have a space before the provider span
                    const lastChild = elements.modelNameDisplay.lastChild;
                    if (lastChild && lastChild.nodeType === Node.TEXT_NODE) {
                        const text = lastChild.textContent;
                        if (!text.endsWith(' ')) {
                            lastChild.textContent = text + ' ';
                        }
                    }
                    
                    elements.modelNameDisplay.appendChild(providerSpan);
                }
                
                // Update the provider text
                providerSpan.textContent = 'by ' + provider;
            }
            
            // Remove any existing provider element from model stats
            if (elements.modelStats) {
                const existingProviderElement = elements.modelStats.querySelector('.model-provider');
                if (existingProviderElement) {
                    existingProviderElement.remove();
                }
            }
        }
        
        /**
         * Update the model info display in the header
         * @param {string} currentModel - Current model ID
         */
        function updateModelInfoDisplay(currentModel) {
            if (!currentModel) {
                // Don't clear existing model display unless explicitly requested
                // This prevents other code from accidentally clearing a valid model
                return;
            }
            
            // Get a simplified display name for the model
            const displayName = ModelInfoService.getDisplayName(currentModel);
            
            // Update model name display with flag
            if (elements.modelNameDisplay) {
                // Safeguard: Don't update if displayName is just a number
                if (!/^\d+$/.test(displayName)) {
                    // Clear any existing content first
                    elements.modelNameDisplay.innerHTML = '';
                    
                    // Get the flag for this model
                    const flag = window.ModelCountryMapping ? window.ModelCountryMapping.getModelFlag(currentModel) : '';
                    
                    if (flag) {
                        // Create a span for the flag with special styling
                        const flagSpan = document.createElement('span');
                        flagSpan.className = 'model-flag-prefix';
                        flagSpan.textContent = flag + ' ';
                        elements.modelNameDisplay.appendChild(flagSpan);
                        
                        // Add the model name as text
                        const modelText = document.createTextNode(displayName);
                        elements.modelNameDisplay.appendChild(modelText);
                    } else {
                        // No flag, just set the text
                        elements.modelNameDisplay.textContent = displayName;
                    }
                }
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
                
                // Update model name display with flag
                if (elements.modelNameDisplay) {
                    // Safeguard: Don't update if displayName is just a number
                    if (!/^\d+$/.test(displayName)) {
                        // Check if we have a provider span
                        const providerSpan = elements.modelNameDisplay.querySelector('.model-provider-inline');
                        
                        // Get the flag for this model
                        const flag = window.ModelCountryMapping ? window.ModelCountryMapping.getModelFlag(currentModel) : '';
                        
                        // Clear and rebuild the display
                        if (providerSpan) {
                            // Remove provider span temporarily
                            providerSpan.remove();
                        }
                        
                        // Clear content
                        elements.modelNameDisplay.innerHTML = '';
                        
                        if (flag) {
                            // Add flag span
                            const flagSpan = document.createElement('span');
                            flagSpan.className = 'model-flag-prefix';
                            flagSpan.textContent = flag + ' ';
                            elements.modelNameDisplay.appendChild(flagSpan);
                        }
                        
                        // Add model name
                        const modelText = document.createTextNode(displayName);
                        elements.modelNameDisplay.appendChild(modelText);
                        
                        // Re-add provider span if it existed
                        if (providerSpan) {
                            elements.modelNameDisplay.appendChild(document.createTextNode(' '));
                            elements.modelNameDisplay.appendChild(providerSpan);
                        }
                        
                    }
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