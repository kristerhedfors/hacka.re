/**
 * Display script for hacka.re About Page
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize title and subtitle from localStorage if available
    if (window.parent && window.parent.StorageService) {
        // Use parent window's StorageService
        updateTitleAndSubtitle(window.parent.StorageService);
    } else if (window.StorageService) {
        // Use this window's StorageService
        updateTitleAndSubtitle(window.StorageService);
    } else {
        // Try to load StorageService from main page
        const script = document.createElement('script');
        script.src = '../js/services/storage-service.js';
        script.onload = function() {
            if (window.StorageService) {
                updateTitleAndSubtitle(window.StorageService);
            }
        };
        document.head.appendChild(script);
    }
    
    console.log('hacka.re about page loaded');
});

/**
 * Update the title and subtitle on about pages
 * @param {Object} storageService - The StorageService to use
 */
function updateTitleAndSubtitle(storageService) {
    if (!storageService) return;
    
    const title = storageService.getTitle();
    const subtitle = storageService.getSubtitle();
    
    // Update about page
    const logoTextElements = document.querySelectorAll('.logo h1');
    const taglineElements = document.querySelectorAll('.tagline');
    
    logoTextElements.forEach(element => {
        // Check if there's an anchor tag
        const anchor = element.querySelector('a');
        if (anchor) {
            anchor.textContent = title;
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
