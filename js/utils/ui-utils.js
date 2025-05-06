/**
 * UI Utilities
 * Helper functions for UI manipulation and rendering
 */

window.UIUtils = (function() {
    // Debounce function to limit the frequency of function calls
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }
    /**
     * Render markdown content to HTML
     * @param {string} text - Markdown text to render
     * @returns {string} - Sanitized HTML
     */
    function renderMarkdown(text) {
        // Check if text is empty or undefined
        if (!text) {
            return '';
        }
        
        try {
            // Uses marked.js to render markdown
            // DOMPurify is used to sanitize the HTML
            return DOMPurify.sanitize(marked.parse(text));
        } catch (error) {
            console.error('Error rendering markdown:', error);
            // Return the original text as a fallback
            return DOMPurify.sanitize(`<p>${escapeHTML(text)}</p>`);
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
        
        // Use white color for the usage bar
        fillElement.style.backgroundColor = '#FFFFFF';
        console.log("Context usage updated to:", percentage, "% with white color");
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
        
        // Create content container
        const contentElement = document.createElement('div');
        
        if (role === 'assistant') {
            contentElement.className = 'message-content markdown-content';
            
            // For assistant messages, only render markdown if content is not too large
            // This improves initial rendering performance
            if (content && content.length > 0) {
                if (content.length < 5000) {
                    // For smaller content, render immediately
                    contentElement.innerHTML = renderMarkdown(content);
                } else {
                    // For larger content, use a more efficient approach
                    // First add a loading indicator
                    contentElement.innerHTML = '<p>Rendering message...</p>';
                    
                    // Then render the content asynchronously
                    setTimeout(() => {
                        contentElement.innerHTML = renderMarkdown(content);
                    }, 10);
                }
            }
        } else {
            contentElement.className = 'message-content';
            const paragraph = document.createElement('p');
            paragraph.textContent = content; // This is more efficient than innerHTML with escapeHTML
            contentElement.appendChild(paragraph);
        }
        
        messageElement.appendChild(contentElement);
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
     * @returns {Object} - Object containing estimated tokens, context size, and usage percentage
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
        let contextSize = null;
        
        // Try to get context size from ModelInfoService
        if (window.ModelInfoService && typeof ModelInfoService.getContextSize === 'function') {
            contextSize = ModelInfoService.getContextSize(currentModel);
        }
        
        // If we couldn't get a context size, default to 8192
        if (!contextSize) {
            contextSize = 8192;
        }
        
        console.log("Context size for model:", contextSize);
        
        // Calculate percentage
        const percentage = Math.min(Math.round((estimatedTokens / contextSize) * 100), 100);
        console.log("Calculated percentage:", percentage, "%");
        
        return {
            estimatedTokens: estimatedTokens,
            contextSize: contextSize,
            percentage: percentage
        };
    }

    // Create debounced versions of functions
    const debouncedRenderMarkdown = debounce(renderMarkdown, 100); // 100ms debounce
    const debouncedScrollToBottom = debounce(scrollToBottom, 250); // 250ms debounce
    const debouncedUpdateContextUsage = debounce(updateContextUsage, 500); // 500ms debounce

    // Public API
    return {
        renderMarkdown: renderMarkdown,
        debouncedRenderMarkdown: debouncedRenderMarkdown,
        escapeHTML: escapeHTML,
        scrollToBottom: scrollToBottom,
        debouncedScrollToBottom: debouncedScrollToBottom,
        setupTextareaAutoResize: setupTextareaAutoResize,
        updateContextUsage: updateContextUsage,
        debouncedUpdateContextUsage: debouncedUpdateContextUsage,
        createMessageElement: createMessageElement,
        createTypingIndicator: createTypingIndicator,
        estimateContextUsage: estimateContextUsage,
        debounce: debounce
    };
})();
