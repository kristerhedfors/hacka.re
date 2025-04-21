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
        this.createInsecureShareLinkBtn = document.getElementById('create-insecure-share-link');
        this.shareLinkContainer = document.getElementById('share-link-container');
        this.shareLink = document.getElementById('share-link');
        this.copyShareLinkBtn = document.getElementById('copy-share-link');
        this.qrShareLinkBtn = document.getElementById('qr-share-link');
        this.qrCodeContainer = document.getElementById('qr-code-container');
        
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
            // Show password prompt for decryption
            this.promptForDecryptionPassword();
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
        
        // Create share link buttons
        if (this.createShareLinkBtn) {
            this.createShareLinkBtn.addEventListener('click', () => {
                this.createShareableLink();
            });
        }
        
        if (this.createInsecureShareLinkBtn) {
            this.createInsecureShareLinkBtn.addEventListener('click', () => {
                this.createInsecureShareableLink();
            });
        }
        
        // Copy share link button
        if (this.copyShareLinkBtn) {
            this.copyShareLinkBtn.addEventListener('click', () => {
                this.copyShareableLink();
            });
        }
        
        // QR code button
        if (this.qrShareLinkBtn) {
            this.qrShareLinkBtn.addEventListener('click', () => {
                this.generateQRCode();
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
     * Prompt for password to decrypt shared data from URL
     */
    AIHackare.prototype.promptForDecryptionPassword = function() {
        // Create a modal for password input
        const passwordModal = document.createElement('div');
        passwordModal.className = 'modal active';
        passwordModal.id = 'password-modal';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        
        const heading = document.createElement('h2');
        heading.textContent = 'Enter Password';
        
        const paragraph = document.createElement('p');
        paragraph.textContent = 'This shared link is password-protected. Please enter the password to decrypt the data.';
        
        const form = document.createElement('form');
        form.id = 'password-form';
        
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';
        
        const label = document.createElement('label');
        label.htmlFor = 'decrypt-password';
        label.textContent = 'Password';
        
        const input = document.createElement('input');
        input.type = 'password';
        input.id = 'decrypt-password';
        input.placeholder = 'Enter password';
        input.required = true;
        
        const formActions = document.createElement('div');
        formActions.className = 'form-actions';
        
        const submitButton = document.createElement('button');
        submitButton.type = 'submit';
        submitButton.className = 'btn primary-btn';
        submitButton.textContent = 'Decrypt';
        
        // Assemble the modal
        formGroup.appendChild(label);
        formGroup.appendChild(input);
        
        formActions.appendChild(submitButton);
        
        form.appendChild(formGroup);
        form.appendChild(formActions);
        
        modalContent.appendChild(heading);
        modalContent.appendChild(paragraph);
        modalContent.appendChild(form);
        
        passwordModal.appendChild(modalContent);
        
        // Add to document
        document.body.appendChild(passwordModal);
        
        // Focus the input
        input.focus();
        
        // Handle form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const password = input.value.trim();
            if (!password) return;
            
            // Try to decrypt with the provided password
            const sharedData = ShareService.extractSharedApiKey(password);
            
            if (sharedData && sharedData.apiKey) {
                // Save the shared API key
                StorageService.saveApiKey(sharedData.apiKey);
                this.apiKey = sharedData.apiKey;
                
                // If there's a system prompt, save it too
                // Mask the API key to show only first and last 4 bytes
                const maskedApiKey = this.maskApiKey(sharedData.apiKey);
                
                if (sharedData.systemPrompt) {
                    StorageService.saveSystemPrompt(sharedData.systemPrompt);
                    this.systemPrompt = sharedData.systemPrompt;
                    this.addSystemMessage(`API key (${maskedApiKey}) and system prompt from shared link have been applied.`);
                } else {
                    this.addSystemMessage(`API key (${maskedApiKey}) from shared link has been applied.`);
                }
                
                // Clear the shared data from the URL
                ShareService.clearSharedApiKeyFromUrl();
                
                // Remove the password modal
                passwordModal.remove();
                
                // Fetch available models with the new API key
                this.fetchAvailableModels();
            } else {
                // If decryption failed, show an error message
                paragraph.textContent = 'Incorrect password. Please try again.';
                paragraph.style.color = 'red';
                input.value = '';
                input.focus();
            }
        });
        
        // Close modal when clicking outside
        passwordModal.addEventListener('click', (e) => {
            if (e.target === passwordModal) {
                passwordModal.remove();
                
                // Check if API key exists
                this.apiKey = StorageService.getApiKey();
                
                if (!this.apiKey) {
                    this.showApiKeyModal();
                } else {
                    // Fetch available models if API key exists
                    this.fetchAvailableModels();
                }
            }
        });
        
        // Handle escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.getElementById('password-modal')) {
                passwordModal.remove();
                
                // Check if API key exists
                this.apiKey = StorageService.getApiKey();
                
                if (!this.apiKey) {
                    this.showApiKeyModal();
                } else {
                    // Fetch available models if API key exists
                    this.fetchAvailableModels();
                }
            }
        });
    };
    
    /**
     * Prompt for password to encrypt data for sharing
     * @param {string} type - Type of link to create ('api' for API key only, 'full' for API key + system prompt)
     */
    AIHackare.prototype.promptForEncryptionPassword = function(type) {
        if (!this.apiKey) {
            this.addSystemMessage('Error: No API key available to share.');
            return;
        }
        
        // Create a modal for password input
        const passwordModal = document.createElement('div');
        passwordModal.className = 'modal active';
        passwordModal.id = 'password-modal';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        
        const heading = document.createElement('h2');
        heading.textContent = 'Create Password-Protected Link';
        
        const paragraph = document.createElement('p');
        paragraph.textContent = 'Enter a password to protect your shared link. The recipient will need this password to access the shared data.';
        
        const form = document.createElement('form');
        form.id = 'password-form';
        
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';
        
        const label = document.createElement('label');
        label.htmlFor = 'encrypt-password';
        label.textContent = 'Password';
        
        const input = document.createElement('input');
        input.type = 'password';
        input.id = 'encrypt-password';
        input.placeholder = 'Enter password';
        input.required = true;
        
        const confirmGroup = document.createElement('div');
        confirmGroup.className = 'form-group';
        
        const confirmLabel = document.createElement('label');
        confirmLabel.htmlFor = 'confirm-password';
        confirmLabel.textContent = 'Confirm Password';
        
        const confirmInput = document.createElement('input');
        confirmInput.type = 'password';
        confirmInput.id = 'confirm-password';
        confirmInput.placeholder = 'Confirm password';
        confirmInput.required = true;
        
        const formActions = document.createElement('div');
        formActions.className = 'form-actions';
        
        const submitButton = document.createElement('button');
        submitButton.type = 'submit';
        submitButton.className = 'btn primary-btn';
        submitButton.textContent = 'Create Link';
        
        const cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'btn secondary-btn';
        cancelButton.textContent = 'Cancel';
        
        // Assemble the modal
        formGroup.appendChild(label);
        formGroup.appendChild(input);
        
        confirmGroup.appendChild(confirmLabel);
        confirmGroup.appendChild(confirmInput);
        
        formActions.appendChild(submitButton);
        formActions.appendChild(cancelButton);
        
        form.appendChild(formGroup);
        form.appendChild(confirmGroup);
        form.appendChild(formActions);
        
        modalContent.appendChild(heading);
        modalContent.appendChild(paragraph);
        modalContent.appendChild(form);
        
        passwordModal.appendChild(modalContent);
        
        // Add to document
        document.body.appendChild(passwordModal);
        
        // Focus the input
        input.focus();
        
        // Handle form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const password = input.value.trim();
            const confirmPassword = confirmInput.value.trim();
            
            if (!password) return;
            
            // Check if passwords match
            if (password !== confirmPassword) {
                paragraph.textContent = 'Passwords do not match. Please try again.';
                paragraph.style.color = 'red';
                confirmInput.value = '';
                confirmInput.focus();
                return;
            }
            
            try {
                let shareableLink;
                
                if (type === 'api') {
                    // Create a shareable link with the encrypted API key only
                    shareableLink = ShareService.createShareableLink(this.apiKey, password);
                } else {
                    // Get the current system prompt
                    const systemPrompt = this.systemPromptInput.value.trim();
                    
                    // Create a shareable link with the encrypted API key and system prompt
                    shareableLink = ShareService.createInsecureShareableLink(this.apiKey, systemPrompt, password);
                }
                
                // Display the link in the input field
                if (this.shareLink && this.shareLinkContainer) {
                    this.shareLink.value = shareableLink;
                    this.shareLinkContainer.style.display = 'flex';
                    
                    // Select the link text for easy copying
                    this.shareLink.select();
                    this.shareLink.focus();
                    
                    // Automatically generate QR code
                    this.generateQRCode();
                }
                
                // Remove the password modal
                passwordModal.remove();
                
                // Show a success message
                this.addSystemMessage('Password-protected link created successfully. Remember to share the password separately.');
            } catch (error) {
                console.error('Error creating shareable link:', error);
                this.addSystemMessage('Error creating shareable link. Please try again.');
                passwordModal.remove();
            }
        });
        
        // Handle cancel button
        cancelButton.addEventListener('click', () => {
            passwordModal.remove();
        });
        
        // Close modal when clicking outside
        passwordModal.addEventListener('click', (e) => {
            if (e.target === passwordModal) {
                passwordModal.remove();
            }
        });
        
        // Handle escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.getElementById('password-modal')) {
                passwordModal.remove();
            }
        });
    };
    
    /**
     * Create a shareable link with the encrypted API key only
     * This creates a link that contains just the API key, allowing
     * the recipient to use their own system prompt.
     */
    AIHackare.prototype.createShareableLink = function() {
        this.promptForEncryptionPassword('api');
    };
    
    /**
     * Create an insecure shareable link with the encrypted API key and system prompt
     * This creates a link that contains both the API key and system prompt,
     * allowing the recipient to use your exact configuration.
     */
    AIHackare.prototype.createInsecureShareableLink = function() {
        this.promptForEncryptionPassword('full');
    };
    
    /**
     * Mask an API key, showing only first and last 4 bytes
     * @param {string} apiKey - The API key to mask
     * @returns {string} Masked API key
     */
    AIHackare.prototype.maskApiKey = function(apiKey) {
        if (!apiKey || apiKey.length < 8) {
            return "Invalid API key format";
        }
        
        const first4 = apiKey.substring(0, 4);
        const last4 = apiKey.substring(apiKey.length - 4);
        const maskedLength = apiKey.length - 8;
        const maskedPart = '*'.repeat(maskedLength);
        
        return `${first4}${maskedPart}${last4}`;
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
    
    /**
     * Generate a QR code for the shareable link
     */
    AIHackare.prototype.generateQRCode = function() {
        if (this.shareLink && this.shareLink.value) {
            try {
                // Clear any existing QR code
                this.qrCodeContainer.innerHTML = '';
                
                // Check if the link is too long for QR code generation
                // QR codes have data capacity limits, especially with long system prompts
                if (this.shareLink.value.length > 1500) {
                    // Create a warning message
                    const warningDiv = document.createElement('div');
                    warningDiv.className = 'qr-warning';
                    warningDiv.style.padding = '15px';
                    warningDiv.style.backgroundColor = '#fff3cd';
                    warningDiv.style.color = '#856404';
                    warningDiv.style.borderRadius = '5px';
                    warningDiv.style.marginTop = '10px';
                    warningDiv.textContent = 'The link is too long to generate a QR code. This typically happens with links that include long system prompts.';
                    
                    // Add the warning to the container
                    this.qrCodeContainer.appendChild(warningDiv);
                    
                    // Show the QR code container
                    this.qrCodeContainer.style.display = 'block';
                    
                    // Show a warning message
                    this.addSystemMessage('Warning: Link is too long for QR code generation. Consider using a shorter system prompt or copy the link directly.');
                    return;
                }
                
                // Create a new QR code with lower error correction level to handle longer URLs
                new QRCode(this.qrCodeContainer, {
                    text: this.shareLink.value,
                    width: 250,
                    height: 250,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.L // Low error correction level for longer data
                });
                
                // Show the QR code container
                this.qrCodeContainer.style.display = 'block';
                
                // Show a success message
                this.addSystemMessage('QR code generated for shareable link.');
            } catch (error) {
                console.error('Error generating QR code:', error);
                
                // Check if the error is related to code length overflow
                if (error.message && error.message.includes('code length overflow')) {
                    // Create a warning message
                    const warningDiv = document.createElement('div');
                    warningDiv.className = 'qr-warning';
                    warningDiv.style.padding = '15px';
                    warningDiv.style.backgroundColor = '#fff3cd';
                    warningDiv.style.color = '#856404';
                    warningDiv.style.borderRadius = '5px';
                    warningDiv.style.marginTop = '10px';
                    warningDiv.textContent = 'The link is too long to generate a QR code. This typically happens with links that include long system prompts.';
                    
                    // Add the warning to the container
                    this.qrCodeContainer.appendChild(warningDiv);
                    
                    // Show the QR code container
                    this.qrCodeContainer.style.display = 'block';
                    
                    this.addSystemMessage('Error: Link is too long for QR code generation. Consider using a shorter system prompt or copy the link directly.');
                } else {
                    this.addSystemMessage('Error generating QR code. Please try again.');
                }
            }
        }
    };

    // Return the constructor
    return {
        AIHackare: AIHackare
    };
})();
