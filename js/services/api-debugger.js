/**
 * API Debugger
 * Centralized debug logging for API operations
 */

window.ApiDebugger = (function() {
    const DEBUG_PREFIX = '[API Debug]';
    
    /**
     * Log debug information with proper formatting
     * @param {string} message - Debug message
     * @param {*} data - Optional data to log
     */
    function log(message, data = null) {
        if (data !== null) {
            console.log(`${DEBUG_PREFIX} ${message}:`, data);
        } else {
            console.log(`${DEBUG_PREFIX} ${message}`);
        }
    }
    
    /**
     * Log API request details
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Request options
     * @param {Object} requestBody - Request body (will mask sensitive data)
     */
    function logRequest(endpoint, options, requestBody = null) {
        log(`Making request to: ${endpoint}`);
        
        if (options) {
            const safeOptions = {
                method: options.method,
                headers: maskSensitiveHeaders(options.headers),
                // Don't log the actual body content for security
                hasBody: !!options.body
            };
            log('Request options', safeOptions);
        }
        
        if (requestBody) {
            const safeBody = maskSensitiveRequestData(requestBody);
            log('Request body', safeBody);
        }
    }
    
    /**
     * Log API response details
     * @param {Response} response - Fetch response object
     * @param {*} data - Response data (optional)
     */
    function logResponse(response, data = null) {
        log(`Response received: ${response.status} ${response.statusText}`);
        
        if (data) {
            // For large responses, just log a summary
            if (typeof data === 'object' && data.data && Array.isArray(data.data)) {
                log(`Response contains ${data.data.length} items`);
            } else {
                log('Response data type:', typeof data);
            }
        }
    }
    
    /**
     * Log streaming operations
     * @param {string} operation - Operation description
     * @param {*} details - Operation details
     */
    function logStream(operation, details = null) {
        log(`Stream: ${operation}`, details);
    }
    
    /**
     * Log tool call operations
     * @param {string} operation - Operation description
     * @param {*} details - Operation details
     */
    function logToolCall(operation, details = null) {
        log(`ToolCall: ${operation}`, details);
    }
    
    /**
     * Log base URL operations
     * @param {string} provider - Provider name
     * @param {string} baseUrl - Base URL
     * @param {string} operation - Operation description
     */
    function logBaseUrl(provider, baseUrl, operation = 'retrieved') {
        log(`Base URL ${operation} for provider ${provider}: ${baseUrl}`);
    }
    
    /**
     * Log model operations
     * @param {string} operation - Operation description
     * @param {*} details - Operation details
     */
    function logModel(operation, details = null) {
        log(`Model: ${operation}`, details);
    }
    
    /**
     * Log info message with context
     * @param {string} operation - Operation name
     * @param {string} message - Info message
     * @param {*} context - Additional context
     */
    function logInfo(operation, message, context = null) {
        console.log(`${DEBUG_PREFIX} ${operation}: ${message}`);
        if (context) {
            console.log(`${DEBUG_PREFIX} Context:`, context);
        }
    }
    
    /**
     * Log error with context
     * @param {string} operation - Operation that failed
     * @param {Error} error - Error object
     * @param {*} context - Additional context
     */
    function logError(operation, error, context = null) {
        console.error(`${DEBUG_PREFIX} Error in ${operation}:`, error);
        if (context) {
            console.error(`${DEBUG_PREFIX} Error context:`, context);
        }
    }
    
    /**
     * Log performance metrics
     * @param {string} operation - Operation name
     * @param {number} duration - Duration in milliseconds
     * @param {*} metadata - Additional metadata
     */
    function logPerformance(operation, duration, metadata = null) {
        log(`Performance: ${operation} took ${duration}ms`, metadata);
    }
    
    /**
     * Create a performance timer
     * @param {string} operation - Operation name
     * @returns {Object} - Timer object with stop method
     */
    function createTimer(operation) {
        const startTime = performance.now();
        
        return {
            stop: (metadata = null) => {
                const duration = performance.now() - startTime;
                logPerformance(operation, Math.round(duration), metadata);
                return duration;
            }
        };
    }
    
    /**
     * Mask sensitive headers for logging
     * @private
     */
    function maskSensitiveHeaders(headers) {
        if (!headers) return null;
        
        const safeHeaders = {};
        const sensitiveKeys = ['authorization', 'x-api-key', 'apikey'];
        
        for (const [key, value] of Object.entries(headers)) {
            const lowerKey = key.toLowerCase();
            if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
                safeHeaders[key] = '***';
            } else {
                safeHeaders[key] = value;
            }
        }
        
        return safeHeaders;
    }
    
    /**
     * Mask sensitive request data for logging
     * @private
     */
    function maskSensitiveRequestData(data) {
        if (!data || typeof data !== 'object') {
            return data;
        }
        
        const safeData = { ...data };
        
        // Mask API keys if present
        if (safeData.api_key) {
            safeData.api_key = '***';
        }
        
        // For messages, don't log content if it's very long
        if (safeData.messages && Array.isArray(safeData.messages)) {
            safeData.messages = safeData.messages.map(msg => {
                if (msg.content && msg.content.length > 200) {
                    return {
                        ...msg,
                        content: `[Content truncated: ${msg.content.length} chars]`
                    };
                }
                return msg;
            });
        }
        
        // For tools, just log the count
        if (safeData.tools && Array.isArray(safeData.tools)) {
            safeData.tools = `[${safeData.tools.length} tools]`;
        }
        
        return safeData;
    }
    
    /**
     * Log provider configuration
     * @param {string} provider - Provider name
     * @param {Object} config - Provider configuration
     */
    function logProviderConfig(provider, config) {
        log(`Provider configuration for ${provider}`, {
            hasApiKey: !!config.apiKey,
            baseUrl: config.baseUrl,
            model: config.model,
            // Don't log sensitive configuration
        });
    }
    
    /**
     * Log connection status
     * @param {string} provider - Provider name
     * @param {string} status - Connection status
     * @param {*} details - Additional details
     */
    function logConnection(provider, status, details = null) {
        log(`Connection to ${provider}: ${status}`, details);
    }
    
    /**
     * Check if debug mode is enabled
     * @returns {boolean}
     */
    function isDebugEnabled() {
        return window.DebugService && DebugService.getDebugMode && DebugService.getDebugMode();
    }
    
    /**
     * Conditional logging - only logs if debug mode is enabled
     * @param {Function} logFunction - Function to call for logging
     */
    function debugOnly(logFunction) {
        if (isDebugEnabled()) {
            logFunction();
        }
    }
    
    // Public API
    return {
        log,
        logRequest,
        logResponse,
        logStream,
        logToolCall,
        logBaseUrl,
        logModel,
        logInfo,
        logError,
        logPerformance,
        logProviderConfig,
        logConnection,
        createTimer,
        isDebugEnabled,
        debugOnly
    };
})();