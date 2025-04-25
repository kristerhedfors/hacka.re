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
    const defaultSubtitle = "För hackare, av hackare";
    
    // Check if title and subtitle are unchanged (blank or default)
    const isTitleDefault = !title || title === defaultTitle;
    const isSubtitleDefault = !subtitle || subtitle === defaultSubtitle;
    
    // Update main page
    const logoTextElements = document.querySelectorAll('.logo-text');
    const taglineElements = document.querySelectorAll('.tagline');
    
    logoTextElements.forEach(element => {
        // Preserve the heart logo and typing dots
        const heartLogo = element.querySelector('.heart-logo');
        if (heartLogo) {
            if (isTitleDefault && isSubtitleDefault) {
                // Add "serverless GPTs" after the heart with a darker color
                element.innerHTML = title + '<span class="heart-logo">' + heartLogo.innerHTML + '</span><span class="serverless-gpts"> serverless <span class="gpts">GPTs</span></span>';
            } else {
                element.innerHTML = title + '<span class="heart-logo">' + heartLogo.innerHTML + '</span>';
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
