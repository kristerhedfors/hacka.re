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
         * Close heart tooltip if it's open
         */
        function closeHeartTooltip() {
            const heartTooltip = document.querySelector('.heart-logo .tooltip');
            if (heartTooltip && heartTooltip.classList.contains('active')) {
                heartTooltip.classList.remove('active');
                document.body.classList.remove('heart-modal-open');
                // Reset tooltip state if available
                if (window.tooltipActive !== undefined) {
                    window.tooltipActive = false;
                }
            }
        }

        /**
         * Show the API key modal
         */
        function showApiKeyModal() {
            closeHeartTooltip();
            elements.apiKeyModal.classList.add('active');
            elements.apiKeyInput.focus();
        }
        
        /**
         * Hide the API key modal
         */
        function hideApiKeyModal() {
            elements.apiKeyModal.classList.remove('active');
        }
        
        /**
         * Show the settings modal
         * @param {Object} config - Configuration for the modal
         */
        function showSettingsModal(config) {
            closeHeartTooltip();
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
        }
        
        /**
         * Show the share modal
         */
        function showShareModal() {
            closeHeartTooltip();
            elements.shareModal.classList.add('active');
            
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
            }, 50);
        }
        
        /**
         * Hide the share modal
         */
        function hideShareModal() {
            elements.shareModal.classList.remove('active');
        }
        
        /**
         * Show the function modal
         */
        function showFunctionModal() {
            closeHeartTooltip();
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
            hideFunctionModal
        };
    }
    
    // Public API
    return {
        createModalManager: createModalManager
    };
})();