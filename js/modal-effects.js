/**
 * Modal Effects Module
 * Adds visual effects when modals are opened/closed
 */

window.ModalEffects = (function() {
    /**
     * Initialize modal effects
     */
    function init() {
        console.log('ModalEffects: Initializing');
        
        // Get all modals
        const modals = document.querySelectorAll('.modal');
        console.log(`ModalEffects: Found ${modals.length} modals`);
        
        // Add event listeners to each modal
        modals.forEach((modal, index) => {
            console.log(`ModalEffects: Setting up observer for modal ${index + 1}`);
            
            // When a modal becomes active, add the modal-open class to the body
            const observer = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    if (mutation.attributeName === 'class') {
                        if (modal.classList.contains('active')) {
                            console.log('ModalEffects: Modal opened, adding modal-open class to body');
                            document.body.classList.add('modal-open');
                        } else {
                            // Check if any other modals are still active
                            const activeModalsExist = document.querySelectorAll('.modal.active').length > 0;
                            if (!activeModalsExist) {
                                console.log('ModalEffects: All modals closed, removing modal-open class from body');
                                document.body.classList.remove('modal-open');
                            }
                        }
                    }
                });
            });
            
            // Start observing the modal for class changes
            observer.observe(modal, { attributes: true });
        });
        
        // Add event listeners for modal close buttons
        const closeButtons = document.querySelectorAll('[id$="-close"], [id^="close-"]');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Check if any modals are still active after a short delay
                setTimeout(() => {
                    const activeModalsExist = document.querySelectorAll('.modal.active').length > 0;
                    if (!activeModalsExist) {
                        document.body.classList.remove('modal-open');
                    }
                }, 100);
            });
        });
        
        // Add event listener for Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // Check if any modals are still active after a short delay
                setTimeout(() => {
                    const activeModalsExist = document.querySelectorAll('.modal.active').length > 0;
                    if (!activeModalsExist) {
                        document.body.classList.remove('modal-open');
                    }
                }, 100);
            }
        });
        
        // Add event listener for clicking outside modals
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                // Check if any modals are still active after a short delay
                setTimeout(() => {
                    const activeModalsExist = document.querySelectorAll('.modal.active').length > 0;
                    if (!activeModalsExist) {
                        document.body.classList.remove('modal-open');
                    }
                }, 100);
            }
        });
    }
    
    // Initialize when the DOM is fully loaded
    document.addEventListener('DOMContentLoaded', init);
    
    // Public API
    return {
        init: init
    };
})();
