/**
 * Main JavaScript for AIHackare
 * A simple chat interface for OpenAI-compatible APIs
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the chat application
    const aiHackare = new AIHackare();
    aiHackare.init();
});

class AIHackare {
    constructor() {
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
        this.closeSettings = document.getElementById('close-settings');
        this.clearChat = document.getElementById('clear-chat');
        
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
        
        // Get base URL from localStorage or use default
        this.baseUrl = localStorage.getItem('aihackare_base_url') || 'https://api.groq.com/openai/v1';
        
        // API endpoints (constructed from base URL)
        this.chatEndpoint = `${this.baseUrl}/chat/completions`;
        this.modelsEndpoint = `${this.baseUrl}/models`;
        
        // Model information
        this.modelInfo = {
            // Standard Models
            'gemma2-9b-it': { developer: 'Google', contextWindow: '8,192', maxCompletionTokens: '-', maxFileSize: '-' },
            'llama-3.3-70b-versatile': { developer: 'Meta', contextWindow: '128K', maxCompletionTokens: '32,768', maxFileSize: '-' },
            'llama-3.1-8b-instant': { developer: 'Meta', contextWindow: '128K', maxCompletionTokens: '8,192', maxFileSize: '-' },
            'llama-guard-3-8b': { developer: 'Meta', contextWindow: '8,192', maxCompletionTokens: '-', maxFileSize: '-' },
            'llama3-70b-8192': { developer: 'Meta', contextWindow: '8,192', maxCompletionTokens: '-', maxFileSize: '-' },
            'llama3-8b-8192': { developer: 'Meta', contextWindow: '8,192', maxCompletionTokens: '-', maxFileSize: '-' },
            'whisper-large-v3': { developer: 'OpenAI', contextWindow: '-', maxCompletionTokens: '-', maxFileSize: '25 MB' },
            'whisper-large-v3-turbo': { developer: 'OpenAI', contextWindow: '-', maxCompletionTokens: '-', maxFileSize: '25 MB' },
            'distil-whisper-large-v3-en': { developer: 'HuggingFace', contextWindow: '-', maxCompletionTokens: '-', maxFileSize: '25 MB' },
            
            // Preview Models
            'allam-2-7b': { developer: 'Saudi Data and AI Authority (SDAIA)', contextWindow: '4,096', maxCompletionTokens: '-', maxFileSize: '-', preview: true },
            'deepseek-r1-distill-llama-70b': { developer: 'DeepSeek', contextWindow: '128K', maxCompletionTokens: '-', maxFileSize: '-', preview: true },
            'meta-llama/llama-4-maverick-17b-128e-instruct': { developer: 'Meta', contextWindow: '131,072', maxCompletionTokens: '8192', maxFileSize: '-', preview: true },
            'meta-llama/llama-4-scout-17b-16e-instruct': { developer: 'Meta', contextWindow: '131,072', maxCompletionTokens: '8192', maxFileSize: '-', preview: true },
            'mistral-saba-24b': { developer: 'Mistral', contextWindow: '32K', maxCompletionTokens: '-', maxFileSize: '-', preview: true },
            'playai-tts': { developer: 'Playht, Inc', contextWindow: '10K', maxCompletionTokens: '-', maxFileSize: '-', preview: true },
            'playai-tts-arabic': { developer: 'Playht, Inc', contextWindow: '10K', maxCompletionTokens: '-', maxFileSize: '-', preview: true },
            'qwen-qwq-32b': { developer: 'Alibaba Cloud', contextWindow: '128K', maxCompletionTokens: '-', maxFileSize: '-', preview: true },
            
            // Preview Systems
            'compound-beta': { developer: 'Groq', contextWindow: '128K', maxCompletionTokens: '8192', maxFileSize: '-', system: true },
            'compound-beta-mini': { developer: 'Groq', contextWindow: '128K', maxCompletionTokens: '8192', maxFileSize: '-', system: true }
        };
    }
    
    init() {
        // Check if API key exists
        this.apiKey = localStorage.getItem('aihackare_api_key');
        
        if (!this.apiKey) {
            this.showApiKeyModal();
        } else {
            // Fetch available models if API key exists
            this.fetchAvailableModels();
        }
        
        // Load saved model preference
        const savedModel = localStorage.getItem('aihackare_model');
        if (savedModel) {
            this.currentModel = savedModel;
            this.modelSelect.value = savedModel;
        }
        
        // Update model info in header
        this.updateModelInfoDisplay();
        
        // Load chat history
        this.loadChatHistory();
        
        // Event listeners
        this.setupEventListeners();
        
        // Auto-resize textarea
        this.setupTextareaAutoResize();
    }
    
    updateModelInfoDisplay() {
        // Get a simplified display name for the model
        const displayName = this.getDisplayName(this.currentModel);
        
        // Update model name
        if (this.modelNameElement) {
            this.modelNameElement.textContent = displayName;
        }
        
        // Get model info
        const modelInfo = this.modelInfo[this.currentModel];
        
        // Update developer and context window if info exists
        if (modelInfo) {
            if (this.modelDeveloperElement) {
                this.modelDeveloperElement.textContent = modelInfo.developer;
            }
            
            if (this.modelContextElement) {
                this.modelContextElement.textContent = 
                    modelInfo.contextWindow !== '-' ? 
                    `${modelInfo.contextWindow} context` : '';
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
    }
    
    updateContextUsage(percentage) {
        if (!this.usageFill || !this.usageText) return;
        
        // Update the fill width
        this.usageFill.style.width = `${percentage}%`;
        
        // Update the text
        this.usageText.textContent = `${percentage}%`;
        
        // Update color based on usage percentage (heatmap)
        let color;
        if (percentage < 30) {
            // Green for low usage
            color = '#10b981';
        } else if (percentage < 60) {
            // Yellow for medium usage
            color = '#f59e0b';
        } else if (percentage < 80) {
            // Orange for high usage
            color = '#f97316';
        } else {
            // Red for very high usage
            color = '#ef4444';
        }
        
        this.usageFill.style.backgroundColor = color;
    }
    
    setupEventListeners() {
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
    }
    
    setupTextareaAutoResize() {
        this.messageInput.addEventListener('input', () => {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = (this.messageInput.scrollHeight) + 'px';
        });
    }
    
    showApiKeyModal() {
        this.apiKeyModal.classList.add('active');
        this.apiKeyInput.focus();
    }
    
    hideApiKeyModal() {
        this.apiKeyModal.classList.remove('active');
    }
    
    async fetchAvailableModels() {
        if (!this.apiKey) return;
        
        try {
            const response = await fetch(this.modelsEndpoint, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch models');
            }
            
            const data = await response.json();
            
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
            const fetchedModelIds = data.data.map(model => model.id);
            
            // Production Models
            const productionModels = [
                'gemma2-9b-it',
                'llama-3.3-70b-versatile',
                'llama-3.1-8b-instant',
                'llama-guard-3-8b',
                'llama3-70b-8192',
                'llama3-8b-8192',
                'whisper-large-v3',
                'whisper-large-v3-turbo',
                'distil-whisper-large-v3-en'
            ];
            
            // Preview Models
            const previewModels = [
                'meta-llama/llama-4-maverick-17b-128e-instruct',
                'meta-llama/llama-4-scout-17b-16e-instruct',
                'allam-2-7b',
                'deepseek-r1-distill-llama-70b',
                'mistral-saba-24b',
                'playai-tts',
                'playai-tts-arabic',
                'qwen-qwq-32b'
            ];
            
            // Preview Systems
            const systemModels = [
                'compound-beta',
                'compound-beta-mini'
            ];
            
            // Add production models if they exist in fetched models
            productionModels.forEach(modelId => {
                if (fetchedModelIds.includes(modelId)) {
                    const option = document.createElement('option');
                    option.value = modelId;
                    
                    // Get simplified display name
                    option.textContent = this.getDisplayName(modelId);
                    
                    // Set selected if it matches current model
                    if (modelId === this.currentModel) {
                        option.selected = true;
                    }
                    
                    standardGroup.appendChild(option);
                }
            });
            
            // Add preview models if they exist in fetched models
            previewModels.forEach(modelId => {
                if (fetchedModelIds.includes(modelId)) {
                    const option = document.createElement('option');
                    option.value = modelId;
                    
                    // Get simplified display name
                    option.textContent = this.getDisplayName(modelId);
                    
                    // Set selected if it matches current model
                    if (modelId === this.currentModel) {
                        option.selected = true;
                    }
                    
                    previewGroup.appendChild(option);
                }
            });
            
            // Add system models if they exist in fetched models
            systemModels.forEach(modelId => {
                if (fetchedModelIds.includes(modelId)) {
                    const option = document.createElement('option');
                    option.value = modelId;
                    
                    // Get simplified display name
                    option.textContent = this.getDisplayName(modelId);
                    
                    // Set selected if it matches current model
                    if (modelId === this.currentModel) {
                        option.selected = true;
                    }
                    
                    systemGroup.appendChild(option);
                }
            });
            
            // Add other available models that aren't in our predefined lists
            const knownModelIds = [...productionModels, ...previewModels, ...systemModels];
            data.data.forEach(model => {
                if (!knownModelIds.includes(model.id)) {
                    const option = document.createElement('option');
                    option.value = model.id;
                    
                    // Try to get a simplified name, or use the model ID
                    option.textContent = this.getDisplayName(model.id);
                    
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
    }
    
    populateDefaultModels() {
        // Clear existing options
        this.modelSelect.innerHTML = '';
        
        // Create optgroups for different model types
        const standardGroup = document.createElement('optgroup');
        standardGroup.label = 'Production Models';
        
        const previewGroup = document.createElement('optgroup');
        previewGroup.label = 'Preview Models';
        
        const systemGroup = document.createElement('optgroup');
        systemGroup.label = 'Preview Systems';
        
        // Production Models
        const productionModels = [
            'gemma2-9b-it',
            'llama-3.3-70b-versatile',
            'llama-3.1-8b-instant',
            'llama-guard-3-8b',
            'llama3-70b-8192',
            'llama3-8b-8192',
            'whisper-large-v3',
            'whisper-large-v3-turbo',
            'distil-whisper-large-v3-en'
        ];
        
        // Preview Models
        const previewModels = [
            'meta-llama/llama-4-maverick-17b-128e-instruct',
            'meta-llama/llama-4-scout-17b-16e-instruct',
            'allam-2-7b',
            'deepseek-r1-distill-llama-70b',
            'mistral-saba-24b',
            'playai-tts',
            'playai-tts-arabic',
            'qwen-qwq-32b'
        ];
        
        // Preview Systems
        const systemModels = [
            'compound-beta',
            'compound-beta-mini'
        ];
        
        // Add production models
        productionModels.forEach(modelId => {
            if (this.modelInfo[modelId]) {
                const option = document.createElement('option');
                option.value = modelId;
                
                // Get simplified display name
                option.textContent = this.getDisplayName(modelId);
                
                // Set selected if it matches current model
                if (modelId === this.currentModel) {
                    option.selected = true;
                }
                
                standardGroup.appendChild(option);
            }
        });
        
        // Add preview models
        previewModels.forEach(modelId => {
            if (this.modelInfo[modelId]) {
                const option = document.createElement('option');
                option.value = modelId;
                
                // Get simplified display name
                option.textContent = this.getDisplayName(modelId);
                
                // Set selected if it matches current model
                if (modelId === this.currentModel) {
                    option.selected = true;
                }
                
                previewGroup.appendChild(option);
            }
        });
        
        // Add system models
        systemModels.forEach(modelId => {
            if (this.modelInfo[modelId]) {
                const option = document.createElement('option');
                option.value = modelId;
                
                // Get simplified display name
                option.textContent = this.getDisplayName(modelId);
                
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
    }
    
    // Helper method to get a simplified display name for a model
    getDisplayName(modelId) {
        let displayName = modelId;
        
        // Simplify model names for better readability
        if (modelId === 'meta-llama/llama-4-maverick-17b-128e-instruct') {
            displayName = 'Llama 4 Maverick 17B';
        } else if (modelId === 'meta-llama/llama-4-scout-17b-16e-instruct') {
            displayName = 'Llama 4 Scout 17B';
        } else if (modelId.includes('llama-3.1')) {
            displayName = modelId.replace('llama-3.1-', 'Llama 3.1 ').replace('-versatile', ' Versatile').replace('-instant', ' Instant');
        } else if (modelId.includes('llama-3.3')) {
            displayName = modelId.replace('llama-3.3-', 'Llama 3.3 ').replace('-versatile', ' Versatile');
        } else if (modelId.includes('llama3-')) {
            displayName = modelId.replace('llama3-', 'Llama 3 ');
        } else if (modelId === 'llama-guard-3-8b') {
            displayName = 'Llama Guard 3 8B';
        } else if (modelId === 'gemma2-9b-it') {
            displayName = 'Gemma 2 9B IT';
        } else if (modelId === 'mixtral-8x7b-32768') {
            displayName = 'Mixtral 8x7B 32K';
        } else if (modelId === 'whisper-large-v3') {
            displayName = 'Whisper Large v3';
        } else if (modelId === 'whisper-large-v3-turbo') {
            displayName = 'Whisper Large v3 Turbo';
        } else if (modelId === 'distil-whisper-large-v3-en') {
            displayName = 'Distil Whisper Large v3 (EN)';
        } else if (modelId === 'allam-2-7b') {
            displayName = 'Allam 2 7B';
        } else if (modelId === 'deepseek-r1-distill-llama-70b') {
            displayName = 'DeepSeek R1 Distill Llama 70B';
        } else if (modelId === 'mistral-saba-24b') {
            displayName = 'Mistral Saba 24B';
        } else if (modelId === 'playai-tts') {
            displayName = 'PlayAI TTS';
        } else if (modelId === 'playai-tts-arabic') {
            displayName = 'PlayAI TTS Arabic';
        } else if (modelId === 'qwen-qwq-32b') {
            displayName = 'Qwen QWQ 32B';
        } else if (modelId === 'compound-beta') {
            displayName = 'Compound Beta';
        } else if (modelId === 'compound-beta-mini') {
            displayName = 'Compound Beta Mini';
        }
        
        return displayName;
    }
    
    showSettingsModal() {
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
        
        this.settingsModal.classList.add('active');
    }
    
    hideSettingsModal() {
        this.settingsModal.classList.remove('active');
    }
    
    saveApiKey() {
        const apiKey = this.apiKeyInput.value.trim();
        
        if (apiKey) {
            // Save API key to local storage
            localStorage.setItem('aihackare_api_key', apiKey);
            this.apiKey = apiKey;
            
            // Hide modal
            this.hideApiKeyModal();
            
            // Fetch available models with the new API key
            this.fetchAvailableModels();
            
            // Add welcome message
            this.addSystemMessage('API key saved. You can now start chatting with AI models.');
        }
    }
    
    saveSettings() {
        // Save model preference
        const selectedModel = this.modelSelect.value;
        localStorage.setItem('aihackare_model', selectedModel);
        this.currentModel = selectedModel;
        
        // Update API key if provided
        const newApiKey = this.apiKeyUpdate.value.trim();
        if (newApiKey) {
            localStorage.setItem('aihackare_api_key', newApiKey);
            this.apiKey = newApiKey;
        }
        
        // Update base URL if provided
        const baseUrlInput = document.getElementById('base-url');
        if (baseUrlInput && baseUrlInput.value.trim()) {
            const newBaseUrl = baseUrlInput.value.trim();
            localStorage.setItem('aihackare_base_url', newBaseUrl);
            this.baseUrl = newBaseUrl;
            
            // Update API endpoints with new base URL
            this.chatEndpoint = `${this.baseUrl}/chat/completions`;
            this.modelsEndpoint = `${this.baseUrl}/models`;
        }
        
        // Update model info in header
        this.updateModelInfoDisplay();
        
        // Hide modal
        this.hideSettingsModal();
        
        // Get a simplified display name for the model
        const displayName = this.getDisplayName(selectedModel);
        
        // Add confirmation message
        this.addSystemMessage(`Settings saved. Using model: ${displayName}`);
    }
    
    sendMessage() {
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
    }
    
    async generateResponse() {
        if (!this.apiKey) return;
        
        this.isGenerating = true;
        
        // Change send button to stop button
        this.sendBtn.innerHTML = '<i class="fas fa-stop"></i>';
        this.sendBtn.title = 'Stop generation';
        
        // Add typing indicator
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'typing-indicator';
        typingIndicator.innerHTML = '<span></span><span></span><span></span>';
        this.chatMessages.appendChild(typingIndicator);
        this.scrollToBottom();
        
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
            
            // Prepare request
            const response = await fetch(this.chatEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.currentModel,
                    messages: apiMessages,
                    stream: true
                }),
                signal: signal
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Error connecting to API');
            }
            
            // Remove typing indicator
            typingIndicator.remove();
            
            // Process the stream
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let aiResponse = '';
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                // Decode chunk
                const chunk = decoder.decode(value);
                
                // Process SSE format
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                        try {
                            const data = JSON.parse(line.substring(6));
                            const content = data.choices[0]?.delta?.content || '';
                            if (content) {
                                aiResponse += content;
                                this.updateAIMessage(aiResponse, aiMessageId);
                            }
                        } catch (e) {
                            console.error('Error parsing SSE:', e);
                        }
                    }
                }
            }
            
            // Update messages array with complete AI response
            this.messages[this.messages.length - 1].content = aiResponse;
            
            // Save chat history
            this.saveChatHistory();
            
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
    }
    
    stopGeneration() {
        if (this.controller) {
            this.controller.abort();
        }
    }
    
    addUserMessage(content) {
        // Add to messages array
        this.messages.push({
            role: 'user',
            content: content
        });
        
        // Create message element
        const messageElement = document.createElement('div');
        messageElement.className = 'message user';
        messageElement.innerHTML = `
            <div class="message-content">
                <p>${this.escapeHTML(content)}</p>
            </div>
        `;
        
        // Add to chat
        this.chatMessages.appendChild(messageElement);
        
        // Scroll to bottom
        this.scrollToBottom();
        
        // Save chat history
        this.saveChatHistory();
        
        // Update context usage
        this.estimateContextUsage();
    }
    
    addAIMessage(content, id) {
        // Add to messages array
        this.messages.push({
            role: 'assistant',
            content: content
        });
        
        // Create message element
        const messageElement = document.createElement('div');
        messageElement.className = 'message ai';
        messageElement.dataset.id = id;
        messageElement.innerHTML = `
            <div class="message-content markdown-content">
                ${content ? this.renderMarkdown(content) : ''}
            </div>
        `;
        
        // Add to chat
        this.chatMessages.appendChild(messageElement);
        
        // Scroll to bottom
        this.scrollToBottom();
    }
    
    updateAIMessage(content, id) {
        const messageElement = document.querySelector(`.message[data-id="${id}"]`);
        if (messageElement) {
            const contentElement = messageElement.querySelector('.message-content');
            contentElement.innerHTML = this.renderMarkdown(content);
            this.scrollToBottom();
            
            // Update context usage
            this.estimateContextUsage();
        }
    }
    
    addSystemMessage(content) {
        // Create message element
        const messageElement = document.createElement('div');
        messageElement.className = 'message system';
        messageElement.innerHTML = `
            <div class="message-content">
                <p>${this.escapeHTML(content)}</p>
            </div>
        `;
        
        // Add to chat
        this.chatMessages.appendChild(messageElement);
        
        // Scroll to bottom
        this.scrollToBottom();
    }
    
    renderMarkdown(text) {
        // Use marked.js to render markdown
        // DOMPurify is used to sanitize the HTML
        return DOMPurify.sanitize(marked.parse(text));
    }
    
    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
    
    saveChatHistory() {
        localStorage.setItem('aihackare_history', JSON.stringify(this.messages));
    }
    
    loadChatHistory() {
        const savedHistory = localStorage.getItem('aihackare_history');
        
        if (savedHistory) {
            try {
                this.messages = JSON.parse(savedHistory);
                
                // Clear chat container
                this.chatMessages.innerHTML = '';
                
                // Add messages to chat
                this.messages.forEach(message => {
                    if (message.role === 'user') {
                        const messageElement = document.createElement('div');
                        messageElement.className = 'message user';
                        messageElement.innerHTML = `
                            <div class="message-content">
                                <p>${this.escapeHTML(message.content)}</p>
                            </div>
                        `;
                        this.chatMessages.appendChild(messageElement);
                    } else if (message.role === 'assistant') {
                        const messageElement = document.createElement('div');
                        messageElement.className = 'message ai';
                        messageElement.innerHTML = `
                            <div class="message-content markdown-content">
                                ${this.renderMarkdown(message.content)}
                            </div>
                        `;
                        this.chatMessages.appendChild(messageElement);
                    }
                });
                
                // Scroll to bottom
                this.scrollToBottom();
                
                // Update context usage based on loaded history
                this.estimateContextUsage();
            } catch (error) {
                console.error('Error loading chat history:', error);
                this.addSystemMessage('Error loading chat history.');
            }
        }
    }
    
    clearChatHistory() {
        // Clear messages array
        this.messages = [];
        
        // Clear chat container
        this.chatMessages.innerHTML = '';
        
        // Add welcome message
        this.addSystemMessage('Chat history cleared.');
        
        // Clear local storage
        localStorage.removeItem('aihackare_history');
        
        // Reset context usage
        this.updateContextUsage(0);
    }
    
    estimateContextUsage() {
        // Estimate token count based on message content
        // A rough estimate is 1 token per 4 characters
        let totalChars = 0;
        
        this.messages.forEach(message => {
            totalChars += message.content.length;
        });
        
        // Estimate tokens (4 chars per token is a rough approximation)
        const estimatedTokens = Math.ceil(totalChars / 4);
        
        // Get context window size for the current model
        const modelInfo = this.modelInfo[this.currentModel];
        let contextSize = 8192; // Default to 8K if not specified
        
        if (modelInfo && modelInfo.contextWindow !== '-') {
            // Parse context window size (e.g., "128K" -> 131072)
            const sizeStr = modelInfo.contextWindow.toLowerCase();
            if (sizeStr.endsWith('k')) {
                contextSize = parseInt(sizeStr) * 1024;
            } else {
                contextSize = parseInt(sizeStr.replace(/,/g, ''));
            }
        }
        
        // Calculate percentage
        const percentage = Math.min(Math.round((estimatedTokens / contextSize) * 100), 100);
        
        // Update the display
        this.updateContextUsage(percentage);
    }
}
