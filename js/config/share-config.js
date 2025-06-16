/**
 * Share system configuration constants
 */
export const SHARE_CONFIG = {
    // URL and encoding limits
    MAX_LINK_LENGTH: 2000,
    MAX_QR_LENGTH: 1500,
    ENCODING_OVERHEAD: 1.33,  // Base64 encoding overhead
    ENCRYPTION_OVERHEAD: 100,  // Salt + nonce + padding
    
    // Password configuration
    DEFAULT_PASSWORD_LENGTH: 12,
    PASSWORD_CHARSET: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
    
    // Versioning
    VERSION: "2.0",
    
    // UI configuration
    LINK_WARNING_THRESHOLD: 0.8,  // Show warning at 80% of max length
    COPY_FEEDBACK_DURATION: 2000,  // ms
    
    // Storage keys
    STORAGE_KEYS: {
        SHARE_OPTIONS: 'shareOptions',
        LOCKED_PASSWORD: 'lockedSharePassword',
        SESSION_KEY: 'sessionKey'
    },
    
    // Default share options
    DEFAULT_OPTIONS: {
        includeBaseUrl: false,
        includeApiKey: true,
        includeModel: false,
        includePromptLibrary: false,
        includeFunctionLibrary: false,
        includeConversation: false,
        messageCount: 10
    }
};