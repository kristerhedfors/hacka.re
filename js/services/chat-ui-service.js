/**
 * Chat UI Service
 * Handles UI state updates and visual feedback for chat interactions
 */

window.ChatUIService = (function() {
    'use strict';

    /**
     * Create a UI state handler for chat interactions
     * @param {Object} elements - DOM elements
     * @returns {Object} UI state handler interface
     */
    function createUIStateHandler(elements) {
        return {
            /**
             * Set UI to generating state
             */
            setGeneratingState() {
                // Change send button to stop button
                elements.sendBtn.innerHTML = '<i class="fas fa-stop"></i>';
                elements.sendBtn.title = 'Stop generation';
                
                // Dispatch event to start heart animation
                document.dispatchEvent(new CustomEvent('ai-response-start'));
            },

            /**
             * Reset UI to normal state
             */
            resetState() {
                // Reset send button
                elements.sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
                elements.sendBtn.title = 'Send message';
                
                // Dispatch event to stop heart animation
                document.dispatchEvent(new CustomEvent('ai-response-end'));
            },

            /**
             * Clear message input
             */
            clearInput() {
                elements.messageInput.value = '';
                elements.messageInput.style.height = 'auto';
                elements.messageInput.focus();
            },

            /**
             * Add typing indicator to chat
             * @returns {HTMLElement} The typing indicator element
             */
            addTypingIndicator() {
                const typingIndicator = UIUtils.createTypingIndicator();
                elements.chatMessages.appendChild(typingIndicator);
                UIUtils.scrollToBottom(elements.chatMessages);
                return typingIndicator;
            },

            /**
             * Remove typing indicator from chat
             * @param {HTMLElement} typingIndicator - The typing indicator element to remove
             */
            removeTypingIndicator(typingIndicator) {
                if (typingIndicator && typingIndicator.parentNode) {
                    typingIndicator.remove();
                }
            },

            /**
             * Add a user message to the chat UI
             * @param {string} content - Message content
             * @returns {HTMLElement} The created message element
             */
            addUserMessageToUI(content) {
                const messageElement = UIUtils.createMessageElement('user', content);
                elements.chatMessages.appendChild(messageElement);
                UIUtils.scrollToBottom(elements.chatMessages);
                return messageElement;
            },

            /**
             * Add an AI message to the chat UI
             * @param {string} content - Message content
             * @param {string} id - Message ID
             * @returns {HTMLElement} The created message element
             */
            addAIMessageToUI(content, id) {
                // Create the element but mark it as placeholder if empty
                const messageElement = UIUtils.createMessageElement('assistant', content, id);
                
                // If content is empty, add a placeholder class that we can use to hide it
                if (!content || content.trim() === '') {
                    messageElement.classList.add('ai-message-placeholder');
                    messageElement.style.display = 'none'; // Hide it initially
                }
                
                elements.chatMessages.appendChild(messageElement);
                UIUtils.scrollToBottom(elements.chatMessages);
                return messageElement;
            },

            /**
             * Add a system message to the chat UI
             * @param {string} content - Message content
             * @param {string} className - Optional CSS class to add to the message
             * @returns {HTMLElement} The created message element
             */
            addSystemMessageToUI(content, className) {
                // Pass className to createMessageElement so it can handle markdown rendering for welcome messages
                const messageElement = UIUtils.createMessageElement('system', content, null, className);
                
                // Add custom class if provided
                if (className) {
                    messageElement.classList.add(...className.split(' '));
                }
                
                // Add data attributes for debug messages to enable efficient removal
                if (className && className.includes('debug-')) {
                    messageElement.setAttribute('data-debug-message', 'true');
                    // Extract debug category from className (e.g., 'debug-crypto' -> 'crypto')
                    const debugCategory = className.match(/debug-([a-zA-Z-]+)/);
                    if (debugCategory && debugCategory[1]) {
                        messageElement.setAttribute('data-debug-category', debugCategory[1]);
                    }
                }
                
                elements.chatMessages.appendChild(messageElement);
                UIUtils.scrollToBottom(elements.chatMessages);
                return messageElement;
            },

            /**
             * Update message content with function markers
             * @param {string} content - Content with function markers
             * @param {string} messageId - Message ID to update
             */
            updateMessageWithFunctionMarkers(content, messageId) {
                const aiMessageElement = document.querySelector(`.message[data-id="${messageId}"]`);
                if (aiMessageElement) {
                    const contentElement = aiMessageElement.querySelector('.message-content');
                    contentElement.innerHTML = UIUtils.renderMarkdown(content);
                    UIUtils.scrollToBottom(elements.chatMessages);
                }
            },

            /**
             * Clear chat UI and display messages
             * @param {Array} messages - Array of messages to display
             */
            displayMessages(messages) {
                console.log('[ChatUIService] displayMessages called with', messages.length, 'messages');
                
                // Preserve any existing welcome messages before clearing
                const existingWelcomeMessages = elements.chatMessages.querySelectorAll('.welcome-message');
                const preservedWelcomeMessages = [];
                existingWelcomeMessages.forEach(msg => {
                    preservedWelcomeMessages.push(msg.cloneNode(true));
                });
                
                // Clear chat container
                elements.chatMessages.innerHTML = '';
                console.log('[ChatUIService] Chat container cleared');
                
                // Restore welcome messages first
                preservedWelcomeMessages.forEach(welcomeMsg => {
                    elements.chatMessages.appendChild(welcomeMsg);
                    console.log('[ChatUIService] Restored welcome message to top of chat');
                });
                
                // Add messages to chat
                messages.forEach((message, index) => {
                    console.log(`[ChatUIService] Processing message ${index + 1}/${messages.length}:`, message.role, message.content?.substring(0, 50) + '...');
                    
                    if (message.role === 'user') {
                        const messageElement = UIUtils.createMessageElement('user', message.content);
                        elements.chatMessages.appendChild(messageElement);
                        console.log('[ChatUIService] Added user message to DOM');
                    } else if (message.role === 'assistant') {
                        // Skip empty assistant messages
                        if (!message.content || message.content.trim() === '') {
                            console.log('[ChatUIService] Skipping empty assistant message');
                        } else {
                            const messageElement = UIUtils.createMessageElement('assistant', message.content);
                            elements.chatMessages.appendChild(messageElement);
                            console.log('[ChatUIService] Added assistant message to DOM');
                        }
                    } else if (message.role === 'system') {
                        const messageElement = UIUtils.createMessageElement('system', message.content, null, message.className);
                        elements.chatMessages.appendChild(messageElement);
                        console.log('[ChatUIService] Added system message to DOM');
                    }
                });
                
                console.log('[ChatUIService] Total messages in DOM:', elements.chatMessages.children.length);
                
                // Scroll to bottom
                UIUtils.scrollToBottom(elements.chatMessages);
                console.log('[ChatUIService] Scrolled to bottom');
            },

            /**
             * Clear chat UI completely
             */
            clearChat() {
                elements.chatMessages.innerHTML = '';
            },
            
            /**
             * Remove all debug messages from chat UI
             */
            removeAllDebugMessages() {
                const debugMessages = elements.chatMessages.querySelectorAll('[data-debug-message="true"]');
                debugMessages.forEach(msg => msg.remove());
            },
            
            /**
             * Remove debug messages from a specific category
             * @param {string} category - Category to remove messages from
             */
            removeCategoryDebugMessages(category) {
                const categoryMessages = elements.chatMessages.querySelectorAll(`[data-debug-category="${category}"]`);
                categoryMessages.forEach(msg => msg.remove());
            }
        };
    }

    // Public API
    return {
        createUIStateHandler
    };
})();