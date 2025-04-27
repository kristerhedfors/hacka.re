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
         * Save share options to local storage
         */
        function saveShareOptions() {
            if (elements.shareBaseUrlCheckbox && elements.shareApiKeyCheckbox && 
                elements.shareSystemPromptCheckbox && elements.shareModelCheckbox && 
                elements.shareConversationCheckbox && elements.messageHistoryCount) {
                
                const options = {
                    includeBaseUrl: elements.shareBaseUrlCheckbox.checked,
                    includeApiKey: elements.shareApiKeyCheckbox.checked,
                    includeSystemPrompt: elements.shareSystemPromptCheckbox.checked,
                    includeModel: elements.shareModelCheckbox.checked,
                    includeConversation: elements.shareConversationCheckbox.checked,
                    messageCount: parseInt(elements.messageHistoryCount.value, 10) || 1
                };
                
                StorageService.saveShareOptions(options);
            }
        }
        
        /**
         * Load share options from local storage
         */
        function loadShareOptions() {
            const options = StorageService.getShareOptions();
            
            if (options && elements.shareBaseUrlCheckbox && elements.shareApiKeyCheckbox && 
                elements.shareSystemPromptCheckbox && elements.shareModelCheckbox && 
                elements.shareConversationCheckbox && elements.messageHistoryCount) {
                
                elements.shareBaseUrlCheckbox.checked = options.includeBaseUrl;
                elements.shareApiKeyCheckbox.checked = options.includeApiKey;
                elements.shareSystemPromptCheckbox.checked = options.includeSystemPrompt;
                elements.shareModelCheckbox.checked = options.includeModel;
                elements.shareConversationCheckbox.checked = options.includeConversation;
                elements.messageHistoryCount.value = options.messageCount;
                
                // Update message history input state
                if (options.includeConversation) {
                    elements.messageHistoryCount.disabled = false;
                    if (elements.messageHistoryContainer) {
                        elements.messageHistoryContainer.classList.add('active');
                    }
                } else {
                    elements.messageHistoryCount.disabled = true;
                    if (elements.messageHistoryContainer) {
                        elements.messageHistoryContainer.classList.remove('active');
                    }
                }
            }
        }
        
        /**
         * Regenerate a strong password/session key
         */
        function regeneratePassword() {
            if (elements.sharePassword) {
                // Use the stored session key if it exists, otherwise generate a new one
                const newPassword = sessionKey || ShareService.generateStrongPassword();
                
                // If the password is masked (type="password"), show a sweeping animation
                if (elements.sharePassword.type === 'password') {
                    // Create a temporary input for the animation
                    const tempInput = document.createElement('input');
                    tempInput.type = 'text';
                    tempInput.className = elements.sharePassword.className;
                    tempInput.style.position = 'absolute';
                    tempInput.style.top = '0';
                    tempInput.style.left = '0';
                    tempInput.style.width = '100%';
                    tempInput.style.height = '100%';
                    tempInput.style.zIndex = '10';
                    tempInput.style.backgroundColor = elements.sharePassword.style.backgroundColor || 'white';
                    
                    // Add the temporary input to the password container
                    const container = elements.sharePassword.parentNode;
                    if (container) {
                        container.style.position = 'relative';
                        container.appendChild(tempInput);
                        
                        // Create a string of stars with the same length as the password
                        const stars = '*'.repeat(newPassword.length);
                        tempInput.value = stars;
                        
                        // Perform the sweeping animation
                        animateSweep(tempInput, stars, 0);
                    }
                }
                
                // Set the new password
                elements.sharePassword.value = newPassword;
                
                // If password was visible, keep it visible
                if (elements.sharePassword.type === 'text') {
                    elements.sharePassword.type = 'text';
                }
            }
        }
        
        /**
         * Animate a sweeping effect through the masked password
         * @param {HTMLElement} input - The input element to animate
         * @param {string} stars - The string of stars
         * @param {number} position - The current position in the sweep
         */
        function animateSweep(input, stars, position) {
            if (position >= stars.length) {
                // Animation complete, remove the temporary input
                if (input.parentNode) {
                    input.parentNode.removeChild(input);
                }
                return;
            }
            
            // Replace the character at the current position with a dot
            const chars = stars.split('');
            chars[position] = '.';
            input.value = chars.join('');
            
            // Move to the next position after a short delay
            setTimeout(() => {
                animateSweep(input, stars, position + 1);
            }, 15); // Adjust speed as needed (lower = faster)
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
         * Copy password/session key to clipboard
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
                        addSystemMessage('Password/session key copied to clipboard.');
                    }
                    
                    // Show a visual notification
                    showCopyNotification();
                    
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
         * Show a visual notification that the password/session key was copied
         */
        function showCopyNotification() {
            // Create a notification element
            const notification = document.createElement('div');
            notification.className = 'copy-notification';
            notification.textContent = 'Password/session key copied!';
            notification.style.position = 'absolute';
            notification.style.top = '50%';
            notification.style.left = '50%';
            notification.style.transform = 'translate(-50%, -50%)';
            notification.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            notification.style.color = 'white';
            notification.style.padding = '10px 15px';
            notification.style.borderRadius = '5px';
            notification.style.zIndex = '1000';
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s ease-in-out';
            
            // Add to the share modal
            if (elements.shareModal) {
                elements.shareModal.appendChild(notification);
                
                // Fade in
                setTimeout(() => {
                    notification.style.opacity = '1';
                }, 10);
                
                // Fade out and remove after 1.5 seconds
                setTimeout(() => {
                    notification.style.opacity = '0';
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.parentNode.removeChild(notification);
                        }
                    }, 300);
                }, 1500);
            }
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
            
            // Get password/session key
            const password = elements.sharePassword.value.trim();
            if (!password) {
                if (addSystemMessage) {
                    addSystemMessage('Error: Password/session key is required.');
                }
                return false;
            }
            
            // Get base URL
            const baseUrl = StorageService.getBaseUrl();
            
            // Get title and subtitle values from inputs if they exist, otherwise use defaults
            let title = StorageService.getTitle();
            let subtitle = StorageService.getSubtitle();
            
            // Check if title input exists and has a value
            if (elements.shareTitleInput && elements.shareTitleInput.value.trim()) {
                title = elements.shareTitleInput.value.trim();
                // Save the title to storage when generating a link
                StorageService.saveTitle(title);
            }
            
            // Check if subtitle input exists and has a value
            if (elements.shareSubtitleInput && elements.shareSubtitleInput.value.trim()) {
                subtitle = elements.shareSubtitleInput.value.trim();
                // Save the subtitle to storage when generating a link
                StorageService.saveSubtitle(subtitle);
            }
            
            // Get options
            const options = {
                baseUrl: baseUrl,
                apiKey: apiKey,
                systemPrompt: systemPrompt,
                model: currentModel,
                messages: messages,
                includeBaseUrl: elements.shareBaseUrlCheckbox.checked,
                includeApiKey: elements.shareApiKeyCheckbox.checked,
                includeSystemPrompt: elements.shareSystemPromptCheckbox.checked,
                includeModel: elements.shareModelCheckbox.checked,
                includeConversation: elements.shareConversationCheckbox.checked,
                messageCount: parseInt(elements.messageHistoryCount.value, 10) || 1,
                title: title,
                subtitle: subtitle
            };
            
            // Validate options
            if (!options.includeBaseUrl && !options.includeApiKey && !options.includeSystemPrompt && !options.includeModel && !options.includeConversation) {
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
                    
                    // Show a visual notification
                    showCopyLinkNotification();
                    
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
         * Show a visual notification that the link was copied
         */
        function showCopyLinkNotification() {
            // Create a notification element
            const notification = document.createElement('div');
            notification.className = 'copy-notification';
            notification.textContent = 'Link copied!';
            notification.style.position = 'absolute';
            notification.style.top = '50%';
            notification.style.left = '50%';
            notification.style.transform = 'translate(-50%, -50%)';
            notification.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            notification.style.color = 'white';
            notification.style.padding = '10px 15px';
            notification.style.borderRadius = '5px';
            notification.style.zIndex = '1000';
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s ease-in-out';
            
            // Add to the share modal
            if (elements.shareModal) {
                elements.shareModal.appendChild(notification);
                
                // Fade in
                setTimeout(() => {
                    notification.style.opacity = '1';
                }, 10);
                
                // Fade out and remove after 1.5 seconds
                setTimeout(() => {
                    notification.style.opacity = '0';
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.parentNode.removeChild(notification);
                        }
                    }, 300);
                }, 1500);
            }
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
        
        /**
         * Check if the session key is locked
         * @returns {boolean} True if the session key is locked, false otherwise
         */
        function isSessionKeyLocked() {
            return sessionKey !== null && elements.passwordInputContainer && 
                   elements.passwordInputContainer.classList.contains('locked');
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
            setSessionKey,
            isSessionKeyLocked,
            saveShareOptions,
            loadShareOptions
        };
    }

    // Public API
    return {
        createShareManager: createShareManager
    };
})();
