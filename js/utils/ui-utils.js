/**
 * UI Utilities
 * Core UI helper functions for rendering and manipulation
 * Depends on: FunctionMarkers, ClipboardUtils, ContextUtils, TooltipUtils
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
            if (window.FunctionMarkers) {
                text = window.FunctionMarkers.processMarkers(text);
            }
            
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
     * Smart autoscroll state management
     */
    const AutoscrollState = {
        isEnabled: true,
        scrollThreshold: 150, // pixels from bottom to re-enable autoscroll
        detachThreshold: 50,  // pixels from bottom to detach autoscroll
        attachedElements: new WeakMap() // track state per element
    };

    /**
     * Initialize smart autoscroll for a chat element
     * @param {HTMLElement} element - Chat messages container element
     */
    function initializeSmartAutoscroll(element) {
        if (AutoscrollState.attachedElements.has(element)) {
            return; // Already initialized
        }

        const state = {
            isAutoScrollEnabled: true,
            userScrollTimeout: null
        };
        
        AutoscrollState.attachedElements.set(element, state);

        // Detect user scroll up (disable autoscroll)
        element.addEventListener('scroll', () => {
            const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
            
            if (distanceFromBottom > AutoscrollState.detachThreshold && state.isAutoScrollEnabled) {
                // User scrolled up - disable autoscroll (easier to trigger)
                state.isAutoScrollEnabled = false;
            } else if (distanceFromBottom <= AutoscrollState.scrollThreshold && !state.isAutoScrollEnabled) {
                // User scrolled back to bottom - re-enable autoscroll
                state.isAutoScrollEnabled = true;
            }
        });

        // Detect mouse wheel up (disable autoscroll immediately)
        element.addEventListener('wheel', (e) => {
            if (e.deltaY < 0) { // Scrolling up
                // Immediately disable autoscroll on any upward wheel movement
                state.isAutoScrollEnabled = false;
                
                // Clear existing timeout
                if (state.userScrollTimeout) {
                    clearTimeout(state.userScrollTimeout);
                }
                
                // Re-check scroll position after user stops scrolling
                state.userScrollTimeout = setTimeout(() => {
                    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
                    if (distanceFromBottom <= AutoscrollState.scrollThreshold) {
                        state.isAutoScrollEnabled = true;
                    }
                }, 100); // Shorter delay for faster reattachment
            }
        });
    }

    /**
     * Check if autoscroll is enabled for an element
     * @param {HTMLElement} element - Element to check
     * @returns {boolean} - Whether autoscroll is enabled
     */
    function isAutoscrollEnabled(element) {
        const state = AutoscrollState.attachedElements.get(element);
        return state ? state.isAutoScrollEnabled : true;
    }

    /**
     * Scroll an element to its bottom (with smart autoscroll)
     * @param {HTMLElement} element - Element to scroll
     * @param {boolean} force - Force scroll even if autoscroll is disabled
     */
    function scrollToBottom(element, force = false) {
        // Initialize smart autoscroll if not already done
        initializeSmartAutoscroll(element);
        
        // Only scroll if autoscroll is enabled or forced
        if (force || isAutoscrollEnabled(element)) {
            element.scrollTop = element.scrollHeight;
        }
    }

    /**
     * Set up auto-resizing for a textarea with performance optimizations
     * @param {HTMLTextAreaElement} textarea - Textarea element to auto-resize
     */
    function setupTextareaAutoResize(textarea) {
        // Cache for performance
        let resizeScheduled = false;
        const maxHeight = 150; // Match CSS max-height
        
        textarea.addEventListener('input', () => {
            // Use requestAnimationFrame to batch DOM updates
            if (!resizeScheduled) {
                resizeScheduled = true;
                
                requestAnimationFrame(() => {
                    // Reset height to auto to get accurate scrollHeight
                    textarea.style.height = 'auto';
                    
                    // Calculate new height, but respect max-height
                    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
                    textarea.style.height = newHeight + 'px';
                    
                    // If we've hit max height, ensure overflow is set
                    if (textarea.scrollHeight > maxHeight) {
                        textarea.style.overflowY = 'auto';
                    } else {
                        textarea.style.overflowY = 'hidden';
                    }
                    
                    resizeScheduled = false;
                });
            }
        });
    }

    /**
     * Update the context usage display
     * @param {HTMLElement} fillElement - Element for the usage fill bar
     * @param {HTMLElement} textElement - Element for the usage text
     * @param {number} percentage - Usage percentage (0-100)
     */
    function updateContextUsage(fillElement, textElement, percentage) {
        if (!fillElement || !textElement) {
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
    }

    /**
     * Create a message element
     * @param {string} role - Message role ('user', 'assistant', or 'system')
     * @param {string} content - Message content
     * @param {string} [id] - Optional ID for the message element
     * @param {string} [className] - Optional class name for special rendering
     * @returns {HTMLElement} - The created message element
     */
    function createMessageElement(role, content, id = null, className = null) {
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
            // For welcome messages, render as markdown like assistant messages
            if (className && className.includes('welcome-message')) {
                messageElement.innerHTML = `
                    <div class="message-content markdown-content">
                        ${content ? renderMarkdown(content) : ''}
                    </div>
                `;
            } else if (content && (content.includes('🎭') || content.includes('🤖'))) {
                // For multi-agent system messages, render as markdown to support bold formatting
                messageElement.innerHTML = `
                    <div class="message-content markdown-content">
                        ${content ? renderMarkdown(content) : ''}
                    </div>
                `;
            } else {
                // For other system messages, preserve newlines by using innerHTML with <br> tags
                // First escape HTML to prevent XSS, then replace newlines with <br>
                const escapedContent = escapeHTML(content);
                const contentWithLineBreaks = escapedContent.replace(/\n/g, '<br>');
                
                messageElement.innerHTML = `
                    <div class="message-content" style="font-family: 'Courier New', monospace;">
                        ${contentWithLineBreaks}
                    </div>
                `;
            }
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
     * Estimate context usage (delegates to ContextUtils)
     * @param {Array} messages - Array of chat messages
     * @param {Object} modelInfo - Information about the current model
     * @param {string} currentModel - Current model ID
     * @param {string} systemPrompt - System prompt content
     * @returns {Object} - Object containing estimated tokens, context size, and usage percentage
     */
    function estimateContextUsage(messages, modelInfo, currentModel, systemPrompt = '') {
        if (window.ContextUtils) {
            return window.ContextUtils.estimateContextUsage(messages, modelInfo, currentModel, systemPrompt);
        }
        
        // Fallback implementation
        let totalChars = systemPrompt ? systemPrompt.length : 0;
        if (messages && messages.length > 0) {
            for (let i = 0; i < messages.length; i++) {
                const message = messages[i];
                if (message && message.content) {
                    totalChars += message.content.length;
                }
            }
        }
        
        const estimatedTokens = Math.ceil(totalChars / 4);
        const contextSize = 8192; // Default fallback
        const percentage = Math.min(Math.round((estimatedTokens / contextSize) * 100), 100);
        
        return {
            estimatedTokens,
            contextSize,
            percentage
        };
    }

    /**
     * Copy chat content to clipboard (delegates to ClipboardUtils)
     * @param {HTMLElement} chatMessagesElement - The chat messages container element
     * @returns {boolean} - Whether the copy was successful
     */
    function copyChatContent(chatMessagesElement) {
        if (window.ClipboardUtils) {
            return window.ClipboardUtils.copyChatContent(chatMessagesElement);
        }
        
        // Fallback implementation
        console.error('ClipboardUtils not available');
        return false;
    }

    /**
     * Copy text to clipboard with notification (delegates to ClipboardUtils)
     * @param {string} text - Text to copy
     * @param {string} message - Notification message
     * @param {HTMLElement} button - Button element that triggered the copy
     */
    function copyToClipboardWithNotification(text, message, button) {
        if (window.ClipboardUtils) {
            return window.ClipboardUtils.copyToClipboardWithNotification(text, message, button);
        }
        
        // Fallback implementation
        console.error('ClipboardUtils not available');
    }
    
    /**
     * Show a notification (delegates to ClipboardUtils)
     * @param {string} message - Notification message
     */
    function showNotification(message) {
        if (window.ClipboardUtils) {
            return window.ClipboardUtils.showNotification(message);
        }
        
        // Fallback implementation
        console.error('ClipboardUtils not available');
    }
    
    /**
     * Simple Event System for decoupling components
     * Provides publish-subscribe pattern to reduce circular dependencies
     */
    const EventBus = (function() {
        const events = new Map();
        
        /**
         * Subscribe to an event
         * @param {string} eventName - Name of the event
         * @param {Function} callback - Callback function
         * @returns {Function} Unsubscribe function
         */
        function subscribe(eventName, callback) {
            if (!events.has(eventName)) {
                events.set(eventName, []);
            }
            
            events.get(eventName).push(callback);
            
            // Return unsubscribe function
            return function unsubscribe() {
                const callbacks = events.get(eventName);
                if (callbacks) {
                    const index = callbacks.indexOf(callback);
                    if (index > -1) {
                        callbacks.splice(index, 1);
                    }
                }
            };
        }
        
        /**
         * Emit an event
         * @param {string} eventName - Name of the event
         * @param {*} data - Data to pass to callbacks
         */
        function emit(eventName, data) {
            const callbacks = events.get(eventName);
            if (!callbacks) {
                return;
            }
            
            // Call all callbacks asynchronously to prevent blocking
            callbacks.forEach(callback => {
                setTimeout(() => {
                    try {
                        callback(data);
                    } catch (error) {
                        console.error(`Error in event callback for ${eventName}:`, error);
                    }
                }, 0);
            });
        }
        
        /**
         * Remove all listeners for an event
         * @param {string} eventName - Name of the event
         */
        function removeAllListeners(eventName) {
            events.delete(eventName);
        }
        
        /**
         * Get all current events (for debugging)
         * @returns {Object} Events object
         */
        function getEvents() {
            const result = {};
            events.forEach((callbacks, eventName) => {
                result[eventName] = callbacks.length;
            });
            return result;
        }
        
        return {
            subscribe,
            emit,
            removeAllListeners,
            getEvents
        };
    })();

    // Public API
    return {
        renderMarkdown,
        escapeHTML,
        scrollToBottom,
        initializeSmartAutoscroll,
        isAutoscrollEnabled,
        setupTextareaAutoResize,
        updateContextUsage,
        createMessageElement,
        createTypingIndicator,
        estimateContextUsage,
        copyChatContent,
        copyToClipboardWithNotification,
        showNotification,
        EventBus
    };
})();
