/**
 * Logo Tooltip Toggle Script - Minimal Version
 * Very simple, targeted event handling
 */

document.addEventListener('DOMContentLoaded', function() {
    const logoContainer = document.querySelector('.logo-text-container');
    const heartLogo = document.querySelector('.heart-logo');
    if (!logoContainer || !heartLogo) return;
    
    // Get the logo lines (excluding the first one with the heart)
    const logoLines = logoContainer.querySelectorAll('.logo-line:nth-child(n+2)');
    
    // Only the heart logo itself toggles expand/collapse
    heartLogo.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        toggleLogoExpansion();
    });
    
    // Documentation tree toggle - ONLY the [+]/[-] part
    const treeToggle = document.querySelector('.tree-toggle');
    if (treeToggle) {
        treeToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const target = this.getAttribute('data-target');
            const items = document.querySelectorAll('.' + target + '-item');
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
    
    // Feature links
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
    
    // NO OTHER CLICK HANDLERS - let documentation links work naturally
    
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
            if (firstLogoLine && firstLogoLine.dataset.originalText) {
                firstLogoLine.innerHTML = firstLogoLine.dataset.originalText;
            }
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