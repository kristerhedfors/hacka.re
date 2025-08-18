#!/usr/bin/env python3
"""
Comprehensive Shodan MCP Server

A Model Context Protocol server that provides complete access to Shodan's REST API.
Implements all major API categories: Search, Scanning, Alerts, DNS, and Account utilities.

Based on Shodan OpenAPI specification: https://developer.shodan.io/api/openapi.json
"""

import asyncio
import json
import logging
from typing import Any, Sequence, Optional, Dict, List
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
logger = logging.getLogger("shodan-comprehensive-mcp-server")

# Initialize the MCP server
server = Server("shodan-comprehensive-mcp-server")

# Shodan API configuration
SHODAN_API_BASE = "https://api.shodan.io"

@server.list_tools()
async def handle_list_tools() -> list[Tool]:
    """
    List available tools covering all Shodan API categories.
    """
    return [
        # Search Methods
        Tool(
            name="shodan_host_info",
            description="Get detailed information about an IP address including services, vulnerabilities, and location",
            inputSchema={
                "type": "object",
                "properties": {
                    "ip": {"type": "string", "description": "The IP address to look up"},
                    "history": {"type": "boolean", "description": "Show historical banners", "default": False},
                    "minify": {"type": "boolean", "description": "Minify banner and remove metadata", "default": False},
                    "api_key": {"type": "string", "description": "Shodan API key"}
                },
                "required": ["ip", "api_key"]
            }
        ),
        Tool(
            name="shodan_search",
            description="Search Shodan database using filters and search queries",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query (e.g., 'apache', 'port:80', 'country:US')"},
                    "facets": {"type": "string", "description": "Comma-separated list of facets (e.g., 'country,port,org')"},
                    "page": {"type": "integer", "description": "Page number (1-indexed)", "default": 1},
                    "minify": {"type": "boolean", "description": "Minify results", "default": False},
                    "api_key": {"type": "string", "description": "Shodan API key"}
                },
                "required": ["query", "api_key"]
            }
        ),
        Tool(
            name="shodan_search_count",
            description="Get the number of results for a search query without returning actual results",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"},
                    "facets": {"type": "string", "description": "Comma-separated list of facets"},
                    "api_key": {"type": "string", "description": "Shodan API key"}
                },
                "required": ["query", "api_key"]
            }
        ),
        Tool(
            name="shodan_search_facets",
            description="List available search facets that can be used in queries",
            inputSchema={
                "type": "object",
                "properties": {
                    "api_key": {"type": "string", "description": "Shodan API key"}
                },
                "required": ["api_key"]
            }
        ),
        Tool(
            name="shodan_search_filters",
            description="List available search filters and their descriptions",
            inputSchema={
                "type": "object",
                "properties": {
                    "api_key": {"type": "string", "description": "Shodan API key"}
                },
                "required": ["api_key"]
            }
        ),
        Tool(
            name="shodan_search_tokens",
            description="Break down a search query into tokens and show how Shodan parses it",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query to tokenize"},
                    "api_key": {"type": "string", "description": "Shodan API key"}
                },
                "required": ["query", "api_key"]
            }
        ),
        
        # On-Demand Scanning
        Tool(
            name="shodan_scan",
            description="Request Shodan to crawl network blocks or IP addresses",
            inputSchema={
                "type": "object",
                "properties": {
                    "ips": {"type": "string", "description": "Comma-separated list of IPs to scan"},
                    "force": {"type": "boolean", "description": "Force re-scan of IP addresses", "default": False},
                    "api_key": {"type": "string", "description": "Shodan API key"}
                },
                "required": ["ips", "api_key"]
            }
        ),
        Tool(
            name="shodan_scan_internet",
            description="Request Shodan to crawl the Internet for specific ports",
            inputSchema={
                "type": "object",
                "properties": {
                    "port": {"type": "integer", "description": "Port number to scan"},
                    "protocol": {"type": "string", "description": "Protocol (tcp/udp)", "default": "tcp"},
                    "api_key": {"type": "string", "description": "Shodan API key"}
                },
                "required": ["port", "api_key"]
            }
        ),
        Tool(
            name="shodan_scan_protocols",
            description="List protocols that Shodan crawls",
            inputSchema={
                "type": "object",
                "properties": {
                    "api_key": {"type": "string", "description": "Shodan API key"}
                },
                "required": ["api_key"]
            }
        ),
        Tool(
            name="shodan_scan_status",
            description="Check the status of submitted scans",
            inputSchema={
                "type": "object",
                "properties": {
                    "scan_id": {"type": "string", "description": "Scan ID returned from scan request"},
                    "api_key": {"type": "string", "description": "Shodan API key"}
                },
                "required": ["scan_id", "api_key"]
            }
        ),
        
        # Network Alerts
        Tool(
            name="shodan_alert_list",
            description="List all network alerts for the account",
            inputSchema={
                "type": "object",
                "properties": {
                    "api_key": {"type": "string", "description": "Shodan API key"}
                },
                "required": ["api_key"]
            }
        ),
        Tool(
            name="shodan_alert_create",
            description="Create a network alert to monitor IPs/networks",
            inputSchema={
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Alert name"},
                    "filters": {"type": "object", "description": "Alert filters and triggers"},
                    "api_key": {"type": "string", "description": "Shodan API key"}
                },
                "required": ["name", "api_key"]
            }
        ),
        Tool(
            name="shodan_alert_info",
            description="Get information about a specific alert",
            inputSchema={
                "type": "object",
                "properties": {
                    "alert_id": {"type": "string", "description": "Alert ID"},
                    "api_key": {"type": "string", "description": "Shodan API key"}
                },
                "required": ["alert_id", "api_key"]
            }
        ),
        Tool(
            name="shodan_alert_delete",
            description="Delete a network alert",
            inputSchema={
                "type": "object",
                "properties": {
                    "alert_id": {"type": "string", "description": "Alert ID to delete"},
                    "api_key": {"type": "string", "description": "Shodan API key"}
                },
                "required": ["alert_id", "api_key"]
            }
        ),
        
        # DNS Methods
        Tool(
            name="shodan_dns_domain",
            description="Get information about a domain including subdomains and DNS records",
            inputSchema={
                "type": "object",
                "properties": {
                    "domain": {"type": "string", "description": "Domain name (e.g., 'google.com')"},
                    "history": {"type": "boolean", "description": "Include historical DNS data", "default": False},
                    "type": {"type": "string", "description": "DNS record type filter", "enum": ["A", "AAAA", "CNAME", "NS", "MX", "TXT"]},
                    "page": {"type": "integer", "description": "Page number", "default": 1},
                    "api_key": {"type": "string", "description": "Shodan API key"}
                },
                "required": ["domain", "api_key"]
            }
        ),
        Tool(
            name="shodan_dns_resolve",
            description="Resolve hostnames to IP addresses",
            inputSchema={
                "type": "object",
                "properties": {
                    "hostnames": {"type": "string", "description": "Comma-separated list of hostnames"},
                    "api_key": {"type": "string", "description": "Shodan API key"}
                },
                "required": ["hostnames", "api_key"]
            }
        ),
        Tool(
            name="shodan_dns_reverse",
            description="Resolve IP addresses to hostnames",
            inputSchema={
                "type": "object",
                "properties": {
                    "ips": {"type": "string", "description": "Comma-separated list of IP addresses"},
                    "api_key": {"type": "string", "description": "Shodan API key"}
                },
                "required": ["ips", "api_key"]
            }
        ),
        
        # Account and Utility Methods
        Tool(
            name="shodan_account_profile",
            description="Get account profile information including credits and plan details",
            inputSchema={
                "type": "object",
                "properties": {
                    "api_key": {"type": "string", "description": "Shodan API key"}
                },
                "required": ["api_key"]
            }
        ),
        Tool(
            name="shodan_api_info",
            description="Get API plan information and usage statistics",
            inputSchema={
                "type": "object",
                "properties": {
                    "api_key": {"type": "string", "description": "Shodan API key"}
                },
                "required": ["api_key"]
            }
        ),
        Tool(
            name="shodan_tools_httpheaders",
            description="Get HTTP headers sent by your client",
            inputSchema={
                "type": "object",
                "properties": {
                    "api_key": {"type": "string", "description": "Shodan API key"}
                },
                "required": ["api_key"]
            }
        ),
        Tool(
            name="shodan_tools_myip",
            description="Get your external IP address as seen by Shodan",
            inputSchema={
                "type": "object",
                "properties": {
                    "api_key": {"type": "string", "description": "Shodan API key"}
                },
                "required": ["api_key"]
            }
        ),
        
        # Honeypot and Enterprise Methods
        Tool(
            name="shodan_labs_honeyscore",
            description="Calculate the probability that an IP is a honeypot (0.0-1.0)",
            inputSchema={
                "type": "object",
                "properties": {
                    "ip": {"type": "string", "description": "IP address to check"},
                    "api_key": {"type": "string", "description": "Shodan API key"}
                },
                "required": ["ip", "api_key"]
            }
        ),
        Tool(
            name="shodan_org_list",
            description="List organizations associated with the account (Enterprise)",
            inputSchema={
                "type": "object",
                "properties": {
                    "api_key": {"type": "string", "description": "Shodan API key"}
                },
                "required": ["api_key"]
            }
        ),
        Tool(
            name="shodan_org_info",
            description="Get organization information (Enterprise)",
            inputSchema={
                "type": "object",
                "properties": {
                    "org_id": {"type": "string", "description": "Organization ID"},
                    "api_key": {"type": "string", "description": "Shodan API key"}
                },
                "required": ["org_id", "api_key"]
            }
        )
    ]

@server.call_tool()
async def handle_call_tool(name: str, arguments: dict | None) -> list[TextContent]:
    """Handle tool execution requests."""
    if not arguments:
        return [TextContent(type="text", text="Error: No arguments provided")]
    
    api_key = arguments.get("api_key")
    if not api_key:
        return [TextContent(type="text", text="Error: Shodan API key is required")]
    
    try:
        # Route to appropriate handler
        if name.startswith("shodan_"):
            return await execute_shodan_tool(name, arguments)
        else:
            return [TextContent(type="text", text=f"Error: Unknown tool: {name}")]
    except Exception as e:
        logger.error(f"Error executing tool {name}: {e}")
        return [TextContent(type="text", text=f"Error: {str(e)}")]

async def execute_shodan_tool(tool_name: str, args: dict) -> list[TextContent]:
    """Execute Shodan API tools."""
    api_key = args["api_key"]
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            if tool_name == "shodan_host_info":
                return await handle_host_info(client, args, api_key)
            elif tool_name == "shodan_search":
                return await handle_search(client, args, api_key)
            elif tool_name == "shodan_search_count":
                return await handle_search_count(client, args, api_key)
            elif tool_name == "shodan_search_facets":
                return await handle_search_facets(client, args, api_key)
            elif tool_name == "shodan_search_filters":
                return await handle_search_filters(client, args, api_key)
            elif tool_name == "shodan_search_tokens":
                return await handle_search_tokens(client, args, api_key)
            elif tool_name == "shodan_scan":
                return await handle_scan(client, args, api_key)
            elif tool_name == "shodan_scan_internet":
                return await handle_scan_internet(client, args, api_key)
            elif tool_name == "shodan_scan_protocols":
                return await handle_scan_protocols(client, args, api_key)
            elif tool_name == "shodan_scan_status":
                return await handle_scan_status(client, args, api_key)
            elif tool_name == "shodan_alert_list":
                return await handle_alert_list(client, args, api_key)
            elif tool_name == "shodan_alert_create":
                return await handle_alert_create(client, args, api_key)
            elif tool_name == "shodan_alert_info":
                return await handle_alert_info(client, args, api_key)
            elif tool_name == "shodan_alert_delete":
                return await handle_alert_delete(client, args, api_key)
            elif tool_name == "shodan_dns_domain":
                return await handle_dns_domain(client, args, api_key)
            elif tool_name == "shodan_dns_resolve":
                return await handle_dns_resolve(client, args, api_key)
            elif tool_name == "shodan_dns_reverse":
                return await handle_dns_reverse(client, args, api_key)
            elif tool_name == "shodan_account_profile":
                return await handle_account_profile(client, args, api_key)
            elif tool_name == "shodan_api_info":
                return await handle_api_info(client, args, api_key)
            elif tool_name == "shodan_tools_httpheaders":
                return await handle_tools_httpheaders(client, args, api_key)
            elif tool_name == "shodan_tools_myip":
                return await handle_tools_myip(client, args, api_key)
            elif tool_name == "shodan_labs_honeyscore":
                return await handle_labs_honeyscore(client, args, api_key)
            elif tool_name == "shodan_org_list":
                return await handle_org_list(client, args, api_key)
            elif tool_name == "shodan_org_info":
                return await handle_org_info(client, args, api_key)
            else:
                return [TextContent(type="text", text=f"Error: Unknown Shodan tool: {tool_name}")]
                
    except httpx.RequestError as e:
        return [TextContent(type="text", text=f"Error: Network request failed: {str(e)}")]
    except Exception as e:
        logger.error(f"Unexpected error in {tool_name}: {e}")
        return [TextContent(type="text", text=f"Error: {str(e)}")]

# Search Methods
async def handle_host_info(client: httpx.AsyncClient, args: dict, api_key: str) -> list[TextContent]:
    """Get host information."""
    ip = args["ip"]
    params = {"key": api_key}
    
    if args.get("history"):
        params["history"] = "true"
    if args.get("minify"):
        params["minify"] = "true"
    
    response = await client.get(f"{SHODAN_API_BASE}/shodan/host/{ip}", params=params)
    return await format_response(response, f"Host Information for {ip}")

async def handle_search(client: httpx.AsyncClient, args: dict, api_key: str) -> list[TextContent]:
    """Search Shodan database."""
    params = {
        "key": api_key,
        "query": args["query"],
        "page": args.get("page", 1)
    }
    
    if args.get("facets"):
        params["facets"] = args["facets"]
    if args.get("minify"):
        params["minify"] = "true"
    
    response = await client.get(f"{SHODAN_API_BASE}/shodan/host/search", params=params)
    return await format_response(response, f"Search Results for: {args['query']}")

async def handle_search_count(client: httpx.AsyncClient, args: dict, api_key: str) -> list[TextContent]:
    """Get search result count."""
    params = {
        "key": api_key,
        "query": args["query"]
    }
    
    if args.get("facets"):
        params["facets"] = args["facets"]
    
    response = await client.get(f"{SHODAN_API_BASE}/shodan/host/count", params=params)
    return await format_response(response, f"Search Count for: {args['query']}")

async def handle_search_facets(client: httpx.AsyncClient, args: dict, api_key: str) -> list[TextContent]:
    """List available search facets."""
    response = await client.get(f"{SHODAN_API_BASE}/shodan/host/search/facets", params={"key": api_key})
    return await format_response(response, "Available Search Facets")

async def handle_search_filters(client: httpx.AsyncClient, args: dict, api_key: str) -> list[TextContent]:
    """List available search filters."""
    response = await client.get(f"{SHODAN_API_BASE}/shodan/host/search/filters", params={"key": api_key})
    return await format_response(response, "Available Search Filters")

async def handle_search_tokens(client: httpx.AsyncClient, args: dict, api_key: str) -> list[TextContent]:
    """Tokenize search query."""
    params = {
        "key": api_key,
        "query": args["query"]
    }
    response = await client.get(f"{SHODAN_API_BASE}/shodan/host/search/tokens", params=params)
    return await format_response(response, f"Query Tokens for: {args['query']}")

# Scanning Methods
async def handle_scan(client: httpx.AsyncClient, args: dict, api_key: str) -> list[TextContent]:
    """Request network scan."""
    data = {
        "ips": args["ips"],
        "force": args.get("force", False)
    }
    response = await client.post(f"{SHODAN_API_BASE}/shodan/scan", 
                                params={"key": api_key}, 
                                data=data)
    return await format_response(response, f"Scan Request for IPs: {args['ips']}")

async def handle_scan_internet(client: httpx.AsyncClient, args: dict, api_key: str) -> list[TextContent]:
    """Request Internet scan."""
    data = {
        "port": args["port"],
        "protocol": args.get("protocol", "tcp")
    }
    response = await client.post(f"{SHODAN_API_BASE}/shodan/scan/internet", 
                                params={"key": api_key}, 
                                data=data)
    return await format_response(response, f"Internet Scan Request for port {args['port']}")

async def handle_scan_protocols(client: httpx.AsyncClient, args: dict, api_key: str) -> list[TextContent]:
    """List scanning protocols."""
    response = await client.get(f"{SHODAN_API_BASE}/shodan/protocols", params={"key": api_key})
    return await format_response(response, "Available Scan Protocols")

async def handle_scan_status(client: httpx.AsyncClient, args: dict, api_key: str) -> list[TextContent]:
    """Check scan status."""
    scan_id = args["scan_id"]
    response = await client.get(f"{SHODAN_API_BASE}/shodan/scan/{scan_id}", params={"key": api_key})
    return await format_response(response, f"Scan Status for ID: {scan_id}")

# Alert Methods
async def handle_alert_list(client: httpx.AsyncClient, args: dict, api_key: str) -> list[TextContent]:
    """List network alerts."""
    response = await client.get(f"{SHODAN_API_BASE}/shodan/alert", params={"key": api_key})
    return await format_response(response, "Network Alerts")

async def handle_alert_create(client: httpx.AsyncClient, args: dict, api_key: str) -> list[TextContent]:
    """Create network alert."""
    data = {
        "name": args["name"],
        "filters": args.get("filters", {})
    }
    response = await client.post(f"{SHODAN_API_BASE}/shodan/alert", 
                                params={"key": api_key}, 
                                json=data)
    return await format_response(response, f"Created Alert: {args['name']}")

async def handle_alert_info(client: httpx.AsyncClient, args: dict, api_key: str) -> list[TextContent]:
    """Get alert information."""
    alert_id = args["alert_id"]
    response = await client.get(f"{SHODAN_API_BASE}/shodan/alert/{alert_id}/info", params={"key": api_key})
    return await format_response(response, f"Alert Info for ID: {alert_id}")

async def handle_alert_delete(client: httpx.AsyncClient, args: dict, api_key: str) -> list[TextContent]:
    """Delete network alert."""
    alert_id = args["alert_id"]
    response = await client.delete(f"{SHODAN_API_BASE}/shodan/alert/{alert_id}", params={"key": api_key})
    return await format_response(response, f"Deleted Alert ID: {alert_id}")

# DNS Methods
async def handle_dns_domain(client: httpx.AsyncClient, args: dict, api_key: str) -> list[TextContent]:
    """Get domain information."""
    domain = args["domain"]
    params = {"key": api_key}
    
    if args.get("history"):
        params["history"] = "true"
    if args.get("type"):
        params["type"] = args["type"]
    if args.get("page"):
        params["page"] = args["page"]
    
    response = await client.get(f"{SHODAN_API_BASE}/dns/domain/{domain}", params=params)
    return await format_response(response, f"Domain Information for: {domain}")

async def handle_dns_resolve(client: httpx.AsyncClient, args: dict, api_key: str) -> list[TextContent]:
    """Resolve hostnames."""
    hostnames = args["hostnames"]
    response = await client.get(f"{SHODAN_API_BASE}/dns/resolve", 
                               params={"key": api_key, "hostnames": hostnames})
    return await format_response(response, f"DNS Resolution for: {hostnames}")

async def handle_dns_reverse(client: httpx.AsyncClient, args: dict, api_key: str) -> list[TextContent]:
    """Reverse DNS lookup."""
    ips = args["ips"]
    response = await client.get(f"{SHODAN_API_BASE}/dns/reverse", 
                               params={"key": api_key, "ips": ips})
    return await format_response(response, f"Reverse DNS for: {ips}")

# Account Methods
async def handle_account_profile(client: httpx.AsyncClient, args: dict, api_key: str) -> list[TextContent]:
    """Get account profile."""
    response = await client.get(f"{SHODAN_API_BASE}/account/profile", params={"key": api_key})
    return await format_response(response, "Account Profile")

async def handle_api_info(client: httpx.AsyncClient, args: dict, api_key: str) -> list[TextContent]:
    """Get API information."""
    response = await client.get(f"{SHODAN_API_BASE}/api-info", params={"key": api_key})
    return await format_response(response, "API Information")

# Tools Methods
async def handle_tools_httpheaders(client: httpx.AsyncClient, args: dict, api_key: str) -> list[TextContent]:
    """Get HTTP headers."""
    response = await client.get(f"{SHODAN_API_BASE}/tools/httpheaders", params={"key": api_key})
    return await format_response(response, "HTTP Headers")

async def handle_tools_myip(client: httpx.AsyncClient, args: dict, api_key: str) -> list[TextContent]:
    """Get external IP."""
    response = await client.get(f"{SHODAN_API_BASE}/tools/myip", params={"key": api_key})
    return await format_response(response, "External IP Address")

# Labs Methods
async def handle_labs_honeyscore(client: httpx.AsyncClient, args: dict, api_key: str) -> list[TextContent]:
    """Calculate honeypot score."""
    ip = args["ip"]
    response = await client.get(f"{SHODAN_API_BASE}/labs/honeyscore/{ip}", params={"key": api_key})
    return await format_response(response, f"Honeypot Score for: {ip}")

# Organization Methods (Enterprise)
async def handle_org_list(client: httpx.AsyncClient, args: dict, api_key: str) -> list[TextContent]:
    """List organizations."""
    response = await client.get(f"{SHODAN_API_BASE}/org", params={"key": api_key})
    return await format_response(response, "Organizations")

async def handle_org_info(client: httpx.AsyncClient, args: dict, api_key: str) -> list[TextContent]:
    """Get organization info."""
    org_id = args["org_id"]
    response = await client.get(f"{SHODAN_API_BASE}/org/{org_id}", params={"key": api_key})
    return await format_response(response, f"Organization Info for: {org_id}")

async def format_response(response: httpx.Response, title: str) -> list[TextContent]:
    """Format API response into readable text."""
    try:
        if response.status_code == 200:
            data = response.json()
            
            # Format response based on content
            result = f"# {title}\n\n"
            
            if isinstance(data, dict):
                result += format_dict_response(data)
            elif isinstance(data, list):
                result += format_list_response(data)
            else:
                result += f"**Result:** {data}\n"
                
            return [TextContent(type="text", text=result)]
            
        elif response.status_code == 401:
            return [TextContent(type="text", text="Error: Invalid Shodan API key")]
        elif response.status_code == 402:
            return [TextContent(type="text", text="Error: Insufficient credits or plan limitations")]
        elif response.status_code == 403:
            return [TextContent(type="text", text="Error: Access forbidden - check API key permissions")]
        elif response.status_code == 404:
            return [TextContent(type="text", text="Error: Resource not found")]
        elif response.status_code == 429:
            return [TextContent(type="text", text="Error: Rate limit exceeded. Please try again later")]
        else:
            error_text = response.text
            return [TextContent(type="text", text=f"Error: API returned status {response.status_code}: {error_text}")]
            
    except json.JSONDecodeError:
        return [TextContent(type="text", text=f"Error: Invalid JSON response from API")]
    except Exception as e:
        return [TextContent(type="text", text=f"Error: Failed to process response: {str(e)}")]

def format_dict_response(data: dict) -> str:
    """Format dictionary response."""
    result = ""
    
    # Handle common Shodan response patterns
    if "ip_str" in data:
        # Host information
        result += f"**IP Address:** {data.get('ip_str', 'N/A')}\n"
        if data.get("org"):
            result += f"**Organization:** {data['org']}\n"
        if data.get("isp"):
            result += f"**ISP:** {data['isp']}\n"
        if data.get("country_name"):
            result += f"**Country:** {data['country_name']}\n"
        if data.get("city"):
            result += f"**City:** {data['city']}\n"
        if data.get("os"):
            result += f"**OS:** {data['os']}\n"
            
        # Services
        if data.get("data"):
            result += f"\n## Services ({len(data['data'])} found)\n\n"
            for i, service in enumerate(data["data"][:10], 1):
                result += f"**Service {i}:**\n"
                result += f"- Port: {service.get('port', 'Unknown')}\n"
                result += f"- Protocol: {service.get('transport', 'tcp')}\n"
                result += f"- Product: {service.get('product', 'Unknown')}\n"
                if service.get("version"):
                    result += f"- Version: {service['version']}\n"
                result += "\n"
                
        # Vulnerabilities
        if data.get("vulns"):
            result += f"## Vulnerabilities ({len(data['vulns'])} found)\n\n"
            for vuln in list(data["vulns"])[:5]:
                result += f"- {vuln}\n"
            result += "\n"
            
    elif "matches" in data:
        # Search results
        result += f"**Total Results:** {data.get('total', 0)}\n\n"
        matches = data.get("matches", [])
        for i, match in enumerate(matches[:5], 1):
            result += f"**Result {i}:**\n"
            result += f"- IP: {match.get('ip_str', 'N/A')}\n"
            result += f"- Port: {match.get('port', 'N/A')}\n"
            result += f"- Location: {match.get('location', {}).get('country_name', 'Unknown')}\n"
            result += f"- Organization: {match.get('org', 'Unknown')}\n"
            result += "\n"
            
    elif "total" in data:
        # Count results
        result += f"**Total Matches:** {data['total']}\n"
        
    else:
        # Generic formatting
        for key, value in data.items():
            if isinstance(value, (dict, list)):
                result += f"**{key.replace('_', ' ').title()}:** {json.dumps(value, indent=2)[:500]}...\n"
            else:
                result += f"**{key.replace('_', ' ').title()}:** {value}\n"
    
    return result

def format_list_response(data: list) -> str:
    """Format list response."""
    result = f"**Found {len(data)} items:**\n\n"
    
    for i, item in enumerate(data[:10], 1):
        if isinstance(item, dict):
            result += f"**Item {i}:**\n"
            for key, value in list(item.items())[:5]:
                result += f"- {key.replace('_', ' ').title()}: {value}\n"
            result += "\n"
        else:
            result += f"- {item}\n"
    
    if len(data) > 10:
        result += f"\n... and {len(data) - 10} more items\n"
    
    return result

async def main():
    """Run the MCP server."""
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="shodan-comprehensive-mcp-server",
                server_version="1.0.0",
                capabilities=server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                ),
            ),
        )

if __name__ == "__main__":
    asyncio.run(main())