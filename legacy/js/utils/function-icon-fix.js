/**
 * Function Icon Fix
 * Directly fixes the header function icon when CSS fails
 */

(function() {
    'use strict';
    
    function fixFunctionIcon() {
        console.log('[FunctionIconFix] Attempting to fix function icon...');
        
        // Find the function icon element
        const functionBtn = document.getElementById('function-btn');
        if (!functionBtn) {
            console.log('[FunctionIconFix] Function button not found');
            return;
        }
        
        const functionIcon = functionBtn.querySelector('.function-icon');
        if (!functionIcon) {
            console.log('[FunctionIconFix] Function icon span not found');
            return;
        }
        
        console.log('[FunctionIconFix] Found function icon element:', functionIcon);
        
        // Just log that we found the element - don't modify it
        console.log('[FunctionIconFix] Found function icon element:', functionIcon);
        console.log('[FunctionIconFix] Original content:', functionIcon.textContent);
        console.log('[FunctionIconFix] Original innerHTML:', functionIcon.innerHTML);
        
        // Let CSS handle the styling - don't interfere with JavaScript
        
        // Remove any permanent tooltips
        const permanentTooltips = document.querySelectorAll('[title]');
        permanentTooltips.forEach(el => {
            if (el.title === 'Function Calling') {
                el.removeAttribute('title');
                console.log('[FunctionIconFix] Removed permanent tooltip');
            }
        });
    }
    
    // Try multiple times to ensure it works
    function tryFix() {
        fixFunctionIcon();
        
        // Try again after DOM is fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fixFunctionIcon);
        }
        
        // Try again after everything is loaded
        window.addEventListener('load', fixFunctionIcon);
        
        // Try again after a short delay
        setTimeout(fixFunctionIcon, 1000);
        setTimeout(fixFunctionIcon, 3000);
    }
    
    tryFix();
})();