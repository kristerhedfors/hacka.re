/**
 * Debug Tool Calling
 * This script helps debug the tool calling functionality in hacka.re
 * Enhanced version with detailed logging of API calls, tool definitions, and responses
 */

// Create a debug namespace to avoid polluting the global scope
window.HackaReDebug = {
    enabled: true,
    logLevel: 'verbose', // 'verbose', 'normal', 'minimal'
    
    // Log with timestamp and category
    log: function(category, message, data) {
        if (!this.enabled) return;
        
        const timestamp = new Date().toISOString().split('T')[1].replace('Z', '');
        console.log(`%c[${timestamp}] [${category}]`, 'color: #0066cc; font-weight: bold', message);
        
        if (data !== undefined) {
            if (typeof data === 'object' && data !== null) {
                console.log('%c↳ Details:', 'color: #666', data);
            } else {
                console.log('%c↳ Value:', 'color: #666', data);
            }
        }
    },
    
    // Log errors with timestamp and category
    error: function(category, message, error) {
        if (!this.enabled) return;
        
        const timestamp = new Date().toISOString().split('T')[1].replace('Z', '');
        console.error(`%c[${timestamp}] [${category}] ERROR:`, 'color: #cc0000; font-weight: bold', message);
        
        if (error) {
            console.error('%c↳ Error details:', 'color: #666', error);
        }
    },
    
    // Log warnings with timestamp and category
    warn: function(category, message, data) {
        if (!this.enabled) return;
        
        const timestamp = new Date().toISOString().split('T')[1].replace('Z', '');
        console.warn(`%c[${timestamp}] [${category}] WARNING:`, 'color: #cc6600; font-weight: bold', message);
        
        if (data !== undefined) {
            console.warn('%c↳ Details:', 'color: #666', data);
        }
    },
    
    // Toggle debug mode
    toggle: function() {
        this.enabled = !this.enabled;
        console.log(`Debug mode ${this.enabled ? 'enabled' : 'disabled'}`);
        return this.enabled;
    },
    
    // Set log level
    setLogLevel: function(level) {
        if (['verbose', 'normal', 'minimal'].includes(level)) {
            this.logLevel = level;
            console.log(`Log level set to: ${level}`);
        } else {
            console.error(`Invalid log level: ${level}. Valid options are: verbose, normal, minimal`);
        }
    }
};

// Override fetch to log API requests and responses in detail
const originalFetch = window.fetch;
window.fetch = function(url, options) {
    const requestId = Math.random().toString(36).substring(2, 8);
    
    // Only log API-related requests in detail
    const isApiRequest = url.includes('/chat/completions') || url.includes('/models');
    const isToolRequest = options && options.body && options.body.includes('"tools":');
    
    if (isApiRequest) {
        HackaReDebug.log('API Request', `Fetch to ${url} [ID: ${requestId}]`, { 
            url, 
            method: options?.method || 'GET',
            headers: options?.headers
        });
        
        // Log request body if it exists
        if (options && options.body) {
            try {
                const body = JSON.parse(options.body);
                
                // Log the full request body in verbose mode
                if (HackaReDebug.logLevel === 'verbose') {
                    HackaReDebug.log('API Request Body', `Complete request body [ID: ${requestId}]`, body);
                } else {
                    // In normal mode, log a summary
                    const summary = {
                        model: body.model,
                        messageCount: body.messages?.length || 0,
                        stream: body.stream,
                        hasSystemPrompt: body.messages?.[0]?.role === 'system',
                        hasTools: !!body.tools
                    };
                    HackaReDebug.log('API Request Summary', `Request summary [ID: ${requestId}]`, summary);
                }
                
                // Always log tools in detail if they exist
                if (body.tools) {
                    HackaReDebug.log('Tools', `Tools included in request [ID: ${requestId}]`, body.tools);
                    
                    // Log tool_choice if specified
                    if (body.tool_choice) {
                        HackaReDebug.log('Tool Choice', `Tool choice setting [ID: ${requestId}]`, body.tool_choice);
                    }
                } else if (isToolRequest) {
                    HackaReDebug.warn('Tools', `Request appears to be tool-related but no tools found [ID: ${requestId}]`);
                }
            } catch (error) {
                HackaReDebug.error('API Request', `Error parsing request body [ID: ${requestId}]`, error);
            }
        }
    }
    
    // Call original fetch
    return originalFetch.apply(this, arguments)
        .then(response => {
            if (isApiRequest) {
                HackaReDebug.log('API Response', `Received response [ID: ${requestId}]`, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: Array.from(response.headers.entries())
                });
                
                // Clone the response to read its body without consuming it
                if (response.ok && HackaReDebug.logLevel === 'verbose') {
                    // For streaming responses, we can't easily log the full body
                    // But we can note that it's a streaming response
                    if (response.headers.get('content-type')?.includes('text/event-stream')) {
                        HackaReDebug.log('API Response', `Streaming response started [ID: ${requestId}]`);
                    }
                }
            }
            return response;
        })
        .catch(error => {
            if (isApiRequest) {
                HackaReDebug.error('API Response', `Fetch error [ID: ${requestId}]`, error);
            }
            throw error;
        });
};

// Override ApiToolsService methods to log tool operations
if (window.ApiToolsService) {
    // Override formatToolsForOpenAI to log tool formatting
    const originalFormatTools = ApiToolsService.formatToolsForOpenAI;
    ApiToolsService.formatToolsForOpenAI = function() {
        const tools = originalFormatTools.apply(this, arguments);
        HackaReDebug.log('Tools', 'Formatted tools for API request', tools);
        return tools;
    };
    
    // Override getApiTools to log tool retrieval
    const originalGetTools = ApiToolsService.getApiTools;
    ApiToolsService.getApiTools = function() {
        const tools = originalGetTools.apply(this, arguments);
        HackaReDebug.log('Tools', `Retrieved ${tools.length} API tools`, tools);
        return tools;
    };
    
    // Override init to log initialization
    const originalInit = ApiToolsService.init;
    ApiToolsService.init = function() {
        HackaReDebug.log('Tools', 'Initializing ApiToolsService');
        originalInit.apply(this, arguments);
        HackaReDebug.log('Tools', 'ApiToolsService initialized');
    };
    
    // Override addApiTool to log tool addition
    const originalAddTool = ApiToolsService.addApiTool;
    ApiToolsService.addApiTool = function(toolDefinition) {
        HackaReDebug.log('Tools', `Adding/updating tool: ${toolDefinition.name}`, toolDefinition);
        const result = originalAddTool.apply(this, arguments);
        if (result) {
            HackaReDebug.log('Tools', `Successfully added/updated tool: ${toolDefinition.name}`);
        } else {
            HackaReDebug.warn('Tools', `Failed to add/update tool: ${toolDefinition.name}`);
        }
        return result;
    };
    
    // Override removeApiTool to log tool removal
    const originalRemoveTool = ApiToolsService.removeApiTool;
    ApiToolsService.removeApiTool = function(toolName) {
        HackaReDebug.log('Tools', `Removing tool: ${toolName}`);
        const result = originalRemoveTool.apply(this, arguments);
        if (result) {
            HackaReDebug.log('Tools', `Successfully removed tool: ${toolName}`);
        } else {
            HackaReDebug.warn('Tools', `Failed to remove tool: ${toolName} (may not exist)`);
        }
        return result;
    };
    
    // Override processToolCalls to log tool execution
    const originalProcessToolCalls = ApiToolsService.processToolCalls;
    ApiToolsService.processToolCalls = async function(toolCalls, apiKey) {
        HackaReDebug.log('Tool Execution', `Processing ${toolCalls?.length || 0} tool calls`, toolCalls);
        
        try {
            const results = await originalProcessToolCalls.apply(this, arguments);
            HackaReDebug.log('Tool Execution', 'Tool call results', results);
            return results;
        } catch (error) {
            HackaReDebug.error('Tool Execution', 'Error processing tool calls', error);
            throw error;
        }
    };
    
    // Override executeToolCall to log individual tool execution
    const originalExecuteToolCall = ApiToolsService.executeToolCall;
    ApiToolsService.executeToolCall = async function(toolCall, apiKey) {
        const toolName = toolCall.function.name;
        let args = {};
        
        try {
            args = JSON.parse(toolCall.function.arguments);
        } catch (error) {
            HackaReDebug.error('Tool Execution', `Invalid arguments for tool "${toolName}"`, error);
        }
        
        HackaReDebug.log('Tool Execution', `Executing tool: ${toolName}`, {
            toolCallId: toolCall.id,
            arguments: args
        });
        
        try {
            const result = await originalExecuteToolCall.apply(this, arguments);
            HackaReDebug.log('Tool Execution', `Tool "${toolName}" execution result`, result);
            return result;
        } catch (error) {
            HackaReDebug.error('Tool Execution', `Error executing tool "${toolName}"`, error);
            throw error;
        }
    };
}

// Override ApiService methods to log API interactions
if (window.ApiService) {
    // Override generateChatCompletion to log chat generation
    const originalGenerate = ApiService.generateChatCompletion;
    ApiService.generateChatCompletion = function(apiKey, model, messages, signal, onChunk, systemPrompt, enableToolCalling) {
        const requestId = Math.random().toString(36).substring(2, 8);
        
        HackaReDebug.log('Chat Generation', `Starting chat completion [ID: ${requestId}]`, {
            model,
            messagesCount: messages.length,
            systemPrompt: systemPrompt ? 'provided' : 'not provided',
            enableToolCalling,
            toolsAvailable: window.ApiToolsService ? ApiToolsService.getApiTools().length : 0
        });
        
        // Log the full messages array in verbose mode
        if (HackaReDebug.logLevel === 'verbose') {
            HackaReDebug.log('Chat Messages', `Complete messages array [ID: ${requestId}]`, messages);
        }
        
        // Track generation time
        const startTime = Date.now();
        
        // Override onChunk to log streaming chunks
        const originalOnChunk = onChunk;
        let lastChunkTime = startTime;
        let totalTokens = 0;
        let chunkCount = 0;
        
        const wrappedOnChunk = function(content) {
            const now = Date.now();
            chunkCount++;
            
            // Estimate tokens (rough approximation)
            const newTokens = Math.ceil((content.length - totalTokens * 4) / 4);
            totalTokens = Math.ceil(content.length / 4);
            
            // Calculate tokens per second
            const elapsedSeconds = (now - startTime) / 1000;
            const tokensPerSecond = Math.round(totalTokens / elapsedSeconds);
            
            // Only log chunks in verbose mode or every 10 chunks in normal mode
            if (HackaReDebug.logLevel === 'verbose' || 
                (HackaReDebug.logLevel === 'normal' && chunkCount % 10 === 0)) {
                HackaReDebug.log('Streaming', `Chunk #${chunkCount} [ID: ${requestId}]`, {
                    contentLength: content.length,
                    estimatedTokens: totalTokens,
                    tokensPerSecond: tokensPerSecond,
                    timeSinceLastChunk: now - lastChunkTime
                });
            }
            
            lastChunkTime = now;
            
            // Call the original onChunk function
            if (originalOnChunk) {
                originalOnChunk(content);
            }
        };
        
        // Call the original function with our wrapped onChunk
        return originalGenerate.call(this, apiKey, model, messages, signal, wrappedOnChunk, systemPrompt, enableToolCalling)
            .then(result => {
                const endTime = Date.now();
                const duration = (endTime - startTime) / 1000;
                
                HackaReDebug.log('Chat Generation', `Completed chat generation [ID: ${requestId}]`, {
                    duration: `${duration.toFixed(2)}s`,
                    estimatedTokens: Math.ceil(result.length / 4),
                    tokensPerSecond: Math.round(Math.ceil(result.length / 4) / duration)
                });
                
                return result;
            })
            .catch(error => {
                HackaReDebug.error('Chat Generation', `Error in chat generation [ID: ${requestId}]`, error);
                throw error;
            });
    };
    
    // Override fetchAvailableModels to log model fetching
    const originalFetchModels = ApiService.fetchAvailableModels;
    ApiService.fetchAvailableModels = function(apiKey, customBaseUrl) {
        HackaReDebug.log('Models', 'Fetching available models', {
            customBaseUrl: customBaseUrl || 'default'
        });
        
        return originalFetchModels.apply(this, arguments)
            .then(models => {
                HackaReDebug.log('Models', `Fetched ${models.length} models`, models);
                return models;
            })
            .catch(error => {
                HackaReDebug.error('Models', 'Error fetching models', error);
                throw error;
            });
    };
    
    // Override modelSupportsToolCalling to log tool support checks
    const originalModelSupports = ApiService.modelSupportsToolCalling;
    ApiService.modelSupportsToolCalling = function(modelId) {
        const result = originalModelSupports.apply(this, arguments);
        HackaReDebug.log('Tools', `Checking if model supports tool calling: ${modelId}`, {
            supportsToolCalling: result
        });
        return result;
    };
}

// Add a debug panel to the UI
function addDebugPanel() {
    // Create the debug panel container
    const panel = document.createElement('div');
    panel.id = 'hacka-re-debug-panel';
    panel.style.position = 'fixed';
    panel.style.bottom = '10px';
    panel.style.right = '10px';
    panel.style.zIndex = '9999';
    panel.style.backgroundColor = '#f8f8f8';
    panel.style.border = '1px solid #ddd';
    panel.style.borderRadius = '8px';
    panel.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
    panel.style.padding = '10px';
    panel.style.width = '300px';
    panel.style.maxHeight = '400px';
    panel.style.overflowY = 'auto';
    panel.style.fontFamily = 'Arial, sans-serif';
    panel.style.fontSize = '14px';
    panel.style.transition = 'transform 0.3s ease';
    panel.style.transform = 'translateY(calc(100% - 40px))';
    
    // Add header
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '10px';
    header.style.cursor = 'pointer';
    
    const title = document.createElement('h3');
    title.textContent = 'Hacka.re Debug Tools';
    title.style.margin = '0';
    title.style.fontSize = '16px';
    title.style.fontWeight = 'bold';
    
    const toggleIcon = document.createElement('span');
    toggleIcon.innerHTML = '▲';
    toggleIcon.style.fontSize = '12px';
    
    header.appendChild(title);
    header.appendChild(toggleIcon);
    panel.appendChild(header);
    
    // Toggle panel expansion on header click
    let isExpanded = false;
    header.addEventListener('click', function() {
        isExpanded = !isExpanded;
        panel.style.transform = isExpanded ? 'translateY(0)' : 'translateY(calc(100% - 40px))';
        toggleIcon.innerHTML = isExpanded ? '▼' : '▲';
    });
    
    // Add content container
    const content = document.createElement('div');
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.gap = '10px';
    panel.appendChild(content);
    
    // Add tool inspection section
    const toolSection = document.createElement('div');
    toolSection.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 5px;">API Tools</div>
        <div style="display: flex; gap: 5px; margin-bottom: 5px;">
            <button id="debug-view-tools">View Tools</button>
            <button id="debug-test-tools">Test Tools</button>
        </div>
        <div id="debug-tools-output" style="background: #eee; padding: 5px; border-radius: 4px; font-size: 12px; max-height: 100px; overflow-y: auto;">No tools inspected yet</div>
    `;
    content.appendChild(toolSection);
    
    // Add log control section
    const logSection = document.createElement('div');
    logSection.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 5px;">Logging Options</div>
        <div style="display: flex; gap: 5px; margin-bottom: 5px;">
            <select id="debug-log-level">
                <option value="verbose">Verbose</option>
                <option value="normal" selected>Normal</option>
                <option value="minimal">Minimal</option>
            </select>
            <button id="debug-toggle-logging">Disable Logging</button>
            <button id="debug-clear-console">Clear Console</button>
        </div>
    `;
    content.appendChild(logSection);
    
    // Add localStorage inspection section
    const storageSection = document.createElement('div');
    storageSection.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 5px;">LocalStorage</div>
        <div style="display: flex; gap: 5px; margin-bottom: 5px;">
            <button id="debug-view-storage">View Storage</button>
            <button id="debug-clear-tools">Clear Tools</button>
        </div>
        <div id="debug-storage-output" style="background: #eee; padding: 5px; border-radius: 4px; font-size: 12px; max-height: 100px; overflow-y: auto;">No storage inspected yet</div>
    `;
    content.appendChild(storageSection);
    
    // Add the panel to the document
    document.body.appendChild(panel);
    
    // Add event listeners for buttons
    document.getElementById('debug-view-tools').addEventListener('click', function() {
        const output = document.getElementById('debug-tools-output');
        
        if (window.ApiToolsService) {
            const tools = ApiToolsService.getApiTools();
            output.textContent = tools.length > 0 
                ? `Found ${tools.length} tools. Check console for details.` 
                : 'No tools defined.';
            
            HackaReDebug.log('Debug Panel', 'Tools inspection requested', tools);
        } else {
            output.textContent = 'ApiToolsService not available';
            HackaReDebug.warn('Debug Panel', 'ApiToolsService not available');
        }
    });
    
    document.getElementById('debug-test-tools').addEventListener('click', function() {
        const output = document.getElementById('debug-tools-output');
        
        if (window.ApiToolsService) {
            const tools = ApiToolsService.getApiTools();
            
            if (tools.length > 0) {
                const formattedTools = ApiToolsService.formatToolsForOpenAI();
                output.textContent = `Formatted ${tools.length} tools for API. Check console for details.`;
                
                HackaReDebug.log('Debug Panel', 'Tool formatting test', {
                    rawTools: tools,
                    formattedTools: formattedTools
                });
                
                // Create a mock tool call for the first tool to test execution
                if (tools[0]) {
                    HackaReDebug.log('Debug Panel', 'Creating mock tool call for testing', {
                        tool: tools[0].name
                    });
                    
                    output.textContent += `\nCreated mock tool call for "${tools[0].name}". Check console.`;
                }
            } else {
                output.textContent = 'No tools defined to test.';
                HackaReDebug.warn('Debug Panel', 'No tools defined to test');
            }
        } else {
            output.textContent = 'ApiToolsService not available';
            HackaReDebug.warn('Debug Panel', 'ApiToolsService not available');
        }
    });
    
    document.getElementById('debug-toggle-logging').addEventListener('click', function() {
        const button = document.getElementById('debug-toggle-logging');
        const isEnabled = HackaReDebug.toggle();
        button.textContent = isEnabled ? 'Disable Logging' : 'Enable Logging';
    });
    
    document.getElementById('debug-log-level').addEventListener('change', function(e) {
        HackaReDebug.setLogLevel(e.target.value);
    });
    
    document.getElementById('debug-clear-console').addEventListener('click', function() {
        console.clear();
        HackaReDebug.log('Debug Panel', 'Console cleared');
    });
    
    document.getElementById('debug-view-storage').addEventListener('click', function() {
        const output = document.getElementById('debug-storage-output');
        const STORAGE_KEY = 'hacka_re_api_tools';
        
        const storedTools = localStorage.getItem(STORAGE_KEY);
        if (storedTools) {
            try {
                const tools = JSON.parse(storedTools);
                output.textContent = `Found ${tools.length} tools in localStorage. Check console for details.`;
                HackaReDebug.log('LocalStorage', 'Tools in localStorage', tools);
            } catch (error) {
                output.textContent = `Error parsing tools: ${error.message}`;
                HackaReDebug.error('LocalStorage', 'Error parsing tools from localStorage', error);
            }
        } else {
            output.textContent = 'No tools found in localStorage.';
            HackaReDebug.log('LocalStorage', 'No tools found in localStorage');
        }
    });
    
    document.getElementById('debug-clear-tools').addEventListener('click', function() {
        const output = document.getElementById('debug-storage-output');
        const STORAGE_KEY = 'hacka_re_api_tools';
        
        localStorage.removeItem(STORAGE_KEY);
        output.textContent = 'All API tools cleared from localStorage.';
        HackaReDebug.log('LocalStorage', 'All API tools cleared from localStorage');
        
        // Reinitialize ApiToolsService if it exists
        if (window.ApiToolsService) {
            ApiToolsService.init();
        }
    });
}

// Add the debug panel when the page loads
window.addEventListener('load', function() {
    HackaReDebug.log('Initialization', 'Debug Tool Calling script loaded');
    addDebugPanel();
    
    // Initialize ApiToolsService if it exists
    if (window.ApiToolsService) {
        HackaReDebug.log('Initialization', 'Manually initializing ApiToolsService');
        ApiToolsService.init();
    } else {
        HackaReDebug.warn('Initialization', 'ApiToolsService not available');
    }
    
    // Log browser information
    HackaReDebug.log('Environment', 'Browser information', {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        cookiesEnabled: navigator.cookieEnabled
    });
    
    // Check for console access
    try {
        console.log('Console access test');
        HackaReDebug.log('Environment', 'Console access confirmed');
    } catch (error) {
        // If we can't log, we can't show this message either, but we'll try
        alert('Console access is restricted. Debug logging may not work properly.');
    }
});

HackaReDebug.log('Initialization', 'Debug Tool Calling script injected');
