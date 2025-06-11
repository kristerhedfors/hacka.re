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
        
        // Service instances
        let uiHandler = null;
        let streamingHandler = null;
        
        /**
         * Initialize the chat manager
         */
        function init() {
            // Initialize service handlers
            uiHandler = ChatUIService.createUIStateHandler(elements);
            streamingHandler = ChatStreamingService.createStreamingHandler(elements);
            
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
 * @param {Object} mcpManager - Deprecated parameter, kept for compatibility
 * @param {Object} functionCallingManager - Function calling manager for OpenAPI functions
 */
function sendMessage(message, apiKey, currentModel, systemPrompt, showApiKeyModal, updateContextUsage, apiToolsManager, mcpManager, functionCallingManager) {
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
    
    // Clear input and focus
    uiHandler.clearInput();
    
    // Send to API
    generateResponse(apiKey, currentModel, systemPrompt, updateContextUsage, apiToolsManager, mcpManager, functionCallingManager);
}

/**
 * Generate a response from the API
 * @param {string} apiKey - API key
 * @param {string} currentModel - Current model ID
 * @param {string} systemPrompt - System prompt
 * @param {Function} updateContextUsage - Function to update context usage
 * @param {Object} apiToolsManager - API tools manager for tool calling
 * @param {Object} mcpManager - Deprecated parameter, kept for compatibility
 * @param {Object} functionCallingManager - Function calling manager for OpenAPI functions
 */
async function generateResponse(apiKey, currentModel, systemPrompt, updateContextUsage, apiToolsManager, _mcpManager, functionCallingManager) {
    if (!apiKey) return;
    
    // Setup generation state
    const generationState = setupGenerationState();
    const typingIndicator = generationState.typingIndicator;
    const aiMessageId = generationState.aiMessageId;
    
    try {
        // Create combined tools manager
        const combinedToolsManager = ChatToolsService.createCombinedToolsManager(apiToolsManager, functionCallingManager);
        
        // Prepare API messages
        const apiMessages = prepareAPIMessages();
        
        // Generate response from API
        const aiResponse = await generateAPIResponse(
            apiKey, 
            currentModel, 
            apiMessages, 
            generationState.signal, 
            aiMessageId, 
            updateContextUsage, 
            systemPrompt, 
            combinedToolsManager
        );
        
        // Process function markers if needed
        const finalContent = processFunctionMarkers(aiResponse, aiMessageId);
        
        // Finalize response
        finalizeResponse(finalContent, typingIndicator);
        
    } catch (error) {
        handleGenerationError(error, typingIndicator);
    } finally {
        cleanupGeneration(updateContextUsage, currentModel);
    }
}

/**
 * Setup initial generation state and UI
 * @returns {Object} Generation state object
 */
function setupGenerationState() {
    isGenerating = true;
    
    // Initialize streaming
    streamingHandler.initializeStreaming();
    
    // Set UI to generating state
    uiHandler.setGeneratingState();
    
    // Add typing indicator
    const typingIndicator = uiHandler.addTypingIndicator();
    
    // Create AI message placeholder
    const aiMessageId = Date.now().toString();
    addAIMessage('', aiMessageId);
    
    // Create AbortController for fetch
    controller = new AbortController();
    
    return {
        typingIndicator,
        aiMessageId,
        signal: controller.signal
    };
}

/**
 * Prepare messages for API
 * @returns {Array} API messages
 */
function prepareAPIMessages() {
    return messages.map(msg => ({
        role: msg.role,
        content: msg.content
    }));
}

/**
 * Generate response from API
 * @param {string} apiKey - API key
 * @param {string} currentModel - Current model
 * @param {Array} apiMessages - Prepared API messages
 * @param {AbortSignal} signal - Abort signal
 * @param {string} aiMessageId - AI message ID
 * @param {Function} updateContextUsage - Context usage callback
 * @param {string} systemPrompt - System prompt
 * @param {Object} combinedToolsManager - Combined tools manager
 * @returns {string} AI response content
 */
async function generateAPIResponse(apiKey, currentModel, apiMessages, signal, aiMessageId, updateContextUsage, systemPrompt, combinedToolsManager) {
    return await ApiService.generateChatCompletion(
        apiKey,
        currentModel,
        apiMessages,
        signal,
        (content) => streamingHandler.updateStreamingMessage(content, aiMessageId, () => estimateContextUsage(updateContextUsage, currentModel)),
        systemPrompt,
        combinedToolsManager,
        addSystemMessage
    );
}

/**
 * Process function markers in AI response
 * @param {string} aiResponse - Original AI response
 * @param {string} _aiMessageId - AI message ID (unused for now)
 * @returns {string} Final content with markers
 */
function processFunctionMarkers(aiResponse, _aiMessageId) {
    // This will be enhanced to track function calls during API processing
    // For now, return the response as-is
    return aiResponse;
}

/**
 * Finalize the response and update storage
 * @param {string} finalContent - Final response content
 * @param {HTMLElement} typingIndicator - Typing indicator element
 */
function finalizeResponse(finalContent, typingIndicator) {
    // Remove typing indicator
    uiHandler.removeTypingIndicator(typingIndicator);
    
    // Update messages array with complete AI response
    messages[messages.length - 1].content = finalContent;
    
    // Save chat history
    StorageService.saveChatHistory(messages);
}

/**
 * Handle generation errors
 * @param {Error} error - The error that occurred
 * @param {HTMLElement} typingIndicator - Typing indicator element
 */
function handleGenerationError(error, typingIndicator) {
    // Remove typing indicator
    uiHandler.removeTypingIndicator(typingIndicator);
    
    // Show error message
    if (error.name === 'AbortError') {
        addSystemMessage('Response generation stopped.');
    } else {
        console.error('API Error:', error);
        addSystemMessage(`Error: ${error.message}`);
    }
}

/**
 * Cleanup generation state
 * @param {Function} updateContextUsage - Context usage callback
 * @param {string} currentModel - Current model
 */
function cleanupGeneration(updateContextUsage, currentModel) {
    // Reset state
    isGenerating = false;
    controller = null;
    
    // Reset UI state
    uiHandler.resetState();
    
    // Update context usage one final time after generation is complete
    if (updateContextUsage) {
        estimateContextUsage(updateContextUsage, currentModel);
    }
}
        
        /**
         * Stop response generation
         */
        function stopGeneration() {
            if (controller) {
                controller.abort();
                
                // Reset UI state when manually stopped
                uiHandler.resetState();
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
            
            // Add to UI
            uiHandler.addUserMessageToUI(content);
            
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
            
            // Add to UI
            uiHandler.addAIMessageToUI(content, id);
        }
        
        /**
         * Update an AI message in the chat
         * @param {string} content - New message content
         * @param {string} id - Message ID
         * @param {Function} updateContextUsage - Function to update context usage
         */
        function updateAIMessage(content, id, updateContextUsage) {
            // Delegate to streaming handler
            streamingHandler.updateStreamingMessage(content, id, updateContextUsage);
        }
        
        
        /**
         * Add a system message to the chat
         * @param {string} content - Message content
         * @param {string} className - Optional CSS class to add to the message
         */
        function addSystemMessage(content, className) {
            // Delegate to UI handler
            uiHandler.addSystemMessageToUI(content, className);
        }
        
        /**
         * Load chat history from storage
         */
        function loadChatHistory() {
            const savedHistory = StorageService.loadChatHistory();
            
            if (savedHistory) {
                try {
                    messages = savedHistory;
                    
                    // Display messages using UI handler
                    uiHandler.displayMessages(messages);
                    
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
            
            // Clear UI
            uiHandler.clearChat();
            
            // Add welcome message
            addSystemMessage('Chat history cleared.');
            
            // Clear local storage - this uses the current namespace
            StorageService.clearChatHistory();
            
            // Also clear any legacy non-namespaced history that might exist
            localStorage.removeItem(StorageService.BASE_STORAGE_KEYS.HISTORY);
            
            // Reset context usage
            resetContextUsage(updateContextUsage);
        }
        
        /**
         * Reset context usage to system prompt only
         * @param {Function} updateContextUsage - Function to update context usage
         */
        function resetContextUsage(updateContextUsage) {
            if (!updateContextUsage) return;
            
            // Get system prompt for context usage calculation
            const systemPrompt = StorageService.getSystemPrompt() || '';
            
            // Get the current model
            const currentModel = window.aiHackare && window.aiHackare.settingsManager ? 
                window.aiHackare.settingsManager.getCurrentModel() : '';
            
            // Calculate usage based on system prompt (if any)
            const usageInfo = UIUtils.estimateContextUsage(
                [], // Empty messages array
                ModelInfoService.modelInfo, 
                currentModel,
                systemPrompt
            );
            
            // Update the context usage display with all the information
            updateContextUsage(usageInfo.percentage, usageInfo.estimatedTokens, usageInfo.contextSize);
        }
        
        /**
         * Estimate context usage
         * @param {Function} updateContextUsage - Function to update context usage
         * @param {string} currentModel - Current model ID
         * @returns {Object} - Object containing estimated tokens, context size, and usage percentage
         */
        function estimateContextUsage(updateContextUsage, currentModel) {
            // Get system prompt
            const systemPrompt = StorageService.getSystemPrompt() || '';
            console.log("ChatManager.estimateContextUsage called");
            console.log("- currentModel:", currentModel);
            console.log("- systemPrompt length:", systemPrompt ? systemPrompt.length : 0);
            console.log("- messages count:", messages ? messages.length : 0);
            
            // Calculate usage using the utility function
            const usageInfo = UIUtils.estimateContextUsage(
                messages, 
                ModelInfoService.modelInfo, 
                currentModel,
                systemPrompt
            );
            
            console.log("ChatManager: calculated usage info:", usageInfo);
            
            // Update the display
            if (updateContextUsage) {
                console.log("ChatManager: calling updateContextUsage with percentage:", usageInfo.percentage);
                updateContextUsage(usageInfo.percentage, usageInfo.estimatedTokens, usageInfo.contextSize);
            } else {
                console.log("ChatManager: updateContextUsage function not provided");
            }
            
            return usageInfo;
        }
        
        /**
         * Get current messages
         * @returns {Array} Current messages
         */
        function getMessages() {
            return messages;
        }
        
        /**
         * Check if currently generating
         * @returns {boolean} True if generating
         */
        function getIsGenerating() {
            return isGenerating;
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
            
            // Display messages using UI handler
            uiHandler.displayMessages(messages);
            
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
            getIsGenerating,
            setMessages
        };
    }

    // Public API
    return {
        createChatManager: createChatManager
    };
})();
