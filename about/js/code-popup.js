/**
 * Code Popup Script for hacka.re Architecture Documentation
 * 
 * This script adds popups with source code context when specific modules are mentioned
 * in the architecture documentation. It also provides links to open the JS files directly.
 */

document.addEventListener('DOMContentLoaded', function() {
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
        processCodeModuleReferences();
    }, 500);
});

/**
 * Process all code module references in the documentation using text-node wrapping
 */
function processCodeModuleReferences() {
    // Map of module names to file paths
    const moduleToFilePath = {
        'EncryptionService': 'js/services/encryption-service.js',
        'NamespaceService': 'js/services/namespace-service.js',
        'CoreStorageService': 'js/services/core-storage-service.js',
        'DataService': 'js/services/data-service.js',
        'StorageService': 'js/services/storage-service.js',
        'ApiService': 'js/services/api-service.js',
        'ChatManager': 'js/components/chat-manager.js',
        'SettingsManager': 'js/components/settings-manager.js',
        'UIManager': 'js/components/ui-manager.js',
        'PromptsManager': 'js/components/prompts-manager.js',
        'ShareManager': 'js/components/share-manager.js',
        'ApiToolsManager': 'js/components/api-tools-manager.js'
    };

    // Process each feature section separately
    document.querySelectorAll('.feature-section').forEach(section => {
        // First, process text nodes
        const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while (node = walker.nextNode()) {
            const text = node.nodeValue;
            for (const moduleName in moduleToFilePath) {
                if (!text.includes(moduleName)) continue;
                const parts = text.split(moduleName);
                const parent = node.parentNode;
                parts.forEach((part, index) => {
                    parent.insertBefore(document.createTextNode(part), node);
                    if (index < parts.length - 1) {
                        const span = document.createElement('span');
                        span.className = 'code-module-reference';
                        span.setAttribute('data-file-path', moduleToFilePath[moduleName]);
                        span.setAttribute('data-module-name', moduleName);
                        span.textContent = moduleName;
                        parent.insertBefore(span, node);
                    }
                });
                parent.removeChild(node);
                break; // move to next text node after match
            }
        }
        
        // Then, process list items that might contain module names in strong tags
        section.querySelectorAll('li strong').forEach(strongElement => {
            const text = strongElement.textContent;
            for (const moduleName in moduleToFilePath) {
                // Check if the strong tag contains exactly the module name (with optional colon)
                if (text === moduleName || text === `${moduleName}:`) {
                    // Extract the module name without the colon
                    const cleanModuleName = text.replace(':', '');
                    
                    // Make the strong element clickable directly
                    strongElement.className = 'code-module-reference';
                    strongElement.setAttribute('data-file-path', moduleToFilePath[cleanModuleName]);
                    strongElement.setAttribute('data-module-name', cleanModuleName);
                    strongElement.style.cursor = 'pointer';
                    strongElement.style.color = 'var(--primary-color)';
                    
                    // Add a subtle indicator that it's clickable without using underline
                    strongElement.style.position = 'relative';
                    
                    // Create a pseudo-element for the hover effect using a custom attribute
                    strongElement.setAttribute('data-hover', 'true');
                    
                    // Add a style tag if it doesn't exist yet
                    if (!document.getElementById('code-popup-hover-style')) {
                        const styleTag = document.createElement('style');
                        styleTag.id = 'code-popup-hover-style';
                        styleTag.textContent = `
                            .code-module-reference[data-hover="true"]:hover {
                                text-decoration: underline;
                            }
                        `;
                        document.head.appendChild(styleTag);
                    }
                    
                    break;
                }
            }
        });
    });
    // Add click handlers after wrapping spans
    addCodeModuleEventListeners();
}

/**
 * Get the file path from a module name or path match
 * @param {string} match - The matched text
 * @returns {string} The file path
 */
function getFilePathFromMatch(match) {
    // If it's already a path, return it
    if (match.includes('/')) {
        return match;
    }
    
    // Map of module names to file paths
    const moduleToFilePath = {
        'EncryptionService': 'js/services/encryption-service.js',
        'NamespaceService': 'js/services/namespace-service.js',
        'CoreStorageService': 'js/services/core-storage-service.js',
        'DataService': 'js/services/data-service.js',
        'StorageService': 'js/services/storage-service.js',
        'ApiService': 'js/services/api-service.js',
        'ChatManager': 'js/components/chat-manager.js',
        'SettingsManager': 'js/components/settings-manager.js',
        'UIManager': 'js/components/ui-manager.js',
        'PromptsManager': 'js/components/prompts-manager.js',
        'ShareManager': 'js/components/share-manager.js',
        'ApiToolsManager': 'js/components/api-tools-manager.js',
        'window.EncryptionService': 'js/services/encryption-service.js',
        'window.NamespaceService': 'js/services/namespace-service.js',
        'window.CoreStorageService': 'js/services/core-storage-service.js',
        'window.DataService': 'js/services/data-service.js',
        'window.StorageService': 'js/services/storage-service.js'
    };
    
    return moduleToFilePath[match] || null;
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
            const sourceCode = getSourceCodeSnippet(filePath);
            if (sourceCode) {
                showCodePopup(this, filePath, moduleName, sourceCode);
            } else {
                console.error('No source code snippet found for', filePath);
            }
        });
    });
}

/**
 * Get source code snippet for a file path
 * @param {string} filePath - The path to the source file
 * @returns {string} The source code snippet
 */
function getSourceCodeSnippet(filePath) {
    // Map of file paths to source code snippets
    const sourceCodeSnippets = {
        'js/services/storage-service.js': `/**
 * Storage Service
 * Main entry point for storage operations, using modular components
 */

window.StorageService = (function() {
    // Initialize the core storage service
    CoreStorageService.init();
    
    // Public API - expose all data service methods
    return {
        // Constants
        STORAGE_KEYS: NamespaceService.BASE_STORAGE_KEYS,
        BASE_STORAGE_KEYS: NamespaceService.BASE_STORAGE_KEYS,
        
        // Namespace methods
        getNamespace: NamespaceService.getNamespace,
        getNamespacedKey: NamespaceService.getNamespacedKey,
        resetNamespaceCache: NamespaceService.resetNamespaceCache,
        
        // Data methods
        saveApiKey: DataService.saveApiKey,
        getApiKey: DataService.getApiKey,
        saveModel: DataService.saveModel,
        getModel: DataService.getModel,
        saveChatHistory: DataService.saveChatHistory,
        loadChatHistory: DataService.loadChatHistory,
        clearChatHistory: DataService.clearChatHistory,
        saveSystemPrompt: DataService.saveSystemPrompt,
        getSystemPrompt: DataService.getSystemPrompt,
        saveShareOptions: DataService.saveShareOptions,
        getShareOptions: DataService.getShareOptions,
        saveBaseUrl: DataService.saveBaseUrl,
        getBaseUrl: DataService.getBaseUrl,
        saveBaseUrlProvider: DataService.saveBaseUrlProvider,
        getBaseUrlProvider: DataService.getBaseUrlProvider,
        getDefaultBaseUrlForProvider: DataService.getDefaultBaseUrlForProvider,
        saveTitle: DataService.saveTitle,
        getTitle: DataService.getTitle,
        saveSubtitle: DataService.saveSubtitle,
        getSubtitle: DataService.getSubtitle
    };
})();`,

        'js/services/encryption-service.js': `/**
 * Encryption Service
 * Handles encryption and decryption operations for secure storage
 */

window.EncryptionService = (function() {
    
    /**
     * Encrypt data with the given passphrase
     * @param {*} data - The data to encrypt
     * @param {string} passphrase - The passphrase to use for encryption
     * @returns {string} The encrypted data as a string
     */
    function encrypt(data, passphrase) {
        try {
            return CryptoUtils.encryptData(data, passphrase);
        } catch (error) {
            // Create error object with safe properties
            const errorInfo = {
                error: error.message,
                stack: error.stack,
                dataType: typeof data,
                dataIsArray: Array.isArray(data)
            };
            
            // Safely add length properties
            try {
                errorInfo.dataLength = data ? (typeof data === 'string' ? data.length : 0) : 0;
                if (typeof data === 'object' && data !== null) {
                    try {
                        const jsonStr = JSON.stringify(data);
                        errorInfo.jsonLength = jsonStr ? jsonStr.length : 0;
                    } catch (e) {
                        errorInfo.jsonError = e.message;
                    }
                }
                errorInfo.passphraseLength = passphrase ? passphrase.length : 0;
            } catch (e) {
                errorInfo.metadataError = e.message;
            }
            
            console.error('Encryption failed:', errorInfo);
            throw error;
        }
    }
    
    /**
     * Decrypt data with the given passphrase
     * @param {string} encryptedData - The encrypted data as a string
     * @param {string} passphrase - The passphrase to use for decryption
     * @returns {*} The decrypted data or null if decryption fails
     */
    function decrypt(encryptedData, passphrase) {
        try {
            const decryptedValue = CryptoUtils.decryptData(encryptedData, passphrase);
            
            if (decryptedValue === null) {
                // Create error object with safe properties
                const errorInfo = {
                    status: 'Decryption returned null'
                };
                
                // Safely add length properties
                try {
                    errorInfo.encryptedDataLength = encryptedData ? encryptedData.length : 0;
                    errorInfo.passphraseLength = passphrase ? passphrase.length : 0;
                    
                    if (passphrase) {
                        errorInfo.passphraseFirstChar = passphrase.charAt(0);
                        errorInfo.passphraseLastChar = passphrase.charAt(passphrase.length - 1);
                    }
                } catch (e) {
                    errorInfo.metadataError = e.message;
                }
                
                console.error('Decryption failed:', errorInfo);
            }
            
            return decryptedValue;
        } catch (error) {
            // Create error object with safe properties
            const errorInfo = {
                error: error.message,
                stack: error.stack
            };
            
            // Safely add length properties
            try {
                errorInfo.encryptedDataLength = encryptedData ? encryptedData.length : 0;
                errorInfo.passphraseLength = passphrase ? passphrase.length : 0;
            } catch (e) {
                errorInfo.metadataError = e.message;
            }
            
            console.error('Exception during decryption:', errorInfo);
            return null;
        }
    }
    
    /**
     * Initialize encryption system
     */
    function initEncryption() {
        // No initialization needed
    }
    
    // Public API
    return {
        encrypt: encrypt,
        decrypt: decrypt,
        initEncryption: initEncryption
    };
})();`,

        // Added popup for NamespaceService
        'js/services/namespace-service.js': `/**
 * Namespace Service
 * Manages namespaces for storage isolation based on title/subtitle
 */

window.NamespaceService = (function() {
    // Base storage keys without namespace
    const BASE_STORAGE_KEYS = {
        API_KEY: 'api_key',
        MODEL: 'model',
        HISTORY: 'history',
        SYSTEM_PROMPT: 'system_prompt',
        SHARE_OPTIONS: 'share_options',
        BASE_URL: 'base_url',
        BASE_URL_PROVIDER: 'base_url_provider',
        TITLE: 'hackare_title',
        SUBTITLE: 'hackare_subtitle'
    };
    
    // Special keys that don't get namespaced (to avoid circular dependency)
    const NON_NAMESPACED_KEYS = [
        BASE_STORAGE_KEYS.TITLE,
        BASE_STORAGE_KEYS.SUBTITLE
    ];
    
    // Store the previous namespace when it changes
    let previousNamespaceId = null;
    let previousNamespaceKey = null;
    let previousNamespaceHash = null;
    
    // Current namespace - will be updated when title/subtitle change
    let currentNamespaceId = null;
    let currentNamespaceKey = null;
    let currentNamespaceHash = null;
    
    /**
     * Get the current namespace ID for storage keys
     * @returns {string} The namespace ID
     */
    function getNamespaceId() {
        return getOrCreateNamespace().namespaceId;
    }
    
    /**
     * Get the current namespace based on title and subtitle
     * @returns {string} The namespace ID
     */
    function getNamespace() {
        return getNamespaceId();
    }
    
    /**
     * Reset the namespace cache when title or subtitle changes
     */
    function resetNamespaceCache() {
        console.log('[CRYPTO DEBUG] Resetting namespace cache');
        
        // Store the current namespace before resetting
        if (currentNamespaceId && currentNamespaceKey && currentNamespaceHash) {
            previousNamespaceId = currentNamespaceId;
            previousNamespaceKey = currentNamespaceKey;
            previousNamespaceHash = currentNamespaceHash;
        }
        
        // Reset current namespace
        currentNamespaceId = null;
        currentNamespaceKey = null;
        currentNamespaceHash = null;
    }
    
    /**
     * Get the namespaced key for a storage item
     * @param {string} baseKey - The base key without namespace
     * @returns {string} The namespaced key
     */
    function getNamespacedKey(baseKey) {
        // Special keys don't get namespaced to avoid circular dependency
        if (NON_NAMESPACED_KEYS.includes(baseKey)) {
            return baseKey;
        }
        
        // Get the namespace ID
        const namespaceId = getNamespaceId();
        
        // Format: hackare_namespaceid_variablename
        return \`hackare_\${namespaceId}_\${baseKey}\`;
    }
    
    // Public API
    return {
        BASE_STORAGE_KEYS: BASE_STORAGE_KEYS,
        NON_NAMESPACED_KEYS: NON_NAMESPACED_KEYS,
        getNamespace: getNamespace,
        getNamespaceId: getNamespaceId,
        getNamespaceKey: getNamespaceKey,
        getPreviousNamespace: getPreviousNamespace,
        getPreviousNamespaceId: getPreviousNamespaceId,
        getPreviousNamespaceKey: getPreviousNamespaceKey,
        getPreviousNamespaceHash: getPreviousNamespaceHash,
        resetNamespaceCache: resetNamespaceCache,
        getNamespacedKey: getNamespacedKey,
        getKeysToReEncrypt: getKeysToReEncrypt,
        findExistingNamespace: findExistingNamespace,
        getMasterKey: getMasterKey
    };
})();`,

        // Added popup for CoreStorageService
        'js/services/core-storage-service.js': `/**
 * Core Storage Service
 * Provides the core storage operations with encryption support
 */

window.CoreStorageService = (function() {
    // Flag to track initialization
    let initialized = false;
    
    /**
     * Initialize the core storage service
     */
    function init() {
        if (initialized) return;
        
        // Initialize encryption service if needed
        if (EncryptionService && typeof EncryptionService.initEncryption === 'function') {
            EncryptionService.initEncryption();
        }
        
        initialized = true;
    }
    
    /**
     * Set a value in storage with optional encryption
     * @param {string} baseKey - The base key without namespace
     * @param {*} value - The value to store
     * @param {boolean} encrypt - Whether to encrypt the value
     */
    function setValue(baseKey, value, encrypt = true) {
        try {
            // Get the namespaced key
            const key = NamespaceService.getNamespacedKey(baseKey);
            
            // Store the value
            if (value === null || value === undefined) {
                // Remove the item if value is null or undefined
                localStorage.removeItem(key);
                return;
            }
            
            // Convert value to string if needed
            let stringValue = typeof value === 'string' ? value : JSON.stringify(value);
            
            // Encrypt the value if needed
            if (encrypt) {
                const namespaceKey = NamespaceService.getNamespaceKey();
                if (!namespaceKey) {
                    console.error('No namespace key available for encryption');
                    return;
                }
                
                stringValue = EncryptionService.encrypt(stringValue, namespaceKey);
            }
            
            // Store the value
            localStorage.setItem(key, stringValue);
        } catch (error) {
            console.error('Failed to set value:', error);
        }
    }
    
    /**
     * Get a value from storage with optional decryption
     * @param {string} baseKey - The base key without namespace
     * @param {string} legacyKey - The legacy key to check if the namespaced key doesn't exist
     * @param {Function} migrateFn - Function to migrate the value from legacy to namespaced
     * @param {boolean} encrypted - Whether the value is encrypted
     * @returns {*} The value or null if not found
     */
    function getValue(baseKey, legacyKey, migrateFn, encrypted = true) {
        try {
            // Get the namespaced key
            const key = NamespaceService.getNamespacedKey(baseKey);
            
            // Try to get the value from the namespaced key
            let value = localStorage.getItem(key);
            
            // If not found and legacyKey is provided, try the legacy key
            if (value === null && legacyKey) {
                value = localStorage.getItem(legacyKey);
                
                // If found in legacy key, migrate it to the namespaced key
                if (value !== null && migrateFn) {
                    migrateFn(value);
                    
                    // Try to get the migrated value
                    value = localStorage.getItem(key);
                }
            }
            
            // If still not found, return null
            if (value === null) {
                return null;
            }
            
            // Decrypt the value if needed
            if (encrypted) {
                const namespaceKey = NamespaceService.getNamespaceKey();
                if (!namespaceKey) {
                    console.error('No namespace key available for decryption');
                    return null;
                }
                
                value = EncryptionService.decrypt(value, namespaceKey);
                
                // If decryption fails, return null
                if (value === null) {
                    return null;
                }
            }
            
            // Parse JSON if needed
            try {
                return JSON.parse(value);
            } catch (e) {
                // If parsing fails, return the string value
                return value;
            }
        } catch (error) {
            console.error('Failed to get value:', error);
            return null;
        }
    }
    
    // Public API
    return {
        init: init,
        setValue: setValue,
        getValue: getValue
    };
})();`,

        // Added popup for DataService
        'js/services/data-service.js': `/**
 * Data Service
 * Implements specific data type operations
 */

window.DataService = (function() {
    // Get storage keys
    const STORAGE_KEYS = NamespaceService.BASE_STORAGE_KEYS;
    
    /**
     * Save API key
     * @param {string} apiKey - The API key to save
     */
    function saveApiKey(apiKey) {
        CoreStorageService.setValue(STORAGE_KEYS.API_KEY, apiKey);
    }
    
    /**
     * Get API key
     * @returns {string} The API key or null if not found
     */
    function getApiKey() {
        return CoreStorageService.getValue(
            STORAGE_KEYS.API_KEY, 
            STORAGE_KEYS.API_KEY, 
            saveApiKey
        );
    }
    
    /**
     * Save model
     * @param {string} model - The model to save
     */
    function saveModel(model) {
        CoreStorageService.setValue(STORAGE_KEYS.MODEL, model);
    }
    
    /**
     * Get model
     * @returns {string} The model or null if not found
     */
    function getModel() {
        return CoreStorageService.getValue(
            STORAGE_KEYS.MODEL, 
            STORAGE_KEYS.MODEL, 
            saveModel
        );
    }
    
    /**
     * Save chat history
     * @param {Array} history - The chat history to save
     */
    function saveChatHistory(history) {
        CoreStorageService.setValue(STORAGE_KEYS.HISTORY, history);
    }
    
    /**
     * Load chat history
     * @returns {Array} The chat history or empty array if not found
     */
    function loadChatHistory() {
        return CoreStorageService.getValue(
            STORAGE_KEYS.HISTORY, 
            STORAGE_KEYS.HISTORY, 
            saveChatHistory
        ) || [];
    }
    
    /**
     * Clear chat history
     */
    function clearChatHistory() {
        CoreStorageService.setValue(STORAGE_KEYS.HISTORY, []);
    }
    
    /**
     * Save system prompt
     * @param {string} systemPrompt - The system prompt to save
     */
    function saveSystemPrompt(systemPrompt) {
        CoreStorageService.setValue(STORAGE_KEYS.SYSTEM_PROMPT, systemPrompt);
    }
    
    /**
     * Get system prompt
     * @returns {string} The system prompt or null if not found
     */
    function getSystemPrompt() {
        return CoreStorageService.getValue(
            STORAGE_KEYS.SYSTEM_PROMPT, 
            STORAGE_KEYS.SYSTEM_PROMPT, 
            saveSystemPrompt
        );
    }
    
    /**
     * Save share options
     * @param {Object} options - The share options to save
     */
    function saveShareOptions(options) {
        CoreStorageService.setValue(STORAGE_KEYS.SHARE_OPTIONS, options);
    }
    
    /**
     * Get share options
     * @returns {Object} The share options or default options if not found
     */
    function getShareOptions() {
        return CoreStorageService.getValue(
            STORAGE_KEYS.SHARE_OPTIONS, 
            STORAGE_KEYS.SHARE_OPTIONS, 
            saveShareOptions
        ) || {
            includeApiKey: true,
            includeSystemPrompt: true,
            includeModel: true,
            includeConversation: false,
            messageCount: 1
        };
    }
    
    /**
     * Save base URL
     * @param {string} baseUrl - The base URL to save
     */
    function saveBaseUrl(baseUrl) {
        CoreStorageService.setValue(STORAGE_KEYS.BASE_URL, baseUrl);
    }
    
    /**
     * Get base URL
     * @returns {string} The base URL or default if not found
     */
    function getBaseUrl() {
        return CoreStorageService.getValue(
            STORAGE_KEYS.BASE_URL, 
            STORAGE_KEYS.BASE_URL, 
            saveBaseUrl
        ) || 'https://api.groq.com/openai/v1';
    }
    
    /**
     * Save base URL provider
     * @param {string} provider - The provider to save
     */
    function saveBaseUrlProvider(provider) {
        CoreStorageService.setValue(STORAGE_KEYS.BASE_URL_PROVIDER, provider);
    }
    
    /**
     * Get base URL provider
     * @returns {string} The provider or default if not found
     */
    function getBaseUrlProvider() {
        return CoreStorageService.getValue(
            STORAGE_KEYS.BASE_URL_PROVIDER, 
            STORAGE_KEYS.BASE_URL_PROVIDER, 
            saveBaseUrlProvider
        ) || 'groq';
    }
    
    /**
     * Get default base URL for provider
     * @param {string} provider - The provider
     * @returns {string} The default base URL for the provider
     */
    function getDefaultBaseUrlForProvider(provider) {
        const providers = {
            'groq': 'https://api.groq.com/openai/v1',
            'openai': 'https://api.openai.com/v1',
            'anthropic': 'https://api.anthropic.com/v1',
            'custom': ''
        };
        
        return providers[provider] || '';
    }
    
    /**
     * Save title
     * @param {string} title - The title to save
     */
    function saveTitle(title) {
        // Store in both localStorage and sessionStorage
        localStorage.setItem(STORAGE_KEYS.TITLE, title);
        sessionStorage.setItem(STORAGE_KEYS.TITLE, title);
        
        // Reset namespace cache when title changes
        NamespaceService.resetNamespaceCache();
    }
    
    /**
     * Get title
     * @returns {string} The title or default if not found
     */
    function getTitle() {
        // Try sessionStorage first, then localStorage
        let title = sessionStorage.getItem(STORAGE_KEYS.TITLE);
        if (!title) {
            title = localStorage.getItem(STORAGE_KEYS.TITLE);
            if (title) {
                // Update sessionStorage
                sessionStorage.setItem(STORAGE_KEYS.TITLE, title);
            }
        }
        
        return title || 'hacka.re';
    }
    
    /**
     * Save subtitle
     * @param {string} subtitle - The subtitle to save
     */
    function saveSubtitle(subtitle) {
        // Store in both localStorage and sessionStorage
        localStorage.setItem(STORAGE_KEYS.SUBTITLE, subtitle);
        sessionStorage.setItem(STORAGE_KEYS.SUBTITLE, subtitle);
        
        // Reset namespace cache when subtitle changes
        NamespaceService.resetNamespaceCache();
    }
    
    /**
     * Get subtitle
     * @returns {string} The subtitle or default if not found
     */
    function getSubtitle() {
        // Try sessionStorage first, then localStorage
        let subtitle = sessionStorage.getItem(STORAGE_KEYS.SUBTITLE);
        if (!subtitle) {
            subtitle = localStorage.getItem(STORAGE_KEYS.SUBTITLE);
            if (subtitle) {
                // Update sessionStorage
                sessionStorage.setItem(STORAGE_KEYS.SUBTITLE, subtitle);
            }
        }
        
        return subtitle || 'För hackare av hackare';
    }
    
    // Public API
    return {
        saveApiKey: saveApiKey,
        getApiKey: getApiKey,
        saveModel: saveModel,
        getModel: getModel,
        saveChatHistory: saveChatHistory,
        loadChatHistory: loadChatHistory,
        clearChatHistory: clearChatHistory,
        saveSystemPrompt: saveSystemPrompt,
        getSystemPrompt: getSystemPrompt,
        saveShareOptions: saveShareOptions,
        getShareOptions: getShareOptions,
        saveBaseUrl: saveBaseUrl,
        getBaseUrl: getBaseUrl,
        saveBaseUrlProvider: saveBaseUrlProvider,
        getBaseUrlProvider: getBaseUrlProvider,
        getDefaultBaseUrlForProvider: getDefaultBaseUrlForProvider,
        saveTitle: saveTitle,
        getTitle: getTitle,
        saveSubtitle: saveSubtitle,
        getSubtitle: getSubtitle
    };
})();`,
    };
    
    return sourceCodeSnippets[filePath] || null;
}

/**
 * Show a popup with the source code
 * @param {HTMLElement} element - The element that triggered the popup
 * @param {string} filePath - The path to the source file
 * @param {string} moduleName - The name of the module
 * @param {string} sourceCode - The source code content
 */
function showCodePopup(element, filePath, moduleName, sourceCode) {
    // Remove any existing popups
    removeExistingPopups();
    
    // Create the popup container
    const popup = document.createElement('div');
    popup.className = 'code-popup';
    
    // Create the popup header
    const header = document.createElement('div');
    header.className = 'code-popup-header';
    
    // Add the module name
    const title = document.createElement('h3');
    title.textContent = moduleName;
    header.appendChild(title);
    
    // Add the file path with a link to open in a new tab
    const filePathElement = document.createElement('div');
    filePathElement.className = 'code-popup-filepath';
    
    const fileLink = document.createElement('a');
    fileLink.href = `../${filePath}`;
    fileLink.target = '_blank';
    fileLink.textContent = filePath;
    fileLink.title = 'Open file in new tab';
    
    filePathElement.appendChild(fileLink);
    header.appendChild(filePathElement);
    
    // Add a close button
    const closeButton = document.createElement('button');
    closeButton.className = 'code-popup-close';
    closeButton.innerHTML = '&times;';
    closeButton.title = 'Close';
    closeButton.addEventListener('click', removeExistingPopups);
    header.appendChild(closeButton);
    
    popup.appendChild(header);
    
    // Create the popup content with the source code
    const content = document.createElement('div');
    content.className = 'code-popup-content';
    
    // Format the source code with marked or fallback to basic formatting
    let renderedCode;
    if (typeof marked !== 'undefined') {
        const formattedCode = `\`\`\`javascript\n${sourceCode}\n\`\`\``;
        renderedCode = marked.parse(formattedCode);
    } else {
        // Fallback to basic formatting if marked is not available
        renderedCode = `<pre><code class="language-javascript">${escapeHtml(sourceCode)}</code></pre>`;
    }
    
    // Sanitize the HTML if DOMPurify is available
    if (typeof DOMPurify !== 'undefined') {
        content.innerHTML = DOMPurify.sanitize(renderedCode);
    } else {
        content.innerHTML = renderedCode;
    }
    
    // Apply highlight.js to rendered code blocks if available
    if (typeof hljs !== 'undefined') {
        content.querySelectorAll('pre code').forEach(block => hljs.highlightElement(block));
    }
    
    popup.appendChild(content);
    
    // Position the popup near the element
    positionPopup(popup, element);
    
    // Add the popup to the document
    document.body.appendChild(popup);
    
    // Add event listener to close popup when clicking outside
    document.addEventListener('click', handleOutsideClick);
}

/**
 * Position the popup near the element
 * @param {HTMLElement} popup - The popup element
 * @param {HTMLElement} element - The element that triggered the popup
 */
function positionPopup(popup, element) {
    // Get the element's position
    const rect = element.getBoundingClientRect();
    
    // Set initial position
    popup.style.position = 'absolute';
    popup.style.zIndex = '1000';
    
    // Add the popup to the document temporarily to get its dimensions
    popup.style.visibility = 'hidden';
    document.body.appendChild(popup);
    
    const popupRect = popup.getBoundingClientRect();
    
    // Remove the popup
    document.body.removeChild(popup);
    popup.style.visibility = 'visible';
    
    // Calculate position
    let top = rect.bottom + window.scrollY + 10; // 10px below the element
    let left = rect.left + window.scrollX;
    
    // Adjust if popup would go off the right edge
    if (left + popupRect.width > window.innerWidth) {
        left = window.innerWidth - popupRect.width - 20;
    }
    
    // Adjust if popup would go off the bottom edge
    if (top + popupRect.height > window.scrollY + window.innerHeight) {
        // Place above the element instead
        top = rect.top + window.scrollY - popupRect.height - 10;
    }
    
    // Ensure popup is not positioned off-screen
    left = Math.max(20, left);
    top = Math.max(20, top);
    
    popup.style.top = `${top}px`;
    popup.style.left = `${left}px`;
}

/**
 * Handle clicks outside the popup to close it
 * @param {Event} event - The click event
 */
function handleOutsideClick(event) {
    const popup = document.querySelector('.code-popup');
    if (!popup) return;
    
    // Check if the click was inside the popup
    if (popup.contains(event.target)) return;
    
    // Check if the click was on a code module reference
    if (event.target.classList.contains('code-module-reference')) return;
    
    // Remove the popup
    removeExistingPopups();
}

/**
 * Remove any existing popups
 */
function removeExistingPopups() {
    const popups = document.querySelectorAll('.code-popup');
    popups.forEach(popup => {
        popup.remove();
    });
    
    // Remove the outside click handler
    document.removeEventListener('click', handleOutsideClick);
}
