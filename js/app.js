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
 */
function updateTitleAndSubtitle() {
    const title = StorageService.getTitle();
    const subtitle = StorageService.getSubtitle();
    
    // Update main page
    const logoTextElements = document.querySelectorAll('.logo-text');
    const taglineElements = document.querySelectorAll('.tagline');
    
    logoTextElements.forEach(element => {
        // Preserve the heart logo and typing dots
        const heartLogo = element.querySelector('.heart-logo');
        if (heartLogo) {
            element.innerHTML = title + '<span class="heart-logo">' + heartLogo.innerHTML + '</span>';
        } else {
            element.textContent = title;
        }
    });
    
    taglineElements.forEach(element => {
        element.textContent = subtitle;
    });
    
    // Update document title
    document.title = title + ' - ' + subtitle;
}
