/**
 * Copy Code Button Script for hacka.re
 * Adds copy buttons to code blocks in the chat interface
 */

window.CopyCodeService = (function() {
    /**
     * Add copy buttons to all code blocks
     */
    function addCopyButtons() {
        // Find all pre > code elements
        const codeBlocks = document.querySelectorAll('pre > code');
        
        codeBlocks.forEach((codeBlock, index) => {
            // Skip if the parent already has a copy button
            if (codeBlock.parentNode.querySelector('.copy-code-button')) {
                return;
            }
            
            // Create the copy button
            const copyButton = document.createElement('button');
            copyButton.className = 'copy-code-button';
            copyButton.type = 'button';
            copyButton.innerHTML = '<i class="fas fa-copy"></i>';
            copyButton.title = 'Copy code to clipboard';
            copyButton.setAttribute('aria-label', 'Copy code to clipboard');
            copyButton.dataset.index = index;
            
            // Add the button to the code block's parent (the pre element)
            const pre = codeBlock.parentNode;
            pre.classList.add('code-block-with-copy');
            pre.appendChild(copyButton);
            
            // Add click event listener
            copyButton.addEventListener('click', function() {
                // Get the text content of the code block
                const code = codeBlock.textContent;
                
                // Copy to clipboard
                navigator.clipboard.writeText(code).then(() => {
                    // Visual feedback on successful copy
                    copyButton.innerHTML = '<i class="fas fa-check"></i>';
                    copyButton.classList.add('copied');
                    
                    // Reset after 2 seconds
                    setTimeout(() => {
                        copyButton.innerHTML = '<i class="fas fa-copy"></i>';
                        copyButton.classList.remove('copied');
                    }, 2000);
                }).catch(err => {
                    console.error('Failed to copy code: ', err);
                    copyButton.innerHTML = '<i class="fas fa-times"></i>';
                    copyButton.classList.add('error');
                    
                    // Reset after 2 seconds
                    setTimeout(() => {
                        copyButton.innerHTML = '<i class="fas fa-copy"></i>';
                        copyButton.classList.remove('error');
                    }, 2000);
                });
            });
        });
    }
    
    /**
     * Initialize the copy code functionality
     */
    function init() {
        // Initial call to add copy buttons to existing code blocks
        addCopyButtons();
        
        // Create a MutationObserver to watch for new code blocks
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                    // Check if any of the added nodes contain code blocks
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === 1) { // Element node
                            const codeBlocks = node.querySelectorAll('pre > code');
                            if (codeBlocks.length > 0) {
                                addCopyButtons();
                            }
                        }
                    });
                }
            });
        });
        
        // Start observing the chat messages container
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            observer.observe(chatMessages, {
                childList: true,
                subtree: true
            });
        }
    }
    
    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', init);
    
    // Public API
    return {
        init: init,
        addCopyButtons: addCopyButtons
    };
})();
