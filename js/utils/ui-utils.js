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
            // Process function call and result markers before markdown rendering
            text = processFunctionMarkers(text);
            
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
    
    // Track function calls to assign different colors
    const functionCallCounts = {};
    
    /**
     * Process function call and result markers in text
     * @param {string} text - Text to process
     * @returns {string} - Text with markers replaced by HTML
     */
    function processFunctionMarkers(text) {
        // Reset function call counts if this is a new message
        // We can detect this by checking if there are no function call markers in the text
        if (!text.includes('[FUNCTION_CALL:') && !text.includes('[FUNCTION_RESULT:')) {
            Object.keys(functionCallCounts).forEach(key => {
                delete functionCallCounts[key];
            });
        }
        
        // Replace function call markers with icons
        // Handle potential whitespace around the marker
        text = text.replace(/\s*\[FUNCTION_CALL:([^\]]+)\]\s*/g, (match, functionName) => {
            // Increment the count for this function name
            functionCallCounts[functionName] = (functionCallCounts[functionName] || 0) + 1;
            
            // Calculate color class (cycle through 5 colors)
            const colorIndex = (functionCallCounts[functionName] % 5) || 5;
            const colorClass = `color-${colorIndex}`;
            
            return `<span class="function-call-icon ${colorClass}" title="Function call: ${functionName}"><span class="function-icon-tooltip">Function call: ${functionName}</span></span>`;
        });
        
        // Replace function result markers with icons
        // Handle potential newlines around the marker
        text = text.replace(/\s*\[FUNCTION_RESULT:([^\]]+)\]\s*/g, (match, functionName) => {
            // Use the same color as the corresponding function call
            const colorIndex = (functionCallCounts[functionName] % 5) || 5;
            const colorClass = `color-${colorIndex}`;
            
            return `<span class="function-result-icon ${colorClass}" title="Function result: ${functionName}"><span class="function-icon-tooltip">Function result: ${functionName}</span></span>`;
        });
        
        return text;
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
        } else if (role === 'system') {
            // For system messages, preserve newlines by using innerHTML with <br> tags
            // First escape HTML to prevent XSS, then replace newlines with <br>
            const escapedContent = escapeHTML(content);
            const contentWithLineBreaks = escapedContent.replace(/\n/g, '<br>');
            
            messageElement.innerHTML = `
                <div class="message-content" style="font-family: 'Courier New', monospace;">
                    ${contentWithLineBreaks}
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

    /**
     * Copy chat content to clipboard
     * @param {HTMLElement} chatMessagesElement - The chat messages container element
     * @returns {boolean} - Whether the copy was successful
     */
    function copyChatContent(chatMessagesElement) {
        if (!chatMessagesElement) {
            console.error('Chat messages element not found');
            return false;
        }
        
        try {
            // Get all message elements
            const messageElements = chatMessagesElement.querySelectorAll('.message');
            
            if (!messageElements || messageElements.length === 0) {
                console.log('No messages to copy');
                return false;
            }
            
            // Build a string with all messages
            let chatContent = '';
            
            messageElements.forEach(messageElement => {
                // Get role
                const role = messageElement.classList.contains('user') ? 'User' : 
                             messageElement.classList.contains('assistant') ? 'Assistant' : 
                             'System';
                
                // Get content text (strip HTML)
                const contentElement = messageElement.querySelector('.message-content');
                let content = '';
                
                if (contentElement) {
                    // Create a temporary div to get text content
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = contentElement.innerHTML;
                    
                    // Replace <br> tags with newlines
                    const brElements = tempDiv.querySelectorAll('br');
                    brElements.forEach(br => br.replaceWith('\n'));
                    
                    // Replace <p> tags with double newlines
                    const pElements = tempDiv.querySelectorAll('p');
                    pElements.forEach(p => {
                        p.prepend('\n\n');
                    });
                    
                    // Get text content
                    content = tempDiv.textContent.trim();
                }
                
                // Add to chat content
                chatContent += `${role}: ${content}\n\n`;
            });
            
            // Copy to clipboard
            navigator.clipboard.writeText(chatContent.trim())
                .then(() => {
                    console.log('Chat content copied to clipboard');
                    return true;
                })
                .catch(err => {
                    console.error('Failed to copy chat content:', err);
                    return false;
                });
            
            return true;
        } catch (error) {
            console.error('Error copying chat content:', error);
            return false;
        }
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
        estimateContextUsage: estimateContextUsage,
        copyChatContent: copyChatContent
    };
})();
