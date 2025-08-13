/**
 * Debug Code Tooltip Module
 * Shows source code context when hovering over debug messages
 */

window.DebugCodeTooltip = (function() {
    let tooltipElement = null;
    let currentTarget = null;
    let hideTimeout = null;
    let codeCache = {};
    
    /**
     * Initialize the debug code tooltip system
     */
    function init() {
        // Create tooltip element
        createTooltipElement();
        
        // Setup event delegation for debug messages
        document.addEventListener('mouseenter', handleMouseEnter, true);
        document.addEventListener('mouseleave', handleMouseLeave, true);
        
        console.log('[DebugCodeTooltip] Initialized');
    }
    
    /**
     * Create the tooltip element
     */
    function createTooltipElement() {
        tooltipElement = document.createElement('div');
        tooltipElement.className = 'debug-code-tooltip';
        tooltipElement.style.display = 'none';
        tooltipElement.innerHTML = `
            <div class="debug-code-header">
                <span class="debug-code-file"></span>
                <span class="debug-code-location"></span>
            </div>
            <div class="debug-code-content"></div>
        `;
        document.body.appendChild(tooltipElement);
    }
    
    /**
     * Handle mouse enter on elements
     */
    function handleMouseEnter(event) {
        const target = event.target.closest('.debug-message');
        if (!target) return;
        
        // Clear any pending hide
        if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
        }
        
        // Get source location from data attributes
        const sourceFile = target.getAttribute('data-source-file');
        const sourceLine = target.getAttribute('data-source-line');
        const sourcePath = target.getAttribute('data-source-path');
        
        if (!sourceFile || !sourceLine) return;
        
        currentTarget = target;
        showTooltip(target, sourceFile, parseInt(sourceLine), sourcePath);
    }
    
    /**
     * Handle mouse leave on elements
     */
    function handleMouseLeave(event) {
        const target = event.target.closest('.debug-message');
        if (!target || target !== currentTarget) return;
        
        // Hide tooltip after a short delay
        hideTimeout = setTimeout(() => {
            hideTooltip();
        }, 300);
    }
    
    /**
     * Show tooltip with source code
     */
    async function showTooltip(target, file, line, fullPath) {
        // Update tooltip header
        const fileElement = tooltipElement.querySelector('.debug-code-file');
        const locationElement = tooltipElement.querySelector('.debug-code-location');
        fileElement.textContent = file;
        locationElement.textContent = `:${line}`;
        
        // Get source code
        const codeContent = await getSourceCode(file, line, fullPath);
        
        // Update tooltip content
        const contentElement = tooltipElement.querySelector('.debug-code-content');
        contentElement.innerHTML = codeContent;
        
        // Position tooltip
        positionTooltip(target);
        
        // Show tooltip
        tooltipElement.style.display = 'block';
        tooltipElement.classList.add('visible');
    }
    
    /**
     * Hide tooltip
     */
    function hideTooltip() {
        if (tooltipElement) {
            tooltipElement.classList.remove('visible');
            setTimeout(() => {
                tooltipElement.style.display = 'none';
            }, 200);
        }
        currentTarget = null;
    }
    
    /**
     * Position tooltip relative to target element
     */
    function positionTooltip(target) {
        const rect = target.getBoundingClientRect();
        const tooltipRect = tooltipElement.getBoundingClientRect();
        
        // Calculate position
        let top = rect.top - tooltipRect.height - 10;
        let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
        
        // Adjust if tooltip would go off screen
        if (top < 10) {
            top = rect.bottom + 10;
        }
        
        if (left < 10) {
            left = 10;
        } else if (left + tooltipRect.width > window.innerWidth - 10) {
            left = window.innerWidth - tooltipRect.width - 10;
        }
        
        tooltipElement.style.top = top + 'px';
        tooltipElement.style.left = left + 'px';
    }
    
    /**
     * Get source code around the specified line
     */
    async function getSourceCode(file, line, fullPath) {
        const cacheKey = `${file}:${line}`;
        
        // Check cache first
        if (codeCache[cacheKey]) {
            return codeCache[cacheKey];
        }
        
        try {
            // Try to fetch the source file
            const response = await fetch(`/js/${file}`);
            if (!response.ok) {
                // Try services or components subdirectories
                const paths = [
                    `/js/services/${file}`,
                    `/js/components/${file}`,
                    `/js/components/settings/${file}`,
                    `/js/utils/${file}`
                ];
                
                for (const path of paths) {
                    const res = await fetch(path);
                    if (res.ok) {
                        const text = await res.text();
                        return formatSourceCode(text, line, file);
                    }
                }
                
                return formatFallbackCode(file, line);
            }
            
            const text = await response.text();
            const formatted = formatSourceCode(text, line, file);
            
            // Cache the result
            codeCache[cacheKey] = formatted;
            
            return formatted;
        } catch (error) {
            console.error('[DebugCodeTooltip] Error fetching source:', error);
            return formatFallbackCode(file, line);
        }
    }
    
    /**
     * Format source code with line numbers and highlighting
     */
    function formatSourceCode(text, targetLine, file) {
        const lines = text.split('\n');
        const contextLines = 5; // Show 5 lines before and after
        const startLine = Math.max(1, targetLine - contextLines);
        const endLine = Math.min(lines.length, targetLine + contextLines);
        
        let html = '<pre class="debug-code-pre"><code class="javascript">';
        
        for (let i = startLine; i <= endLine; i++) {
            const lineNum = i;
            const lineContent = escapeHtml(lines[i - 1] || '');
            const isTarget = i === targetLine;
            
            html += `<div class="debug-code-line ${isTarget ? 'highlight' : ''}">`;
            html += `<span class="line-number">${lineNum.toString().padStart(4, ' ')}</span>`;
            html += `<span class="line-content">${lineContent}</span>`;
            html += '</div>';
        }
        
        html += '</code></pre>';
        
        // Apply syntax highlighting if marked is available
        if (window.marked && window.marked.parse) {
            // Wrap in markdown code block for syntax highlighting
            const markdown = '```javascript\n' + lines.slice(startLine - 1, endLine).join('\n') + '\n```';
            const highlighted = window.marked.parse(markdown);
            
            // Re-add line numbers to highlighted code
            return addLineNumbersToHighlighted(highlighted, startLine, targetLine);
        }
        
        return html;
    }
    
    /**
     * Add line numbers to syntax-highlighted code
     */
    function addLineNumbersToHighlighted(html, startLine, targetLine) {
        // Extract the code content from the highlighted HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const codeElement = tempDiv.querySelector('code');
        
        if (!codeElement) return html;
        
        const lines = codeElement.innerHTML.split('\n').filter(line => line.trim() !== '');
        let result = '<pre class="debug-code-pre"><code class="javascript">';
        
        lines.forEach((line, index) => {
            const lineNum = startLine + index;
            const isTarget = lineNum === targetLine;
            
            result += `<div class="debug-code-line ${isTarget ? 'highlight' : ''}">`;
            result += `<span class="line-number">${lineNum.toString().padStart(4, ' ')}</span>`;
            result += `<span class="line-content">${line}</span>`;
            result += '</div>';
        });
        
        result += '</code></pre>';
        return result;
    }
    
    /**
     * Format fallback code when source is not available
     */
    function formatFallbackCode(file, line) {
        return `
            <div class="debug-code-fallback">
                <p>Source: <strong>${file}:${line}</strong></p>
                <p class="debug-code-hint">Source code not available</p>
            </div>
        `;
    }
    
    /**
     * Escape HTML characters
     */
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
    
    // Public API
    return {
        init
    };
})();