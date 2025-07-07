/**
 * Chat Streaming Service
 * Handles streaming response logic for chat interactions
 */

window.ChatStreamingService = (function() {
    'use strict';

    /**
     * Create a streaming handler for chat responses
     * @param {Object} elements - DOM elements
     * @returns {Object} Streaming handler interface
     */
    function createStreamingHandler(elements) {
        let generationStartTime = null;
        let lastUpdateTime = null;
        let tokenCount = 0;
        let tokenTimestamps = []; // Array to track token timestamps for sliding window

        return {
            /**
             * Initialize streaming state
             */
            initializeStreaming() {
                // Reset token speed tracking
                generationStartTime = null;
                lastUpdateTime = null;
                tokenCount = 0;
                tokenTimestamps = [];
                if (elements.tokenSpeedText) {
                    elements.tokenSpeedText.textContent = '0 t/s';
                }
            },

            /**
             * Update AI message content during streaming
             * @param {string} content - New message content
             * @param {string} id - Message ID
             * @param {Function} updateContextUsage - Function to update context usage
             * @param {Function} addAIMessageFn - Function to add AI message to messages array
             * @param {Object} uiHandler - UI handler with addAIMessageToUI method
             */
            updateStreamingMessage(content, id, updateContextUsage, addAIMessageFn, uiHandler) {
                let messageElement = document.querySelector(`.message[data-id="${id}"]`);
                
                // Create the AI message element if it doesn't exist (first content chunk)
                if (!messageElement && content.trim()) {
                    if (uiHandler && uiHandler.addAIMessageToUI) {
                        uiHandler.addAIMessageToUI('', id);
                    }
                    // Also add to the messages array for the first time
                    if (addAIMessageFn) {
                        addAIMessageFn('', id);
                    }
                    messageElement = document.querySelector(`.message[data-id="${id}"]`);
                }
                
                if (messageElement) {
                    const contentElement = messageElement.querySelector('.message-content');
                    
                    // Use requestAnimationFrame for smoother UI updates
                    window.requestAnimationFrame(() => {
                        contentElement.innerHTML = UIUtils.renderMarkdown(content);
                        UIUtils.scrollToBottom(elements.chatMessages);
                    });
                    
                    // Calculate token speed
                    this.calculateTokenSpeed(content);
                    
                    // Update context usage less frequently during streaming
                    this.throttleContextUsageUpdate(messageElement, content, updateContextUsage);
                }
            },

            /**
             * Add AI message to the messages array - to be called by chat manager
             * @param {string} content - Initial content (usually empty)
             * @param {string} id - Message ID
             * @param {Function} addAIMessageFn - Function to add AI message
             */
            addAIMessageToMessages(content, id, addAIMessageFn) {
                if (addAIMessageFn) {
                    addAIMessageFn(content, id);
                }
            },

            /**
             * Calculate and update token generation speed
             * @param {string} content - Current content
             */
            calculateTokenSpeed(content) {
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
                const tokensAdded = newTokenCount - tokenCount;
                tokenCount = newTokenCount;
                
                // Add timestamps for new tokens to our sliding window
                for (let i = 0; i < tokensAdded; i++) {
                    tokenTimestamps.push(now);
                }
                
                // Remove timestamps older than 2 seconds from the sliding window
                const twoSecondsAgo = now - 2000;
                tokenTimestamps = tokenTimestamps.filter(timestamp => timestamp > twoSecondsAgo);
                
                // Only update the display every 500ms to reduce UI updates
                if (now - lastUpdateTime < 500) {
                    return;
                }
                
                // Update the last update time
                lastUpdateTime = now;
                
                // Calculate tokens per second based on the last 2 seconds
                const tokensInWindow = tokenTimestamps.length;
                const windowDuration = Math.min(2, (now - generationStartTime) / 1000); // Cap at 2 seconds
                
                if (windowDuration > 0 && tokensInWindow > 0) {
                    // Calculate tokens per second for the current 2-second window
                    const tokensPerSecond = Math.round(tokensInWindow / windowDuration);
                    
                    // Update the display using requestAnimationFrame to avoid blocking the main thread
                    if (elements.tokenSpeedText) {
                        window.requestAnimationFrame(() => {
                            elements.tokenSpeedText.textContent = `${tokensPerSecond} t/s`;
                        });
                    }
                }
            },

            /**
             * Throttle context usage updates during streaming
             * @param {HTMLElement} messageElement - The message element
             * @param {string} content - Current content
             * @param {Function} updateContextUsage - Function to update context usage
             */
            throttleContextUsageUpdate(messageElement, content, updateContextUsage) {
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
                        updateContextUsage();
                    }
                }
            }
        };
    }

    // Public API
    return {
        createStreamingHandler
    };
})();