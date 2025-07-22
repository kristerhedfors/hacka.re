/**
 * Button Tooltips Script
 * Adds mini-tooltips to buttons in the upper right bar
 */

document.addEventListener('DOMContentLoaded', function() {
    // Define the buttons and their tooltip texts
    const buttons = [
        { id: 'agent-config-btn', text: 'Agent Configuration' },
        { id: 'copy-chat-btn', text: 'Copy Chat Content' },
        { id: 'mcp-servers-btn', text: 'Model Context Protocol' },
        { id: 'function-btn', text: 'Function Calling' },
        { id: 'prompts-btn', text: 'System Prompt Menu' },
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
        tooltip.textContent = button.text;
        
        // Add tooltip to button
        buttonElement.appendChild(tooltip);
        
        // Show tooltip on mouseenter
        buttonElement.addEventListener('mouseenter', function() {
            tooltip.classList.add('active');
        });
        
        // Hide tooltip on mouseleave
        buttonElement.addEventListener('mouseleave', function() {
            tooltip.classList.remove('active');
        });
    });
});
