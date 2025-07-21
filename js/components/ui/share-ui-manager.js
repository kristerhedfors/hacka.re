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
            
            // Handle title and subtitle
            setupTitleAndSubtitle();
            
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
         * Setup title and subtitle inputs
         */
        function setupTitleAndSubtitle() {
            const currentTitle = StorageService.getTitle();
            const currentSubtitle = StorageService.getSubtitle();
            const defaultTitle = "hacka.re";
            const defaultSubtitle = "Free, open, för hackare av hackare";
            
            // Set title input - use placeholder for default values, actual value for custom values
            if (elements.shareTitleInput) {
                if (currentTitle === defaultTitle) {
                    elements.shareTitleInput.value = '';
                    elements.shareTitleInput.placeholder = defaultTitle;
                } else {
                    elements.shareTitleInput.value = currentTitle;
                }
            }
            
            // Set subtitle input - use placeholder for default values, actual value for custom values
            if (elements.shareSubtitleInput) {
                if (currentSubtitle === defaultSubtitle) {
                    elements.shareSubtitleInput.value = '';
                    elements.shareSubtitleInput.placeholder = defaultSubtitle;
                } else {
                    elements.shareSubtitleInput.value = currentSubtitle;
                }
            }
        }
        
        /**
         * Setup password field
         * @param {string} sessionKey - Session key (if any)
         * @param {boolean} isSessionKeyLocked - Whether the session key is locked
         */
        function setupPassword(sessionKey, isSessionKeyLocked) {
            if (sessionKey) {
                // Set the session key value
                if (elements.sharePassword) {
                    elements.sharePassword.value = sessionKey;
                    elements.sharePassword.readOnly = isSessionKeyLocked;
                }
                
                // Set the lock checkbox
                if (elements.lockSessionKeyCheckbox) {
                    elements.lockSessionKeyCheckbox.checked = isSessionKeyLocked;
                }
                
                // Add or remove the locked class
                if (elements.passwordInputContainer) {
                    if (isSessionKeyLocked) {
                        elements.passwordInputContainer.classList.add('locked');
                    } else {
                        elements.passwordInputContainer.classList.remove('locked');
                    }
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
                
                // Ensure the lock checkbox is unchecked
                if (elements.lockSessionKeyCheckbox) {
                    elements.lockSessionKeyCheckbox.checked = false;
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
            
            // Add prompt library if selected
            if (elements.sharePromptLibraryCheckbox && elements.sharePromptLibraryCheckbox.checked) {
                const prompts = PromptsService.getPrompts();
                const selectedPromptIds = PromptsService.getSelectedPromptIds();
                
                if (prompts && prompts.length > 0) {
                    prompts.forEach(prompt => {
                        estimatedLength += prompt.name.length + prompt.content.length + 20;
                    });
                }
                
                if (selectedPromptIds && selectedPromptIds.length > 0) {
                    estimatedLength += selectedPromptIds.join(',').length + 20;
                }
            }
            
            // Add function library if selected
            if (elements.shareFunctionLibraryCheckbox && elements.shareFunctionLibraryCheckbox.checked) {
                const functions = FunctionToolsService.getJsFunctions();
                const enabledFunctions = FunctionToolsService.getEnabledFunctionNames();
                
                if (functions) {
                    Object.keys(functions).forEach(functionName => {
                        const functionData = functions[functionName];
                        estimatedLength += functionData.code.length + 
                                          JSON.stringify(functionData.toolDefinition).length + 
                                          functionName.length + 50;
                    });
                }
                
                if (enabledFunctions && enabledFunctions.length > 0) {
                    estimatedLength += enabledFunctions.join(',').length + 20;
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