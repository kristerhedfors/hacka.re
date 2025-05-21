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
            // Check if this is the first visit by looking for any hackare_ localStorage variables
            const userHasVisitedBefore = hasVisitedBefore();
            
            if (!userHasVisitedBefore) {
                // No need to mark as visited - any localStorage operations will create hackare_ variables
                
                // Create a welcome modal
                const welcomeModal = document.createElement('div');
                welcomeModal.className = 'modal active';
                welcomeModal.id = 'welcome-modal';
                
                const modalContent = document.createElement('div');
                modalContent.className = 'modal-content';
                
                const heading = document.createElement('h2');
                heading.textContent = 'Welcome to hacka.re!';
                
                // Create a more concise welcome message focused on getting started
                const welcomeContainer = document.createElement('div');
                
                // First notice - Getting Started
                const firstNotice = document.createElement('div');
                firstNotice.className = 'important-notice';
                firstNotice.style.cssText = 'background-color: var(--system-msg-bg); border-left: 4px solid var(--accent-color); padding: 10px; margin-bottom: 10px; border-radius: 8px;';
                firstNotice.innerHTML = `
                    <p><strong>Get Started:</strong> Configure with a base URL (OpenAI-compatible) and API key to begin using hacka.re.</p>
                `;
                
                // Second notice - Privacy
                const secondNotice = document.createElement('div');
                secondNotice.className = 'important-notice';
                secondNotice.style.cssText = 'background-color: var(--system-msg-bg); border-left: 4px solid var(--accent-color); padding: 10px; margin-bottom: 10px; border-radius: 8px;';
                secondNotice.innerHTML = `
                    <p><strong>Privacy-Focused:</strong> Your data stays in your browser. No accounts needed, no server-side storage.</p>
                `;
                
                // Third notice - Documentation
                const thirdNotice = document.createElement('div');
                thirdNotice.className = 'important-notice';
                thirdNotice.style.cssText = 'background-color: var(--system-msg-bg); border-left: 4px solid var(--accent-color); padding: 10px; margin-bottom: 0; border-radius: 8px;';
                thirdNotice.innerHTML = `
                    <p><a href="about/index.html">About</a> | <a href="about/development.html">Development</a> | <a href="about/disclaimer.html">Disclaimer</a></p>
                `;
                
                // Add all notices to the container
                welcomeContainer.appendChild(firstNotice);
                welcomeContainer.appendChild(secondNotice);
                welcomeContainer.appendChild(thirdNotice);
                
                const buttonContainer = document.createElement('div');
                buttonContainer.className = 'form-actions';
                
                const continueButton = document.createElement('button');
                continueButton.type = 'button';
                continueButton.className = 'btn primary-btn';
                continueButton.textContent = 'Continue to Settings';
                
                // Add a close button for testing purposes
                const closeButton = document.createElement('button');
                closeButton.type = 'button';
                closeButton.className = 'btn secondary-btn';
                closeButton.id = 'close-welcome-modal';
                closeButton.textContent = 'Close';
                
                // Assemble the modal
                buttonContainer.appendChild(continueButton);
                buttonContainer.appendChild(closeButton);
                
                modalContent.appendChild(heading);
                modalContent.appendChild(welcomeContainer);
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
                
                // Handle close button click
                closeButton.addEventListener('click', () => {
                    welcomeModal.remove();
                });
                
                return true; // Modal was shown
            }
            
            return false; // Modal was not shown
        }
        
        /**
         * Check if the user has visited before by looking for any hackare_ localStorage variables
         * Also alerts if there are any localStorage variables without "hackare_" in their names
         * @returns {boolean} True if the user has visited before
         */
        function hasVisitedBefore() {
            // Check if there's at least one hackare_ localStorage variable
            let hasHackareVar = false;
            let nonHackareVars = [];
            
            // Check all localStorage variables
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key) {
                    if (key.includes('hackare_')) {
                        hasHackareVar = true;
                    } else {
                        nonHackareVars.push(key);
                    }
                }
            }
            
            // Alert if there are any localStorage variables without "hackare_" in their names
            if (nonHackareVars.length > 0) {
                console.error('ALERT: Found localStorage variables without "hackare_" in their names:', nonHackareVars);
                alert('ALERT: Found localStorage variables without "hackare_" in their names: ' + nonHackareVars.join(', '));
            }
            
            return hasHackareVar;
        }
        
        /**
         * Mark the user as having visited before
         * Note: This is kept for API compatibility but is no longer needed
         * as any localStorage operation will create hackare_ variables
         */
        function markAsVisited() {
            // No longer needed - any localStorage operations will create hackare_ variables
            // This function is kept for API compatibility
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
