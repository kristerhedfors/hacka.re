/**
 * Chat Manager Module
 * Handles chat-related functionality for the AIHackare application
 */

window.ChatManager = (function() {
    /**
     * Create a Chat Manager instance
     * @param {Object} elements - DOM elements
     * @returns {Object} Chat Manager instance
     */
    function createChatManager(elements) {
        // Chat state
        let messages = [];
        let isGenerating = false;
        let controller = null;
        let tokenCount = 0;
        let generationStartTime = null;
        let lastUpdateTime = null;
        
        /**
         * Initialize the chat manager
         */
        function init() {
            // Load chat history
            loadChatHistory();
        }
        
/**
 * Send a message
 * @param {string} message - Message content
 * @param {string} apiKey - API key
 * @param {string} currentModel - Current model ID
 * @param {string} systemPrompt - System prompt
 * @param {Function} showApiKeyModal - Function to show API key modal
 * @param {Function} updateContextUsage - Function to update context usage
 * @param {Object} apiToolsManager - API tools manager for tool calling
 */
function sendMessage(message, apiKey, currentModel, systemPrompt, showApiKeyModal, updateContextUsage, apiToolsManager) {
    if (!message) return;
    
    if (!apiKey) {
        showApiKeyModal();
        return;
    }
    
    if (isGenerating) {
        stopGeneration();
        return;
    }
    
    // Add user message to chat
    addUserMessage(message);
    
    // Clear input
    elements.messageInput.value = '';
    elements.messageInput.style.height = 'auto';
    
    // Focus input
    elements.messageInput.focus();
    
    // Send to API
    generateResponse(apiKey, currentModel, systemPrompt, updateContextUsage, apiToolsManager);
}

/**
 * Generate a response from the API
 * @param {string} apiKey - API key
 * @param {string} currentModel - Current model ID
 * @param {string} systemPrompt - System prompt
 * @param {Function} updateContextUsage - Function to update context usage
 * @param {Object} apiToolsManager - API tools manager for tool calling
 */
async function generateResponse(apiKey, currentModel, systemPrompt, updateContextUsage, apiToolsManager) {
    if (!apiKey) return;
    
    isGenerating = true;
    
    // Reset token speed tracking
    generationStartTime = null;
    lastUpdateTime = null;
    tokenCount = 0;
    if (elements.tokenSpeedText) {
        elements.tokenSpeedText.textContent = '0 t/s';
    }
    
    // Change send button to stop button
    elements.sendBtn.innerHTML = '<i class="fas fa-stop"></i>';
    elements.sendBtn.title = 'Stop generation';
    
    // Dispatch event to start heart animation
    document.dispatchEvent(new CustomEvent('ai-response-start'));
    
    // Add typing indicator
    const typingIndicator = UIUtils.createTypingIndicator();
    elements.chatMessages.appendChild(typingIndicator);
    UIUtils.scrollToBottom(elements.chatMessages);
    
    // Prepare messages for API
    const apiMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
    }));
    
    // Create AI message placeholder
    const aiMessageId = Date.now().toString();
    addAIMessage('', aiMessageId);
    
    try {
        // Create AbortController for fetch
        controller = new AbortController();
        const signal = controller.signal;
        
        // Generate response
        const aiResponse = await ApiService.generateChatCompletion(
            apiKey,
            currentModel,
            apiMessages,
            signal,
            (content) => updateAIMessage(content, aiMessageId, updateContextUsage),
            systemPrompt,
            apiToolsManager
        );
        
        // Remove typing indicator
        typingIndicator.remove();
        
        // Update messages array with complete AI response
        messages[messages.length - 1].content = aiResponse;
        
        // Save chat history
        StorageService.saveChatHistory(messages);
        
    } catch (error) {
        // Remove typing indicator
        typingIndicator.remove();
        
        // Show error message
        if (error.name === 'AbortError') {
            addSystemMessage('Response generation stopped.');
        } else {
            console.error('API Error:', error);
            addSystemMessage(`Error: ${error.message}`);
        }
    } finally {
        // Reset state
        isGenerating = false;
        controller = null;
        
        // Reset send button
        elements.sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
        elements.sendBtn.title = 'Send message';
        
        // Dispatch event to stop heart animation
        document.dispatchEvent(new CustomEvent('ai-response-end'));
    }
}
        
        /**
         * Stop response generation
         */
        function stopGeneration() {
            if (controller) {
                controller.abort();
                
                // Dispatch event to stop heart animation when manually stopped
                document.dispatchEvent(new CustomEvent('ai-response-end'));
            }
        }
        
        /**
         * Add a user message to the chat
         * @param {string} content - Message content
         * @param {Function} updateContextUsage - Function to update context usage
         */
        function addUserMessage(content, updateContextUsage) {
            // Add to messages array
            messages.push({
                role: 'user',
                content: content
            });
            
            // Create message element
            const messageElement = UIUtils.createMessageElement('user', content);
            
            // Add to chat
            elements.chatMessages.appendChild(messageElement);
            
            // Scroll to bottom
            UIUtils.scrollToBottom(elements.chatMessages);
            
            // Save chat history
            StorageService.saveChatHistory(messages);
            
            // Update context usage
            if (updateContextUsage) {
                estimateContextUsage(updateContextUsage);
            }
        }
        
        /**
         * Add an AI message to the chat
         * @param {string} content - Message content
         * @param {string} id - Message ID
         */
        function addAIMessage(content, id) {
            // Add to messages array
            messages.push({
                role: 'assistant',
                content: content
            });
            
            // Create message element
            const messageElement = UIUtils.createMessageElement('assistant', content, id);
            
            // Add to chat
            elements.chatMessages.appendChild(messageElement);
            
            // Scroll to bottom
            UIUtils.scrollToBottom(elements.chatMessages);
        }
        
        /**
         * Update an AI message in the chat
         * @param {string} content - New message content
         * @param {string} id - Message ID
         * @param {Function} updateContextUsage - Function to update context usage
         */
        function updateAIMessage(content, id, updateContextUsage) {
            const messageElement = document.querySelector(`.message[data-id="${id}"]`);
            if (messageElement) {
                const contentElement = messageElement.querySelector('.message-content');
                contentElement.innerHTML = UIUtils.renderMarkdown(content);
                UIUtils.scrollToBottom(elements.chatMessages);
                
                // Calculate token speed
                calculateTokenSpeed(content);
                
                // Update context usage
                if (updateContextUsage) {
                    estimateContextUsage(updateContextUsage);
                }
            }
        }
        
        /**
         * Calculate and update token generation speed
         * @param {string} content - Current content
         */
        function calculateTokenSpeed(content) {
            // Initialize timing on first token
            if (!generationStartTime) {
                generationStartTime = Date.now();
                lastUpdateTime = generationStartTime;
                tokenCount = 0;
                
                // Reset token speed display
                if (elements.tokenSpeedText) {
                    elements.tokenSpeedText.textContent = '0 t/s';
                }
                return;
            }
            
            // Estimate new tokens (rough approximation: 1 token per 4 characters)
            const newContent = content;
            const newTokenCount = Math.ceil(newContent.length / 4);
            
            // Calculate tokens added since last update
            const tokenDelta = newTokenCount - tokenCount;
            tokenCount = newTokenCount;
            
            // Only update speed calculation periodically to smooth out the display
            const now = Date.now();
            const timeSinceStart = (now - generationStartTime) / 1000; // in seconds
            
            if (timeSinceStart > 0 && tokenCount > 0) {
                // Calculate tokens per second
                const tokensPerSecond = Math.round(tokenCount / timeSinceStart);
                
                // Update the display
                if (elements.tokenSpeedText) {
                    elements.tokenSpeedText.textContent = `${tokensPerSecond} t/s`;
                }
            }
        }
        
        /**
         * Add a system message to the chat
         * @param {string} content - Message content
         */
        function addSystemMessage(content) {
            // Create message element
            const messageElement = UIUtils.createMessageElement('system', content);
            
            // Add to chat
            elements.chatMessages.appendChild(messageElement);
            
            // Scroll to bottom
            UIUtils.scrollToBottom(elements.chatMessages);
        }
        
        /**
         * Load chat history from storage
         */
        function loadChatHistory() {
            const savedHistory = StorageService.loadChatHistory();
            
            if (savedHistory) {
                try {
                    messages = savedHistory;
                    
                    // Clear chat container
                    elements.chatMessages.innerHTML = '';
                    
                    // Add messages to chat
                    messages.forEach(message => {
                        if (message.role === 'user') {
                            const messageElement = UIUtils.createMessageElement('user', message.content);
                            elements.chatMessages.appendChild(messageElement);
                        } else if (message.role === 'assistant') {
                            const messageElement = UIUtils.createMessageElement('assistant', message.content);
                            elements.chatMessages.appendChild(messageElement);
                        }
                    });
                    
                    // Scroll to bottom
                    UIUtils.scrollToBottom(elements.chatMessages);
                    
                } catch (error) {
                    console.error('Error loading chat history:', error);
                    addSystemMessage('Error loading chat history.');
                }
            }
            
            return messages;
        }
        
        /**
         * Clear chat history
         * @param {Function} updateContextUsage - Function to update context usage
         */
        function clearChatHistory(updateContextUsage) {
            // Clear messages array
            messages = [];
            
            // Clear chat container
            elements.chatMessages.innerHTML = '';
            
            // Add welcome message
            addSystemMessage('Chat history cleared.');
            
            // Clear local storage - this uses the current namespace
            StorageService.clearChatHistory();
            
            // Also clear any legacy non-namespaced history that might exist
            localStorage.removeItem(StorageService.BASE_STORAGE_KEYS.HISTORY);
            
            // Reset context usage
            if (updateContextUsage) {
                updateContextUsage(0);
            }
        }
        
        /**
         * Estimate context usage
         * @param {Function} updateContextUsage - Function to update context usage
         * @param {string} currentModel - Current model ID
         */
        function estimateContextUsage(updateContextUsage, currentModel) {
            // Calculate percentage using the utility function
            const percentage = UIUtils.estimateContextUsage(
                messages, 
                ModelInfoService.modelInfo, 
                currentModel
            );
            
            // Update the display
            if (updateContextUsage) {
                updateContextUsage(percentage);
            }
            
            return percentage;
        }
        
        /**
         * Get current messages
         * @returns {Array} Current messages
         */
        function getMessages() {
            return messages;
        }
        
        /**
         * Set messages
         * @param {Array} newMessages - New messages
         */
        function setMessages(newMessages) {
            if (!newMessages || !Array.isArray(newMessages) || newMessages.length === 0) {
                return;
            }
            
            // Update messages array
            messages = newMessages;
            
            // Clear chat container
            elements.chatMessages.innerHTML = '';
            
            // Add messages to chat
            messages.forEach(message => {
                if (message.role === 'user') {
                    const messageElement = UIUtils.createMessageElement('user', message.content);
                    elements.chatMessages.appendChild(messageElement);
                } else if (message.role === 'assistant') {
                    const messageElement = UIUtils.createMessageElement('assistant', message.content);
                    elements.chatMessages.appendChild(messageElement);
                }
            });
            
            // Scroll to bottom
            UIUtils.scrollToBottom(elements.chatMessages);
            
            // Save to local storage
            StorageService.saveChatHistory(messages);
        }
        
        // Public API
        return {
            init,
            sendMessage,
            stopGeneration,
            addUserMessage,
            addAIMessage,
            updateAIMessage,
            addSystemMessage,
            loadChatHistory,
            clearChatHistory,
            estimateContextUsage,
            getMessages,
            setMessages
        };
    }

    // Public API
    return {
        createChatManager: createChatManager
    };
})();
