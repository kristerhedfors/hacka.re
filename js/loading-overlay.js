/**
 * Loading Overlay Module
 * Handles the loading overlay for the AIHackare application
 */

window.LoadingOverlay = (function() {
    // Get the loading overlay element
    const loadingOverlay = document.querySelector('.loading-overlay');
    
    /**
     * Initialize the loading overlay
     */
    function init() {
        // Show the loading overlay
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
            
            // Remove the loading logo text
            const loadingLogo = loadingOverlay.querySelector('.loading-logo');
            if (loadingLogo) {
                loadingLogo.style.display = 'none';
            }
        }
        
        // Listen for the DOMContentLoaded event
        document.addEventListener('DOMContentLoaded', function() {
            // Wait for all resources to load
            window.addEventListener('load', function() {
                // Add a small delay to ensure all components are initialized
                setTimeout(hideLoadingOverlay, 500);
            });
        });
        
        // Add a fallback to hide the overlay after a maximum time (5 seconds)
        setTimeout(function() {
            if (loadingOverlay && !loadingOverlay.classList.contains('fade-out')) {
                hideLoadingOverlay();
            }
        }, 5000);
    }
    
    /**
     * Hide the loading overlay with a fade-out animation
     */
    function hideLoadingOverlay() {
        if (loadingOverlay) {
            // Add the fade-out class to trigger the CSS transition
            loadingOverlay.classList.add('fade-out');
            
            // Remove the overlay from the DOM after the transition completes
            loadingOverlay.addEventListener('transitionend', function() {
                loadingOverlay.style.display = 'none';
            });
        }
    }
    
    // Initialize the loading overlay
    init();
    
    // Public API
    return {
        hideLoadingOverlay: hideLoadingOverlay
    };
})();
