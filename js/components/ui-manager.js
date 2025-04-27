/**
 * UI Manager Module
 * Handles UI-related functionality for the AIHackare application
 */

window.UIManager = (function() {
    /**
     * Create a UI Manager instance
     * @param {Object} elements - DOM elements
     * @param {Object} config - Configuration options
     * @returns {Object} UI Manager instance
     */
    function createUIManager(elements, config) {
        // Constants for link length calculation
        const MAX_RECOMMENDED_LINK_LENGTH = 2000; // Most browsers accept URLs up to 2000 bytes
        
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
        }
        
        /**
         * Show the settings modal
         * @param {string} apiKey - Current API key
         * @param {string} currentModel - Current model ID
         * @param {string} systemPrompt - Current system prompt
         * @param {Function} fetchAvailableModels - Function to fetch available models
         * @param {Function} populateDefaultModels - Function to populate default models
         */
        function showSettingsModal(apiKey, currentModel, systemPrompt, fetchAvailableModels, populateDefaultModels) {
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
            
            // Set current system prompt
            if (systemPrompt) {
                elements.systemPromptInput.value = systemPrompt;
            } else {
                elements.systemPromptInput.value = '';
            }
            
            // Apply auto-resize to system prompt textarea
            UIUtils.setupTextareaAutoResize(elements.systemPromptInput);
            
            elements.settingsModal.classList.add('active');
        }
        
        /**
         * Hide the settings modal
         * @param {string} apiKey - Saved API key
         * @param {string} baseUrl - Saved base URL
         * @param {string} currentModel - Saved model ID
         * @param {string} systemPrompt - Saved system prompt
         */
        function hideSettingsModal(apiKey, baseUrl, currentModel, systemPrompt) {
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
            
            if (systemPrompt) {
                elements.systemPromptInput.value = systemPrompt;
            }
            
            elements.settingsModal.classList.remove('active');
        }
        
        /**
         * Show the share modal
         * @param {string} apiKey - Current API key
         * @param {Function} updateLinkLengthBar - Function to update link length bar
         * @param {string} sessionKey - Session key (if any)
         * @param {boolean} isSessionKeyLocked - Whether the session key is locked
         * @param {Function} loadShareOptions - Function to load share options from storage
         */
        function showShareModal(apiKey, updateLinkLengthBar, sessionKey, isSessionKeyLocked, loadShareOptions) {
            if (!apiKey) {
                return false;
            }
            
            // Reset form
            if (elements.shareForm) {
                elements.shareForm.reset();
            }
            
            // Get current title and subtitle
            const currentTitle = StorageService.getTitle();
            const currentSubtitle = StorageService.getSubtitle();
            const defaultTitle = "hacka.re";
            const defaultSubtitle = "För hackare av hackare";
            
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
            
            // Check if there's a session key
            if (sessionKey) {
                // Set the session key value
                if (elements.sharePassword) {
                    elements.sharePassword.value = sessionKey;
                    // Only set readOnly if the session key is locked
                    elements.sharePassword.readOnly = isSessionKeyLocked;
                }
                
                // Set the lock checkbox based on isSessionKeyLocked
                if (elements.lockSessionKeyCheckbox) {
                    elements.lockSessionKeyCheckbox.checked = isSessionKeyLocked;
                }
                
                // Add or remove the locked class based on isSessionKeyLocked
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
                    elements.sharePassword.type = 'password'; // Ensure password is hidden
                    elements.sharePassword.readOnly = false;
                }
                
                // Remove the locked class from the password input container
                if (elements.passwordInputContainer) {
                    elements.passwordInputContainer.classList.remove('locked');
                }
                
                // Ensure the lock checkbox is unchecked
                if (elements.lockSessionKeyCheckbox) {
                    elements.lockSessionKeyCheckbox.checked = false;
                }
            }
            
            // Load share options from storage
            if (loadShareOptions) {
                loadShareOptions();
            } else {
                // Set default checkboxes if loadShareOptions is not provided
                if (elements.shareApiKeyCheckbox) {
                    elements.shareApiKeyCheckbox.checked = true;
                }
                
                if (elements.shareSystemPromptCheckbox) {
                    elements.shareSystemPromptCheckbox.checked = false;
                }
                
                if (elements.shareConversationCheckbox) {
                    elements.shareConversationCheckbox.checked = false;
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
            
            // Initialize link length bar
            updateLinkLengthBar();
            
            // Show modal
            elements.shareModal.classList.add('active');
            
            return true;
        }
        
        /**
         * Hide the share modal
         */
        function hideShareModal() {
            elements.shareModal.classList.remove('active');
        }
        
        /**
         * Toggle password visibility in share modal
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
         * Update the link length bar in share modal
         * @param {string} apiKey - Current API key
         * @param {string} systemPrompt - Current system prompt
         * @param {string} currentModel - Current model ID
         * @param {Array} messages - Current messages
         */
        function updateLinkLengthBar(apiKey, systemPrompt, currentModel, messages) {
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
            
            // Add conversation data if selected
            if (elements.shareConversationCheckbox && elements.shareConversationCheckbox.checked && messages.length > 0) {
                const messageCount = parseInt(elements.messageHistoryCount.value, 10) || 1;
                const startIndex = Math.max(0, messages.length - messageCount);
                const messagesToInclude = messages.slice(startIndex);
                
                // Estimate the length of the messages
                messagesToInclude.forEach(msg => {
                    estimatedLength += msg.content.length + 10; // 10 for role and JSON overhead
                });
            }
            
            // Account for base64 encoding (which increases size by ~33%)
            estimatedLength = Math.ceil(estimatedLength * 1.33);
            
            // Add overhead for encryption (salt, nonce, etc.)
            estimatedLength += 100; // Approximate overhead
            
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
         * Update the model info display in the header
         * @param {string} currentModel - Current model ID
         */
        function updateModelInfoDisplay(currentModel) {
            if (!currentModel) {
                // Clear all fields if no model is selected
                if (elements.modelNameElement) {
                    elements.modelNameElement.textContent = 'No model selected';
                }
                if (elements.modelDeveloperElement) {
                    elements.modelDeveloperElement.textContent = '';
                }
                if (elements.modelContextElement) {
                    elements.modelContextElement.textContent = '';
                }
                updateContextUsage(0);
                return;
            }
            
            // Get a simplified display name for the model
            const displayName = ModelInfoService.getDisplayName(currentModel);
            
            // Update model name
            if (elements.modelNameElement) {
                elements.modelNameElement.textContent = displayName;
            }
            
            // Determine the provider based on the base URL and model ID
            let provider = '';
            const baseUrl = StorageService.getBaseUrl();
            
            if (baseUrl) {
                if (baseUrl.includes('groq.com')) {
                    provider = 'Groq';
                } else if (baseUrl.includes('openai.com')) {
                    provider = 'OpenAI';
                } else if (baseUrl.includes('localhost:11434')) {
                    provider = 'Ollama';
                } else {
                    provider = 'Custom';
                }
            }
            
            // Determine model developer based on model ID
            if (currentModel.includes('llama')) {
                provider = 'Meta';
            } else if (currentModel.includes('gemma')) {
                provider = 'Google';
            } else if (currentModel.includes('mistral') || currentModel.includes('mixtral')) {
                provider = 'Mistral AI';
            } else if (currentModel.includes('claude')) {
                provider = 'Anthropic';
            }
            
            // Move model developer to the model stats section
            if (elements.modelDeveloperElement) {
                // Remove from active-model section
                elements.modelDeveloperElement.textContent = '';
            }
            
            // Create or update provider element in model stats
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
                
                // Update the provider text
                providerElement.textContent = provider;
            }
            
            if (elements.modelContextElement) {
                elements.modelContextElement.textContent = '';
            }
            
            // Initialize context usage display
            updateContextUsage(0);
        }
        
        /**
         * Update the context usage display
         * @param {number} percentage - Usage percentage (0-100)
         */
        function updateContextUsage(percentage) {
            UIUtils.updateContextUsage(elements.usageFill, elements.usageText, percentage);
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
                        correctLevel: QRCode.CorrectLevel.L // Low error correction level for longer data
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
            showApiKeyModal,
            hideApiKeyModal,
            showSettingsModal,
            hideSettingsModal,
            showShareModal,
            hideShareModal,
            togglePasswordVisibility,
            toggleMessageHistoryInput,
            updateLinkLengthBar,
            updateModelInfoDisplay,
            updateContextUsage,
            generateShareQRCode
        };
    }

    // Public API
    return {
        createUIManager: createUIManager
    };
})();
