/**
 * Settings Info Modal Script
 * Handles the modal functionality for the settings info icon
 */

document.addEventListener('DOMContentLoaded', function() {
    const settingsInfoIcon = document.getElementById('settings-info-icon');
    if (!settingsInfoIcon) return;
    
    // Create a new modal for the settings info
    const infoModal = document.createElement('div');
    infoModal.id = 'settings-info-modal';
    infoModal.className = 'modal';
    
    // Get the content from the tooltip
    const tooltipContent = settingsInfoIcon.querySelector('.tooltip .tooltip-content');
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
    
    // Clone the tooltip content
    const contentClone = tooltipContent.cloneNode(true);
    modalContent.appendChild(contentClone);
    
    // Add close button
    const closeButtonContainer = document.createElement('div');
    closeButtonContainer.className = 'form-actions';
    
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'btn secondary-btn';
    closeButton.textContent = 'Close';
    closeButton.id = 'close-info-modal';
    
    closeButtonContainer.appendChild(closeButton);
    modalContent.appendChild(closeButtonContainer);
    
    // Add modal to document
    infoModal.appendChild(modalContent);
    document.body.appendChild(infoModal);
    
    // Show modal when info icon is clicked
    settingsInfoIcon.addEventListener('click', function(e) {
        e.stopPropagation();
        infoModal.classList.add('active');
    });
    
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
    
    // Remove the original tooltip since we're using a modal instead
    const tooltip = settingsInfoIcon.querySelector('.tooltip');
    if (tooltip) {
        tooltip.remove();
    }
});
