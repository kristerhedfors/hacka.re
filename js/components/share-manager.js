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
        // Session key and welcome message storage
        let sessionKey = null;
        let sharedWelcomeMessage = null;
        let sharedLinkOptions = null; // Store what was included in the shared link that brought us here
        
        // Create a consistent session key storage key based on the shared link hash
        function getSessionKeyStorageKey() {
            if (LinkSharingService && LinkSharingService.hasSharedApiKey && LinkSharingService.hasSharedApiKey()) {
                const hash = window.location.hash;
                let encryptedData = null;
                if (hash.includes('#gpt=')) {
                    encryptedData = hash.split('#gpt=')[1];
                } else if (hash.includes('#shared=')) {
                    encryptedData = hash.split('#shared=')[1];
                }
                if (encryptedData) {
                    // Create a consistent key based on the encrypted data hash
                    const linkHash = CryptoUtils.hashString(encryptedData);
                    return `__hacka_re_session_key_${linkHash.substring(0, 16)}`;
                }
            }
            return null;
        }
        
        /**
         * Initialize the share manager
         */
        function init() {
            // For shared links, try to restore session key from sessionStorage
            const storageKey = getSessionKeyStorageKey();
            if (storageKey) {
                const storedKey = sessionStorage.getItem(storageKey);
                if (storedKey) {
                    sessionKey = storedKey;
                    console.log(`[ShareManager] Restored session key from sessionStorage for cross-tab consistency: ${storageKey}`);
                }
            }
        }
        
        /**
         * Save share options to local storage
         */
        function saveShareOptions() {
            if (elements.shareBaseUrlCheckbox && elements.shareApiKeyCheckbox && 
                elements.shareModelCheckbox && elements.shareConversationCheckbox && 
                elements.messageHistoryCount) {
                
                const options = {
                    includeBaseUrl: elements.shareBaseUrlCheckbox.checked,
                    includeApiKey: elements.shareApiKeyCheckbox.checked,
                    includeSystemPrompt: false, // System prompt is now handled by prompt library
                    includeModel: elements.shareModelCheckbox.checked,
                    includeConversation: elements.shareConversationCheckbox.checked,
                    messageCount: parseInt(elements.messageHistoryCount.value, 10) || 1,
                    includePromptLibrary: elements.sharePromptLibraryCheckbox ? elements.sharePromptLibraryCheckbox.checked : false,
                    includeFunctionLibrary: elements.shareFunctionLibraryCheckbox ? elements.shareFunctionLibraryCheckbox.checked : false,
                    includeMcpConnections: elements.shareMcpConnectionsCheckbox ? elements.shareMcpConnectionsCheckbox.checked : false,
                    includeWelcomeMessage: elements.shareWelcomeMessageCheckbox ? elements.shareWelcomeMessageCheckbox.checked : false
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
                elements.shareModelCheckbox && elements.shareConversationCheckbox && 
                elements.messageHistoryCount) {
                
                elements.shareBaseUrlCheckbox.checked = options.includeBaseUrl;
                elements.shareApiKeyCheckbox.checked = options.includeApiKey;
                elements.shareModelCheckbox.checked = options.includeModel;
                elements.shareConversationCheckbox.checked = options.includeConversation;
                elements.messageHistoryCount.value = options.messageCount;
                
                // Set prompt library checkbox if it exists
                if (elements.sharePromptLibraryCheckbox) {
                    elements.sharePromptLibraryCheckbox.checked = options.includePromptLibrary || false;
                }
                
                // Set function library checkbox if it exists
                if (elements.shareFunctionLibraryCheckbox) {
                    elements.shareFunctionLibraryCheckbox.checked = options.includeFunctionLibrary || false;
                }
                
                // Set MCP connections checkbox if it exists
                if (elements.shareMcpConnectionsCheckbox) {
                    elements.shareMcpConnectionsCheckbox.checked = options.includeMcpConnections || false;
                }
                
                // Set welcome message checkbox if it exists
                if (elements.shareWelcomeMessageCheckbox) {
                    elements.shareWelcomeMessageCheckbox.checked = options.includeWelcomeMessage || false;
                }
                
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
            
            // Update status indicators after loading options
            updateShareItemStatuses().catch(error => {
                console.warn('Error updating share item statuses:', error);
            });
        }
        
        /**
         * Update status indicators for each share item
         */
        async function updateShareItemStatuses() {
            // Update prompt library status
            updatePromptLibraryStatus();
            
            // Update function library status
            updateFunctionLibraryStatus();
            
            // Update MCP connections status (now async)
            await updateMcpConnectionsStatus();
            
            // Update conversation status
            updateConversationStatus();
        }
        
        /**
         * Update prompt library status display
         */
        function updatePromptLibraryStatus() {
            const checkbox = elements.sharePromptLibraryCheckbox;
            if (!checkbox) return;
            
            const label = checkbox.parentElement ? checkbox.parentElement.querySelector('label[for="share-prompt-library"]') : null;
            if (!label) return;
            
            // Remove ALL existing status indicators (fix for duplicates)
            const allExistingStatus = label.querySelectorAll('.share-item-status');
            allExistingStatus.forEach(status => status.remove());
            
            // Get prompt statistics
            let enabledUserPrompts = 0;
            let enabledDefaultPrompts = 0;
            
            // Get user-defined prompts
            if (window.PromptsService) {
                const selectedPrompts = window.PromptsService.getSelectedPrompts();
                enabledUserPrompts = selectedPrompts.length;
            }
            
            // Get default prompts
            if (window.DefaultPromptsService) {
                const selectedDefaultPrompts = window.DefaultPromptsService.getSelectedDefaultPrompts();
                enabledDefaultPrompts = selectedDefaultPrompts.length;
            }
            
            // Only show status if there are enabled prompts
            const totalEnabled = enabledUserPrompts + enabledDefaultPrompts;
            
            if (totalEnabled > 0) {
                const statusSpan = document.createElement('span');
                statusSpan.className = 'share-item-status';
                statusSpan.style.marginLeft = '10px';
                statusSpan.style.color = 'var(--text-color-secondary)';
                statusSpan.style.fontSize = '0.85em';
                statusSpan.style.fontWeight = 'normal';
                
                const parts = [];
                if (enabledUserPrompts > 0) {
                    parts.push(`${enabledUserPrompts} user`);
                }
                if (enabledDefaultPrompts > 0) {
                    parts.push(`${enabledDefaultPrompts} default`);
                }
                
                const promptText = totalEnabled !== 1 ? 'prompts' : 'prompt';
                const actionText = checkbox.checked ? 'will be shared' : 'available';
                statusSpan.textContent = `(${parts.join(', ')} ${promptText} ${actionText})`;
                label.appendChild(statusSpan);
            }
        }
        
        /**
         * Update function library status display
         */
        function updateFunctionLibraryStatus() {
            const checkbox = elements.shareFunctionLibraryCheckbox;
            if (!checkbox) return;
            
            const label = checkbox.parentElement ? checkbox.parentElement.querySelector('label[for="share-function-library"]') : null;
            if (!label) return;
            
            // Remove ALL existing status indicators (fix for duplicates)
            const allExistingStatus = label.querySelectorAll('.share-item-status');
            allExistingStatus.forEach(status => status.remove());
            
            // Get function statistics
            let enabledUserFunctions = 0;
            let enabledDefaultFunctions = 0;
            
            // Get user-defined functions
            if (window.FunctionToolsService) {
                const jsFunctions = window.FunctionToolsService.getJsFunctions();
                const enabledFunctions = window.FunctionToolsService.getEnabledFunctionNames();
                
                // Filter out default functions from the counts
                const defaultFunctionNames = [];
                if (window.DefaultFunctionsService) {
                    const collections = window.DefaultFunctionsService.getDefaultFunctionCollections();
                    collections.forEach(collection => {
                        collection.functions.forEach(func => {
                            defaultFunctionNames.push(func.name);
                        });
                    });
                }
                
                // Count user functions (excluding default functions)
                for (const funcName in jsFunctions) {
                    if (!defaultFunctionNames.includes(funcName) && enabledFunctions.includes(funcName)) {
                        enabledUserFunctions++;
                    }
                }
            }
            
            // Get default functions
            if (window.DefaultFunctionsService) {
                const collections = window.DefaultFunctionsService.getDefaultFunctionCollections();
                collections.forEach(collection => {
                    collection.functions.forEach(func => {
                        const functionId = `${collection.id}:${func.name}`;
                        if (window.DefaultFunctionsService.isIndividualFunctionSelected(functionId)) {
                            enabledDefaultFunctions++;
                        }
                    });
                });
            }
            
            // Only show status if there are enabled functions
            const totalEnabled = enabledUserFunctions + enabledDefaultFunctions;
            
            if (totalEnabled > 0) {
                const statusSpan = document.createElement('span');
                statusSpan.className = 'share-item-status';
                statusSpan.style.marginLeft = '10px';
                statusSpan.style.color = 'var(--text-color-secondary)';
                statusSpan.style.fontSize = '0.85em';
                statusSpan.style.fontWeight = 'normal';
                
                const parts = [];
                if (enabledUserFunctions > 0) {
                    parts.push(`${enabledUserFunctions} user`);
                }
                if (enabledDefaultFunctions > 0) {
                    parts.push(`${enabledDefaultFunctions} default`);
                }
                
                const functionText = totalEnabled !== 1 ? 'functions' : 'function';
                const actionText = checkbox.checked ? 'will be shared' : 'available';
                statusSpan.textContent = `(${parts.join(', ')} ${functionText} ${actionText})`;
                label.appendChild(statusSpan);
            }
        }
        
        /**
         * Update MCP connections status display
         */
        let statusUpdateTimeout = null;
        async function updateMcpConnectionsStatus() {
            // Debounce to prevent duplicate calls
            if (statusUpdateTimeout) {
                clearTimeout(statusUpdateTimeout);
            }
            
            statusUpdateTimeout = setTimeout(async () => {
                // Always get fresh reference to checkbox (nuclear fix replaces the element)
                const checkbox = document.getElementById('share-mcp-connections');
                if (!checkbox) return;
                
                const label = checkbox.parentElement ? checkbox.parentElement.querySelector('label[for="share-mcp-connections"]') : null;
                if (!label) return;
            
            // Remove ALL existing status indicators (fix for duplicates)
            const allExistingStatus = label.querySelectorAll('.share-item-status');
            console.log(`🧹 updateMcpConnectionsStatus: Found ${allExistingStatus.length} existing status indicators to remove`);
            allExistingStatus.forEach(status => status.remove());
            
            // Check for MCP connections using CoreStorageService
            try {
                if (window.CoreStorageService) {
                    const connections = [];
                    
                    // Check for GitHub token
                    const githubToken = await window.CoreStorageService.getValue('mcp_github_token');
                    if (githubToken) {
                        connections.push('GitHub');
                    }
                    
                    // Check for Gmail OAuth
                    const gmailAuth = await window.CoreStorageService.getValue('mcp_gmail_oauth');
                    if (gmailAuth) {
                        connections.push('Gmail');
                    }
                    
                    if (connections.length > 0) {
                        console.log(`🎯 updateMcpConnectionsStatus: Creating new status indicator, checkbox.checked = ${checkbox.checked}`);
                        const statusSpan = document.createElement('span');
                        statusSpan.className = 'share-item-status';
                        statusSpan.style.marginLeft = '10px';
                        statusSpan.style.color = 'var(--text-color-secondary)';
                        statusSpan.style.fontSize = '0.85em';
                        statusSpan.style.fontWeight = 'normal';
                        
                        const actionText = checkbox.checked ? 'will be shared' : 'available';
                        const connectionsText = connections.join(', ');
                        statusSpan.textContent = `(${connectionsText} ${actionText})`;
                        console.log(`🎯 updateMcpConnectionsStatus: Status text set to '${statusSpan.textContent}'`);
                        label.appendChild(statusSpan);
                    }
                } else {
                    // Fallback to direct localStorage check for testing
                    const connections = [];
                    
                    const githubToken = localStorage.getItem('mcp_github_token');
                    if (githubToken) {
                        connections.push('GitHub');
                    }
                    
                    const gmailAuth = localStorage.getItem('mcp_gmail_oauth');
                    if (gmailAuth) {
                        connections.push('Gmail');
                    }
                    
                    if (connections.length > 0) {
                        const statusSpan = document.createElement('span');
                        statusSpan.className = 'share-item-status';
                        statusSpan.style.marginLeft = '10px';
                        statusSpan.style.color = 'var(--text-color-secondary)';
                        statusSpan.style.fontSize = '0.85em';
                        statusSpan.style.fontWeight = 'normal';
                        
                        const actionText = checkbox.checked ? 'will be shared' : 'available';
                        const connectionsText = connections.join(', ');
                        statusSpan.textContent = `(${connectionsText} ${actionText})`;
                        label.appendChild(statusSpan);
                    }
                }
            } catch (error) {
                // Ignore errors - status will just not show
                console.warn('Error updating MCP connections status:', error);
            }
            }, 50); // 50ms debounce delay
        }
        
        /**
         * Update conversation status display
         */
        function updateConversationStatus() {
            const checkbox = elements.shareConversationCheckbox;
            if (!checkbox) return;
            
            const label = checkbox.parentElement ? checkbox.parentElement.querySelector('label[for="share-conversation"]') : null;
            if (!label) return;
            
            // Remove ALL existing status indicators (fix for duplicates)
            const allExistingStatus = label.querySelectorAll('.share-item-status');
            allExistingStatus.forEach(status => status.remove());
            
            // Get message count from the chat container
            const messageCount = document.querySelectorAll('#chat-container .message').length;
            
            if (messageCount > 0) {
                const statusSpan = document.createElement('span');
                statusSpan.className = 'share-item-status';
                statusSpan.style.marginLeft = '10px';
                statusSpan.style.color = 'var(--text-color-secondary)';
                statusSpan.style.fontSize = '0.85em';
                statusSpan.style.fontWeight = 'normal';
                
                const messageText = messageCount !== 1 ? 'messages' : 'message';
                const actionText = checkbox.checked ? 'will be shared' : 'available';
                statusSpan.textContent = `(${messageCount} ${messageText} ${actionText})`;
                label.appendChild(statusSpan);
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
        async function generateComprehensiveShareLink(apiKey, systemPrompt, currentModel, messages, generateShareQRCode, addSystemMessage) {
            console.log('ShareManager: generateComprehensiveShareLink called');
            
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
            
            // Get welcome message from input if it exists
            let welcomeMessage = null;
            
            // Check if welcome message input exists and has a value
            if (elements.shareWelcomeMessageInput && elements.shareWelcomeMessageInput.value.trim()) {
                welcomeMessage = elements.shareWelcomeMessageInput.value.trim();
            } else {
                // Only use default message if welcome message checkbox is checked but no custom message provided
                if (elements.shareWelcomeMessageCheckbox && elements.shareWelcomeMessageCheckbox.checked) {
                    welcomeMessage = 'Welcome to <span class="terminal-font">hacka.re</span>! Start a conversation with AI models.';
                }
            }
            
            // Debug: Check all checkbox states
            console.log('🎛️ SHAREMANAGER: CHECKBOX STATE COLLECTION 🎛️');
            console.log('═══════════════════════════════════════════════════');
            
            console.log('📋 Base URL checkbox:', !!elements.shareBaseUrlCheckbox, '- checked:', elements.shareBaseUrlCheckbox ? elements.shareBaseUrlCheckbox.checked : 'N/A');
            console.log('🔑 API Key checkbox:', !!elements.shareApiKeyCheckbox, '- checked:', elements.shareApiKeyCheckbox ? elements.shareApiKeyCheckbox.checked : 'N/A');
            console.log('🤖 Model checkbox:', !!elements.shareModelCheckbox, '- checked:', elements.shareModelCheckbox ? elements.shareModelCheckbox.checked : 'N/A');
            console.log('💬 Conversation checkbox:', !!elements.shareConversationCheckbox, '- checked:', elements.shareConversationCheckbox ? elements.shareConversationCheckbox.checked : 'N/A');
            console.log('📚 Prompt Library checkbox:', !!elements.sharePromptLibraryCheckbox, '- checked:', elements.sharePromptLibraryCheckbox ? elements.sharePromptLibraryCheckbox.checked : 'N/A');
            console.log('⚙️ Function Library checkbox:', !!elements.shareFunctionLibraryCheckbox, '- checked:', elements.shareFunctionLibraryCheckbox ? elements.shareFunctionLibraryCheckbox.checked : 'N/A');
            console.log('🔌 MCP Connections checkbox (elements):', !!elements.shareMcpConnectionsCheckbox, '- checked:', elements.shareMcpConnectionsCheckbox ? elements.shareMcpConnectionsCheckbox.checked : 'N/A');
            
            // ALWAYS try fresh DOM query for MCP checkbox as fallback
            const mcpCheckboxFallback = document.getElementById('share-mcp-connections');
            console.log('🔌 MCP Connections checkbox (FRESH QUERY):', !!mcpCheckboxFallback, '- checked:', mcpCheckboxFallback ? mcpCheckboxFallback.checked : 'N/A');
            
            // Compare the two references
            if (elements.shareMcpConnectionsCheckbox && mcpCheckboxFallback) {
                console.log('🔌 MCP checkbox elements are same object:', elements.shareMcpConnectionsCheckbox === mcpCheckboxFallback);
                if (elements.shareMcpConnectionsCheckbox !== mcpCheckboxFallback) {
                    console.log('🚨 WARNING: Different MCP checkbox elements detected!');
                    console.log('🚨 elements.shareMcpConnectionsCheckbox:', elements.shareMcpConnectionsCheckbox);
                    console.log('🚨 Fresh query result:', mcpCheckboxFallback);
                }
            }
            
            console.log('═══════════════════════════════════════════════════');
            
            // Get the most reliable MCP checkbox state
            let mcpConnectionsChecked = false;
            if (mcpCheckboxFallback) {
                mcpConnectionsChecked = mcpCheckboxFallback.checked;
                console.log('🎯 Using FRESH QUERY for MCP checkbox state:', mcpConnectionsChecked);
            } else if (elements.shareMcpConnectionsCheckbox) {
                mcpConnectionsChecked = elements.shareMcpConnectionsCheckbox.checked;
                console.log('🎯 Using ELEMENTS for MCP checkbox state:', mcpConnectionsChecked);
            } else {
                console.log('🎯 NO MCP checkbox found - defaulting to false');
            }
            
            // Collect MCP connections if needed
            let mcpConnections = null;
            if (mcpConnectionsChecked) {
                console.log('🔌 ShareManager: Collecting MCP connections...');
                try {
                    // Use the share item collector which handles this properly
                    if (window.collectMcpConnectionsData) {
                        console.log('🔌 ShareManager: window.collectMcpConnectionsData is available, calling it...');
                        const collectedData = await window.collectMcpConnectionsData();
                        console.log('🔌 ShareManager: collectMcpConnectionsData returned:', collectedData);
                        if (collectedData) {
                            mcpConnections = collectedData;
                            console.log('🔌 ShareManager: Collected MCP connections:', Object.keys(collectedData));
                        } else {
                            console.log('🔌 ShareManager: collectMcpConnectionsData returned null/empty');
                        }
                    } else {
                        console.warn('🔌 ShareManager: window.collectMcpConnectionsData is NOT available, using fallback');
                        // Fallback: Try to get GitHub token directly
                        const githubToken = await window.CoreStorageService.getValue('mcp_github_token');
                        if (githubToken) {
                            mcpConnections = { github: githubToken };
                            console.log('🔌 ShareManager: Found GitHub token via fallback');
                        }
                    }
                } catch (error) {
                    console.warn('🔌 ShareManager: Error collecting MCP connections:', error);
                }
            }
            
            // Build options for the new unified API
            const options = {
                password: password,
                baseUrl: baseUrl,
                apiKey: apiKey,
                systemPrompt: systemPrompt,
                model: currentModel,
                messages: messages,
                messageCount: parseInt(elements.messageHistoryCount.value, 10) || 1,
                welcomeMessage: welcomeMessage,
                mcpConnections: mcpConnections, // Pass the collected connections
                includeBaseUrl: elements.shareBaseUrlCheckbox ? elements.shareBaseUrlCheckbox.checked : false,
                includeApiKey: elements.shareApiKeyCheckbox ? elements.shareApiKeyCheckbox.checked : false,
                includeSystemPrompt: false, // System prompt is now handled by prompt library
                includeModel: elements.shareModelCheckbox ? elements.shareModelCheckbox.checked : false,
                includeConversation: elements.shareConversationCheckbox ? elements.shareConversationCheckbox.checked : false,
                includeWelcomeMessage: (elements.shareWelcomeMessageCheckbox ? elements.shareWelcomeMessageCheckbox.checked : false) && welcomeMessage,
                includePromptLibrary: elements.sharePromptLibraryCheckbox ? elements.sharePromptLibraryCheckbox.checked : false,
                includeFunctionLibrary: elements.shareFunctionLibraryCheckbox ? elements.shareFunctionLibraryCheckbox.checked : false,
                includeMcpConnections: mcpConnectionsChecked
            };
            
            console.log('🎯 ShareManager: Final options object:', JSON.stringify(options, null, 2));
            
            // Validate options - at least one item should be selected
            const hasSelection = options.includeBaseUrl || options.includeApiKey || options.includeSystemPrompt || 
                               options.includeModel || options.includeConversation || options.includePromptLibrary || 
                               options.includeFunctionLibrary || options.includeMcpConnections || options.includeWelcomeMessage;
            
            if (!hasSelection) {
                if (addSystemMessage) {
                    addSystemMessage('Error: Please select at least one item to share.');
                }
                return false;
            }
            
            try {
                // Use the new unified createShareLink function
                const shareableLink = await ShareService.createShareLink(options);
                
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
                    
                    // Scroll to the bottom of the modal to show the generated link and QR code
                    // Find the modal content container
                    const modalContent = elements.generatedLinkContainer.closest('.modal-content');
                    if (modalContent) {
                        // Small delay to ensure QR code is rendered
                        setTimeout(() => {
                            modalContent.scrollTo({
                                top: modalContent.scrollHeight,
                                behavior: 'smooth'
                            });
                        }, 100);
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
            // For shared links, try to get session key from sessionStorage first
            const storageKey = getSessionKeyStorageKey();
            if (storageKey) {
                const storedKey = sessionStorage.getItem(storageKey);
                if (storedKey) {
                    sessionKey = storedKey; // Sync local variable
                    return storedKey;
                }
            }
            return sessionKey;
        }
        
        /**
         * Set the session key
         * @param {string} key - Session key
         */
        function setSessionKey(key) {
            // For shared links, check if a session key already exists in sessionStorage
            const storageKey = getSessionKeyStorageKey();
            if (storageKey && key) {
                const existingKey = sessionStorage.getItem(storageKey);
                if (existingKey && existingKey !== key) {
                    // Another tab already set a different session key - use the existing one for consistency
                    console.log(`[ShareManager] Session key already exists in sessionStorage - using existing key for cross-tab consistency`);
                    sessionKey = existingKey;
                    return;
                }
                
                // Either no existing key or same key - safe to set
                sessionStorage.setItem(storageKey, key);
                console.log(`[ShareManager] Stored session key in sessionStorage for cross-tab access: ${storageKey}`);
            }
            
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
        
        /**
         * Get the shared welcome message
         * @returns {string|null} Shared welcome message
         */
        function getSharedWelcomeMessage() {
            return sharedWelcomeMessage;
        }
        
        /**
         * Set the shared welcome message
         * @param {string} message - Welcome message from shared link
         */
        function setSharedWelcomeMessage(message) {
            sharedWelcomeMessage = message;
        }
        
        /**
         * Get the shared link options (what was included in the link that brought us here)
         * @returns {Object|null} Shared link options
         */
        function getSharedLinkOptions() {
            return sharedLinkOptions;
        }
        
        /**
         * Set the shared link options (what was included in the link that brought us here)
         * @param {Object} options - Options from the shared link
         */
        function setSharedLinkOptions(options) {
            sharedLinkOptions = options;
        }
        
        // Public API
        return {
            init,
            regeneratePassword,
            copyPassword,
            generateComprehensiveShareLink,
            copyGeneratedLink,
            getSessionKey,
            setSessionKey,
            isSessionKeyLocked,
            getSharedWelcomeMessage,
            setSharedWelcomeMessage,
            getSharedLinkOptions,
            setSharedLinkOptions,
            saveShareOptions,
            loadShareOptions,
            updateShareItemStatuses
        };
    }

    // Public API
    return {
        createShareManager: createShareManager
    };
})();
