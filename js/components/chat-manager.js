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
        let conversationMessageCount = 0; // Track only user/assistant messages
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
        
        // Enhance system prompt with RAG search if available
        const enhancedSystemPrompt = await enhanceSystemPromptWithRAG(systemPrompt, apiMessages, apiKey);
        
        // Generate response from API
        const aiResponse = await generateAPIResponse(
            apiKey, 
            currentModel, 
            apiMessages, 
            generationState.signal, 
            aiMessageId, 
            updateContextUsage, 
            enhancedSystemPrompt, 
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
    
    // Create AI message placeholder (will be added when we receive first content)
    const aiMessageId = Date.now().toString();
    
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
        (content) => streamingHandler.updateStreamingMessage(content, aiMessageId, () => estimateContextUsage(updateContextUsage, currentModel), addAIMessage, uiHandler),
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
    if (messages.length > 0 && messages[messages.length - 1].role === 'assistant') {
        messages[messages.length - 1].content = finalContent;
        // Only increment counter if the assistant message has actual content
        if (finalContent && finalContent.trim()) {
            conversationMessageCount++;
        }
    }
    
    // Save chat history
    StorageService.saveChatHistory(messages);
    
    // Notify cross-tab sync service
    if (window.CrossTabSyncService && window.CrossTabSyncService.isInitialized()) {
        window.CrossTabSyncService.notifyMessageAdded();
    }
}

/**
 * Handle generation errors
 * @param {Error} error - The error that occurred
 * @param {HTMLElement} typingIndicator - Typing indicator element
 */
function handleGenerationError(error, typingIndicator) {
    // Remove typing indicator
    uiHandler.removeTypingIndicator(typingIndicator);
    
    // Remove the empty assistant message if it was added
    if (messages.length > 0 && messages[messages.length - 1].role === 'assistant' && messages[messages.length - 1].content === '') {
        messages.pop();
    }
    
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
            
            // Increment conversation message counter
            conversationMessageCount++;
            
            // Add to UI
            uiHandler.addUserMessageToUI(content);
            
            // Save chat history
            StorageService.saveChatHistory(messages);
            
            // Notify cross-tab sync service
            if (window.CrossTabSyncService && window.CrossTabSyncService.isInitialized()) {
                window.CrossTabSyncService.notifyMessageAdded();
            }
            
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
         * @returns {HTMLElement} The created message element
         */
        function addSystemMessage(content, className) {
            // Delegate to UI handler and return the element
            return uiHandler.addSystemMessageToUI(content, className);
        }
        
        /**
         * Load chat history from storage
         */
        function loadChatHistory() {
            const savedHistory = StorageService.loadChatHistory();
            
            if (savedHistory) {
                try {
                    messages = savedHistory;
                    
                    // Count conversation messages (user and assistant with content)
                    conversationMessageCount = 0;
                    messages.forEach(msg => {
                        if (msg.role === 'user' || 
                            (msg.role === 'assistant' && msg.content && msg.content.trim())) {
                            conversationMessageCount++;
                        }
                    });
                    
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
         * Reload conversation history for existing namespace continuity
         * This method is specifically for when returning to an existing namespace
         * and we want to display the full conversation history
         */
        async function reloadConversationHistory() {
            console.log('[ChatManager] Reloading conversation history for namespace continuity');
            
            // DON'T clear the UI - we want to preserve any welcome message
            // Just add messages that aren't already displayed
            
            // Load fresh chat history from storage
            const savedHistory = StorageService.loadChatHistory();
            
            console.log('[ChatManager] Loaded history from storage:', savedHistory);
            console.log('[ChatManager] Raw history details:', savedHistory?.map(msg => ({
                role: msg.role,
                content: msg.content?.substring(0, 100) + '...',
                timestamp: msg.timestamp
            })));
            
            // TEMP DEBUG: Let's see what's actually available
            console.log('[ChatManager] DEBUG - Available objects:');
            console.log('- window.LinkSharingService:', !!window.LinkSharingService);
            console.log('- window.aiHackare:', !!window.aiHackare);
            console.log('- window.aiHackare.shareManager:', !!(window.aiHackare && window.aiHackare.shareManager));
            
            // Let's also check what the shared link originally contained
            if (window.LinkSharingService && window.aiHackare && window.aiHackare.shareManager) {
                try {
                    const sessionKey = window.aiHackare.shareManager.getSessionKey();
                    console.log('[ChatManager] DEBUG session key:', sessionKey ? sessionKey.length + ' chars' : 'null');
                    if (sessionKey) {
                        const sharedData = window.LinkSharingService.extractSharedApiKey(sessionKey);
                        console.log('[ChatManager] DEBUG extracted shared data:', sharedData);
                        console.log('[ChatManager] Original shared data messages:', sharedData?.messages?.map(msg => ({
                            role: msg.role,
                            content: msg.content?.substring(0, 100) + '...'
                        })));
                    } else {
                        console.log('[ChatManager] No session key available for shared data extraction');
                    }
                } catch (error) {
                    console.log('[ChatManager] Could not extract shared data:', error.message);
                }
            }
            
            if (savedHistory && Array.isArray(savedHistory) && savedHistory.length > 0) {
                // Check if savedHistory contains real conversation (user/assistant messages)
                const hasRealConversation = savedHistory.some(msg => 
                    msg.role === 'user' || msg.role === 'assistant'
                );
                
                console.log('[ChatManager] savedHistory analysis:');
                console.log('- Total messages:', savedHistory.length);
                console.log('- Has real conversation:', hasRealConversation);
                
                if (hasRealConversation) {
                    // Use localStorage conversation
                    console.log('[ChatManager] Using localStorage conversation');
                    
                    // Check if messages are valid
                    const validMessages = savedHistory.filter(msg => 
                        msg && typeof msg === 'object' && msg.role && msg.content
                    );
                    
                    if (validMessages.length !== savedHistory.length) {
                        console.warn(`[ChatManager] Some messages are invalid. Valid: ${validMessages.length}, Total: ${savedHistory.length}`);
                    }
                    
                    // Check if we need to prepend a welcome message
                    let messagesToDisplay = validMessages;
                    let welcomeAlreadyExists = false;
                    let welcomePrepended = false;
                    
                    if (window._welcomeMessageToPrepend) {
                        // Check if the first message is already a welcome message to avoid duplicates
                        const firstMessage = validMessages[0];
                        const isFirstMessageWelcome = firstMessage && 
                            firstMessage.role === 'system' && 
                            (firstMessage.className === 'welcome-message' || 
                             firstMessage.content === window._welcomeMessageToPrepend.content);
                        
                        if (isFirstMessageWelcome) {
                            console.log('[ChatManager] Welcome message already exists in conversation history - skipping prepend');
                            // Use existing messages as-is, welcome message already there
                            messagesToDisplay = validMessages;
                            welcomeAlreadyExists = true;
                        } else {
                            messagesToDisplay = [window._welcomeMessageToPrepend, ...validMessages];
                            console.log('[ChatManager] Prepended welcome message to conversation history');
                            welcomePrepended = true;
                        }
                        // DON'T clear the flag - keep it for subsequent reloads during this session
                    }
                    
                    // Update our messages array - but ONLY with the actual conversation (no welcome message)
                    // The welcome message is only for display, not for storage
                    messages = validMessages;
                    
                    // Count conversation messages (user and assistant with content)
                    conversationMessageCount = 0;
                    messages.forEach(msg => {
                        if (msg.role === 'user' || 
                            (msg.role === 'assistant' && msg.content && msg.content.trim())) {
                            conversationMessageCount++;
                        }
                    });
                    
                    
                    // Display all messages including welcome message first
                    if (uiHandler && uiHandler.displayMessages) {
                        console.log('[ChatManager] Displaying', messagesToDisplay.length, 'messages (including welcome message first)');
                        uiHandler.displayMessages(messagesToDisplay);
                    }
                    
                    console.log(`[ChatManager] Displayed ${messagesToDisplay.length} messages from localStorage (including welcome)`);
                    
                    // Only add system messages when appropriate
                    if (welcomePrepended) {
                        addSystemMessage(`Welcome message and conversation history loaded with ${validMessages.length} messages.`);
                    } else if (!welcomeAlreadyExists) {
                        addSystemMessage(`Conversation history reloaded with ${validMessages.length} messages.`);
                    }
                    // If welcome already exists, don't add any system message - conversation speaks for itself
                    
                } else {
                    // localStorage only has system messages, try shared data
                    console.log('[ChatManager] localStorage only has system messages, checking shared data');
                    
                    let sharedData = null;
                    if (window.LinkSharingService && window.aiHackare && window.aiHackare.shareManager) {
                        try {
                            const sessionKey = window.aiHackare.shareManager.getSessionKey();
                            console.log('[ChatManager] FALLBACK DEBUG session key:', sessionKey ? sessionKey.length + ' chars' : 'null');
                            if (sessionKey) {
                                sharedData = await window.LinkSharingService.extractSharedApiKey(sessionKey);
                                console.log('[ChatManager] FALLBACK DEBUG extracted shared data:', sharedData);
                            }
                        } catch (error) {
                            console.log('[ChatManager] Could not extract shared data:', error.message);
                        }
                    }
                    if (sharedData && sharedData.messages && sharedData.messages.length > 0) {
                        const sharedHasRealConversation = sharedData.messages.some(msg => 
                            msg.role === 'user' || msg.role === 'assistant'
                        );
                        
                        if (sharedHasRealConversation) {
                            console.log('[ChatManager] Using shared conversation data instead');
                            
                            // Add only new messages that aren't already displayed
                            const currentMessageCount = messages.length;
                            const newMessages = sharedData.messages.slice(currentMessageCount);
                            
                            if (newMessages.length > 0) {
                                messages = messages.concat(newMessages);
                                
                                // Display only the new shared messages
                                if (uiHandler && uiHandler.displayMessages) {
                                    uiHandler.displayMessages(newMessages, true); // append mode
                                }
                                
                                console.log(`[ChatManager] Added ${newMessages.length} new messages from shared data`);
                                addSystemMessage(`Added ${newMessages.length} messages from shared conversation history.`);
                            }
                        } else {
                            console.log('[ChatManager] No real conversation in shared data either');
                            addSystemMessage('No conversation history found.');
                        }
                    } else {
                        console.log('[ChatManager] No shared data available');
                        addSystemMessage('No previous conversation found in this namespace.');
                    }
                }
            } else {
                // No localStorage history, try shared data
                console.log('[ChatManager] No localStorage history, checking shared data');
                
                let sharedData = null;
                if (window.LinkSharingService && window.aiHackare && window.aiHackare.shareManager) {
                    try {
                        const sessionKey = window.aiHackare.shareManager.getSessionKey();
                        if (sessionKey) {
                            sharedData = await window.LinkSharingService.extractSharedApiKey(sessionKey);
                        }
                    } catch (error) {
                        console.log('[ChatManager] Could not extract shared data:', error.message);
                    }
                }
                if (sharedData && sharedData.messages && sharedData.messages.length > 0) {
                    console.log('[ChatManager] Using shared conversation data');
                    
                    // Add only new messages that aren't already displayed
                    const currentMessageCount = messages.length;
                    const newMessages = sharedData.messages.slice(currentMessageCount);
                    
                    if (newMessages.length > 0) {
                        messages = messages.concat(newMessages);
                        
                        // Display only the new shared messages
                        if (uiHandler && uiHandler.displayMessages) {
                            uiHandler.displayMessages(newMessages, true); // append mode
                        }
                        
                        console.log(`[ChatManager] Added ${newMessages.length} new messages from shared data`);
                        addSystemMessage(`Added ${newMessages.length} messages from shared conversation history.`);
                    }
                } else {
                    console.log('[ChatManager] No conversation history found anywhere');
                    
                    // Check if we have a welcome message to display even with no history
                    if (window._welcomeMessageToPrepend) {
                        messages = [window._welcomeMessageToPrepend];
                        if (uiHandler && uiHandler.displayMessages) {
                            console.log('[ChatManager] Displaying welcome message only (no conversation history)');
                            uiHandler.displayMessages(messages);
                        }
                        // DON'T clear the flag - keep it for subsequent reloads during this session
                        // No need for additional system message - welcome message is sufficient
                    } else if (messages.length === 0) {
                        addSystemMessage('No previous conversation found.');
                    }
                }
            }
            
            return messages;
        }
        
        /**
         * Clear chat history
         * @param {Function} updateContextUsage - Function to update context usage
         */
        function clearChatHistory(updateContextUsage) {
            // Clear messages array completely - no system messages, no welcome messages
            messages = [];
            
            // Reset conversation message counter
            conversationMessageCount = 0;
            
            // Clear UI completely
            uiHandler.clearChat();
            
            // Clear any stored welcome message that might have been added from shared link
            if (window._welcomeMessageToPrepend) {
                window._welcomeMessageToPrepend = null;
            }
            
            // Also clear welcome message from ShareManager if it exists
            if (window.aiHackare && window.aiHackare.shareManager && 
                typeof window.aiHackare.shareManager.setSharedWelcomeMessage === 'function') {
                window.aiHackare.shareManager.setSharedWelcomeMessage(null);
            }
            
            // Clear local storage - this uses the current namespace
            StorageService.clearChatHistory();
            
            // Also clear any legacy non-namespaced history that might exist
            localStorage.removeItem(StorageService.BASE_STORAGE_KEYS.HISTORY);
            
            // Reset context usage to only include configured system prompts
            resetContextUsage(updateContextUsage);
            
            // Add a simple confirmation message
            addSystemMessage('Chat cleared.');
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
            
            // Calculate usage using the utility function
            const usageInfo = UIUtils.estimateContextUsage(
                messages, 
                ModelInfoService.modelInfo, 
                currentModel,
                systemPrompt
            );
            
            // Update the display
            if (updateContextUsage) {
                updateContextUsage(usageInfo.percentage, usageInfo.estimatedTokens, usageInfo.contextSize);
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
            
            // Display messages using UI handler if available
            if (uiHandler && uiHandler.displayMessages) {
                uiHandler.displayMessages(messages);
            } else {
                console.log('[ChatManager] UI handler not available yet, messages stored but not displayed');
            }
            
            // Save to local storage
            StorageService.saveChatHistory(messages);
            
            // Notify cross-tab sync service
            if (window.CrossTabSyncService && window.CrossTabSyncService.isInitialized()) {
                window.CrossTabSyncService.notifyHistoryUpdate();
            }
        }
        
        /**
         * Enhance system prompt with RAG search results
         * @param {string} originalSystemPrompt - Original system prompt
         * @param {Array} messages - Chat messages for context
         * @param {string} apiKey - API key for embedding generation
         * @returns {Promise<string>} Enhanced system prompt with RAG context
         */
        async function enhanceSystemPromptWithRAG(originalSystemPrompt, messages, apiKey) {
            try {
                // Debug: Start RAG enhancement process
                if (window.DebugService) {
                    window.DebugService.debugLog('rag', 'Starting RAG enhancement for chat message');
                }
                
                // Check if RAG is enabled
                if (!RAGManager.isRAGEnabled()) {
                    if (window.DebugService) {
                        window.DebugService.debugLog('rag', 'RAG is disabled - skipping enhancement');
                    }
                    console.log('ChatManager: RAG is disabled, skipping context enhancement');
                    return originalSystemPrompt;
                }
                
                if (window.DebugService) {
                    window.DebugService.debugLog('rag', 'RAG is enabled - proceeding with enhancement');
                }
                
                // Check if RAG is available and has indexed content
                const ragStats = VectorRAGService.getIndexStats();
                
                if (window.DebugService) {
                    window.DebugService.debugLog('rag', `Knowledge base status: default prompts=${ragStats.defaultPrompts.chunks} chunks, user bundles=${ragStats.userBundles.totalChunks} chunks, EU documents=${ragStats.euDocuments.chunks} chunks`);
                }
                
                if (!ragStats.defaultPrompts.available && !ragStats.userBundles.available && !ragStats.euDocuments.available) {
                    if (window.DebugService) {
                        window.DebugService.debugLog('rag', 'No indexed content available - skipping enhancement');
                    }
                    return originalSystemPrompt;
                }
                
                // Get the last user message as search query
                const lastUserMessage = messages.slice().reverse().find(msg => msg.role === 'user');
                if (!lastUserMessage || !lastUserMessage.content) {
                    if (window.DebugService) {
                        window.DebugService.debugLog('rag', 'No user message found for RAG query');
                    }
                    return originalSystemPrompt;
                }
                
                const query = lastUserMessage.content;
                const queryPreview = query.length > 50 ? query.substring(0, 50) + '...' : query;
                
                if (window.DebugService) {
                    window.DebugService.debugLog('rag', `Using user message as search query: "${queryPreview}"`);
                }
                
                // Get multi-query settings from RAG modal
                const multiQueryEnabled = document.getElementById('rag-multi-query-enabled')?.checked ?? false;
                const expansionModel = document.getElementById('rag-expansion-model')?.value || 'gpt-5-nano';
                const tokenLimit = parseInt(document.getElementById('rag-token-limit')?.value) || 5000;
                
                // Perform RAG search with multi-query support
                const searchResults = await VectorRAGService.search(query, {
                    // No maxResults - select chunks based on token limit only
                    threshold: 0.4, // Slightly higher threshold for relevance
                    useTextFallback: true,
                    apiKey: apiKey,
                    baseUrl: StorageService.getBaseUrl(),
                    useMultiQuery: multiQueryEnabled,
                    expansionModel: expansionModel,
                    tokenLimit: tokenLimit
                });
                
                if (window.DebugService) {
                    window.DebugService.debugLog('rag', `RAG search completed: ${searchResults.results.length} matches found`);
                    if (searchResults.metadata.error) {
                        window.DebugService.debugLog('rag', `Search encountered error: ${searchResults.metadata.error}`);
                    }
                }
                
                // If no relevant results found, return original prompt
                if (!searchResults.results || searchResults.results.length === 0) {
                    if (window.DebugService) {
                        window.DebugService.debugLog('rag', 'No relevant matches found - using original system prompt');
                    }
                    return originalSystemPrompt || '';
                }
                
                // Format results for context injection
                // Use a higher character limit to accommodate more context (roughly 4 chars per token)
                // For 3000 tokens, use ~12000 characters
                const ragContext = VectorRAGService.formatResultsForContext(searchResults.results, 12000);
                
                if (window.DebugService) {
                    window.DebugService.debugLog('rag', `Formatted RAG context: ${ragContext.length} characters`);
                    
                    // Log details about each result
                    searchResults.results.forEach((result, index) => {
                        const similarity = (result.similarity * 100).toFixed(1);
                        const source = result.promptName || result.fileName || result.bundleName || result.documentName || 'Unknown';
                        window.DebugService.debugLog('rag', `  Result ${index + 1}: ${similarity}% similarity from "${source}"`);
                    });
                }
                
                // Combine original system prompt with RAG context
                // Handle null/undefined originalSystemPrompt
                const safeOriginalPrompt = originalSystemPrompt || '';
                const enhancedPrompt = safeOriginalPrompt + '\n\n' + ragContext;
                
                const contextAddition = enhancedPrompt.length - safeOriginalPrompt.length;
                
                if (window.DebugService) {
                    window.DebugService.debugLog('rag', `System prompt enhanced: +${contextAddition} characters from ${searchResults.results.length} knowledge base entries`);
                }
                return enhancedPrompt;
                
            } catch (error) {
                if (window.DebugService) {
                    window.DebugService.debugLog('rag', `RAG enhancement failed: ${error.message}`);
                }
                console.warn('ChatManager: RAG enhancement failed, using original system prompt:', error);
                return originalSystemPrompt || '';
            }
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
            reloadConversationHistory,
            clearChatHistory,
            estimateContextUsage,
            getMessages,
            getConversationMessageCount: () => conversationMessageCount,
            getIsGenerating,
            setMessages
        };
    }

    // Public API
    return {
        createChatManager: createChatManager
    };
})();
