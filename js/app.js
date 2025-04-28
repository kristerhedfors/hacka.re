/**
 * Main JavaScript for AIHackare
 * A simple chat interface for OpenAI-compatible APIs
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the chat application
    const aiHackare = new AIHackareComponent.AIHackare();
    aiHackare.init();
    
    // Initialize title and subtitle from localStorage if available
    if (window.StorageService) {
        // Update title and subtitle on page load
        updateTitleAndSubtitle();
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
    const defaultSubtitle = "För hackare av hackare";
    
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
                    
                    // Create a text node for the title
                    const titleNode = document.createTextNode(title);
                    element.appendChild(titleNode);
                    
                    // Add the heart logo back
                    element.appendChild(tempHeartLogo);
                    
                            // Remove any existing serverless-gpts span
                            const existingServerlessSpan = element.querySelector('.serverless-gpts');
                            if (existingServerlessSpan) {
                                element.removeChild(existingServerlessSpan);
                            }
                            
                            // If using default title/subtitle, add the "serverless GPTs" text
                            if (isTitleDefault && isSubtitleDefault) {
                                const serverlessSpan = document.createElement('span');
                                serverlessSpan.className = 'serverless-gpts';
                                serverlessSpan.innerHTML = ' serverless <span class="gpts">GPTs</span>';
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
                                    const closeBtn = document.createElement('span');
                                    closeBtn.className = 'close-gpt';
                                    closeBtn.textContent = 'Close';
                                    closeBtn.title = 'Clear GPT name and return to default';
                                    closeBtn.addEventListener('click', function(e) {
                                        e.stopPropagation(); // Prevent event bubbling
                                        
                                        // Reset title and subtitle to defaults
                                        StorageService.saveTitle(defaultTitle);
                                        StorageService.saveSubtitle(defaultSubtitle);
                                        
                                        // Update UI
                                        updateTitleAndSubtitle();
                                        
                                        // Show a message
                                        const chatManager = window.aiHackare ? window.aiHackare.chatManager : null;
                                        if (chatManager && chatManager.addSystemMessage) {
                                            chatManager.addSystemMessage('GPT name cleared. Returned to default namespace.');
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
