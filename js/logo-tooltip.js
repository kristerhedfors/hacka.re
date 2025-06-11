/**
 * Logo Tooltip Modal Script
 * Handles the modal functionality for the heart logo tooltip
 */

document.addEventListener('DOMContentLoaded', function() {
    const heartLogo = document.querySelector('.heart-logo');
    if (!heartLogo) return;
    
    // Create a new modal for the logo info
    const infoModal = document.createElement('div');
    infoModal.id = 'logo-info-modal';
    infoModal.className = 'modal';
    
    // Get the content from the tooltip
    const tooltipContent = heartLogo.querySelector('.tooltip');
    if (!tooltipContent) return;
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    // Add a header
    const header = document.createElement('div');
    header.className = 'settings-header';
    
    const heading = document.createElement('h2');
    heading.textContent = 'About hacka.re';
    
    header.appendChild(heading);
    modalContent.appendChild(header);
    
    // Create a tooltip-content wrapper for consistent styling
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'tooltip-content';
    
    // Clone the tooltip content
    const contentClone = tooltipContent.cloneNode(true);
    
    // Move all children from contentClone to contentWrapper
    while (contentClone.firstChild) {
        contentWrapper.appendChild(contentClone.firstChild);
    }
    
    modalContent.appendChild(contentWrapper);
    
    // Add close button
    const closeButtonContainer = document.createElement('div');
    closeButtonContainer.className = 'form-actions';
    
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'btn secondary-btn';
    closeButton.textContent = 'Close';
    closeButton.id = 'close-logo-info-modal';
    
    closeButtonContainer.appendChild(closeButton);
    modalContent.appendChild(closeButtonContainer);
    
    // Add modal to document
    infoModal.appendChild(modalContent);
    document.body.appendChild(infoModal);
    
    // Show modal when logo is clicked
    heartLogo.addEventListener('click', function(e) {
        e.stopPropagation();
        infoModal.classList.add('active');
    });
    
    // Also make the logo text and tagline clickable
    const logoText = document.querySelector('.logo-text');
    if (logoText) {
        logoText.style.cursor = 'pointer';
        logoText.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            infoModal.classList.add('active');
        });
    }
    
    // Also make the entire logo container clickable
    const logo = document.querySelector('.logo');
    if (logo) {
        logo.style.cursor = 'pointer';
        logo.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            infoModal.classList.add('active');
        });
    }
    
    const tagline = document.querySelector('.tagline');
    if (tagline) {
        tagline.addEventListener('click', function(e) {
            e.stopPropagation();
            infoModal.classList.add('active');
        });
    }
    
    // Close modal when close button is clicked
    closeButton.addEventListener('click', function() {
        infoModal.classList.remove('active');
    });
    
    // Close modal when clicking outside
    infoModal.addEventListener('click', function(e) {
        if (e.target === infoModal) {
            infoModal.classList.remove('active');
        }
    });
    
    // Close modal when pressing Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && infoModal.classList.contains('active')) {
            infoModal.classList.remove('active');
        }
    });
    
    // Replace the original tooltip with a properly styled one
    const newTooltip = document.createElement('div');
    newTooltip.className = 'tooltip';
    
    // Create tooltip content wrapper
    const newTooltipContent = document.createElement('div');
    newTooltipContent.className = 'tooltip-content';
    
    // Copy the important notices with proper styling
    const importantNotices = tooltipContent.querySelectorAll('.important-notice');
    importantNotices.forEach(notice => {
        const newNotice = document.createElement('div');
        newNotice.className = 'important-notice';
        newNotice.innerHTML = notice.innerHTML;
        newTooltipContent.appendChild(newNotice);
    });
    
    newTooltip.appendChild(newTooltipContent);
    
    // Replace the old tooltip with the new one
    tooltipContent.parentNode.replaceChild(newTooltip, tooltipContent);
});
