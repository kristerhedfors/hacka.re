#!/usr/bin/env python3

import pytest
import json
from playwright.sync_api import Page
from test_utils import dismiss_welcome_modal, dismiss_settings_modal

@pytest.fixture(scope="function") 
def api_key():
    """Provide API key from environment"""
    import os
    from dotenv import load_dotenv
    load_dotenv()
    return os.getenv("OPENAI_API_KEY")

def test_inspect_mcp_tool_schema(page: Page, serve_hacka_re, api_key):
    """Inspect the actual MCP tool schemas being returned by the server"""
    
    # Navigate and setup
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Setup API
    page.click("#settings-btn")
    page.wait_for_selector("#settings-modal.active", state="visible")
    page.locator("#api-key-update").fill(api_key)
    page.locator("#base-url-select").select_option("openai")
    page.locator("#model-reload-btn").click()
    page.wait_for_timeout(2000)
    page.locator("#model-select").select_option("gpt-4o-mini")
    page.keyboard.press("Escape")
    page.wait_for_selector("#settings-modal", state="hidden")
    
    print("=== Setting up MCP connection ===")
    
    # Setup MCP 
    page.click("#mcp-servers-btn")
    page.wait_for_selector("#mcp-servers-modal", state="visible")
    page.fill("#mcp-proxy-url", "http://localhost:3001")
    page.click("#test-proxy-btn")
    page.wait_for_timeout(2000)
    page.fill("#mcp-server-name", "mcp-server")
    page.select_option("#mcp-transport-type", "stdio") 
    page.fill("#mcp-server-command", "npx @modelcontextprotocol/server-filesystem /Users/user")
    page.click("#mcp-server-form button[type='submit']")
    page.wait_for_timeout(3000)
    
    try:
        page.click("#close-mcp-servers-modal")
        page.wait_for_selector("#mcp-servers-modal", state="hidden", timeout=3000)
    except:
        page.evaluate("""() => {
            const modal = document.getElementById('mcp-servers-modal');
            if (modal) modal.classList.remove('active');
        }""")
    
    print("=== Inspecting MCP Tool Schemas ===")
    
    # Get the raw MCP tool schemas
    schema_analysis = page.evaluate("""() => {
        console.log('=== MCP TOOL SCHEMA INSPECTION ===');
        
        let analysis = {
            mcpClientAvailable: false,
            activeConnections: [],
            serverInfo: {},
            rawTools: [],
            toolSchemas: {}
        };
        
        // Check MCP Client
        if (window.MCPClientService) {
            analysis.mcpClientAvailable = true;
            
            try {
                // Get active connections
                const connections = window.MCPClientService.getActiveConnections();
                analysis.activeConnections = connections;
                console.log('Active MCP connections:', connections);
                
                // Get server info for each connection
                for (const serverName of connections) {
                    const info = window.MCPClientService.getConnectionInfo(serverName);
                    analysis.serverInfo[serverName] = {
                        connected: info.connected,
                        toolCount: info.tools ? info.tools.length : 0,
                        tools: info.tools
                    };
                    
                    console.log(`Server "${serverName}" info:`, info);
                    
                    // Examine each tool in detail
                    if (info.tools) {
                        info.tools.forEach((tool, index) => {
                            console.log(`Tool ${index}: ${tool.name}`);
                            console.log('  Description:', tool.description);
                            console.log('  Input Schema:', tool.inputSchema);
                            
                            analysis.rawTools.push({
                                serverName: serverName,
                                name: tool.name,
                                description: tool.description,
                                inputSchema: tool.inputSchema,
                                hasInputSchema: !!tool.inputSchema,
                                hasProperties: !!(tool.inputSchema && tool.inputSchema.properties),
                                propertyCount: tool.inputSchema && tool.inputSchema.properties ? 
                                    Object.keys(tool.inputSchema.properties).length : 0,
                                properties: tool.inputSchema && tool.inputSchema.properties ? 
                                    Object.keys(tool.inputSchema.properties) : []
                            });
                            
                            if (tool.name === 'list_directory') {
                                analysis.toolSchemas.list_directory = {
                                    fullTool: tool,
                                    inputSchema: tool.inputSchema,
                                    properties: tool.inputSchema?.properties,
                                    required: tool.inputSchema?.required
                                };
                            }
                        });
                    }
                }
                
            } catch (error) {
                console.error('Error inspecting MCP client:', error);
                analysis.error = error.message;
            }
        }
        
        return analysis;
    }""")
    
    print("\\n=== MCP SCHEMA ANALYSIS RESULTS ===")
    print(f"MCP Client available: {schema_analysis.get('mcpClientAvailable')}")
    print(f"Active connections: {schema_analysis.get('activeConnections', [])}")
    
    # Server info
    server_info = schema_analysis.get('serverInfo', {})
    for server_name, info in server_info.items():
        print(f"\\nServer: {server_name}")
        print(f"  Connected: {info.get('connected')}")
        print(f"  Tool count: {info.get('toolCount')}")
    
    # Raw tools analysis  
    raw_tools = schema_analysis.get('rawTools', [])
    print(f"\\n=== RAW TOOL SCHEMAS ({len(raw_tools)} tools) ===")
    
    for tool in raw_tools[:5]:  # Show first 5 tools
        print(f"\\nTool: {tool['name']}")
        print(f"  Has input schema: {tool['hasInputSchema']}")
        print(f"  Has properties: {tool['hasProperties']}")
        print(f"  Property count: {tool['propertyCount']}")
        print(f"  Properties: {tool['properties']}")
        
        if tool['inputSchema']:
            print(f"  Input schema: {json.dumps(tool['inputSchema'], indent=2)}")
    
    # Specific list_directory analysis
    list_dir_schema = schema_analysis.get('toolSchemas', {}).get('list_directory')
    if list_dir_schema:
        print(f"\\n=== LIST_DIRECTORY SCHEMA DETAILS ===")
        print(f"Full schema: {json.dumps(list_dir_schema['inputSchema'], indent=2)}")
        
        properties = list_dir_schema.get('properties')
        if properties:
            print(f"Properties: {json.dumps(properties, indent=2)}")
        else:
            print("❌ NO PROPERTIES FOUND")
    
    print(f"\\n=== DIAGNOSIS ===")
    
    # Check if any tools have properties
    tools_with_properties = [t for t in raw_tools if t['hasProperties']]
    tools_without_properties = [t for t in raw_tools if not t['hasProperties']]
    
    print(f"Tools with properties: {len(tools_with_properties)}")
    print(f"Tools without properties: {len(tools_without_properties)}")
    
    if len(tools_without_properties) == len(raw_tools):
        print("❌ ROOT CAUSE: MCP filesystem server is not providing input schema properties")
        print("💡 SOLUTION: The filesystem server tool definitions are incomplete - missing parameter schemas")
        print("🔧 This is why the generated functions have no parameters and empty tool definitions")
    elif len(tools_with_properties) > 0:
        print("⚠️ MIXED: Some tools have properties, some don't")
        print("🔍 Need to check why property extraction is inconsistent")
    else:
        print("✅ All tools have properties - issue must be elsewhere")
    
    return schema_analysis

if __name__ == "__main__":
    print("Run with: python -m pytest debug_mcp_tool_schema.py -v -s")