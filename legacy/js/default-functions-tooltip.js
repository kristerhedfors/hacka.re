/**
 * Default Functions Tooltip Script
 * Handles the tooltip functionality for the default functions info icon
 */

document.addEventListener('DOMContentLoaded', function() {
    // Add tooltip to the function button
    const functionBtn = document.getElementById('function-btn');
    if (!functionBtn) return;
    
    // Check if tooltip already exists to avoid duplicates
    if (functionBtn.querySelector('.tooltip')) return;
    
    // Create tooltip container
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    
    // Create tooltip content
    const tooltipContent = document.createElement('div');
    tooltipContent.className = 'tooltip-content';
    
    // Add tooltip content
    tooltipContent.innerHTML = `
        <div class="important-notice">
            <p><strong>Function Calling</strong>: Create JavaScript functions that AI models can execute through the OpenAI-compatible API.</p>
        </div>
        <div class="important-notice">
            <p><strong>Default Functions</strong>: Pre-built function groups like RC4 encryption/decryption are available for quick testing.</p>
        </div>
        <div class="important-notice">
            <p><strong>Custom Functions</strong>: Write your own JavaScript functions with JSDoc annotations for AI tool calling.</p>
        </div>
    `;
    
    tooltip.appendChild(tooltipContent);
    functionBtn.appendChild(tooltip);
    
    // Show tooltip on hover
    let hoverTimeout;
    functionBtn.addEventListener('mouseenter', function() {
        clearTimeout(hoverTimeout);
        hoverTimeout = setTimeout(() => {
            tooltip.classList.add('active');
        }, 500); // Delay before showing tooltip
    });
    
    functionBtn.addEventListener('mouseleave', function() {
        clearTimeout(hoverTimeout);
        tooltip.classList.remove('active');
    });
});