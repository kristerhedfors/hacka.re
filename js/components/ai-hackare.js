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
        this.apiToolsManager = ApiToolsManager.createApiToolsManager(this.elements);
        this.functionCallingManager = FunctionCallingManager.createFunctionCallingManager(
            this.elements, 
            this.chatManager ? this.chatManager.addSystemMessage.bind(this.chatManager) : null
        );
        this.promptsManager = PromptsManager.createPromptsManager(this.elements);
        
        // Make chatManager accessible globally for the close GPT button
        window.aiHackare = this;
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
        this.apiToolsManager.init();
        this.functionCallingManager.init();
        this.promptsManager.init();
        
        // Initialize context usage display with current messages and system prompt
        this.chatManager.estimateContextUsage(
            this.uiManager.updateContextUsage.bind(this.uiManager),
            this.settingsManager.getCurrentModel()
        );
        
        // Add tool calling setting to settings form with system message callback
        this.apiToolsManager.addToolCallingSetting(
            this.elements.settingsForm,
            this.chatManager.addSystemMessage.bind(this.chatManager)
        );
        
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
        
        // Prompts button click
        if (this.elements.promptsBtn) {
            this.elements.promptsBtn.addEventListener('click', () => {
                this.promptsManager.showPromptsModal();
            });
        }
        
        // Function button click
        if (this.elements.functionBtn) {
            this.elements.functionBtn.addEventListener('click', () => {
                this.functionCallingManager.showFunctionModal();
            });
        }
        
        
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
            
            // Add event listeners for link length calculation only (not saving options)
            if (this.elements.shareBaseUrlCheckbox) {
                this.elements.shareBaseUrlCheckbox.addEventListener('change', () => {
                    this.updateLinkLengthBar();
                });
            }
            
            if (this.elements.shareApiKeyCheckbox) {
                this.elements.shareApiKeyCheckbox.addEventListener('change', () => {
                    this.updateLinkLengthBar();
                });
            }
            
            if (this.elements.shareSystemPromptCheckbox) {
                this.elements.shareSystemPromptCheckbox.addEventListener('change', () => {
                    this.updateLinkLengthBar();
                });
            }
            
            if (this.elements.shareModelCheckbox) {
                this.elements.shareModelCheckbox.addEventListener('change', () => {
                    this.updateLinkLengthBar();
                });
            }
            
            if (this.elements.sharePromptLibraryCheckbox) {
                this.elements.sharePromptLibraryCheckbox.addEventListener('change', () => {
                    this.updateLinkLengthBar();
                });
            }
            
            if (this.elements.shareConversationCheckbox) {
                this.elements.shareConversationCheckbox.addEventListener('change', () => {
                    this.toggleMessageHistoryInput();
                });
            }
            
            if (this.elements.messageHistoryCount) {
                this.elements.messageHistoryCount.addEventListener('input', () => {
                    this.updateLinkLengthBar();
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
        
        // Show system prompt button
        if (this.elements.showSystemPromptBtn) {
            this.elements.showSystemPromptBtn.addEventListener('click', (e) => {
                e.preventDefault();
                // Toggle system prompt preview
                if (this.elements.systemPromptPreview) {
                    const isVisible = this.elements.systemPromptPreview.style.display !== 'none';
                    
                    if (isVisible) {
                        // Hide the preview
                        this.elements.systemPromptPreview.style.display = 'none';
                        this.elements.showSystemPromptBtn.textContent = 'Show System Prompt';
                    } else {
                        // Show the preview with the current system prompt
                        const currentPrompt = this.settingsManager.getSystemPrompt();
                        this.elements.systemPromptPreview.innerHTML = `<pre style="margin: 0; white-space: pre-wrap; word-break: break-word;">${currentPrompt}</pre>`;
                        this.elements.systemPromptPreview.style.display = 'block';
                        this.elements.showSystemPromptBtn.textContent = 'Hide System Prompt';
                    }
                }
            });
        }
        
        // Open prompts configurator button
        if (this.elements.openPromptsConfigBtn) {
            this.elements.openPromptsConfigBtn.addEventListener('click', (e) => {
                e.preventDefault();
                // Hide the settings modal
                if (this.elements.settingsModal) {
                    this.elements.settingsModal.classList.remove('active');
                }
                
                // Show the prompts modal using the promptsManager
                this.promptsManager.showPromptsModal();
            });
        }
        
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
            if (e.target === this.elements.promptsModal) {
                this.promptsManager.hidePromptsModal();
            }
            if (e.target === this.elements.functionModal) {
                this.uiManager.hideFunctionModal();
            }
        });
        
        // Close function modal button
        if (this.elements.closeFunctionModal) {
            this.elements.closeFunctionModal.addEventListener('click', () => {
                this.uiManager.hideFunctionModal();
            });
        }
        
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
                this.promptsManager.hidePromptsModal();
                this.uiManager.hideFunctionModal();
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
            this.uiManager.updateContextUsage.bind(this.uiManager),
            this.apiToolsManager,
            null, // Removed MCP manager
            this.functionCallingManager
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
        this.uiManager.showShareModal(
            this.settingsManager.getApiKey(),
            this.updateLinkLengthBar.bind(this),
            this.shareManager.getSessionKey(),
            this.shareManager.isSessionKeyLocked(),
            this.shareManager.loadShareOptions.bind(this.shareManager)
        );
        
        // Add a warning message if no API key is configured
        if (!this.settingsManager.getApiKey()) {
            this.chatManager.addSystemMessage('Note: No API key configured. You can still share other settings, but the recipient will need to provide their own API key.');
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
        // Save share options before generating the link
        this.shareManager.saveShareOptions();
        
        // Generate the share link
        const success = this.shareManager.generateComprehensiveShareLink(
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
     * Hide the model selection menu (stub for compatibility)
     */
    AIHackare.prototype.hideModelSelectionMenu = function() {
        // This is kept as a stub for compatibility with existing code
        // that might call this method, but the actual functionality has been removed
    };

    // Return the constructor
    return {
        AIHackare: AIHackare
    };
})();
