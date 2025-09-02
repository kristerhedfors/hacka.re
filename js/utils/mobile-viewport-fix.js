/**
 * Mobile Viewport Height Fix
 * Handles dynamic viewport height issues on mobile devices
 * Enhanced to fix Firefox Focus and Chrome iPhone specific issues
 */

function initMobileViewportFix() {
    // Function to set the correct viewport height
    function setViewportHeight() {
        // Get the actual viewport height
        const vh = window.innerHeight * 0.01;
        // Set the custom property for use in CSS
        document.documentElement.style.setProperty('--vh', `${vh}px`);
        
        // Detect browser type for specific fixes
        const userAgent = navigator.userAgent.toLowerCase();
        const isFirefox = userAgent.includes('firefox');
        const isFirefoxFocus = userAgent.includes('focus');
        const isChrome = userAgent.includes('chrome') || userAgent.includes('crios');
        const isIOS = /iphone|ipad|ipod/.test(userAgent);
        const isSafari = userAgent.includes('safari') && !isChrome;
        
        // Apply browser-specific classes
        document.body.classList.toggle('firefox-browser', isFirefox || isFirefoxFocus);
        document.body.classList.toggle('firefox-focus', isFirefoxFocus);
        document.body.classList.toggle('chrome-ios', isChrome && isIOS);
        document.body.classList.toggle('safari-ios', isSafari && isIOS);
        
        // Get elements
        const appContainer = document.querySelector('.app-container');
        const chatInputContainer = document.getElementById('chat-input-container');
        const chatMessages = document.getElementById('chat-messages');
        const body = document.body;
        
        // Firefox Focus specific fix - prevent extra white space below footer
        if (isFirefoxFocus) {
            // Force proper viewport containment
            if (appContainer) {
                appContainer.style.height = `${window.innerHeight}px`;
                appContainer.style.maxHeight = `${window.innerHeight}px`;
                appContainer.style.overflow = 'hidden';
            }
            
            // Ensure footer is properly positioned at bottom
            if (chatInputContainer) {
                chatInputContainer.style.position = 'fixed';
                chatInputContainer.style.bottom = '0';
                chatInputContainer.style.left = '0';
                chatInputContainer.style.right = '0';
                chatInputContainer.style.width = '100%';
            }
            
            // Adjust chat messages to not overflow
            if (chatMessages) {
                chatMessages.style.paddingBottom = '80px';
            }
        }
        
        // Chrome iOS specific fix - ensure footer is fully visible
        if (isChrome && isIOS) {
            // Ensure footer is fully visible and clickable
            if (chatInputContainer) {
                // Use sticky positioning for better compatibility
                chatInputContainer.style.position = 'sticky';
                chatInputContainer.style.bottom = '0';
                chatInputContainer.style.minHeight = '60px';
                chatInputContainer.style.zIndex = '100';
                
                // Add safe area padding for notched devices
                const safeAreaBottom = getComputedStyle(document.documentElement)
                    .getPropertyValue('padding-bottom') || '0px';
                chatInputContainer.style.paddingBottom = `calc(0.75rem + env(safe-area-inset-bottom, ${safeAreaBottom}))`;
            }
            
            // Adjust chat messages padding to ensure last message is visible
            if (chatMessages) {
                chatMessages.style.paddingBottom = '100px';
            }
            
            // Fix app container height
            if (appContainer) {
                appContainer.style.height = '100%';
                appContainer.style.minHeight = `${window.innerHeight}px`;
            }
        }
        
        // General iOS Safari fixes
        if (isSafari && isIOS) {
            if (appContainer) {
                appContainer.style.height = `${window.innerHeight}px`;
            }
            body.style.height = `${window.innerHeight}px`;
        }
        
        // Fallback for older browsers that don't support dvh
        if (!CSS.supports('height', '100dvh')) {
            if (appContainer) {
                appContainer.style.height = `${window.innerHeight}px`;
            }
            body.style.height = `${window.innerHeight}px`;
        }
    }
    
    // Handle keyboard visibility changes
    function handleKeyboardVisibility() {
        if (window.innerWidth <= 768) {
            const keyboardHeight = window.innerHeight - (window.visualViewport?.height || window.innerHeight);
            const isKeyboardOpen = keyboardHeight > 50;
            
            document.body.classList.toggle('keyboard-open', isKeyboardOpen);
            
            const chatInputContainer = document.getElementById('chat-input-container');
            
            // Firefox Focus specific keyboard handling
            if (document.body.classList.contains('firefox-focus') && chatInputContainer) {
                if (isKeyboardOpen) {
                    chatInputContainer.style.position = 'fixed';
                    chatInputContainer.style.bottom = `${keyboardHeight}px`;
                } else {
                    chatInputContainer.style.position = 'fixed';
                    chatInputContainer.style.bottom = '0';
                }
            }
            
            // Chrome iOS keyboard handling
            if (document.body.classList.contains('chrome-ios') && chatInputContainer) {
                if (isKeyboardOpen) {
                    // Keep footer visible above keyboard
                    chatInputContainer.style.transform = `translateY(-${keyboardHeight}px)`;
                } else {
                    chatInputContainer.style.transform = 'translateY(0)';
                }
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
        resizeTimeout = setTimeout(() => {
            setViewportHeight();
            handleKeyboardVisibility();
        }, 100);
    });
    
    // Handle orientation change explicitly
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            setViewportHeight();
            handleKeyboardVisibility();
        }, 100);
    });
    
    // Visual viewport API for better keyboard detection
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
            handleKeyboardVisibility();
        });
        
        window.visualViewport.addEventListener('scroll', () => {
            // Prevent unwanted scrolling behavior
            const chatInputContainer = document.getElementById('chat-input-container');
            if (chatInputContainer && window.innerWidth <= 768) {
                const keyboardHeight = window.innerHeight - window.visualViewport.height;
                if (keyboardHeight > 50 && !document.body.classList.contains('firefox-focus')) {
                    // Adjust position for keyboard (except Firefox Focus which handles it differently)
                    chatInputContainer.style.transform = `translateY(-${Math.min(keyboardHeight, 300)}px)`;
                } else {
                    chatInputContainer.style.transform = 'translateY(0)';
                }
            }
        });
    }
    
    // Prevent body scroll on mobile (but allow in specific areas)
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
    
    // Detect virtual keyboard with input focus/blur
    const messageInput = document.getElementById('message-input');
    if (messageInput && window.innerWidth <= 768) {
        messageInput.addEventListener('focus', () => {
            document.body.classList.add('keyboard-open');
            setTimeout(() => {
                handleKeyboardVisibility();
                // Scroll to bottom to show input
                const chatMessages = document.getElementById('chat-messages');
                if (chatMessages) {
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
            }, 300);
        });
        
        messageInput.addEventListener('blur', () => {
            document.body.classList.remove('keyboard-open');
            setTimeout(() => {
                handleKeyboardVisibility();
                // Reset any transforms
                const chatInputContainer = document.getElementById('chat-input-container');
                if (chatInputContainer) {
                    chatInputContainer.style.transform = 'translateY(0)';
                    if (document.body.classList.contains('firefox-focus')) {
                        chatInputContainer.style.bottom = '0';
                    }
                }
            }, 300);
        });
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