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
        
        // Store globally for MCP and other components to access
        window.functionCallingManager = this.functionCallingManager;
        this.promptsManager = PromptsManager.createPromptsManager(this.elements);
        
        // Make chatManager accessible globally for the close GPT button
        window.aiHackare = this;
        
        // Initialize model selector functionality after everything is loaded
        this.initializeModelSelection();
        
        // Add global test function
        window.testModelSelector = () => {
            console.log('🧪 Testing model selector modal...');
            this.showModelSelectorModal();
        };
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
        
        // MCP servers button click
        if (this.elements.mcpServersBtn) {
            this.elements.mcpServersBtn.addEventListener('click', () => {
                this.functionCallingManager.showMcpServersModal();
            });
        }
        
        // Function button click
        if (this.elements.functionBtn) {
            this.elements.functionBtn.addEventListener('click', () => {
                this.functionCallingManager.showFunctionModal();
            });
        }
        
        // Copy chat button click
        if (this.elements.copyChatBtn) {
            this.elements.copyChatBtn.addEventListener('click', () => {
                this.copyChatContent();
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
            
            if (this.elements.shareFunctionLibraryCheckbox) {
                this.elements.shareFunctionLibraryCheckbox.addEventListener('change', () => {
                    this.updateLinkLengthBar();
                });
            }
            
            // Handle MCP connections checkbox with fallback for timing issues
            let mcpCheckbox = this.elements.shareMcpConnectionsCheckbox;
            if (!mcpCheckbox) {
                // Fallback: Query directly if DOMElements missed it due to timing
                mcpCheckbox = document.getElementById('share-mcp-connections');
                console.log('MCP checkbox fallback query result:', !!mcpCheckbox);
            }
            
            if (mcpCheckbox) {
                // Add change event listener
                mcpCheckbox.addEventListener('change', () => {
                    console.log('MCP checkbox changed to:', mcpCheckbox.checked);
                    this.updateLinkLengthBar();
                });
                console.log('✅ MCP checkbox event listener attached successfully');
            } else {
                console.error('❌ MCP checkbox not found even with fallback');
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
                console.log('AIHackare: Generate share link button found, adding event listener');
                this.elements.generateShareLinkBtn.addEventListener('click', () => {
                    console.log('AIHackare: Generate share link button clicked!');
                    this.generateComprehensiveShareLink();
                });
            } else {
                console.error('AIHackare: Generate share link button NOT found in elements');
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
        this.elements.clearChatBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Prevent event bubbling
            
            if (confirm('Are you sure you want to clear the chat history?')) {
                this.clearChatHistory();
            }
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
            if (e.target === this.elements.mcpServersModal) {
                this.functionCallingManager.hideMcpServersModal();
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
                this.hideModelSelectorModal();
                this.promptsManager.hidePromptsModal();
                this.uiManager.hideFunctionModal();
            }
            
            // Enter to send message, Shift+Enter for newline
            if (e.key === 'Enter') {
                if (document.activeElement === this.elements.messageInput) {
                    if (e.shiftKey) {
                        // Shift+Enter: allow default behavior (newline)
                        return;
                    } else {
                        // Plain Enter: send message
                        e.preventDefault();
                        this.sendMessage();
                    }
                }
            }
        });
    };
    
    /**
     * Send a message
     */
    AIHackare.prototype.sendMessage = function() {
        // Check if currently generating - if so, stop generation
        if (this.chatManager.getIsGenerating()) {
            this.chatManager.stopGeneration();
            return;
        }
        
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
            this.shareManager.getSharedWelcomeMessage(),
            this.shareManager.loadShareOptions.bind(this.shareManager),
            this.shareManager.getSharedLinkOptions()
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
        if (this.uiManager?.updateLinkLengthBar) {
            try {
                this.uiManager.updateLinkLengthBar(
                    this.settingsManager.getApiKey(),
                    this.settingsManager.getSystemPrompt(),
                    this.settingsManager.getCurrentModel(),
                    this.chatManager.getMessages()
                );
            } catch (error) {
                console.error('Error updating link length:', error);
            }
        }
    };
    
    /**
     * Toggle message history input
     */
    AIHackare.prototype.toggleMessageHistoryInput = function() {
        this.uiManager.toggleMessageHistoryInput();
        this.updateLinkLengthBar();
    };
    
    /**
     * Ensure MCP checkbox works by cloning from a working checkbox if needed
     */
    AIHackare.prototype.ensureMcpCheckboxWorks = function() {
        const mcpCheckbox = document.getElementById('share-mcp-connections');
        const mcpGroup = mcpCheckbox?.parentElement;
        
        if (!mcpCheckbox || !mcpGroup) {
            console.warn('MCP checkbox not found for failsafe check');
            return;
        }
        
        // Test if the checkbox is responsive by checking what element is at its center
        const rect = mcpCheckbox.getBoundingClientRect();
        const elementAtCenter = document.elementFromPoint(
            rect.left + rect.width/2, 
            rect.top + rect.height/2
        );
        
        // If the checkbox is not accessible at its center point, fix it
        if (elementAtCenter !== mcpCheckbox) {
            console.log('MCP checkbox is not responsive, applying failsafe fix...');
            
            // Find a working checkbox to clone from
            const workingGroup = document.querySelector('input[id="share-function-library"]')?.parentElement;
            
            if (workingGroup) {
                // Clone the working checkbox structure
                const clonedGroup = workingGroup.cloneNode(true);
                
                // Update the cloned elements for MCP
                const clonedInput = clonedGroup.querySelector('input');
                const clonedLabel = clonedGroup.querySelector('label');
                
                clonedInput.id = 'share-mcp-connections';
                clonedInput.checked = mcpCheckbox.checked; // Preserve current state
                clonedLabel.setAttribute('for', 'share-mcp-connections');
                clonedLabel.textContent = 'MCP Connections';
                
                // Replace the broken group with the cloned working one
                mcpGroup.parentElement.replaceChild(clonedGroup, mcpGroup);
                
                // Re-add the event listener
                clonedInput.addEventListener('change', () => {
                    this.updateLinkLengthBar();
                });
                
                console.log('✅ MCP checkbox fixed with failsafe clone');
            }
        }
    };

    /**
     * Generate a comprehensive share link
     */
    AIHackare.prototype.generateComprehensiveShareLink = async function() {
        console.log('AIHackare: generateComprehensiveShareLink called');
        // Save share options before generating the link
        this.shareManager.saveShareOptions();
        
        // Generate the share link
        const success = await this.shareManager.generateComprehensiveShareLink(
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
     * Initialize model selection functionality
     */
    AIHackare.prototype.initializeModelSelection = function() {
        console.log('🚀 AIHackare: Initializing model selection manager...');
        
        // Initialize the ModelSelectionManager with DOM elements
        if (window.ModelSelectionManager) {
            // Use setTimeout to ensure elements are ready
            setTimeout(() => {
                window.ModelSelectionManager.init(this.elements);
                console.log('✅ AIHackare: ModelSelectionManager initialized');
            }, 100);
        } else {
            console.error('❌ AIHackare: ModelSelectionManager not available');
        }
    };
    
    /**
     * Initialize model selector functionality (legacy)
     */
    AIHackare.prototype.initializeModelSelector = function() {
        console.log('🚀 AIHackare: Initializing model selector...');
        
        // Wait for DOM to be ready
        setTimeout(() => {
            console.log('🚀 AIHackare: Adding model selector event listeners...');
            
            // Add click handlers to model info elements
            const modelNameDisplay = this.elements.modelNameDisplay;
            const modelContextElement = this.elements.modelContextElement;
            const modelStats = this.elements.modelStats;
            
            console.log('🚀 AIHackare: Elements check:');
            console.log('  - modelNameDisplay:', !!modelNameDisplay);
            console.log('  - modelContextElement:', !!modelContextElement);
            console.log('  - modelStats:', !!modelStats);
            
            if (modelNameDisplay) {
                modelNameDisplay.addEventListener('click', () => {
                    console.log('🚀 AIHackare: Model name clicked!');
                    this.showModelSelectorModal();
                });
                modelNameDisplay.style.cursor = 'pointer';
                modelNameDisplay.title = 'Click to select model (Ctrl+Shift+M or Alt+M)';
                console.log('🚀 AIHackare: Model name display click handler added');
            }
            
            if (modelContextElement) {
                modelContextElement.addEventListener('click', () => {
                    console.log('🚀 AIHackare: Model context clicked!');
                    this.showModelSelectorModal();
                });
                modelContextElement.style.cursor = 'pointer';
                modelContextElement.title = 'Click to select model (Ctrl+Shift+M or Alt+M)';
                console.log('🚀 AIHackare: Model context click handler added');
            }
            
            if (modelStats) {
                modelStats.addEventListener('click', () => {
                    console.log('🚀 AIHackare: Model stats clicked!');
                    this.showModelSelectorModal();
                });
                modelStats.style.cursor = 'pointer';
                modelStats.title = 'Click to select model (Ctrl+Shift+M or Alt+M)';
                console.log('🚀 AIHackare: Model stats click handler added');
            }
            
            // Add keyboard shortcut
            document.addEventListener('keydown', (e) => {
                // Ctrl+Shift+M or Alt+M
                if ((e.ctrlKey && e.shiftKey && (e.key === 'm' || e.key === 'M')) ||
                    (e.altKey && (e.key === 'm' || e.key === 'M'))) {
                    console.log('🚀 AIHackare: Model selector keyboard shortcut triggered!');
                    e.preventDefault();
                    e.stopPropagation();
                    this.showModelSelectorModal();
                }
            });
            
            console.log('🚀 AIHackare: Model selector initialization complete');
        }, 1000); // Wait 1 second for everything to be ready
    };
    
    /**
     * Show the model selector modal
     */
    AIHackare.prototype.showModelSelectorModal = function() {
        console.log('🚀 AIHackare: showModelSelectorModal called');
        
        // Try UI manager first
        if (this.uiManager && this.uiManager.showModelSelectorModal) {
            console.log('🚀 AIHackare: Calling uiManager.showModelSelectorModal');
            this.uiManager.showModelSelectorModal();
            return;
        }
        
        // Fallback: directly show the modal
        console.log('🚀 AIHackare: UI manager not available, trying direct modal show');
        const modal = document.getElementById('model-selector-modal');
        if (modal) {
            console.log('🚀 AIHackare: Found modal, adding active class');
            modal.classList.add('active');
            
            // Populate the modal with current models and setup handlers
            this.populateModelSelectorModal();
            
            // Add ESC key handler
            const escapeHandler = (e) => {
                if (e.key === 'Escape') {
                    console.log('🚀 AIHackare: Escape key pressed, closing modal');
                    this.hideModelSelectorModal();
                    document.removeEventListener('keydown', escapeHandler);
                }
            };
            document.addEventListener('keydown', escapeHandler);
            
        } else {
            console.error('🚀 AIHackare: Model selector modal element not found');
        }
    };
    
    /**
     * Hide the model selector modal
     */
    AIHackare.prototype.hideModelSelectorModal = function() {
        if (this.uiManager && this.uiManager.hideModelSelectorModal) {
            this.uiManager.hideModelSelectorModal();
        } else {
            // Fallback: directly hide the modal
            const modal = document.getElementById('model-selector-modal');
            if (modal) {
                modal.classList.remove('active');
            }
        }
    };
    
    /**
     * Populate the model selector modal with available models
     */
    AIHackare.prototype.populateModelSelectorModal = function() {
        console.log('🚀 AIHackare: Populating model selector modal');
        
        const modelSelectorSelect = document.getElementById('model-selector-select');
        const mainModelSelect = this.elements.modelSelect;
        
        if (!modelSelectorSelect || !mainModelSelect) {
            console.error('🚀 AIHackare: Required select elements not found');
            return;
        }
        
        // Clear existing options
        modelSelectorSelect.innerHTML = '';
        
        // Copy options from main model select
        const currentModel = this.settingsManager?.componentManagers?.model?.getCurrentModel();
        console.log('🚀 AIHackare: Current model:', currentModel);
        
        for (let i = 0; i < mainModelSelect.options.length; i++) {
            const option = mainModelSelect.options[i];
            const newOption = document.createElement('option');
            newOption.value = option.value;
            newOption.textContent = option.textContent;
            newOption.disabled = option.disabled;
            
            if (option.value === currentModel) {
                newOption.selected = true;
            }
            
            // Handle optgroups
            if (option.parentNode.tagName === 'OPTGROUP') {
                let optgroup = modelSelectorSelect.querySelector(`optgroup[label="${option.parentNode.label}"]`);
                if (!optgroup) {
                    optgroup = document.createElement('optgroup');
                    optgroup.label = option.parentNode.label;
                    modelSelectorSelect.appendChild(optgroup);
                }
                optgroup.appendChild(newOption);
            } else {
                modelSelectorSelect.appendChild(newOption);
            }
        }
        
        // Add event listeners for modal buttons
        this.setupModelSelectorModalListeners();
    };
    
    /**
     * Setup event listeners for model selector modal buttons
     */
    AIHackare.prototype.setupModelSelectorModalListeners = function() {
        console.log('🚀 AIHackare: Setting up modal button listeners...');
        
        const applyBtn = document.getElementById('model-selector-apply-btn');
        const cancelBtn = document.getElementById('model-selector-cancel-btn');
        const reloadBtn = document.getElementById('model-selector-reload-btn');
        const modal = document.getElementById('model-selector-modal');
        
        console.log('🚀 AIHackare: Button elements found:');
        console.log('  - applyBtn:', !!applyBtn);
        console.log('  - cancelBtn:', !!cancelBtn);
        console.log('  - reloadBtn:', !!reloadBtn);
        console.log('  - modal:', !!modal);
        
        // Store reference to this for use in event handlers
        const self = this;
        
        if (applyBtn) {
            // Remove any existing listeners by cloning
            const newApplyBtn = applyBtn.cloneNode(true);
            applyBtn.parentNode.replaceChild(newApplyBtn, applyBtn);
            newApplyBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🚀 AIHackare: Apply button clicked');
                self.applyModelSelection();
            });
            console.log('🚀 AIHackare: Apply button listener added');
        }
        
        if (cancelBtn) {
            const newCancelBtn = cancelBtn.cloneNode(true);
            cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
            newCancelBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🚀 AIHackare: Cancel button clicked');
                self.hideModelSelectorModal();
            });
            console.log('🚀 AIHackare: Cancel button listener added');
        }
        
        if (reloadBtn) {
            const newReloadBtn = reloadBtn.cloneNode(true);
            reloadBtn.parentNode.replaceChild(newReloadBtn, reloadBtn);
            newReloadBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🚀 AIHackare: Reload button clicked');
                self.reloadModels();
            });
            console.log('🚀 AIHackare: Reload button listener added');
        }
        
        // Close modal when clicking outside
        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    console.log('🚀 AIHackare: Clicked outside modal, closing');
                    self.hideModelSelectorModal();
                }
            });
            console.log('🚀 AIHackare: Modal outside click listener added');
        }
        
        console.log('🚀 AIHackare: All modal listeners setup complete');
    };
    
    /**
     * Apply the selected model from the modal
     */
    AIHackare.prototype.applyModelSelection = function() {
        const modelSelectorSelect = document.getElementById('model-selector-select');
        if (!modelSelectorSelect) return;
        
        const selectedModel = modelSelectorSelect.value;
        console.log('🚀 AIHackare: Applying model selection:', selectedModel);
        
        if (selectedModel && this.settingsManager?.componentManagers?.model) {
            this.settingsManager.componentManagers.model.saveModel(selectedModel);
            
            // Update main model select
            if (this.elements.modelSelect) {
                this.elements.modelSelect.value = selectedModel;
            }
            
            // Update context usage if available
            if (this.chatManager && this.uiManager) {
                this.chatManager.estimateContextUsage(
                    this.uiManager.updateContextUsage.bind(this.uiManager),
                    selectedModel
                );
            }
        }
        
        this.hideModelSelectorModal();
    };
    
    /**
     * Reload models from API
     */
    AIHackare.prototype.reloadModels = function() {
        console.log('🚀 AIHackare: Reloading models...');
        
        // Invalidate model selection cache
        if (window.ModelSelectionManager && window.ModelSelectionManager.invalidateCache) {
            window.ModelSelectionManager.invalidateCache();
        }
        
        if (this.settingsManager?.componentManagers?.model) {
            const apiKey = StorageService.getApiKey();
            const baseUrl = StorageService.getBaseUrl();
            
            if (apiKey) {
                this.settingsManager.componentManagers.model.fetchAvailableModels(apiKey, baseUrl, false)
                    .then((result) => {
                        if (result.success) {
                            console.log('🚀 AIHackare: Models reloaded successfully');
                            this.populateModelSelectorModal();
                        } else {
                            console.error('🚀 AIHackare: Failed to reload models:', result.error);
                        }
                    })
                    .catch((error) => {
                        console.error('🚀 AIHackare: Error reloading models:', error);
                    });
            } else {
                console.error('🚀 AIHackare: No API key available for reloading models');
            }
        }
    };
    
    /**
     * Copy chat content to clipboard
     */
    AIHackare.prototype.copyChatContent = function() {
        const success = UIUtils.copyChatContent(this.elements.chatMessages);
        
        if (success) {
            this.chatManager.addSystemMessage('Chat content copied to clipboard.');
        } else {
            this.chatManager.addSystemMessage('Failed to copy chat content. Please try again.');
        }
    };

    // Return the constructor
    return {
        AIHackare: AIHackare
    };
})();
