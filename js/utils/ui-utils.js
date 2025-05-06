/**
 * UI Utilities
 * Helper functions for UI manipulation and rendering
 */

window.UIUtils = (function() {
    /**
     * Render markdown content to HTML
     * @param {string} text - Markdown text to render
     * @returns {string} - Sanitized HTML
     */
    function renderMarkdown(text) {
        // Skip rendering if text is empty
        if (!text || text.trim() === '') {
            return '';
        }
        
        try {
            // Configure marked for better performance
            marked.setOptions({
                gfm: true,
                breaks: true,
                silent: true,  // Don't throw on parse errors
                smartLists: true,
                smartypants: false, // Disable smartypants for better performance
                headerIds: false,   // Disable header IDs for better performance
                mangle: false       // Disable mangling for better performance
            });
            
            // Uses marked.js to render markdown
            // DOMPurify is used to sanitize the HTML
            return DOMPurify.sanitize(marked.parse(text));
        } catch (e) {
            console.error('Error rendering markdown:', e);
            // Fallback to simple HTML escaping if markdown rendering fails
            return `<p>${escapeHTML(text)}</p>`;
        }
    }

    /**
     * Escape HTML special characters
     * @param {string} text - Text to escape
     * @returns {string} - HTML-escaped text
     */
    function escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Scroll an element to its bottom
     * @param {HTMLElement} element - Element to scroll
     */
    function scrollToBottom(element) {
        element.scrollTop = element.scrollHeight;
    }

    /**
     * Set up auto-resizing for a textarea
     * @param {HTMLTextAreaElement} textarea - Textarea element to auto-resize
     */
    function setupTextareaAutoResize(textarea) {
        textarea.addEventListener('input', () => {
            textarea.style.height = 'auto';
            textarea.style.height = (textarea.scrollHeight) + 'px';
        });
    }

    /**
     * Update the context usage display
     * @param {HTMLElement} fillElement - Element for the usage fill bar
     * @param {HTMLElement} textElement - Element for the usage text
     * @param {number} percentage - Usage percentage (0-100)
     */
    function updateContextUsage(fillElement, textElement, percentage) {
        console.log("updateContextUsage called with percentage:", percentage);
        console.log("fillElement:", fillElement);
        console.log("textElement:", textElement);
        
        if (!fillElement || !textElement) {
            console.log("Missing fillElement or textElement, returning");
            return;
        }
        
        // Update the fill width
        fillElement.style.width = `${percentage}%`;
        
        // Update the text
        textElement.textContent = `${percentage}%`;
        
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
        
        fillElement.style.backgroundColor = color;
        console.log("Context usage updated to:", percentage, "% with color:", color);
    }

    /**
     * Create a message element
     * @param {string} role - Message role ('user', 'assistant', or 'system')
     * @param {string} content - Message content
     * @param {string} [id] - Optional ID for the message element
     * @returns {HTMLElement} - The created message element
     */
    function createMessageElement(role, content, id = null) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${role}`;
        
        if (id) {
            messageElement.dataset.id = id;
        }
        
        if (role === 'assistant') {
            messageElement.innerHTML = `
                <div class="message-content markdown-content">
                    ${content ? renderMarkdown(content) : ''}
                </div>
            `;
        } else {
            messageElement.innerHTML = `
                <div class="message-content">
                    <p>${escapeHTML(content)}</p>
                </div>
            `;
        }
        
        return messageElement;
    }

    /**
     * Create a typing indicator element
     * @returns {HTMLElement} - The typing indicator element
     */
    function createTypingIndicator() {
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'typing-indicator';
        typingIndicator.innerHTML = '<span></span><span></span><span></span>';
        return typingIndicator;
    }

    // Cache for context size by model
    const contextSizeCache = {};
    
    // Cache for token estimates by content length
    const tokenEstimateCache = {};
    
    /**
     * Estimate token count based on character count
     * @param {Array} messages - Array of chat messages
     * @param {Object} modelInfo - Information about the current model
     * @param {string} currentModel - Current model ID
     * @param {string} systemPrompt - System prompt content
     * @returns {Object} - Object containing estimated tokens, context size, and usage percentage
     */
    function estimateContextUsage(messages, modelInfo, currentModel, systemPrompt = '') {
        // Get context window size for the current model (use cache if available)
        let contextSize = contextSizeCache[currentModel];
        
        if (!contextSize) {
            // Try to get context size from ModelInfoService
            if (window.ModelInfoService && typeof ModelInfoService.getContextSize === 'function') {
                contextSize = ModelInfoService.getContextSize(currentModel);
            }
            
            // If we couldn't get a context size, default to 8192
            if (!contextSize) {
                contextSize = 8192;
            }
            
            // Cache the context size for this model
            contextSizeCache[currentModel] = contextSize;
        }
        
        // Estimate token count based on message content
        // A rough estimate is 1 token per 4 characters
        let totalChars = 0;
        
        // Add system prompt characters if provided
        if (systemPrompt) {
            totalChars += systemPrompt.length;
        }
        
        // Add message characters
        if (messages && messages.length > 0) {
            for (let i = 0; i < messages.length; i++) {
                const message = messages[i];
                if (message && message.content) {
                    totalChars += message.content.length;
                }
            }
        }
        
        // Use cached token estimate if available
        let estimatedTokens = tokenEstimateCache[totalChars];
        if (!estimatedTokens) {
            // Estimate tokens (4 chars per token is a rough approximation)
            estimatedTokens = Math.ceil(totalChars / 4);
            
            // Cache the token estimate for this content length
            // Only cache for reasonable content lengths to avoid memory issues
            if (totalChars < 1000000) {
                tokenEstimateCache[totalChars] = estimatedTokens;
            }
        }
        
        // Calculate percentage
        const percentage = Math.min(Math.round((estimatedTokens / contextSize) * 100), 100);
        
        return {
            estimatedTokens: estimatedTokens,
            contextSize: contextSize,
            percentage: percentage
        };
    }

    // Public API
    return {
        renderMarkdown: renderMarkdown,
        escapeHTML: escapeHTML,
        scrollToBottom: scrollToBottom,
        setupTextareaAutoResize: setupTextareaAutoResize,
        updateContextUsage: updateContextUsage,
        createMessageElement: createMessageElement,
        createTypingIndicator: createTypingIndicator,
        estimateContextUsage: estimateContextUsage
    };
})();
