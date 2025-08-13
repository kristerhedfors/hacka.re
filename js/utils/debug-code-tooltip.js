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
        document.addEventListener('click', handleClick, true);
        
        console.log('[DebugCodeTooltip] Initialized');
    }
    
    /**
     * Create the tooltip and modal elements
     */
    function createTooltipElement() {
        // Create simple hover tooltip for filename:line
        tooltipElement = document.createElement('div');
        tooltipElement.className = 'debug-code-hover-tooltip';
        tooltipElement.style.display = 'none';
        document.body.appendChild(tooltipElement);
        
        // Create modal for syntax highlighted code
        createCodeModal();
    }
    
    /**
     * Create the code modal element
     */
    function createCodeModal() {
        const modalElement = document.createElement('div');
        modalElement.className = 'debug-code-modal';
        modalElement.style.display = 'none';
        modalElement.innerHTML = `
            <div class="debug-code-modal-backdrop"></div>
            <div class="debug-code-modal-content">
                <div class="debug-code-header">
                    <span class="debug-code-file"></span>
                    <span class="debug-code-location"></span>
                    <button class="debug-code-close">✕</button>
                </div>
                <div class="debug-code-content"></div>
            </div>
        `;
        document.body.appendChild(modalElement);
        
        // Store reference to modal
        window.debugCodeModal = modalElement;
        
        // Setup close handlers
        const closeBtn = modalElement.querySelector('.debug-code-close');
        const backdrop = modalElement.querySelector('.debug-code-modal-backdrop');
        
        closeBtn.addEventListener('click', closeCodeModal);
        backdrop.addEventListener('click', closeCodeModal);
        
        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modalElement.style.display !== 'none') {
                closeCodeModal();
            }
        });
    }
    
    /**
     * Handle mouse enter on elements - show simple hover tooltip
     */
    function handleMouseEnter(event) {
        // Check if target has closest method (is an Element)
        if (!event.target || typeof event.target.closest !== 'function') return;
        
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
        
        if (!sourceFile || !sourceLine) return;
        
        currentTarget = target;
        showSimpleTooltip(target, sourceFile, parseInt(sourceLine));
    }
    
    /**
     * Handle mouse leave on elements - hide simple tooltip
     */
    function handleMouseLeave(event) {
        // Check if target has closest method (is an Element)
        if (!event.target || typeof event.target.closest !== 'function') return;
        
        const target = event.target.closest('.debug-message');
        if (!target || target !== currentTarget) return;
        
        // Hide tooltip after a short delay
        hideTimeout = setTimeout(() => {
            hideSimpleTooltip();
        }, 300);
    }
    
    /**
     * Handle click on debug messages to show code modal
     */
    function handleClick(event) {
        const target = event.target.closest('.debug-message');
        if (!target) return;
        
        // Get source location from data attributes
        const sourceFile = target.getAttribute('data-source-file');
        const sourceLine = target.getAttribute('data-source-line');
        const sourcePath = target.getAttribute('data-source-path');
        
        if (!sourceFile || !sourceLine) return;
        
        // Prevent default behavior
        event.preventDefault();
        event.stopPropagation();
        
        // Hide simple tooltip if showing
        hideSimpleTooltip();
        
        // Show code modal
        showCodeModal(target, sourceFile, parseInt(sourceLine), sourcePath);
    }
    
    /**
     * Show simple hover tooltip with filename:line
     */
    function showSimpleTooltip(target, file, line) {
        // Update tooltip content
        tooltipElement.textContent = `${file}:${line}`;
        
        // Position tooltip
        positionSimpleTooltip(target);
        
        // Show tooltip
        tooltipElement.style.display = 'block';
        tooltipElement.classList.add('visible');
    }
    
    /**
     * Show code modal with syntax highlighted source
     */
    async function showCodeModal(target, file, line, fullPath) {
        const modalElement = window.debugCodeModal;
        if (!modalElement) return;
        
        // Update modal header
        const fileElement = modalElement.querySelector('.debug-code-file');
        const locationElement = modalElement.querySelector('.debug-code-location');
        fileElement.textContent = file;
        locationElement.textContent = `:${line}`;
        
        // Get message direction for context adjustment
        const messageDirection = target.getAttribute('data-message-direction') || 'forward';
        
        // Get source code with direction-aware context
        const codeContent = await getSourceCode(file, line, fullPath, messageDirection);
        
        // Update modal content
        const contentElement = modalElement.querySelector('.debug-code-content');
        contentElement.innerHTML = codeContent;
        
        // Show modal
        modalElement.style.display = 'block';
        modalElement.classList.add('visible');
    }
    
    /**
     * Hide simple tooltip
     */
    function hideSimpleTooltip() {
        if (tooltipElement) {
            tooltipElement.classList.remove('visible');
            setTimeout(() => {
                tooltipElement.style.display = 'none';
            }, 200);
        }
        currentTarget = null;
    }
    
    /**
     * Close code modal
     */
    function closeCodeModal() {
        const modalElement = window.debugCodeModal;
        if (modalElement) {
            modalElement.classList.remove('visible');
            setTimeout(() => {
                modalElement.style.display = 'none';
            }, 200);
        }
    }
    
    /**
     * Position simple tooltip relative to target element
     */
    function positionSimpleTooltip(target) {
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
    
    /**
     * Open source file in new tab with line highlighting
     */
    function openSourceFile(file, line, fullPath) {
        try {
            let fileUrl;
            
            // Try to extract path from fullPath if available (most reliable)
            if (fullPath) {
                const pathMatch = fullPath.match(/\/js\/.*?\.js/);
                if (pathMatch) {
                    fileUrl = pathMatch[0];
                }
            }
            
            // If we couldn't get it from fullPath, use smart path detection based on filename patterns
            if (!fileUrl) {
                if (file.includes('api-') || file === 'api-service.js' || file.includes('function-tools-') || file.includes('storage-') || file.includes('mcp-') || file.includes('chat-') || file.includes('prompts-') || file.includes('model-') || file.includes('encryption-') || file.includes('namespace-') || file.includes('debug-') || file.includes('link-sharing-')) {
                    fileUrl = `/js/services/${file}`;
                } else if (file.includes('settings-') || file.includes('api-key-') || file.includes('model-manager') || file.includes('system-prompt-')) {
                    fileUrl = `/js/components/settings/${file}`;
                } else if (file.includes('function-') && (file.includes('calling') || file.includes('editor') || file.includes('modal') || file.includes('list'))) {
                    fileUrl = `/js/components/function-calling/${file}`;
                } else if (file.includes('mcp-') && file.includes('manager')) {
                    fileUrl = `/js/components/mcp/${file}`;
                } else if (file.includes('prompt') && file.includes('manager')) {
                    fileUrl = `/js/components/prompts/${file}`;
                } else if (file.includes('ui-') || file.includes('share-ui')) {
                    fileUrl = `/js/components/ui/${file}`;
                } else if (file.includes('debug-code-tooltip') || file.includes('crypto-utils')) {
                    fileUrl = `/js/utils/${file}`;
                } else if (file.includes('manager') || file.includes('component')) {
                    fileUrl = `/js/components/${file}`;
                } else if (file.includes('default-') || file.includes('rc4-') || file.includes('math-') || file.includes('auth-')) {
                    fileUrl = `/js/default-functions/${file}`;
                } else {
                    // Fallback to services for most core files
                    fileUrl = `/js/services/${file}`;
                }
            }
            
            // Create URL with line number fragment
            const fullUrl = `${window.location.origin}${fileUrl}`;
            
            console.log(`[DebugCodeTooltip] Opening source file: ${fullUrl}#L${line}`);
            
            // Open in new tab
            const newTab = window.open(fullUrl, '_blank');
            
            if (newTab) {
                // Try to scroll to the line after the tab loads
                newTab.addEventListener('load', () => {
                    try {
                        // Wait a bit for content to load
                        setTimeout(() => {
                            // Try different methods to scroll to the line
                            scrollToLineInTab(newTab, line);
                        }, 500);
                    } catch (e) {
                        console.warn('[DebugCodeTooltip] Could not scroll to line in new tab:', e);
                    }
                });
                
                // Also set the hash fragment which some browsers use
                setTimeout(() => {
                    try {
                        if (newTab.location) {
                            newTab.location.hash = `L${line}`;
                        }
                    } catch (e) {
                        // Cross-origin restrictions might prevent this
                        console.warn('[DebugCodeTooltip] Could not set hash fragment:', e);
                    }
                }, 100);
            } else {
                console.warn('[DebugCodeTooltip] Failed to open new tab - popup blocked?');
            }
            
        } catch (error) {
            console.error('[DebugCodeTooltip] Error opening source file:', error);
        }
    }
    
    /**
     * Attempt to scroll to a specific line in the opened tab
     */
    function scrollToLineInTab(tab, line) {
        try {
            // Method 1: Try to find line numbers in a <pre> tag
            const pre = tab.document.querySelector('pre');
            if (pre) {
                const lines = pre.textContent.split('\n');
                if (lines.length >= line) {
                    // Calculate approximate scroll position
                    const lineHeight = 20; // Approximate line height
                    const scrollPosition = (line - 1) * lineHeight;
                    tab.scrollTo(0, scrollPosition);
                    return;
                }
            }
            
            // Method 2: Use line number hash fragments
            if (tab.location.hash !== `#L${line}`) {
                tab.location.hash = `L${line}`;
            }
            
            // Method 3: Try to search for line numbers in the document
            const textContent = tab.document.body.textContent || '';
            const linePattern = new RegExp(`^\\s*${line}[→\\s]`, 'm');
            const match = textContent.match(linePattern);
            if (match) {
                // Try to scroll to approximately the right position
                const beforeMatch = textContent.substring(0, match.index);
                const linesBefore = beforeMatch.split('\n').length;
                const lineHeight = 16;
                tab.scrollTo(0, linesBefore * lineHeight);
            }
            
        } catch (e) {
            console.warn('[DebugCodeTooltip] Could not scroll to line:', e);
        }
    }
    
    // Public API
    return {
        init
    };
})();