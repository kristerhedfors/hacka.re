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
            generateShareLinkBtn: document.getElementById('generate-share-link'),
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
            
            // Settings modal elements
            settingsBtn: document.getElementById('settings-btn'),
            settingsModal: document.getElementById('settings-modal'),
            settingsForm: document.getElementById('settings-form'),
            modelSelect: document.getElementById('model-select'),
            modelReloadBtn: document.getElementById('model-reload-btn'),
            apiKeyUpdate: document.getElementById('api-key-update'),
            baseUrl: document.getElementById('base-url'),
            systemPromptInput: document.getElementById('system-prompt'),
            resetSystemPromptBtn: document.getElementById('reset-system-prompt'),
            closeSettings: document.getElementById('close-settings'),
            clearChat: document.getElementById('clear-chat'),
            
            // Model info elements
            modelNameElement: document.querySelector('.model-name'),
            modelDeveloperElement: document.querySelector('.model-developer'),
            modelContextElement: document.querySelector('.model-context'),
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
