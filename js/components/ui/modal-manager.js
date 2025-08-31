/**
 * Modal Manager Module
 * Handles all modal show/hide functionality
 */

window.ModalManager = (function() {
    /**
     * Create a Modal Manager instance
     * @param {Object} elements - DOM elements
     * @returns {Object} Modal Manager instance
     */
    function createModalManager(elements) {
        /**
         * Show the API key modal
         */
        function showApiKeyModal() {
            elements.apiKeyModal.classList.add('active');
            elements.apiKeyInput.focus();
        }
        
        /**
         * Hide the API key modal
         */
        function hideApiKeyModal() {
            elements.apiKeyModal.classList.remove('active');
            
            // Focus the message input after modal closes
            setTimeout(() => {
                const messageInput = document.getElementById('message-input');
                if (messageInput) {
                    messageInput.focus();
                }
            }, 100);
        }
        
        /**
         * Show the settings modal
         * @param {Object} config - Configuration for the modal
         */
        function showSettingsModal(config) {
            const { apiKey, currentModel, fetchAvailableModels, populateDefaultModels } = config;
            
            // Update the API key field with masked value if exists
            if (apiKey) {
                elements.apiKeyUpdate.placeholder = '••••••••••••••••••••••••••';
                
                // Refresh models list when opening settings
                fetchAvailableModels();
            } else {
                populateDefaultModels();
            }
            
            // Set current model
            elements.modelSelect.value = currentModel;
            
            // Set the provider dropdown - IMPORTANT: Must get current provider from DataService
            const currentProvider = DataService.getBaseUrlProvider();
            if (elements.baseUrlSelect) {
                elements.baseUrlSelect.value = currentProvider;
                
                // Show/hide custom URL field based on selection
                if (currentProvider === 'custom') {
                    if (elements.customBaseUrlGroup) {
                        elements.customBaseUrlGroup.style.display = 'block';
                    }
                    if (elements.baseUrl) {
                        elements.baseUrl.value = DataService.getBaseUrl() || '';
                    }
                } else {
                    if (elements.customBaseUrlGroup) {
                        elements.customBaseUrlGroup.style.display = 'none';
                    }
                }
            }
            
            elements.settingsModal.classList.add('active');
        }
        
        /**
         * Hide the settings modal
         * @param {Object} savedValues - Saved values to restore
         */
        function hideSettingsModal(savedValues) {
            const { apiKey, baseUrl, currentModel } = savedValues;
            
            // Reset UI values to saved values when closing without saving
            if (apiKey) {
                elements.apiKeyUpdate.value = '';
                elements.apiKeyUpdate.placeholder = '••••••••••••••••••••••••••';
            }
            
            if (baseUrl) {
                elements.baseUrl.value = baseUrl;
            }
            
            if (currentModel) {
                elements.modelSelect.value = currentModel;
            }
            
            elements.settingsModal.classList.remove('active');
            
            // Focus the message input after modal closes
            setTimeout(() => {
                const messageInput = document.getElementById('message-input');
                if (messageInput) {
                    messageInput.focus();
                }
            }, 100);
        }
        
        /**
         * Show the share modal
         */
        function showShareModal() {
            elements.shareModal.classList.add('active');
            
            // Update status indicators when modal opens
            if (window.aiHackare && window.aiHackare.shareManager && window.aiHackare.shareManager.updateShareItemStatuses) {
                window.aiHackare.shareManager.updateShareItemStatuses();
            }
            
            // NUCLEAR FIX: Force-attach MCP checkbox event listener when modal opens
            setTimeout(() => {
                const mcpCheckbox = document.getElementById('share-mcp-connections');
                if (mcpCheckbox) {
                    // Remove any existing listeners
                    const newCheckbox = mcpCheckbox.cloneNode(true);
                    mcpCheckbox.parentNode.replaceChild(newCheckbox, mcpCheckbox);
                    
                    // Add the event listener
                    newCheckbox.addEventListener('change', () => {
                        try {
                            console.log('🎉 NUCLEAR FIX: MCP checkbox changed to:', newCheckbox.checked);
                            console.log('🎉 NUCLEAR FIX: Event listener entry point reached');
                            
                            // Trigger updateLinkLengthBar if available
                            console.log('🔍 NUCLEAR FIX: window available:', !!window);
                            console.log('🔍 NUCLEAR FIX: window.aiHackare available:', !!window.aiHackare);
                            console.log('🔍 NUCLEAR FIX: window.aiHackare type:', typeof window.aiHackare);
                            
                            if (window.aiHackare) {
                                console.log('🔍 NUCLEAR FIX: aiHackare object keys:', Object.keys(window.aiHackare));
                                console.log('🔍 NUCLEAR FIX: aiHackare.updateLinkLengthBar type:', typeof window.aiHackare.updateLinkLengthBar);
                                console.log('🔍 NUCLEAR FIX: updateLinkLengthBar function available:', typeof window.aiHackare.updateLinkLengthBar === 'function');
                                
                                if (typeof window.aiHackare.updateLinkLengthBar === 'function') {
                                    console.log('📞 NUCLEAR FIX: About to call updateLinkLengthBar...');
                                    try {
                                        window.aiHackare.updateLinkLengthBar();
                                        console.log('✅ NUCLEAR FIX: updateLinkLengthBar call completed successfully');
                                    } catch (callError) {
                                        console.error('❌ NUCLEAR FIX: Error calling updateLinkLengthBar:', callError);
                                        console.error('❌ NUCLEAR FIX: Call error stack:', callError.stack);
                                    }
                                } else {
                                    console.error('❌ NUCLEAR FIX: updateLinkLengthBar is not a function');
                                    console.error('❌ NUCLEAR FIX: updateLinkLengthBar value:', window.aiHackare.updateLinkLengthBar);
                                }
                                
                                // ALSO update the MCP status indicators when checkbox changes
                                if (window.aiHackare.shareManager && typeof window.aiHackare.shareManager.updateShareItemStatuses === 'function') {
                                    console.log('📞 NUCLEAR FIX: About to update MCP status indicators...');
                                    try {
                                        window.aiHackare.shareManager.updateShareItemStatuses();
                                        console.log('✅ NUCLEAR FIX: MCP status indicators updated successfully');
                                    } catch (statusError) {
                                        console.error('❌ NUCLEAR FIX: Error updating MCP status indicators:', statusError);
                                    }
                                } else {
                                    console.error('❌ NUCLEAR FIX: shareManager or updateShareItemStatuses not available');
                                }
                            } else {
                                console.error('❌ NUCLEAR FIX: window.aiHackare is not available');
                                console.error('❌ NUCLEAR FIX: window.aiHackare value:', window.aiHackare);
                            }
                            
                            console.log('🎉 NUCLEAR FIX: Event listener exit point reached');
                        } catch (error) {
                            console.error('💥 NUCLEAR FIX: Error in MCP checkbox event handler:', error);
                            console.error('💥 NUCLEAR FIX: Error stack:', error.stack);
                            console.error('💥 NUCLEAR FIX: Error name:', error.name);
                            console.error('💥 NUCLEAR FIX: Error message:', error.message);
                        }
                    });
                    
                    console.log('🚀 NUCLEAR FIX: MCP checkbox event listener force-attached');
                } else {
                    console.error('❌ NUCLEAR FIX: MCP checkbox still not found');
                }
                
                // Initialize welcome message link length calculation
                const shareWelcomeMessage = document.getElementById('share-welcome-message');
                const shareWelcomeMessageCheckbox = document.getElementById('share-welcome-message-checkbox');
                
                if (shareWelcomeMessage && shareWelcomeMessageCheckbox && !shareWelcomeMessage._linkLengthInitialized) {
                    // Debounce function for welcome message - longer delay for better performance
                    let welcomeDebounceTimeout;
                    const welcomeDebounceDelay = 500; // Increased to 500ms for better performance
                    
                    // Optimized function to update link length bar (minimal logging)
                    const updateWelcomeLinkLength = function() {
                        if (window.aiHackare?.updateLinkLengthBar) {
                            try {
                                window.aiHackare.updateLinkLengthBar();
                            } catch (error) {
                                console.error('Welcome message link length error:', error);
                            }
                        }
                    };
                    
                    // Optimized input event listener with better debouncing
                    shareWelcomeMessage.addEventListener('input', function() {
                        clearTimeout(welcomeDebounceTimeout);
                        
                        // Always use debouncing - no immediate updates for performance
                        welcomeDebounceTimeout = setTimeout(updateWelcomeLinkLength, welcomeDebounceDelay);
                    });
                    
                    // Checkbox change updates immediately (less frequent)
                    shareWelcomeMessageCheckbox.addEventListener('change', updateWelcomeLinkLength);
                    
                    // Mark as initialized to prevent duplicate listeners
                    shareWelcomeMessage._linkLengthInitialized = true;
                }
            }, 50);
        }
        
        /**
         * Hide the share modal
         */
        function hideShareModal() {
            elements.shareModal.classList.remove('active');
            
            // Focus the message input after modal closes
            setTimeout(() => {
                const messageInput = document.getElementById('message-input');
                if (messageInput) {
                    messageInput.focus();
                }
            }, 100);
        }
        
        /**
         * Show the function modal
         */
        function showFunctionModal() {
            if (elements.functionModal) {
                elements.functionModal.classList.add('active');
            }
        }
        
        /**
         * Hide the function modal
         */
        function hideFunctionModal() {
            if (elements.functionModal) {
                elements.functionModal.classList.remove('active');
            }
            
            // Focus the message input after modal closes
            setTimeout(() => {
                const messageInput = document.getElementById('message-input');
                if (messageInput) {
                    messageInput.focus();
                }
            }, 100);
        }
        
        /**
         * Show the model selection modal
         */
        function showModelSelectorModal() {
            if (window.ModelSelectionManager) {
                console.log('🔧 ModalManager: Using ModelSelectionManager.showModal');
                window.ModelSelectionManager.showModal();
            } else {
                console.log('❌ ModalManager: ModelSelectionManager not available');
            }
        }
        
        /**
         * Hide the model selection modal
         */
        function hideModelSelectorModal() {
            if (window.ModelSelectionManager) {
                console.log('🔧 ModalManager: Using ModelSelectionManager.hideModal');
                window.ModelSelectionManager.hideModal();
            } else {
                console.log('❌ ModalManager: ModelSelectionManager not available');
            }
        }
        
        // Public API
        return {
            showApiKeyModal,
            hideApiKeyModal,
            showSettingsModal,
            hideSettingsModal,
            showShareModal,
            hideShareModal,
            showFunctionModal,
            hideFunctionModal,
            showModelSelectorModal,
            hideModelSelectorModal
        };
    }
    
    // Public API
    return {
        createModalManager: createModalManager
    };
})();