/**
 * Settings Manager Module
 * Handles settings-related functionality for the AIHackare application
 */

window.SettingsManager = (function() {
    /**
     * Create a Settings Manager instance
     * @param {Object} elements - DOM elements
     * @returns {Object} Settings Manager instance
     */
    function createSettingsManager(elements) {
        // Settings state
        let apiKey = null;
        let currentModel = ''; // Empty initially, will be populated from API
        let systemPrompt = null;
        let pendingSharedModel = null;
        let baseUrl = null;
        
        // Session key getter function
        let getSessionKey = null;
        
        // Function to set messages in the chat
        let setMessages = null;
        
        /**
         * Initialize the settings manager
         * @param {Function} updateModelInfoDisplay - Function to update model info display
         * @param {Function} showApiKeyModal - Function to show API key modal
         * @param {Function} addSystemMessage - Function to add system message
         * @param {Function} sessionKeyGetter - Function to get the session key
         * @param {Function} messagesUpdater - Function to update chat messages
         */
        function init(updateModelInfoDisplay, showApiKeyModal, addSystemMessage, sessionKeyGetter, messagesUpdater) {
            // Store the session key getter function and messages updater
            getSessionKey = sessionKeyGetter;
            setMessages = messagesUpdater;
            // Check if there's a shared API key in the URL
            if (ShareService.hasSharedApiKey()) {
                // Show password prompt for decryption
                promptForDecryptionPassword(updateModelInfoDisplay, addSystemMessage);
            } else {
                // Check if API key exists
                apiKey = StorageService.getApiKey();
                
                if (!apiKey) {
                    // Create a welcome modal to show the first time
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
                            // Show settings modal after welcome modal is closed
                            if (elements.settingsModal) {
                                elements.settingsModal.classList.add('active');
                            }
                        });
                    } else {
                        // If already visited before, just show settings modal directly
                        if (elements.settingsModal) {
                            elements.settingsModal.classList.add('active');
                        }
                    }
                } else {
                    // Fetch available models if API key exists
                    // Use updateStorage=true to ensure the values are properly loaded
                    fetchAvailableModels(apiKey, baseUrl, true);
                }
            }
            
            // Load saved model preference
            const savedModel = StorageService.getModel();
            if (savedModel) {
                currentModel = savedModel;
                if (elements.modelSelect) {
                    elements.modelSelect.value = savedModel;
                }
            }
            
            // Load saved base URL and provider
            baseUrl = StorageService.getBaseUrl();
            const baseUrlProvider = StorageService.getBaseUrlProvider();
            
            // Set the provider dropdown
            if (elements.baseUrlSelect) {
                elements.baseUrlSelect.value = baseUrlProvider;
                
                // Show/hide custom URL field based on selection
                if (baseUrlProvider === 'custom') {
                    elements.customBaseUrlGroup.style.display = 'block';
                    if (elements.baseUrl) {
                        elements.baseUrl.value = baseUrl;
                    }
                } else {
                    elements.customBaseUrlGroup.style.display = 'none';
                }
                
                // Add event listener for provider change
                elements.baseUrlSelect.addEventListener('change', function() {
                    const selectedProvider = this.value;
                    
                    if (selectedProvider === 'custom') {
                        // Show custom URL field
                        elements.customBaseUrlGroup.style.display = 'block';
                    } else {
                        // Hide custom URL field and set to default URL for the provider
                        elements.customBaseUrlGroup.style.display = 'none';
                        const defaultUrl = StorageService.getDefaultBaseUrlForProvider(selectedProvider);
                        if (elements.baseUrl) {
                            elements.baseUrl.value = defaultUrl;
                        }
                    }
                });
            }
            
            // Load saved system prompt or use default
            systemPrompt = StorageService.getSystemPrompt();
            
            // If no system prompt is set, use the default one from hacka.re-system-prompt.md
            if (!systemPrompt) {
                loadDefaultSystemPrompt();
            }
            
            // Set up event listener for reset system prompt button
            if (elements.resetSystemPromptBtn) {
                elements.resetSystemPromptBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    loadDefaultSystemPrompt();
                });
            }
            
            // Set up event listener for model reload button
            if (elements.modelReloadBtn) {
                elements.modelReloadBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    
                    // Clear the model select and show loading state
                    elements.modelSelect.innerHTML = '<option disabled selected>Loading models...</option>';
                    
                    // Disable the button and show loading state
                    const originalIcon = this.innerHTML;
                    this.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    this.disabled = true;
                    
                    // Get the current values from the UI instead of using stored values
                    const currentApiKey = elements.apiKeyUpdate.value.trim() || apiKey;
                    const currentBaseUrl = elements.baseUrl.value.trim() || baseUrl;
                    
                    // Fetch models from API using the current UI values
                    fetchAvailableModels(currentApiKey, currentBaseUrl).then(() => {
                        // Re-enable the button and restore icon
                        this.innerHTML = originalIcon;
                        this.disabled = false;
                    }).catch(() => {
                        // Re-enable the button and restore icon even if there's an error
                        this.innerHTML = originalIcon;
                        this.disabled = false;
                    });
                });
            }
            
            // Update model info in header
            if (updateModelInfoDisplay) {
                updateModelInfoDisplay(currentModel);
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
            
            console.log('Default system prompt loaded successfully');
        }
        
        /**
         * Save the API key
         * @param {Function} hideApiKeyModal - Function to hide API key modal
         * @param {Function} addSystemMessage - Function to add system message
         */
        function saveApiKey(hideApiKeyModal, addSystemMessage) {
            const newApiKey = elements.apiKeyInput.value.trim();
            
            if (newApiKey) {
                // Save API key to local storage
                StorageService.saveApiKey(newApiKey);
                apiKey = newApiKey;
                
                // Hide modal
                if (hideApiKeyModal) {
                    hideApiKeyModal();
                }
                
                // Fetch available models with the new API key and update storage
                fetchAvailableModels(newApiKey, baseUrl, true);
                
                // Add welcome message
                if (addSystemMessage) {
                    addSystemMessage('API key saved. You can now start chatting with AI models.');
                }
                
                return true;
            }
            
            return false;
        }
        
        /**
         * Save settings
         * @param {Function} hideSettingsModal - Function to hide settings modal
         * @param {Function} updateModelInfoDisplay - Function to update model info display
         * @param {Function} addSystemMessage - Function to add system message
         */
        function saveSettings(hideSettingsModal, updateModelInfoDisplay, addSystemMessage) {
            // Save model preference
            const selectedModel = elements.modelSelect.value;
            StorageService.saveModel(selectedModel);
            currentModel = selectedModel;
            
            // Get values from UI
            const newApiKey = elements.apiKeyUpdate.value.trim();
            const selectedProvider = elements.baseUrlSelect.value;
            
            // Determine the base URL based on the selected provider
            let newBaseUrl;
            if (selectedProvider === 'custom') {
                newBaseUrl = elements.baseUrl.value.trim();
            } else {
                newBaseUrl = StorageService.getDefaultBaseUrlForProvider(selectedProvider);
            }
            
            // Save the provider selection
            StorageService.saveBaseUrlProvider(selectedProvider);
            
            // We'll use these values to fetch models with updateStorage=true
            // This ensures the values are saved and used for future API calls
            const apiKeyToUse = newApiKey || apiKey;
            const baseUrlToUse = newBaseUrl || baseUrl;
            
            // Save system prompt
            const newSystemPrompt = elements.systemPromptInput.value.trim();
            StorageService.saveSystemPrompt(newSystemPrompt);
            systemPrompt = newSystemPrompt;
            
            // Fetch models with the new values and update storage
            // This ensures the values are saved and used for future API calls
            fetchAvailableModels(apiKeyToUse, baseUrlToUse, true);
            
            // Update model info in header
            if (updateModelInfoDisplay) {
                updateModelInfoDisplay(currentModel);
            }
            
            // Hide modal
            if (hideSettingsModal) {
                hideSettingsModal();
            }
            
            // Get a simplified display name for the model
            const displayName = ModelInfoService.getDisplayName(selectedModel);
            
            // Add confirmation message
            if (addSystemMessage) {
                addSystemMessage(`Settings saved. Using model: ${displayName}`);
            }
            
            return true;
        }
        
        /**
         * Fetch available models from the API
         * @param {string} currentApiKey - The API key to use (from UI or storage)
         * @param {string} currentBaseUrl - The base URL to use (from UI or storage)
         * @param {boolean} updateStorage - Whether to update storage with the provided values
         */
        async function fetchAvailableModels(currentApiKey = apiKey, currentBaseUrl = baseUrl, updateStorage = false) {
            if (!currentApiKey) return;
            
            try {
                // Use the provided values for this API call only
                const models = await ApiService.fetchAvailableModels(currentApiKey, currentBaseUrl);
                
                // Only update storage and internal variables if explicitly requested
                // This ensures values from UI are not saved unless the user clicks "Save"
                if (updateStorage) {
                    StorageService.saveApiKey(currentApiKey);
                    apiKey = currentApiKey;
                    
                    StorageService.saveBaseUrl(currentBaseUrl);
                    baseUrl = currentBaseUrl;
                }
                
                // Clear existing options
                elements.modelSelect.innerHTML = '';
                
                // Create optgroups for different model types
                const standardGroup = document.createElement('optgroup');
                standardGroup.label = 'Production Models';
                
                const previewGroup = document.createElement('optgroup');
                previewGroup.label = 'Preview Models';
                
                const systemGroup = document.createElement('optgroup');
                systemGroup.label = 'Preview Systems';
                
                // Get list of fetched model IDs
                const fetchedModelIds = models.map(model => model.id);
                
                // Add production models if they exist in fetched models
                ModelInfoService.productionModels.forEach(modelId => {
                    if (fetchedModelIds.includes(modelId)) {
                        const option = document.createElement('option');
                        option.value = modelId;
                        
                        // Get simplified display name
                        option.textContent = ModelInfoService.getDisplayName(modelId);
                        
                        // Set selected if it matches current model
                        if (modelId === currentModel) {
                            option.selected = true;
                        }
                        
                        standardGroup.appendChild(option);
                    }
                });
                
                // Add preview models if they exist in fetched models
                ModelInfoService.previewModels.forEach(modelId => {
                    if (fetchedModelIds.includes(modelId)) {
                        const option = document.createElement('option');
                        option.value = modelId;
                        
                        // Get simplified display name
                        option.textContent = ModelInfoService.getDisplayName(modelId);
                        
                        // Set selected if it matches current model
                        if (modelId === currentModel) {
                            option.selected = true;
                        }
                        
                        previewGroup.appendChild(option);
                    }
                });
                
                // Add system models if they exist in fetched models
                ModelInfoService.systemModels.forEach(modelId => {
                    if (fetchedModelIds.includes(modelId)) {
                        const option = document.createElement('option');
                        option.value = modelId;
                        
                        // Get simplified display name
                        option.textContent = ModelInfoService.getDisplayName(modelId);
                        
                        // Set selected if it matches current model
                        if (modelId === currentModel) {
                            option.selected = true;
                        }
                        
                        systemGroup.appendChild(option);
                    }
                });
                
                // Add other available models that aren't in our predefined lists
                const knownModelIds = [
                    ...ModelInfoService.productionModels, 
                    ...ModelInfoService.previewModels, 
                    ...ModelInfoService.systemModels
                ];
                
                models.forEach(model => {
                    if (!knownModelIds.includes(model.id)) {
                        const option = document.createElement('option');
                        option.value = model.id;
                        
                        // Try to get a simplified name, or use the model ID
                        option.textContent = ModelInfoService.getDisplayName(model.id);
                        
                        // Set selected if it matches current model
                        if (model.id === currentModel) {
                            option.selected = true;
                        }
                        
                        // Add to appropriate group based on naming patterns
                        if (model.id.includes('preview') || model.id.includes('beta')) {
                            previewGroup.appendChild(option);
                        } else {
                            standardGroup.appendChild(option);
                        }
                    }
                });
                
                // Add groups to select element if they have options
                if (standardGroup.children.length > 0) {
                    elements.modelSelect.appendChild(standardGroup);
                }
                
                if (previewGroup.children.length > 0) {
                    elements.modelSelect.appendChild(previewGroup);
                }
                
                if (systemGroup.children.length > 0) {
                    elements.modelSelect.appendChild(systemGroup);
                }
                
                // Check if we have a pending shared model to apply
                if (pendingSharedModel) {
                    const sharedModel = pendingSharedModel;
                    pendingSharedModel = null; // Clear it to avoid reapplying
                    
                    // Check if the model is available
                    if (fetchedModelIds.includes(sharedModel)) {
                        // Apply the model
                        currentModel = sharedModel;
                        StorageService.saveModel(sharedModel);
                        elements.modelSelect.value = sharedModel;
                        
                        return {
                            success: true,
                            model: sharedModel
                        };
                    } else {
                        return {
                            success: false,
                            model: sharedModel
                        };
                    }
                }
                
                return { success: true };
                
            } catch (error) {
                console.error('Error fetching models:', error);
                // Fallback to default models if fetch fails
                populateDefaultModels();
                return { success: false, error: error.message };
            }
        }
        
        /**
         * Handle the case when models can't be fetched
         */
        function populateDefaultModels() {
            // Clear existing options
            elements.modelSelect.innerHTML = '';
            
            // Create a single option indicating that models couldn't be fetched
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Failed to fetch models - check API key and connection';
            option.disabled = true;
            option.selected = true;
            
            // Add the option to the select element
            elements.modelSelect.appendChild(option);
            
            // Add a hint option
            const hintOption = document.createElement('option');
            hintOption.value = '';
            hintOption.textContent = 'Try reloading models after checking settings';
            hintOption.disabled = true;
            
            elements.modelSelect.appendChild(hintOption);
        }
        
        /**
         * Prompt for password to decrypt shared data from URL
         * @param {Function} updateModelInfoDisplay - Function to update model info display
         * @param {Function} addSystemMessage - Function to add system message
         */
        function promptForDecryptionPassword(updateModelInfoDisplay, addSystemMessage) {
            // Try the current session key first if available
            if (getSessionKey && getSessionKey()) {
                try {
                    const sharedData = ShareService.extractSharedApiKey(getSessionKey());
                    
                    if (sharedData && sharedData.apiKey) {
                        // Session key worked, apply the shared data
                        StorageService.saveApiKey(sharedData.apiKey);
                        apiKey = sharedData.apiKey;
                        
                        // Mask the API key to show only first and last 4 bytes
                        const maskedApiKey = maskApiKey(sharedData.apiKey);
                        
                        // Report each setting separately
                        if (addSystemMessage) {
                            addSystemMessage(`Shared API key (${maskedApiKey}) has been applied using the current session key.`);
                        }
                        
                        // If there's a base URL, save it too
                        if (sharedData.baseUrl) {
                            StorageService.saveBaseUrl(sharedData.baseUrl);
                            baseUrl = sharedData.baseUrl;
                            
                            if (addSystemMessage) {
                                addSystemMessage(`Shared base URL has been applied.`);
                            }
                        }
                        
                        // If there's a system prompt, save it too
                        if (sharedData.systemPrompt) {
                            StorageService.saveSystemPrompt(sharedData.systemPrompt);
                            systemPrompt = sharedData.systemPrompt;
                            
                            if (addSystemMessage) {
                                addSystemMessage(`Shared system prompt has been applied.`);
                            }
                        }
                        
                        // If there's a model, check if it's available and apply it
                        if (sharedData.model) {
                            // We'll fetch models first and then check if the model is available
                            pendingSharedModel = sharedData.model;
                            
                            // No need to show a message about the model preference, as it will either load or fail with its own message
                        }
                        
                        // If there are shared messages, update the chat
                        if (sharedData.messages && sharedData.messages.length > 0 && setMessages) {
                            setMessages(sharedData.messages);
                            
                            if (addSystemMessage) {
                                addSystemMessage(`Shared conversation history with ${sharedData.messages.length} messages has been loaded.`);
                            }
                        }
                        
                        // Clear the shared data from the URL
                        ShareService.clearSharedApiKeyFromUrl();
                        
                        // Fetch available models with the new API key and update storage
                        fetchAvailableModels(apiKey, baseUrl, true);
                        
                        // No need to show the password modal
                        return;
                    }
                } catch (error) {
                    console.log('Current session key did not work for this shared link, prompting for password');
                    // Continue to password prompt if session key didn't work
                }
            }
            
            // Create a modal for password input
            const passwordModal = document.createElement('div');
            passwordModal.className = 'modal active';
            passwordModal.id = 'password-modal';
            
            const modalContent = document.createElement('div');
            modalContent.className = 'modal-content';
            
            const heading = document.createElement('h2');
            heading.textContent = 'Enter Password';
            
            const paragraph = document.createElement('p');
            paragraph.textContent = 'This shared link is password-protected. Please enter the password to decrypt the data.';
            
            const form = document.createElement('form');
            form.id = 'password-form';
            
            const formGroup = document.createElement('div');
            formGroup.className = 'form-group';
            
            const label = document.createElement('label');
            label.htmlFor = 'decrypt-password';
            label.textContent = 'Password';
            
            const input = document.createElement('input');
            input.type = 'password';
            input.id = 'decrypt-password';
            input.placeholder = 'Enter password';
            input.required = true;
            
            const formActions = document.createElement('div');
            formActions.className = 'form-actions';
            
            const submitButton = document.createElement('button');
            submitButton.type = 'submit';
            submitButton.className = 'btn primary-btn';
            submitButton.textContent = 'Decrypt';
            
            // Assemble the modal
            formGroup.appendChild(label);
            formGroup.appendChild(input);
            
            formActions.appendChild(submitButton);
            
            form.appendChild(formGroup);
            form.appendChild(formActions);
            
            modalContent.appendChild(heading);
            modalContent.appendChild(paragraph);
            modalContent.appendChild(form);
            
            passwordModal.appendChild(modalContent);
            
            // Add to document
            document.body.appendChild(passwordModal);
            
            // Focus the input
            input.focus();
            
            // Handle form submission
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const password = input.value.trim();
                if (!password) return;
                
                // Try to decrypt with the provided password
                const sharedData = ShareService.extractSharedApiKey(password);
                
                if (sharedData && sharedData.apiKey) {
                    // Save the shared API key
                    StorageService.saveApiKey(sharedData.apiKey);
                    apiKey = sharedData.apiKey;
                    
                    // Mask the API key to show only first and last 4 bytes
                    const maskedApiKey = maskApiKey(sharedData.apiKey);
                    
                    // Report each setting separately
                    if (addSystemMessage) {
                        addSystemMessage(`Shared API key (${maskedApiKey}) has been applied.`);
                    }
                    
                    // If there's a base URL, save it too
                    if (sharedData.baseUrl) {
                        StorageService.saveBaseUrl(sharedData.baseUrl);
                        baseUrl = sharedData.baseUrl;
                        
                        if (addSystemMessage) {
                            addSystemMessage(`Shared base URL has been applied.`);
                        }
                    }
                    
                    // If there's a system prompt, save it too
                    if (sharedData.systemPrompt) {
                        StorageService.saveSystemPrompt(sharedData.systemPrompt);
                        systemPrompt = sharedData.systemPrompt;
                        
                        if (addSystemMessage) {
                            addSystemMessage(`Shared system prompt has been applied.`);
                        }
                    }
                    
                    // If there's a model, check if it's available and apply it
                    if (sharedData.model) {
                        // We'll fetch models first and then check if the model is available
                        pendingSharedModel = sharedData.model;
                        
                        // No need to show a message about the model preference, as it will either load or fail with its own message
                    }
                    
                    // If there are shared messages, update the chat
                    if (sharedData.messages && sharedData.messages.length > 0 && setMessages) {
                        setMessages(sharedData.messages);
                        
                        if (addSystemMessage) {
                            addSystemMessage(`Shared conversation history with ${sharedData.messages.length} messages has been loaded.`);
                        }
                    }
                    
                    // Clear the shared data from the URL
                    ShareService.clearSharedApiKeyFromUrl();
                    
                    // Remove the password modal
                    passwordModal.remove();
                    
                    // Fetch available models with the new API key and update storage
                    fetchAvailableModels(apiKey, baseUrl, true).then(result => {
                        if (result.success && result.model) {
                            // If a shared model was applied successfully
                            const displayName = ModelInfoService.getDisplayName(result.model);
                            if (addSystemMessage) {
                                addSystemMessage(`Shared model "${displayName}" has been applied.`);
                            }
                            
                            // Update model info display
                            if (updateModelInfoDisplay) {
                                updateModelInfoDisplay(currentModel);
                            }
                        } else if (result.model) {
                            // If a shared model was not available
                            const displayName = ModelInfoService.getDisplayName(result.model);
                            if (addSystemMessage) {
                                addSystemMessage(`Warning: Shared model "${displayName}" is not available with your API key. Using default model instead.`);
                            }
                        }
                    });
                } else {
                    // If decryption failed, show an error message
                    paragraph.textContent = 'Incorrect password. Please try again.';
                    paragraph.style.color = 'red';
                    input.value = '';
                    input.focus();
                }
            });
            
            // Close modal when clicking outside
            passwordModal.addEventListener('click', (e) => {
                if (e.target === passwordModal) {
                    passwordModal.remove();
                    
                    // Check if API key exists
                    apiKey = StorageService.getApiKey();
                    
                    if (!apiKey) {
                        showApiKeyModal();
                    } else {
                        // Fetch available models if API key exists
                        fetchAvailableModels(apiKey, baseUrl, true);
                    }
                }
            });
            
            // Handle escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && document.getElementById('password-modal')) {
                    passwordModal.remove();
                    
                    // Check if API key exists
                    apiKey = StorageService.getApiKey();
                    
                    if (!apiKey) {
                        showApiKeyModal();
                    } else {
                        // Fetch available models if API key exists
                        fetchAvailableModels(apiKey, baseUrl, true);
                    }
                }
            });
        }
        
        /**
         * Mask an API key, showing only first and last 4 bytes
         * @param {string} apiKey - The API key to mask
         * @returns {string} Masked API key
         */
        function maskApiKey(apiKey) {
            if (!apiKey || apiKey.length < 8) {
                return "Invalid API key format";
            }
            
            const first4 = apiKey.substring(0, 4);
            const last4 = apiKey.substring(apiKey.length - 4);
            const maskedLength = apiKey.length - 8;
            const maskedPart = '*'.repeat(maskedLength);
            
            return `${first4}${maskedPart}${last4}`;
        }
        
        /**
         * Get the current API key
         * @returns {string} Current API key
         */
        function getApiKey() {
            return apiKey;
        }
        
        /**
         * Get the current model
         * @returns {string} Current model ID
         */
        function getCurrentModel() {
            return currentModel;
        }
        
        /**
         * Get the current system prompt
         * @returns {string} Current system prompt
         */
        function getSystemPrompt() {
            return systemPrompt;
        }
        
        /**
         * Get the current base URL
         * @returns {string} Current base URL
         */
        function getBaseUrl() {
            return baseUrl;
        }
        
        /**
         * Clear all settings from localStorage or reset to default values
         * @param {Function} hideSettingsModal - Function to hide settings modal
         * @param {Function} addSystemMessage - Function to add system message
         */
        function clearAllSettings(hideSettingsModal, addSystemMessage) {
            // Remove all settings from localStorage
            localStorage.removeItem(StorageService.STORAGE_KEYS.API_KEY);
            localStorage.removeItem(StorageService.STORAGE_KEYS.MODEL);
            localStorage.removeItem(StorageService.STORAGE_KEYS.SYSTEM_PROMPT);
            localStorage.removeItem(StorageService.STORAGE_KEYS.SHARE_OPTIONS);
            localStorage.removeItem(StorageService.STORAGE_KEYS.BASE_URL);
            localStorage.removeItem(StorageService.STORAGE_KEYS.BASE_URL_PROVIDER);
            
            // Update UI elements
            if (elements.baseUrl) {
                elements.baseUrl.value = '';
            }
            if (elements.apiKeyUpdate) {
                elements.apiKeyUpdate.value = '';
            }
            if (elements.systemPromptInput) {
                elements.systemPromptInput.value = '';
            }
            
            // Reset internal state
            apiKey = null;
            currentModel = '';
            systemPrompt = null;
            baseUrl = null;
            
            // Hide modal if provided
            if (hideSettingsModal) {
                hideSettingsModal();
            }
            
            // Add confirmation message
            if (addSystemMessage) {
                addSystemMessage('All settings have been cleared.');
            }
            
            return true;
        }
        
        // Public API
        return {
            init,
            saveApiKey,
            saveSettings,
            fetchAvailableModels,
            populateDefaultModels,
            promptForDecryptionPassword,
            maskApiKey,
            getApiKey,
            getCurrentModel,
            getSystemPrompt,
            getBaseUrl,
            clearAllSettings
        };
    }

    // Public API
    return {
        createSettingsManager: createSettingsManager
    };
})();
