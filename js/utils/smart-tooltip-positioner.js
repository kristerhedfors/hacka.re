/**
 * Smart Tooltip Positioner
 * Dynamically positions tooltips to stay within the viewport
 */

window.SmartTooltipPositioner = (function() {
    'use strict';
    
    // Configuration
    const CONFIG = {
        MARGIN: 10,        // Minimum margin from viewport edges
        ARROW_SIZE: 6,     // Arrow size in pixels
        PREFERRED_SIDE: 'right'  // Default preferred position
    };
    
    /**
     * Calculate the best position for a tooltip relative to an icon
     * @param {HTMLElement} icon - The icon element
     * @param {HTMLElement} tooltip - The tooltip element
     * @returns {Object} - Position information
     */
    function calculateOptimalPosition(icon, tooltip) {
        // Get icon position relative to viewport
        const iconRect = icon.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        // Get viewport dimensions
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Calculate available space in each direction
        const spaceRight = viewportWidth - iconRect.right;
        const spaceLeft = iconRect.left;
        const spaceTop = iconRect.top;
        const spaceBottom = viewportHeight - iconRect.bottom;
        
        // Determine the best position based on available space
        let position = 'right'; // default
        let x, y;
        
        // Check if tooltip fits on the right (preferred)
        if (spaceRight >= tooltipRect.width + CONFIG.MARGIN) {
            position = 'right';
            x = iconRect.right + CONFIG.MARGIN;
            y = Math.max(CONFIG.MARGIN, 
                Math.min(iconRect.top + (iconRect.height / 2) - (tooltipRect.height / 2),
                         viewportHeight - tooltipRect.height - CONFIG.MARGIN));
        }
        // Check if tooltip fits on the left
        else if (spaceLeft >= tooltipRect.width + CONFIG.MARGIN) {
            position = 'left';
            x = iconRect.left - tooltipRect.width - CONFIG.MARGIN;
            y = Math.max(CONFIG.MARGIN,
                Math.min(iconRect.top + (iconRect.height / 2) - (tooltipRect.height / 2),
                         viewportHeight - tooltipRect.height - CONFIG.MARGIN));
        }
        // Check if tooltip fits on top
        else if (spaceTop >= tooltipRect.height + CONFIG.MARGIN) {
            position = 'top';
            x = Math.max(CONFIG.MARGIN,
                Math.min(iconRect.left + (iconRect.width / 2) - (tooltipRect.width / 2),
                         viewportWidth - tooltipRect.width - CONFIG.MARGIN));
            y = iconRect.top - tooltipRect.height - CONFIG.MARGIN;
        }
        // Check if tooltip fits on bottom
        else if (spaceBottom >= tooltipRect.height + CONFIG.MARGIN) {
            position = 'bottom';
            x = Math.max(CONFIG.MARGIN,
                Math.min(iconRect.left + (iconRect.width / 2) - (tooltipRect.width / 2),
                         viewportWidth - tooltipRect.width - CONFIG.MARGIN));
            y = iconRect.bottom + CONFIG.MARGIN;
        }
        // Fallback: position with maximum available space
        else {
            const maxSpace = Math.max(spaceRight, spaceLeft, spaceTop, spaceBottom);
            if (maxSpace === spaceRight) {
                position = 'right';
                x = iconRect.right + CONFIG.MARGIN;
                y = CONFIG.MARGIN;
            } else if (maxSpace === spaceLeft) {
                position = 'left';
                x = Math.max(CONFIG.MARGIN, iconRect.left - tooltipRect.width - CONFIG.MARGIN);
                y = CONFIG.MARGIN;
            } else if (maxSpace === spaceTop) {
                position = 'top';
                x = CONFIG.MARGIN;
                y = Math.max(CONFIG.MARGIN, iconRect.top - tooltipRect.height - CONFIG.MARGIN);
            } else {
                position = 'bottom';
                x = CONFIG.MARGIN;
                y = iconRect.bottom + CONFIG.MARGIN;
            }
        }
        
        return {
            position,
            x: Math.round(x),
            y: Math.round(y),
            iconRect
        };
    }
    
    /**
     * Position the tooltip arrow based on tooltip position
     * @param {HTMLElement} tooltip - The tooltip element
     * @param {Object} positionInfo - Position information from calculateOptimalPosition
     */
    function positionArrow(tooltip, positionInfo) {
        const arrow = tooltip.querySelector('::after') || tooltip;
        const { position, iconRect } = positionInfo;
        const tooltipRect = tooltip.getBoundingClientRect();
        
        // Calculate arrow position relative to tooltip
        let arrowStyles = '';
        
        switch (position) {
            case 'right':
                arrowStyles = `
                    left: 0;
                    top: 50%;
                    transform: translateX(-50%) translateY(-50%);
                    border-width: ${CONFIG.ARROW_SIZE}px ${CONFIG.ARROW_SIZE}px ${CONFIG.ARROW_SIZE}px 0;
                    border-color: transparent rgba(0, 0, 0, 0.9) transparent transparent;
                `;
                break;
            case 'left':
                arrowStyles = `
                    right: 0;
                    top: 50%;
                    transform: translateX(50%) translateY(-50%);
                    border-width: ${CONFIG.ARROW_SIZE}px 0 ${CONFIG.ARROW_SIZE}px ${CONFIG.ARROW_SIZE}px;
                    border-color: transparent transparent transparent rgba(0, 0, 0, 0.9);
                `;
                break;
            case 'top':
                arrowStyles = `
                    bottom: 0;
                    left: 50%;
                    transform: translateX(-50%) translateY(50%);
                    border-width: ${CONFIG.ARROW_SIZE}px ${CONFIG.ARROW_SIZE}px 0 ${CONFIG.ARROW_SIZE}px;
                    border-color: rgba(0, 0, 0, 0.9) transparent transparent transparent;
                `;
                break;
            case 'bottom':
                arrowStyles = `
                    top: 0;
                    left: 50%;
                    transform: translateX(-50%) translateY(-50%);
                    border-width: 0 ${CONFIG.ARROW_SIZE}px ${CONFIG.ARROW_SIZE}px ${CONFIG.ARROW_SIZE}px;
                    border-color: transparent transparent rgba(0, 0, 0, 0.9) transparent;
                `;
                break;
        }
        
        // Apply arrow styles using CSS custom properties
        tooltip.style.setProperty('--arrow-styles', arrowStyles);
        
        // Also apply via a style tag for ::after pseudo-element
        const styleId = `tooltip-arrow-${Date.now()}`;
        let styleElement = document.getElementById(styleId);
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = styleId;
            document.head.appendChild(styleElement);
        }
        
        styleElement.textContent = `
            .function-icon-tooltip[data-position="${position}"]::after {
                ${arrowStyles}
            }
        `;
        
        tooltip.setAttribute('data-position', position);
    }
    
    /**
     * Position a tooltip relative to its icon
     * @param {HTMLElement} icon - The icon element
     * @param {HTMLElement} tooltip - The tooltip element
     */
    function positionTooltip(icon, tooltip) {
        console.log('[SmartTooltip] positionTooltip called', { icon, tooltip });
        
        // Make tooltip visible but transparent to measure it
        tooltip.style.visibility = 'visible';
        tooltip.style.opacity = '0';
        tooltip.style.pointerEvents = 'none';
        
        // Calculate optimal position
        const positionInfo = calculateOptimalPosition(icon, tooltip);
        console.log('[SmartTooltip] Position calculated:', positionInfo);
        
        // Apply position
        tooltip.style.left = `${positionInfo.x}px`;
        tooltip.style.top = `${positionInfo.y}px`;
        tooltip.style.transform = 'translate(0, 0)';
        
        // Position arrow
        positionArrow(tooltip, positionInfo);
        
        // Show tooltip
        requestAnimationFrame(() => {
            tooltip.style.opacity = '1';
            tooltip.style.pointerEvents = 'auto';
            console.log('[SmartTooltip] Tooltip should now be visible');
        });
    }
    
    /**
     * Initialize smart positioning for all tooltips
     */
    function initializeSmartPositioning() {
        // Override the default hover behavior
        document.addEventListener('mouseenter', function(event) {
            const icon = event.target;
            if (!icon || !icon.classList) {
                return;
            }
            
            // Skip header function button - it has its own tooltip
            if (icon.closest('#function-btn') || icon.id === 'function-btn') {
                return;
            }
            
            if (!icon.classList.contains('function-call-icon') && 
                !icon.classList.contains('function-result-icon')) {
                return;
            }
            
            console.log('[SmartTooltip] Mouse entered function icon:', icon.className);
            
            const tooltip = icon.querySelector('.function-icon-tooltip');
            if (!tooltip) {
                console.log('[SmartTooltip] No tooltip found for icon');
                return;
            }
            
            console.log('[SmartTooltip] Tooltip found, positioning...');
            // Position tooltip smartly
            positionTooltip(icon, tooltip);
        }, true);
        
        document.addEventListener('mouseleave', function(event) {
            const icon = event.target;
            if (!icon || !icon.classList) {
                return;
            }
            
            // Skip header function button - it has its own tooltip
            if (icon.closest('#function-btn') || icon.id === 'function-btn') {
                return;
            }
            
            if (!icon.classList.contains('function-call-icon') && 
                !icon.classList.contains('function-result-icon')) {
                return;
            }
            
            const tooltip = icon.querySelector('.function-icon-tooltip');
            if (!tooltip) return;
            
            // Hide tooltip
            tooltip.style.opacity = '0';
            tooltip.style.pointerEvents = 'none';
            tooltip.style.visibility = 'hidden';
        }, true);
        
        // Handle clicks on function icons
        document.addEventListener('click', function(event) {
            // Find the actual icon element (event.target might be a child)
            const icon = event.target.closest('.function-call-icon, .function-result-icon');
            if (!icon) {
                return;
            }
            
            // Skip header function button - it has its own handler
            if (icon.closest('#function-btn') || icon.id === 'function-btn') {
                return;
            }
            
            console.log('[SmartTooltip] Click detected on function icon:', icon.className);
            
            // Hide all tooltips when clicking an icon
            const allTooltips = document.querySelectorAll('.function-icon-tooltip');
            allTooltips.forEach(tooltip => {
                tooltip.style.opacity = '0';
                tooltip.style.pointerEvents = 'none';
                tooltip.style.visibility = 'hidden';
            });
            
            // Extract function details from data attributes using getAttribute
            const functionName = icon.getAttribute('data-function-name');
            const type = icon.getAttribute('data-type');
            
            console.log('[SmartTooltip] Function data found:', { functionName, type });
            
            if (!functionName || !type) {
                console.error('[SmartTooltip] Missing function data on icon, trying fallback method');
                console.log('[SmartTooltip] Available attributes:', Array.from(icon.attributes).map(attr => attr.name));
                
                // Fallback: try to parse from tooltip content
                const tooltip = icon.querySelector('.function-icon-tooltip');
                if (tooltip) {
                    const tooltipHtml = tooltip.innerHTML;
                    console.log('[SmartTooltip] Tooltip HTML:', tooltipHtml);
                    
                    // Parse function name from tooltip
                    const funcMatch = tooltipHtml.match(/<strong>(?:Function|Result):<\/strong>\s*([^<\n]+)/);
                    if (funcMatch) {
                        let parsedFunctionName = funcMatch[1].trim().replace(' (Result)', '');
                        const parsedType = icon.classList.contains('function-call-icon') ? 'call' : 'result';
                        
                        // Handle "undefined" function name for results
                        if (parsedFunctionName === 'undefined' && parsedType === 'result') {
                            // Try to find the actual function name from a call icon in the same message
                            const messageEl = icon.closest('.message, .assistant-message, .user-message');
                            if (messageEl) {
                                const callIcon = messageEl.querySelector('.function-call-icon');
                                if (callIcon) {
                                    const callTooltip = callIcon.querySelector('.function-icon-tooltip');
                                    if (callTooltip) {
                                        const callMatch = callTooltip.innerHTML.match(/<strong>Function:<\/strong>\s*([^<\n]+)/);
                                        if (callMatch && callMatch[1]) {
                                            parsedFunctionName = callMatch[1].trim();
                                        }
                                    }
                                }
                            }
                            // If still undefined, use a placeholder
                            if (parsedFunctionName === 'undefined') {
                                parsedFunctionName = 'Function Result';
                            }
                        }
                        
                        console.log('[SmartTooltip] Parsed from tooltip:', { parsedFunctionName, parsedType });
                        
                        let modalData = {
                            functionName: parsedFunctionName,
                            type: parsedType
                        };
                        
                        if (parsedType === 'call') {
                            // Parse parameters from tooltip
                            const paramMatch = tooltipHtml.match(/<strong>Parameters:<\/strong>\s*<br>([^<]*(?:<br>[^<]*)*)/);
                            if (paramMatch) {
                                try {
                                    const paramText = paramMatch[1].replace(/<br>/g, '\n').trim();
                                    modalData.parameters = JSON.parse(paramText);
                                } catch (e) {
                                    modalData.parameters = {};
                                }
                            } else {
                                modalData.parameters = {};
                            }
                        } else if (parsedType === 'result') {
                            // Parse result data from tooltip
                            const typeMatch = tooltipHtml.match(/<strong>Type:<\/strong>\s*([^<\n]+)/);
                            const timeMatch = tooltipHtml.match(/<strong>Time:<\/strong>\s*([^<\n]+)/);
                            const valueMatch = tooltipHtml.match(/<strong>Value:<\/strong>\s*<br>([^]*)/);
                            
                            modalData.resultType = typeMatch ? typeMatch[1].trim() : 'unknown';
                            
                            if (timeMatch) {
                                const timeStr = timeMatch[1].trim();
                                modalData.executionTime = timeStr.includes('ms') ? 
                                    parseInt(timeStr.replace('ms', '')) : 0;
                            } else {
                                modalData.executionTime = 0;
                            }
                            
                            if (valueMatch) {
                                try {
                                    const valueText = valueMatch[1]
                                        .replace(/<br>/g, '\n')
                                        .replace(/&lt;/g, '<')
                                        .replace(/&gt;/g, '>')
                                        .replace(/&quot;/g, '"')
                                        .replace(/&amp;/g, '&')
                                        .trim();
                                    modalData.resultValue = JSON.parse(valueText);
                                } catch (e) {
                                    modalData.resultValue = valueMatch[1];
                                }
                            }
                        }
                        
                        // Show modal with parsed data - use new tabbed modal
                        if (window.FunctionDetailsTabbedModal) {
                            console.log('[SmartTooltip] Showing tabbed modal with parsed data:', modalData);
                            window.FunctionDetailsTabbedModal.showModal(modalData);
                        } else if (window.FunctionDetailsModal) {
                            // Fallback to old modal if new one isn't loaded
                            console.log('[SmartTooltip] Showing modal with parsed data:', modalData);
                            window.FunctionDetailsModal.showModal(modalData);
                        }
                        return;
                    }
                }
                
                console.error('[SmartTooltip] Could not extract function data from tooltip either');
                return;
            }
            
            let modalData = {
                functionName,
                type
            };
            
            if (type === 'call') {
                // Parse parameters from data attribute
                const parametersAttr = icon.getAttribute('data-parameters');
                try {
                    modalData.parameters = JSON.parse(parametersAttr || '{}');
                } catch (e) {
                    console.warn('[SmartTooltip] Failed to parse parameters:', e);
                    modalData.parameters = {};
                }
            } else if (type === 'result') {
                // Parse result data from attributes
                modalData.resultType = icon.getAttribute('data-result-type') || '';
                modalData.executionTime = parseInt(icon.getAttribute('data-execution-time')) || 0;
                
                const resultValueAttr = icon.getAttribute('data-result-value');
                try {
                    modalData.resultValue = JSON.parse(resultValueAttr || 'null');
                } catch (e) {
                    console.warn('[SmartTooltip] Failed to parse result value:', e);
                    modalData.resultValue = resultValueAttr;
                }
            }
            
            // Show the function details modal - use new tabbed modal
            if (window.FunctionDetailsTabbedModal) {
                console.log('[SmartTooltip] Showing function details tabbed modal with data:', modalData);
                window.FunctionDetailsTabbedModal.showModal(modalData);
            } else if (window.FunctionDetailsModal) {
                // Fallback to old modal if new one isn't loaded
                console.log('[SmartTooltip] Showing function details modal with data:', modalData);
                window.FunctionDetailsModal.showModal(modalData);
            } else {
                console.error('[SmartTooltip] FunctionDetailsModal not available');
            }
        }, true);
        
        // Handle window resize
        window.addEventListener('resize', function() {
            // Hide all visible tooltips on resize
            document.querySelectorAll('.function-icon-tooltip[style*="opacity: 1"]').forEach(tooltip => {
                tooltip.style.opacity = '0';
                tooltip.style.pointerEvents = 'none';
                tooltip.style.visibility = 'hidden';
            });
        });
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeSmartPositioning);
    } else {
        initializeSmartPositioning();
    }
    
    // Public API
    return {
        positionTooltip,
        calculateOptimalPosition
    };
})();