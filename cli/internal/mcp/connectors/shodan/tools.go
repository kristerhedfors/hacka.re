package shodan

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/hacka-re/cli/internal/mcp/types"
)

// Tools contains all Shodan MCP tools
type Tools struct {
	client *Client
}

// NewTools creates a new Shodan tools instance
func NewTools(apiKey string) *Tools {
	return &Tools{
		client: NewClient(apiKey),
	}
}

// GetToolDefinitions returns all tool definitions
func (t *Tools) GetToolDefinitions() []*types.Tool {
	return []*types.Tool{
		// Search Methods
		{
			Name:        "shodan_host_info",
			Description: "Get detailed information about an IP address including services, vulnerabilities, and location",
			InputSchema: json.RawMessage(`{
				"type": "object",
				"properties": {
					"ip": {"type": "string", "description": "The IP address to look up"},
					"history": {"type": "boolean", "description": "Show historical banners", "default": false},
					"minify": {"type": "boolean", "description": "Minify banner and remove metadata", "default": false}
				},
				"required": ["ip"]
			}`),
		},
		{
			Name:        "shodan_search",
			Description: "Search Shodan database using filters and search queries",
			InputSchema: json.RawMessage(`{
				"type": "object",
				"properties": {
					"query": {"type": "string", "description": "Search query (e.g., 'apache', 'port:80', 'country:US')"},
					"facets": {"type": "string", "description": "Comma-separated list of facets (e.g., 'country,port,org')"},
					"page": {"type": "integer", "description": "Page number (1-indexed)", "default": 1},
					"minify": {"type": "boolean", "description": "Minify results", "default": false}
				},
				"required": ["query"]
			}`),
		},
		{
			Name:        "shodan_search_count",
			Description: "Get the number of results for a search query without returning actual results",
			InputSchema: json.RawMessage(`{
				"type": "object",
				"properties": {
					"query": {"type": "string", "description": "Search query"},
					"facets": {"type": "string", "description": "Comma-separated list of facets"}
				},
				"required": ["query"]
			}`),
		},
		// DNS Methods
		{
			Name:        "shodan_dns_domain",
			Description: "Get information about a domain including subdomains and DNS records",
			InputSchema: json.RawMessage(`{
				"type": "object",
				"properties": {
					"domain": {"type": "string", "description": "Domain name (e.g., 'google.com')"},
					"history": {"type": "boolean", "description": "Include historical DNS data", "default": false},
					"type": {"type": "string", "description": "DNS record type filter", "enum": ["A", "AAAA", "CNAME", "NS", "MX", "TXT"]},
					"page": {"type": "integer", "description": "Page number", "default": 1}
				},
				"required": ["domain"]
			}`),
		},
		{
			Name:        "shodan_dns_resolve",
			Description: "Resolve hostnames to IP addresses",
			InputSchema: json.RawMessage(`{
				"type": "object",
				"properties": {
					"hostnames": {"type": "string", "description": "Comma-separated list of hostnames"}
				},
				"required": ["hostnames"]
			}`),
		},
		{
			Name:        "shodan_dns_reverse",
			Description: "Resolve IP addresses to hostnames",
			InputSchema: json.RawMessage(`{
				"type": "object",
				"properties": {
					"ips": {"type": "string", "description": "Comma-separated list of IP addresses"}
				},
				"required": ["ips"]
			}`),
		},
		// Scanning Methods
		{
			Name:        "shodan_scan",
			Description: "Request Shodan to crawl network blocks or IP addresses",
			InputSchema: json.RawMessage(`{
				"type": "object",
				"properties": {
					"ips": {"type": "string", "description": "Comma-separated list of IPs to scan"},
					"force": {"type": "boolean", "description": "Force re-scan of IP addresses", "default": false}
				},
				"required": ["ips"]
			}`),
		},
		// Account Methods
		{
			Name:        "shodan_account_profile",
			Description: "Get account profile information including credits and plan details",
			InputSchema: json.RawMessage(`{"type": "object", "properties": {}}`),
		},
		{
			Name:        "shodan_tools_myip",
			Description: "Get your external IP address as seen by Shodan",
			InputSchema: json.RawMessage(`{"type": "object", "properties": {}}`),
		},
	}
}

// HandleHostInfo handles the shodan_host_info tool call
func (t *Tools) HandleHostInfo(args json.RawMessage) ([]types.Content, error) {
	var params struct {
		IP      string `json:"ip"`
		History bool   `json:"history"`
		Minify  bool   `json:"minify"`
	}
	
	if err := json.Unmarshal(args, &params); err != nil {
		return nil, fmt.Errorf("invalid parameters: %w", err)
	}
	
	info, err := t.client.GetHostInfo(params.IP, params.History, params.Minify)
	if err != nil {
		return nil, err
	}
	
	result := formatHostInfo(info)
	return []types.Content{{Type: "text", Text: result}}, nil
}

// HandleSearch handles the shodan_search tool call
func (t *Tools) HandleSearch(args json.RawMessage) ([]types.Content, error) {
	var params struct {
		Query  string `json:"query"`
		Facets string `json:"facets"`
		Page   int    `json:"page"`
		Minify bool   `json:"minify"`
	}
	
	if err := json.Unmarshal(args, &params); err != nil {
		return nil, fmt.Errorf("invalid parameters: %w", err)
	}
	
	if params.Page == 0 {
		params.Page = 1
	}
	
	results, err := t.client.Search(params.Query, params.Facets, params.Page, params.Minify)
	if err != nil {
		return nil, err
	}
	
	result := formatSearchResults(results)
	return []types.Content{{Type: "text", Text: result}}, nil
}

// HandleSearchCount handles the shodan_search_count tool call
func (t *Tools) HandleSearchCount(args json.RawMessage) ([]types.Content, error) {
	var params struct {
		Query  string `json:"query"`
		Facets string `json:"facets"`
	}
	
	if err := json.Unmarshal(args, &params); err != nil {
		return nil, fmt.Errorf("invalid parameters: %w", err)
	}
	
	results, err := t.client.SearchCount(params.Query, params.Facets)
	if err != nil {
		return nil, err
	}
	
	resultJSON, _ := json.MarshalIndent(results, "", "  ")
	return []types.Content{{Type: "text", Text: string(resultJSON)}}, nil
}

// HandleDNSDomain handles the shodan_dns_domain tool call
func (t *Tools) HandleDNSDomain(args json.RawMessage) ([]types.Content, error) {
	var params struct {
		Domain     string `json:"domain"`
		History    bool   `json:"history"`
		RecordType string `json:"type"`
		Page       int    `json:"page"`
	}
	
	if err := json.Unmarshal(args, &params); err != nil {
		return nil, fmt.Errorf("invalid parameters: %w", err)
	}
	
	if params.Page == 0 {
		params.Page = 1
	}
	
	domain, err := t.client.GetDomainInfo(params.Domain, params.History, params.RecordType, params.Page)
	if err != nil {
		return nil, err
	}
	
	result := formatDomainInfo(domain)
	return []types.Content{{Type: "text", Text: result}}, nil
}

// HandleDNSResolve handles the shodan_dns_resolve tool call
func (t *Tools) HandleDNSResolve(args json.RawMessage) ([]types.Content, error) {
	var params struct {
		Hostnames string `json:"hostnames"`
	}
	
	if err := json.Unmarshal(args, &params); err != nil {
		return nil, fmt.Errorf("invalid parameters: %w", err)
	}
	
	hostnames := strings.Split(params.Hostnames, ",")
	for i := range hostnames {
		hostnames[i] = strings.TrimSpace(hostnames[i])
	}
	
	results, err := t.client.DNSResolve(hostnames)
	if err != nil {
		return nil, err
	}
	
	var output strings.Builder
	output.WriteString("# DNS Resolution Results\n\n")
	for hostname, ip := range results {
		output.WriteString(fmt.Sprintf("**%s**: %s\n", hostname, ip))
	}
	
	return []types.Content{{Type: "text", Text: output.String()}}, nil
}

// HandleDNSReverse handles the shodan_dns_reverse tool call
func (t *Tools) HandleDNSReverse(args json.RawMessage) ([]types.Content, error) {
	var params struct {
		IPs string `json:"ips"`
	}
	
	if err := json.Unmarshal(args, &params); err != nil {
		return nil, fmt.Errorf("invalid parameters: %w", err)
	}
	
	ips := strings.Split(params.IPs, ",")
	for i := range ips {
		ips[i] = strings.TrimSpace(ips[i])
	}
	
	results, err := t.client.DNSReverse(ips)
	if err != nil {
		return nil, err
	}
	
	var output strings.Builder
	output.WriteString("# Reverse DNS Results\n\n")
	for ip, hostnames := range results {
		output.WriteString(fmt.Sprintf("**%s**:\n", ip))
		for _, hostname := range hostnames {
			output.WriteString(fmt.Sprintf("  - %s\n", hostname))
		}
	}
	
	return []types.Content{{Type: "text", Text: output.String()}}, nil
}

// HandleScan handles the shodan_scan tool call
func (t *Tools) HandleScan(args json.RawMessage) ([]types.Content, error) {
	var params struct {
		IPs   string `json:"ips"`
		Force bool   `json:"force"`
	}
	
	if err := json.Unmarshal(args, &params); err != nil {
		return nil, fmt.Errorf("invalid parameters: %w", err)
	}
	
	ips := strings.Split(params.IPs, ",")
	for i := range ips {
		ips[i] = strings.TrimSpace(ips[i])
	}
	
	results, err := t.client.Scan(ips, params.Force)
	if err != nil {
		return nil, err
	}
	
	resultJSON, _ := json.MarshalIndent(results, "", "  ")
	return []types.Content{{Type: "text", Text: string(resultJSON)}}, nil
}

// HandleAccountProfile handles the shodan_account_profile tool call
func (t *Tools) HandleAccountProfile(args json.RawMessage) ([]types.Content, error) {
	profile, err := t.client.GetAccountProfile()
	if err != nil {
		return nil, err
	}
	
	var output strings.Builder
	output.WriteString("# Shodan Account Profile\n\n")
	output.WriteString(fmt.Sprintf("**Display Name**: %s\n", profile.DisplayName))
	output.WriteString(fmt.Sprintf("**Member**: %v\n", profile.Member))
	output.WriteString(fmt.Sprintf("**Credits**: %d\n", profile.Credits))
	output.WriteString(fmt.Sprintf("**Created**: %s\n", profile.Created))
	
	return []types.Content{{Type: "text", Text: output.String()}}, nil
}

// HandleMyIP handles the shodan_tools_myip tool call
func (t *Tools) HandleMyIP(args json.RawMessage) ([]types.Content, error) {
	ip, err := t.client.GetMyIP()
	if err != nil {
		return nil, err
	}
	
	return []types.Content{{Type: "text", Text: fmt.Sprintf("Your external IP address: %s", ip)}}, nil
}

// Helper functions for formatting results

func formatHostInfo(info *HostInfo) string {
	var output strings.Builder
	
	output.WriteString(fmt.Sprintf("# Shodan Host Information for %s\n\n", info.IP))
	
	if info.Organization != "" {
		output.WriteString(fmt.Sprintf("**Organization**: %s\n", info.Organization))
	}
	if info.ISP != "" {
		output.WriteString(fmt.Sprintf("**ISP**: %s\n", info.ISP))
	}
	if info.Country != "" {
		output.WriteString(fmt.Sprintf("**Country**: %s\n", info.Country))
	}
	if info.City != "" {
		output.WriteString(fmt.Sprintf("**City**: %s\n", info.City))
	}
	if info.Region != "" {
		output.WriteString(fmt.Sprintf("**Region**: %s\n", info.Region))
	}
	if info.OS != "" {
		output.WriteString(fmt.Sprintf("**Operating System**: %s\n", info.OS))
	}
	
	if len(info.Ports) > 0 {
		output.WriteString(fmt.Sprintf("\n**Open Ports**: %v\n", info.Ports))
	}
	
	if len(info.Data) > 0 {
		output.WriteString("\n## Open Ports and Services\n\n")
		limit := len(info.Data)
		if limit > 10 {
			limit = 10
		}
		for i := 0; i < limit; i++ {
			service := info.Data[i]
			output.WriteString(fmt.Sprintf("**Port %d**: %s", service.Port, service.Product))
			if service.Version != "" {
				output.WriteString(fmt.Sprintf(" %s", service.Version))
			}
			output.WriteString("\n")
			
			if service.Data != "" && len(service.Data) < 200 {
				output.WriteString(fmt.Sprintf("```\n%s\n```\n", service.Data[:min(len(service.Data), 200)]))
			}
			output.WriteString("\n")
		}
	}
	
	if len(info.Vulns) > 0 {
		output.WriteString("## Vulnerabilities\n\n")
		limit := len(info.Vulns)
		if limit > 5 {
			limit = 5
		}
		for i := 0; i < limit; i++ {
			output.WriteString(fmt.Sprintf("- %s\n", info.Vulns[i]))
		}
	}
	
	if info.LastUpdate != "" {
		output.WriteString(fmt.Sprintf("\n**Last Updated**: %s\n", info.LastUpdate))
	}
	
	return output.String()
}

func formatSearchResults(results *SearchResult) string {
	var output strings.Builder
	
	output.WriteString(fmt.Sprintf("# Shodan Search Results\n\n"))
	output.WriteString(fmt.Sprintf("**Total Results**: %d\n\n", results.Total))
	
	if len(results.Matches) > 0 {
		output.WriteString("## Matches\n\n")
		limit := len(results.Matches)
		if limit > 10 {
			limit = 10
		}
		for i := 0; i < limit; i++ {
			match := results.Matches[i]
			output.WriteString(fmt.Sprintf("### %s\n", match.IP))
			if match.Organization != "" {
				output.WriteString(fmt.Sprintf("**Org**: %s\n", match.Organization))
			}
			if match.Country != "" {
				output.WriteString(fmt.Sprintf("**Country**: %s\n", match.Country))
			}
			if len(match.Ports) > 0 {
				output.WriteString(fmt.Sprintf("**Ports**: %v\n", match.Ports))
			}
			output.WriteString("\n")
		}
	}
	
	if len(results.Facets) > 0 {
		output.WriteString("## Facets\n\n")
		for facetName, facetValues := range results.Facets {
			output.WriteString(fmt.Sprintf("### %s\n\n", facetName))
			limit := len(facetValues)
			if limit > 5 {
				limit = 5
			}
			for i := 0; i < limit; i++ {
				fv := facetValues[i]
				output.WriteString(fmt.Sprintf("- **%s**: %d\n", fv.Value, fv.Count))
			}
			output.WriteString("\n")
		}
	}
	
	return output.String()
}

func formatDomainInfo(domain *DNSDomain) string {
	var output strings.Builder
	
	output.WriteString(fmt.Sprintf("# DNS Information for %s\n\n", domain.Domain))
	
	if len(domain.Subdomains) > 0 {
		output.WriteString("## Subdomains\n\n")
		for _, subdomain := range domain.Subdomains {
			output.WriteString(fmt.Sprintf("- %s\n", subdomain))
		}
		output.WriteString("\n")
	}
	
	if len(domain.Data) > 0 {
		output.WriteString("## DNS Records\n\n")
		for _, record := range domain.Data {
			if record.Subdomain != "" {
				output.WriteString(fmt.Sprintf("**%s.%s** (%s): %s", 
					record.Subdomain, domain.Domain, record.Type, record.Value))
			} else {
				output.WriteString(fmt.Sprintf("**%s** (%s): %s", 
					domain.Domain, record.Type, record.Value))
			}
			if record.LastSeen != "" {
				output.WriteString(fmt.Sprintf(" (last seen: %s)", record.LastSeen))
			}
			output.WriteString("\n")
		}
	}
	
	return output.String()
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}