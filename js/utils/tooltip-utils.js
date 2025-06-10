/**
 * Tooltip Utilities
 * Simplified tooltip behavior for function icons
 */

window.TooltipUtils = (function() {
    
    const HIDE_DELAY = 300;
    
    /**
     * Show tooltip
     * @param {HTMLElement} tooltip - Tooltip element
     */
    function showTooltip(tooltip) {
        if (tooltip) {
            tooltip.style.opacity = '1';
            tooltip.style.pointerEvents = 'auto';
        }
    }
    
    /**
     * Hide tooltip with delay
     * @param {HTMLElement} tooltip - Tooltip element
     */
    function hideTooltipWithDelay(tooltip) {
        if (!tooltip) return;
        
        setTimeout(() => {
            try {
                // Only hide if the mouse is not over the tooltip
                if (!tooltip.matches(':hover')) {
                    tooltip.style.opacity = '0';
                    tooltip.style.pointerEvents = 'none';
                }
            } catch (e) {
                console.error('Error in tooltip hover check:', e);
            }
        }, HIDE_DELAY);
    }
    
    /**
     * Handle mouse enter event
     * @param {Event} event - Mouse enter event
     */
    function handleMouseEnter(event) {
        if (!event.target || !event.target.classList) {
            return;
        }
        
        // Check if the target is a function icon or its tooltip
        const isCallIcon = event.target.classList.contains('function-call-icon');
        const isResultIcon = event.target.classList.contains('function-result-icon');
        const isTooltip = event.target.closest('.function-icon-tooltip');
        
        if (isCallIcon || isResultIcon || isTooltip) {
            // Find the tooltip
            let tooltip;
            if (isCallIcon || isResultIcon) {
                tooltip = event.target.querySelector('.function-icon-tooltip');
            } else {
                tooltip = isTooltip;
            }
            
            showTooltip(tooltip);
        }
    }
    
    /**
     * Handle mouse leave event
     * @param {Event} event - Mouse leave event
     */
    function handleMouseLeave(event) {
        if (!event.target || !event.target.classList) {
            return;
        }
        
        try {
            // Check if we're leaving a function icon and not entering its tooltip
            const isLeavingCallIcon = event.target.classList.contains('function-call-icon');
            const isLeavingResultIcon = event.target.classList.contains('function-result-icon');
            const isEnteringTooltip = event.relatedTarget && 
                                     event.relatedTarget.closest('.function-icon-tooltip');
            
            if ((isLeavingCallIcon || isLeavingResultIcon) && !isEnteringTooltip) {
                const tooltip = event.target.querySelector('.function-icon-tooltip');
                hideTooltipWithDelay(tooltip);
            }
            
            // Check if we're leaving a tooltip and not entering its parent icon
            const isLeavingTooltip = event.target.closest('.function-icon-tooltip');
            const isEnteringCallIcon = event.relatedTarget && 
                                      event.relatedTarget.classList.contains('function-call-icon');
            const isEnteringResultIcon = event.relatedTarget && 
                                        event.relatedTarget.classList.contains('function-result-icon');
            const isEnteringAnotherTooltip = event.relatedTarget && 
                                           event.relatedTarget.closest('.function-icon-tooltip');
            
            if (isLeavingTooltip && !isEnteringCallIcon && !isEnteringResultIcon && !isEnteringAnotherTooltip) {
                hideTooltipWithDelay(isLeavingTooltip);
            }
        } catch (e) {
            console.error('Error in mouseleave handler:', e);
        }
    }
    
    /**
     * Initialize tooltip behavior for function icons
     */
    function initTooltipBehavior() {
        console.log('Initializing tooltip behavior');
        
        // Use event delegation to handle mouseenter/mouseleave events
        document.addEventListener('mouseenter', handleMouseEnter, true);
        document.addEventListener('mouseleave', handleMouseLeave, true);
        
        console.log('Tooltip behavior event listeners initialized');
    }
    
    /**
     * Remove tooltip behavior event listeners
     */
    function destroyTooltipBehavior() {
        document.removeEventListener('mouseenter', handleMouseEnter, true);
        document.removeEventListener('mouseleave', handleMouseLeave, true);
        console.log('Tooltip behavior event listeners removed');
    }
    
    // Initialize tooltip behavior when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTooltipBehavior);
    } else {
        initTooltipBehavior();
    }
    
    // Public API
    return {
        initTooltipBehavior,
        destroyTooltipBehavior,
        showTooltip,
        hideTooltipWithDelay
    };
})();