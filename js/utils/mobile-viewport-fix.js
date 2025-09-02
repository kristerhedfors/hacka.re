/**
 * Mobile Viewport Height Fix
 * Universal solution for all mobile browsers
 */

function initMobileViewportFix() {
    // Function to set the correct viewport height
    function setViewportHeight() {
        // Get the actual viewport height
        const vh = window.innerHeight * 0.01;
        // Set the custom property for use in CSS
        document.documentElement.style.setProperty('--vh', `${vh}px`);
        
        // Only apply height fixes on mobile
        if (window.innerWidth <= 768) {
            const appContainer = document.querySelector('.app-container');
            if (appContainer) {
                // Set the app container to exactly fill the viewport
                appContainer.style.height = `${window.innerHeight}px`;
            }
        }
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
    if (window.innerWidth <= 768) {
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
    }
    
    // Simple keyboard detection
    if (window.innerWidth <= 768) {
        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            messageInput.addEventListener('focus', () => {
                document.body.classList.add('keyboard-open');
            });
            
            messageInput.addEventListener('blur', () => {
                document.body.classList.remove('keyboard-open');
            });
        }
    }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileViewportFix);
} else {
    initMobileViewportFix();
}

// Make available globally if needed
window.initMobileViewportFix = initMobileViewportFix;