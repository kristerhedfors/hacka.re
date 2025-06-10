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
    
    // Clear input
    elements.messageInput.value = '';
    elements.messageInput.style.height = 'auto';
    
    // Focus input
    elements.messageInput.focus();
    
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
async function generateResponse(apiKey, currentModel, systemPrompt, updateContextUsage, apiToolsManager, mcpManager, functionCallingManager) {
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
        
        // Declare variables to track function calls and results for later use
        let functionToolCalls = [];
        let functionResults = [];
        
        // Combine tools from API tools manager and function calling manager
        // Note: functionCallingManager already includes FunctionToolsService functions, so we don't need to include them separately
        const combinedToolsManager = {
            getToolDefinitions: () => {
                const apiTools = apiToolsManager ? apiToolsManager.getEnabledToolDefinitions() : [];
                const functionCallingTools = functionCallingManager ? functionCallingManager.getFunctionDefinitions() : [];
                
                // Debug logging
                console.log("combinedToolsManager.getToolDefinitions called");
                console.log("- apiTools:", apiTools.length, apiTools.map(t => t.function?.name));
                console.log("- functionCallingTools:", functionCallingTools.length, functionCallingTools.map(t => t.function?.name));
                console.log("- FunctionToolsService enabled:", FunctionToolsService ? FunctionToolsService.isFunctionToolsEnabled() : false);
                console.log("- FunctionToolsService enabled functions:", FunctionToolsService ? FunctionToolsService.getEnabledFunctionNames() : []);
                
                const allTools = [...apiTools, ...functionCallingTools];
                console.log("- Combined tools:", allTools.length, allTools.map(t => t.function?.name));
                
                return allTools;
            },
            processToolCalls: async (toolCalls, addSystemMessage) => {
                console.log("[ChatManager Debug] processToolCalls called");
                console.log("[ChatManager Debug] - Tool calls input:", toolCalls);
                console.log("[ChatManager Debug] - Tool calls type:", typeof toolCalls);
                console.log("[ChatManager Debug] - Tool calls length:", toolCalls ? toolCalls.length : "N/A");
                console.log("[ChatManager Debug] - addSystemMessage callback:", typeof addSystemMessage);
                
                // Process tool calls based on their names
                const apiToolCalls = [];
                functionToolCalls = []; // Reset the outer scope variable
                
                // Validate toolCalls is an array
                if (!Array.isArray(toolCalls)) {
                    console.error('[ChatManager Debug] Invalid tool calls format: not an array', toolCalls);
                    if (addSystemMessage) {
                        addSystemMessage('Error: Invalid tool calls format received from API');
                    }
                    return [];
                }
                
                console.log("[ChatManager Debug] - Starting tool call separation");
                
                // Separate tool calls by type
                for (let i = 0; i < toolCalls.length; i++) {
                    const toolCall = toolCalls[i];
                    console.log(`[ChatManager Debug] - Processing tool call ${i + 1}/${toolCalls.length}:`, toolCall);
                    
                    try {
                        // Validate toolCall has the expected structure
                        if (!toolCall || !toolCall.function || typeof toolCall.function.name !== 'string') {
                            console.error(`[ChatManager Debug] - Invalid tool call ${i + 1} format:`, toolCall);
                            continue;
                        }
                        
                        const toolName = toolCall.function.name;
                        console.log(`[ChatManager Debug] - Tool call ${i + 1} name:`, toolName);
                        
                        // Check if it's a function tool (must exist and be enabled)
                        // Check if it's a user-defined function tool
                        const isUserDefinedFunctionTool = FunctionToolsService && 
                            FunctionToolsService.getJsFunctions()[toolName] && 
                            FunctionToolsService.isJsFunctionEnabled(toolName);
                        
                        // Check if it's a default function tool
                        let isDefaultFunctionTool = false;
                        if (window.DefaultFunctionsService && typeof window.DefaultFunctionsService.getEnabledDefaultFunctions === 'function') {
                            const enabledDefaultFunctions = window.DefaultFunctionsService.getEnabledDefaultFunctions();
                            isDefaultFunctionTool = !!enabledDefaultFunctions[toolName];
                        }
                        
                        const isFunctionTool = isUserDefinedFunctionTool || isDefaultFunctionTool;
                        
                        console.log(`[ChatManager Debug] - Tool "${toolName}" is user-defined function tool:`, isUserDefinedFunctionTool);
                        console.log(`[ChatManager Debug] - Tool "${toolName}" is default function tool:`, isDefaultFunctionTool);
                        console.log(`[ChatManager Debug] - Tool "${toolName}" is function tool:`, isFunctionTool);
                        console.log(`[ChatManager Debug] - FunctionToolsService available:`, !!FunctionToolsService);
                        
                        if (FunctionToolsService) {
                            console.log(`[ChatManager Debug] - Available JS functions:`, Object.keys(FunctionToolsService.getJsFunctions()));
                            console.log(`[ChatManager Debug] - Enabled JS functions:`, FunctionToolsService.getEnabledFunctionNames());
                            console.log(`[ChatManager Debug] - Tool "${toolName}" exists in registry:`, !!FunctionToolsService.getJsFunctions()[toolName]);
                            console.log(`[ChatManager Debug] - Tool "${toolName}" is enabled:`, FunctionToolsService.isJsFunctionEnabled(toolName));
                        }
                        
                        if (window.DefaultFunctionsService) {
                            const enabledDefaultFunctions = window.DefaultFunctionsService.getEnabledDefaultFunctions();
                            console.log(`[ChatManager Debug] - Available default functions:`, Object.keys(enabledDefaultFunctions));
                            console.log(`[ChatManager Debug] - Tool "${toolName}" exists in default functions:`, !!enabledDefaultFunctions[toolName]);
                        }
                        
                        if (isFunctionTool) {
                            functionToolCalls.push(toolCall);
                            console.log(`[ChatManager Debug] - Added tool "${toolName}" to function tool calls`);
                        } else {
                            apiToolCalls.push(toolCall);
                            console.log(`[ChatManager Debug] - Added tool "${toolName}" to API tool calls`);
                        }
                    } catch (error) {
                        console.error(`[ChatManager Debug] - Error processing tool call ${i + 1}:`, error, toolCall);
                        if (addSystemMessage) {
                            addSystemMessage(`Error processing tool call: ${error.message}`);
                        }
                    }
                }
                
                console.log("[ChatManager Debug] - Tool call separation complete");
                console.log("[ChatManager Debug] - API tool calls:", apiToolCalls.length, apiToolCalls.map(tc => tc.function?.name));
                console.log("[ChatManager Debug] - Function tool calls:", functionToolCalls.length, functionToolCalls.map(tc => tc.function?.name));
                
                // Process each type of tool calls
                console.log("[ChatManager Debug] - Starting API tool calls processing");
                const apiResults = apiToolCalls.length > 0 && apiToolsManager 
                    ? await apiToolsManager.processToolCalls(apiToolCalls, addSystemMessage) 
                    : [];
                console.log("[ChatManager Debug] - API tool calls results:", apiResults.length, apiResults);
                
                console.log("[ChatManager Debug] - Starting function tool calls processing");
                functionResults = functionToolCalls.length > 0 && FunctionToolsService
                    ? await FunctionToolsService.processToolCalls(functionToolCalls, addSystemMessage)
                    : [];
                console.log("[ChatManager Debug] - Function tool calls results:", functionResults.length, functionResults);
                
                
                // Combine results
                const combinedResults = [...apiResults, ...functionResults];
                console.log("[ChatManager Debug] - Combined tool call results:", combinedResults.length, combinedResults);
                
                return combinedResults;
            }
        };
        
        // Generate response
        const aiResponse = await ApiService.generateChatCompletion(
            apiKey,
            currentModel,
            apiMessages,
            signal,
            (content) => updateAIMessage(content, aiMessageId, updateContextUsage),
            systemPrompt,
            combinedToolsManager,
            addSystemMessage
        );
        
        // Remove typing indicator
        typingIndicator.remove();
        
        // Update messages array with complete AI response
        let finalContent = aiResponse;
        
        // Add function markers to the final AI response if there were function tool calls
        if (functionToolCalls.length > 0 && functionResults.length > 0) {
            console.log('[ChatManager Debug] Adding function markers to final AI response');
            console.log('[ChatManager Debug] Original AI response:', finalContent);
            
            // For each function call, add markers inline with the response
            for (let i = 0; i < functionToolCalls.length && i < functionResults.length; i++) {
                const toolCall = functionToolCalls[i];
                const result = functionResults[i];
                
                if (toolCall.function && toolCall.function.name && result && result.name) {
                    const functionName = toolCall.function.name;
                    const encodedArgs = encodeURIComponent(toolCall.function.arguments || '{}');
                    const functionCallMarker = `[FUNCTION_CALL:${functionName}:${encodedArgs}]`;
                    
                    // Get the result content and determine its type
                    let resultContent = result.content;
                    let resultType;
                    
                    try {
                        const resultValue = JSON.parse(resultContent);
                        resultType = Array.isArray(resultValue) ? 'array' : typeof resultValue;
                    } catch (e) {
                        // If parsing fails, use the raw content
                        resultType = 'string';
                    }
                    
                    // Create the result marker
                    const encodedResult = encodeURIComponent(resultContent);
                    const executionTime = result.executionTime || 0;
                    const functionResultMarker = `[FUNCTION_RESULT:${result.name}:${resultType}:${encodedResult}:${executionTime}]`;
                    
                    // Add both markers together at the end (for now - can be improved to insert inline)
                    finalContent += functionCallMarker + functionResultMarker;
                }
            }
            
            console.log('[ChatManager Debug] Final content with markers:', finalContent);
            
            // Update the UI with the markers
            const aiMessageElement = document.querySelector(`.message[data-id="${aiMessageId}"]`);
            if (aiMessageElement) {
                const contentElement = aiMessageElement.querySelector('.message-content');
                contentElement.innerHTML = UIUtils.renderMarkdown(finalContent);
                UIUtils.scrollToBottom(elements.chatMessages);
            }
        }
        
        messages[messages.length - 1].content = finalContent;
        
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
        
        // Update context usage one final time after generation is complete
        if (updateContextUsage) {
            estimateContextUsage(updateContextUsage, currentModel);
        }
        
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
                
                // Use requestAnimationFrame for smoother UI updates
                window.requestAnimationFrame(() => {
                    contentElement.innerHTML = UIUtils.renderMarkdown(content);
                    UIUtils.scrollToBottom(elements.chatMessages);
                });
                
                // Calculate token speed
                calculateTokenSpeed(content);
                
                // Update context usage less frequently during streaming
                // Only update every 1000ms or when content length changes significantly
                const now = Date.now();
                const contentLengthThreshold = 500; // Update if content grows by 500 chars
                
                // Store the last content length and update time on the message element
                if (!messageElement.dataset.lastContentLength) {
                    messageElement.dataset.lastContentLength = "0";
                    messageElement.dataset.lastUpdateTime = "0";
                }
                
                const lastContentLength = parseInt(messageElement.dataset.lastContentLength, 10);
                const lastUpdateTime = parseInt(messageElement.dataset.lastUpdateTime, 10);
                
                // Check if we should update context usage
                const timeSinceLastUpdate = now - lastUpdateTime;
                const contentLengthDelta = Math.abs(content.length - lastContentLength);
                
                if (timeSinceLastUpdate > 1000 || contentLengthDelta > contentLengthThreshold) {
                    // Update the last content length and update time
                    messageElement.dataset.lastContentLength = content.length.toString();
                    messageElement.dataset.lastUpdateTime = now.toString();
                    
                    // Update context usage
                    if (updateContextUsage) {
                        estimateContextUsage(updateContextUsage);
                    }
                }
            }
        }
        
        /**
         * Calculate and update token generation speed
         * @param {string} content - Current content
         */
        function calculateTokenSpeed(content) {
            const now = Date.now();
            
            // Initialize timing on first token
            if (!generationStartTime) {
                generationStartTime = now;
                lastUpdateTime = now;
                tokenCount = 0;
                
                // Reset token speed display
                if (elements.tokenSpeedText) {
                    elements.tokenSpeedText.textContent = '0 t/s';
                }
                return;
            }
            
            // Estimate new tokens (rough approximation: 1 token per 4 characters)
            const newTokenCount = Math.ceil(content.length / 4);
            
            // Calculate tokens added since last update
            tokenCount = newTokenCount;
            
            // Only update the display every 500ms to reduce UI updates
            if (now - lastUpdateTime < 500) {
                return;
            }
            
            // Update the last update time
            lastUpdateTime = now;
            
            // Calculate time since start in seconds
            const timeSinceStart = (now - generationStartTime) / 1000;
            
            if (timeSinceStart > 0 && tokenCount > 0) {
                // Calculate tokens per second
                const tokensPerSecond = Math.round(tokenCount / timeSinceStart);
                
                // Update the display using requestAnimationFrame to avoid blocking the main thread
                if (elements.tokenSpeedText) {
                    window.requestAnimationFrame(() => {
                        elements.tokenSpeedText.textContent = `${tokensPerSecond} t/s`;
                    });
                }
            }
        }
        
        /**
         * Add a system message to the chat
         * @param {string} content - Message content
         * @param {string} className - Optional CSS class to add to the message
         */
        function addSystemMessage(content, className) {
            // Create message element
            const messageElement = UIUtils.createMessageElement('system', content);
            
            // Add custom class if provided
            if (className) {
                messageElement.classList.add(...className.split(' '));
            }
            
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
            
            // Get system prompt for context usage calculation
            const systemPrompt = StorageService.getSystemPrompt() || '';
            
            // Reset context usage with current system prompt
            if (updateContextUsage) {
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
