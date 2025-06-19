/**
 * Global API Configuration
 * Central configuration for API-related settings including token limits,
 * response processing, and other tunable parameters
 */

const APIConfig = {
    // Token and content limits
    LIMITS: {
        // Maximum length for tool/function results before truncation
        MAX_TOOL_RESULT_LENGTH: 5000,  // ~1250 tokens
        
        // Maximum length for individual message content
        MAX_MESSAGE_LENGTH: 50000,     // ~12500 tokens
        
        // Maximum total conversation length before pruning
        MAX_CONVERSATION_LENGTH: 200000, // ~50000 tokens
        
        // Maximum number of messages to keep in history
        MAX_MESSAGE_HISTORY: 100,
        
        // Maximum length for system messages
        MAX_SYSTEM_MESSAGE_LENGTH: 2000
    },
    
    // Truncation settings
    TRUNCATION: {
        // Suffix to append when content is truncated
        SUFFIX: '... [truncated]"}',
        
        // Whether to preserve JSON structure when truncating
        PRESERVE_JSON: true,
        
        // Strategy: 'start', 'end', or 'smart'
        STRATEGY: 'start'
    },
    
    // API request settings
    REQUEST: {
        // Default timeout for API requests (ms)
        DEFAULT_TIMEOUT: 30000,
        
        // Maximum retries for failed requests
        MAX_RETRIES: 3,
        
        // Delay between retries (ms)
        RETRY_DELAY: 1000
    },
    
    // Streaming settings
    STREAMING: {
        // Buffer size for streaming responses
        BUFFER_SIZE: 1024,
        
        // Flush interval for partial responses (ms)
        FLUSH_INTERVAL: 100
    },
    
    // Debug settings
    DEBUG: {
        // Enable detailed API logging
        ENABLE_API_LOGGING: true,
        
        // Log truncated content
        LOG_TRUNCATION: true,
        
        // Log token usage
        LOG_TOKEN_USAGE: true
    }
};

// Make configuration available globally
window.APIConfig = APIConfig;

// Also export for ES6 modules if supported
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIConfig;
}