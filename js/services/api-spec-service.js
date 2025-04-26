/**
 * API Specification Service
 * Handles creation and management of OpenAPI specifications for function/tool calling
 */

window.ApiSpecService = (function() {
    /**
     * Initialize the API specification service
     */
    function init() {
        console.log('ApiSpecService initialized');
    }
    
    /**
     * Create an OpenAPI specification from user-provided information
     * @param {Object} specInfo - Information for creating the API specification
     * @returns {Object} The created OpenAPI specification
     */
    function createApiSpec(specInfo) {
        if (!isValidSpecInfo(specInfo)) {
            throw new Error('Invalid API specification information');
        }
        
        // Create a basic OpenAPI specification
        const apiSpec = {
            openapi: '3.0.0',
            info: {
                title: specInfo.title || 'API Specification',
                description: specInfo.description || '',
                version: specInfo.version || '1.0.0'
            },
            paths: {}
        };
        
        // Add paths based on the provided endpoints
        if (specInfo.endpoints && Array.isArray(specInfo.endpoints)) {
            specInfo.endpoints.forEach(endpoint => {
                const path = endpoint.path || '/';
                const method = (endpoint.method || 'get').toLowerCase();
                
                // Initialize path if it doesn't exist
                if (!apiSpec.paths[path]) {
                    apiSpec.paths[path] = {};
                }
                
                // Add method to path
                apiSpec.paths[path][method] = {
                    summary: endpoint.summary || '',
                    description: endpoint.description || '',
                    operationId: endpoint.operationId || `${method}${path.replace(/\//g, '_').replace(/[{}]/g, '')}`,
                    parameters: [],
                    responses: {
                        '200': {
                            description: 'Successful operation',
                            content: {
                                'application/json': {
                                    schema: endpoint.responseSchema || { type: 'object' }
                                }
                            }
                        }
                    }
                };
                
                // Add parameters
                if (endpoint.parameters && Array.isArray(endpoint.parameters)) {
                    endpoint.parameters.forEach(param => {
                        apiSpec.paths[path][method].parameters.push({
                            name: param.name,
                            in: param.in || 'query',
                            description: param.description || '',
                            required: param.required || false,
                            schema: param.schema || { type: 'string' }
                        });
                    });
                }
                
                // Add request body if method is not GET
                if (method !== 'get' && endpoint.requestBody) {
                    apiSpec.paths[path][method].requestBody = {
                        description: endpoint.requestBody.description || '',
                        required: endpoint.requestBody.required || true,
                        content: {
                            'application/json': {
                                schema: endpoint.requestBody.schema || { type: 'object' }
                            }
                        }
                    };
                }
            });
        }
        
        return apiSpec;
    }
    
    /**
     * Convert an OpenAPI specification to an OpenAI tool definition
     * @param {Object} apiSpec - The OpenAPI specification
     * @param {Object} toolInfo - Additional information for the tool definition
     * @returns {Object} The tool definition
     */
    function convertSpecToTool(apiSpec, toolInfo) {
        if (!apiSpec || !apiSpec.paths) {
            throw new Error('Invalid API specification');
        }
        
        // Extract the first path and method as the tool function
        const paths = Object.keys(apiSpec.paths);
        if (paths.length === 0) {
            throw new Error('API specification must contain at least one path');
        }
        
        const path = paths[0];
        const methods = Object.keys(apiSpec.paths[path]);
        if (methods.length === 0) {
            throw new Error(`Path ${path} must contain at least one method`);
        }
        
        const method = methods[0];
        const operation = apiSpec.paths[path][method];
        
        // Create the tool definition
        const toolDefinition = {
            name: toolInfo.name || operation.operationId || 'api_function',
            description: toolInfo.description || operation.description || apiSpec.info.description || 'API function',
            endpoint: toolInfo.endpoint || '',
            method: method.toUpperCase(),
            authType: toolInfo.authType || 'none'
        };
        
        // Add auth header if using custom auth
        if (toolInfo.authType === 'custom' && toolInfo.authHeader) {
            toolDefinition.authHeader = toolInfo.authHeader;
        }
        
        // Create parameters schema
        const parameters = {
            type: 'object',
            properties: {},
            required: []
        };
        
        // Add path parameters
        if (operation.parameters && operation.parameters.length > 0) {
            operation.parameters.forEach(param => {
                parameters.properties[param.name] = param.schema || { type: 'string' };
                parameters.properties[param.name].description = param.description || '';
                
                if (param.required) {
                    parameters.required.push(param.name);
                }
            });
        }
        
        // Add request body parameters for non-GET methods
        if (method !== 'get' && operation.requestBody && operation.requestBody.content && 
            operation.requestBody.content['application/json'] && 
            operation.requestBody.content['application/json'].schema) {
            
            const bodySchema = operation.requestBody.content['application/json'].schema;
            
            if (bodySchema.properties) {
                Object.keys(bodySchema.properties).forEach(propName => {
                    parameters.properties[propName] = bodySchema.properties[propName];
                });
                
                if (bodySchema.required && Array.isArray(bodySchema.required)) {
                    bodySchema.required.forEach(reqProp => {
                        if (!parameters.required.includes(reqProp)) {
                            parameters.required.push(reqProp);
                        }
                    });
                }
            }
        }
        
        // Add parameters to tool definition
        toolDefinition.parameters = parameters;
        
        return toolDefinition;
    }
    
    /**
     * Save an API tool definition to the ApiToolsService
     * @param {Object} toolDefinition - The tool definition to save
     * @returns {boolean} Success status
     */
    function saveApiTool(toolDefinition) {
        if (!window.ApiToolsService) {
            throw new Error('ApiToolsService is not available');
        }
        
        return ApiToolsService.addApiTool(toolDefinition);
    }
    
    /**
     * Create and save an API tool from user-provided information
     * @param {Object} specInfo - Information for creating the API specification
     * @param {Object} toolInfo - Additional information for the tool definition
     * @returns {Object} The saved tool definition
     */
    function createAndSaveTool(specInfo, toolInfo) {
        // Create the API specification
        const apiSpec = createApiSpec(specInfo);
        
        // Convert the specification to a tool definition
        const toolDefinition = convertSpecToTool(apiSpec, toolInfo);
        
        // Save the tool definition
        const success = saveApiTool(toolDefinition);
        
        if (!success) {
            throw new Error('Failed to save API tool');
        }
        
        return {
            toolDefinition: toolDefinition,
            apiSpec: apiSpec
        };
    }
    
    /**
     * Validate API specification information
     * @param {Object} specInfo - The specification information to validate
     * @returns {boolean} Whether the information is valid
     */
    function isValidSpecInfo(specInfo) {
        if (!specInfo || typeof specInfo !== 'object') {
            return false;
        }
        
        // Must have at least one endpoint
        if (!specInfo.endpoints || !Array.isArray(specInfo.endpoints) || specInfo.endpoints.length === 0) {
            return false;
        }
        
        // Each endpoint must have a path
        for (const endpoint of specInfo.endpoints) {
            if (!endpoint.path) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Generate a tool definition from a natural language description
     * This is a placeholder for future LLM-based generation
     * @param {string} description - Natural language description of the API
     * @returns {Object} Generated tool definition
     */
    function generateToolFromDescription(description) {
        // This is a placeholder for future implementation
        // In a real implementation, this would use the LLM to generate a tool definition
        
        return {
            name: 'generated_tool',
            description: description,
            endpoint: 'https://api.example.com/endpoint',
            method: 'POST',
            authType: 'none',
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'Query parameter'
                    }
                },
                required: ['query']
            }
        };
    }
    
    // Public API
    return {
        init,
        createApiSpec,
        convertSpecToTool,
        saveApiTool,
        createAndSaveTool,
        generateToolFromDescription
    };
})();

// Initialize the service when the script is loaded
if (typeof window !== 'undefined') {
    window.addEventListener('load', function() {
        if (window.ApiSpecService) {
            ApiSpecService.init();
        }
    });
}
