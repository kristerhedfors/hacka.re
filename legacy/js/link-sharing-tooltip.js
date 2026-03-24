/**
 * Link Sharing Info Modal Script
 * Handles the modal functionality for the info icons in the link sharing menu
 */

document.addEventListener('DOMContentLoaded', function() {
    // Get all info icons in the share modal
    const shareInfoIcons = document.querySelectorAll('#share-modal .info-icon');
    
    // Process each info icon
    shareInfoIcons.forEach((infoIcon, index) => {
        // Skip the info icons that are handled by SettingsInfoModalService
        if (infoIcon.id === 'share-link-info-icon' || infoIcon.id === 'share-password-info-icon') {
            return; // Skip these, they're handled elsewhere
        }
        // Create a unique ID for each modal
        const modalId = `share-info-modal-${index}`;
        
        // Create a new modal for this info icon
        const infoModal = document.createElement('div');
        infoModal.id = modalId;
        infoModal.className = 'modal';
        
        // Get the content from the tooltip
        const tooltipContent = infoIcon.querySelector('.tooltip');
        if (!tooltipContent) return;
        
        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        
        // Add a header
        const header = document.createElement('div');
        header.className = 'settings-header';
        
        const heading = document.createElement('h2');
        heading.textContent = 'Information';
        
        header.appendChild(heading);
        modalContent.appendChild(header);
        
        // Create a tooltip-content wrapper div
        const tooltipContentWrapper = document.createElement('div');
        tooltipContentWrapper.className = 'tooltip-content';
        
        // Process the tooltip content and wrap it in important-notice divs
        const tooltipText = tooltipContent.innerHTML;
        
        // Check if the content is already in important-notice format
        if (!tooltipText.includes('important-notice')) {
            // If it's a list, process each list item
            if (tooltipText.includes('<ul>')) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = tooltipText;
                
                // Extract the paragraph before the list if it exists
                let introText = '';
                const paragraphs = tempDiv.querySelectorAll('p');
                if (paragraphs.length > 0) {
                    introText = paragraphs[0].outerHTML;
                    // Create an important notice for the intro text
                    const introNotice = document.createElement('div');
                    introNotice.className = 'important-notice';
                    introNotice.style.cssText = 'background-color: var(--system-msg-bg); border-left: 4px solid var(--accent-color); padding: 10px; margin-bottom: 10px; border-radius: 8px;';
                    introNotice.innerHTML = introText;
                    tooltipContentWrapper.appendChild(introNotice);
                }
                
                // Process the list items
                const listItems = tempDiv.querySelectorAll('li');
                if (listItems.length > 0) {
                    const listNotice = document.createElement('div');
                    listNotice.className = 'important-notice';
                    listNotice.style.cssText = 'background-color: var(--system-msg-bg); border-left: 4px solid var(--accent-color); padding: 10px; margin-bottom: 10px; border-radius: 8px;';
                    
                    const list = document.createElement('ul');
                    listItems.forEach(item => {
                        list.appendChild(item.cloneNode(true));
                    });
                    
                    listNotice.appendChild(list);
                    tooltipContentWrapper.appendChild(listNotice);
                }
                
                // Extract any paragraph after the list if it exists
                const allParagraphs = Array.from(paragraphs);
                if (allParagraphs.length > 1) {
                    for (let i = 1; i < allParagraphs.length; i++) {
                        const outroNotice = document.createElement('div');
                        outroNotice.className = 'important-notice';
                        outroNotice.style.cssText = 'background-color: var(--system-msg-bg); border-left: 4px solid var(--accent-color); padding: 10px; margin-bottom: 10px; border-radius: 8px;';
                        outroNotice.innerHTML = allParagraphs[i].outerHTML;
                        tooltipContentWrapper.appendChild(outroNotice);
                    }
                }
            } else {
                // For simple text content, wrap it in a single important-notice
                const notice = document.createElement('div');
                notice.className = 'important-notice';
                notice.style.cssText = 'background-color: var(--system-msg-bg); border-left: 4px solid var(--accent-color); padding: 10px; margin-bottom: 0; border-radius: 8px;';
                notice.innerHTML = tooltipText;
                tooltipContentWrapper.appendChild(notice);
            }
        } else {
            // Content already has important-notice formatting, just clone it
            tooltipContentWrapper.innerHTML = tooltipText;
        }
        
        modalContent.appendChild(tooltipContentWrapper);
        
        // Add close button
        const closeButtonContainer = document.createElement('div');
        closeButtonContainer.className = 'form-actions';
        
        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'btn secondary-btn';
        closeButton.textContent = 'Close';
        closeButton.id = `close-${modalId}`;
        
        closeButtonContainer.appendChild(closeButton);
        modalContent.appendChild(closeButtonContainer);
        
        // Add modal to document
        infoModal.appendChild(modalContent);
        document.body.appendChild(infoModal);
        
        // Show modal when info icon is clicked
        infoIcon.addEventListener('click', function(e) {
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
        
        // Remove the original tooltip hover behavior
        infoIcon.querySelector('.tooltip').style.pointerEvents = 'none';
    });
});
