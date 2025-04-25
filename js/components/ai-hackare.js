/**
 * AIHackare Class
 * Main class for the AIHackare chat application
 */

window.AIHackareComponent = (function() {
    /**
     * AIHackare class constructor
     * @constructor
     */
    function AIHackare() {
        // Get DOM elements
        this.elements = DOMElements.getElements();
        
        // Create managers
        this.uiManager = UIManager.createUIManager(this.elements);
        this.chatManager = ChatManager.createChatManager(this.elements);
        this.settingsManager = SettingsManager.createSettingsManager(this.elements);
        this.shareManager = ShareManager.createShareManager(this.elements);
        
        // Create API tools manager if available
        if (window.ApiToolsManager) {
            this.apiToolsManager = ApiToolsManager.createApiToolsManager(this.elements);
        }
    }
    
    /**
     * Initialize the application
     */
    AIHackare.prototype.init = function() {
        // Initialize share manager first to set up session key
        this.shareManager.init();
        
        // Initialize settings manager with access to share manager's session key and chat manager's setMessages
        this.settingsManager.init(
            this.uiManager.updateModelInfoDisplay.bind(this.uiManager),
            this.uiManager.showApiKeyModal.bind(this.uiManager),
            this.chatManager.addSystemMessage.bind(this.chatManager),
            this.shareManager.getSessionKey.bind(this.shareManager),
            this.chatManager.setMessages.bind(this.chatManager)
        );
        
        this.chatManager.init();
        
        // Initialize API tools manager if available
        if (this.apiToolsManager) {
            this.apiToolsManager.init();
        }
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Auto-resize textarea
        UIUtils.setupTextareaAutoResize(this.elements.messageInput);
    };
    
    /**
     * Set up event listeners
     */
    AIHackare.prototype.setupEventListeners = function() {
        // Chat form submission
        this.elements.chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });
        
        // API key form submission
        this.elements.apiKeyForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveApiKey();
        });
        
        // Share button click
        if (this.elements.shareBtn) {
            this.elements.shareBtn.addEventListener('click', () => {
                this.showShareModal();
            });
        }
        
        // Settings button click
        this.elements.settingsBtn.addEventListener('click', () => {
            this.showSettingsModal();
        });
        
        // Model info button click
        if (this.elements.modelInfoBtn) {
            this.elements.modelInfoBtn.addEventListener('click', () => {
                this.toggleModelSelectionMenu();
            });
        }
        
        // Close model menu button click
        if (document.getElementById('close-model-menu')) {
            document.getElementById('close-model-menu').addEventListener('click', () => {
                this.hideModelSelectionMenu();
            });
        }
        
        // Go to settings button click in model menu
        if (document.getElementById('go-to-settings')) {
            document.getElementById('go-to-settings').addEventListener('click', () => {
                this.hideModelSelectionMenu();
                this.showSettingsModal();
            });
        }
        
        // Close model menu when clicking outside
        document.addEventListener('click', (e) => {
            const modelMenu = document.getElementById('model-selection-menu');
            const modelInfoBtn = this.elements.modelInfoBtn;
            
            if (modelMenu && modelMenu.classList.contains('active') && 
                !modelMenu.contains(e.target) && 
                modelInfoBtn && !modelInfoBtn.contains(e.target)) {
                this.hideModelSelectionMenu();
            }
        });
        
        // Share modal event listeners
        if (this.elements.shareModal) {
            // Regenerate password button
            if (this.elements.regeneratePasswordBtn) {
                this.elements.regeneratePasswordBtn.addEventListener('click', () => {
                    this.shareManager.regeneratePassword();
                });
            }
            
            // Lock session key checkbox
            if (this.elements.lockSessionKeyCheckbox) {
                this.elements.lockSessionKeyCheckbox.addEventListener('change', () => {
                    this.shareManager.toggleSessionKeyLock(this.chatManager.addSystemMessage.bind(this.chatManager));
                });
            }
            
            // Add event listeners for link length calculation and save options
            if (this.elements.shareBaseUrlCheckbox) {
                this.elements.shareBaseUrlCheckbox.addEventListener('change', () => {
                    this.updateLinkLengthBar();
                    this.shareManager.saveShareOptions();
                });
            }
            
            if (this.elements.shareApiKeyCheckbox) {
                this.elements.shareApiKeyCheckbox.addEventListener('change', () => {
                    this.updateLinkLengthBar();
                    this.shareManager.saveShareOptions();
                });
            }
            
            if (this.elements.shareSystemPromptCheckbox) {
                this.elements.shareSystemPromptCheckbox.addEventListener('change', () => {
                    this.updateLinkLengthBar();
                    this.shareManager.saveShareOptions();
                });
            }
            
            if (this.elements.shareModelCheckbox) {
                this.elements.shareModelCheckbox.addEventListener('change', () => {
                    this.updateLinkLengthBar();
                    this.shareManager.saveShareOptions();
                });
            }
            
            if (this.elements.shareConversationCheckbox) {
                this.elements.shareConversationCheckbox.addEventListener('change', () => {
                    this.toggleMessageHistoryInput();
                    this.shareManager.saveShareOptions();
                });
            }
            
            if (this.elements.messageHistoryCount) {
                this.elements.messageHistoryCount.addEventListener('input', () => {
                    this.updateLinkLengthBar();
                    this.shareManager.saveShareOptions();
                });
            }
            
            // Toggle password visibility button
            if (this.elements.togglePasswordVisibilityBtn) {
                this.elements.togglePasswordVisibilityBtn.addEventListener('click', () => {
                    this.uiManager.togglePasswordVisibility();
                });
            }
            
            // Copy password button
            if (this.elements.copyPasswordBtn) {
                this.elements.copyPasswordBtn.addEventListener('click', () => {
                    this.shareManager.copyPassword(this.chatManager.addSystemMessage.bind(this.chatManager));
                });
            }
            
            // This is a duplicate event listener for shareConversationCheckbox, so we can remove it
            
            // Generate share link button
            if (this.elements.generateShareLinkBtn) {
                this.elements.generateShareLinkBtn.addEventListener('click', () => {
                    this.generateComprehensiveShareLink();
                });
            }
            
            // Close share modal button
            if (this.elements.closeShareModalBtn) {
                this.elements.closeShareModalBtn.addEventListener('click', () => {
                    this.uiManager.hideShareModal();
                });
            }
            
            // Copy generated link button
            if (this.elements.copyGeneratedLinkBtn) {
                this.elements.copyGeneratedLinkBtn.addEventListener('click', () => {
                    this.shareManager.copyGeneratedLink(this.chatManager.addSystemMessage.bind(this.chatManager));
                });
            }
            
            // Close modal when clicking outside
            window.addEventListener('click', (e) => {
                if (e.target === this.elements.shareModal) {
                    this.uiManager.hideShareModal();
                }
            });
        }
        
        // Settings form submission
        this.elements.settingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSettings();
        });
        
        // Close settings button
        this.elements.closeSettings.addEventListener('click', () => {
            this.uiManager.hideSettingsModal(
                this.settingsManager.getApiKey(),
                this.settingsManager.getBaseUrl(),
                this.settingsManager.getCurrentModel(),
                this.settingsManager.getSystemPrompt()
            );
        });
        
        // Clear all settings link
        if (this.elements.clearAllSettings) {
            this.elements.clearAllSettings.addEventListener('click', (e) => {
                e.preventDefault();
                if (confirm('Are you sure you want to clear all settings? This will remove your API key and reset all preferences.')) {
                    this.settingsManager.clearAllSettings(
                        this.uiManager.hideSettingsModal.bind(this.uiManager),
                        this.chatManager.addSystemMessage.bind(this.chatManager)
                    );
                }
            });
        }
        
        // Clear chat button
        this.elements.clearChat.addEventListener('click', (e) => {
            e.preventDefault();
            this.clearChatHistory();
        });
        
        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === this.elements.apiKeyModal) {
                this.uiManager.hideApiKeyModal();
            }
            if (e.target === this.elements.settingsModal) {
                this.uiManager.hideSettingsModal(
                    this.settingsManager.getApiKey(),
                    this.settingsManager.getBaseUrl(),
                    this.settingsManager.getCurrentModel(),
                    this.settingsManager.getSystemPrompt()
                );
            }
        });
        
        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Escape key to close modals
            if (e.key === 'Escape') {
                this.uiManager.hideApiKeyModal();
                this.uiManager.hideSettingsModal(
                    this.settingsManager.getApiKey(),
                    this.settingsManager.getBaseUrl(),
                    this.settingsManager.getCurrentModel(),
                    this.settingsManager.getSystemPrompt()
                );
                this.hideModelSelectionMenu();
            }
            
            // Ctrl/Cmd + Enter to send message
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                if (document.activeElement === this.elements.messageInput) {
                    e.preventDefault();
                    this.sendMessage();
                }
            }
        });
    };
    
    /**
     * Send a message
     */
    AIHackare.prototype.sendMessage = function() {
        const message = this.elements.messageInput.value.trim();
        
        this.chatManager.sendMessage(
            message,
            this.settingsManager.getApiKey(),
            this.settingsManager.getCurrentModel(),
            this.settingsManager.getSystemPrompt(),
            this.uiManager.showApiKeyModal.bind(this.uiManager),
            this.uiManager.updateContextUsage.bind(this.uiManager)
        );
    };
    
    /**
     * Save the API key
     */
    AIHackare.prototype.saveApiKey = function() {
        this.settingsManager.saveApiKey(
            this.uiManager.hideApiKeyModal.bind(this.uiManager),
            this.chatManager.addSystemMessage.bind(this.chatManager)
        );
    };
    
    /**
     * Save settings
     */
    AIHackare.prototype.saveSettings = function() {
        this.settingsManager.saveSettings(
            this.uiManager.hideSettingsModal.bind(this.uiManager),
            this.uiManager.updateModelInfoDisplay.bind(this.uiManager),
            this.chatManager.addSystemMessage.bind(this.chatManager)
        );
    };
    
    /**
     * Show the settings modal
     */
    AIHackare.prototype.showSettingsModal = function() {
        this.uiManager.showSettingsModal(
            this.settingsManager.getApiKey(),
            this.settingsManager.getCurrentModel(),
            this.settingsManager.getSystemPrompt(),
            this.settingsManager.fetchAvailableModels.bind(this.settingsManager),
            this.settingsManager.populateDefaultModels.bind(this.settingsManager)
        );
    };
    
    /**
     * Show the share modal
     */
    AIHackare.prototype.showShareModal = function() {
        const success = this.uiManager.showShareModal(
            this.settingsManager.getApiKey(),
            this.updateLinkLengthBar.bind(this),
            this.shareManager.getSessionKey(),
            this.shareManager.isSessionKeyLocked(),
            this.shareManager.loadShareOptions.bind(this.shareManager)
        );
        
        if (!success) {
            this.chatManager.addSystemMessage('Error: No API key available to share.');
        }
    };
    
    /**
     * Update the link length bar
     */
    AIHackare.prototype.updateLinkLengthBar = function() {
        this.uiManager.updateLinkLengthBar(
            this.settingsManager.getApiKey(),
            this.settingsManager.getSystemPrompt(),
            this.settingsManager.getCurrentModel(),
            this.chatManager.getMessages()
        );
    };
    
    /**
     * Toggle message history input
     */
    AIHackare.prototype.toggleMessageHistoryInput = function() {
        this.uiManager.toggleMessageHistoryInput();
        this.updateLinkLengthBar();
    };
    
    /**
     * Generate a comprehensive share link
     */
    AIHackare.prototype.generateComprehensiveShareLink = function() {
        this.shareManager.generateComprehensiveShareLink(
            this.settingsManager.getApiKey(),
            this.settingsManager.getSystemPrompt(),
            this.settingsManager.getCurrentModel(),
            this.chatManager.getMessages(),
            this.uiManager.generateShareQRCode.bind(this.uiManager),
            this.chatManager.addSystemMessage.bind(this.chatManager)
        );
    };
    
    /**
     * Clear chat history
     */
    AIHackare.prototype.clearChatHistory = function() {
        this.chatManager.clearChatHistory(
            this.uiManager.updateContextUsage.bind(this.uiManager)
        );
    };
    
    /**
     * Toggle the model selection menu
     */
    AIHackare.prototype.toggleModelSelectionMenu = function() {
        const modelMenu = document.getElementById('model-selection-menu');
        const currentModel = this.settingsManager.getCurrentModel();
        const modelName = this.elements.modelNameElement.textContent;
        const apiKey = this.settingsManager.getApiKey();
        const baseUrl = this.settingsManager.getBaseUrl();
        
        // Only go directly to settings if there's an API configuration error
        if (!apiKey || !baseUrl || modelName.includes('error')) {
            this.showSettingsModal();
            return;
        }
        
        if (modelMenu) {
            if (modelMenu.classList.contains('active')) {
                this.hideModelSelectionMenu();
            } else {
                // Position the menu
                const modelInfoBtn = this.elements.modelInfoBtn;
                if (modelInfoBtn) {
                    const rect = modelInfoBtn.getBoundingClientRect();
                    modelMenu.style.top = (rect.bottom + window.scrollY) + 'px';
                }
                
                // Populate model info
                this.populateModelCardInfo(currentModel);
                
                // Show the menu
                modelMenu.classList.add('active');
            }
        }
    };
    
    /**
     * Hide the model selection menu
     */
    AIHackare.prototype.hideModelSelectionMenu = function() {
        const modelMenu = document.getElementById('model-selection-menu');
        if (modelMenu) {
            modelMenu.classList.remove('active');
        }
    };
    
    /**
     * Populate the model card info
     * @param {string} modelId - The model ID
     */
    AIHackare.prototype.populateModelCardInfo = function(modelId) {
        const modelCardInfo = document.getElementById('model-card-info');
        if (!modelCardInfo) return;
        
        // Clear previous content
        modelCardInfo.innerHTML = '';
        
        // Get display name
        const displayName = ModelInfoService.getDisplayName(modelId);
        
        // Create model info HTML
        let html = '';
        
        // Add model ID
        html += this.createModelPropertyHTML('Model ID', modelId);
        
        // Add display name if different from ID
        if (displayName !== modelId) {
            html += this.createModelPropertyHTML('Display Name', displayName);
        }
        
        // Add provider info based on base URL
        const baseUrl = this.settingsManager.getBaseUrl();
        if (baseUrl) {
            let provider = 'Custom';
            if (baseUrl.includes('groq.com')) {
                provider = 'Groq Cloud';
            } else if (baseUrl.includes('openai.com')) {
                provider = 'OpenAI';
            } else if (baseUrl.includes('localhost:11434')) {
                provider = 'Ollama (Local)';
            }
            html += this.createModelPropertyHTML('Provider', provider);
        }
        
        // Add base URL
        html += this.createModelPropertyHTML('API Endpoint', baseUrl || 'Not configured');
        
        // Add a note about clicking on models
        html += '<div class="model-note" style="margin-top: 15px; font-style: italic; color: #666;">Click on any model in the list below to switch to it:</div>';
        
        // Add model selection dropdown with loading state
        html += '<div style="margin-top: 10px;">';
        html += '<select id="model-menu-select" style="width: 100%;">';
        html += '<option disabled selected>Loading models...</option>';
        html += '</select>';
        html += '</div>';
        
        // Set the initial HTML
        modelCardInfo.innerHTML = html;
        
        // Get the API key and base URL
        const apiKey = this.settingsManager.getApiKey();
        const currentBaseUrl = this.settingsManager.getBaseUrl();
        
        // Fetch models from the API
        if (apiKey && currentBaseUrl) {
            // Show loading state
            const modelMenuSelect = document.getElementById('model-menu-select');
            
            // Use the settings manager to fetch models
            this.settingsManager.fetchAvailableModels(apiKey, currentBaseUrl, false)
                .then(() => {
                    // Update the select with the fetched models
                    if (modelMenuSelect) {
                        // Clear the loading option
                        modelMenuSelect.innerHTML = '';
                        
                        // Clone options from the settings model select
                        const modelSelect = this.elements.modelSelect;
                        if (modelSelect && modelSelect.options.length > 0) {
                            Array.from(modelSelect.options).forEach(option => {
                                if (option.disabled) return; // Skip disabled options
                                
                                const selected = option.value === modelId ? 'selected' : '';
                                const optionEl = document.createElement('option');
                                optionEl.value = option.value;
                                optionEl.textContent = option.textContent;
                                optionEl.selected = option.value === modelId;
                                modelMenuSelect.appendChild(optionEl);
                            });
                        } else {
                            // If no options, add the current model
                            const optionEl = document.createElement('option');
                            optionEl.value = modelId;
                            optionEl.textContent = displayName;
                            optionEl.selected = true;
                            modelMenuSelect.appendChild(optionEl);
                        }
                        
                        // If no model is currently selected, select a default model based on the provider
                        if (!modelId || modelId === '') {
                            // Determine the provider from the base URL
                            let provider = 'groq'; // Default provider
                            if (currentBaseUrl) {
                                if (currentBaseUrl.includes('openai.com')) {
                                    provider = 'openai';
                                } else if (currentBaseUrl.includes('localhost:11434')) {
                                    provider = 'ollama';
                                }
                            }
                            
                            let modelToSelect = null;
                            
                            // For Ollama, select the first model in the list
                            if (provider === 'ollama') {
                                if (modelMenuSelect.options.length > 0) {
                                    modelToSelect = modelMenuSelect.options[0].value;
                                }
                            } else {
                                // For other providers, try to use the default model
                                const defaultModel = ModelInfoService.defaultModels[provider];
                                
                                // Check if the default model is available in the select options
                                let defaultModelAvailable = false;
                                for (let i = 0; i < modelMenuSelect.options.length; i++) {
                                    if (modelMenuSelect.options[i].value === defaultModel) {
                                        defaultModelAvailable = true;
                                        modelToSelect = defaultModel;
                                        break;
                                    }
                                }
                                
                                // If default model is not available, pick the first available model
                                if (!defaultModelAvailable && modelMenuSelect.options.length > 0) {
                                    modelToSelect = modelMenuSelect.options[0].value;
                                }
                            }
                            
                            // Apply the selected model if one was found
                            if (modelToSelect) {
                                modelMenuSelect.value = modelToSelect;
                                StorageService.saveModel(modelToSelect);
                                this.uiManager.updateModelInfoDisplay(modelToSelect);
                                console.log(`Selected model for ${provider}: ${modelToSelect}`);
                            }
                        }
                        
                        // Add event listener to the model select
                        modelMenuSelect.addEventListener('change', (e) => {
                            const selectedModel = e.target.value;
                            if (selectedModel && selectedModel !== modelId) {
                                // Save the selected model
                                StorageService.saveModel(selectedModel);
                                
                                // Update the model info display
                                this.uiManager.updateModelInfoDisplay(selectedModel);
                                
                                // Add a system message
                                this.chatManager.addSystemMessage(`Model changed to ${ModelInfoService.getDisplayName(selectedModel)}`);
                                
                                // Hide the menu
                                this.hideModelSelectionMenu();
                            }
                        });
                    }
                })
                .catch(error => {
                    console.error('Error fetching models for model menu:', error);
                    
                    // Show error state
                    if (modelMenuSelect) {
                        modelMenuSelect.innerHTML = '';
                        
                        // Add the current model as the only option
                        const optionEl = document.createElement('option');
                        optionEl.value = modelId;
                        optionEl.textContent = displayName;
                        optionEl.selected = true;
                        modelMenuSelect.appendChild(optionEl);
                        
                        // Add a disabled option explaining the error
                        const errorOption = document.createElement('option');
                        errorOption.disabled = true;
                        errorOption.textContent = 'Error loading models. Using current model only.';
                        modelMenuSelect.appendChild(errorOption);
                        
                        // Add event listener to the model select
                        modelMenuSelect.addEventListener('change', (e) => {
                            const selectedModel = e.target.value;
                            if (selectedModel && selectedModel !== modelId) {
                                // Save the selected model
                                StorageService.saveModel(selectedModel);
                                
                                // Update the model info display
                                this.uiManager.updateModelInfoDisplay(selectedModel);
                                
                                // Add a system message
                                this.chatManager.addSystemMessage(`Model changed to ${ModelInfoService.getDisplayName(selectedModel)}`);
                                
                                // Hide the menu
                                this.hideModelSelectionMenu();
                            }
                        });
                    }
                });
        } else {
            // No API key or base URL, just show the current model
            const modelMenuSelect = document.getElementById('model-menu-select');
            if (modelMenuSelect) {
                modelMenuSelect.innerHTML = '';
                
                // Add the current model as the only option
                const optionEl = document.createElement('option');
                optionEl.value = modelId;
                optionEl.textContent = displayName;
                optionEl.selected = true;
                modelMenuSelect.appendChild(optionEl);
                
                // Add a disabled option explaining the issue
                const errorOption = document.createElement('option');
                errorOption.disabled = true;
                errorOption.textContent = 'Configure API key and base URL in settings to see more models';
                modelMenuSelect.appendChild(errorOption);
            }
        }
    };
    
    /**
     * Create HTML for a model property
     * @param {string} name - Property name
     * @param {string} value - Property value
     * @returns {string} HTML string
     */
    AIHackare.prototype.createModelPropertyHTML = function(name, value) {
        return `
            <div class="model-property">
                <div class="property-name">${name}:</div>
                <div class="property-value">${value}</div>
            </div>
        `;
    };

    // Return the constructor
    return {
        AIHackare: AIHackare
    };
})();
