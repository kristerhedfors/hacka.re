/**
 * Accurate Size Calculator
 * Calculates actual compressed link sizes instead of estimates
 */

window.AccurateSizeCalculator = (function() {
    
    /**
     * Calculate the actual compressed size of a share link
     * @param {Object} data - Data context (apiKey, systemPrompt, etc.)
     * @param {Object} uiElements - UI elements to check checkbox states
     * @returns {Promise<number>} Actual link length in characters
     */
    async function calculateActualLinkSize(data = {}, uiElements = {}) {
        try {
            const { apiKey, systemPrompt, currentModel, messages = [] } = data;
            
            // Build the exact same options that would be used for link generation
            const options = {
                password: "size-calc-123", // Dummy password for calculation
                baseUrl: window.StorageService?.getBaseUrl(),
                apiKey: apiKey,
                systemPrompt: systemPrompt,
                model: currentModel,
                messages: messages,
                messageCount: parseInt(uiElements.messageHistoryCount?.value, 10) || 1,
                
                // Check actual UI state
                includeBaseUrl: uiElements.shareBaseUrlCheckbox?.checked || false,
                includeApiKey: uiElements.shareApiKeyCheckbox?.checked || false,
                includeSystemPrompt: false, // Handled by prompt library
                includeModel: uiElements.shareModelCheckbox?.checked || false,
                includeConversation: uiElements.shareConversationCheckbox?.checked || false,
                includePromptLibrary: uiElements.sharePromptLibraryCheckbox?.checked || false,
                includeFunctionLibrary: uiElements.shareFunctionLibraryCheckbox?.checked || false,
                includeMcpConnections: document.getElementById('share-mcp-connections')?.checked || false,
                includeWelcomeMessage: uiElements.shareWelcomeMessageCheckbox?.checked || false,
                includeTheme: uiElements.shareThemeCheckbox?.checked || false
            };
            
            // Add welcome message if enabled
            if (options.includeWelcomeMessage && uiElements.shareWelcomeMessageInput) {
                const welcomeMessage = uiElements.shareWelcomeMessageInput.value.trim();
                if (welcomeMessage) {
                    options.welcomeMessage = welcomeMessage;
                }
            }
            
            // If no items selected, return base URL length
            const hasItems = Object.values(options).some((val, idx) => {
                const key = Object.keys(options)[idx];
                return key.startsWith('include') && val === true;
            });
            
            if (!hasItems) {
                return window.location.href.split('#')[0].length + 20; // Base URL + small overhead
            }
            
            // Generate the actual compressed link to get exact size
            // Add flag to suppress debug output for size calculation
            if (window.ShareService && window.ShareService.createShareLink) {
                options.suppressDebug = true; // Don't show debug messages for size calculation
                const actualLink = await window.ShareService.createShareLink(options);
                return actualLink.length;
            } else {
                // Fallback if ShareService not available
                console.warn('ShareService not available for size calculation');
                return 500; // Conservative estimate
            }
            
        } catch (error) {
            console.warn('Error calculating actual link size:', error);
            // Return a conservative estimate on error
            return 800;
        }
    }
    
    /**
     * Get a quick estimate without async operations
     * Used as fallback when accurate calculation fails
     */
    function getQuickEstimate(data = {}, uiElements = {}) {
        const { apiKey = '', systemPrompt = '', currentModel = '', messages = [] } = data;
        
        let estimate = 200; // Base overhead
        
        if (uiElements.shareApiKeyCheckbox?.checked && apiKey) {
            estimate += Math.round(apiKey.length * 0.7); // Compression factor
        }
        
        if (uiElements.shareModelCheckbox?.checked && currentModel) {
            estimate += Math.round(currentModel.length * 0.7);
        }
        
        if (uiElements.shareConversationCheckbox?.checked && messages.length > 0) {
            const messageCount = parseInt(uiElements.messageHistoryCount?.value, 10) || 1;
            const messagesToShare = messages.slice(-messageCount);
            const totalMessageLength = messagesToShare.reduce((sum, msg) => sum + (msg.content?.length || 0), 0);
            estimate += Math.round(totalMessageLength * 0.6); // Good compression on text
        }
        
        if (uiElements.shareWelcomeMessageCheckbox?.checked && uiElements.shareWelcomeMessageInput) {
            const welcomeMessage = uiElements.shareWelcomeMessageInput.value || '';
            estimate += Math.round(welcomeMessage.length * 0.5); // Very good compression on repetitive text
        }
        
        // Function library tends to be large
        if (uiElements.shareFunctionLibraryCheckbox?.checked) {
            estimate += 2000; // Functions can be quite large
        }
        
        // Prompt library
        if (uiElements.sharePromptLibraryCheckbox?.checked) {
            estimate += 1000; // Prompts are moderately sized
        }
        
        return estimate;
    }
    
    // Public API
    return {
        calculateActualLinkSize: calculateActualLinkSize,
        getQuickEstimate: getQuickEstimate
    };
})();