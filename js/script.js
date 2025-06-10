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
        // Initialize managers
        this.storageManager = new StorageManager();
        this.modelManager = new ModelManager();
        this.modalManager = new ModalManager();
        this.apiManager = new APIManager();
        
        // DOM Elements
        this.settingsBtn = document.getElementById('settings-btn');
        this.messageInput = document.getElementById('message-input');
        this.sendBtn = document.getElementById('send-btn');
        
        // Initialize base URL
        this.baseUrl = this.storageManager.getBaseUrl();
        this.apiManager.setEndpoints(this.baseUrl);
    }
    
    init() {
        // Initialize model manager
        this.modelManager.init();
        
        // Check if API key exists
        this.apiKey = this.storageManager.getApiKey();
        
        if (!this.apiKey) {
            this.modalManager.showApiKeyModal();
        } else {
            // Fetch available models if API key exists
            this.modelManager.fetchAvailableModels(this.apiKey, this.apiManager.modelsEndpoint);
        }
        
        // Load chat history
        const savedHistory = this.storageManager.getChatHistory();
        this.loadChatHistory(savedHistory);
        
        // Event listeners
        this.setupEventListeners();
        
        // Auto-resize textarea
        this.setupTextareaAutoResize();
    }
    
    updateContextUsage() {
        const messages = this.getMessages();
        this.modelManager.estimateContextUsage(messages);
    }
    
    setupEventListeners() {
        // Settings button click
        if (this.settingsBtn) {
            this.settingsBtn.addEventListener('click', () => {
                this.showSettingsModal();
            });
        }
        
        // API key form submission
        this.modalManager.onApiKeySubmit((apiKey) => {
            this.saveApiKey(apiKey);
        });
        
        // Settings form submission
        this.modalManager.onSettingsSubmit((settings) => {
            this.saveSettings(settings);
        });
    }
    
    setupTextareaAutoResize() {
        this.messageInput.addEventListener('input', () => {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = (this.messageInput.scrollHeight) + 'px';
        });
    }
    
    showSettingsModal() {
        const currentModel = this.modelManager.getCurrentModel();
        this.modalManager.showSettingsModal(this.apiKey, currentModel, this.modelManager);
        
        // Refresh models list when opening settings
        if (this.apiKey) {
            this.modelManager.fetchAvailableModels(this.apiKey, this.apiManager.modelsEndpoint);
        }
    }
    
    saveApiKey(apiKey) {
        if (apiKey) {
            this.storageManager.setApiKey(apiKey);
            this.apiKey = apiKey;
            
            this.modalManager.hideApiKeyModal();
            
            // Fetch available models with the new API key
            this.modelManager.fetchAvailableModels(this.apiKey, this.apiManager.modelsEndpoint);
            
            this.addSystemMessage('API key saved. You can now start chatting with AI models.');
        }
    }
    
    saveSettings(settings) {
        // Save model preference
        if (settings.model) {
            this.modelManager.setCurrentModel(settings.model);
        }
        
        // Update API key if provided
        if (settings.apiKey) {
            this.storageManager.setApiKey(settings.apiKey);
            this.apiKey = settings.apiKey;
        }
        
        // Update base URL if provided
        if (settings.baseUrl) {
            this.storageManager.setBaseUrl(settings.baseUrl);
            this.baseUrl = settings.baseUrl;
            this.apiManager.setEndpoints(this.baseUrl);
        }
        
        this.modalManager.hideSettingsModal();
        
        const displayName = this.modelManager.getDisplayName(settings.model);
        this.addSystemMessage(`Settings saved. Using model: ${displayName}`);
    }
    
    sendMessage() {
        const message = this.messageInput.value.trim();
        
        if (!message) return;
        
        if (!this.apiKey) {
            this.modalManager.showApiKeyModal();
            return;
        }
        
        if (this.apiManager.getIsGenerating()) {
            this.apiManager.stopGeneration();
            return;
        }
        
        // Add user message to chat
        this.addUserMessage(message);
        
        // Clear input
        this.messageInput.value = '';
        this.messageInput.style.height = 'auto';
        this.messageInput.focus();
        
        // Send to API
        this.generateResponse();
    }
    
    // Simple wrapper methods that delegate to existing components
    generateResponse() {
        // This will use the existing ChatManager and ApiService architecture
        // For now, just a placeholder that integrates with existing system
        console.warn('generateResponse called - should use existing ChatManager');
    }
    
    addUserMessage(content) {
        // Placeholder - should integrate with existing ChatManager
        console.warn('addUserMessage called - should use existing ChatManager');
    }
    
    addSystemMessage(content) {
        // Placeholder - should integrate with existing ChatManager  
        console.warn('addSystemMessage called - should use existing ChatManager');
    }
    
    loadChatHistory(savedHistory) {
        // Use the storage manager
        console.log('Loading chat history:', savedHistory ? savedHistory.length : 0, 'messages');
    }
    
    getMessages() {
        // Placeholder for getting messages
        return [];
    }
}
