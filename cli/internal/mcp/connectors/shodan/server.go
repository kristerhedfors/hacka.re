package shodan

import (
	"fmt"
	"os"

	"github.com/hacka-re/cli/internal/mcp"
	"github.com/hacka-re/cli/internal/mcp/types"
)

const (
	// ServerName is the name of the Shodan MCP server
	ServerName = "shodan-mcp-server"
	// ServerVersion is the version of the Shodan MCP server
	ServerVersion = "1.0.0"
)

// Server represents a Shodan MCP server
type Server struct {
	mcpServer *mcp.Server
	tools     *Tools
	apiKey    string
}

// NewServer creates a new Shodan MCP server
func NewServer(apiKey string) (*Server, error) {
	if apiKey == "" {
		// Try to get from environment variable
		apiKey = os.Getenv("SHODAN_API_KEY")
		if apiKey == "" {
			return nil, fmt.Errorf("Shodan API key not provided and SHODAN_API_KEY environment variable not set")
		}
	}

	mcpServer := mcp.NewServer(ServerName, ServerVersion)
	tools := NewTools(apiKey)

	s := &Server{
		mcpServer: mcpServer,
		tools:     tools,
		apiKey:    apiKey,
	}

	// Register all Shodan tools
	s.registerTools()

	// Set system prompt
	s.mcpServer.SetSystemPrompt(s.getSystemPrompt())

	return s, nil
}

// Start starts the Shodan MCP server
func (s *Server) Start() error {
	return s.mcpServer.Start(os.Stdin, os.Stdout)
}

// registerTools registers all Shodan tools with the MCP server
func (s *Server) registerTools() {
	toolDefs := s.tools.GetToolDefinitions()

	for _, toolDef := range toolDefs {
		// Create a handler for this tool
		handler := s.createToolHandler(toolDef.Name)
		if handler != nil {
			s.mcpServer.RegisterTool(toolDef, handler)
		}
	}
}

// createToolHandler creates a handler for a specific tool
func (s *Server) createToolHandler(toolName string) types.ToolHandler {
	switch toolName {
	case "shodan_host_info":
		return s.tools.HandleHostInfo
	case "shodan_search":
		return s.tools.HandleSearch
	case "shodan_search_count":
		return s.tools.HandleSearchCount
	case "shodan_dns_domain":
		return s.tools.HandleDNSDomain
	case "shodan_dns_resolve":
		return s.tools.HandleDNSResolve
	case "shodan_dns_reverse":
		return s.tools.HandleDNSReverse
	case "shodan_scan":
		return s.tools.HandleScan
	case "shodan_account_profile":
		return s.tools.HandleAccountProfile
	case "shodan_tools_myip":
		return s.tools.HandleMyIP
	default:
		return nil
	}
}

// getSystemPrompt returns the system prompt for the Shodan MCP server
func (s *Server) getSystemPrompt() string {
	return `You have access to Shodan, the search engine for Internet-connected devices.

Shodan provides intelligence about:
- IP addresses and their services
- Open ports and vulnerabilities
- DNS information and subdomains
- Internet-wide search capabilities
- Network scanning requests

When using Shodan tools:
1. Always respect privacy and legal boundaries
2. Use search filters effectively (e.g., 'port:80', 'country:US', 'org:"Google"')
3. Be mindful of API credits when performing searches and scans
4. Provide context about what the results mean

Common search filters:
- port: Search by port number
- country: Filter by country code
- city: Filter by city name
- org: Filter by organization
- hostname: Search by hostname
- net: Search by network CIDR
- before/after: Filter by date
- vuln: Search for specific vulnerabilities (CVE)
`
}

// GetMCPServer returns the underlying MCP server (for testing)
func (s *Server) GetMCPServer() *mcp.Server {
	return s.mcpServer
}