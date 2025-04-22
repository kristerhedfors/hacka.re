/**
 * Share Manager Module
 * Handles sharing-related functionality for the AIHackare application
 */

window.ShareManager = (function() {
    /**
     * Create a Share Manager instance
     * @param {Object} elements - DOM elements
     * @returns {Object} Share Manager instance
     */
    function createShareManager(elements) {
        // Session key storage
        let sessionKey = null;
        
        /**
         * Initialize the share manager
         */
        function init() {
            // Nothing to initialize for now
        }
        
        /**
         * Regenerate a strong password
         */
        function regeneratePassword() {
            if (elements.sharePassword) {
                elements.sharePassword.value = ShareService.generateStrongPassword();
                
                // If password is visible, keep it visible
                if (elements.sharePassword.type === 'text') {
                    elements.sharePassword.type = 'text';
                }
            }
        }
        
        /**
         * Toggle session key lock
         * @param {Function} addSystemMessage - Function to add system message
         */
        function toggleSessionKeyLock(addSystemMessage) {
            if (elements.lockSessionKeyCheckbox && elements.passwordInputContainer) {
                if (elements.lockSessionKeyCheckbox.checked) {
                    // Lock the session key
                    elements.passwordInputContainer.classList.add('locked');
                    elements.sharePassword.readOnly = true;
                    
                    // Save the session key for future use
                    sessionKey = elements.sharePassword.value;
                    
                    // Show a message
                    if (addSystemMessage) {
                        addSystemMessage('Session key locked. It will be remembered for this session.');
                    }
                } else {
                    // Unlock the session key
                    elements.passwordInputContainer.classList.remove('locked');
                    elements.sharePassword.readOnly = false;
                }
            }
        }
        
        /**
         * Copy password to clipboard
         * @param {Function} addSystemMessage - Function to add system message
         */
        function copyPassword(addSystemMessage) {
            if (elements.sharePassword && elements.sharePassword.value) {
                try {
                    // Get the current password value
                    const passwordValue = elements.sharePassword.value;
                    
                    // Create a temporary input element
                    const tempInput = document.createElement('input');
                    tempInput.value = passwordValue;
                    tempInput.setAttribute('readonly', '');
                    tempInput.style.position = 'absolute';
                    tempInput.style.left = '-9999px';
                    document.body.appendChild(tempInput);
                    
                    // Select the text
                    tempInput.select();
                    tempInput.setSelectionRange(0, 99999); // For mobile devices
                    
                    // Copy to clipboard
                    document.execCommand('copy');
                    
                    // Remove the temporary element
                    document.body.removeChild(tempInput);
                    
                    // Show a success message
                    if (addSystemMessage) {
                        addSystemMessage('Password copied to clipboard.');
                    }
                    
                    return true;
                } catch (error) {
                    console.error('Error copying password to clipboard:', error);
                    if (addSystemMessage) {
                        addSystemMessage('Error copying password. Please select and copy manually.');
                    }
                    return false;
                }
            }
            return false;
        }
        
        /**
         * Generate a comprehensive share link
         * @param {string} apiKey - Current API key
         * @param {string} systemPrompt - Current system prompt
         * @param {string} currentModel - Current model ID
         * @param {Array} messages - Current messages
         * @param {Function} generateShareQRCode - Function to generate QR code
         * @param {Function} addSystemMessage - Function to add system message
         */
        function generateComprehensiveShareLink(apiKey, systemPrompt, currentModel, messages, generateShareQRCode, addSystemMessage) {
            if (!apiKey) {
                if (addSystemMessage) {
                    addSystemMessage('Error: No API key available to share.');
                }
                return false;
            }
            
            // Get password
            const password = elements.sharePassword.value.trim();
            if (!password) {
                if (addSystemMessage) {
                    addSystemMessage('Error: Password is required.');
                }
                return false;
            }
            
            // Get options
            const options = {
                apiKey: apiKey,
                systemPrompt: systemPrompt,
                model: currentModel,
                messages: messages,
                includeApiKey: elements.shareApiKeyCheckbox.checked,
                includeSystemPrompt: elements.shareSystemPromptCheckbox.checked,
                includeModel: elements.shareModelCheckbox.checked,
                includeConversation: elements.shareConversationCheckbox.checked,
                messageCount: parseInt(elements.messageHistoryCount.value, 10) || 1
            };
            
            // Validate options
            if (!options.includeApiKey && !options.includeSystemPrompt && !options.includeModel && !options.includeConversation) {
                if (addSystemMessage) {
                    addSystemMessage('Error: Please select at least one item to share.');
                }
                return false;
            }
            
            try {
                // Create shareable link
                const shareableLink = ShareService.createComprehensiveShareableLink(options, password);
                
                // Display the link
                if (elements.generatedLink && elements.generatedLinkContainer) {
                    elements.generatedLink.value = shareableLink;
                    elements.generatedLinkContainer.style.display = 'block';
                    
                    // Select the link text for easy copying
                    elements.generatedLink.select();
                    elements.generatedLink.focus();
                    
                    // Generate QR code
                    if (generateShareQRCode) {
                        generateShareQRCode(shareableLink);
                    }
                }
                
                return true;
            } catch (error) {
                console.error('Error creating shareable link:', error);
                if (addSystemMessage) {
                    addSystemMessage('Error creating shareable link. Please try again.');
                }
                return false;
            }
        }
        
        /**
         * Copy generated link to clipboard
         * @param {Function} addSystemMessage - Function to add system message
         */
        function copyGeneratedLink(addSystemMessage) {
            if (elements.generatedLink && elements.generatedLink.value) {
                try {
                    // Select the link text
                    elements.generatedLink.select();
                    elements.generatedLink.focus();
                    
                    // Copy to clipboard
                    document.execCommand('copy');
                    
                    // Show a success message
                    if (addSystemMessage) {
                        addSystemMessage('Shareable link copied to clipboard.');
                    }
                    
                    return true;
                } catch (error) {
                    console.error('Error copying link to clipboard:', error);
                    if (addSystemMessage) {
                        addSystemMessage('Error copying link. Please select and copy manually.');
                    }
                    return false;
                }
            }
            return false;
        }
        
        /**
         * Get the session key
         * @returns {string} Session key
         */
        function getSessionKey() {
            return sessionKey;
        }
        
        /**
         * Set the session key
         * @param {string} key - Session key
         */
        function setSessionKey(key) {
            sessionKey = key;
        }
        
        // Public API
        return {
            init,
            regeneratePassword,
            toggleSessionKeyLock,
            copyPassword,
            generateComprehensiveShareLink,
            copyGeneratedLink,
            getSessionKey,
            setSessionKey
        };
    }

    // Public API
    return {
        createShareManager: createShareManager
    };
})();
