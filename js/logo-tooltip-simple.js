/**
 * Logo Tooltip Toggle Script - Simple Version
 * Handles the expandable tree toggle functionality for the logo
 */

document.addEventListener('DOMContentLoaded', function() {
    const logoContainer = document.querySelector('.logo-text-container');
    const heartLogo = document.querySelector('.heart-logo');
    if (!logoContainer || !heartLogo) return;
    
    // Get the logo lines (excluding the first one with the heart)
    const logoLines = logoContainer.querySelectorAll('.logo-line:nth-child(n+2)');
    
    // ONLY handle clicks on the heart logo itself for expand/collapse
    heartLogo.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleLogoExpansion();
    });
    
    // Handle Documentation tree toggle ONLY
    const treeToggle = document.querySelector('.tree-toggle');
    if (treeToggle) {
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
    
    // Handle feature links
    document.querySelectorAll('.feature-link').forEach(link => {
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
                    button.click();
                }
            }
        });
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
            // Re-initialize logo animation
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
                    const heartClone = heartElement.cloneNode(true);
                    firstLogoLine.innerHTML = '';
                    firstLogoLine.appendChild(heartClone);
                    
                    setTimeout(() => {
                        if (window.LogoAnimation) {
                            window.LogoAnimation.init();
                        }
                    }, 100);
                }
            }
        }
    }
    
    // Update cursor styles
    heartLogo.style.cursor = 'pointer';
});