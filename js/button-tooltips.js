/**
 * Button Tooltips Script
 * Adds mini-tooltips to buttons in the upper right bar
 */

document.addEventListener('DOMContentLoaded', function() {
    // Define the buttons and their tooltip texts
    const buttons = [
        { id: 'heart-btn', text: 'Explore hacka.re', isSpecial: true },
        // Agent button removed from UI but functionality preserved for future use
        // { id: 'agent-config-btn', text: 'Agents' },
        { id: 'copy-chat-btn', text: 'Copy Chat Content' },
        { id: 'mcp-servers-btn', text: 'Model Context Protocol' },
        { id: 'function-btn', text: 'Function Calling' },
        { id: 'rag-btn', text: 'Knowledge Base' },
        { id: 'prompts-btn', text: 'System Prompts' },
        { id: 'share-btn', text: 'Share' },
        { id: 'theme-toggle-btn', text: 'Cycle Theme' },
        { id: 'settings-btn', text: 'Settings' }
    ];
    
    // Create tooltips for each button
    buttons.forEach(button => {
        const buttonElement = document.getElementById(button.id);
        if (!buttonElement) return;
        
        // Make sure the button has position relative for tooltip positioning
        buttonElement.style.position = 'relative';
        
        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.className = 'mini-tooltip';
        
        // Special formatting for heart button
        if (button.isSpecial) {
            tooltip.innerHTML = 'Explore <span style="font-family: \'Courier New\', Monaco, monospace;">hacka.re</span>';
        } else {
            tooltip.textContent = button.text;
        }
        
        // Add tooltip to button
        buttonElement.appendChild(tooltip);
        
        // Show tooltip on mouseenter
        buttonElement.addEventListener('mouseenter', function() {
            // Special handling for heart button - don't show tooltip if menu is active
            if (button.id === 'heart-btn') {
                const heartMenu = document.querySelector('.heart-logo .tooltip');
                if (heartMenu && heartMenu.classList.contains('active')) {
                    return; // Don't show tooltip when menu is open
                }
            }
            tooltip.classList.add('active');
        });
        
        // Hide tooltip on mouseleave
        buttonElement.addEventListener('mouseleave', function() {
            tooltip.classList.remove('active');
        });
        
        // Special handling for heart button - hide tooltip when menu opens
        if (button.id === 'heart-btn') {
            // Watch for menu opening
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        const heartMenu = document.querySelector('.heart-logo .tooltip');
                        if (heartMenu && heartMenu.classList.contains('active')) {
                            tooltip.classList.remove('active'); // Hide tooltip when menu opens
                        }
                    }
                });
            });
            
            // Observe the heart menu for class changes
            const heartMenu = document.querySelector('.heart-logo .tooltip');
            if (heartMenu) {
                observer.observe(heartMenu, { attributes: true });
            }
        }
    });
});
