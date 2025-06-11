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
            // Process the content to add popups for code modules
            CodePopupRenderer.processCodeModuleReferences();
            // Add click handlers after wrapping spans
            addCodeModuleEventListeners();
        }, 500);
    }

    /**
     * Add event listeners to code module references
     */
    function addCodeModuleEventListeners() {
        const codeModuleRefs = document.querySelectorAll('.code-module-reference');
        
        codeModuleRefs.forEach(ref => {
            ref.addEventListener('click', function(e) {
                e.preventDefault();
                
                const filePath = this.getAttribute('data-file-path');
                const moduleName = this.getAttribute('data-module-name');
                
                // Get the source code from our predefined snippets
                const sourceCode = CodePopupConfig.getSourceCodeSnippet(filePath);
                if (sourceCode) {
                    CodePopupRenderer.showCodePopup(this, filePath, moduleName, sourceCode);
                } else {
                    console.error('No source code snippet found for', filePath);
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