/**
 * Share UI Manager Module
 * Handles share-specific UI functionality (links, QR codes, password management)
 */

window.ShareUIManager = (function() {
    // Constants for link length calculation
    const MAX_RECOMMENDED_LINK_LENGTH = 2000; // Most browsers accept URLs up to 2000 bytes
    
    /**
     * Create a Share UI Manager instance
     * @param {Object} elements - DOM elements
     * @returns {Object} Share UI Manager instance
     */
    function createShareUIManager(elements) {
        /**
         * Initialize share modal UI
         * @param {Object} config - Configuration options
         */
        function initializeShareModal(config) {
            const { apiKey, sessionKey, isSessionKeyLocked, sharedWelcomeMessage, loadShareOptions, sharedLinkOptions } = config;
            
            // Reset form
            if (elements.shareForm) {
                elements.shareForm.reset();
            }
            
            // Handle password setup
            setupPassword(sessionKey, isSessionKeyLocked);
            
            // Handle welcome message setup
            setupWelcomeMessage(sharedWelcomeMessage);
            
            // Load share options - prioritize shared link options over saved options
            if (sharedLinkOptions) {
                setShareOptionsFromSharedLink(sharedLinkOptions);
            } else if (loadShareOptions) {
                loadShareOptions();
            } else {
                setDefaultShareOptions(apiKey);
            }
            
            // Always setup API key checkbox state regardless of which option loading method was used
            setupApiKeyCheckboxState(apiKey);
            
            // Always ensure core options are checked when API key is configured
            ensureCoreOptionsWhenApiKeyConfigured(apiKey);
            
            // Hide generated link container
            if (elements.generatedLinkContainer) {
                elements.generatedLinkContainer.style.display = 'none';
            }
            
            // Clear QR code container
            if (elements.shareQrCodeContainer) {
                elements.shareQrCodeContainer.innerHTML = '';
            }
            
            // Hide QR code warning
            if (elements.qrCodeWarning) {
                elements.qrCodeWarning.style.display = 'none';
            }
        }
        
        
        /**
         * Setup password field
         * @param {string} sessionKey - Session key (if any)
         * @param {boolean} isSessionKeyLocked - Whether the session key is locked
         */
        function setupPassword(sessionKey, isSessionKeyLocked) {
            if (sessionKey) {
                // Set the session key value but never make it read-only since we removed lock functionality
                if (elements.sharePassword) {
                    elements.sharePassword.value = sessionKey;
                    elements.sharePassword.readOnly = false; // Always allow editing
                }
                
                // Remove any locked class since we removed lock functionality
                if (elements.passwordInputContainer) {
                    elements.passwordInputContainer.classList.remove('locked');
                }
            } else {
                // Generate a random password only if there's no session key
                if (elements.sharePassword) {
                    elements.sharePassword.value = ShareService.generateStrongPassword();
                    elements.sharePassword.type = 'password';
                    elements.sharePassword.readOnly = false;
                }
                
                // Remove the locked class
                if (elements.passwordInputContainer) {
                    elements.passwordInputContainer.classList.remove('locked');
                }
            }
        }
        
        /**
         * Setup welcome message pre-population
         * @param {string|null} sharedWelcomeMessage - Welcome message from shared link
         */
        function setupWelcomeMessage(sharedWelcomeMessage) {
            if (sharedWelcomeMessage && elements.shareWelcomeMessageInput) {
                // Pre-populate the welcome message field
                elements.shareWelcomeMessageInput.value = sharedWelcomeMessage;
                
                // Enable the welcome message checkbox if it exists
                if (elements.shareWelcomeMessageCheckbox) {
                    elements.shareWelcomeMessageCheckbox.checked = true;
                }
            }
        }
        
        /**
         * Setup API key checkbox state based on whether API key is configured
         * @param {string} apiKey - Current API key (if any)
         */
        function setupApiKeyCheckboxState(apiKey) {
            const hasApiKey = apiKey && apiKey.trim().length > 0;
            
            if (elements.shareApiKeyCheckbox) {
                if (hasApiKey) {
                    elements.shareApiKeyCheckbox.disabled = false;
                    elements.shareApiKeyCheckbox.style.opacity = '1';
                    // Remove any disabled styling from the parent label
                    const label = elements.shareApiKeyCheckbox.parentNode.querySelector('label');
                    if (label) {
                        label.style.opacity = '1';
                        label.style.color = '';
                    }
                } else {
                    elements.shareApiKeyCheckbox.checked = false; // Uncheck if no API key
                    elements.shareApiKeyCheckbox.disabled = true;
                    elements.shareApiKeyCheckbox.style.opacity = '0.5';
                    // Gray out the associated label too
                    const label = elements.shareApiKeyCheckbox.parentNode.querySelector('label');
                    if (label) {
                        label.style.opacity = '0.5';
                        label.style.color = '#999';
                    }
                }
            }
        }
        
        /**
         * Ensure core options (API key, provider, model) are checked when API key is configured
         * This applies regardless of which option loading method was used
         * @param {string} apiKey - Current API key (if any)
         */
        function ensureCoreOptionsWhenApiKeyConfigured(apiKey) {
            const hasApiKey = apiKey && apiKey.trim().length > 0;
            
            if (hasApiKey) {
                // Always check these core options when API key is available
                if (elements.shareApiKeyCheckbox) {
                    elements.shareApiKeyCheckbox.checked = true;
                }
                
                if (elements.shareBaseUrlCheckbox) {
                    elements.shareBaseUrlCheckbox.checked = true;
                }
                
                if (elements.shareModelCheckbox) {
                    elements.shareModelCheckbox.checked = true;
                }
            }
        }
        
        /**
         * Set share options based on shared link options (what brought us here)
         * @param {Object} sharedLinkOptions - Options from the shared link
         */
        function setShareOptionsFromSharedLink(sharedLinkOptions) {
            // Set checkboxes based on what was included in the shared link
            if (elements.shareBaseUrlCheckbox) {
                elements.shareBaseUrlCheckbox.checked = sharedLinkOptions.includeBaseUrl || false;
            }
            
            if (elements.shareApiKeyCheckbox) {
                elements.shareApiKeyCheckbox.checked = sharedLinkOptions.includeApiKey || false;
            }
            
            if (elements.shareModelCheckbox) {
                elements.shareModelCheckbox.checked = sharedLinkOptions.includeModel || false;
            }
            
            if (elements.shareSystemPromptCheckbox) {
                elements.shareSystemPromptCheckbox.checked = sharedLinkOptions.includeSystemPrompt || false;
            }
            
            if (elements.shareConversationCheckbox) {
                elements.shareConversationCheckbox.checked = sharedLinkOptions.includeConversation || false;
                // Update message history input state
                if (sharedLinkOptions.includeConversation && elements.messageHistoryCount) {
                    elements.messageHistoryCount.disabled = false;
                    elements.messageHistoryCount.value = Math.max(1, sharedLinkOptions.messageCount || 1);
                    if (elements.messageHistoryContainer) {
                        elements.messageHistoryContainer.classList.add('active');
                    }
                } else {
                    if (elements.messageHistoryCount) {
                        elements.messageHistoryCount.disabled = true;
                        elements.messageHistoryCount.value = '1';
                    }
                    if (elements.messageHistoryContainer) {
                        elements.messageHistoryContainer.classList.remove('active');
                    }
                }
            }
            
            if (elements.sharePromptLibraryCheckbox) {
                elements.sharePromptLibraryCheckbox.checked = sharedLinkOptions.includePromptLibrary || false;
            }
            
            if (elements.shareFunctionLibraryCheckbox) {
                elements.shareFunctionLibraryCheckbox.checked = sharedLinkOptions.includeFunctionLibrary || false;
            }
            
            if (elements.shareMcpConnectionsCheckbox) {
                elements.shareMcpConnectionsCheckbox.checked = sharedLinkOptions.includeMcpConnections || false;
            }
            
            if (elements.shareWelcomeMessageCheckbox) {
                elements.shareWelcomeMessageCheckbox.checked = sharedLinkOptions.includeWelcomeMessage || false;
            }
        }
        
        /**
         * Set default share options (for direct visits to hacka.re)
         * @param {string} apiKey - Current API key (if any)
         */
        function setDefaultShareOptions(apiKey) {
            const hasApiKey = apiKey && apiKey.trim().length > 0;
            
            // For direct visits, check API key, base URL/provider, and model by default if API key is configured
            if (elements.shareBaseUrlCheckbox) {
                elements.shareBaseUrlCheckbox.checked = hasApiKey;
            }
            
            if (elements.shareApiKeyCheckbox) {
                elements.shareApiKeyCheckbox.checked = hasApiKey;
            }
            
            if (elements.shareModelCheckbox) {
                elements.shareModelCheckbox.checked = hasApiKey;
            }
            
            if (elements.shareSystemPromptCheckbox) {
                elements.shareSystemPromptCheckbox.checked = false;
            }
            
            if (elements.shareConversationCheckbox) {
                elements.shareConversationCheckbox.checked = false;
            }
            
            if (elements.sharePromptLibraryCheckbox) {
                elements.sharePromptLibraryCheckbox.checked = false;
            }
            
            if (elements.shareFunctionLibraryCheckbox) {
                elements.shareFunctionLibraryCheckbox.checked = false;
            }
            
            if (elements.shareMcpConnectionsCheckbox) {
                elements.shareMcpConnectionsCheckbox.checked = false;
            }
            
            if (elements.shareWelcomeMessageCheckbox) {
                elements.shareWelcomeMessageCheckbox.checked = false;
            }
            
            // Disable message history input
            if (elements.messageHistoryCount) {
                elements.messageHistoryCount.disabled = true;
                elements.messageHistoryCount.value = '1';
            }
            
            if (elements.messageHistoryContainer) {
                elements.messageHistoryContainer.classList.remove('active');
            }
        }
        
        /**
         * Toggle password visibility
         */
        function togglePasswordVisibility() {
            if (elements.sharePassword && elements.togglePasswordVisibilityBtn) {
                if (elements.sharePassword.type === 'password') {
                    elements.sharePassword.type = 'text';
                    elements.togglePasswordVisibilityBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
                } else {
                    elements.sharePassword.type = 'password';
                    elements.togglePasswordVisibilityBtn.innerHTML = '<i class="fas fa-eye"></i>';
                }
            }
        }
        
        /**
         * Toggle message history input based on conversation checkbox
         */
        function toggleMessageHistoryInput() {
            if (elements.shareConversationCheckbox && elements.messageHistoryCount && elements.messageHistoryContainer) {
                if (elements.shareConversationCheckbox.checked) {
                    elements.messageHistoryCount.disabled = false;
                    elements.messageHistoryContainer.classList.add('active');
                } else {
                    elements.messageHistoryCount.disabled = true;
                    elements.messageHistoryContainer.classList.remove('active');
                }
            }
        }
        
        /**
         * Update the link length bar
         * @param {Object} data - Data for calculating link length
         */
        function updateLinkLengthBar(data = {}) {
            const { apiKey, systemPrompt, currentModel, messages = [] } = data;
            
            // Base URL length (including hash and shared= prefix)
            const baseUrlLength = window.location.href.split('#')[0].length + 8; // 8 for "#shared="
            
            // Estimate the length of the encrypted data
            let estimatedLength = baseUrlLength;
            
            // Create a payload object similar to what would be encrypted
            const payload = {};
            
            // Add base URL if selected
            const baseUrl = StorageService.getBaseUrl();
            if (elements.shareBaseUrlCheckbox && elements.shareBaseUrlCheckbox.checked && baseUrl) {
                payload.baseUrl = baseUrl;
                estimatedLength += baseUrl.length;
            }
            
            // Add API key if selected
            if (elements.shareApiKeyCheckbox && elements.shareApiKeyCheckbox.checked && apiKey) {
                payload.apiKey = apiKey;
                estimatedLength += apiKey.length;
            }
            
            // Add system prompt if selected
            if (elements.shareSystemPromptCheckbox && elements.shareSystemPromptCheckbox.checked && systemPrompt) {
                payload.systemPrompt = systemPrompt;
                estimatedLength += systemPrompt.length;
            }
            
            // Add model if selected
            if (elements.shareModelCheckbox && elements.shareModelCheckbox.checked && currentModel) {
                payload.model = currentModel;
                estimatedLength += currentModel.length;
            }
            
            // Add prompt library if selected (excluding MCP prompts)
            if (elements.sharePromptLibraryCheckbox && elements.sharePromptLibraryCheckbox.checked) {
                // Count USER prompts (full content is included in shared URLs)
                const allPrompts = PromptsService.getPrompts();
                const selectedPromptIds = PromptsService.getSelectedPromptIds();
                
                // Filter out MCP prompts
                const userPrompts = allPrompts.filter(prompt => !prompt.isMcpPrompt);
                
                if (userPrompts && userPrompts.length > 0) {
                    userPrompts.forEach(prompt => {
                        estimatedLength += prompt.name.length + prompt.content.length + 20;
                    });
                }
                
                if (selectedPromptIds && selectedPromptIds.length > 0) {
                    estimatedLength += selectedPromptIds.join(',').length + 20;
                }
                
                // Count DEFAULT prompt selection state (only IDs are shared, not content)
                // Only include when selections deviate from default (empty) state
                const selectedDefaultPromptIds = window.DefaultPromptsService ? 
                    window.DefaultPromptsService.getSelectedDefaultPromptIds() : [];
                
                // Filter out MCP prompt IDs
                const mcpPromptIds = ['shodan-integration-guide', 'github-integration-guide', 'gmail-integration-guide'];
                const filteredDefaultPromptIds = selectedDefaultPromptIds.filter(id => !mcpPromptIds.includes(id));
                    
                if (filteredDefaultPromptIds && filteredDefaultPromptIds.length > 0) {
                    estimatedLength += filteredDefaultPromptIds.join(',').length + 25; // field name + IDs
                }
            }
            
            // Add function library if selected (excluding MCP functions)
            if (elements.shareFunctionLibraryCheckbox && elements.shareFunctionLibraryCheckbox.checked) {
                const allFunctions = FunctionToolsService.getJsFunctions();
                const allEnabledFunctions = FunctionToolsService.getEnabledFunctionNames();
                const allCollections = FunctionToolsService.getAllFunctionCollections();
                const functionCollections = FunctionToolsService.getFunctionCollections();
                
                // Identify MCP collections
                const mcpCollectionIds = [];
                Object.values(allCollections).forEach(collection => {
                    const isMcpCollection = collection.metadata.source === 'mcp' || 
                                          collection.metadata.source === 'mcp-service' ||
                                          collection.id.startsWith('mcp_');
                    if (isMcpCollection) {
                        mcpCollectionIds.push(collection.id);
                    }
                });
                
                // Filter out MCP functions
                const userFunctions = {};
                Object.entries(allFunctions).forEach(([funcName, funcSpec]) => {
                    const collectionId = functionCollections[funcName];
                    // Only include if not in an MCP collection
                    if (!collectionId || !mcpCollectionIds.includes(collectionId)) {
                        userFunctions[funcName] = funcSpec;
                    }
                });
                
                // Calculate size for user functions only
                if (userFunctions) {
                    Object.keys(userFunctions).forEach(functionName => {
                        const functionData = userFunctions[functionName];
                        estimatedLength += functionData.code.length + 
                                          JSON.stringify(functionData.toolDefinition).length + 
                                          functionName.length + 50;
                    });
                }
                
                // Filter enabled functions to exclude MCP functions
                const enabledUserFunctions = allEnabledFunctions.filter(funcName => {
                    const collectionId = functionCollections[funcName];
                    return !collectionId || !mcpCollectionIds.includes(collectionId);
                });
                
                if (enabledUserFunctions && enabledUserFunctions.length > 0) {
                    estimatedLength += enabledUserFunctions.join(',').length + 20;
                }
            }
            
            // Add MCP connections if selected
            // ALWAYS query the DOM fresh for MCP checkbox due to modal manager replacing it
            const mcpCheckbox = document.getElementById('share-mcp-connections');
            
            if (mcpCheckbox && mcpCheckbox.checked) {
                
                // Try to estimate MCP connections size directly
                let mcpSize = 80; // Default fallback
                
                // Try to get GitHub token size directly from storage
                try {
                    // Check if we can access localStorage directly for a quick estimate
                    if (window.localStorage) {
                        // Look for GitHub token in various possible storage formats
                        const storageKeys = Object.keys(localStorage);
                        for (const key of storageKeys) {
                            if (key.includes('mcp_github_token') || key.includes('github_token')) {
                                try {
                                    const tokenData = localStorage.getItem(key);
                                    if (tokenData) {
                                        let tokenValue = tokenData;
                                        
                                        // Try to parse as JSON first
                                        try {
                                            const parsed = JSON.parse(tokenData);
                                            if (typeof parsed === 'string') {
                                                tokenValue = parsed;
                                            }
                                        } catch (e) {
                                            // Not JSON, use as-is
                                        }
                                        
                                        if (typeof tokenValue === 'string' && tokenValue.length > 20) {
                                            mcpSize = tokenValue.length + 25; // Token + JSON structure
                                            break;
                                        }
                                    }
                                } catch (e) {
                                    // Skip invalid storage keys
                                }
                            }
                        }
                    }
                } catch (error) {
                    // Skip if localStorage access fails
                }
                
                // Use the MCP size estimator if available
                if (window.mcpConnectionsEstimatorSync) {
                    try {
                        const estimatorSize = window.mcpConnectionsEstimatorSync();
                        if (estimatorSize > mcpSize) {
                            mcpSize = estimatorSize;
                        }
                    } catch (error) {
                        // Skip if estimator fails
                    }
                }
                
                estimatedLength += mcpSize;
            }
            
            // Add conversation data if selected
            if (elements.shareConversationCheckbox && elements.shareConversationCheckbox.checked && messages.length > 0) {
                const messageCount = parseInt(elements.messageHistoryCount.value, 10) || 1;
                const startIndex = Math.max(0, messages.length - messageCount);
                const messagesToInclude = messages.slice(startIndex);
                
                messagesToInclude.forEach(msg => {
                    estimatedLength += msg.content.length + 10;
                });
            }
            
            // Add welcome message if selected
            if (elements.shareWelcomeMessageCheckbox && elements.shareWelcomeMessageCheckbox.checked && elements.shareWelcomeMessageInput) {
                const welcomeMessage = elements.shareWelcomeMessageInput.value;
                if (welcomeMessage && welcomeMessage.trim()) {
                    estimatedLength += welcomeMessage.length + 20; // Welcome message + JSON structure overhead
                }
            }
            
            // Account for base64 encoding (which increases size by ~33%)
            estimatedLength = Math.ceil(estimatedLength * 1.33);
            
            // Add overhead for encryption
            estimatedLength += 100;
            
            // Update the link length text
            if (elements.linkLengthText) {
                elements.linkLengthText.textContent = estimatedLength;
            }
            
            // Calculate percentage of max recommended length
            const percentage = Math.min(100, Math.round((estimatedLength / MAX_RECOMMENDED_LINK_LENGTH) * 100));
            
            // Update the link length bar
            if (elements.linkLengthFill) {
                elements.linkLengthFill.style.width = `${percentage}%`;
                
                // Update color based on length
                if (estimatedLength > MAX_RECOMMENDED_LINK_LENGTH) {
                    elements.linkLengthFill.classList.add('danger');
                    if (elements.linkLengthWarning) {
                        elements.linkLengthWarning.style.display = 'block';
                    }
                } else {
                    elements.linkLengthFill.classList.remove('danger');
                    if (elements.linkLengthWarning) {
                        elements.linkLengthWarning.style.display = 'none';
                    }
                }
            }
        }
        
        /**
         * Generate a QR code for the share link
         * @param {string} link - The link to encode in the QR code
         */
        function generateShareQRCode(link) {
            if (elements.shareQrCodeContainer && link) {
                try {
                    // Clear any existing QR code
                    elements.shareQrCodeContainer.innerHTML = '';
                    
                    // Check if the link is too long for QR code generation
                    if (link.length > 1500) {
                        // Show warning
                        if (elements.qrCodeWarning) {
                            elements.qrCodeWarning.textContent = `The link is too long (${link.length} bytes) to generate a QR code. QR codes can typically handle up to 1500 bytes.`;
                            elements.qrCodeWarning.style.display = 'block';
                        }
                        return;
                    }
                    
                    // Create a new QR code
                    new QRCode(elements.shareQrCodeContainer, {
                        text: link,
                        width: 250,
                        height: 250,
                        colorDark: '#000000',
                        colorLight: '#ffffff',
                        correctLevel: QRCode.CorrectLevel.L
                    });
                } catch (error) {
                    console.error('Error generating QR code:', error);
                    
                    // Show warning
                    if (elements.qrCodeWarning) {
                        elements.qrCodeWarning.textContent = 'Error generating QR code. The link may be too long.';
                        elements.qrCodeWarning.style.display = 'block';
                    }
                }
            }
        }
        
        // Public API
        return {
            initializeShareModal,
            togglePasswordVisibility,
            toggleMessageHistoryInput,
            updateLinkLengthBar,
            generateShareQRCode
        };
    }
    
    // Public API
    return {
        createShareUIManager: createShareUIManager
    };
})();