/**
 * Clipboard Utilities
 * Handles clipboard operations and notifications
 */

window.ClipboardUtils = (function() {
    
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
     * Handle successful copy operation
     * @param {string} text - Text that was copied
     * @param {string} message - Notification message
     * @param {HTMLElement} button - Button element that triggered the copy
     */
    function handleCopySuccess(text, message, button) {
        console.log('Copy successful:', text);
        
        // Show visual feedback on the button
        if (button) {
            const originalHTML = button.innerHTML;
            const originalText = button.textContent;
            
            // Only change text if button doesn't contain HTML (icons, etc.)
            if (originalHTML === originalText) {
                // Button contains only text
                button.textContent = 'Copied!';
            } else {
                // Button contains HTML (like icons), add a temporary class for styling
                button.classList.add('copied');
                button.title = 'Copied!';
            }
            
            button.classList.add('copied');
            
            // Reset button after a delay
            setTimeout(() => {
                if (originalHTML === originalText) {
                    button.textContent = originalText;
                } else {
                    button.title = button.getAttribute('data-original-title') || 'Copy entire system prompt to clipboard';
                }
                button.classList.remove('copied');
            }, 1500);
        }
        
        // Show notification
        showNotification(message);
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
    
    /**
     * Initialize event listeners for copy buttons
     */
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
    
    // Initialize copy buttons when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCopyButtons);
    } else {
        initCopyButtons();
    }
    
    // Public API
    return {
        copyToClipboardWithNotification,
        copyChatContent,
        showNotification,
        initCopyButtons
    };
})();