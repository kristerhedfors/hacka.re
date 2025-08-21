/**
 * DOM Elements Module
 * Handles DOM element references for the AIHackare application
 */

window.DOMElements = (function() {
    /**
     * Get all DOM elements needed for the application
     * @returns {Object} Object containing DOM element references
     */
    function getElements() {
        return {
            // Chat elements
            chatMessages: document.getElementById('chat-messages'),
            chatForm: document.getElementById('chat-form'),
            messageInput: document.getElementById('message-input'),
            sendBtn: document.getElementById('send-btn'),
            
            // API key modal elements
            apiKeyModal: document.getElementById('api-key-modal'),
            apiKeyForm: document.getElementById('api-key-form'),
            apiKeyInput: document.getElementById('api-key'),
            apiKeyDetection: document.getElementById('api-key-detection'),
            apiKeyDetectionText: document.getElementById('api-key-detection-text'),
            
            // Share modal elements
            shareBtn: document.getElementById('share-btn'),
            shareModal: document.getElementById('share-modal'),
            shareForm: document.getElementById('share-form'),
            sharePassword: document.getElementById('share-password'),
            regeneratePasswordBtn: document.getElementById('regenerate-password'),
            togglePasswordVisibilityBtn: document.getElementById('toggle-password-visibility'),
            copyPasswordBtn: document.getElementById('copy-password'),
            shareBaseUrlCheckbox: document.getElementById('share-base-url'),
            shareApiKeyCheckbox: document.getElementById('share-api-key'),
            shareSystemPromptCheckbox: document.getElementById('share-system-prompt'),
            shareModelCheckbox: document.getElementById('share-model'),
            shareConversationCheckbox: document.getElementById('share-conversation'),
            messageHistoryCount: document.getElementById('message-history-count'),
            messageHistoryContainer: document.querySelector('.message-history-container'),
            sharePromptLibraryCheckbox: document.getElementById('share-prompt-library'),
            shareFunctionLibraryCheckbox: document.getElementById('share-function-library'),
            shareMcpConnectionsCheckbox: document.getElementById('share-mcp-connections'),
            shareThemeCheckbox: document.getElementById('share-theme'),
            shareWelcomeMessageCheckbox: document.getElementById('share-welcome-message-checkbox'),
            shareWelcomeMessageInput: document.getElementById('share-welcome-message'),
            generateShareLinkBtn: document.getElementById('generate-share-link-btn'),
            closeShareModalBtn: document.getElementById('close-share-modal'),
            generatedLinkContainer: document.getElementById('generated-link-container'),
            generatedLink: document.getElementById('generated-link'),
            copyGeneratedLinkBtn: document.getElementById('copy-generated-link'),
            showSystemPromptBtn: document.getElementById('show-system-prompt-btn'),
            shareQrCodeContainer: document.getElementById('share-qr-code-container'),
            qrCodeWarning: document.getElementById('qr-code-warning'),
            linkLengthText: document.getElementById('link-length-text'),
            linkLengthWarning: document.getElementById('link-length-warning'),
            linkLengthFill: document.querySelector('.link-length-fill'),
            passwordInputContainer: document.querySelector('.password-input-container'),
            qrCodeContainer: document.getElementById('share-qr-code-container'),
            
            // Prompt configurator modal elements
            promptsBtn: document.getElementById('prompts-btn'),
            promptsModal: document.getElementById('prompts-modal'),
            promptsList: document.getElementById('prompts-list'),
            closePromptsModal: document.getElementById('close-prompts-modal'),
            copySystemPromptBtn: document.getElementById('copy-system-prompt-btn'),
            
            // Copy chat button
            copyChatBtn: document.getElementById('copy-chat-btn'),
            
            // Agent configuration elements
            agentConfigBtn: document.getElementById('agent-config-btn'),
            agentConfigModal: document.getElementById('agent-config-modal'),
            closeAgentConfigModal: document.getElementById('close-agent-config-modal'),
            quickAgentName: document.getElementById('quick-agent-name'),
            quickSaveAgent: document.getElementById('quick-save-agent'),
            savedAgentsList: document.getElementById('saved-agents-list'),
            
            // Function calling elements
            functionBtn: document.getElementById('function-btn'),
            functionModal: document.getElementById('function-modal'),
            functionList: document.getElementById('function-list'),
            emptyFunctionState: document.getElementById('empty-function-state'),
            functionEditorForm: document.getElementById('function-editor-form'),
            functionCollectionName: document.getElementById('function-collection-name'),
            functionName: document.getElementById('function-name'),
            functionCode: document.getElementById('function-code'),
            copyFunctionCodeBtn: document.getElementById('copy-function-code-btn'),
            copyFunctionLibraryBtn: document.getElementById('copy-function-library-btn'),
            functionValidationResult: document.getElementById('function-validation-result'),
            functionToolDefinition: document.getElementById('function-tool-definition'),
            copyToolDefinitionBtn: document.getElementById('copy-tool-definition-btn'),
            copyToolDefinitionsBtn: document.getElementById('copy-tool-definitions-btn'),
            functionValidateBtn: document.getElementById('function-validate-btn'),
            functionClearBtn: document.getElementById('function-clear-btn'),
            closeFunctionModal: document.getElementById('close-function-modal'),
            
            // MCP servers modal elements
            mcpServersBtn: document.getElementById('mcp-servers-btn'),
            mcpServersModal: document.getElementById('mcp-servers-modal'),
            mcpServerForm: document.getElementById('mcp-server-form'),
            mcpServerName: document.getElementById('mcp-server-name'),
            mcpServerUrl: document.getElementById('mcp-server-url'),
            mcpServerDescription: document.getElementById('mcp-server-description'),
            mcpServerTestBtn: document.getElementById('mcp-server-test-btn'),
            closeMcpServersModal: document.getElementById('close-mcp-servers-modal'),
            
            // Settings modal elements
            settingsBtn: document.getElementById('settings-btn'),
            settingsModal: document.getElementById('settings-modal'),
            settingsForm: document.getElementById('settings-form'),
            modelSelect: document.getElementById('model-select'),
            modelReloadBtn: document.getElementById('model-reload-btn'),
            apiKeyUpdate: document.getElementById('api-key-update'),
            apiKeyUpdateDetection: document.getElementById('api-key-update-detection'),
            apiKeyUpdateDetectionText: document.getElementById('api-key-update-detection-text'),
            baseUrlSelect: document.getElementById('base-url-select'),
            baseUrl: document.getElementById('base-url'),
            customBaseUrlGroup: document.getElementById('custom-base-url-group'),
            // System prompt elements
            openPromptsConfigBtn: document.getElementById('open-prompts-config'),
            systemPromptPreview: document.getElementById('system-prompt-preview'),
            closeSettings: document.getElementById('close-settings'),
            clearAllSettings: document.getElementById('clear-all-settings'),
            clearChatBtn: document.getElementById('clear-chat-btn'),
            
            // Model info elements
            modelNameDisplay: document.querySelector('.model-name-display'),
            modelContextElement: document.querySelector('.model-context'),
            modelStats: document.querySelector('.model-stats'),
            usageFill: document.querySelector('.usage-fill'),
            usageText: document.querySelector('.usage-text'),
            tokenSpeedText: document.querySelector('.token-speed-text'),
            
            // Model selection modal elements
            modelSelectionModal: document.getElementById('model-selection-modal'),
            closeModelSelectionModal: document.getElementById('close-model-selection-modal'),
            modelSearchInput: document.getElementById('model-search-input'),
            modelListContainer: document.getElementById('model-list-container'),
            modelSelectionCancel: document.getElementById('model-selection-cancel'),
            modelSelectionSelect: document.getElementById('model-selection-select'),
            
            // RAG modal elements
            ragBtn: document.getElementById('rag-btn'),
            ragModal: document.getElementById('rag-modal'),
            closeRagModal: document.getElementById('close-rag-modal'),
            ragDefaultPromptsList: document.getElementById('rag-default-prompts-list'),
            ragIndexDefaultsBtn: document.getElementById('rag-index-defaults-btn'),
            ragDefaultChunks: document.getElementById('rag-default-chunks'),
            ragDefaultModel: document.getElementById('rag-default-model'),
            ragUserChunks: document.getElementById('rag-user-chunks'),
            ragUserFiles: document.getElementById('rag-user-files'),
            ragUploadBundleBtn: document.getElementById('rag-upload-bundle-btn'),
            ragUserBundlesList: document.getElementById('rag-user-bundles-list'),
            ragSearchInput: document.getElementById('rag-search-input'),
            ragSearchLimit: document.getElementById('rag-search-limit'),
            ragSearchBtn: document.getElementById('rag-search-btn'),
            ragClearSearchBtn: document.getElementById('rag-clear-search-btn'),
            ragSearchResults: document.getElementById('rag-search-results'),
            
            // System prompt viewer modal elements  
            systemPromptViewerModal: document.getElementById('system-prompt-viewer-modal'),
            copySystemPromptViewerBtn: document.getElementById('copy-system-prompt-viewer-btn'),
            rawSystemPrompt: document.getElementById('raw-system-prompt'),
            renderedSystemPrompt: document.getElementById('rendered-system-prompt')
        };
    }

    // Public API
    return {
        getElements: getElements
    };
})();
