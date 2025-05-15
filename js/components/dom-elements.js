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
            shareTitleInput: document.getElementById('share-title'),
            shareSubtitleInput: document.getElementById('share-subtitle'),
            generateShareLinkBtn: document.getElementById('generate-share-link-btn'),
            closeShareModalBtn: document.getElementById('close-share-modal'),
            generatedLinkContainer: document.getElementById('generated-link-container'),
            generatedLink: document.getElementById('generated-link'),
            copyGeneratedLinkBtn: document.getElementById('copy-generated-link'),
            shareQrCodeContainer: document.getElementById('share-qr-code-container'),
            qrCodeWarning: document.getElementById('qr-code-warning'),
            linkLengthText: document.getElementById('link-length-text'),
            linkLengthWarning: document.getElementById('link-length-warning'),
            linkLengthFill: document.querySelector('.link-length-fill'),
            lockSessionKeyCheckbox: document.getElementById('lock-session-key'),
            passwordInputContainer: document.querySelector('.password-input-container'),
            qrCodeContainer: document.getElementById('share-qr-code-container'),
            
            // Prompt configurator modal elements
            promptsBtn: document.getElementById('prompts-btn'),
            promptsModal: document.getElementById('prompts-modal'),
            promptsList: document.getElementById('prompts-list'),
            closePromptsModal: document.getElementById('close-prompts-modal'),
            
            // Copy chat button
            copyChatBtn: document.getElementById('copy-chat-btn'),
            
            // Function calling elements
            functionBtn: document.getElementById('function-btn'),
            functionModal: document.getElementById('function-modal'),
            functionList: document.getElementById('function-list'),
            emptyFunctionState: document.getElementById('empty-function-state'),
            functionEditorForm: document.getElementById('function-editor-form'),
            functionName: document.getElementById('function-name'),
            functionCode: document.getElementById('function-code'),
            functionValidationResult: document.getElementById('function-validation-result'),
            functionToolDefinition: document.getElementById('function-tool-definition'),
            functionValidateBtn: document.getElementById('function-validate-btn'),
            functionClearBtn: document.getElementById('function-clear-btn'),
            closeFunctionModal: document.getElementById('close-function-modal'),
            
            // Settings modal elements
            settingsBtn: document.getElementById('settings-btn'),
            settingsModal: document.getElementById('settings-modal'),
            settingsForm: document.getElementById('settings-form'),
            modelSelect: document.getElementById('model-select'),
            modelReloadBtn: document.getElementById('model-reload-btn'),
            apiKeyUpdate: document.getElementById('api-key-update'),
            baseUrlSelect: document.getElementById('base-url-select'),
            baseUrl: document.getElementById('base-url'),
            customBaseUrlGroup: document.getElementById('custom-base-url-group'),
            // System prompt elements
            openPromptsConfigBtn: document.getElementById('open-prompts-config'),
            systemPromptPreview: document.getElementById('system-prompt-preview'),
            closeSettings: document.getElementById('close-settings'),
            clearAllSettings: document.getElementById('clear-all-settings'),
            clearChat: document.getElementById('clear-chat'),
            
            // Model info elements
            modelNameDisplay: document.querySelector('.model-name-display'),
            modelContextElement: document.querySelector('.model-context'),
            modelStats: document.querySelector('.model-stats'),
            usageFill: document.querySelector('.usage-fill'),
            usageText: document.querySelector('.usage-text'),
            tokenSpeedText: document.querySelector('.token-speed-text')
        };
    }

    // Public API
    return {
        getElements: getElements
    };
})();
