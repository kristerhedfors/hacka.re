# Model Context Protocol (MCP) Client for hacka.re

This implementation provides a client for the Model Context Protocol (MCP), allowing hacka.re to communicate with MCP servers that provide additional tools and resources to extend the capabilities of AI models. It integrates with the official Hugging Face JavaScript library to provide tools for interacting with Hugging Face models and APIs.

## What is MCP?

The Model Context Protocol (MCP) enables communication between AI systems and servers that provide additional tools and resources. In a typical implementation, MCP servers would run locally on the user's machine, providing access to various capabilities like file operations, API calls, or specialized tools.

Since hacka.re is a client-side application with no server-side components, this implementation uses "static" MCP servers that are defined entirely in the browser, simulating the functionality of real MCP servers.

## Implementation Overview

The MCP client implementation consists of the following components:

1. **Hugging Face JavaScript Library**: The official Hugging Face JavaScript library (`@huggingface/inference`) bundled for browser use.
2. **MCP Client Module (`mcp-client.js`)**: Implements the core functionality for communicating with MCP servers and processing tool calls.
3. **Static MCP Server Module (`mcp-client.js`)**: Provides a way to create "static" MCP servers that are defined entirely in the browser.
4. **Hugging Face MCP Server (`mcp-huggingface-server.js`)**: A sample implementation of a static MCP server that provides tools for interacting with Hugging Face models and APIs.
5. **MCP Integration with ApiToolsService**: Extends the existing ApiToolsService to work with MCP tools.
6. **Demo Page (`test-mcp-client.html`)**: A demonstration of the MCP client functionality.

## How to Use

### 1. Include the Required Files

Include the Hugging Face library, MCP client, and server files in your HTML:

```html
<!-- Core services -->
<script src="js/services/core-storage-service.js"></script>
<script src="js/services/namespace-service.js"></script>
<script src="js/services/api-tools-service.js"></script>
<!-- Hugging Face library -->
<script src="lib/huggingface/huggingface.min.js"></script>
<!-- MCP client -->
<script src="js/mcp-client.js"></script>
<script src="js/mcp-huggingface-server.js"></script>
```

The Hugging Face library is bundled from the official `@huggingface/inference` package using esbuild. The bundling process is defined in `build-huggingface.js` and creates a browser-compatible version of the library.

### 2. Enable Tool Calling

Enable tool calling in the settings (Settings > Experimental Features > Enable tool calling).

### 3. Initialize the MCP Client

In your chat, ask the AI to initialize the MCP client and connect to a server:

```
Please initialize the MCP client and connect to the huggingface server.
```

The AI will use the `mcp_init` tool to connect to the specified server:

```json
{
  "role": "assistant",
  "content": "I'll initialize the MCP client and connect to the Hugging Face server for you.",
  "tool_calls": [
    {
      "id": "call_abc123",
      "type": "function",
      "function": {
        "name": "mcp_init",
        "arguments": "{\"server\":\"huggingface\"}"
      }
    }
  ]
}
```

### 4. Use MCP Tools

Once the MCP client is initialized and connected to a server, you can use the tools provided by that server:

```
Translate "Hello, how are you?" to French using the Hugging Face translation tool.
```

The AI will use the appropriate MCP tool:

```json
{
  "role": "assistant",
  "content": "I'll translate that for you using the Hugging Face translation tool.",
  "tool_calls": [
    {
      "id": "call_def456",
      "type": "function",
      "function": {
        "name": "hf_translation",
        "arguments": "{\"text\":\"Hello, how are you?\",\"target_lang\":\"fr\"}"
      }
    }
  ]
}
```

## Available MCP Servers and Tools

### Hugging Face Server

The Hugging Face server provides tools for interacting with Hugging Face models and APIs:

#### hf_text_generation

Generate text using a Hugging Face text generation model.

**Parameters:**
- `model` (required): The model ID to use (e.g., "meta-llama/Llama-3.1-8B-Instruct")
- `prompt` (required): The prompt to generate text from
- `max_tokens`: Maximum number of tokens to generate
- `temperature`: Sampling temperature (0.0 to 2.0)
- `api_key`: Optional Hugging Face API key

#### hf_text_to_image

Generate an image from text using a Hugging Face diffusion model.

**Parameters:**
- `model` (required): The model ID to use (e.g., "stabilityai/stable-diffusion-xl-base-1.0")
- `prompt` (required): The text prompt describing the image to generate
- `negative_prompt`: Text describing what should not be in the image
- `width`: Width of the generated image
- `height`: Height of the generated image
- `api_key`: Optional Hugging Face API key

#### hf_translation

Translate text from one language to another using a Hugging Face translation model.

**Parameters:**
- `model`: The model ID to use (e.g., "Helsinki-NLP/opus-mt-en-fr")
- `text` (required): The text to translate
- `source_lang`: The source language code (e.g., "en" for English)
- `target_lang` (required): The target language code (e.g., "fr" for French)
- `api_key`: Optional Hugging Face API key

#### mcp_translate

This is an alias for `hf_translation` that provides compatibility with different tool calling formats that the AI model might use.

**Parameters:**
- `server`: The server URL or model ID to use (e.g., "https://api-inference.huggingface.co/models/Helsinki-NLP/opus-mt-en-fr")
- `inputs`: The input text to translate (can be an object with a `text` property or a string)
- `target_lang`: The target language code (e.g., "fr" for French)
- `api_key`: Optional Hugging Face API key

## Creating Custom Static MCP Servers

You can create your own static MCP servers to provide additional tools. Here's an example:

```javascript
// Create a custom MCP server
const myServer = StaticMcpServer.createStaticServer(
    'my-server',
    'My custom MCP server'
);

// Add a tool to the server
StaticMcpServer.addTool(
    myServer,
    'my_custom_tool',
    'Description of my custom tool',
    {
        type: 'object',
        properties: {
            param1: {
                type: 'string',
                description: 'Description of parameter 1'
            },
            param2: {
                type: 'number',
                description: 'Description of parameter 2'
            }
        },
        required: ['param1']
    },
    async function(args) {
        const { param1, param2 = 0 } = args;
        
        // Implement your tool's functionality here
        
        return {
            result: `Processed ${param1} with value ${param2}`
        };
    }
);

// Register the server in the global registry
window.MCP_SERVER_REGISTRY['my-server'] = myServer;
```

## Technical Details

### MCP Client Module

The MCP client module provides the following functionality:

- `createMcpClient()`: Creates a new MCP client instance
- `connectToStaticServer(serverDefinition)`: Connects to a static MCP server
- `processToolCall(toolCall)`: Processes a single tool call
- `processToolCalls(toolCalls)`: Processes multiple tool calls
- `getAvailableTools()`: Gets all available tools from connected servers
- `getConnectedServers()`: Gets all connected servers
- `cleanup()`: Cleans up resources

### Static MCP Server Module

The static MCP server module provides the following functionality:

- `createStaticServer(name, description)`: Creates a new static MCP server
- `addTool(server, name, description, inputSchema, handler)`: Adds a tool to a static server

### MCP Integration with ApiToolsService

The MCP integration with ApiToolsService extends the existing ApiToolsService to work with MCP tools:

- Overrides `getToolDefinitions()` to include MCP tools
- Overrides `processToolCalls()` to handle MCP tool calls
- Registers the `mcp_init` tool for initializing the MCP client and connecting to servers

## Limitations

This implementation has the following limitations:

1. **Static Servers Only**: Since hacka.re is a client-side application, this implementation only supports "static" MCP servers that are defined entirely in the browser. It does not support connecting to real MCP servers running locally on the user's machine.

2. **CORS Limitations**: Due to Cross-Origin Resource Sharing (CORS) restrictions in browsers, the implementation cannot make direct API calls to the Hugging Face API from the browser. In a production environment, this would require a proxy server or proper CORS headers on the API server.

3. **Mock Implementations**: The tools provided by the Hugging Face server are mock implementations that simulate the functionality of real Hugging Face models and APIs. In a real implementation with proper CORS setup, these tools would make actual API calls to Hugging Face.

4. **Limited Tool Set**: This implementation only provides a limited set of tools. In a real MCP implementation, there would be many more tools available.

## Demo

A demonstration of the MCP client functionality is available in the `test-mcp-client.html` file. This page shows how to use the MCP client and provides examples of the available tools.

## Future Enhancements

Possible future enhancements to this implementation include:

1. **Real API Calls**: Implement real API calls to Hugging Face models and APIs instead of mock implementations.

2. **More Tools**: Add more tools to the Hugging Face server and create additional servers for other services.

3. **WebSocket Support**: Add support for connecting to real MCP servers running locally on the user's machine via WebSockets.

4. **Tool Streaming**: Implement streaming support for tool calls, allowing for real-time updates during tool execution.

5. **Tool Call UI**: Add a UI for displaying tool calls and their results in the chat interface.
