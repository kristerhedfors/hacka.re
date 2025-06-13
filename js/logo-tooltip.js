/**
 * Logo Tooltip Toggle Script
 * Handles the expandable tree toggle functionality for the logo
 */

document.addEventListener('DOMContentLoaded', function() {
    const logoContainer = document.querySelector('.logo-text-container');
    const heartLogo = document.querySelector('.heart-logo');
    if (!logoContainer || !heartLogo) return;
    
    // Get the logo lines (excluding the first one with the heart)
    const logoLines = logoContainer.querySelectorAll('.logo-line:nth-child(n+2)');
    
    // Add click handler to the entire logo area
    logoContainer.addEventListener('click', function(e) {
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
            // Re-initialize logo animation to ensure dots are properly set up
            if (window.LogoAnimation) {
                setTimeout(() => {
                    window.LogoAnimation.init();
                }, 100);
            }
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
