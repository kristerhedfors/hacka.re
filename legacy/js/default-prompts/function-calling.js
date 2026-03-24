/**
 * Function Calling (Experimental) Default Prompt
 */

window.FunctionCallingPrompt = {
    id: 'function-calling',
    name: 'Function calling (experimental)',
    content: `# Function Calling in hacka.re (Experimental)

hacka.re implements OpenAI-compatible function calling that allows AI models to use tools to perform actions or retrieve information. This feature enables the AI to call JavaScript functions that you define, expanding its capabilities beyond just generating text.

## How Function Calling Works in hacka.re

Function calling in hacka.re is implemented as a client-side feature that follows these steps:

1. **Tool Definition**: You define tools with their parameters and descriptions
2. **API Request**: When sending a message, tool definitions are included in the API request
3. **Tool Selection**: The AI model decides when to use a tool and which one to use
4. **Tool Execution**: The selected tool is executed in your browser with the parameters provided by the AI
5. **Follow-up Response**: The tool's result is sent back to the AI, which then generates a final response

## Key Components and Files

The function calling implementation spans several files:

- **js/services/api-tools-service.js**: Core service that manages tool registration, execution, and storage
- **js/components/api-tools-manager.js**: UI component that adds tool calling settings to the interface
- **js/services/api-service.js**: Handles API communication including tool calls and responses
- **add-sample-tool.js**: Example file showing how to create and register custom tools
- **test-tool-calling.html**: Test page with documentation and examples

## Enabling Function Calling

To use function calling:

1. Open Settings (gear icon)
2. Under "Experimental Features", check "Enable tool calling (experimental)"
3. Save settings

Once enabled, the AI can use any registered tools when appropriate based on your prompts.

## Built-in Tools

hacka.re comes with a simple built-in tool:

- **math_addition_tool**: Adds two numbers together (primarily for demonstration purposes)

## Creating Custom Tools

You can create your own tools by following this pattern:

\`\`\`javascript
// Register a tool with ApiToolsService
ApiToolsService.registerTool(
    "your_tool_name",                // Tool name (must match the function.name in definition)
    {
        type: "function",            // Always "function" for OpenAI compatibility
        function: {
            name: "your_tool_name",  // Must match the tool name above
            description: "Description of what your tool does",
            parameters: {
                type: "object",      // Always "object" for OpenAI compatibility
                properties: {
                    // Define your parameters here
                    param1: {
                        type: "string",
                        description: "Description of parameter 1"
                    },
                    param2: {
                        type: "number",
                        description: "Description of parameter 2"
                    }
                },
                required: ["param1"] // List required parameters
            }
        }
    },
    async function(args) {
        // Implement your tool's functionality here
        const { param1, param2 } = args;
        
        // Process the parameters and return a result
        return {
            result: "Processed " + param1 + " and " + param2
        };
    }
);
\`\`\`

## Example: Weather Tool Implementation

Here's a complete example of a weather tool from add-sample-tool.js:

\`\`\`javascript
ApiToolsService.registerTool(
    "get_weather_tool",
    {
        type: "function",
        function: {
            name: "get_weather_tool",
            description: "Get the current weather for a location",
            parameters: {
                type: "object",
                properties: {
                    location: {
                        type: "string",
                        description: "The city and state/country, e.g. 'San Francisco, CA' or 'Paris, France'"
                    },
                    unit: {
                        type: "string",
                        enum: ["celsius", "fahrenheit"],
                        description: "The unit of temperature to use (celsius or fahrenheit)"
                    }
                },
                required: ["location"]
            }
        }
    },
    async function(args) {
        const { location, unit = "celsius" } = args;
        
        // This is a mock implementation - in a real tool, you would call a weather API
        console.log("Getting weather for " + location + " in " + unit);
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Return mock weather data
        return {
            location: location,
            temperature: unit === "celsius" ? 22 : 72,
            unit: unit,
            condition: "Sunny",
            humidity: 65,
            wind_speed: 10,
            wind_direction: "NW",
            last_updated: new Date().toISOString()
        };
    }
);
\`\`\`

## Adding Tools to Your Project

To add tools to your hacka.re instance:

1. Create a JavaScript file with your tool definitions (e.g., my-tools.js)
2. Include the file in your HTML after api-tools-service.js:

\`\`\`html
<script src="js/services/api-tools-service.js"></script>
<script src="my-tools.js"></script>
\`\`\`

3. Make sure your tool registration code runs after the DOM is loaded:

\`\`\`javascript
document.addEventListener('DOMContentLoaded', function() {
    // Your tool registration code here
});
\`\`\`

## How Tool Calling Works Under the Hood

When a message is sent with tool calling enabled:

1. **ApiToolsManager.getToolDefinitions()** retrieves all registered tool definitions
2. **ApiService.generateChatCompletion()** includes these definitions in the API request
3. If the AI decides to use a tool, it returns a tool_calls array in the response
4. **ApiService** detects these tool calls and processes them with **ApiToolsManager.processToolCalls()**
5. **ApiToolsService.executeToolCall()** executes each tool with the provided arguments
6. The results are sent back to the AI in a follow-up request
7. The AI generates a final response incorporating the tool results

The implementation in api-service.js handles streaming responses and properly formats tool calls and results according to the OpenAI API specification.

## Best Practices for Creating Tools

1. **Clear Descriptions**: Provide clear descriptions for your tools and parameters
2. **Error Handling**: Implement robust error handling in your tool functions
3. **Async Support**: Use async/await for asynchronous operations
4. **Parameter Validation**: Validate parameters before using them
5. **Security Considerations**: Be cautious about what your tools can do, especially if they interact with external services
6. **Privacy**: Avoid tools that send sensitive data to external services
7. **Performance**: Keep tools lightweight and fast to maintain a responsive experience

## Testing Your Tools

You can test your tools by:

1. Enabling tool calling in settings
2. Asking the AI to use your tool in a conversation
3. Checking the browser console for any errors or logs

Example prompts to test tools:

- "Can you use the math_addition_tool to add 42 and 58?"
- "What's the weather like in Paris? Use the get_weather_tool."
- "Please use [your_tool_name] to [perform specific action]."

## Limitations

- Not all models support function calling
- The implementation is experimental and may change
- Complex tools may require careful parameter design
- Tools run in the browser context and are subject to browser security restrictions

## Future Enhancements

The hacka.re team is working on enhancing the function calling feature with:

- Better UI for managing and monitoring tools
- More built-in tools for common tasks
- Improved error handling and debugging
- Support for more complex parameter types
- Tool execution history and logging`
};
