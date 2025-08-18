#!/usr/bin/env python3
"""
Shodan MCP Server

A Model Context Protocol server that provides access to Shodan's API for IP address intelligence.
Currently implements host lookup functionality.
"""

import asyncio
import json
import logging
from typing import Any, Sequence
import httpx
from mcp.server.models import InitializationOptions
from mcp.server import NotificationOptions, Server
from mcp.server.stdio import stdio_server
from mcp.types import (
    CallToolRequest,
    CallToolResult,
    ListToolsRequest,
    TextContent,
    Tool,
)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("shodan-mcp-server")

# Initialize the MCP server
server = Server("shodan-mcp-server")

# Shodan API configuration
SHODAN_API_BASE = "https://api.shodan.io"

@server.list_tools()
async def handle_list_tools() -> list[Tool]:
    """
    List available tools.
    Each tool specifies its arguments using JSON Schema validation.
    """
    return [
        Tool(
            name="shodan_host_lookup",
            description="Look up information about an IP address using Shodan",
            inputSchema={
                "type": "object",
                "properties": {
                    "ip": {
                        "type": "string",
                        "description": "The IP address to look up (e.g., '8.8.8.8')",
                    },
                    "api_key": {
                        "type": "string", 
                        "description": "Shodan API key for authentication",
                    },
                },
                "required": ["ip", "api_key"],
            },
        ),
    ]

@server.call_tool()
async def handle_call_tool(name: str, arguments: dict | None) -> list[TextContent]:
    """
    Handle tool execution requests.
    Tools can modify server state and notify clients of changes.
    """
    if name == "shodan_host_lookup":
        return await shodan_host_lookup(arguments or {})
    else:
        raise ValueError(f"Unknown tool: {name}")

async def shodan_host_lookup(arguments: dict[str, Any]) -> list[TextContent]:
    """Look up information about an IP address using Shodan API"""
    try:
        ip = arguments.get("ip")
        api_key = arguments.get("api_key")
        
        if not ip:
            return [TextContent(type="text", text="Error: IP address is required")]
        
        if not api_key:
            return [TextContent(type="text", text="Error: Shodan API key is required")]
        
        # Make request to Shodan API
        url = f"{SHODAN_API_BASE}/shodan/host/{ip}"
        params = {"key": api_key}
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params)
            
            if response.status_code == 200:
                data = response.json()
                
                # Format the response nicely
                result = f"# Shodan Host Information for {ip}\n\n"
                
                # Basic information
                if "org" in data:
                    result += f"**Organization:** {data['org']}\n"
                if "isp" in data:
                    result += f"**ISP:** {data['isp']}\n"
                if "country_name" in data:
                    result += f"**Country:** {data['country_name']}\n"
                if "city" in data:
                    result += f"**City:** {data['city']}\n"
                if "region_code" in data:
                    result += f"**Region:** {data['region_code']}\n"
                
                # Operating system
                if "os" in data and data["os"]:
                    result += f"**Operating System:** {data['os']}\n"
                
                # Open ports and services
                if "data" in data and data["data"]:
                    result += f"\n## Open Ports and Services\n\n"
                    for service in data["data"][:10]:  # Limit to first 10 services
                        port = service.get("port", "Unknown")
                        product = service.get("product", "Unknown service")
                        version = service.get("version", "")
                        banner = service.get("data", "").strip()
                        
                        result += f"**Port {port}:** {product}"
                        if version:
                            result += f" {version}"
                        result += "\n"
                        
                        if banner and len(banner) < 200:  # Only show short banners
                            result += f"```\n{banner[:200]}\n```\n"
                        result += "\n"
                
                # Vulnerabilities
                if "vulns" in data and data["vulns"]:
                    result += f"## Vulnerabilities\n\n"
                    for vuln in list(data["vulns"])[:5]:  # Limit to first 5 CVEs
                        result += f"- {vuln}\n"
                
                # Last update
                if "last_update" in data:
                    result += f"\n**Last Updated:** {data['last_update']}\n"
                
                return [TextContent(type="text", text=result)]
                
            elif response.status_code == 401:
                return [TextContent(type="text", text="Error: Invalid Shodan API key")]
            elif response.status_code == 404:
                return [TextContent(type="text", text=f"Error: No information found for IP {ip}")]
            else:
                return [TextContent(type="text", text=f"Error: Shodan API returned status {response.status_code}: {response.text}")]
                
    except httpx.RequestError as e:
        return [TextContent(type="text", text=f"Error: Network request failed: {str(e)}")]
    except json.JSONDecodeError:
        return [TextContent(type="text", text="Error: Invalid JSON response from Shodan API")]
    except Exception as e:
        logger.error(f"Unexpected error in shodan_host_lookup: {e}")
        return [TextContent(type="text", text=f"Error: {str(e)}")]

async def main():
    # Run the server using stdin/stdout streams
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="shodan-mcp-server",
                server_version="0.1.0",
                capabilities=server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                ),
            ),
        )

if __name__ == "__main__":
    asyncio.run(main())