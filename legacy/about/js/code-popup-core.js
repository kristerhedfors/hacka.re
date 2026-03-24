/**
 * Code Popup Core
 * Core popup logic and initialization for code popup functionality
 */

window.CodePopupCore = (function() {
    
    /**
     * Initialize the code popup system
     */
    function init() {
        console.log('Code popup script loaded');
        
        // Initialize marked for rendering code
        if (typeof marked !== 'undefined') {
            console.log('Marked library loaded');
            // Set marked options for code highlighting
            marked.setOptions({
                highlight: function(code, lang) {
                    if (typeof hljs !== 'undefined') {
                        if (lang && hljs.getLanguage(lang)) {
                            return hljs.highlight(code, { language: lang }).value;
                        } else {
                            return hljs.highlightAuto(code).value;
                        }
                    }
                    return code;
                },
                langPrefix: 'language-'
            });
        } else {
            console.error('Marked library not loaded');
        }

        // Initialize DOMPurify for sanitizing HTML
        if (typeof DOMPurify === 'undefined') {
            console.error('DOMPurify library not loaded');
        }

        // Add a small delay to ensure all libraries are loaded
        setTimeout(function() {
            console.log('Initializing code popups...');
            console.log('CodePopupConfig available:', !!window.CodePopupConfig);
            console.log('CodePopupRenderer available:', !!window.CodePopupRenderer);
            
            // Process the content to add popups for code modules
            console.log('Processing code module references...');
            CodePopupRenderer.processCodeModuleReferences();
            
            // Add click handlers after wrapping spans
            console.log('Adding event listeners...');
            addCodeModuleEventListeners();
            
            console.log('Code popup initialization complete');
        }, 500);
    }

    /**
     * Add CLICK event listeners to code module references
     * Note: System is designed for click-to-show popups that stick until dismissed
     */
    function addCodeModuleEventListeners() {
        // Handle auto-generated code-module-reference elements
        const codeModuleRefs = document.querySelectorAll('.code-module-reference');
        console.log('Found code-module-reference elements:', codeModuleRefs.length);
        
        codeModuleRefs.forEach((ref, index) => {
            const filePath = ref.getAttribute('data-file-path');
            const moduleName = ref.getAttribute('data-module-name');
            console.log(`code-module-reference ${index}:`, moduleName, 'file:', filePath);
            
            ref.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('code-module-reference clicked:', moduleName, 'file:', filePath);
                
                // Get the source code from our predefined snippets
                const sourceCode = CodePopupConfig.getSourceCodeSnippet(filePath);
                console.log('Source code found for auto-generated:', !!sourceCode, 'length:', sourceCode ? sourceCode.length : 0);
                
                if (sourceCode) {
                    console.log('Showing popup for auto-generated:', moduleName);
                    CodePopupRenderer.showCodePopup(this, filePath, moduleName, sourceCode);
                } else {
                    console.error('No source code snippet found for', filePath);
                    console.log('Available snippets:', Object.keys(CodePopupConfig.sourceCodeSnippets));
                }
            });
        });
        
        // Handle manual code-popup-trigger elements
        const codePopupTriggers = document.querySelectorAll('.code-popup-trigger');
        console.log('Found code-popup-trigger elements:', codePopupTriggers.length);
        
        codePopupTriggers.forEach((trigger, index) => {
            const filePath = trigger.getAttribute('data-file');
            const moduleName = trigger.textContent.trim();
            console.log(`code-popup-trigger ${index}:`, moduleName, 'file:', filePath);
            
            // Skip if this element was already processed as a code-module-reference
            if (trigger.classList.contains('code-module-reference')) {
                console.log(`Skipping code-popup-trigger ${index} as it's already a code-module-reference`);
                return;
            }
            
            trigger.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('code-popup-trigger clicked:', moduleName, 'file:', filePath);
                
                // Get the source code from our predefined snippets
                const sourceCode = CodePopupConfig.getSourceCodeSnippet(filePath);
                console.log('Source code found:', !!sourceCode, 'length:', sourceCode ? sourceCode.length : 0);
                
                if (sourceCode) {
                    console.log('Showing popup for:', moduleName);
                    CodePopupRenderer.showCodePopup(this, filePath, moduleName, sourceCode);
                } else {
                    console.error('No source code snippet found for', filePath);
                    console.log('Available snippets:', Object.keys(CodePopupConfig.sourceCodeSnippets));
                }
            });
        });
    }

    // Public API
    return {
        init: init,
        addCodeModuleEventListeners: addCodeModuleEventListeners
    };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    CodePopupCore.init();
});