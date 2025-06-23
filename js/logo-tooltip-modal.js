/**
 * Logo Tooltip Modal Script
 * Shows the ASCII tree in a modal with exact header styling
 */

document.addEventListener('DOMContentLoaded', function() {
    const logoContainer = document.querySelector('.logo-text-container');
    const heartLogo = document.querySelector('.heart-logo');
    if (!logoContainer || !heartLogo) return;
    
    // Create modal structure
    const modal = document.createElement('div');
    modal.id = 'logo-tree-modal';
    modal.className = 'modal';
    modal.style.background = 'transparent';
    modal.style.alignItems = 'flex-start';
    modal.style.justifyContent = 'flex-start';
    modal.innerHTML = `
        <div class="modal-content logo-tree-modal-content">
            <button class="modal-close" id="logo-tree-modal-close">&times;</button>
            <div class="modal-body logo-tree-modal-body">
                <!-- Tree content will be cloned here -->
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Get reference to modal body
    const modalBody = modal.querySelector('.logo-tree-modal-body');
    
    // Function to show modal with tree content
    function showTreeModal() {
        // Create a new container for just the tree (no heart logo line)
        const treeClone = document.createElement('div');
        treeClone.className = 'logo-text-container';
        
        // Get all lines except the first one (which has the heart logo)
        const originalLines = logoContainer.querySelectorAll('.logo-line:nth-child(n+2)');
        originalLines.forEach(line => {
            const lineClone = line.cloneNode(true);
            lineClone.style.display = 'block';
            treeClone.appendChild(lineClone);
        });
        
        // Clear modal body and add cloned tree
        modalBody.innerHTML = '';
        modalBody.appendChild(treeClone);
        
        // Re-attach event handlers for the cloned elements
        attachModalHandlers();
        
        // Position modal underneath the heart
        positionModalUnderHeart();
        
        // Show modal
        modal.style.display = 'block';
        document.body.classList.add('modal-open');
    }
    
    // Function to hide modal
    function hideTreeModal() {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
    
    // Function to position modal underneath the heart
    function positionModalUnderHeart() {
        const heartRect = heartLogo.getBoundingClientRect();
        const modalContent = modal.querySelector('.logo-tree-modal-content');
        
        // Position the modal like a dropdown
        modalContent.style.position = 'absolute';
        modalContent.style.top = (heartRect.bottom + window.scrollY + 60) + 'px';
        modalContent.style.left = (heartRect.left + window.scrollX) + 'px';
        modalContent.style.transform = 'none';
        modalContent.style.margin = '0';
        
        // Adjust positioning if modal would go off-screen
        const modalRect = modalContent.getBoundingClientRect();
        if (modalRect.right > window.innerWidth) {
            modalContent.style.left = (window.innerWidth - modalRect.width - 10) + 'px';
        }
        if (modalRect.bottom > window.innerHeight) {
            modalContent.style.top = (heartRect.top + window.scrollY - modalRect.height - 5) + 'px';
        }
    }
    
    // Attach handlers to cloned tree elements in modal
    function attachModalHandlers() {
        // Documentation tree toggle in modal
        const modalTreeToggle = modalBody.querySelector('.tree-toggle');
        if (modalTreeToggle) {
            modalTreeToggle.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const target = this.getAttribute('data-target');
                const items = modalBody.querySelectorAll('.' + target + '-item');
                const currentText = this.textContent;
                const isExpanded = currentText.includes('[−]') || currentText.includes('[-]');
                
                if (isExpanded) {
                    this.textContent = currentText.replace(/\[[\−\-]\]/, '[+]');
                    items.forEach(item => {
                        item.style.display = 'none';
                    });
                } else {
                    this.textContent = currentText.replace('[+]', '[−]');
                    items.forEach(item => {
                        item.style.display = 'block';
                    });
                }
            });
        }
        
        // Feature links in modal
        modalBody.querySelectorAll('.feature-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const feature = this.getAttribute('data-feature');
                
                const featureToButtonId = {
                    'copy-chat': 'copy-chat-btn',
                    'mcp-servers': 'mcp-servers-btn',
                    'function-calling': 'function-btn',
                    'system-prompts': 'prompts-btn',
                    'share': 'share-btn',
                    'theme': 'theme-toggle-btn',
                    'settings': 'settings-btn'
                };
                
                const buttonId = featureToButtonId[feature];
                if (buttonId) {
                    const button = document.getElementById(buttonId);
                    if (button) {
                        // Close modal first
                        hideTreeModal();
                        // Then trigger the button
                        button.click();
                    }
                }
            });
        });
    }
    
    // Heart logo toggles modal
    heartLogo.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (modal.style.display === 'block') {
            hideTreeModal();
        } else {
            showTreeModal();
        }
    });
    
    // Header click area for upper-left corner
    const headerArea = document.querySelector('header');
    if (headerArea) {
        const clickArea = document.createElement('div');
        clickArea.style.position = 'absolute';
        clickArea.style.top = '0';
        clickArea.style.left = '0';
        clickArea.style.width = '60px';
        clickArea.style.height = '60px';
        clickArea.style.cursor = 'pointer';
        clickArea.style.zIndex = '10';
        headerArea.style.position = 'relative';
        headerArea.appendChild(clickArea);
        
        clickArea.addEventListener('click', function(e) {
            e.stopPropagation();
            showTreeModal();
        });
    }
    
    // Close modal handlers
    modal.querySelector('.modal-close').addEventListener('click', hideTreeModal);
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            hideTreeModal();
        }
    });
    
    // ESC key to close
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.style.display === 'block') {
            hideTreeModal();
        }
    });
    
    // Keep logo always collapsed in header
    const logoLines = logoContainer.querySelectorAll('.logo-line:nth-child(n+2)');
    logoContainer.classList.add('collapsed');
    logoLines.forEach(line => {
        line.style.display = 'none';
    });
    
    // Update cursor styles
    heartLogo.style.cursor = 'pointer';
});