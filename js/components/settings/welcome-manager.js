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
         */
        function showWelcomeModalIfFirstTime() {
            // Check if this is a first-time user (no hackare_ variables in localStorage)
            if (!hasVisitedBefore() && !isWelcomeDisabled()) {
                
                // Create a welcome modal
                const welcomeModal = document.createElement('div');
                welcomeModal.className = 'modal active';
                welcomeModal.id = 'welcome-modal';
                
                const modalContent = document.createElement('div');
                modalContent.className = 'modal-content';
                
                const heading = document.createElement('h2');
                heading.style.cssText = 'text-align: center; margin-bottom: 18px; font-size: 26px;';
                heading.innerHTML = 'Welcome to <span style="font-family: \'Courier New\', Courier, monospace; text-decoration: underline;">hacka.re</span>';
                
                // Create a more visually appealing welcome message
                const welcomeContainer = document.createElement('div');
                welcomeContainer.style.cssText = 'padding: 0 10px;';
                
                // Hero message
                const heroMessage = document.createElement('div');
                heroMessage.style.cssText = 'text-align: center; margin-bottom: 16px; color: var(--text-color-secondary); font-size: 15px; line-height: 1.4;';
                heroMessage.innerHTML = 'Your privacy-first AI chat interface.';
                
                // Feature cards container
                const featuresContainer = document.createElement('div');
                featuresContainer.style.cssText = 'display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px;';
                
                // Getting Started card
                const startCard = document.createElement('div');
                startCard.className = 'important-notice';
                startCard.style.cssText = 'background: linear-gradient(135deg, var(--system-msg-bg) 0%, var(--bg-primary) 100%); border-left: 4px solid var(--accent-color); padding: 14px; border-radius: 10px; box-shadow: 0 2px 6px rgba(0,0,0,0.08); transition: transform 0.2s;';
                
                // Create the start card content with clickable Settings link
                const startContent = document.createElement('div');
                startContent.style.cssText = 'display: flex; align-items: start; gap: 12px;';
                startContent.innerHTML = `
                    <span style="font-size: 22px; margin-top: -2px;">🚀</span>
                    <div style="flex: 1;">
                        <strong style="font-size: 14px; color: var(--accent-color);">Quick Start</strong>
                        <p style="margin-top: 4px; margin-bottom: 0; font-size: 13px; line-height: 1.4;">
                            Open <a href="#" class="settings-link-welcome" style="color: var(--accent-color); text-decoration: underline; cursor: pointer;">Settings</a> to configure your OpenAI-compatible API endpoint.
                        </p>
                    </div>
                `;
                startCard.appendChild(startContent);
                
                // Add click handler for Settings link
                setTimeout(() => {
                    const settingsLink = startCard.querySelector('.settings-link-welcome');
                    if (settingsLink) {
                        settingsLink.addEventListener('click', (e) => {
                            e.preventDefault();
                            welcomeModal.remove();
                            const settingsBtn = document.getElementById('settings-btn');
                            if (settingsBtn) {
                                settingsBtn.click();
                            }
                        });
                    }
                }, 0);
                
                // Privacy card
                const privacyCard = document.createElement('div');
                privacyCard.className = 'important-notice';
                privacyCard.style.cssText = 'background: linear-gradient(135deg, var(--system-msg-bg) 0%, var(--bg-primary) 100%); border-left: 4px solid var(--accent-color); padding: 14px; border-radius: 10px; box-shadow: 0 2px 6px rgba(0,0,0,0.08); transition: transform 0.2s;';
                privacyCard.innerHTML = `
                    <div style="display: flex; align-items: start; gap: 12px;">
                        <span style="font-size: 22px; margin-top: -2px;">🔒</span>
                        <div style="flex: 1;">
                            <strong style="font-size: 14px; color: var(--accent-color);">Privacy Focused</strong>
                            <p style="margin-top: 4px; margin-bottom: 0; font-size: 13px; line-height: 1.4;">
                                No accounts, no tracking, no server-side storage aside from API connections you configure. See
                                <a href="about/local-llm-toolbox.html" target="_blank" rel="noopener noreferrer" style="color: var(--accent-color); text-decoration: underline; cursor: pointer;">Local LLM Toolbox</a>.
                            </p>
                        </div>
                    </div>
                `;
                
                // Features card
                const featuresCard = document.createElement('div');
                featuresCard.className = 'important-notice';
                featuresCard.style.cssText = 'background: linear-gradient(135deg, var(--system-msg-bg) 0%, var(--bg-primary) 100%); border-left: 4px solid var(--accent-color); padding: 14px; border-radius: 10px; box-shadow: 0 2px 6px rgba(0,0,0,0.08); transition: transform 0.2s;';
                
                // Create the features card content with clickable links
                const featuresContent = document.createElement('div');
                featuresContent.style.cssText = 'display: flex; align-items: start; gap: 12px;';
                featuresContent.innerHTML = `
                    <span style="font-size: 22px; margin-top: -2px;">✨</span>
                    <div style="flex: 1;">
                        <strong style="font-size: 14px; color: var(--accent-color);">Powerful Features</strong>
                        <p style="margin-top: 4px; margin-bottom: 0; font-size: 13px; line-height: 1.4;">
                            <a href="#" class="feature-link-welcome" data-feature="prompts" style="color: var(--accent-color); text-decoration: underline; cursor: pointer;">Custom prompts</a>, 
                            <a href="#" class="feature-link-welcome" data-feature="function" style="color: var(--accent-color); text-decoration: underline; cursor: pointer;">function calling</a>, 
                            <a href="#" class="feature-link-welcome" data-feature="mcp" style="color: var(--accent-color); text-decoration: underline; cursor: pointer;">MCP servers</a>, 
                            and more.
                        </p>
                    </div>
                `;
                featuresCard.appendChild(featuresContent);
                
                // Add click handlers for feature links
                setTimeout(() => {
                    const featureLinks = featuresCard.querySelectorAll('.feature-link-welcome');
                    featureLinks.forEach(link => {
                        link.addEventListener('click', (e) => {
                            e.preventDefault();
                            const feature = e.target.dataset.feature;
                            welcomeModal.remove();
                            
                            // Open the corresponding modal
                            let buttonId = '';
                            switch(feature) {
                                case 'prompts':
                                    buttonId = 'prompts-btn';
                                    break;
                                case 'function':
                                    buttonId = 'function-btn';
                                    break;
                                case 'mcp':
                                    buttonId = 'mcp-servers-btn';
                                    break;
                            }
                            
                            if (buttonId) {
                                const button = document.getElementById(buttonId);
                                if (button) {
                                    button.click();
                                }
                            }
                        });
                    });
                }, 0);
                
                // Add hover effects via inline event handlers
                [startCard, privacyCard, featuresCard].forEach(card => {
                    card.onmouseenter = function() { this.style.transform = 'translateY(-2px)'; };
                    card.onmouseleave = function() { this.style.transform = 'translateY(0)'; };
                });
                
                // Add all feature cards
                featuresContainer.appendChild(startCard);
                featuresContainer.appendChild(privacyCard);
                featuresContainer.appendChild(featuresCard);
                
                // Footer links
                const footerLinks = document.createElement('div');
                footerLinks.style.cssText = 'display: flex; justify-content: space-evenly; align-items: center; padding-top: 14px; margin-top: 14px; border-top: 1px solid var(--border-color); font-size: 13px;';
                footerLinks.innerHTML = `
                    <a href="about/index.html" target="_blank" rel="noopener noreferrer" style="color: var(--text-color-secondary); text-decoration: none; transition: color 0.2s; flex: 1; text-align: center;" 
                       onmouseover="this.style.color='var(--accent-color)'" 
                       onmouseout="this.style.color='var(--text-color-secondary)'">About</a>
                    <span style="color: var(--text-color-secondary); opacity: 0.3;">|</span>
                    <a href="about/philosophy.html" target="_blank" rel="noopener noreferrer" style="color: var(--text-color-secondary); text-decoration: none; transition: color 0.2s; flex: 1; text-align: center;"
                       onmouseover="this.style.color='var(--accent-color)'" 
                       onmouseout="this.style.color='var(--text-color-secondary)'">Philosophy</a>
                    <span style="color: var(--text-color-secondary); opacity: 0.3;">|</span>
                    <a href="about/disclaimer.html" target="_blank" rel="noopener noreferrer" style="color: var(--text-color-secondary); text-decoration: none; transition: color 0.2s; flex: 1; text-align: center;"
                       onmouseover="this.style.color='var(--accent-color)'" 
                       onmouseout="this.style.color='var(--text-color-secondary)'">Disclaimer</a>
                `;
                
                // Add all elements to the container
                welcomeContainer.appendChild(heroMessage);
                welcomeContainer.appendChild(featuresContainer);
                welcomeContainer.appendChild(footerLinks);
                
                const buttonContainer = document.createElement('div');
                buttonContainer.className = 'form-actions';
                buttonContainer.style.cssText = 'margin-top: 18px; display: flex; justify-content: center;';
                
                // Only close button
                const closeButton = document.createElement('button');
                closeButton.type = 'button';
                closeButton.className = 'btn primary-btn';
                closeButton.id = 'close-welcome-modal';
                closeButton.style.cssText = 'padding: 10px 28px; font-size: 15px; font-weight: 500; border-radius: 8px; min-width: 100px;';
                closeButton.innerHTML = 'Close';
                
                // Assemble the modal
                buttonContainer.appendChild(closeButton);
                
                modalContent.appendChild(heading);
                modalContent.appendChild(welcomeContainer);
                modalContent.appendChild(buttonContainer);
                
                welcomeModal.appendChild(modalContent);
                
                // Add to document
                document.body.appendChild(welcomeModal);
                
                // Handle close button click
                closeButton.addEventListener('click', () => {
                    welcomeModal.remove();
                });
                
                // Handle click outside modal to close
                welcomeModal.addEventListener('click', (e) => {
                    if (e.target === welcomeModal) {
                        welcomeModal.remove();
                    }
                });
                
                return true; // Modal was shown
            }
            
            return false; // Modal was not shown
        }
        
        /**
         * Check if the welcome modal is disabled via URL parameter
         * @returns {boolean} True if welcome modal should be disabled
         */
        function isWelcomeDisabled() {
            const hash = window.location.hash;
            if (!hash) return false;
            
            // Parse the hash for welcome parameter
            // Support both #welcome=false and other parameters like #welcome=false&other=param
            const hashParams = new URLSearchParams(hash.substring(1));
            const welcomeParam = hashParams.get('welcome');
            
            // Also check if hash starts with #welcome=false (for simple case)
            if (hash === '#welcome=false') {
                return true;
            }
            
            // Check if welcome parameter is explicitly set to 'false'
            return welcomeParam === 'false';
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
            
            // Keys that are allowed to exist without "hackare_" prefix
            const allowedKeys = [];
            
            // Check all localStorage variables
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key) {
                    if (key.includes('hackare_')) {
                        hasHackareVar = true;
                    } else if (!allowedKeys.includes(key)) {
                        nonHackareVars.push(key);
                    }
                }
            }
            
            // Alert if there are any localStorage variables without "hackare_" in their names (excluding allowed keys)
            if (nonHackareVars.length > 0) {
                console.error('ALERT: Found localStorage variables without "hackare_" in their names:', nonHackareVars);
                alert('ALERT: Found localStorage variables without "hackare_" in their names: ' + nonHackareVars.join(', '));
            }
            
            return hasHackareVar;
        }
        
        /**
         * Mark the user as having visited before
         * Deprecated - no longer used
         */
        function markAsVisited() {
            // Deprecated - no longer used
        }
        
        // Public API
        return {
            showWelcomeModalIfFirstTime,
            hasVisitedBefore,
            markAsVisited,
            isWelcomeDisabled
        };
    }

    // Public API
    return {
        createWelcomeManager
    };
})();
