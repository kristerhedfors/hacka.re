/**
 * API Tools Service
 * Handles API tool definitions and tool calling functionality
 */

window.ApiToolsService = (function() {
    // Storage key for API tool definitions
    const STORAGE_KEY = 'hacka_re_api_tools';
    
    // Default empty tools array
    let apiTools = [];
    
    /**
     * Initialize the API tools service
     * Load saved tool definitions from localStorage
     */
    function init() {
        const savedTools = localStorage.getItem(STORAGE_KEY);
        if (savedTools) {
            try {
                apiTools = JSON.parse(savedTools);
                console.log(`Loaded ${apiTools.length} API tool definitions`);
            } catch (error) {
                console.error('Error loading API tool definitions:', error);
                apiTools = [];
            }
        }
    }
    
    /**
     * Get all API tool definitions
     * @returns {Array} Array of API tool definitions
     */
    function getApiTools() {
        return apiTools;
    }
    
    /**
     * Add a new API tool definition
     * @param {Object} toolDefinition - The tool definition object
     * @returns {boolean} Success status
     */
    function addApiTool(toolDefinition) {
        if (!isValidToolDefinition(toolDefinition)) {
            return false;
        }
        
        // Check if a tool with the same name already exists
        const existingIndex = apiTools.findIndex(tool => tool.name === toolDefinition.name);
        if (existingIndex >= 0) {
            // Replace the existing tool
            apiTools[existingIndex] = toolDefinition;
        } else {
            // Add new tool
            apiTools.push(toolDefinition);
        }
        
        // Save to localStorage
        saveApiTools();
        return true;
    }
    
    /**
     * Remove an API tool definition
     * @param {string} toolName - The name of the tool to remove
     * @returns {boolean} Success status
     */
    function removeApiTool(toolName) {
        const initialLength = apiTools.length;
        apiTools = apiTools.filter(tool => tool.name !== toolName);
        
        // If the array length changed, save to localStorage
        if (apiTools.length !== initialLength) {
            saveApiTools();
            return true;
        }
        
        return false;
    }
    
    /**
     * Save API tool definitions to localStorage
     */
    function saveApiTools() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(apiTools));
    }
    
    /**
     * Validate a tool definition object
     * @param {Object} toolDefinition - The tool definition to validate
     * @returns {boolean} Whether the tool definition is valid
     */
    function isValidToolDefinition(toolDefinition) {
        // Required fields
        if (!toolDefinition.name || !toolDefinition.description || !toolDefinition.endpoint) {
            return false;
        }
        
        // Name must be a valid identifier (alphanumeric, underscores, no spaces)
        if (!/^[a-zA-Z0-9_]+$/.test(toolDefinition.name)) {
            return false;
        }
        
        // Parameters must be an object if present
        if (toolDefinition.parameters && typeof toolDefinition.parameters !== 'object') {
            return false;
        }
        
        return true;
    }
    
    /**
     * Format API tools as OpenAI tool definitions
     * @returns {Array} Array of tool definitions in OpenAI format
     */
    function formatToolsForOpenAI() {
        return apiTools.map(tool => ({
            type: "function",
            function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters || {
                    type: "object",
                    properties: {},
                    required: []
                }
            }
        }));
    }
    
    /**
     * Execute a tool call
     * @param {Object} toolCall - The tool call object from the API response
     * @param {string} apiKey - The API key to use for authentication
     * @returns {Promise<Object>} The tool call result
     */
    async function executeToolCall(toolCall, apiKey) {
        const toolName = toolCall.function.name;
        const toolDefinition = apiTools.find(tool => tool.name === toolName);
        
        if (!toolDefinition) {
            throw new Error(`Tool "${toolName}" not found`);
        }
        
        let args = {};
        try {
            args = JSON.parse(toolCall.function.arguments);
        } catch (error) {
            throw new Error(`Invalid arguments for tool "${toolName}": ${error.message}`);
        }
        
        // Prepare headers
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // Add authentication if specified
        if (toolDefinition.authType === 'bearer' && apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        } else if (toolDefinition.authType === 'custom' && toolDefinition.authHeader && apiKey) {
            headers[toolDefinition.authHeader] = apiKey;
        }
        
        // Add any custom headers
        if (toolDefinition.headers && typeof toolDefinition.headers === 'object') {
            Object.assign(headers, toolDefinition.headers);
        }
        
        // Prepare request options
        const requestOptions = {
            method: toolDefinition.method || 'POST',
            headers: headers,
            body: JSON.stringify(args)
        };
        
        // For GET requests, convert body to query parameters and remove body
        if (requestOptions.method === 'GET') {
            let url = toolDefinition.endpoint;
            const queryParams = new URLSearchParams();
            
            for (const [key, value] of Object.entries(args)) {
                queryParams.append(key, value);
            }
            
            const queryString = queryParams.toString();
            if (queryString) {
                url += (url.includes('?') ? '&' : '?') + queryString;
            }
            
            delete requestOptions.body;
            
            try {
                const response = await fetch(url, requestOptions);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
                }
                
                return await response.json();
            } catch (error) {
                throw new Error(`Error executing tool "${toolName}": ${error.message}`);
            }
        } else {
            // For other request methods
            try {
                const response = await fetch(toolDefinition.endpoint, requestOptions);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
                }
                
                return await response.json();
            } catch (error) {
                throw new Error(`Error executing tool "${toolName}": ${error.message}`);
            }
        }
    }
    
    /**
     * Process tool calls from an API response
     * @param {Array} toolCalls - Array of tool calls from the API response
     * @param {string} apiKey - The API key to use for authentication
     * @returns {Promise<Array>} Array of tool call results
     */
    async function processToolCalls(toolCalls, apiKey) {
        if (!toolCalls || !Array.isArray(toolCalls) || toolCalls.length === 0) {
            return [];
        }
        
        const results = [];
        
        for (const toolCall of toolCalls) {
            try {
                const result = await executeToolCall(toolCall, apiKey);
                results.push({
                    tool_call_id: toolCall.id,
                    role: "tool",
                    name: toolCall.function.name,
                    content: JSON.stringify(result)
                });
            } catch (error) {
                console.error('Error executing tool call:', error);
                results.push({
                    tool_call_id: toolCall.id,
                    role: "tool",
                    name: toolCall.function.name,
                    content: JSON.stringify({ error: error.message })
                });
            }
        }
        
        return results;
    }
    
    // Public API
    return {
        init,
        getApiTools,
        addApiTool,
        removeApiTool,
        formatToolsForOpenAI,
        processToolCalls
    };
})();
