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
                    // Load saved base URL before fetching models
                    baseUrl = StorageService.getBaseUrl();
                    
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
            // This approach avoids CORS errors that would occur when trying to load from a file
            const defaultPrompt = `# hacka.re System Prompt

## Your Role as an API Integration Assistant

You are an expert API integration assistant in hacka.re, a privacy-focused web client for AI models. Your primary purpose is to help users define, create, and use API tools through the tool calling interface.

## About hacka.re

hacka.re is a modern, privacy-focused web client for AI models with these key features:

- **Serverless Architecture**: Pure client-side application with no backend server
- **Privacy-Focused**: All data stored locally in browser's localStorage
- **Minimal Dependencies**: Only essential libraries to minimize attack surface
  - \`marked\` for Markdown rendering
  - \`dompurify\` for XSS prevention
  - \`tweetnacl\` for in-browser encryption
  - \`qrcode\` for QR code generation
- **Secure Sharing**: Session key-protected URL-based sharing of configurations
- **Tool Calling**: Support for OpenAI-compatible tool calling interface

## Key Capabilities

### API Tool Creation
- Help users define new API tools by gathering necessary information:
  - Tool name and description
  - API endpoint URL and HTTP method
  - Authentication requirements
  - Parameter schema in OpenAPI JSON Schema format
- Suggest improvements to API tool definitions
- Troubleshoot issues with API tool configurations

### API Integration
- Assist with integrating external APIs as tools
- Convert API documentation into proper tool definitions
- Help users understand API requirements and parameters
- Guide users through the process of testing and refining API tools

### Tool Calling
- Use defined tools effectively during conversations
- Explain how tool calling works in the context of the conversation
- Demonstrate proper tool usage with examples
- Handle tool call results and explain them to the user

## Working with APIs

When helping users integrate APIs:

1. **Understand the API**: Ask for documentation or specifications if needed
2. **Define Parameters**: Help create proper JSON Schema definitions for parameters
3. **Authentication**: Guide users through setting up the right authentication method
4. **Testing**: Assist with testing the API integration
5. **Refinement**: Help improve the tool definition based on testing results

## Tool Definition Format

API tools in hacka.re follow this structure:
\`\`\`json
{
  "name": "tool_name",
  "description": "What this tool does and when to use it",
  "endpoint": "https://api.example.com/endpoint",
  "method": "GET|POST|PUT|DELETE",
  "authType": "none|bearer|custom",
  "authHeader": "Custom-Auth-Header",
  "parameters": {
    "type": "object",
    "properties": {
      "param1": {
        "type": "string",
        "description": "Description of parameter"
      }
    },
    "required": ["param1"]
  }
}
\`\`\`

## Comprehensive Secure Sharing

hacka.re includes sophisticated secure sharing through session key-protected URL-based sharing:

- **Encryption**: True session key-based encryption with the key never included in URL
- **Sharing Options**: API key, system prompt, active model, conversation data
- **Team Collaboration**: Common session key for seamless sharing
- **QR Code Generation**: For easy mobile sharing

Example code for secure sharing:
\`\`\`javascript
// Generate a strong random alphanumeric session key
function generateStrongSessionKey() {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let password = "";
    const randomValues = new Uint8Array(length);
    window.crypto.getRandomValues(randomValues);
    for (let i = 0; i < length; i++) {
        password += charset[randomValues[i] % charset.length];
    }
    return password;
}

// Encrypt data with a session key
function encryptData(payloadObj, sessionKey) {
    const jsonString = JSON.stringify(payloadObj);
    const plain = nacl.util.decodeUTF8(jsonString);
    const salt = nacl.randomBytes(SALT_LENGTH);
    const key = deriveSeed(sessionKey, salt);
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    const cipher = nacl.secretbox(plain, nonce, key);
    const fullMessage = new Uint8Array(salt.length + nonce.length + cipher.length);
    let offset = 0;
    fullMessage.set(salt, offset);
    offset += salt.length;
    fullMessage.set(nonce, offset);
    offset += nonce.length;
    fullMessage.set(cipher, offset);
    return nacl.util.encodeBase64(fullMessage);
}
\`\`\`

## Static Integration Examples

### API Tools Service
\`\`\`javascript
// API Tools Service core functionality
const ApiToolsService = (function() {
    const STORAGE_KEY = 'hacka_re_api_tools';
    let apiTools = [];
    
    function init() {
        const savedTools = localStorage.getItem(STORAGE_KEY);
        if (savedTools) {
            try {
                apiTools = JSON.parse(savedTools);
            } catch (error) {
                console.error('Error loading API tool definitions:', error);
                apiTools = [];
            }
        }
    }
    
    function formatToolsForOpenAI() {
        return apiTools.map(tool => ({
            type: "function",
            function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters || {
                    type: "object",
                    properties: {},
                    required: []
                }
            }
        }));
    }
    
    return {
        init,
        getApiTools: () => apiTools,
        formatToolsForOpenAI
    };
})();
\`\`\`

### Tool Calling Implementation
\`\`\`javascript
// Add tools to API request if available
const requestBody = {
    model: model,
    messages: apiMessages,
    stream: true
};

if (enableToolCalling && window.ApiToolsService) {
    const tools = ApiToolsService.formatToolsForOpenAI();
    if (tools && tools.length > 0) {
        requestBody.tools = tools;
        requestBody.tool_choice = "auto";
    }
}

// Process tool calls from streaming response
if (delta.tool_calls && delta.tool_calls.length > 0) {
    const toolCallDelta = delta.tool_calls[0];
    
    // Initialize a new tool call if we get an index
    if (toolCallDelta.index !== undefined) {
        if (!toolCalls[toolCallDelta.index]) {
            toolCalls[toolCallDelta.index] = {
                id: toolCallDelta.id || "",
                type: "function",
                function: {
                    name: "",
                    arguments: ""
                }
            };
        }
        currentToolCall = toolCalls[toolCallDelta.index];
    }
    
    // Update the current tool call with new data
    if (currentToolCall) {
        if (toolCallDelta.id) {
            currentToolCall.id = toolCallDelta.id;
        }
        
        if (toolCallDelta.function) {
            if (toolCallDelta.function.name) {
                currentToolCall.function.name += toolCallDelta.function.name;
            }
            if (toolCallDelta.function.arguments) {
                currentToolCall.function.arguments += toolCallDelta.function.arguments;
            }
        }
    }
}
\`\`\`

## Best Practices

- **Clear Descriptions**: Write clear, concise descriptions for tools and parameters
- **Proper Naming**: Use snake_case for tool names (e.g., weather_lookup)
- **Parameter Validation**: Define parameter constraints (enum, pattern, etc.) when possible
- **Error Handling**: Suggest error handling strategies for API calls
- **Security**: Advise on secure handling of API keys and sensitive data

Remember that all API calls are made directly from the browser, maintaining hacka.re's privacy-focused approach with no server-side components.`;

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
                
                // Make sure base URL is loaded before fetching models
                baseUrl = StorageService.getBaseUrl();
                
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
                
                // If no model is currently selected, select a default model based on the provider
                if (!currentModel || currentModel === '') {
                    // Determine the provider from the base URL
                    let provider = 'groq'; // Default provider
                    if (currentBaseUrl) {
                        if (currentBaseUrl.includes('openai.com')) {
                            provider = 'openai';
                        } else if (currentBaseUrl.includes('localhost:11434')) {
                            provider = 'ollama';
                        }
                    }
                    
                    let modelToSelect = null;
                    
                    // For Ollama, select the first model in the list
                    if (provider === 'ollama') {
                        if (fetchedModelIds.length > 0) {
                            modelToSelect = fetchedModelIds[0];
                        }
                    } else {
                        // For other providers, try to use the default model
                        const defaultModel = ModelInfoService.defaultModels[provider];
                        
                        // Check if the default model is available
                        if (defaultModel && fetchedModelIds.includes(defaultModel)) {
                            modelToSelect = defaultModel;
                        } else if (fetchedModelIds.length > 0) {
                            // If default model is not available, pick the first available model
                            modelToSelect = fetchedModelIds[0];
                        }
                    }
                    
                    // Apply the selected model if one was found
                    if (modelToSelect) {
                        currentModel = modelToSelect;
                        StorageService.saveModel(modelToSelect);
                        elements.modelSelect.value = modelToSelect;
                        console.log(`Selected model for ${provider}: ${modelToSelect}`);
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
                        
                        // Make sure base URL is loaded before fetching models
                        baseUrl = StorageService.getBaseUrl();
                        
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
                    
                    // If there's a title, save it and update the UI
                    if (sharedData.title) {
                        StorageService.saveTitle(sharedData.title);
                        // Call the global function to update title and subtitle
                        window.updateTitleAndSubtitle();
                        
                        if (addSystemMessage) {
                            addSystemMessage(`Shared title "${sharedData.title}" has been applied.`);
                        }
                    }
                    
                    // If there's a subtitle, save it and update the UI
                    if (sharedData.subtitle) {
                        StorageService.saveSubtitle(sharedData.subtitle);
                        // Call the global function to update title and subtitle
                        window.updateTitleAndSubtitle();
                        
                        if (addSystemMessage) {
                            addSystemMessage(`Shared subtitle "${sharedData.subtitle}" has been applied.`);
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
         * Update the title and subtitle on all index pages
         */
        function updateTitleAndSubtitle() {
            const title = StorageService.getTitle();
            const subtitle = StorageService.getSubtitle();
            
            // Update main page
            const logoTextElements = document.querySelectorAll('.logo-text');
            const taglineElements = document.querySelectorAll('.tagline');
            
            logoTextElements.forEach(element => {
                // Preserve the heart logo and typing dots
                const heartLogo = element.querySelector('.heart-logo');
                if (heartLogo) {
                    element.innerHTML = title + '<span class="heart-logo">' + heartLogo.innerHTML + '</span>';
                } else {
                    element.textContent = title;
                }
            });
            
            taglineElements.forEach(element => {
                element.textContent = subtitle;
            });
            
            // Update document title
            document.title = title + ' - ' + subtitle;
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
            localStorage.removeItem(StorageService.STORAGE_KEYS.TITLE);
            localStorage.removeItem(StorageService.STORAGE_KEYS.SUBTITLE);
            
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
            
            // Update title and subtitle in the UI to reflect defaults
            if (window.updateTitleAndSubtitle) {
                window.updateTitleAndSubtitle();
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
