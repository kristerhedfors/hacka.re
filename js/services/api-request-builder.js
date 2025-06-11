/**
 * API Request Builder
 * Builds and validates API requests for different providers
 */

window.ApiRequestBuilder = (function() {
    // API endpoint paths (relative to the base URL)
    const ENDPOINT_PATHS = {
        CHAT: 'chat/completions',
        MODELS: 'models'
    };
    
    /**
     * Build chat completion request
     * @param {Object} params - Request parameters
     * @returns {Object} - Complete request configuration
     */
    function buildChatCompletionRequest(params) {
        const {
            apiKey,
            model,
            messages,
            systemPrompt,
            apiToolsManager,
            baseUrl
        } = params;
        
        if (!apiKey) {
            throw new Error('API key is required');
        }
        
        if (!model) {
            throw new Error('Model is required');
        }
        
        if (!messages || !Array.isArray(messages)) {
            throw new Error('Messages array is required');
        }
        
        // Create a copy of the messages array
        let apiMessages = [...messages];
        
        // Add system prompt if provided
        if (systemPrompt && systemPrompt.trim()) {
            apiMessages.unshift({
                role: 'system',
                content: systemPrompt
            });
        }
        
        // Build request body
        const requestBody = {
            messages: apiMessages,
            stream: true,
            model: model
        };
        
        // Add tools if available
        if (apiToolsManager) {
            const toolDefinitions = apiToolsManager.getEnabledToolDefinitions();
            if (toolDefinitions && toolDefinitions.length > 0) {
                requestBody.tools = toolDefinitions;
                requestBody.tool_choice = "auto";
            }
        }
        
        // Build headers
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        };
        
        // Get endpoint URL
        const endpointUrl = getEndpointUrl('CHAT', baseUrl);
        
        return {
            url: endpointUrl,
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody),
            requestBody: requestBody // Keep for debugging
        };
    }
    
    /**
     * Build models list request
     * @param {Object} params - Request parameters
     * @returns {Object} - Complete request configuration
     */
    function buildModelsRequest(params) {
        const { apiKey, baseUrl } = params;
        
        if (!apiKey) {
            throw new Error('API key is required');
        }
        
        // Build headers
        const headers = {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        };
        
        // Get endpoint URL
        const endpointUrl = getEndpointUrl('MODELS', baseUrl);
        
        return {
            url: endpointUrl,
            method: 'GET',
            headers: headers
        };
    }
    
    /**
     * Build follow-up request after tool calls
     * @param {Object} params - Request parameters
     * @returns {Object} - Complete request configuration
     */
    function buildFollowUpRequest(params) {
        const {
            apiKey,
            model,
            messages,
            toolCalls,
            toolResults,
            baseUrl
        } = params;
        
        if (!apiKey) {
            throw new Error('API key is required');
        }
        
        if (!messages || !Array.isArray(messages)) {
            throw new Error('Messages array is required');
        }
        
        // Create updated messages array with tool calls and results
        const updatedMessages = [...messages];
        
        // Add assistant message with tool calls
        if (toolCalls && toolCalls.length > 0) {
            updatedMessages.push({
                role: 'assistant',
                content: '', // Content was already processed
                tool_calls: toolCalls
            });
            
            // Add tool result messages
            if (toolResults && toolResults.length > 0) {
                for (const result of toolResults) {
                    updatedMessages.push(result);
                }
            }
        }
        
        // Build request body
        const requestBody = {
            messages: updatedMessages,
            stream: true,
            model: model
        };
        
        // Build headers
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        };
        
        // Get endpoint URL
        const endpointUrl = getEndpointUrl('CHAT', baseUrl);
        
        return {
            url: endpointUrl,
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody),
            requestBody: requestBody
        };
    }
    
    /**
     * Get full endpoint URL
     * @param {string} endpoint - Endpoint name (CHAT, MODELS)
     * @param {string} customBaseUrl - Optional custom base URL
     * @returns {string} - Full endpoint URL
     */
    function getEndpointUrl(endpoint, customBaseUrl = null) {
        let baseUrl;
        
        if (customBaseUrl && customBaseUrl !== 'null' && customBaseUrl !== 'undefined') {
            baseUrl = customBaseUrl;
        } else {
            baseUrl = getBaseUrl();
        }
        
        // Ensure the base URL ends with a slash and the endpoint path doesn't start with a slash
        const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
        const url = `${normalizedBaseUrl}${ENDPOINT_PATHS[endpoint]}`;
        
        return url;
    }
    
    /**
     * Get base URL from settings
     * @private
     */
    function getBaseUrl() {
        // For all providers, use the standard base URL
        const baseUrl = StorageService.getBaseUrl();
        
        // Ensure we never return null or undefined
        if (!baseUrl || baseUrl === 'null' || baseUrl === 'undefined') {
            // Get the current provider and use its default URL
            const currentProvider = StorageService.getBaseUrlProvider();
            const defaultUrl = StorageService.getDefaultBaseUrlForProvider(currentProvider);
            return defaultUrl;
        }
        
        return baseUrl;
    }
    
    /**
     * Validate request parameters
     * @param {Object} params - Parameters to validate
     * @param {Array} requiredFields - Required field names
     * @returns {Object} - Validation result
     */
    function validateRequestParams(params, requiredFields) {
        const errors = [];
        
        if (!params || typeof params !== 'object') {
            errors.push('Parameters object is required');
            return { isValid: false, errors };
        }
        
        for (const field of requiredFields) {
            if (params[field] === undefined || params[field] === null) {
                errors.push(`${field} is required`);
            } else if (field === 'messages' && !Array.isArray(params[field])) {
                errors.push(`${field} must be an array`);
            } else if (field === 'messages' && params[field].length === 0) {
                errors.push(`${field} array cannot be empty`);
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    /**
     * Add custom headers to request
     * @param {Object} request - Request configuration
     * @param {Object} customHeaders - Custom headers to add
     * @returns {Object} - Updated request configuration
     */
    function addCustomHeaders(request, customHeaders) {
        if (!customHeaders || typeof customHeaders !== 'object') {
            return request;
        }
        
        return {
            ...request,
            headers: {
                ...request.headers,
                ...customHeaders
            }
        };
    }
    
    /**
     * Add request timeout
     * @param {Object} request - Request configuration
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Object} - Updated request configuration with AbortController
     */
    function addTimeout(request, timeout) {
        if (!timeout || timeout <= 0) {
            return request;
        }
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
        }, timeout);
        
        return {
            ...request,
            signal: controller.signal,
            cleanup: () => {
                clearTimeout(timeoutId);
            }
        };
    }
    
    /**
     * Build request with retry configuration
     * @param {Object} baseRequest - Base request configuration
     * @param {Object} retryConfig - Retry configuration
     * @returns {Object} - Request with retry configuration
     */
    function addRetryConfig(baseRequest, retryConfig = {}) {
        const defaultRetryConfig = {
            maxRetries: 3,
            retryDelay: 1000,
            backoffMultiplier: 2,
            retryCondition: (error) => {
                // Retry on network errors or 5xx status codes
                return !error.response || 
                       (error.response.status >= 500 && error.response.status < 600);
            }
        };
        
        return {
            ...baseRequest,
            retryConfig: {
                ...defaultRetryConfig,
                ...retryConfig
            }
        };
    }
    
    // Public API
    return {
        buildChatCompletionRequest,
        buildModelsRequest,
        buildFollowUpRequest,
        getEndpointUrl,
        validateRequestParams,
        addCustomHeaders,
        addTimeout,
        addRetryConfig
    };
})();