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
 */
window.updateTitleAndSubtitle = function() {
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
                    
                    // If using default title/subtitle, add the "serverless GPTs" text
                    if (isTitleDefault && isSubtitleDefault) {
                        const serverlessSpan = document.createElement('span');
                        serverlessSpan.className = 'serverless-gpts';
                        serverlessSpan.innerHTML = ' serverless <span class="gpts">GPTs</span>';
                        element.appendChild(serverlessSpan);
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
