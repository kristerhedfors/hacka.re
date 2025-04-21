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
        // DOM Elements
        this.chatMessages = document.getElementById('chat-messages');
        this.chatForm = document.getElementById('chat-form');
        this.messageInput = document.getElementById('message-input');
        this.sendBtn = document.getElementById('send-btn');
        this.settingsBtn = document.getElementById('settings-btn');
        this.apiKeyModal = document.getElementById('api-key-modal');
        this.apiKeyForm = document.getElementById('api-key-form');
        this.apiKeyInput = document.getElementById('api-key');
        this.settingsModal = document.getElementById('settings-modal');
        this.settingsForm = document.getElementById('settings-form');
        this.modelSelect = document.getElementById('model-select');
        this.apiKeyUpdate = document.getElementById('api-key-update');
        this.systemPromptInput = document.getElementById('system-prompt');
        this.closeSettings = document.getElementById('close-settings');
        this.clearChat = document.getElementById('clear-chat');
        
        // Share link elements
        this.createShareLinkBtn = document.getElementById('create-share-link');
        this.shareLinkContainer = document.getElementById('share-link-container');
        this.shareLink = document.getElementById('share-link');
        this.copyShareLinkBtn = document.getElementById('copy-share-link');
        
        // Model info elements
        this.modelNameElement = document.querySelector('.model-name');
        this.modelDeveloperElement = document.querySelector('.model-developer');
        this.modelContextElement = document.querySelector('.model-context');
        this.usageFill = document.querySelector('.usage-fill');
        this.usageText = document.querySelector('.usage-text');
        
        // Chat state
        this.messages = [];
        this.isGenerating = false;
        this.controller = null;
        
        // Default model
        this.currentModel = 'meta-llama/llama-4-scout-17b-16e-instruct';
        
        // API key
        this.apiKey = null;
        
        // System prompt
        this.systemPrompt = null;
    }
    
    /**
     * Initialize the application
     */
    AIHackare.prototype.init = function() {
        // Check if there's a shared API key in the URL
        if (ShareService.hasSharedApiKey()) {
            const sharedApiKey = ShareService.extractSharedApiKey();
            
            if (sharedApiKey) {
                // Save the shared API key
                StorageService.saveApiKey(sharedApiKey);
                this.apiKey = sharedApiKey;
                
                // Clear the shared API key from the URL
                ShareService.clearSharedApiKeyFromUrl();
                
                // Add a message to inform the user
                this.addSystemMessage('API key from shared link has been applied.');
                
                // Fetch available models with the new API key
                this.fetchAvailableModels();
            } else {
                // If decryption failed, show an error message
                this.addSystemMessage('Error: Could not decrypt the shared API key.');
                
                // Check if API key exists
                this.apiKey = StorageService.getApiKey();
                
                if (!this.apiKey) {
                    this.showApiKeyModal();
                } else {
                    // Fetch available models if API key exists
                    this.fetchAvailableModels();
                }
            }
        } else {
            // Check if API key exists
            this.apiKey = StorageService.getApiKey();
            
            if (!this.apiKey) {
                this.showApiKeyModal();
            } else {
                // Fetch available models if API key exists
                this.fetchAvailableModels();
            }
        }
        
        // Load saved model preference
        const savedModel = StorageService.getModel();
        if (savedModel) {
            this.currentModel = savedModel;
            this.modelSelect.value = savedModel;
        }
        
        // Load saved system prompt
        this.systemPrompt = StorageService.getSystemPrompt();
        
        // Update model info in header
        this.updateModelInfoDisplay();
        
        // Load chat history
        this.loadChatHistory();
        
        // Event listeners
        this.setupEventListeners();
        
        // Auto-resize textarea
        UIUtils.setupTextareaAutoResize(this.messageInput);
    };
    
    /**
     * Update the model info display in the header
     */
    AIHackare.prototype.updateModelInfoDisplay = function() {
        // Get a simplified display name for the model
        const displayName = ModelInfoService.getDisplayName(this.currentModel);
        
        // Update model name
        if (this.modelNameElement) {
            this.modelNameElement.textContent = displayName;
        }
        
        // Get model info
        const modelData = ModelInfoService.modelInfo[this.currentModel];
        
        // Update developer and context window if info exists
        if (modelData) {
            if (this.modelDeveloperElement) {
                this.modelDeveloperElement.textContent = modelData.developer;
            }
            
            if (this.modelContextElement) {
                this.modelContextElement.textContent = 
                    modelData.contextWindow !== '-' ? 
                    `${modelData.contextWindow} context` : '';
            }
        } else {
            // Clear stats if no info available
            if (this.modelDeveloperElement) {
                this.modelDeveloperElement.textContent = '';
            }
            
            if (this.modelContextElement) {
                this.modelContextElement.textContent = '';
            }
        }
        
        // Initialize context usage display
        this.updateContextUsage(0);
    };
    
    /**
     * Update the context usage display
     * @param {number} percentage - Usage percentage (0-100)
     */
    AIHackare.prototype.updateContextUsage = function(percentage) {
        UIUtils.updateContextUsage(this.usageFill, this.usageText, percentage);
    };
    
    /**
     * Set up event listeners
     */
    AIHackare.prototype.setupEventListeners = function() {
        // Chat form submission
        this.chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });
        
        // API key form submission
        this.apiKeyForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveApiKey();
        });
        
        // Settings button click
        this.settingsBtn.addEventListener('click', () => {
            this.showSettingsModal();
        });
        
        // Settings form submission
        this.settingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSettings();
        });
        
        // Close settings button
        this.closeSettings.addEventListener('click', () => {
            this.hideSettingsModal();
        });
        
        // Clear chat button
        this.clearChat.addEventListener('click', (e) => {
            e.preventDefault();
            this.clearChatHistory();
        });
        
        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === this.apiKeyModal) {
                this.hideApiKeyModal();
            }
            if (e.target === this.settingsModal) {
                this.hideSettingsModal();
            }
        });
        
        // Create share link button
        if (this.createShareLinkBtn) {
            this.createShareLinkBtn.addEventListener('click', () => {
                this.createShareableLink();
            });
        }
        
        // Copy share link button
        if (this.copyShareLinkBtn) {
            this.copyShareLinkBtn.addEventListener('click', () => {
                this.copyShareableLink();
            });
        }
        
        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Escape key to close modals
            if (e.key === 'Escape') {
                this.hideApiKeyModal();
                this.hideSettingsModal();
            }
            
            // Ctrl/Cmd + Enter to send message
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                if (document.activeElement === this.messageInput) {
                    e.preventDefault();
                    this.sendMessage();
                }
            }
        });
    };
    
    /**
     * Show the API key modal
     */
    AIHackare.prototype.showApiKeyModal = function() {
        this.apiKeyModal.classList.add('active');
        this.apiKeyInput.focus();
    };
    
    /**
     * Hide the API key modal
     */
    AIHackare.prototype.hideApiKeyModal = function() {
        this.apiKeyModal.classList.remove('active');
    };
    
    /**
     * Fetch available models from the API
     */
    AIHackare.prototype.fetchAvailableModels = async function() {
        if (!this.apiKey) return;
        
        try {
            const models = await ApiService.fetchAvailableModels(this.apiKey);
            
            // Clear existing options
            this.modelSelect.innerHTML = '';
            
            // Create optgroups for different model types
            const standardGroup = document.createElement('optgroup');
            standardGroup.label = 'Production Models';
            
            const previewGroup = document.createElement('optgroup');
            previewGroup.label = 'Preview Models';
            
            const systemGroup = document.createElement('optgroup');
            systemGroup.label = 'Preview Systems';
            
            // Get list of fetched model IDs
            const fetchedModelIds = models.map(model => model.id);
            
            // Add production models if they exist in fetched models
            ModelInfoService.productionModels.forEach(modelId => {
                if (fetchedModelIds.includes(modelId)) {
                    const option = document.createElement('option');
                    option.value = modelId;
                    
                    // Get simplified display name
                    option.textContent = ModelInfoService.getDisplayName(modelId);
                    
                    // Set selected if it matches current model
                    if (modelId === this.currentModel) {
                        option.selected = true;
                    }
                    
                    standardGroup.appendChild(option);
                }
            });
            
            // Add preview models if they exist in fetched models
            ModelInfoService.previewModels.forEach(modelId => {
                if (fetchedModelIds.includes(modelId)) {
                    const option = document.createElement('option');
                    option.value = modelId;
                    
                    // Get simplified display name
                    option.textContent = ModelInfoService.getDisplayName(modelId);
                    
                    // Set selected if it matches current model
                    if (modelId === this.currentModel) {
                        option.selected = true;
                    }
                    
                    previewGroup.appendChild(option);
                }
            });
            
            // Add system models if they exist in fetched models
            ModelInfoService.systemModels.forEach(modelId => {
                if (fetchedModelIds.includes(modelId)) {
                    const option = document.createElement('option');
                    option.value = modelId;
                    
                    // Get simplified display name
                    option.textContent = ModelInfoService.getDisplayName(modelId);
                    
                    // Set selected if it matches current model
                    if (modelId === this.currentModel) {
                        option.selected = true;
                    }
                    
                    systemGroup.appendChild(option);
                }
            });
            
            // Add other available models that aren't in our predefined lists
            const knownModelIds = [
                ...ModelInfoService.productionModels, 
                ...ModelInfoService.previewModels, 
                ...ModelInfoService.systemModels
            ];
            
            models.forEach(model => {
                if (!knownModelIds.includes(model.id)) {
                    const option = document.createElement('option');
                    option.value = model.id;
                    
                    // Try to get a simplified name, or use the model ID
                    option.textContent = ModelInfoService.getDisplayName(model.id);
                    
                    // Set selected if it matches current model
                    if (model.id === this.currentModel) {
                        option.selected = true;
                    }
                    
                    // Add to appropriate group based on naming patterns
                    if (model.id.includes('preview') || model.id.includes('beta')) {
                        previewGroup.appendChild(option);
                    } else {
                        standardGroup.appendChild(option);
                    }
                }
            });
            
            // Add groups to select element if they have options
            if (standardGroup.children.length > 0) {
                this.modelSelect.appendChild(standardGroup);
            }
            
            if (previewGroup.children.length > 0) {
                this.modelSelect.appendChild(previewGroup);
            }
            
            if (systemGroup.children.length > 0) {
                this.modelSelect.appendChild(systemGroup);
            }
            
            // Update model info display
            this.updateModelInfoDisplay();
            
        } catch (error) {
            console.error('Error fetching models:', error);
            // Fallback to default models if fetch fails
            this.populateDefaultModels();
        }
    };
    
    /**
     * Populate the model select with default models
     */
    AIHackare.prototype.populateDefaultModels = function() {
        // Clear existing options
        this.modelSelect.innerHTML = '';
        
        // Create optgroups for different model types
        const standardGroup = document.createElement('optgroup');
        standardGroup.label = 'Production Models';
        
        const previewGroup = document.createElement('optgroup');
        previewGroup.label = 'Preview Models';
        
        const systemGroup = document.createElement('optgroup');
        systemGroup.label = 'Preview Systems';
        
        // Add production models
        ModelInfoService.productionModels.forEach(modelId => {
            if (ModelInfoService.modelInfo[modelId]) {
                const option = document.createElement('option');
                option.value = modelId;
                
                // Get simplified display name
                option.textContent = ModelInfoService.getDisplayName(modelId);
                
                // Set selected if it matches current model
                if (modelId === this.currentModel) {
                    option.selected = true;
                }
                
                standardGroup.appendChild(option);
            }
        });
        
        // Add preview models
        ModelInfoService.previewModels.forEach(modelId => {
            if (ModelInfoService.modelInfo[modelId]) {
                const option = document.createElement('option');
                option.value = modelId;
                
                // Get simplified display name
                option.textContent = ModelInfoService.getDisplayName(modelId);
                
                // Set selected if it matches current model
                if (modelId === this.currentModel) {
                    option.selected = true;
                }
                
                previewGroup.appendChild(option);
            }
        });
        
        // Add system models
        ModelInfoService.systemModels.forEach(modelId => {
            if (ModelInfoService.modelInfo[modelId]) {
                const option = document.createElement('option');
                option.value = modelId;
                
                // Get simplified display name
                option.textContent = ModelInfoService.getDisplayName(modelId);
                
                // Set selected if it matches current model
                if (modelId === this.currentModel) {
                    option.selected = true;
                }
                
                systemGroup.appendChild(option);
            }
        });
        
        // Add groups to select element if they have options
        if (standardGroup.children.length > 0) {
            this.modelSelect.appendChild(standardGroup);
        }
        
        if (previewGroup.children.length > 0) {
            this.modelSelect.appendChild(previewGroup);
        }
        
        if (systemGroup.children.length > 0) {
            this.modelSelect.appendChild(systemGroup);
        }
        
        // Update model info display
        this.updateModelInfoDisplay();
    };
    
    /**
     * Show the settings modal
     */
    AIHackare.prototype.showSettingsModal = function() {
        // Update the API key field with masked value if exists
        if (this.apiKey) {
            this.apiKeyUpdate.placeholder = '••••••••••••••••••••••••••';
            
            // Refresh models list when opening settings
            this.fetchAvailableModels();
        } else {
            this.populateDefaultModels();
        }
        
        // Set current model
        this.modelSelect.value = this.currentModel;
        
        // Set current system prompt
        if (this.systemPrompt) {
            this.systemPromptInput.value = this.systemPrompt;
        } else {
            this.systemPromptInput.value = '';
        }
        
        // Apply auto-resize to system prompt textarea
        UIUtils.setupTextareaAutoResize(this.systemPromptInput);
        
        this.settingsModal.classList.add('active');
    };
    
    /**
     * Hide the settings modal
     */
    AIHackare.prototype.hideSettingsModal = function() {
        this.settingsModal.classList.remove('active');
    };
    
    /**
     * Save the API key
     */
    AIHackare.prototype.saveApiKey = function() {
        const apiKey = this.apiKeyInput.value.trim();
        
        if (apiKey) {
            // Save API key to local storage
            StorageService.saveApiKey(apiKey);
            this.apiKey = apiKey;
            
            // Hide modal
            this.hideApiKeyModal();
            
            // Fetch available models with the new API key
            this.fetchAvailableModels();
            
            // Add welcome message
            this.addSystemMessage('API key saved. You can now start chatting with GroqCloud AI models.');
        }
    };
    
    /**
     * Save settings
     */
    AIHackare.prototype.saveSettings = function() {
        // Save model preference
        const selectedModel = this.modelSelect.value;
        StorageService.saveModel(selectedModel);
        this.currentModel = selectedModel;
        
        // Update API key if provided
        const newApiKey = this.apiKeyUpdate.value.trim();
        if (newApiKey) {
            StorageService.saveApiKey(newApiKey);
            this.apiKey = newApiKey;
        }
        
        // Save system prompt
        const systemPrompt = this.systemPromptInput.value.trim();
        StorageService.saveSystemPrompt(systemPrompt);
        this.systemPrompt = systemPrompt;
        
        // Update model info in header
        this.updateModelInfoDisplay();
        
        // Hide modal
        this.hideSettingsModal();
        
        // Get a simplified display name for the model
        const displayName = ModelInfoService.getDisplayName(selectedModel);
        
        // Add confirmation message
        this.addSystemMessage(`Settings saved. Using model: ${displayName}`);
    };
    
    /**
     * Send a message
     */
    AIHackare.prototype.sendMessage = function() {
        const message = this.messageInput.value.trim();
        
        if (!message) return;
        
        if (!this.apiKey) {
            this.showApiKeyModal();
            return;
        }
        
        if (this.isGenerating) {
            this.stopGeneration();
            return;
        }
        
        // Add user message to chat
        this.addUserMessage(message);
        
        // Clear input
        this.messageInput.value = '';
        this.messageInput.style.height = 'auto';
        
        // Focus input
        this.messageInput.focus();
        
        // Send to API
        this.generateResponse();
    };
    
    /**
     * Generate a response from the API
     */
    AIHackare.prototype.generateResponse = async function() {
        if (!this.apiKey) return;
        
        this.isGenerating = true;
        
        // Change send button to stop button
        this.sendBtn.innerHTML = '<i class="fas fa-stop"></i>';
        this.sendBtn.title = 'Stop generation';
        
        // Add typing indicator
        const typingIndicator = UIUtils.createTypingIndicator();
        this.chatMessages.appendChild(typingIndicator);
        UIUtils.scrollToBottom(this.chatMessages);
        
        // Prepare messages for API
        const apiMessages = this.messages.map(msg => ({
            role: msg.role,
            content: msg.content
        }));
        
        // Create AI message placeholder
        const aiMessageId = Date.now().toString();
        this.addAIMessage('', aiMessageId);
        
        try {
            // Create AbortController for fetch
            this.controller = new AbortController();
            const signal = this.controller.signal;
            
            // Generate response
            const aiResponse = await ApiService.generateChatCompletion(
                this.apiKey,
                this.currentModel,
                apiMessages,
                signal,
                (content) => this.updateAIMessage(content, aiMessageId),
                this.systemPrompt
            );
            
            // Remove typing indicator
            typingIndicator.remove();
            
            // Update messages array with complete AI response
            this.messages[this.messages.length - 1].content = aiResponse;
            
            // Save chat history
            StorageService.saveChatHistory(this.messages);
            
        } catch (error) {
            // Remove typing indicator
            typingIndicator.remove();
            
            // Show error message
            if (error.name === 'AbortError') {
                this.addSystemMessage('Response generation stopped.');
            } else {
                console.error('API Error:', error);
                this.addSystemMessage(`Error: ${error.message}`);
            }
        } finally {
            // Reset state
            this.isGenerating = false;
            this.controller = null;
            
            // Reset send button
            this.sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
            this.sendBtn.title = 'Send message';
        }
    };
    
    /**
     * Stop response generation
     */
    AIHackare.prototype.stopGeneration = function() {
        if (this.controller) {
            this.controller.abort();
        }
    };
    
    /**
     * Add a user message to the chat
     * @param {string} content - Message content
     */
    AIHackare.prototype.addUserMessage = function(content) {
        // Add to messages array
        this.messages.push({
            role: 'user',
            content: content
        });
        
        // Create message element
        const messageElement = UIUtils.createMessageElement('user', content);
        
        // Add to chat
        this.chatMessages.appendChild(messageElement);
        
        // Scroll to bottom
        UIUtils.scrollToBottom(this.chatMessages);
        
        // Save chat history
        StorageService.saveChatHistory(this.messages);
        
        // Update context usage
        this.estimateContextUsage();
    };
    
    /**
     * Add an AI message to the chat
     * @param {string} content - Message content
     * @param {string} id - Message ID
     */
    AIHackare.prototype.addAIMessage = function(content, id) {
        // Add to messages array
        this.messages.push({
            role: 'assistant',
            content: content
        });
        
        // Create message element
        const messageElement = UIUtils.createMessageElement('assistant', content, id);
        
        // Add to chat
        this.chatMessages.appendChild(messageElement);
        
        // Scroll to bottom
        UIUtils.scrollToBottom(this.chatMessages);
    };
    
    /**
     * Update an AI message in the chat
     * @param {string} content - New message content
     * @param {string} id - Message ID
     */
    AIHackare.prototype.updateAIMessage = function(content, id) {
        const messageElement = document.querySelector(`.message[data-id="${id}"]`);
        if (messageElement) {
            const contentElement = messageElement.querySelector('.message-content');
            contentElement.innerHTML = UIUtils.renderMarkdown(content);
            UIUtils.scrollToBottom(this.chatMessages);
            
            // Update context usage
            this.estimateContextUsage();
        }
    };
    
    /**
     * Add a system message to the chat
     * @param {string} content - Message content
     */
    AIHackare.prototype.addSystemMessage = function(content) {
        // Create message element
        const messageElement = UIUtils.createMessageElement('system', content);
        
        // Add to chat
        this.chatMessages.appendChild(messageElement);
        
        // Scroll to bottom
        UIUtils.scrollToBottom(this.chatMessages);
    };
    
    /**
     * Load chat history from storage
     */
    AIHackare.prototype.loadChatHistory = function() {
        const savedHistory = StorageService.loadChatHistory();
        
        if (savedHistory) {
            try {
                this.messages = savedHistory;
                
                // Clear chat container
                this.chatMessages.innerHTML = '';
                
                // Add messages to chat
                this.messages.forEach(message => {
                    if (message.role === 'user') {
                        const messageElement = UIUtils.createMessageElement('user', message.content);
                        this.chatMessages.appendChild(messageElement);
                    } else if (message.role === 'assistant') {
                        const messageElement = UIUtils.createMessageElement('assistant', message.content);
                        this.chatMessages.appendChild(messageElement);
                    }
                });
                
                // Scroll to bottom
                UIUtils.scrollToBottom(this.chatMessages);
                
                // Update context usage based on loaded history
                this.estimateContextUsage();
            } catch (error) {
                console.error('Error loading chat history:', error);
                this.addSystemMessage('Error loading chat history.');
            }
        }
    };
    
    /**
     * Clear chat history
     */
    AIHackare.prototype.clearChatHistory = function() {
        // Clear messages array
        this.messages = [];
        
        // Clear chat container
        this.chatMessages.innerHTML = '';
        
        // Add welcome message
        this.addSystemMessage('Chat history cleared.');
        
        // Clear local storage
        StorageService.clearChatHistory();
        
        // Reset context usage
        this.updateContextUsage(0);
    };
    
    /**
     * Estimate context usage
     */
    AIHackare.prototype.estimateContextUsage = function() {
        // Calculate percentage using the utility function
        const percentage = UIUtils.estimateContextUsage(
            this.messages, 
            ModelInfoService.modelInfo, 
            this.currentModel
        );
        
        // Update the display
        this.updateContextUsage(percentage);
    };
    
    /**
     * Create a shareable link with the encrypted API key
     */
    AIHackare.prototype.createShareableLink = function() {
        if (!this.apiKey) {
            this.addSystemMessage('Error: No API key available to share.');
            return;
        }
        
        try {
            // Create a shareable link with the encrypted API key
            const shareableLink = ShareService.createShareableLink(this.apiKey);
            
            // Display the link in the input field
            if (this.shareLink && this.shareLinkContainer) {
                this.shareLink.value = shareableLink;
                this.shareLinkContainer.style.display = 'flex';
                
                // Select the link text for easy copying
                this.shareLink.select();
                this.shareLink.focus();
            }
        } catch (error) {
            console.error('Error creating shareable link:', error);
            this.addSystemMessage('Error creating shareable link. Please try again.');
        }
    };
    
    /**
     * Copy the shareable link to the clipboard
     */
    AIHackare.prototype.copyShareableLink = function() {
        if (this.shareLink && this.shareLink.value) {
            try {
                // Select the link text
                this.shareLink.select();
                this.shareLink.focus();
                
                // Copy to clipboard
                document.execCommand('copy');
                
                // Show a success message
                this.addSystemMessage('Shareable link copied to clipboard.');
            } catch (error) {
                console.error('Error copying link to clipboard:', error);
                this.addSystemMessage('Error copying link. Please select and copy manually.');
            }
        }
    };

    // Return the constructor
    return {
        AIHackare: AIHackare
    };
})();
