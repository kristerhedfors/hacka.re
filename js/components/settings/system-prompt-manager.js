/**
 * System Prompt Manager Module
 * Handles system prompt-related functionality for the AIHackare application
 * Works with the Prompts Manager to display and manage the system prompt
 */

window.SystemPromptManager = (function() {
    /**
     * Create a System Prompt Manager instance
     * @param {Object} elements - DOM elements
     * @returns {Object} System Prompt Manager instance
     */
    function createSystemPromptManager(elements) {
        // System prompt state
        let systemPrompt = null;
        
        /**
         * Initialize the system prompt manager
         */
        function init() {
            // Load saved system prompt or use default
            systemPrompt = StorageService.getSystemPrompt();
            
            // If no system prompt is set, use the default one
            if (!systemPrompt) {
                loadDefaultSystemPrompt();
            } else {
                // Update main context usage display if aiHackare is available
                if (window.aiHackare && window.aiHackare.chatManager) {
                    window.aiHackare.chatManager.estimateContextUsage(
                        window.aiHackare.uiManager.updateContextUsage.bind(window.aiHackare.uiManager),
                        window.aiHackare.settingsManager.getCurrentModel()
                    );
                }
            }
            
            // Set up event listener for open prompts config button (prompt library link)
            if (elements.openPromptsConfigBtn) {
                elements.openPromptsConfigBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    openPromptsConfigurator();
                });
            }
            
            // Add debug mode checkbox after system prompt section
            addDebugModeCheckbox();
        }
        
        /**
         * Add debug mode checkbox to the settings form
         */
        function addDebugModeCheckbox() {
            // Create the debug mode checkbox container
            const debugModeContainer = document.createElement('div');
            debugModeContainer.className = 'form-group';
            debugModeContainer.style.marginTop = '10px';
            
            // Create the checkbox group div to keep checkbox and label on same line
            const checkboxGroup = document.createElement('div');
            checkboxGroup.className = 'checkbox-group';
            
            // Create the checkbox input
            const debugModeCheckbox = document.createElement('input');
            debugModeCheckbox.type = 'checkbox';
            debugModeCheckbox.id = 'debug-mode';
            debugModeCheckbox.checked = DebugService.getDebugMode();
            
            // Create the label
            const debugModeLabel = document.createElement('label');
            debugModeLabel.htmlFor = 'debug-mode';
            debugModeLabel.textContent = 'Debug mode';
            
            // Add event listener to the checkbox
            debugModeCheckbox.addEventListener('change', function() {
                DebugService.setDebugMode(this.checked);
                DebugService.log('Debug mode ' + (this.checked ? 'enabled' : 'disabled'));
            });
            
            // Append elements to the checkbox group
            checkboxGroup.appendChild(debugModeCheckbox);
            checkboxGroup.appendChild(debugModeLabel);
            
            // Append checkbox group to the container
            debugModeContainer.appendChild(checkboxGroup);
            
            // Find the system prompt section to insert after
            const systemPromptSection = elements.openPromptsConfigBtn.closest('.form-group');
            if (systemPromptSection && systemPromptSection.parentNode) {
                // Insert the debug mode container after the system prompt section
                systemPromptSection.parentNode.insertBefore(debugModeContainer, systemPromptSection.nextSibling);
            }
        }
        
        
        /**
         * Open the prompts configurator
         */
        function openPromptsConfigurator() {
            // Hide the settings modal
            if (elements.settingsModal) {
                elements.settingsModal.classList.remove('active');
            }
            
            // Show the prompts modal
            if (elements.promptsModal) {
                elements.promptsModal.classList.add('active');
            }
        }
        
        /**
         * Load the default system prompt
         */
        function loadDefaultSystemPrompt() {
            // Default system prompt content embedded directly in the code
            const defaultPrompt = `# hacka.re System Prompt

## About hacka.re

hacka.re is a modern, privacy-focused web client for AI models created in early 2025. It provides a streamlined, browser-based interface for interacting with powerful AI models while maintaining a focus on privacy and user control.

The name "hacka.re" comes from "hackare" (the Swedish word for "hacker"), reflecting the project's ethos: a tool built by hackers for hackers. The tagline "För hackare, av hackare" translates to "for hackers, by hackers."

Unlike many commercial chat interfaces, hacka.re prioritizes user privacy by storing all data locally in the browser. Your API key and conversation history never leave your device except when making direct requests to the AI provider's API. This approach gives users complete control over their data while still providing access to state-of-the-art AI models.

## Key Features

- **High-Performance Models**: Access to ultra-fast inference for models like Llama 3.1, Mixtral, and more.
- **Privacy-Focused**: Your API key and conversations stay in your browser, never stored on external servers.
- **Context Window Visualization**: Real-time display of token usage within model's context limit to optimize your conversations.
- **Markdown Support**: Rich formatting for AI responses including code blocks with syntax highlighting.
- **Persistent History**: Conversation history is saved locally between sessions for continuity.
- **Comprehensive Secure Sharing**: Create session key-protected shareable links to securely share your API key, system prompt, active model, and conversation data with trusted individuals, with real-time link length monitoring.

## Supported Models

hacka.re provides access to all models available through your configured API provider, including models from Meta, Google, Mistral, and more. The interface automatically fetches the latest available models from your account.

The interface automatically fetches and displays all models available through your API key, organizing them into categories for easy selection. The available models will depend on your API access level and the provider's current offerings.

## Technical Implementation

hacka.re is built as a pure client-side application using vanilla JavaScript, HTML, and CSS. This approach eliminates the need for a backend server, ensuring that your data remains on your device.

The application communicates directly with your configured AI provider's API using your personal API key, which is stored securely in your browser's localStorage. All message processing, including markdown rendering and syntax highlighting, happens locally in your browser.

The interface uses server-sent events (SSE) to stream AI responses in real-time, providing a smooth and responsive experience even with longer generations. Context window usage is estimated and displayed visually to help you optimize your conversations.

## Comprehensive Secure Sharing

hacka.re includes a sophisticated feature to securely share various aspects of your configuration with others through session key-protected URL-based sharing. This feature provides enhanced security through cryptographically sound session key-based key derivation, ensuring that only those with the correct session key can access your shared data.

### Sharing Options:
1. **API Key**: Share your API key for access to models
2. **System Prompt**: Share your custom system prompt for consistent AI behavior
3. **Active Model**: Share your selected model preference with automatic fallback if unavailable
4. **Conversation Data**: Share recent conversation history with configurable message count

### Security Features:
- True session key-based encryption: The encryption key is derived from the session key and is never included in the URL
- Salt-based key derivation: A unique salt is generated for each link, protecting against rainbow table attacks
- Multiple hashing iterations: The key derivation process uses multiple iterations to increase security
- URL fragment (#) usage: The data after # is not sent to servers when requesting a page, providing protection against server logging
- Session key confirmation: When creating a link, you must confirm your session key to prevent typos

### Team Collaboration:
Teams can agree on a common session key to use for sharing links. Each team member can enter and lock this session key in their sharing settings, allowing seamless sharing among team members without repeatedly entering the same session key.

### QR Code Generation:
After generating a shareable link, a QR code is automatically created for easy mobile sharing. The system monitors the link length and provides warnings when approaching QR code capacity limits.

## Privacy Considerations

Privacy is a core principle of hacka.re. However, it's important to understand the data flow:

- This is a GitHub Pages site - the application is hosted on GitHub's servers
- Stores your API key only in your browser's localStorage
- Keeps conversation history locally on your device
- All chat content is sent to your configured AI provider's API servers for processing
- Your conversations are subject to your AI provider's privacy policy
- Does not use analytics, tracking, or telemetry
- Has no custom backend server that could potentially log your data
- All external libraries are hosted locally to prevent third-party CDN connections

While this approach gives you more control over your data than many commercial alternatives, please be aware that your conversation content is processed by your AI provider's cloud services. Never share sensitive personal information, credentials, or confidential data in your conversations.

## Getting Started

You're already using hacka.re with your API key. Your key and conversations are saved locally in your browser for future sessions.

To get the most out of hacka.re:
1. Select your preferred model from the dropdown menu
2. Customize your system prompt if desired
3. Start chatting with state-of-the-art AI models
4. Use the context window visualization to optimize your conversations

## Resources

For more information about the technologies used in hacka.re:
- Llama Models - Meta's open language models
- Mistral AI - Creators of the Mixtral model`;

            // Set the system prompt
            systemPrompt = defaultPrompt;
            
            // Save it to storage so it persists
            StorageService.saveSystemPrompt(defaultPrompt);
            
            // Update the system prompt input if it exists
            if (elements.systemPromptInput) {
                elements.systemPromptInput.value = defaultPrompt;
            }
            
            // Update main context usage display if aiHackare is available
            if (window.aiHackare && window.aiHackare.chatManager) {
                window.aiHackare.chatManager.estimateContextUsage(
                    window.aiHackare.uiManager.updateContextUsage.bind(window.aiHackare.uiManager),
                    window.aiHackare.settingsManager.getCurrentModel()
                );
            }
            
            console.log('Default system prompt loaded successfully');
        }
        
        /**
         * Get the current system prompt
         * @returns {string} Current system prompt
         */
        function getSystemPrompt() {
            // Always get the system prompt from storage to ensure we have the latest value
            // This is especially important when the namespace changes due to title/subtitle changes
            return StorageService.getSystemPrompt();
        }
        
        /**
         * Save the system prompt
         * @param {string} prompt - The system prompt to save
         */
        function saveSystemPrompt(prompt) {
            StorageService.saveSystemPrompt(prompt);
            systemPrompt = prompt;
            
            // Update main context usage display if aiHackare is available
            if (window.aiHackare && window.aiHackare.chatManager) {
                window.aiHackare.chatManager.estimateContextUsage(
                    window.aiHackare.uiManager.updateContextUsage.bind(window.aiHackare.uiManager),
                    window.aiHackare.settingsManager.getCurrentModel()
                );
            }
        }
        
        // Public API
        return {
            init,
            loadDefaultSystemPrompt,
            getSystemPrompt,
            saveSystemPrompt
        };
    }

    // Public API
    return {
        createSystemPromptManager
    };
})();
