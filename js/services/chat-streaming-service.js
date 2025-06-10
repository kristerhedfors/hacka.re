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

        return {
            /**
             * Initialize streaming state
             */
            initializeStreaming() {
                // Reset token speed tracking
                generationStartTime = null;
                lastUpdateTime = null;
                tokenCount = 0;
                if (elements.tokenSpeedText) {
                    elements.tokenSpeedText.textContent = '0 t/s';
                }
            },

            /**
             * Update AI message content during streaming
             * @param {string} content - New message content
             * @param {string} id - Message ID
             * @param {Function} updateContextUsage - Function to update context usage
             */
            updateStreamingMessage(content, id, updateContextUsage) {
                const messageElement = document.querySelector(`.message[data-id="${id}"]`);
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