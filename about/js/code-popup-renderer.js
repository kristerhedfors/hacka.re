/**
 * Code Popup Renderer
 * DOM manipulation and rendering logic for code popup functionality
 */

window.CodePopupRenderer = (function() {
    
    /**
     * Escape HTML to prevent XSS attacks
     * @param {string} text - The text to escape
     * @returns {string} The escaped text
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Process all code module references in the documentation using text-node wrapping
     */
    function processCodeModuleReferences() {
        const moduleToFilePath = CodePopupConfig.moduleToFilePath;

        // Process each feature section separately
        document.querySelectorAll('.feature-section').forEach(section => {
            // First, process text nodes
            const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT, null, false);
            let node;
            while (node = walker.nextNode()) {
                const text = node.nodeValue;
                for (const moduleName in moduleToFilePath) {
                    if (!text.includes(moduleName)) continue;
                    const parts = text.split(moduleName);
                    const parent = node.parentNode;
                    parts.forEach((part, index) => {
                        parent.insertBefore(document.createTextNode(part), node);
                        if (index < parts.length - 1) {
                            const span = document.createElement('span');
                            span.className = 'code-module-reference';
                            span.setAttribute('data-file-path', moduleToFilePath[moduleName]);
                            span.setAttribute('data-module-name', moduleName);
                            span.textContent = moduleName;
                            parent.insertBefore(span, node);
                        }
                    });
                    parent.removeChild(node);
                    break; // move to next text node after match
                }
            }
            
            // Then, process list items that might contain module names in strong tags
            section.querySelectorAll('li strong').forEach(strongElement => {
                // Skip if this strong element already contains a code-popup-trigger
                if (strongElement.querySelector('.code-popup-trigger')) {
                    return;
                }
                
                const text = strongElement.textContent;
                for (const moduleName in moduleToFilePath) {
                    // Check if the strong tag contains exactly the module name (with optional colon)
                    if (text === moduleName || text === `${moduleName}:`) {
                        // Extract the module name without the colon
                        const cleanModuleName = text.replace(':', '');
                        
                        // Make the strong element clickable directly
                        strongElement.className = 'code-module-reference';
                        strongElement.setAttribute('data-file-path', moduleToFilePath[cleanModuleName]);
                        strongElement.setAttribute('data-module-name', cleanModuleName);
                        strongElement.style.cursor = 'pointer';
                        strongElement.style.color = 'var(--primary-color)';
                        
                        // Add a subtle indicator that it's clickable without using underline
                        strongElement.style.position = 'relative';
                        
                        // Create a pseudo-element for the hover effect using a custom attribute
                        strongElement.setAttribute('data-hover', 'true');
                        
                        // Add a style tag if it doesn't exist yet
                        if (!document.getElementById('code-popup-hover-style')) {
                            const styleTag = document.createElement('style');
                            styleTag.id = 'code-popup-hover-style';
                            styleTag.textContent = `
                                .code-module-reference[data-hover="true"]:hover {
                                    text-decoration: underline;
                                }
                            `;
                            document.head.appendChild(styleTag);
                        }
                        
                        break;
                    }
                }
            });
        });
    }

    /**
     * Show a popup with the source code
     * @param {HTMLElement} element - The element that triggered the popup
     * @param {string} filePath - The path to the source file
     * @param {string} moduleName - The name of the module
     * @param {string} sourceCode - The source code content
     */
    function showCodePopup(element, filePath, moduleName, sourceCode) {
        console.info(`Showing code popup for ${moduleName}`);
        
        try {
            // Remove any existing popups
            removeExistingPopups();
            
            // Create the popup container
            const popup = document.createElement('div');
            popup.className = 'code-popup';
        
        // Create the popup header
        const header = document.createElement('div');
        header.className = 'code-popup-header';
        
        // Add the module name
        const title = document.createElement('h3');
        title.textContent = moduleName;
        header.appendChild(title);
        
        // Add the file path with a link to open in a new tab
        const filePathElement = document.createElement('div');
        filePathElement.className = 'code-popup-filepath';
        
        const fileLink = document.createElement('a');
        fileLink.href = `../${filePath}`;
        fileLink.target = '_blank';
        fileLink.textContent = filePath;
        fileLink.title = 'Open file in new tab';
        
        filePathElement.appendChild(fileLink);
        header.appendChild(filePathElement);
        
        // Add a close button
        const closeButton = document.createElement('button');
        closeButton.className = 'code-popup-close';
        closeButton.innerHTML = '&times;';
        closeButton.title = 'Close';
        closeButton.addEventListener('click', removeExistingPopups);
        header.appendChild(closeButton);
        
        popup.appendChild(header);
        
        // Create the popup content with the source code
        const content = document.createElement('div');
        content.className = 'code-popup-content';
        
        // Format the source code with marked or fallback to basic formatting
        let renderedCode;
        if (typeof marked !== 'undefined') {
            const formattedCode = `\`\`\`javascript\n${sourceCode}\n\`\`\``;
            renderedCode = marked.parse(formattedCode);
        } else {
            // Fallback to basic formatting if marked is not available
            renderedCode = `<pre><code class="language-javascript">${escapeHtml(sourceCode)}</code></pre>`;
        }
        
        // Sanitize the HTML if DOMPurify is available
        if (typeof DOMPurify !== 'undefined') {
            content.innerHTML = DOMPurify.sanitize(renderedCode);
        } else {
            content.innerHTML = renderedCode;
        }
        
        // Apply highlight.js to rendered code blocks if available
        if (typeof hljs !== 'undefined') {
            content.querySelectorAll('pre code').forEach(block => hljs.highlightElement(block));
        }
        
            popup.appendChild(content);
            
            // Position the popup near the element
            positionPopup(popup, element);
            
            // Add the popup to the document
            document.body.appendChild(popup);
            
            // Add event listener to close popup when clicking outside
            document.addEventListener('click', handleOutsideClick);
            
        } catch (error) {
            console.error('Error in showCodePopup:', error);
            console.error('Stack trace:', error.stack);
        }
    }

    /**
     * Position the popup near the element
     * @param {HTMLElement} popup - The popup element
     * @param {HTMLElement} element - The element that triggered the popup
     */
    function positionPopup(popup, element) {
        try {
            // Get the element's position
            const rect = element.getBoundingClientRect();
            
            // Set initial position
            popup.style.position = 'absolute';
            popup.style.zIndex = '1000';
            
            // Add the popup to the document temporarily to get its dimensions
            popup.style.visibility = 'hidden';
            document.body.appendChild(popup);
            
            const popupRect = popup.getBoundingClientRect();
            
            // Remove the popup
            document.body.removeChild(popup);
            popup.style.visibility = 'visible';
            
            // Calculate position
            let top = rect.bottom + window.scrollY + 10; // 10px below the element
            let left = rect.left + window.scrollX;
            
            // Adjust if popup would go off the right edge
            if (left + popupRect.width > window.innerWidth) {
                left = window.innerWidth - popupRect.width - 20;
            }
            
            // Adjust if popup would go off the bottom edge
            if (top + popupRect.height > window.scrollY + window.innerHeight) {
                // Place above the element instead
                top = rect.top + window.scrollY - popupRect.height - 10;
            }
            
            // Ensure popup is not positioned off-screen
            left = Math.max(20, left);
            top = Math.max(20, top);
            
            popup.style.top = `${top}px`;
            popup.style.left = `${left}px`;
            
        } catch (error) {
            console.error('Error in positionPopup:', error);
            console.error('Stack trace:', error.stack);
        }
    }

    /**
     * Handle clicks outside the popup to close it
     * @param {Event} event - The click event
     */
    function handleOutsideClick(event) {
        const popup = document.querySelector('.code-popup');
        if (!popup) {
            return;
        }
        
        // Check if the click was inside the popup
        if (popup.contains(event.target)) {
            return;
        }
        
        // Check if the click was on a code module reference
        if (event.target.classList.contains('code-module-reference')) {
            return;
        }
        
        // Check if the click was on a code popup trigger
        if (event.target.classList.contains('code-popup-trigger')) {
            return;
        }
        
        console.info('Closing code popup due to outside click');
        // Remove the popup
        removeExistingPopups();
    }

    /**
     * Remove any existing popups
     */
    function removeExistingPopups() {
        const popups = document.querySelectorAll('.code-popup');
        if (popups.length > 0) {
            console.info(`Removing ${popups.length} existing popup(s)`);
        }
        popups.forEach(popup => {
            popup.remove();
        });
        
        // Remove the outside click handler
        document.removeEventListener('click', handleOutsideClick);
    }

    // Public API
    return {
        processCodeModuleReferences: processCodeModuleReferences,
        showCodePopup: showCodePopup,
        removeExistingPopups: removeExistingPopups
    };
})();