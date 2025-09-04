/**
 * Main JavaScript for AIHackare
 * A simple chat interface for OpenAI-compatible APIs
 */

/**
 * Handle early shared link password collection
 * This runs BEFORE any initialization to ensure password is available for namespace creation
 */
async function handleEarlySharedLinkPassword() {
    // If the flag is set, we definitely need to show the password modal
    if (!window._waitingForSharedLinkPassword) {
        return; // No shared link waiting for password
    }
    
    console.log('[App] Shared link detected - requesting password before initialization');
    
    // Use the encrypted data stored by the critical early script
    const encryptedData = window._sharedLinkEncryptedData;
    
    // NOTE: We no longer check for stored passwords in sessionStorage for security reasons.
    // Passwords should never be persisted. After a page refresh, users will need to re-enter
    // the password to access shared link content. The derived master key allows existing
    // decrypted data to continue working after refresh.
    
    // We need to prompt for password
    console.log('[App] Creating password modal...');
    return new Promise((resolve) => {
        // Create a simple password modal
        const modal = document.createElement('div');
        modal.className = 'modal password-modal show';
        modal.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background-color: rgba(0, 0, 0, 0.8) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            z-index: 9999 !important;
        `;
        modal.innerHTML = `
            <div class="modal-content" style="
                background: white;
                padding: 2rem;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                max-width: 400px;
                width: 90%;
                text-align: center;
            ">
                <h2>Shared Link Password Required</h2>
                <p>Enter the password to decrypt this shared configuration:</p>
                <input type="password" id="early-password-input" class="password-input" placeholder="Enter password" autofocus>
                <div class="modal-buttons">
                    <button id="early-password-submit" class="primary-button">Decrypt</button>
                </div>
                <div id="early-password-error" class="error-message" style="display: none;"></div>
            </div>
        `;
        document.body.appendChild(modal);
        console.log('[App] Password modal added to DOM');
        
        const passwordInput = document.getElementById('early-password-input');
        const submitButton = document.getElementById('early-password-submit');
        const errorDiv = document.getElementById('early-password-error');
        
        const handleSubmit = async () => {
            const password = passwordInput.value.trim();
            if (!password) {
                errorDiv.textContent = 'Please enter a password';
                errorDiv.style.display = 'block';
                return;
            }
            
            // Try to decrypt with this password
            try {
                const sharedData = await window.LinkSharingService.extractSharedApiKey(password);
                if (sharedData) {
                    // Success! Password is verified but NOT stored for security reasons.
                    // Store password temporarily in memory for ShareManager to use
                    // This will be picked up when ShareManager initializes
                    window._tempSharedLinkPassword = password;
                    
                    // Clear the waiting flag to allow namespace creation
                    window._waitingForSharedLinkPassword = false;
                    
                    // Mark password verification as complete (required for welcome message display)
                    window._passwordVerificationComplete = true;
                    
                    // Set flag to prevent namespace delayed reload during shared link processing
                    window._sharedLinkProcessed = true;
                    
                    // DON'T reinitialize namespace here - it needs to wait for ShareManager
                    // The namespace will be properly initialized when ShareManager picks up the password
                    console.log('[App] Password verified and stored temporarily - waiting for ShareManager initialization');
                    
                    // Note: Deferred welcome message will be displayed after chat history loads
                    // to prevent it being overwritten by chat container clearing
                    console.log('[App] Password verification complete - welcome message will display after chat loads');
                    
                    // Remove modal and continue
                    modal.remove();
                    
                    // Ensure chat input is visible on mobile after modal removal
                    const chatInputContainer = document.getElementById('chat-input-container');
                    if (chatInputContainer) {
                        chatInputContainer.style.display = '';
                        chatInputContainer.style.visibility = 'visible';
                        chatInputContainer.style.zIndex = '';
                        console.log('[App] Ensured chat input visibility after password modal removal');
                    }
                    
                    // Fix mobile viewport after modal removal
                    if (window.innerWidth <= 768) {
                        // Reset body styles properly for mobile
                        document.body.style.overflow = '';
                        document.body.style.position = '';
                        document.body.style.height = '';
                        document.body.style.width = '';
                        
                        // Ensure the chat container is scrollable
                        const chatContainer = document.getElementById('chat-container');
                        if (chatContainer) {
                            chatContainer.style.overflow = 'hidden';
                            chatContainer.style.display = 'flex';
                            chatContainer.style.flexDirection = 'column';
                            chatContainer.style.height = '100%';
                        }
                        
                        // Ensure chat messages is scrollable
                        const chatMessages = document.getElementById('chat-messages');
                        if (chatMessages) {
                            chatMessages.style.overflow = 'auto';
                            chatMessages.style.overflowY = 'auto';
                            chatMessages.style.flex = '1';
                            chatMessages.style.minHeight = '0';
                        }
                        
                        // Ensure main element is properly configured
                        const mainElement = document.querySelector('main');
                        if (mainElement) {
                            mainElement.style.overflow = 'hidden';
                            mainElement.style.flex = '1';
                            mainElement.style.minHeight = '0';
                            mainElement.style.display = 'flex';
                            mainElement.style.flexDirection = 'column';
                        }
                        
                        // Force a reflow to ensure proper rendering
                        document.body.offsetHeight;
                        
                        // Don't auto-focus on mobile to prevent keyboard issues
                        setTimeout(() => {
                            const messageInput = document.getElementById('message-input');
                            if (messageInput) {
                                messageInput.blur(); // Ensure keyboard is closed
                            }
                            
                            // Double-check chat input visibility
                            const chatInputContainer = document.getElementById('chat-input-container');
                            if (chatInputContainer) {
                                chatInputContainer.style.display = '';
                                chatInputContainer.style.visibility = 'visible';
                                chatInputContainer.style.opacity = '1';
                            }
                        }, 200);
                    }
                    
                    resolve();
                } else {
                    errorDiv.textContent = 'Invalid password';
                    errorDiv.style.display = 'block';
                    passwordInput.select();
                }
            } catch (error) {
                errorDiv.textContent = 'Decryption failed: ' + error.message;
                errorDiv.style.display = 'block';
                passwordInput.select();
            }
        };
        
        submitButton.addEventListener('click', handleSubmit);
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSubmit();
            }
        });
        
        // Focus the input
        passwordInput.focus();
    });
}

document.addEventListener('DOMContentLoaded', async function() {
    // Clean up any leftover password modals first (in case of reload)
    const existingModals = document.querySelectorAll('.password-modal, #password-modal, .modal.show');
    existingModals.forEach(modal => {
        console.log('[App] Removing leftover password modal');
        modal.remove();
    });
    
    // Reset body styles in case they were left in a bad state
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.height = '';
    document.body.style.width = '';
    
    // Ensure chat input is visible
    const chatInputContainer = document.getElementById('chat-input-container');
    if (chatInputContainer) {
        chatInputContainer.style.display = '';
        chatInputContainer.style.visibility = 'visible';
        chatInputContainer.style.zIndex = '';
        chatInputContainer.style.opacity = '1';
    }
    
    // Handle shared link password BEFORE any initialization
    await handleEarlySharedLinkPassword();
    // Initialize the debug service
    if (window.DebugService) {
        DebugService.init();
        DebugService.log('Debug service initialized');
    }
    
    // Initialize debug code tooltip
    if (window.DebugCodeTooltip) {
        DebugCodeTooltip.init();
    }
    
    // Initialize the chat application
    const aiHackare = new AIHackareComponent.AIHackare();
    await aiHackare.init();
    
    // Ensure chat input is visible after initialization
    setTimeout(() => {
        const chatInputContainer = document.getElementById('chat-input-container');
        if (chatInputContainer) {
            chatInputContainer.style.display = '';
            chatInputContainer.style.visibility = 'visible';
            chatInputContainer.style.opacity = '1';
            chatInputContainer.style.zIndex = '';
            
            // Also ensure the form and buttons are visible
            const chatForm = document.getElementById('chat-form');
            if (chatForm) {
                chatForm.style.display = '';
                chatForm.style.visibility = 'visible';
            }
        }
    }, 100);
    
    // Initialize SystemPromptCoordinator if available
    if (window.SystemPromptCoordinator) {
        window.SystemPromptCoordinator.init();
        DebugService.log('SystemPromptCoordinator initialized');
    }
    
    // Initialize MCP Manager if available
    if (window.MCPManager) {
        MCPManager.init();
        DebugService.log('MCP Manager initialized');
    }
    
    // Initialize Function Details Modal if available
    if (window.FunctionDetailsModal) {
        FunctionDetailsModal.init();
        DebugService.log('Function Details Modal initialized');
    }
    
    // Initialize Agent Loader if available
    if (window.AgentLoader) {
        DebugService.log('Agent Loader service is available');
        // Agent Loader initializes itself as a singleton
    }
    
    // Initialize Model Selection Manager after aiHackare is ready
    setTimeout(() => {
        if (window.ModelSelectionManager && window.aiHackare && window.aiHackare.elements) {
            window.ModelSelectionManager.init(window.aiHackare.elements);
            DebugService.log('Model Selection Manager initialized');
        } else {
            DebugService.log('Model Selection Manager initialization deferred - dependencies not ready');
        }
    }, 1000);
    
    // Initialize title and subtitle from localStorage if available
    if (window.StorageService) {
        // Update title and subtitle on page load
        updateTitleAndSubtitle();
    }
    
    // Initialize site identifier in footer
    updateSiteIdentifier();
    
    // Add event listener for message input to update context usage
    const messageInput = document.getElementById('message-input');
    if (messageInput) {
        // Debounce function to limit how often the token counter updates
        let debounceTimeout;
        const debounceDelay = 300; // 300ms delay
        
        // Function to update context usage
        const updateContextUsage = function() {
            // Get the current model
            const currentModel = aiHackare.settingsManager.getCurrentModel();
            
            // Create a temporary messages array with the current input
            const messages = aiHackare.chatManager.getMessages() || [];
            
            // Always create a fresh copy of the messages array
            const tempMessages = [...messages];
            
            // If the input is not empty, add it as a temporary user message
            if (this.value.trim()) {
                tempMessages.push({
                    role: 'user',
                    content: this.value
                });
            }
            
            // Estimate context usage with the temporary messages
            const systemPrompt = aiHackare.settingsManager.getSystemPrompt() || '';
            const usageInfo = UIUtils.estimateContextUsage(
                tempMessages, 
                ModelInfoService.modelInfo, 
                currentModel,
                systemPrompt
            );
            
            // Update the context usage display
            aiHackare.uiManager.updateContextUsage(
                usageInfo.percentage, 
                usageInfo.estimatedTokens, 
                usageInfo.contextSize
            );
        };
        
        // Add input event listener with debouncing
        messageInput.addEventListener('input', function() {
            // Clear any existing timeout
            clearTimeout(debounceTimeout);
            
            // Set a new timeout
            debounceTimeout = setTimeout(() => {
                updateContextUsage.call(this);
            }, debounceDelay);
            
            // For large pastes (over 100 chars), update immediately
            if (this.value.length > 100) {
                clearTimeout(debounceTimeout);
                updateContextUsage.call(this);
            }
        });
    }
});

/**
 * Update the title and subtitle on all index pages
 * This function is exposed globally so it can be called from other modules
 * @param {boolean} forceUpdate - Force update even if there's a shared link
 */
window.updateTitleAndSubtitle = function(forceUpdate = false) {
    // If there's a shared link in the URL and we're not forcing an update,
    // don't update the title and subtitle until the shared data is decrypted
    if (!forceUpdate && LinkSharingService.hasSharedApiKey()) {
        return;
    }
    
    const title = StorageService.getTitle();
    const subtitle = StorageService.getSubtitle();
    const defaultTitle = "hacka.re";
    const defaultSubtitle = "Free, open, för hackare av hackare";
    
    // Check if title and subtitle are unchanged (blank or default)
    const isTitleDefault = !title || title === defaultTitle;
    const isSubtitleDefault = !subtitle || subtitle === defaultSubtitle;
    
    // Update main page
    const logoTextElements = document.querySelectorAll('.logo-text');
    const taglineElements = document.querySelectorAll('.tagline');
    
    logoTextElements.forEach(element => {
        // Get the heart logo element
        const heartLogo = element.querySelector('.heart-logo');
        if (heartLogo) {
            // Clear the element's content except for the heart logo
            // This preserves the heart logo DOM element and all its event listeners
            while (element.firstChild) {
                if (element.firstChild !== heartLogo) {
                    element.removeChild(element.firstChild);
                } else {
                    // Move the heart logo to a temporary variable to preserve it
                    const tempHeartLogo = heartLogo;
                    element.removeChild(heartLogo);
                    
                    // Create a span for the title with appropriate font styling
                    const titleSpan = document.createElement('span');
                    titleSpan.textContent = title;
                    
                    // Apply Courier New font specifically when the title is "hacka.re"
                    if (title === "hacka.re") {
                        titleSpan.style.fontFamily = "'Courier New', monospace";
                    } else {
                        titleSpan.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
                    }
                    
                    element.appendChild(titleSpan);
                    
                    // Reset the main element's font family to ensure it doesn't affect other elements
                    element.style.fontFamily = "";
                    
                    // Add the heart logo back
                    element.appendChild(tempHeartLogo);
                    
                            // Remove any existing serverless-gpts span
                            const existingServerlessSpan = element.querySelector('.serverless-gpts');
                            if (existingServerlessSpan) {
                                element.removeChild(existingServerlessSpan);
                            }
                            
                            // If using default title/subtitle, add the "serverless agency" text
                            if (isTitleDefault && isSubtitleDefault) {
                                const serverlessSpan = document.createElement('span');
                                serverlessSpan.className = 'serverless-gpts';
                                serverlessSpan.innerHTML = ' serverless <span class="gpts">agency</span>';
                                element.appendChild(serverlessSpan);
                                
                                // Remove named-gpt-container wrapper if it exists
                                const parentElement = element.parentElement;
                                if (parentElement && parentElement.classList.contains('named-gpt-container')) {
                                    // Move the logo-text element out of the container
                                    const grandParent = parentElement.parentElement;
                                    grandParent.insertBefore(element, parentElement);
                                    grandParent.removeChild(parentElement);
                                }
                            } else {
                                // Check if we need to create a named-gpt-container
                                let container = element.parentElement;
                                if (!container || !container.classList.contains('named-gpt-container')) {
                                    // Create container
                                    container = document.createElement('div');
                                    container.className = 'named-gpt-container';
                                    
                                    
                                    // Get the parent element (logo)
                                    const parentElement = element.parentElement;
                                    
                                    // Replace the element with the container
                                    parentElement.insertBefore(container, element);
                                    container.appendChild(element);
                                    
                                    // Find the tagline element (subtitle)
                                    const tagline = parentElement.querySelector('.tagline');
                                    if (tagline) {
                                        // Move the tagline into the container
                                        container.appendChild(tagline);
                                    }
                                }
                                
                                // Add close button if it doesn't exist
                                if (!container.querySelector('.close-gpt')) {
                                    const closeBtn = document.createElement('button');
                                    closeBtn.className = 'close-gpt';
                                    closeBtn.innerHTML = '<i class="fas fa-trash"></i>';
                                    closeBtn.title = 'Delete this GPT and all its data';
                                    closeBtn.addEventListener('click', function(e) {
                                        e.stopPropagation(); // Prevent event bubbling
                                        e.preventDefault(); // Prevent default behavior
                                        
                                        // Use native confirm for better cross-browser compatibility
                                        const confirmMessage = 'Are you sure you want to delete this GPT (' + title + ')? This will clear all data related to this specific GPT including its chat history and settings.';
                                        if (window.confirm(confirmMessage)) {
                                            // Get the current namespace ID before resetting
                                            const currentNamespaceId = NamespaceService.getNamespaceId();
                                            
                                            // Clear chat history for this namespace
                                            StorageService.clearChatHistory();
                                            
                                            // Delete all localStorage items for this namespace
                                            for (let i = localStorage.length - 1; i >= 0; i--) {
                                                const key = localStorage.key(i);
                                                if (key && key.includes(currentNamespaceId)) {
                                                    localStorage.removeItem(key);
                                                }
                                            }
                                            
                                            // Reset title and subtitle to defaults
                                            StorageService.saveTitle(defaultTitle);
                                            StorageService.saveSubtitle(defaultSubtitle);
                                            
                                            // Reset namespace cache
                                            NamespaceService.resetNamespaceCache();
                                            
                                            // Update UI
                                            updateTitleAndSubtitle();
                                            
                                            // Clear the chat UI
                                            const chatManager = window.aiHackare ? window.aiHackare.chatManager : null;
                                            if (chatManager) {
                                                if (chatManager.clearChat) {
                                                    chatManager.clearChat();
                                                }
                                                if (chatManager.addSystemMessage) {
                                                    chatManager.addSystemMessage(`GPT "${title}" has been deleted. All related data has been cleared.`);
                                                }
                                            }
                                        }
                                    });
                                    container.appendChild(closeBtn);
                                }
                            }
                    
                    break;
                }
            }
        } else {
            element.textContent = title;
        }
    });
    
    taglineElements.forEach(element => {
        element.textContent = subtitle;
    });
    
    // Update document title
    document.title = title + ' - ' + subtitle;
    
    console.log(`Title and subtitle updated to: ${title} - ${subtitle}`);
}

/**
 * Update the site identifier in the footer based on current URL
 * Shows "hacka.re" only when at https://hacka.re, otherwise shows full path
 * Truncates encrypted payloads in hash fragments for better readability
 */
window.updateSiteIdentifier = function() {
    const siteIdentifierElement = document.getElementById('site-identifier');
    if (!siteIdentifierElement) {
        return;
    }
    
    const currentUrl = window.location.href;
    
    if (currentUrl === 'https://hacka.re/' || currentUrl === 'https://hacka.re') {
        // Show as link when at the actual hacka.re site
        siteIdentifierElement.innerHTML = '<a href="https://hacka.re" target="_blank">hacka.re</a>';
    } else {
        // Check if URL contains a hash fragment (likely encrypted payload)
        const hashIndex = currentUrl.indexOf('#');
        let displayUrl = currentUrl;
        
        if (hashIndex !== -1) {
            const baseUrl = currentUrl.substring(0, hashIndex + 1); // Include the #
            const payload = currentUrl.substring(hashIndex + 1);
            
            // If payload is longer than 12 characters, truncate it
            if (payload.length > 12) {
                displayUrl = baseUrl + payload.substring(0, 8) + '[...]';
            }
        }
        
        // Show truncated path as clickable link, but preserve full URL in href
        siteIdentifierElement.innerHTML = `<a href="${currentUrl}" target="_blank">${displayUrl}</a>`;
    }
}
