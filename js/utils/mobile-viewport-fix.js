/**
 * Mobile Viewport Height Fix
 * Handles dynamic viewport height issues on mobile devices
 */

function initMobileViewportFix() {
    // Function to set the correct viewport height
    function setViewportHeight() {
        // Get the actual viewport height
        const vh = window.innerHeight * 0.01;
        // Set the custom property for use in CSS
        document.documentElement.style.setProperty('--vh', `${vh}px`);
        
        // Also handle dynamic viewport height for modern browsers
        if (CSS.supports('height', '100dvh')) {
            // Modern browsers support dvh units natively
            return;
        }
        
        // Fallback for older browsers
        const appContainer = document.querySelector('.app-container');
        const body = document.body;
        
        if (appContainer) {
            appContainer.style.height = `${window.innerHeight}px`;
        }
        body.style.height = `${window.innerHeight}px`;
    }
    
    // Set initial viewport height
    setViewportHeight();
    
    // Update on resize (including orientation change)
    let resizeTimeout;
    window.addEventListener('resize', () => {
        // Debounce resize events
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(setViewportHeight, 100);
    });
    
    // Handle orientation change explicitly
    window.addEventListener('orientationchange', () => {
        setTimeout(setViewportHeight, 100);
    });
    
    // Prevent body scroll on mobile
    document.body.addEventListener('touchmove', function(e) {
        // Allow scrolling within specific scrollable elements
        let element = e.target;
        while (element && element !== document.body) {
            if (element.scrollHeight > element.clientHeight && 
                (element.id === 'chat-messages' || 
                 element.classList.contains('modal-content') ||
                 element.classList.contains('model-info'))) {
                return; // Allow scrolling within these elements
            }
            element = element.parentElement;
        }
        // Prevent default body scroll
        if (e.target === document.body || e.target === document.documentElement) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // Detect virtual keyboard
    let initialHeight = window.innerHeight;
    window.addEventListener('resize', () => {
        const currentHeight = window.innerHeight;
        const heightDifference = initialHeight - currentHeight;
        
        // If height decreased by more than 150px, keyboard is likely open
        if (heightDifference > 150) {
            document.body.classList.add('keyboard-open');
        } else {
            document.body.classList.remove('keyboard-open');
            initialHeight = currentHeight; // Update baseline when keyboard closes
        }
    });
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileViewportFix);
} else {
    initMobileViewportFix();
}

// Export for use in other modules
export { initMobileViewportFix };