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
        
        // Get message direction for context adjustment
        const messageDirection = target.getAttribute('data-message-direction') || 'forward';
        
        // Get source code with direction-aware context
        const codeContent = await getSourceCode(file, line, fullPath, messageDirection);
        
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
    async function getSourceCode(file, line, fullPath, messageDirection = 'forward') {
        const cacheKey = `${file}:${line}:${messageDirection}`;
        
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
                        return formatSourceCode(text, line, file, messageDirection);
                    }
                }
                
                return formatFallbackCode(file, line);
            }
            
            const text = await response.text();
            const formatted = formatSourceCode(text, line, file, messageDirection);
            
            // Cache the result
            codeCache[cacheKey] = formatted;
            
            return formatted;
        } catch (error) {
            console.error('[DebugCodeTooltip] Error fetching source:', error);
            return formatFallbackCode(file, line);
        }
    }
    
    
    /**
     * Filter out debug-related lines from the display
     */
    function filterDebugLines(lines, startLine, targetLine) {
        const filteredLines = [];
        const originalLineNumbers = [];
        
        // First pass: identify debug lines
        const debugLines = new Set();
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            
            // Check for the consistent debug pattern: "// Debug logging" comment and if-statement
            const isDebugComment = trimmed === '// Debug logging';
            const isDebugIf = trimmed.startsWith('if (window.DebugService && window.DebugService.debugLog)');
            const isDebugCall = trimmed.includes('window.DebugService.debugLog(');
            const isDebugClosing = trimmed === '}' && i > 0 && lines[i-1].trim().includes('debugLog');
            
            if (isDebugComment || isDebugIf || isDebugCall || isDebugClosing) {
                debugLines.add(i);
            }
        }
        
        // Second pass: filter lines and handle blank lines after debug blocks
        for (let i = 0; i < lines.length; i++) {
            const lineNum = startLine + i;
            const line = lines[i];
            const trimmed = line.trim();
            
            // Skip debug-related lines
            if (debugLines.has(i)) {
                continue;
            }
            
            // Check if this is a blank line that immediately follows a debug block
            const isBlankLine = trimmed === '';
            if (isBlankLine) {
                // Look backwards to see if we just removed debug lines
                let justRemovedDebug = false;
                for (let j = i - 1; j >= 0; j--) {
                    if (debugLines.has(j)) {
                        justRemovedDebug = true;
                        break;
                    } else if (lines[j].trim() !== '') {
                        // Hit non-empty, non-debug line
                        break;
                    }
                }
                
                // Also look forwards to see if there are more blank lines or debug lines coming
                let hasContentAfter = false;
                for (let j = i + 1; j < lines.length; j++) {
                    if (debugLines.has(j)) {
                        continue; // Skip debug lines
                    } else if (lines[j].trim() !== '') {
                        hasContentAfter = true;
                        break;
                    }
                }
                
                // Skip blank line if it immediately follows removed debug code and there's content after
                if (justRemovedDebug && hasContentAfter) {
                    continue;
                }
            }
            
            filteredLines.push(line);
            originalLineNumbers.push(lineNum);
        }
        
        return { filteredLines, originalLineNumbers };
    }
    
    /**
     * Format source code with line numbers and highlighting
     */
    function formatSourceCode(text, targetLine, file, messageDirection = 'forward') {
        const lines = text.split('\n');
        
        // Base context lines (increased by 50% from original 3/8)
        let contextLinesBefore, contextLinesAfter;
        
        if (messageDirection === 'backward') {
            // For backward messages (like "saved", "completed"), show more context BEFORE
            contextLinesBefore = 8;  // More lines before to show what led to the action
            contextLinesAfter = 4;   // Fewer lines after since action is complete
        } else {
            // For forward messages (like "starting", "processing"), show more context AFTER  
            contextLinesBefore = 4;  // Fewer lines before
            contextLinesAfter = 8;   // More lines after to show what happens next
        }
        
        // Increase overall by 50% (from original 3+8=11 to ~17)
        contextLinesBefore = Math.ceil(contextLinesBefore * 1.5);
        contextLinesAfter = Math.ceil(contextLinesAfter * 1.5);
        
        const startLine = Math.max(1, targetLine - contextLinesBefore);
        const endLine = Math.min(lines.length, targetLine + contextLinesAfter);
        
        // Get the raw lines for this section
        const rawLines = lines.slice(startLine - 1, endLine);
        
        // Filter out debug-related lines
        const { filteredLines, originalLineNumbers } = filterDebugLines(rawLines, startLine, targetLine);
        
        if (filteredLines.length === 0) {
            // Fallback if all lines were filtered out
            return formatFallbackCode(file, targetLine);
        }
        
        // Extract the code snippet from filtered lines
        const codeSnippet = filteredLines.join('\n');
        
        // Apply syntax highlighting with highlight.js if available
        let highlightedCode = codeSnippet;
        if (window.hljs) {
            try {
                const result = window.hljs.highlight(codeSnippet, { language: 'javascript' });
                highlightedCode = result.value;
            } catch (e) {
                console.warn('[DebugCodeTooltip] Failed to highlight code:', e);
                highlightedCode = escapeHtml(codeSnippet);
            }
        } else {
            highlightedCode = escapeHtml(codeSnippet);
        }
        
        // Split highlighted code back into lines
        const highlightedLines = highlightedCode.split('\n');
        
        // Build the final HTML with line numbers (NO line highlighting)
        let html = '<pre class="debug-code-pre"><code class="language-javascript">';
        
        highlightedLines.forEach((line, index) => {
            const lineNum = originalLineNumbers[index];
            
            html += `<div class="debug-code-line">`;
            html += `<span class="line-number">${lineNum.toString().padStart(4, ' ')}</span>`;
            html += `<span class="line-content">${line || ' '}</span>`;
            html += '</div>';
        });
        
        html += '</code></pre>';
        
        return html;
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