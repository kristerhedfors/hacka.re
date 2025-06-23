/**
 * Main JavaScript for AIHackare
 * A simple chat interface for OpenAI-compatible APIs
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the debug service
    if (window.DebugService) {
        DebugService.init();
        DebugService.log('Debug service initialized');
    }
    
    // Initialize the chat application
    const aiHackare = new AIHackareComponent.AIHackare();
    aiHackare.init();
    
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
                                        
                                        // Show confirmation dialog
                                        if (confirm(`Are you sure you want to delete this GPT (${title})? This will clear all data related to this specific GPT including its chat history and settings.`)) {
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
        // Show full path as clickable link for all other locations (file://, localhost, etc.)
        siteIdentifierElement.innerHTML = `<a href="${currentUrl}" target="_blank">${currentUrl}</a>`;
    }
}
