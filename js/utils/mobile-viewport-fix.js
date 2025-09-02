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
        
        // Only apply fixes on mobile
        if (window.innerWidth <= 768) {
            const appContainer = document.querySelector('.app-container');
            const chatInputContainer = document.getElementById('chat-input-container');
            
            // Set app container to exact viewport height
            if (appContainer) {
                // Use innerHeight which gives us the actual visible viewport
                appContainer.style.height = `${window.innerHeight}px`;
            }
            
            // Ensure chat input is visible
            if (chatInputContainer) {
                // Force reflow to ensure proper positioning
                chatInputContainer.style.display = 'none';
                chatInputContainer.offsetHeight; // Trigger reflow
                chatInputContainer.style.display = 'block';
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
        setTimeout(setViewportHeight, 200);
    });
    
    // Handle visual viewport changes (iOS specific)
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
            setViewportHeight();
        });
    }
    
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
                // Ensure input is visible when keyboard opens
                setTimeout(() => {
                    messageInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 300);
            });
            
            messageInput.addEventListener('blur', () => {
                document.body.classList.remove('keyboard-open');
                // Reset viewport after keyboard closes
                setTimeout(setViewportHeight, 300);
            });
        }
    }
    
    // Force a recalculation on page load
    window.addEventListener('load', () => {
        setTimeout(setViewportHeight, 100);
    });
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileViewportFix);
} else {
    initMobileViewportFix();
}

// Make available globally if needed
window.initMobileViewportFix = initMobileViewportFix;