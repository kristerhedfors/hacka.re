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
            const markdownOutput = marked.parse(text);
            
            // DOMPurify is used to sanitize the HTML
            const htmlContent = DOMPurify.sanitize(markdownOutput, {
                ADD_TAGS: ['span', 'br', 'strong'],
                ADD_ATTR: ['class'],
                ALLOW_DATA_ATTR: false
            });
            
            // Apply syntax highlighting if highlight.js is available
            if (typeof hljs !== 'undefined') {
                // Create a temporary container to apply highlighting
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = htmlContent;
                
                // Find all code blocks and apply syntax highlighting
                const codeBlocks = tempDiv.querySelectorAll('pre code');
                codeBlocks.forEach(block => {
                    // Apply syntax highlighting
                    hljs.highlightElement(block);
                });
                
                return tempDiv.innerHTML;
            }
            
            return htmlContent;
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
        // Debug: log if we're processing any text with markers
        if (text.includes('[FUNCTION_CALL:') || text.includes('[FUNCTION_RESULT:')) {
            console.log('[UI Debug] Processing text with markers');
        }
        
        // Reset function call counts if this is a new message
        // We can detect this by checking if there are no function call markers in the text
        if (!text.includes('[FUNCTION_CALL:') && !text.includes('[FUNCTION_RESULT:')) {
            Object.keys(functionCallCounts).forEach(key => {
                delete functionCallCounts[key];
            });
        }
        
        // Replace function call markers with icons
        // Handle potential whitespace around the marker
        // New format: [FUNCTION_CALL:functionName:encodedArgs]
        // Old format: [FUNCTION_CALL:functionName] (for backward compatibility)
        text = text.replace(/\s*\[FUNCTION_CALL:([^:\]]+)(?::([^\]]+))?\]\s*/g, (match, functionName, encodedArgs) => {
            // Increment the count for this function name
            functionCallCounts[functionName] = (functionCallCounts[functionName] || 0) + 1;
            
            // Calculate color class (cycle through 5 colors)
            const colorIndex = (functionCallCounts[functionName] % 5) || 5;
            const colorClass = `color-${colorIndex}`;
            
            // Decode and format the arguments
            let formattedArgs = '{}';
            if (encodedArgs) {
                try {
                    const decodedArgs = decodeURIComponent(encodedArgs);
                    const argsObj = JSON.parse(decodedArgs);
                    formattedArgs = JSON.stringify(argsObj, null, 2);
                } catch (e) {
                    formattedArgs = decodeURIComponent(encodedArgs);
                }
            }
            
            const iconHtml = `<span class="function-call-icon ${colorClass}">f<span class="function-icon-tooltip"><strong>Function:</strong> ${escapeHTML(functionName)}<br><strong>Parameters:</strong> ${escapeHTML(formattedArgs)}</span></span>`;
            return iconHtml;
        });
        
        // Replace function result markers with icons
        // Handle potential newlines around the marker
        // New format: [FUNCTION_RESULT:name:type:encodedValue:executionTime]
        // Old format: [FUNCTION_RESULT:name:type:encodedValue] (for backward compatibility)
        text = text.replace(/\s*\[FUNCTION_RESULT:([^:]+):([^:]+):([^:]+)(?::([^\]]+))?\]\s*/g, (match, functionName, resultType, encodedResult, executionTime) => {
            // Use the same color as the corresponding function call
            const colorIndex = (functionCallCounts[functionName] % 5) || 5;
            const colorClass = `color-${colorIndex}`;
            
            // Decode the result value
            let decodedResult = '';
            let displayValue = '';
            
            try {
                decodedResult = decodeURIComponent(encodedResult);
                
                // Parse the result to get a formatted display value
                const resultValue = JSON.parse(decodedResult);
                
                // Format the display value based on the type
                if (resultType === 'object' || resultType === 'array') {
                    // For objects and arrays, show a compact JSON representation
                    displayValue = JSON.stringify(resultValue);
                    // Limit the length for display
                    if (displayValue.length > 100) {
                        displayValue = displayValue.substring(0, 97) + '...';
                    }
                } else {
                    // For primitives, show the value directly
                    displayValue = String(resultValue);
                }
            } catch (e) {
                // If parsing fails, show the raw decoded result
                displayValue = decodedResult;
                if (displayValue.length > 100) {
                    displayValue = displayValue.substring(0, 97) + '...';
                }
            }
            
            // Create tooltip with function result type, value, and copy button
            // Only include a copy button for the result value, not for the function name
            
            // For the copy button, use a properly formatted JSON string for objects and arrays
            let copyText = decodedResult;
            try {
                if (resultType === 'object' || resultType === 'array') {
                    // Parse and re-stringify to ensure proper JSON formatting
                    const resultValue = JSON.parse(decodedResult);
                    copyText = JSON.stringify(resultValue, null, 2);
                }
            } catch (e) {
                console.error('Error formatting result for copy:', e);
                // Fall back to the raw decoded result
                copyText = decodedResult;
            }
            
            // Create a unique ID for this result to use with a data attribute instead of inline content
            const resultId = `result_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            
            // Store the result in a global object that can be accessed by the copy function
            if (!window.functionResults) {
                window.functionResults = {};
            }
            window.functionResults[resultId] = copyText;
            
            // Use the ID instead of trying to escape the content for the data attribute
            const copyButtonHtml = `<button class="tooltip-copy-btn" data-result-id="${resultId}" data-copy-message="Function result value copied to clipboard">Copy</button>`;
            
            // Add event listener for this specific button (will be attached when the HTML is added to the DOM)
            setTimeout(() => {
                const copyBtn = document.querySelector(`button[data-result-id="${resultId}"]`);
                if (copyBtn) {
                    copyBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        const textToCopy = window.functionResults[resultId];
                        if (textToCopy) {
                            copyToClipboardWithNotification(textToCopy, "Function result value copied to clipboard", this);
                        }
                    });
                }
            }, 100);
            
            // For display, show more of the value for complex types
            let displayValueHtml = escapeHTML(displayValue);
            if (resultType === 'object' || resultType === 'array') {
                try {
                    // For objects and arrays, show a more detailed preview
                    const resultValue = JSON.parse(decodedResult);
                    // Format with indentation for better readability
                    const formattedJson = JSON.stringify(resultValue, null, 2);
                    // Limit to 300 characters for display, but show more than before
                    const truncatedJson = formattedJson.length > 300 
                        ? formattedJson.substring(0, 297) + '...' 
                        : formattedJson;
                    // Use pre tag to preserve formatting
                    displayValueHtml = `<pre style="max-height: 200px; overflow-y: auto; margin: 5px 0;">${escapeHTML(truncatedJson)}</pre>`;
                } catch (e) {
                    console.error('Error formatting display value:', e);
                    // Fall back to the simple escaped display value
                }
            }
            
            // Format execution time (if available)
            let executionTimeFormatted = 'N/A';
            if (executionTime) {
                const executionTimeMs = parseInt(executionTime) || 0;
                executionTimeFormatted = executionTimeMs < 1000 
                    ? `${executionTimeMs}ms`
                    : `${(executionTimeMs / 1000).toFixed(2)}s`;
            }
            
            const resultIconHtml = `<span class="function-result-icon ${colorClass}"><span class="function-icon-tooltip"><strong>Result:</strong> ${escapeHTML(functionName)}<br><strong>Type:</strong> ${escapeHTML(resultType)}<br><strong>Time:</strong> ${executionTimeFormatted}<br><strong>Value:</strong> ${escapeHTML(displayValue)}</span></span>`;
            return resultIconHtml;
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
    
    // Track the last model used to detect model changes
    let lastModelUsed = null;
    
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
        // Check if the model has changed since last call
        if (lastModelUsed !== currentModel) {
            console.log(`Model changed from ${lastModelUsed} to ${currentModel}, clearing context size cache`);
            // Clear the cache when the model changes
            Object.keys(contextSizeCache).forEach(key => {
                delete contextSizeCache[key];
            });
            // Update the last model used
            lastModelUsed = currentModel;
        }
        
        // Get context window size for the current model (use cache if available)
        let contextSize = contextSizeCache[currentModel];
        
        if (!contextSize) {
            // Try to get context size from ModelInfoService
            if (window.ModelInfoService && typeof ModelInfoService.getContextSize === 'function') {
                contextSize = ModelInfoService.getContextSize(currentModel);
                console.log(`Got context size ${contextSize} for model ${currentModel} from ModelInfoService.getContextSize`);
            }
            
            // If we couldn't get a context size from ModelInfoService.getContextSize,
            // try to get it directly from the contextWindowSizes object in ModelInfoService
            if (!contextSize && window.ModelInfoService && ModelInfoService.contextWindowSizes) {
                contextSize = ModelInfoService.contextWindowSizes[currentModel];
                console.log(`Got context size ${contextSize} for model ${currentModel} from ModelInfoService.contextWindowSizes`);
            }
            
            // If we still don't have a context size, default to 8192
            if (!contextSize) {
                contextSize = 8192;
                console.log(`No context size found for model ${currentModel}, defaulting to ${contextSize}`);
            }
            
            // Cache the context size for this model
            contextSizeCache[currentModel] = contextSize;
        } else {
            console.log(`Using cached context size ${contextSize} for model ${currentModel}`);
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

    // Initialize event listeners for copy buttons
    function initCopyButtons() {
        console.log('Initializing copy buttons');
        
        // Use event delegation to handle clicks on copy buttons
        document.addEventListener('click', function(event) {
            // Check if the clicked element is a copy button
            if (event.target && event.target.classList.contains('tooltip-copy-btn')) {
                event.preventDefault();
                event.stopPropagation();
                
                const button = event.target;
                const textToCopy = button.getAttribute('data-copy-text');
                const message = button.getAttribute('data-copy-message');
                
                console.log('Copy button clicked:', button);
                console.log('Text to copy:', textToCopy);
                console.log('Message:', message);
                
                if (textToCopy) {
                    copyToClipboardWithNotification(textToCopy, message || 'Copied to clipboard', button);
                } else {
                    console.error('No text to copy found in data-copy-text attribute');
                    showNotification('Error: No text to copy');
                }
                
                return false;
            }
        });
        
        console.log('Copy button event listener initialized');
    }
    
    /**
     * Copy text to clipboard with notification
     * @param {string} text - Text to copy
     * @param {string} message - Notification message
     * @param {HTMLElement} button - Button element that triggered the copy
     */
    function copyToClipboardWithNotification(text, message, button) {
        console.log('copyToClipboardWithNotification called with text:', text);
        
        try {
            // Try using the newer clipboard API first
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text)
                    .then(() => {
                        console.log('Copied to clipboard using Clipboard API:', text);
                        handleCopySuccess(text, message, button);
                    })
                    .catch(err => {
                        console.error('Failed to copy using Clipboard API:', err);
                        // Fall back to execCommand method
                        fallbackCopyTextToClipboard(text, message, button);
                    });
            } else {
                // Fall back to execCommand method for older browsers
                fallbackCopyTextToClipboard(text, message, button);
            }
        } catch (err) {
            console.error('Error in copyToClipboardWithNotification:', err);
            showNotification('Failed to copy to clipboard');
        }
    }
    
    /**
     * Fallback method to copy text to clipboard using execCommand
     * @param {string} text - Text to copy
     * @param {string} message - Notification message
     * @param {HTMLElement} button - Button element that triggered the copy
     */
    function fallbackCopyTextToClipboard(text, message, button) {
        console.log('Using fallback copy method');
        try {
            // Create a temporary textarea element
            const textArea = document.createElement('textarea');
            textArea.value = text;
            
            // Make the textarea out of viewport
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            // Execute copy command
            const successful = document.execCommand('copy');
            
            // Remove the textarea
            document.body.removeChild(textArea);
            
            if (successful) {
                console.log('Copied to clipboard using execCommand:', text);
                handleCopySuccess(text, message, button);
            } else {
                console.error('Failed to copy using execCommand');
                showNotification('Failed to copy to clipboard');
            }
        } catch (err) {
            console.error('Error in fallbackCopyTextToClipboard:', err);
            showNotification('Failed to copy to clipboard');
        }
    }
    
    /**
     * Handle successful copy operation
     * @param {string} text - Text that was copied
     * @param {string} message - Notification message
     * @param {HTMLElement} button - Button element that triggered the copy
     */
    function handleCopySuccess(text, message, button) {
        console.log('Copy successful:', text);
        
        // Show visual feedback on the button
        if (button) {
            const originalText = button.textContent;
            button.textContent = 'Copied!';
            button.classList.add('copied');
            
            // Reset button after a delay
            setTimeout(() => {
                button.textContent = originalText;
                button.classList.remove('copied');
            }, 1500);
        }
        
        // Show notification
        showNotification(message);
    }
    
    /**
     * Show a notification
     * @param {string} message - Notification message
     */
    function showNotification(message) {
        // Check if notification element already exists
        let notification = document.querySelector('.copy-notification');
        
        // Create notification element if it doesn't exist
        if (!notification) {
            notification = document.createElement('div');
            notification.className = 'copy-notification';
            document.body.appendChild(notification);
        }
        
        // Set message and show notification
        notification.textContent = message;
        notification.classList.add('show');
        
        // Hide notification after a delay
        setTimeout(() => {
            notification.classList.remove('show');
        }, 2000);
    }
    
    /**
     * Initialize tooltip behavior for function icons
     * This ensures tooltips stay visible when moving from icon to tooltip
     */
    function initTooltipBehavior() {
        console.log('Initializing tooltip behavior');
        
        // Use event delegation to handle mouseenter/mouseleave events
        document.addEventListener('mouseenter', function(event) {
            // Ensure event.target exists and has classList
            if (!event.target || !event.target.classList) {
                return;
            }
            
            // Check if the target is a function icon or its tooltip
            const isCallIcon = event.target.classList.contains('function-call-icon');
            const isResultIcon = event.target.classList.contains('function-result-icon');
            const isTooltip = event.target.closest && event.target.closest('.function-icon-tooltip');
            
            if (isCallIcon || isResultIcon || isTooltip) {
                // Find the tooltip
                let tooltip;
                if (isCallIcon || isResultIcon) {
                    tooltip = event.target.querySelector && event.target.querySelector('.function-icon-tooltip');
                } else {
                    tooltip = isTooltip;
                }
                
                // Make sure tooltip stays visible
                if (tooltip) {
                    tooltip.style.opacity = '1';
                    tooltip.style.pointerEvents = 'auto';
                }
            }
        }, true);
        
        document.addEventListener('mouseleave', function(event) {
            // Ensure event.target exists and has classList
            if (!event.target || !event.target.classList) {
                return;
            }
            
            try {
                // Check if we're leaving a function icon and not entering its tooltip
                const isLeavingCallIcon = event.target.classList.contains('function-call-icon');
                const isLeavingResultIcon = event.target.classList.contains('function-result-icon');
                const isEnteringTooltip = event.relatedTarget && event.relatedTarget.closest && 
                                         event.relatedTarget.closest('.function-icon-tooltip');
                
                if ((isLeavingCallIcon || isLeavingResultIcon) && !isEnteringTooltip) {
                    // Find the tooltip
                    const tooltip = event.target.querySelector && event.target.querySelector('.function-icon-tooltip');
                    
                    // Add a delay before hiding the tooltip
                    if (tooltip) {
                        setTimeout(() => {
                            try {
                                // Only hide if the mouse is not over the tooltip
                                if (!tooltip.matches(':hover')) {
                                    tooltip.style.opacity = '0';
                                    tooltip.style.pointerEvents = 'none';
                                }
                            } catch (e) {
                                console.error('Error in tooltip hover check:', e);
                            }
                        }, 300);
                    }
                }
                
                // Check if we're leaving a tooltip and not entering its parent icon
                const isLeavingTooltip = event.target.closest && event.target.closest('.function-icon-tooltip');
                const isEnteringCallIcon = event.relatedTarget && event.relatedTarget.classList && 
                                          event.relatedTarget.classList.contains('function-call-icon');
                const isEnteringResultIcon = event.relatedTarget && event.relatedTarget.classList && 
                                            event.relatedTarget.classList.contains('function-result-icon');
                const isEnteringAnotherTooltip = event.relatedTarget && event.relatedTarget.closest && 
                                                event.relatedTarget.closest('.function-icon-tooltip');
                
                if (isLeavingTooltip && !isEnteringCallIcon && !isEnteringResultIcon && !isEnteringAnotherTooltip) {
                    // Find the tooltip
                    const tooltip = isLeavingTooltip;
                    
                    // Hide the tooltip after a delay
                    if (tooltip) {
                        setTimeout(() => {
                            try {
                                // Only hide if the mouse is not over the tooltip or its parent icon
                                if (!tooltip.matches(':hover')) {
                                    tooltip.style.opacity = '0';
                                    tooltip.style.pointerEvents = 'none';
                                }
                            } catch (e) {
                                console.error('Error in tooltip hover check:', e);
                            }
                        }, 300);
                    }
                }
            } catch (e) {
                console.error('Error in mouseleave handler:', e);
            }
        }, true);
        
        console.log('Tooltip behavior event listeners initialized');
    }
    
    // Initialize copy buttons and tooltip behavior when the DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            initCopyButtons();
            initTooltipBehavior();
        });
    } else {
        // DOM already loaded, initialize immediately
        initCopyButtons();
        initTooltipBehavior();
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
        copyChatContent: copyChatContent,
        copyToClipboardWithNotification: copyToClipboardWithNotification,
        showNotification: showNotification,
        initCopyButtons: initCopyButtons
    };
})();
