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
        // Uses marked.js to render markdown
        // DOMPurify is used to sanitize the HTML
        return DOMPurify.sanitize(marked.parse(text));
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

    /**
     * Estimate token count based on character count
     * @param {Array} messages - Array of chat messages
     * @param {Object} modelInfo - Information about the current model
     * @param {string} currentModel - Current model ID
     * @param {string} systemPrompt - System prompt content
     * @returns {number} - Estimated usage percentage
     */
    function estimateContextUsage(messages, modelInfo, currentModel, systemPrompt = '') {
        console.log("estimateContextUsage called with:");
        console.log("- messages count:", messages ? messages.length : 0);
        console.log("- currentModel:", currentModel);
        console.log("- systemPrompt length:", systemPrompt ? systemPrompt.length : 0);
        
        // Estimate token count based on message content
        // A rough estimate is 1 token per 4 characters
        let totalChars = 0;
        
        // Add system prompt characters if provided
        if (systemPrompt) {
            totalChars += systemPrompt.length;
            console.log("Added system prompt chars:", systemPrompt.length);
        }
        
        // Add message characters
        let messageChars = 0;
        if (messages && messages.length > 0) {
            messages.forEach(message => {
                if (message && message.content) {
                    totalChars += message.content.length;
                    messageChars += message.content.length;
                }
            });
        }
        console.log("Added message chars:", messageChars);
        
        // Estimate tokens (4 chars per token is a rough approximation)
        const estimatedTokens = Math.ceil(totalChars / 4);
        console.log("Total chars:", totalChars, "Estimated tokens:", estimatedTokens);
        
        // Get context window size for the current model
        const modelData = modelInfo[currentModel];
        let contextSize = 8192; // Default to 8K if not specified
        
        if (modelData && modelData.contextWindow !== '-') {
            // Parse context window size (e.g., "128K" -> 131072)
            const sizeStr = modelData.contextWindow.toLowerCase();
            if (sizeStr.endsWith('k')) {
                contextSize = parseInt(sizeStr) * 1024;
            } else {
                contextSize = parseInt(sizeStr.replace(/,/g, ''));
            }
        }
        console.log("Context size for model:", contextSize);
        
        // Calculate percentage
        const percentage = Math.min(Math.round((estimatedTokens / contextSize) * 100), 100);
        console.log("Calculated percentage:", percentage, "%");
        return percentage;
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
