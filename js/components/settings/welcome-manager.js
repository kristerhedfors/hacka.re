/**
 * Welcome Manager Module
 * Handles welcome modal and first-time user experience for the AIHackare application
 */

window.WelcomeManager = (function() {
    /**
     * Create a Welcome Manager instance
     * @param {Object} elements - DOM elements
     * @returns {Object} Welcome Manager instance
     */
    function createWelcomeManager(elements) {
        /**
         * Show the welcome modal for first-time users
         * @param {Function} onContinue - Function to call when the user clicks continue
         */
        function showWelcomeModalIfFirstTime(onContinue) {
            // Check if this is the first visit
            const hasVisitedBefore = localStorage.getItem('hacka_re_visited');
            
            if (!hasVisitedBefore) {
                // Mark as visited
                localStorage.setItem('hacka_re_visited', 'true');
                
                // Create a welcome modal
                const welcomeModal = document.createElement('div');
                welcomeModal.className = 'modal active';
                welcomeModal.id = 'welcome-modal';
                
                const modalContent = document.createElement('div');
                modalContent.className = 'modal-content';
                
                const heading = document.createElement('h2');
                heading.textContent = 'Welcome to hacka.re!';
                
                // Get the welcome text from the tooltip
                const welcomeText = document.createElement('div');
                welcomeText.className = 'important-notice';
                welcomeText.style.cssText = 'background-color: var(--system-msg-bg); border-left: 4px solid var(--accent-color); padding: 15px; margin-bottom: 20px; border-radius: 8px;';
                welcomeText.innerHTML = `
                    <p>Welcome to hacka.re! To get started, you'll need to configure LLM access by specifying a base URL (OpenAI-compatible) and API key. hacka.re is a privacy-focused web-based LLM chat client that stores your API key, conversations, and settings locally, in your browser.</p>
                    <p>hacka.re is serverless and thus you can download the entire web page and run it offline, plus modify/extend it as you wish. hacka.re is published under the MIT No Attibution license, meant to be as free as freeware can be.</p>
                    <p>hacka.re supports creation of self-contained, strongly encrypted, password/session key-protected GPTs with individual system prompts and conversation data, which thus allows for sharing and collaboration over less secure channels.</p>
                    <p>For more information about hacka.re, check out our <a href="about/index.html">About</a>, <a href="about/architecture.html">Architecture</a>, and <a href="about/use-cases.html">Use Cases</a> documentation.</p>
                `;
                
                const buttonContainer = document.createElement('div');
                buttonContainer.className = 'form-actions';
                
                const continueButton = document.createElement('button');
                continueButton.type = 'button';
                continueButton.className = 'btn primary-btn';
                continueButton.textContent = 'Continue to Settings';
                
                // Assemble the modal
                buttonContainer.appendChild(continueButton);
                
                modalContent.appendChild(heading);
                modalContent.appendChild(welcomeText);
                modalContent.appendChild(buttonContainer);
                
                welcomeModal.appendChild(modalContent);
                
                // Add to document
                document.body.appendChild(welcomeModal);
                
                // Handle continue button click
                continueButton.addEventListener('click', () => {
                    welcomeModal.remove();
                    // Call the onContinue callback
                    if (onContinue) {
                        onContinue();
                    }
                });
                
                return true; // Modal was shown
            }
            
            return false; // Modal was not shown
        }
        
        /**
         * Check if the user has visited before
         * @returns {boolean} True if the user has visited before
         */
        function hasVisitedBefore() {
            return localStorage.getItem('hacka_re_visited') === 'true';
        }
        
        /**
         * Mark the user as having visited before
         */
        function markAsVisited() {
            localStorage.setItem('hacka_re_visited', 'true');
        }
        
        // Public API
        return {
            showWelcomeModalIfFirstTime,
            hasVisitedBefore,
            markAsVisited
        };
    }

    // Public API
    return {
        createWelcomeManager
    };
})();
