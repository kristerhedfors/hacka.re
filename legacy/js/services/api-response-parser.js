/**
 * API Response Parser
 * Handles parsing and validation of different API response formats
 */

window.ApiResponseParser = (function() {
    /**
     * Parse and validate API response
     * @param {Response} response - Fetch API response object
     * @returns {Promise<Object>} - Parsed response data
     */
    async function parseResponse(response) {
        if (!response) {
            throw new Error('No response provided');
        }
        
        // Check if response is ok
        if (!response.ok) {
            return parseErrorResponse(response);
        }
        
        // Parse successful response
        try {
            const data = await response.json();
            return {
                success: true,
                data: data,
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries())
            };
        } catch (error) {
            throw new Error(`Failed to parse response JSON: ${error.message}`);
        }
    }
    
    /**
     * Parse error response
     * @private
     */
    async function parseErrorResponse(response) {
        let errorData;
        
        try {
            errorData = await response.json();
        } catch (e) {
            // If JSON parsing fails, create a generic error
            errorData = {
                error: {
                    message: `HTTP ${response.status}: ${response.statusText}`,
                    type: 'http_error',
                    code: response.status
                }
            };
        }
        
        const error = new Error(
            errorData.error?.message || 
            errorData.message || 
            `HTTP ${response.status}: ${response.statusText}`
        );
        
        error.response = {
            status: response.status,
            statusText: response.statusText,
            data: errorData,
            headers: Object.fromEntries(response.headers.entries())
        };
        
        throw error;
    }
    
    /**
     * Parse models list response
     * @param {Object} responseData - Raw response data
     * @returns {Array} - Parsed models array
     */
    function parseModelsResponse(responseData) {
        if (!responseData || !responseData.data) {
            throw new Error('Invalid models response format');
        }
        
        const models = responseData.data;
        
        if (!Array.isArray(models)) {
            throw new Error('Models data is not an array');
        }
        
        // Validate and normalize model objects
        return models.map(model => {
            if (!model || typeof model !== 'object') {
                throw new Error('Invalid model object');
            }
            
            if (!model.id) {
                throw new Error('Model missing required id field');
            }
            
            return {
                id: model.id,
                object: model.object || 'model',
                created: model.created || Date.now(),
                owned_by: model.owned_by || 'unknown',
                permission: model.permission || [],
                root: model.root || model.id,
                parent: model.parent || null,
                // Store original model data for future use
                _original: model
            };
        });
    }
    
    /**
     * Parse chat completion chunk from SSE
     * @param {string} sseData - SSE data string
     * @returns {Object|null} - Parsed chunk data or null if invalid
     */
    function parseChatCompletionChunk(sseData) {
        if (!sseData || sseData.trim() === '') {
            return null;
        }
        
        // Handle [DONE] marker
        if (sseData.trim() === '[DONE]') {
            return { type: 'done' };
        }
        
        try {
            const data = JSON.parse(sseData);
            
            if (!data.choices || !Array.isArray(data.choices)) {
                return null;
            }
            
            const choice = data.choices[0];
            if (!choice) {
                return null;
            }
            
            const delta = choice.delta || {};
            const result = {
                type: 'delta',
                id: data.id,
                model: data.model,
                created: data.created,
                choice: {
                    index: choice.index || 0,
                    finish_reason: choice.finish_reason || null,
                    delta: delta
                }
            };
            
            // Parse content delta
            if (delta.content !== undefined) {
                result.contentDelta = delta.content;
            }
            
            // Parse tool call deltas
            if (delta.tool_calls && Array.isArray(delta.tool_calls)) {
                result.toolCallDeltas = delta.tool_calls.map(tc => ({
                    index: tc.index,
                    id: tc.id || null,
                    type: tc.type || 'function',
                    function: tc.function || null
                }));
            }
            
            // Parse role delta
            if (delta.role) {
                result.roleDelta = delta.role;
            }
            
            return result;
        } catch (error) {
            console.error('Error parsing chat completion chunk:', error);
            return null;
        }
    }
    
    /**
     * Validate chat completion request body
     * @param {Object} requestBody - Request body to validate
     * @returns {Object} - Validation result
     */
    function validateChatCompletionRequest(requestBody) {
        const errors = [];
        
        // Check required fields
        if (!requestBody.messages || !Array.isArray(requestBody.messages)) {
            errors.push('messages field is required and must be an array');
        } else if (requestBody.messages.length === 0) {
            errors.push('messages array cannot be empty');
        }
        
        if (!requestBody.model || typeof requestBody.model !== 'string') {
            errors.push('model field is required and must be a string');
        }
        
        // Validate messages
        if (requestBody.messages && Array.isArray(requestBody.messages)) {
            requestBody.messages.forEach((message, index) => {
                if (!message.role) {
                    errors.push(`Message at index ${index} is missing role field`);
                }
                
                if (!message.content && !message.tool_calls) {
                    errors.push(`Message at index ${index} is missing content or tool_calls field`);
                }
                
                if (message.role && !['system', 'user', 'assistant', 'tool'].includes(message.role)) {
                    errors.push(`Message at index ${index} has invalid role: ${message.role}`);
                }
            });
        }
        
        // Validate tools if present
        if (requestBody.tools && Array.isArray(requestBody.tools)) {
            requestBody.tools.forEach((tool, index) => {
                if (!tool.type) {
                    errors.push(`Tool at index ${index} is missing type field`);
                }
                
                if (tool.type === 'function' && !tool.function) {
                    errors.push(`Function tool at index ${index} is missing function field`);
                }
                
                if (tool.function && !tool.function.name) {
                    errors.push(`Function tool at index ${index} is missing function name`);
                }
            });
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    /**
     * Parse usage information from response
     * @param {Object} responseData - Response data containing usage info
     * @returns {Object|null} - Parsed usage data or null
     */
    function parseUsageInfo(responseData) {
        if (!responseData || !responseData.usage) {
            return null;
        }
        
        const usage = responseData.usage;
        
        return {
            prompt_tokens: usage.prompt_tokens || 0,
            completion_tokens: usage.completion_tokens || 0,
            total_tokens: usage.total_tokens || 0,
            // Include any additional usage fields
            ...usage
        };
    }
    
    /**
     * Extract finish reason from response
     * @param {Object} responseData - Response data
     * @returns {string|null} - Finish reason or null
     */
    function parseFinishReason(responseData) {
        if (!responseData || !responseData.choices || !Array.isArray(responseData.choices)) {
            return null;
        }
        
        const choice = responseData.choices[0];
        return choice?.finish_reason || null;
    }
    
    // Public API
    return {
        parseResponse,
        parseModelsResponse,
        parseChatCompletionChunk,
        validateChatCompletionRequest,
        parseUsageInfo,
        parseFinishReason
    };
})();