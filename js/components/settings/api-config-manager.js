/**
 * API Configuration Settings Manager
 * Handles UI for configuring API-related settings like token limits
 */

const APIConfigManager = (function() {
    'use strict';

    let initialized = false;

    /**
     * Initialize the API config manager
     */
    function init() {
        if (initialized) return;
        initialized = true;

        // Load current values into UI
        loadCurrentValues();
        
        // Setup event listeners
        setupEventListeners();
        
        console.log('[APIConfigManager] Initialized');
    }

    /**
     * Load current config values into the UI
     */
    function loadCurrentValues() {
        const config = window.APIConfig;
        if (!config) return;

        // Set max tool result length
        const toolResultInput = document.getElementById('max-tool-result-length');
        if (toolResultInput) {
            toolResultInput.value = config.LIMITS.MAX_TOOL_RESULT_LENGTH;
            updateTokenDisplay('tool-result-tokens', config.LIMITS.MAX_TOOL_RESULT_LENGTH);
        }

        // Set max message length
        const messageInput = document.getElementById('max-message-length');
        if (messageInput) {
            messageInput.value = config.LIMITS.MAX_MESSAGE_LENGTH;
            updateTokenDisplay('message-tokens', config.LIMITS.MAX_MESSAGE_LENGTH);
        }

        // Set debug logging checkbox
        const logTruncationCheckbox = document.getElementById('log-truncation');
        if (logTruncationCheckbox) {
            logTruncationCheckbox.checked = config.DEBUG.LOG_TRUNCATION;
        }
    }

    /**
     * Setup event listeners for the API config inputs
     */
    function setupEventListeners() {
        // Tool result length input
        const toolResultInput = document.getElementById('max-tool-result-length');
        if (toolResultInput) {
            toolResultInput.addEventListener('input', function() {
                const value = parseInt(this.value) || 5000;
                updateTokenDisplay('tool-result-tokens', value);
                updateConfig('LIMITS', 'MAX_TOOL_RESULT_LENGTH', value);
            });
        }

        // Message length input
        const messageInput = document.getElementById('max-message-length');
        if (messageInput) {
            messageInput.addEventListener('input', function() {
                const value = parseInt(this.value) || 50000;
                updateTokenDisplay('message-tokens', value);
                updateConfig('LIMITS', 'MAX_MESSAGE_LENGTH', value);
            });
        }

        // Log truncation checkbox
        const logTruncationCheckbox = document.getElementById('log-truncation');
        if (logTruncationCheckbox) {
            logTruncationCheckbox.addEventListener('change', function() {
                updateConfig('DEBUG', 'LOG_TRUNCATION', this.checked);
            });
        }
    }

    /**
     * Update token display (rough estimate: 4 chars per token)
     */
    function updateTokenDisplay(elementId, charCount) {
        const element = document.getElementById(elementId);
        if (element) {
            const tokenEstimate = Math.round(charCount / 4);
            element.textContent = tokenEstimate.toLocaleString();
        }
    }

    /**
     * Update configuration value dynamically
     */
    function updateConfig(section, key, value) {
        if (!window.APIConfig || !window.APIConfig[section]) return;
        
        window.APIConfig[section][key] = value;
        
        console.log(`[APIConfigManager] Updated ${section}.${key} to:`, value);
        
        // Optionally save to localStorage for persistence
        try {
            const configKey = 'hacka_re_api_config';
            const currentConfig = JSON.parse(localStorage.getItem(configKey) || '{}');
            if (!currentConfig[section]) currentConfig[section] = {};
            currentConfig[section][key] = value;
            localStorage.setItem(configKey, JSON.stringify(currentConfig));
        } catch (error) {
            console.warn('[APIConfigManager] Failed to save config to localStorage:', error);
        }
    }

    /**
     * Load saved configuration from localStorage
     */
    function loadSavedConfig() {
        try {
            const configKey = 'hacka_re_api_config';
            const savedConfig = JSON.parse(localStorage.getItem(configKey) || '{}');
            
            // Merge saved config with defaults
            if (window.APIConfig && savedConfig) {
                Object.keys(savedConfig).forEach(section => {
                    if (window.APIConfig[section]) {
                        Object.keys(savedConfig[section]).forEach(key => {
                            window.APIConfig[section][key] = savedConfig[section][key];
                        });
                    }
                });
                console.log('[APIConfigManager] Loaded saved configuration');
            }
        } catch (error) {
            console.warn('[APIConfigManager] Failed to load saved config:', error);
        }
    }

    /**
     * Reset configuration to defaults
     */
    function resetToDefaults() {
        // Clear saved config
        try {
            localStorage.removeItem('hacka_re_api_config');
        } catch (error) {
            console.warn('[APIConfigManager] Failed to clear saved config:', error);
        }
        
        // Reload the page to get fresh config
        window.location.reload();
    }

    // Public API
    return {
        init: init,
        loadSavedConfig: loadSavedConfig,
        resetToDefaults: resetToDefaults
    };
})();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Load saved config first (before other services initialize)
    APIConfigManager.loadSavedConfig();
    
    // Initialize UI when settings modal is available
    setTimeout(() => {
        if (document.getElementById('max-tool-result-length')) {
            APIConfigManager.init();
        }
    }, 100);
});

// Make available globally
window.APIConfigManager = APIConfigManager;