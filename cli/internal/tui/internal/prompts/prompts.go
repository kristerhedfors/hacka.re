package prompts

// DefaultPrompt represents a built-in system prompt
type DefaultPrompt struct {
	ID          string
	Name        string
	Content     string
	Description string
}

// MCPPrompt represents an MCP server-specific prompt
type MCPPrompt struct {
	ID          string
	Name        string
	Content     string
	Description string
	MCPServer   string // Which MCP server this prompt is for
}

// GetDefaultPrompts returns all built-in default prompts
func GetDefaultPrompts() []DefaultPrompt {
	return []DefaultPrompt{
		{
			ID:          "hacka-re-project",
			Name:        "README.md",
			Content:     ReadmePromptContent,
			Description: "The hacka.re project documentation and guide",
		},
		{
			ID:          "owasp-llm-top10",
			Name:        "OWASP Top 10 for LLM Applications",
			Content:     OWASPPromptContent,
			Description: "OWASP Top 10 security risks for Large Language Model applications",
		},
		{
			ID:          "llm-security-literacy",
			Name:        "LLM Security Literacy",
			Content:     SecurityLiteracyContent,
			Description: "LLM Security Literacy insights from Sec-T conference 2025",
		},
	}
}

// GetMCPPrompts returns all MCP server prompts
func GetMCPPrompts() []MCPPrompt {
	return []MCPPrompt{
		{
			ID:          "gmail-integration-guide",
			Name:        "Gmail MCP prompt",
			Content:     GmailMCPContent,
			Description: "Gmail Integration Assistant for email management",
			MCPServer:   "gmail",
		},
		{
			ID:          "github-integration-guide",
			Name:        "GitHub MCP prompt",
			Content:     GitHubMCPContent,
			Description: "GitHub Development Assistant for repository management",
			MCPServer:   "github",
		},
		{
			ID:          "shodan-integration-guide",
			Name:        "Shodan MCP prompt",
			Content:     ShodanMCPContent,
			Description: "Shodan OSINT & Cybersecurity Assistant",
			MCPServer:   "shodan",
		},
		{
			ID:          "share-link-mcp-guide",
			Name:        "Share Link MCP Guide",
			Content:     ShareLinkMCPContent,
			Description: "Share Link MCP functionality guide",
			MCPServer:   "share-link",
		},
		{
			ID:          "introspection-mcp-guide",
			Name:        "Introspection MCP Guide",
			Content:     IntrospectionMCPContent,
			Description: "Introspection MCP tools for code exploration",
			MCPServer:   "introspection",
		},
	}
}