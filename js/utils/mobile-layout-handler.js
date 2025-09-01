/**
 * Mobile Layout Handler
 * Ensures proper modal behavior and mobile UI responsiveness
 * Fixes z-index issues and backdrop click handling
 */

class MobileLayoutHandler {
    constructor() {
        this.activeModal = null;
        this.scrollPosition = 0;
        this.init();
    }

    init() {
        // Initialize on DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        this.detectMobileDevice();
        this.setupModalHandlers();
        this.setupKeyboardHandlers();
        this.preventBodyScroll();
        this.ensureProperLayout();
        this.fixSafariIssues();
    }

    detectMobileDevice() {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const isTablet = /iPad|Android/i.test(navigator.userAgent) && !(/Mobile/i.test(navigator.userAgent));
        
        document.body.classList.toggle('mobile-device', isMobile);
        document.body.classList.toggle('tablet-device', isTablet);
        
        // Detect iOS specifically for special handling
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        document.body.classList.toggle('ios-device', isIOS);
    }

    setupModalHandlers() {
        // Get all modals
        const modals = document.querySelectorAll('.modal');
        
        modals.forEach(modal => {
            // Backdrop click handler
            modal.addEventListener('click', (e) => {
                // Only close if clicking the backdrop, not the content
                if (e.target === modal) {
                    this.closeModal(modal);
                }
            });

            // Prevent content clicks from bubbling
            const content = modal.querySelector('.modal-content');
            if (content) {
                content.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            }

            // Monitor modal state changes
            const observer = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    if (mutation.attributeName === 'class') {
                        const isActive = modal.classList.contains('active');
                        if (isActive) {
                            this.onModalOpen(modal);
                        } else {
                            this.onModalClose(modal);
                        }
                    }
                });
            });

            observer.observe(modal, { attributes: true });
        });

        // Handle escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModal) {
                this.closeModal(this.activeModal);
            }
        });
    }

    onModalOpen(modal) {
        this.activeModal = modal;
        
        // Save scroll position
        this.scrollPosition = window.scrollY;
        
        // Prevent body scroll
        document.body.style.position = 'fixed';
        document.body.style.top = `-${this.scrollPosition}px`;
        document.body.style.width = '100%';
        document.body.classList.add('modal-open');
        
        // Ensure modal is properly layered
        this.ensureModalZIndex(modal);
        
        // Focus management for accessibility
        const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (firstFocusable) {
            setTimeout(() => firstFocusable.focus(), 100);
        }
    }

    onModalClose(modal) {
        if (this.activeModal === modal) {
            this.activeModal = null;
        }
        
        // Restore body scroll
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.classList.remove('modal-open');
        
        // Restore scroll position
        window.scrollTo(0, this.scrollPosition);
    }

    closeModal(modal) {
        // Find the close button or trigger close event
        const closeBtn = modal.querySelector('.modal-close, .close, .btn-cancel, [data-dismiss="modal"]');
        if (closeBtn) {
            closeBtn.click();
        } else {
            // Fallback: remove active class
            modal.classList.remove('active');
            
            // Trigger custom event
            modal.dispatchEvent(new CustomEvent('modal-closed'));
        }
    }

    ensureModalZIndex(modal) {
        // Reset z-index for all elements that might interfere
        const chatInput = document.getElementById('chat-input-container');
        const header = document.querySelector('header');
        
        if (chatInput) {
            chatInput.style.zIndex = '1';
        }
        
        if (header) {
            header.style.zIndex = '100';
        }
        
        // Ensure modal has highest z-index
        modal.style.zIndex = '1000';
        
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.zIndex = '1001';
        }
    }

    setupKeyboardHandlers() {
        // Detect virtual keyboard on mobile
        if ('visualViewport' in window) {
            window.visualViewport.addEventListener('resize', () => {
                this.handleKeyboardToggle();
            });
        }
        
        // Fallback for older browsers
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.addEventListener('focus', () => {
                setTimeout(() => {
                    document.body.classList.add('keyboard-open');
                    this.adjustForKeyboard();
                }, 300);
            });
            
            chatInput.addEventListener('blur', () => {
                setTimeout(() => {
                    document.body.classList.remove('keyboard-open');
                    this.adjustForKeyboard();
                }, 300);
            });
        }
    }

    handleKeyboardToggle() {
        const hasKeyboard = window.visualViewport.height < window.innerHeight - 100;
        document.body.classList.toggle('keyboard-open', hasKeyboard);
        this.adjustForKeyboard();
    }

    adjustForKeyboard() {
        const chatContainer = document.getElementById('chat-input-container');
        if (!chatContainer) return;
        
        if (document.body.classList.contains('keyboard-open')) {
            // Ensure input stays visible above keyboard
            chatContainer.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }

    preventBodyScroll() {
        // Prevent elastic scroll on iOS
        document.addEventListener('touchmove', (e) => {
            if (this.activeModal && !e.target.closest('.modal-content')) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    ensureProperLayout() {
        // Ensure main content area exists and is properly structured
        const mainContent = document.getElementById('chat-messages-container') || 
                          document.querySelector('main') || 
                          document.querySelector('.main-content');
        
        if (mainContent) {
            mainContent.style.paddingTop = '72px'; // Account for header
            mainContent.style.paddingBottom = '80px'; // Account for input
        }
        
        // Fix header positioning
        const header = document.querySelector('header');
        if (header) {
            header.style.position = 'fixed';
            header.style.top = '0';
            header.style.left = '0';
            header.style.right = '0';
            header.style.zIndex = '100';
        }
        
        // Fix chat input positioning
        const chatInput = document.getElementById('chat-input-container');
        if (chatInput) {
            chatInput.style.position = 'fixed';
            chatInput.style.bottom = '0';
            chatInput.style.left = '0';
            chatInput.style.right = '0';
            chatInput.style.zIndex = '100';
        }
    }

    fixSafariIssues() {
        // Fix for Safari's handling of fixed positioning
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        if (isSafari) {
            document.body.classList.add('safari-browser');
            
            // Fix viewport height issues
            const setViewportHeight = () => {
                const vh = window.innerHeight * 0.01;
                document.documentElement.style.setProperty('--vh', `${vh}px`);
            };
            
            setViewportHeight();
            window.addEventListener('resize', setViewportHeight);
            window.addEventListener('orientationchange', setViewportHeight);
        }
    }

    // Public method to manually trigger layout adjustment
    refreshLayout() {
        this.ensureProperLayout();
        this.detectMobileDevice();
    }
}

// Initialize the handler
const mobileLayoutHandler = new MobileLayoutHandler();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileLayoutHandler;
}