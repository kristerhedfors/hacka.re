/**
 * Model Context Protocol SDK README Default Prompt
 */

window.McpSdkReadmePrompt = {
    id: 'mcp-sdk-readme',
    name: 'Model Context Protocol SDK README',
    content: `# Model Context Protocol (MCP) Python SDK

The Model Context Protocol (MCP) is a standardized protocol for communication between AI assistants and external tools or resources. This SDK provides a Python implementation for creating MCP servers that can extend the capabilities of AI assistants.

## Overview

The MCP Python SDK allows developers to create servers that provide:

1. **Tools**: Functions that AI assistants can call to perform actions
2. **Resources**: Data sources that AI assistants can access for context

These servers can be connected to compatible AI assistants, enabling them to access external functionality and information.

## Installation

Install the MCP Python SDK using pip:

\`\`\`bash
pip install mcp-sdk
\`\`\`

## Creating an MCP Server

Here's a simple example of creating an MCP server with a tool:

\`\`\`python
from mcp_sdk import MCPServer, Tool, Resource

# Create a new MCP server
server = MCPServer(name="weather-server")

# Define a tool
@server.tool
def get_weather(city: str, country: str = None):
    """Get the current weather for a location.
    
    Args:
        city: The name of the city
        country: The country code (optional)
    
    Returns:
        A dictionary containing weather information
    """
    # In a real implementation, you would call a weather API here
    return {
        "temperature": 22,
        "condition": "Sunny",
        "humidity": 65,
        "location": f"{city}, {country}" if country else city
    }

# Define a resource
@server.resource(uri="/weather/forecast/{city}")
def weather_forecast(city: str):
    """Get the weather forecast for a city."""
    # In a real implementation, you would call a weather API here
    return {
        "forecast": [
            {"day": "Today", "temperature": 22, "condition": "Sunny"},
            {"day": "Tomorrow", "temperature": 20, "condition": "Partly Cloudy"},
            {"day": "Day after", "temperature": 18, "condition": "Rainy"}
        ],
        "location": city
    }

# Start the server
if __name__ == "__main__":
    server.run(host="localhost", port=8000)
\`\`\`

## Connecting to AI Assistants

Once your MCP server is running, it can be connected to compatible AI assistants. The connection process varies depending on the assistant platform, but typically involves:

1. Registering the server URL with the assistant
2. Authenticating the connection (if required)
3. Granting the assistant permission to use the server's tools and resources

## Tool Definition

Tools are defined using Python functions with type annotations. The SDK automatically generates JSON Schema definitions for the tool parameters based on these annotations.

\`\`\`python
@server.tool
def search_database(query: str, limit: int = 10, offset: int = 0):
    """Search the database for records matching the query.
    
    Args:
        query: The search query
        limit: Maximum number of results to return
        offset: Number of results to skip
    
    Returns:
        A list of matching records
    """
    # Implementation here
    pass
\`\`\`

## Resource Definition

Resources are data sources that can be accessed by URI. They can be static files, database records, or dynamically generated content.

\`\`\`python
@server.resource(uri="/documents/{document_id}")
def get_document(document_id: str):
    """Get a document by ID."""
    # Implementation here
    pass
\`\`\`

## Authentication

The SDK supports various authentication methods to secure your MCP server:

\`\`\`python
from mcp_sdk.auth import APIKeyAuth

# Create an authentication provider
auth = APIKeyAuth(api_key="your-secret-key")

# Create a server with authentication
server = MCPServer(name="secure-server", auth=auth)
\`\`\`

## Error Handling

The SDK provides mechanisms for handling errors and returning appropriate responses:

\`\`\`python
from mcp_sdk.errors import MCPError

@server.tool
def risky_operation(input: str):
    try:
        # Implementation that might fail
        result = process_input(input)
        return result
    except Exception as e:
        # Convert to MCP error
        raise MCPError(f"Operation failed: {str(e)}")
\`\`\`

## Logging and Monitoring

The SDK includes built-in logging and monitoring capabilities:

\`\`\`python
import logging
from mcp_sdk.logging import configure_logging

# Configure logging
configure_logging(level=logging.INFO)

# The server will now log all requests and responses
server = MCPServer(name="logged-server")
\`\`\`

## Advanced Features

### Streaming Responses

Tools can return streaming responses for long-running operations:

\`\`\`python
@server.tool(streaming=True)
def generate_report(data: dict):
    """Generate a report from data, streaming the results."""
    yield "Starting report generation..."
    # Process data and yield results incrementally
    yield "Processing data..."
    yield "Generating charts..."
    yield "Report complete!"
\`\`\`

### Middleware

You can add middleware to process requests and responses:

\`\`\`python
@server.middleware
async def timing_middleware(request, call_next):
    import time
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    print(f"Request processed in {duration:.2f} seconds")
    return response
\`\`\`

## Best Practices

1. **Clear Documentation**: Provide clear descriptions for all tools and resources
2. **Input Validation**: Validate inputs thoroughly to prevent errors
3. **Error Handling**: Return informative error messages
4. **Security**: Implement appropriate authentication and authorization
5. **Performance**: Optimize for quick response times
6. **Monitoring**: Log usage and monitor performance

## Contributing

Contributions to the MCP SDK are welcome! Please see the contributing guidelines for more information.

## License

The MCP SDK is licensed under the MIT License.`
};
