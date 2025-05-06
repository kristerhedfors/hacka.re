/**
 * Mobile Utilities Module
 * Handles mobile-specific behaviors and optimizations
 */

window.MobileUtils = (function() {
    // Track if the virtual keyboard is open
    let isKeyboardOpen = false;
    
    /**
     * Initialize mobile-specific event listeners and behaviors
     */
    function init() {
        const messageInput = document.getElementById('message-input');
        const appContainer = document.querySelector('.app-container');
        
        // Detect when the virtual keyboard is opened/closed
        if (messageInput) {
            messageInput.addEventListener('focus', function() {
                // Small delay to ensure the keyboard is fully open
                setTimeout(function() {
                    document.body.classList.add('keyboard-open');
                    isKeyboardOpen = true;
                    
                    // Scroll to the input field to ensure it's visible
                    window.scrollTo(0, document.body.scrollHeight);
                }, 300);
            });
            
            messageInput.addEventListener('blur', function() {
                document.body.classList.remove('keyboard-open');
                isKeyboardOpen = false;
            });
        }
        
        // Fix for iOS Safari viewport height issues
        function adjustHeight() {
            if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
                const vh = window.innerHeight * 0.01;
                document.documentElement.style.setProperty('--vh', `${vh}px`);
                
                if (appContainer) {
                    appContainer.style.height = `calc(100 * var(--vh))`;
                }
            }
        }
        
        // Run on page load and resize
        adjustHeight();
        window.addEventListener('resize', adjustHeight);
        
        // Improve touch experience for modals
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.addEventListener('touchmove', function(e) {
                // Allow scrolling within modal content but prevent body scrolling
                const modalContent = modal.querySelector('.modal-content');
                if (modalContent && !modalContent.contains(e.target)) {
                    e.preventDefault();
                }
            });
        });
        
        // Improve scrolling experience in chat messages
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            // Ensure smooth scrolling on iOS
            chatMessages.style.webkitOverflowScrolling = 'touch';
            
            // Add momentum-based scrolling for iOS
            if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
                chatMessages.classList.add('ios-momentum-scroll');
            }
        }
        
        // Fix for double-tap zoom on buttons and links
        const touchElements = document.querySelectorAll('button, a, .icon-btn');
        touchElements.forEach(el => {
            el.addEventListener('touchend', function(e) {
                // Prevent zoom on double-tap
                e.preventDefault();
                // Trigger click event
                el.click();
            });
        });
        
        // Add viewport meta tag for better mobile experience if not already present
        ensureViewportMeta();
    }
    
    /**
     * Ensure the viewport meta tag is properly set
     */
    function ensureViewportMeta() {
        let viewportMeta = document.querySelector('meta[name="viewport"]');
        
        if (!viewportMeta) {
            viewportMeta = document.createElement('meta');
            viewportMeta.name = 'viewport';
            document.head.appendChild(viewportMeta);
        }
        
        // Set optimal viewport settings for mobile
        viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
    }
    
    /**
     * Check if the device is a mobile device
     * @returns {boolean} True if the device is mobile
     */
    function isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    /**
     * Check if the device is in portrait orientation
     * @returns {boolean} True if the device is in portrait orientation
     */
    function isPortraitOrientation() {
        return window.innerHeight > window.innerWidth;
    }
    
    /**
     * Adjust UI elements based on screen size and orientation
     */
    function adjustUIForScreenSize() {
        const isMobile = isMobileDevice();
        const isPortrait = isPortraitOrientation();
        
        // Add classes to body for CSS targeting
        if (isMobile) {
            document.body.classList.add('mobile-device');
            
            if (isPortrait) {
                document.body.classList.add('portrait');
                document.body.classList.remove('landscape');
            } else {
                document.body.classList.add('landscape');
                document.body.classList.remove('portrait');
            }
        } else {
            document.body.classList.remove('mobile-device', 'portrait', 'landscape');
        }
        
        // Adjust modal positioning for better mobile experience
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (isMobile && isPortrait) {
                modal.classList.add('mobile-portrait');
            } else {
                modal.classList.remove('mobile-portrait');
            }
        });
    }
    
    // Initialize on page load
    document.addEventListener('DOMContentLoaded', function() {
        init();
        adjustUIForScreenSize();
        
        // Adjust UI on orientation change
        window.addEventListener('resize', adjustUIForScreenSize);
    });
    
    // Public API
    return {
        isMobileDevice: isMobileDevice,
        isPortraitOrientation: isPortraitOrientation,
        isKeyboardOpen: function() { return isKeyboardOpen; }
    };
})();
