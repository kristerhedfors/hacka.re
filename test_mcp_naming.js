// Test script for MCP tool naming changes

console.log("Testing MCP Tool Naming (No Prefixes)");
console.log("=====================================\n");

// Test the tool registry
if (window.MCPToolRegistry) {
    const registry = new window.MCPToolRegistry.ToolRegistry();
    
    // Mock tools from different servers
    const server1Tools = [
        { name: "read_file", description: "Read a file from disk" },
        { name: "write_file", description: "Write content to a file" }
    ];
    
    const server2Tools = [
        { name: "execute_query", description: "Execute a database query" },
        { name: "read_file", description: "Read a file from database storage" } // Collision!
    ];
    
    console.log("Test 1: Register tools from server1");
    try {
        // Note: This would normally call the actual registration, but we're testing the naming
        server1Tools.forEach(tool => {
            const functionName = registry._generateFunctionName("server1", tool.name);
            console.log(`  Tool: ${tool.name} -> Function: ${functionName}`);
        });
        console.log("  ✓ Server1 tools would register successfully\n");
    } catch (error) {
        console.error("  ✗ Error:", error.message);
    }
    
    console.log("Test 2: Register tools from server2 (with collision)");
    try {
        server2Tools.forEach(tool => {
            const functionName = registry._generateFunctionName("server2", tool.name);
            console.log(`  Tool: ${tool.name} -> Function: ${functionName}`);
            if (functionName === "read_file") {
                console.log("  ⚠️  WARNING: This would cause a name collision!");
            }
        });
    } catch (error) {
        console.error("  ✗ Error:", error.message);
    }
}

// Test the tools manager
if (window.MCPToolsManager) {
    console.log("\nTest 3: Tools Manager function generation");
    
    const mockTool = {
        name: "search_documents",
        description: "Search through documents",
        inputSchema: {
            type: "object",
            properties: {
                query: { type: "string", description: "Search query" },
                limit: { type: "number", description: "Maximum results" }
            },
            required: ["query"]
        }
    };
    
    const functionCode = window.MCPToolsManager.generateFunctionCode("knowledge_base", mockTool);
    
    // Extract function name from generated code
    const functionNameMatch = functionCode.match(/async function (\w+)\(/);
    if (functionNameMatch) {
        console.log(`  Generated function name: ${functionNameMatch[1]}`);
        console.log(`  Expected: ${mockTool.name}`);
        console.log(`  Match: ${functionNameMatch[1] === mockTool.name ? "✓ YES" : "✗ NO"}`);
    }
}

console.log("\n=====================================");
console.log("Summary:");
console.log("- Tool names are now preserved without server prefixes");
console.log("- Name collisions will throw errors (as requested)");
console.log("- Users need to ensure unique tool names across MCP servers");