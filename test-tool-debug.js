/**
 * Test Tool Debug
 * This script provides functions to test and debug tool calling functionality in hacka.re
 */

// Create a namespace for test functions
window.ToolDebugger = (function() {
    // Sample tool definitions for testing
    const sampleTools = {
        // Weather tool - simple GET request
        weather: {
            name: "weather_lookup",
            description: "Get current weather information for a location",
            endpoint: "https://api.openweathermap.org/data/2.5/weather",
            method: "GET",
            authType: "none",
            parameters: {
                type: "object",
                properties: {
                    location: {
                        type: "string",
                        description: "City name or zip code"
                    },
                    units: {
                        type: "string",
                        enum: ["metric", "imperial"],
                        description: "Temperature units (metric or imperial)"
                    }
                },
                required: ["location"]
            }
        },
        
        // Calculator tool - simple POST request
        calculator: {
            name: "calculate",
            description: "Perform a mathematical calculation",
            endpoint: "https://api.example.com/calculate",
            method: "POST",
            authType: "none",
            parameters: {
                type: "object",
                properties: {
                    expression: {
                        type: "string",
                        description: "Mathematical expression to evaluate (e.g., '2 + 2')"
                    },
                    precision: {
                        type: "integer",
                        description: "Number of decimal places for the result",
                        default: 2
                    }
                },
                required: ["expression"]
            }
        },
        
        // Search tool - GET with authentication
        search: {
            name: "web_search",
            description: "Search the web for information",
            endpoint: "https://api.example.com/search",
            method: "GET",
            authType: "bearer",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: "Search query"
                    },
                    limit: {
                        type: "integer",
                        description: "Maximum number of results to return",
                        default: 5
                    }
                },
                required: ["query"]
            }
        }
    };
    
    // Mock API responses for testing
    const mockResponses = {
        weather_lookup: function(args) {
            const location = args.location || "Unknown";
            const units = args.units || "metric";
            const tempUnit = units === "metric" ? "°C" : "°F";
            const temp = Math.round(15 + Math.random() * 15);
            
            return {
                location: location,
                temperature: temp + tempUnit,
                conditions: ["Sunny", "Partly Cloudy", "Cloudy", "Rainy"][Math.floor(Math.random() * 4)],
                humidity: Math.round(40 + Math.random() * 40) + "%",
                wind: Math.round(5 + Math.random() * 20) + (units === "metric" ? " km/h" : " mph"),
                units: units
            };
        },
        
        calculate: function(args) {
            const expression = args.expression || "0";
            const precision = args.precision || 2;
            
            let result;
            try {
                // SECURITY NOTE: In a real application, never use eval with user input
                // This is only for demonstration purposes
                result = eval(expression);
                if (typeof result === 'number') {
                    result = result.toFixed(precision);
                }
            } catch (error) {
                return {
                    error: "Invalid expression",
                    message: error.message
                };
            }
            
            return {
                expression: expression,
                result: result,
                precision: precision
            };
        },
        
        web_search: function(args) {
            const query = args.query || "";
            const limit = args.limit || 5;
            
            // Generate mock search results
            const results = [];
            for (let i = 0; i < limit; i++) {
                results.push({
                    title: `Result ${i+1} for "${query}"`,
                    url: `https://example.com/result-${i+1}`,
                    snippet: `This is a mock search result ${i+1} for the query "${query}". It contains some sample text that might be returned from a search engine.`
                });
            }
            
            return {
                query: query,
                results: results,
                total_results: limit * 10,
                page: 1,
                limit: limit
            };
        }
    };
    
    /**
     * Add a sample tool to localStorage
     * @param {string} toolKey - Key of the sample tool to add
     * @returns {Object} The added tool definition
     */
    function addSampleTool(toolKey) {
        if (!sampleTools[toolKey]) {
            console.error(`Sample tool "${toolKey}" not found`);
            return null;
        }
        
        const toolDefinition = sampleTools[toolKey];
        const STORAGE_KEY = 'hacka_re_api_tools';
        
        // Get existing tools
        let tools = [];
        const existingTools = localStorage.getItem(STORAGE_KEY);
        if (existingTools) {
            try {
                tools = JSON.parse(existingTools);
            } catch (error) {
                console.error('Error parsing existing tools:', error);
            }
        }
        
        // Add the sample tool if it doesn't exist
        const existingToolIndex = tools.findIndex(tool => tool.name === toolDefinition.name);
        if (existingToolIndex >= 0) {
            tools[existingToolIndex] = toolDefinition;
            console.log(`Updated existing tool: ${toolDefinition.name}`);
        } else {
            tools.push(toolDefinition);
            console.log(`Added new tool: ${toolDefinition.name}`);
        }
        
        // Save to localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tools));
        
        // Reinitialize ApiToolsService if it exists
        if (window.ApiToolsService) {
            ApiToolsService.init();
        }
        
        return toolDefinition;
    }
    
    /**
     * Add all sample tools to localStorage
     * @returns {Array} Array of added tool definitions
     */
    function addAllSampleTools() {
        const addedTools = [];
        
        for (const toolKey in sampleTools) {
            const tool = addSampleTool(toolKey);
            if (tool) {
                addedTools.push(tool);
            }
        }
        
        console.log(`Added ${addedTools.length} sample tools`);
        return addedTools;
    }
    
    /**
     * Clear all tools from localStorage
     */
    function clearAllTools() {
        const STORAGE_KEY = 'hacka_re_api_tools';
        localStorage.removeItem(STORAGE_KEY);
        console.log('All API tools cleared from localStorage');
        
        // Reinitialize ApiToolsService if it exists
        if (window.ApiToolsService) {
            ApiToolsService.init();
        }
    }
    
    /**
     * View all tools in localStorage
     * @returns {Array} Array of tool definitions
     */
    function viewAllTools() {
        const STORAGE_KEY = 'hacka_re_api_tools';
        const existingTools = localStorage.getItem(STORAGE_KEY);
        
        if (existingTools) {
            try {
                const tools = JSON.parse(existingTools);
                console.log(`Found ${tools.length} tools in localStorage:`, tools);
                return tools;
            } catch (error) {
                console.error('Error parsing tools from localStorage:', error);
                return [];
            }
        } else {
            console.log('No tools found in localStorage');
            return [];
        }
    }
    
    /**
     * Create a mock tool call for testing
     * @param {string} toolName - Name of the tool to call
     * @param {Object} args - Arguments for the tool call
     * @returns {Object} Mock tool call object
     */
    function createMockToolCall(toolName, args) {
        if (!toolName) {
            console.error('Tool name is required');
            return null;
        }
        
        // Find the tool definition
        const tools = viewAllTools();
        const tool = tools.find(t => t.name === toolName);
        
        if (!tool) {
            console.error(`Tool "${toolName}" not found`);
            return null;
        }
        
        // Create a mock tool call object
        const toolCall = {
            id: `call_${Date.now()}`,
            type: "function",
            function: {
                name: toolName,
                arguments: JSON.stringify(args || {})
            }
        };
        
        console.log(`Created mock tool call for "${toolName}":`, toolCall);
        return toolCall;
    }
    
    /**
     * Execute a mock tool call
     * @param {string} toolName - Name of the tool to call
     * @param {Object} args - Arguments for the tool call
     * @returns {Promise<Object>} Tool call result
     */
    async function executeMockToolCall(toolName, args) {
        if (!toolName) {
            console.error('Tool name is required');
            return null;
        }
        
        // Create a mock tool call
        const toolCall = createMockToolCall(toolName, args);
        if (!toolCall) {
            return null;
        }
        
        console.log(`Executing mock tool call for "${toolName}" with args:`, args);
        
        // Check if ApiToolsService is available
        if (!window.ApiToolsService) {
            console.error('ApiToolsService is not available');
            
            // Return a mock response if available
            if (mockResponses[toolName]) {
                const mockResult = mockResponses[toolName](args || {});
                console.log(`Generated mock response for "${toolName}":`, mockResult);
                return mockResult;
            }
            
            return null;
        }
        
        try {
            // Use the real ApiToolsService to execute the tool call
            // But intercept the fetch call to return a mock response
            const originalFetch = window.fetch;
            
            // Override fetch temporarily
            window.fetch = async function(url, options) {
                console.log(`Intercepted fetch call to ${url}`);
                
                // Return a mock response if available
                if (mockResponses[toolName]) {
                    const mockResult = mockResponses[toolName](args || {});
                    console.log(`Generated mock response for "${toolName}":`, mockResult);
                    
                    // Create a mock response
                    return Promise.resolve({
                        ok: true,
                        status: 200,
                        statusText: 'OK',
                        json: () => Promise.resolve(mockResult)
                    });
                }
                
                // Fall back to the original fetch if no mock response is available
                console.log('No mock response available, using original fetch');
                return originalFetch.apply(this, arguments);
            };
            
            // Execute the tool call
            const result = await ApiToolsService.executeToolCall(toolCall, 'mock-api-key');
            
            // Restore the original fetch
            window.fetch = originalFetch;
            
            console.log(`Tool call result for "${toolName}":`, result);
            return result;
        } catch (error) {
            console.error(`Error executing tool call for "${toolName}":`, error);
            return null;
        }
    }
    
    /**
     * Test all available tools with mock data
     * @returns {Promise<Array>} Array of test results
     */
    async function testAllTools() {
        const tools = viewAllTools();
        
        if (tools.length === 0) {
            console.log('No tools available to test');
            return [];
        }
        
        console.log(`Testing ${tools.length} tools...`);
        
        const results = [];
        
        for (const tool of tools) {
            console.log(`Testing tool: ${tool.name}`);
            
            // Generate mock arguments based on the tool's parameters
            const args = {};
            
            if (tool.parameters && tool.parameters.properties) {
                for (const [paramName, paramDef] of Object.entries(tool.parameters.properties)) {
                    // Generate a mock value based on the parameter type
                    if (paramDef.enum && paramDef.enum.length > 0) {
                        // Use the first enum value
                        args[paramName] = paramDef.enum[0];
                    } else if (paramDef.type === 'string') {
                        // Use the parameter name as the value
                        args[paramName] = paramName === 'location' ? 'New York' : 
                                         paramName === 'query' ? 'test query' :
                                         paramName === 'expression' ? '2 + 2' : 
                                         `test_${paramName}`;
                    } else if (paramDef.type === 'integer' || paramDef.type === 'number') {
                        // Use a random number
                        args[paramName] = Math.floor(Math.random() * 10) + 1;
                    } else if (paramDef.type === 'boolean') {
                        // Use true
                        args[paramName] = true;
                    }
                }
            }
            
            try {
                // Execute the tool call
                const result = await executeMockToolCall(tool.name, args);
                
                results.push({
                    tool: tool.name,
                    args: args,
                    result: result,
                    success: !!result
                });
            } catch (error) {
                console.error(`Error testing tool "${tool.name}":`, error);
                
                results.push({
                    tool: tool.name,
                    args: args,
                    error: error.message,
                    success: false
                });
            }
        }
        
        console.log(`Completed testing ${tools.length} tools:`, results);
        return results;
    }
    
    /**
     * Create a test message that will trigger tool calling
     * @param {string} toolName - Name of the tool to trigger
     * @returns {string} A message that should trigger the tool
     */
    function createToolTriggerMessage(toolName) {
        const tools = viewAllTools();
        const tool = tools.find(t => t.name === toolName);
        
        if (!tool) {
            console.error(`Tool "${toolName}" not found`);
            return null;
        }
        
        let message = '';
        
        if (tool.name === 'weather_lookup') {
            message = 'What is the current weather in New York?';
        } else if (tool.name === 'calculate') {
            message = 'Calculate 125 * 37';
        } else if (tool.name === 'web_search') {
            message = 'Search for information about climate change';
        } else {
            // Generic message based on tool description
            message = `Please use the ${tool.name} tool. ${tool.description}`;
        }
        
        console.log(`Created tool trigger message for "${toolName}": "${message}"`);
        return message;
    }
    
    /**
     * Add a debug UI to the page
     */
    function addDebugUI() {
        // Check if the debug UI already exists
        if (document.getElementById('tool-debugger-ui')) {
            return;
        }
        
        // Create the debug UI container
        const container = document.createElement('div');
        container.id = 'tool-debugger-ui';
        container.style.position = 'fixed';
        container.style.top = '10px';
        container.style.right = '10px';
        container.style.zIndex = '9999';
        container.style.backgroundColor = '#f8f8f8';
        container.style.border = '1px solid #ddd';
        container.style.borderRadius = '8px';
        container.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
        container.style.padding = '10px';
        container.style.width = '300px';
        container.style.fontFamily = 'Arial, sans-serif';
        container.style.fontSize = '14px';
        
        // Add header
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '10px';
        
        const title = document.createElement('h3');
        title.textContent = 'Tool Debugger';
        title.style.margin = '0';
        title.style.fontSize = '16px';
        title.style.fontWeight = 'bold';
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'X';
        closeBtn.style.background = 'none';
        closeBtn.style.border = 'none';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.fontSize = '16px';
        closeBtn.style.fontWeight = 'bold';
        closeBtn.style.color = '#666';
        
        header.appendChild(title);
        header.appendChild(closeBtn);
        container.appendChild(header);
        
        // Add content
        const content = document.createElement('div');
        content.innerHTML = `
            <div style="margin-bottom: 15px;">
                <div style="font-weight: bold; margin-bottom: 5px;">Sample Tools</div>
                <div style="display: flex; gap: 5px; margin-bottom: 5px;">
                    <button id="add-weather-tool">Add Weather</button>
                    <button id="add-calc-tool">Add Calculator</button>
                    <button id="add-search-tool">Add Search</button>
                </div>
                <div style="display: flex; gap: 5px;">
                    <button id="add-all-tools">Add All</button>
                    <button id="clear-all-tools">Clear All</button>
                    <button id="view-all-tools">View All</button>
                </div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <div style="font-weight: bold; margin-bottom: 5px;">Test Tools</div>
                <div style="display: flex; gap: 5px; margin-bottom: 5px;">
                    <button id="test-weather-tool">Test Weather</button>
                    <button id="test-calc-tool">Test Calculator</button>
                    <button id="test-search-tool">Test Search</button>
                </div>
                <div>
                    <button id="test-all-tools" style="width: 100%;">Test All Tools</button>
                </div>
            </div>
            
            <div>
                <div style="font-weight: bold; margin-bottom: 5px;">Tool Messages</div>
                <div style="display: flex; gap: 5px; margin-bottom: 5px;">
                    <button id="copy-weather-msg">Weather Msg</button>
                    <button id="copy-calc-msg">Calculator Msg</button>
                    <button id="copy-search-msg">Search Msg</button>
                </div>
            </div>
        `;
        container.appendChild(content);
        
        // Add to the document
        document.body.appendChild(container);
        
        // Add event listeners
        closeBtn.addEventListener('click', () => {
            container.remove();
        });
        
        // Sample tool buttons
        document.getElementById('add-weather-tool').addEventListener('click', () => {
            addSampleTool('weather');
        });
        
        document.getElementById('add-calc-tool').addEventListener('click', () => {
            addSampleTool('calculator');
        });
        
        document.getElementById('add-search-tool').addEventListener('click', () => {
            addSampleTool('search');
        });
        
        document.getElementById('add-all-tools').addEventListener('click', () => {
            addAllSampleTools();
        });
        
        document.getElementById('clear-all-tools').addEventListener('click', () => {
            clearAllTools();
        });
        
        document.getElementById('view-all-tools').addEventListener('click', () => {
            viewAllTools();
        });
        
        // Test tool buttons
        document.getElementById('test-weather-tool').addEventListener('click', () => {
            executeMockToolCall('weather_lookup', { location: 'New York', units: 'metric' });
        });
        
        document.getElementById('test-calc-tool').addEventListener('click', () => {
            executeMockToolCall('calculate', { expression: '2 + 2', precision: 2 });
        });
        
        document.getElementById('test-search-tool').addEventListener('click', () => {
            executeMockToolCall('web_search', { query: 'test query', limit: 3 });
        });
        
        document.getElementById('test-all-tools').addEventListener('click', () => {
            testAllTools();
        });
        
        // Tool message buttons
        document.getElementById('copy-weather-msg').addEventListener('click', () => {
            const message = createToolTriggerMessage('weather_lookup');
            if (message) {
                navigator.clipboard.writeText(message)
                    .then(() => {
                        alert('Weather message copied to clipboard');
                    })
                    .catch(err => {
                        console.error('Failed to copy message:', err);
                        alert('Failed to copy message. See console for details.');
                    });
            }
        });
        
        document.getElementById('copy-calc-msg').addEventListener('click', () => {
            const message = createToolTriggerMessage('calculate');
            if (message) {
                navigator.clipboard.writeText(message)
                    .then(() => {
                        alert('Calculator message copied to clipboard');
                    })
                    .catch(err => {
                        console.error('Failed to copy message:', err);
                        alert('Failed to copy message. See console for details.');
                    });
            }
        });
        
        document.getElementById('copy-search-msg').addEventListener('click', () => {
            const message = createToolTriggerMessage('web_search');
            if (message) {
                navigator.clipboard.writeText(message)
                    .then(() => {
                        alert('Search message copied to clipboard');
                    })
                    .catch(err => {
                        console.error('Failed to copy message:', err);
                        alert('Failed to copy message. See console for details.');
                    });
            }
        });
    }
    
    // Public API
    return {
        addSampleTool,
        addAllSampleTools,
        clearAllTools,
        viewAllTools,
        createMockToolCall,
        executeMockToolCall,
        testAllTools,
        createToolTriggerMessage,
        addDebugUI
    };
})();

// Add the debug UI when the page loads
window.addEventListener('load', function() {
    console.log('Tool Debugger script loaded');
    
    // Add a button to show the debug UI
    const button = document.createElement('button');
    button.textContent = 'Tool Debugger';
    button.style.position = 'fixed';
    button.style.top = '10px';
    button.style.right = '10px';
    button.style.zIndex = '9998';
    button.style.backgroundColor = '#4CAF50';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '4px';
    button.style.padding = '8px 12px';
    button.style.cursor = 'pointer';
    button.style.fontSize = '14px';
    
    button.addEventListener('click', function() {
        ToolDebugger.addDebugUI();
    });
    
    document.body.appendChild(button);
});

console.log('Tool Debugger script injected');
