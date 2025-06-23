/**
 * Logo Tooltip Toggle Script - Fixed Version
 * Handles the expandable tree toggle functionality for the logo
 */

document.addEventListener('DOMContentLoaded', function() {
    const logoContainer = document.querySelector('.logo-text-container');
    const heartLogo = document.querySelector('.heart-logo');
    if (!logoContainer || !heartLogo) return;
    
    // Get the logo lines (excluding the first one with the heart)
    const logoLines = logoContainer.querySelectorAll('.logo-line:nth-child(n+2)');
    
    // Function to initialize event handlers
    function initializeHandlers() {
        // Handle tree toggle for Documentation section
        const treeToggle = document.querySelector('.tree-toggle');
        if (treeToggle && !treeToggle.dataset.initialized) {
            // Mark as initialized to prevent duplicate handlers
            treeToggle.dataset.initialized = 'true';
            
            // Check initial state and fix the toggle text
            const target = treeToggle.getAttribute('data-target');
            const items = document.querySelectorAll('.' + target + '-item');
            const firstItem = items[0];
            if (firstItem && firstItem.style.display !== 'none') {
                // Items are visible but toggle shows [+], fix it
                treeToggle.textContent = treeToggle.textContent.replace('[+]', '[−]');
            }
            
            treeToggle.addEventListener('click', function(e) {
                e.stopPropagation();
                e.preventDefault();
                
                const target = this.getAttribute('data-target');
                const items = document.querySelectorAll('.' + target + '-item');
                const currentText = this.textContent;
                const isExpanded = currentText.includes('[−]') || currentText.includes('[-]');
                
                if (isExpanded) {
                    // Collapse
                    this.textContent = currentText.replace(/\[[\−\-]\]/, '[+]');
                    items.forEach(item => {
                        item.style.display = 'none';
                    });
                } else {
                    // Expand
                    this.textContent = currentText.replace('[+]', '[−]');
                    items.forEach(item => {
                        item.style.display = 'block';
                    });
                }
            });
        }
        
        // Handle clicks on feature links
        document.querySelectorAll('.feature-link').forEach(link => {
            // Remove any existing listeners by cloning
            const newLink = link.cloneNode(true);
            link.parentNode.replaceChild(newLink, link);
            
            newLink.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const feature = this.getAttribute('data-feature');
                
                // Map feature names to button IDs
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
                        button.click();
                    }
                }
            });
        });
    }
    
    // Add click handler to the entire logo area
    logoContainer.addEventListener('click', function(e) {
        // Don't toggle if clicking on a link, feature-link, or tree-toggle
        if (e.target.tagName === 'A' || 
            e.target.closest('a') || 
            e.target.classList.contains('feature-link') || 
            e.target.classList.contains('tree-toggle')) {
            // Let the default action happen for links
            return;
        }
        e.stopPropagation();
        toggleLogoExpansion();
    });
    
    // Also handle clicks in the upper left corner area
    const headerArea = document.querySelector('header');
    if (headerArea) {
        // Create an invisible click area in the upper left corner
        const clickArea = document.createElement('div');
        clickArea.style.position = 'absolute';
        clickArea.style.top = '0';
        clickArea.style.left = '0';
        clickArea.style.width = '100px';
        clickArea.style.height = '100px';
        clickArea.style.cursor = 'pointer';
        clickArea.style.zIndex = '10';
        headerArea.style.position = 'relative';
        headerArea.appendChild(clickArea);
        
        clickArea.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleLogoExpansion();
        });
    }
    
    // Function to toggle the logo expansion
    function toggleLogoExpansion() {
        const isCollapsed = logoContainer.classList.contains('collapsed');
        const firstLogoLine = logoContainer.querySelector('.logo-line:first-child');
        
        if (isCollapsed) {
            // Expand
            logoContainer.classList.remove('collapsed');
            logoLines.forEach(line => {
                line.style.display = 'block';
            });
            // Restore the original text content
            if (firstLogoLine && firstLogoLine.dataset.originalText) {
                firstLogoLine.innerHTML = firstLogoLine.dataset.originalText;
            }
            // Re-initialize handlers after expansion
            setTimeout(() => {
                initializeHandlers();
                // Re-initialize logo animation
                if (window.LogoAnimation) {
                    window.LogoAnimation.init();
                }
            }, 100);
        } else {
            // Collapse
            logoContainer.classList.add('collapsed');
            logoLines.forEach(line => {
                line.style.display = 'none';
            });
            // Store original text and show only heart
            if (firstLogoLine && !firstLogoLine.dataset.originalText) {
                firstLogoLine.dataset.originalText = firstLogoLine.innerHTML;
            }
            if (firstLogoLine) {
                const heartElement = firstLogoLine.querySelector('.heart-logo');
                if (heartElement) {
                    // Clear and clone only the heart with all its children (including typing-dots)
                    const heartClone = heartElement.cloneNode(true);
                    firstLogoLine.innerHTML = '';
                    firstLogoLine.appendChild(heartClone);
                    
                    // Re-initialize the animation system after a short delay
                    setTimeout(() => {
                        if (window.LogoAnimation) {
                            // Re-initialize the entire animation system
                            window.LogoAnimation.init();
                        }
                    }, 100);
                }
            }
        }
    }
    
    // Initialize handlers on load
    initializeHandlers();
    
    // Remove the old modal functionality if it exists
    const oldModal = document.getElementById('logo-info-modal');
    if (oldModal) {
        oldModal.remove();
    }
    
    // Hide the tooltip element as we're not using it anymore
    const tooltip = heartLogo.querySelector('.tooltip');
    if (tooltip) {
        tooltip.style.display = 'none';
    }
    
    // Update cursor styles
    logoContainer.style.cursor = 'pointer';
    heartLogo.style.cursor = 'pointer';
});