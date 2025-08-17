/**
 * Debug Service Module
 * Provides debug logging functionality for the AIHackare application
 */

window.DebugService = (function() {
    // Debug mode state
    let debugMode = false;
    
    // Debug categories with symbols and default states
    const DEBUG_CATEGORIES = {
        crypto: { name: 'Crypto', symbol: '🔐', enabled: false, description: 'Encryption/decryption operations' },
        storage: { name: 'Storage', symbol: '💾', enabled: false, description: 'localStorage/sessionStorage operations' },
        'shared-links': { name: 'Shared Links', symbol: '🔗', enabled: false, description: 'Link sharing and password operations' },
        functions: { name: 'Functions', symbol: '⚙️', enabled: false, description: 'Function calling system' },
        'mcp-events': { name: 'MCP Events', symbol: '🔌', enabled: false, description: 'Model Context Protocol operations' },
        api: { name: 'API', symbol: '🌐', enabled: false, description: 'API requests and responses' },
        rag: { name: 'RAG', symbol: '🧠', enabled: false, description: 'RAG knowledge base and search operations' }
    };
    
    // Current category states
    let categoryStates = { ...DEBUG_CATEGORIES };
    
    /**
     * Initialize the debug service
     * Loads the debug mode setting and categories from storage
     */
    function init() {
        // Load debug mode setting from storage
        debugMode = StorageService.getDebugMode() || false;
        
        // Load category states from storage
        const savedCategories = StorageService.getDebugCategories();
        if (savedCategories) {
            // Merge saved states with defaults
            Object.keys(categoryStates).forEach(key => {
                if (savedCategories[key] !== undefined) {
                    categoryStates[key].enabled = savedCategories[key].enabled;
                }
            });
        }
    }
    
    /**
     * Set the debug mode
     * @param {boolean} enabled - Whether debug mode is enabled
     */
    function setDebugMode(enabled) {
        debugMode = enabled;
        // Save to storage
        StorageService.saveDebugMode(enabled);
        
        // If debug mode is disabled, remove all debug messages from chat
        if (!enabled && window.aiHackare && window.aiHackare.chatManager) {
            removeAllDebugMessages();
        }
    }
    
    /**
     * Get the current debug mode state
     * @returns {boolean} Whether debug mode is enabled
     */
    function getDebugMode() {
        return debugMode;
    }
    
    /**
     * Log a debug message to the console
     * Only logs if debug mode is enabled
     * @param {string} message - The message to log
     * @param {any} data - Optional data to log
     */
    function log(message, data) {
        if (!debugMode) return;
        
        if (data !== undefined) {
            console.log(`[DEBUG] ${message}`, data);
        } else {
            console.log(`[DEBUG] ${message}`);
        }
    }
    
    /**
     * Log an error message to the console
     * Only logs if debug mode is enabled
     * @param {string} message - The error message to log
     * @param {Error|any} error - Optional error object or data
     */
    function error(message, error) {
        if (!debugMode) return;
        
        if (error !== undefined) {
            console.error(`[DEBUG] ${message}`, error);
        } else {
            console.error(`[DEBUG] ${message}`);
        }
    }
    
    /**
     * Log a warning message to the console
     * Only logs if debug mode is enabled
     * @param {string} message - The warning message to log
     * @param {any} data - Optional data to log
     */
    function warn(message, data) {
        if (!debugMode) return;
        
        if (data !== undefined) {
            console.warn(`[DEBUG] ${message}`, data);
        } else {
            console.warn(`[DEBUG] ${message}`);
        }
    }
    
    /**
     * Log an info message to the console
     * Only logs if debug mode is enabled
     * @param {string} message - The info message to log
     * @param {any} data - Optional data to log
     */
    function info(message, data) {
        if (!debugMode) return;
        
        if (data !== undefined) {
            console.info(`[DEBUG] ${message}`, data);
        } else {
            console.info(`[DEBUG] ${message}`);
        }
    }
    
    /**
     * Get debug categories configuration
     * @returns {Object} Debug categories with current states
     */
    function getCategories() {
        return categoryStates;
    }
    
    /**
     * Set debug category state
     * @param {string} category - Category key
     * @param {boolean} enabled - Whether category is enabled
     */
    function setCategoryEnabled(category, enabled) {
        if (categoryStates[category]) {
            categoryStates[category].enabled = enabled;
            // Save to storage
            StorageService.saveDebugCategories(categoryStates);
            
            // If category is disabled, remove its messages from chat
            if (!enabled && window.aiHackare && window.aiHackare.chatManager) {
                removeCategoryDebugMessages(category);
            }
        }
    }
    
    /**
     * Check if a debug category is enabled
     * @param {string} category - Category key
     * @returns {boolean} Whether category is enabled
     */
    function isCategoryEnabled(category) {
        return debugMode && categoryStates[category] && categoryStates[category].enabled;
    }
    
    /**
     * Get source location from stack trace, focusing on business logic rather than debug calls
     * @returns {Object} Source location info
     */
    function getSourceLocation() {
        const error = new Error();
        const stack = error.stack || '';
        const lines = stack.split('\n');
        
        // Find the first line that's not from debug-service.js
        for (let i = 2; i < lines.length; i++) {
            const line = lines[i];
            if (!line.includes('debug-service.js') && !line.includes('debugLog')) {
                // Extract file and line number from stack trace
                // Format varies by browser, but typically includes "file:line:column"
                const match = line.match(/([^\/\s]+\.js):(\d+):(\d+)/);
                if (match) {
                    return {
                        file: match[1],
                        line: parseInt(match[2]),
                        column: parseInt(match[3]),
                        fullPath: line.match(/(https?:\/\/[^:]+\.js:\d+:\d+)/)?.[1] || '',
                        needsBusinessLogicDetection: true  // Flag to indicate we should find the actual business logic line
                    };
                }
            }
        }
        return null;
    }
    
    /**
     * Log a debug message for a specific domain
     * @param {string} domain - Debug domain (crypto, storage, etc.)
     * @param {string} message - The message to log
     * @param {any} data - Optional data to log
     */
    function debugLog(domain, message, data) {
        if (!isCategoryEnabled(domain)) return;
        
        const category = categoryStates[domain];
        const symbol = category ? category.symbol : '🔍';
        const formattedMessage = `${symbol} [${domain.toUpperCase()}] ${message}`;
        
        // Get source location
        const sourceLocation = getSourceLocation();
        
        // Console log
        if (data !== undefined) {
            console.log(formattedMessage, data);
        } else {
            console.log(formattedMessage);
        }
        
        // Add to chat if available with source location data
        if (window.aiHackare && window.aiHackare.chatManager) {
            const className = `debug-message debug-${domain}`;
            const messageElement = window.aiHackare.chatManager.addSystemMessage(formattedMessage, className);
            
            // Add source location as data attributes if available
            if (messageElement && sourceLocation) {
                messageElement.setAttribute('data-source-file', sourceLocation.file);
                messageElement.setAttribute('data-source-line', sourceLocation.line);
                messageElement.setAttribute('data-source-column', sourceLocation.column);
                messageElement.setAttribute('data-source-path', sourceLocation.fullPath);
                
                // Detect if this is a backward-referencing message (describes what just happened)
                const isBackwardMessage = detectBackwardReference(message);
                messageElement.setAttribute('data-message-direction', isBackwardMessage ? 'backward' : 'forward');
            }
        }
    }
    
    /**
     * Detect if a debug message refers to something that just happened (backward reference)
     * @param {string} message - The debug message content
     * @returns {boolean} True if message describes past action
     */
    function detectBackwardReference(message) {
        const backwardPatterns = [
            /saved/i,
            /stored/i,
            /created/i,
            /updated/i,
            /deleted/i,
            /removed/i,
            /completed/i,
            /finished/i,
            /processed/i,
            /executed/i,
            /sent/i,
            /loaded/i,
            /initialized/i,
            /configured/i,
            /established/i,
            /connected/i,
            /encrypted/i,
            /decrypted/i,
            /validated/i,
            /authenticated/i,
            /logged/i
        ];
        
        return backwardPatterns.some(pattern => pattern.test(message));
    }
    
    /**
     * Remove all debug messages from chat
     */
    function removeAllDebugMessages() {
        // Use the Chat UI Service if available
        if (window.aiHackare && window.aiHackare.chatManager && window.aiHackare.chatManager.uiHandler) {
            window.aiHackare.chatManager.uiHandler.removeAllDebugMessages();
        } else {
            // Fallback to direct DOM manipulation
            const chatMessages = document.getElementById('chat-messages');
            if (!chatMessages) return;
            
            const debugMessages = chatMessages.querySelectorAll('[data-debug-message="true"]');
            debugMessages.forEach(msg => msg.remove());
        }
    }
    
    /**
     * Remove debug messages from a specific category
     * @param {string} category - Category to remove messages from
     */
    function removeCategoryDebugMessages(category) {
        // Use the Chat UI Service if available
        if (window.aiHackare && window.aiHackare.chatManager && window.aiHackare.chatManager.uiHandler) {
            window.aiHackare.chatManager.uiHandler.removeCategoryDebugMessages(category);
        } else {
            // Fallback to direct DOM manipulation
            const chatMessages = document.getElementById('chat-messages');
            if (!chatMessages) return;
            
            const categoryMessages = chatMessages.querySelectorAll(`[data-debug-category="${category}"]`);
            categoryMessages.forEach(msg => msg.remove());
        }
    }
    
    /**
     * Display a multiline debug message in the chat
     * Splits the message into lines and adds each line as a separate system message
     * with special styling for a continuous block appearance
     * @param {string} message - The multiline message to display
     * @param {Function} addSystemMessage - Function to add a system message to the chat
     */
    function displayMultilineDebug(message, addSystemMessage) {
        if (!debugMode || !addSystemMessage) return;
        
        // Split the message into lines
        const lines = message.split('\n');
        
        // Filter out empty lines
        const nonEmptyLines = lines.filter(line => line.trim() !== '');
        
        if (nonEmptyLines.length === 0) return;
        
        // Add each line as a separate system message with debug-message class
        nonEmptyLines.forEach((line, index) => {
            // For the last line, add a special class to restore normal bottom margin
            const isLast = index === nonEmptyLines.length - 1;
            const className = isLast ? 'debug-message debug-message-last' : 'debug-message';
            
            // Add the system message with the appropriate class
            if (typeof addSystemMessage === 'function') {
                addSystemMessage(line, className);
            }
        });
    }
    
    // Public API
    return {
        init,
        setDebugMode,
        getDebugMode,
        getCategories,
        setCategoryEnabled,
        isCategoryEnabled,
        debugLog,
        removeAllDebugMessages,
        removeCategoryDebugMessages,
        log,
        error,
        warn,
        info,
        displayMultilineDebug
    };
})();
