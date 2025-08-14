/**
 * Debug Code Tooltip Module
 * Shows source code context when clicking debug messages
 * Click message to show tooltip, click elsewhere or same message to hide
 */

window.DebugCodeTooltip = (function() {
    let tooltipElement = null;
    let currentTarget = null;
    let codeCache = {};
    
    /**
     * Initialize the debug code tooltip system
     */
    function init() {
        // Create tooltip element
        createTooltipElement();
        
        // Setup event delegation for debug messages - CLICK ONLY, no hover
        document.addEventListener('click', handleClick, true);
        
        console.log('[DebugCodeTooltip] Initialized - Click to show tooltip');
    }
    
    /**
     * Create the tooltip element
     */
    function createTooltipElement() {
        tooltipElement = document.createElement('div');
        tooltipElement.className = 'debug-code-tooltip';
        tooltipElement.style.display = 'none';
        tooltipElement.innerHTML = `
            <div class="debug-code-header draggable-header">
                <span class="debug-code-file"></span>
                <span class="debug-code-location"></span>
                <span class="debug-code-hint clickable-hint">📄 Click to open file</span>
            </div>
            <div class="debug-code-content"></div>
            <div class="resize-handle resize-handle-n"></div>
            <div class="resize-handle resize-handle-s"></div>
            <div class="resize-handle resize-handle-e"></div>
            <div class="resize-handle resize-handle-w"></div>
            <div class="resize-handle resize-handle-ne"></div>
            <div class="resize-handle resize-handle-nw"></div>
            <div class="resize-handle resize-handle-se"></div>
            <div class="resize-handle resize-handle-sw"></div>
        `;
        document.body.appendChild(tooltipElement);
        
        // Initialize drag and resize functionality
        initializeDragAndResize();
    }
    
    /**
     * Check if we're on a mobile device
     */
    function isMobileDevice() {
        return window.innerWidth <= 768;
    }

    /**
     * Initialize drag and resize functionality for the tooltip
     */
    function initializeDragAndResize() {
        let isDragging = false;
        let isResizing = false;
        let dragStartX = 0;
        let dragStartY = 0;
        let resizeDirection = null;
        let initialRect = null;
        
        // Drag functionality
        const header = tooltipElement.querySelector('.draggable-header');
        const hint = tooltipElement.querySelector('.clickable-hint');
        
        header.addEventListener('mousedown', (e) => {
            // Don't start drag if clicking on the hint or on mobile devices
            if (e.target === hint || hint.contains(e.target) || isMobileDevice()) {
                return;
            }
            
            isDragging = true;
            dragStartX = e.clientX - tooltipElement.offsetLeft;
            dragStartY = e.clientY - tooltipElement.offsetTop;
            header.style.cursor = 'grabbing';
            e.preventDefault();
        });
        
        // Resize functionality
        const resizeHandles = tooltipElement.querySelectorAll('.resize-handle');
        resizeHandles.forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                // Don't allow resize on mobile devices
                if (isMobileDevice()) {
                    return;
                }
                
                isResizing = true;
                resizeDirection = handle.className.split(' ')[1]; // Get direction class
                initialRect = tooltipElement.getBoundingClientRect();
                dragStartX = e.clientX;
                dragStartY = e.clientY;
                e.preventDefault();
                e.stopPropagation();
            });
        });
        
        // Global mouse move handler
        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                const newX = e.clientX - dragStartX;
                const newY = e.clientY - dragStartY;
                
                // Keep tooltip within viewport bounds
                const maxX = window.innerWidth - tooltipElement.offsetWidth;
                const maxY = window.innerHeight - tooltipElement.offsetHeight;
                
                tooltipElement.style.left = Math.max(0, Math.min(newX, maxX)) + 'px';
                tooltipElement.style.top = Math.max(0, Math.min(newY, maxY)) + 'px';
            } else if (isResizing && initialRect) {
                const deltaX = e.clientX - dragStartX;
                const deltaY = e.clientY - dragStartY;
                
                let newWidth = initialRect.width;
                let newHeight = initialRect.height;
                let newLeft = initialRect.left;
                let newTop = initialRect.top;
                
                // Handle different resize directions
                if (resizeDirection.includes('e')) {
                    newWidth = Math.max(400, initialRect.width + deltaX);
                }
                if (resizeDirection.includes('w')) {
                    newWidth = Math.max(400, initialRect.width - deltaX);
                    newLeft = initialRect.left + deltaX;
                }
                if (resizeDirection.includes('s')) {
                    newHeight = Math.max(200, initialRect.height + deltaY);
                }
                if (resizeDirection.includes('n')) {
                    newHeight = Math.max(200, initialRect.height - deltaY);
                    newTop = initialRect.top + deltaY;
                }
                
                // Apply new dimensions
                tooltipElement.style.width = newWidth + 'px';
                tooltipElement.style.height = newHeight + 'px';
                tooltipElement.style.left = newLeft + 'px';
                tooltipElement.style.top = newTop + 'px';
                
                // Update content area max-height
                const contentArea = tooltipElement.querySelector('.debug-code-content');
                const headerHeight = tooltipElement.querySelector('.debug-code-header').offsetHeight;
                contentArea.style.maxHeight = (newHeight - headerHeight - 24) + 'px'; // 24px for padding
            }
        });
        
        // Global mouse up handler
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                header.style.cursor = 'grab';
            }
            if (isResizing) {
                isResizing = false;
                resizeDirection = null;
                initialRect = null;
            }
        });
    }
    
    /**
     * Handle click on debug messages to toggle tooltip
     */
    function handleClick(event) {
        // Check if clicking on the tooltip itself
        if (tooltipElement && tooltipElement.contains(event.target)) {
            // Only open file if clicking specifically on the hint text
            if (event.target.classList.contains('clickable-hint')) {
                const target = currentTarget;
                if (target) {
                    const sourceFile = target.getAttribute('data-source-file');
                    const sourceLine = target.getAttribute('data-source-line');
                    const sourcePath = target.getAttribute('data-source-path');
                    if (sourceFile && sourceLine) {
                        openSourceFile(sourceFile, parseInt(sourceLine), sourcePath);
                    }
                }
            }
            return; // Don't close tooltip when clicking on it
        }
        
        const target = event.target.closest('.debug-message');
        
        // If clicking outside any debug message, hide tooltip
        if (!target) {
            if (tooltipElement && tooltipElement.style.display !== 'none') {
                hideTooltip();
            }
            return;
        }
        
        // Get source location from data attributes
        const sourceFile = target.getAttribute('data-source-file');
        const sourceLine = target.getAttribute('data-source-line');
        const sourcePath = target.getAttribute('data-source-path');
        
        if (!sourceFile || !sourceLine) return;
        
        // Prevent default behavior
        event.preventDefault();
        event.stopPropagation();
        
        // Toggle tooltip: if clicking same target, hide; otherwise show for new target
        if (currentTarget === target && tooltipElement && tooltipElement.style.display !== 'none') {
            hideTooltip();
        } else {
            currentTarget = target;
            showTooltip(target, sourceFile, parseInt(sourceLine), sourcePath);
        }
    }
    
    /**
     * Show tooltip with source code
     */
    async function showTooltip(target, file, line, fullPath) {
        // Remove active class from any previous message
        const previousActive = document.querySelector('.debug-message.tooltip-active');
        if (previousActive) {
            previousActive.classList.remove('tooltip-active');
        }
        
        // Add active class to current message
        target.classList.add('tooltip-active');
        
        // Update tooltip header with full path
        const fileElement = tooltipElement.querySelector('.debug-code-file');
        const locationElement = tooltipElement.querySelector('.debug-code-location');
        
        // Get the full file path using the same logic as openSourceFile
        const fullFilePath = getFullFilePath(file);
        fileElement.textContent = fullFilePath;
        locationElement.textContent = `:${line} (Full File)`;
        
        // Show loading indicator while fetching full file
        const contentElement = tooltipElement.querySelector('.debug-code-content');
        contentElement.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-color-secondary);">Loading entire file...</div>';
        
        // Position and show tooltip immediately with loading state
        positionTooltip(target);
        tooltipElement.style.display = 'block';
        tooltipElement.classList.add('visible');
        
        // Get source code (now loads full file)
        const codeContent = await getSourceCode(file, line);
        
        // Update tooltip content with the full file
        contentElement.innerHTML = codeContent;
        
        // Scroll to center the red line indicator in the viewport
        setTimeout(() => {
            // Find the red line indicator that's closest to the target line
            const targetIndicator = contentElement.querySelector('#debug-target-indicator');
            
            if (targetIndicator) {
                // Get the container's viewport dimensions
                const containerRect = contentElement.getBoundingClientRect();
                const containerHeight = containerRect.height;
                
                // Get the indicator's position relative to the container
                const indicatorOffsetTop = targetIndicator.offsetTop;
                
                // Calculate scroll position to center the red line
                // We want the red line in the middle of the visible area
                const scrollTop = indicatorOffsetTop - (containerHeight / 2);
                
                // Scroll to the calculated position
                contentElement.scrollTop = Math.max(0, scrollTop);
            } else {
                // Fallback: find ANY red line indicator near the target
                const allIndicators = contentElement.querySelectorAll('.debug-removed-indicator');
                
                if (allIndicators.length > 0) {
                    // Find the indicator closest to our target line
                    let closestIndicator = null;
                    let closestDistance = Infinity;
                    
                    allIndicators.forEach((indicator) => {
                        // Check if this indicator is near the target line
                        const prevLine = indicator.previousElementSibling;
                        if (prevLine && prevLine.dataset.lineNumber) {
                            const lineNum = parseInt(prevLine.dataset.lineNumber);
                            const distance = Math.abs(lineNum - line);
                            if (distance < closestDistance) {
                                closestDistance = distance;
                                closestIndicator = indicator;
                            }
                        }
                    });
                    
                    if (closestIndicator) {
                        // Center the closest red line indicator
                        const containerHeight = contentElement.getBoundingClientRect().height;
                        const indicatorOffsetTop = closestIndicator.offsetTop;
                        const scrollTop = indicatorOffsetTop - (containerHeight / 2);
                        contentElement.scrollTop = Math.max(0, scrollTop);
                    }
                } else {
                    // Final fallback: scroll to the target line if no red lines found
                    const targetLineElement = contentElement.querySelector('.target-line');
                    if (targetLineElement) {
                        const containerHeight = contentElement.getBoundingClientRect().height;
                        const lineOffsetTop = targetLineElement.offsetTop;
                        const scrollTop = lineOffsetTop - (containerHeight / 2);
                        contentElement.scrollTop = Math.max(0, scrollTop);
                    }
                }
            }
        }, 100); // Slightly longer delay to ensure full rendering
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
        
        // Remove active class from any message
        const activeMessage = document.querySelector('.debug-message.tooltip-active');
        if (activeMessage) {
            activeMessage.classList.remove('tooltip-active');
        }
        
        currentTarget = null;
    }
    
    /**
     * Get the full file path based on filename patterns
     */
    function getFullFilePath(file) {
        if (file.includes('api-') || file === 'api-service.js' || file.includes('function-tools-') || file.includes('storage-') || file.includes('mcp-') || file.includes('chat-') || file.includes('prompts-') || file.includes('model-') || file.includes('encryption-') || file.includes('namespace-') || file.includes('debug-') || file.includes('link-sharing-')) {
            return `js/services/${file}`;
        } else if (file.includes('settings-') || file.includes('api-key-') || file.includes('model-manager') || file.includes('system-prompt-')) {
            return `js/components/settings/${file}`;
        } else if (file.includes('function-') && (file.includes('calling') || file.includes('editor') || file.includes('modal') || file.includes('list'))) {
            return `js/components/function-calling/${file}`;
        } else if (file.includes('mcp-') && file.includes('manager')) {
            return `js/components/mcp/${file}`;
        } else if (file.includes('prompt') && file.includes('manager')) {
            return `js/components/prompts/${file}`;
        } else if (file.includes('ui-') || file.includes('share-ui')) {
            return `js/components/ui/${file}`;
        } else if (file.includes('debug-code-tooltip') || file.includes('crypto-utils')) {
            return `js/utils/${file}`;
        } else if (file.includes('manager') || file.includes('component')) {
            return `js/components/${file}`;
        } else if (file.includes('default-') || file.includes('rc4-') || file.includes('math-') || file.includes('auth-')) {
            return `js/default-functions/${file}`;
        } else {
            // Fallback - try to determine from common patterns
            return `js/${file}`;
        }
    }

    /**
     * Position tooltip relative to target element
     */
    function positionTooltip(target) {
        // On mobile, don't do relative positioning - CSS handles fixed position
        if (isMobileDevice()) {
            return;
        }
        
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
    async function getSourceCode(file, line) {
        const cacheKey = `${file}:full`; // Cache key for full file
        
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
                        const formatted = formatSourceCode(text, line, file);
                        
                        // Update header with file size info
                        const lines = text.split('\n').length;
                        const locationElement = document.querySelector('.debug-code-location');
                        if (locationElement) {
                            locationElement.textContent = `:${line} (Full File - ${lines} lines)`;
                        }
                        
                        // Cache the result
                        codeCache[cacheKey] = formatted;
                        return formatted;
                    }
                }
                
                return formatFallbackCode(file, line);
            }
            
            const text = await response.text();
            const formatted = formatSourceCode(text, line, file);
            
            // Update header with file size info
            const lines = text.split('\n').length;
            const locationElement = document.querySelector('.debug-code-location');
            if (locationElement) {
                locationElement.textContent = `:${line} (Full File - ${lines} lines)`;
            }
            
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
        const removedAfterIndices = new Set(); // Track where we removed debug blocks
        
        // First pass: identify debug lines
        const debugLines = new Set();
        const debugBlockStarts = new Set(); // Track where debug blocks start
        
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
                // Mark the start of a debug block
                if (isDebugComment) {
                    debugBlockStarts.add(i);
                }
            }
        }
        
        // Second pass: filter lines and track where debug blocks were removed
        let lastNonDebugFilteredIndex = -1;
        let foundDebugBlock = false;
        
        for (let i = 0; i < lines.length; i++) {
            const lineNum = startLine + i;
            const line = lines[i];
            const trimmed = line.trim();
            
            // Track if we found any debug code in this file
            if (debugLines.has(i)) {
                foundDebugBlock = true;
            }
            
            // Check if we're starting a debug block that will be removed
            if (debugBlockStarts.has(i) && lastNonDebugFilteredIndex >= 0) {
                // Mark that we should show a red line after the last non-debug line
                removedAfterIndices.add(lastNonDebugFilteredIndex);
            }
            
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
            
            // Track the filtered index of this line if it's not blank
            if (trimmed !== '') {
                lastNonDebugFilteredIndex = filteredLines.length - 1;
            }
        }
        
        // If no debug blocks were found but we expect them (based on target line), add a fallback indicator
        if (!foundDebugBlock && removedAfterIndices.size === 0) {
            // Find a reasonable place to show a red line near the target line
            const targetIndex = originalLineNumbers.findIndex(lineNum => lineNum >= targetLine);
            if (targetIndex >= 0 && targetIndex > 0) {
                removedAfterIndices.add(targetIndex - 1);
            }
        }
        
        return { filteredLines, originalLineNumbers, removedAfterIndices };
    }
    
    /**
     * Format source code with line numbers and highlighting
     */
    function formatSourceCode(text, targetLine, file) {
        const lines = text.split('\n');
        
        // Load the ENTIRE file
        const startLine = 1;
        const endLine = lines.length;
        
        // Get ALL lines of the file
        const rawLines = lines.slice(startLine - 1, endLine);
        
        // Filter out debug-related lines and track where they were removed
        const { filteredLines, originalLineNumbers, removedAfterIndices } = filterDebugLines(rawLines, startLine, targetLine);
        
        if (filteredLines.length === 0) {
            // Fallback if all lines were filtered out
            return formatFallbackCode(file, targetLine);
        }
        
        // Find the index of the target line in the filtered output
        let targetLineIndex = -1;
        for (let i = 0; i < originalLineNumbers.length; i++) {
            if (originalLineNumbers[i] === targetLine) {
                targetLineIndex = i;
                break;
            }
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
        
        // Build the final HTML with line numbers and red lines where code was removed
        let html = '<pre class="debug-code-pre" data-target-line-index="' + targetLineIndex + '"><code class="language-javascript">';
        
        highlightedLines.forEach((line, index) => {
            const lineNum = originalLineNumbers[index];
            const isTargetLine = lineNum === targetLine;
            
            // Check if we should add a red line after this line
            if (removedAfterIndices.has(index)) {
                html += `<div class="debug-code-line${isTargetLine ? ' target-line' : ''}" data-line-number="${lineNum}">`;
                html += `<span class="line-number">${lineNum.toString().padStart(4, ' ')}</span>`;
                html += `<span class="line-content">${line || ' '}</span>`;
                html += '</div>';
                // Add the red line indicator
                html += `<div class="debug-removed-indicator" id="${isTargetLine ? 'debug-target-indicator' : ''}">`;
                html += `<span class="line-number-placeholder">    </span>`;
                html += `<span class="removed-line-marker" title="Debug code removed here"></span>`;
                html += '</div>';
            } else {
                html += `<div class="debug-code-line${isTargetLine ? ' target-line' : ''}" data-line-number="${lineNum}">`;
                html += `<span class="line-number">${lineNum.toString().padStart(4, ' ')}</span>`;
                html += `<span class="line-content">${line || ' '}</span>`;
                html += '</div>';
            }
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