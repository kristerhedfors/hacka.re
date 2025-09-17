package shodan

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/hacka-re/cli/internal/logger"
)

const (
	// ShodanAPIBase is the base URL for Shodan API
	ShodanAPIBase = "https://api.shodan.io"
)

// Client represents a Shodan API client
type Client struct {
	apiKey     string
	httpClient *http.Client
}

// NewClient creates a new Shodan API client
func NewClient(apiKey string) *Client {
	return &Client{
		apiKey: apiKey,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// HostInfo contains information about a host
type HostInfo struct {
	IP           string   `json:"ip_str"`
	OS           string   `json:"os,omitempty"`
	Organization string   `json:"org,omitempty"`
	ISP          string   `json:"isp,omitempty"`
	Country      string   `json:"country_name,omitempty"`
	City         string   `json:"city,omitempty"`
	Region       string   `json:"region_code,omitempty"`
	Ports        []int    `json:"ports,omitempty"`
	Vulns        []string `json:"vulns,omitempty"`
	LastUpdate   string   `json:"last_update,omitempty"`
	Data         []struct {
		Port      int    `json:"port"`
		Transport string `json:"transport,omitempty"`
		Product   string `json:"product,omitempty"`
		Version   string `json:"version,omitempty"`
		Data      string `json:"data,omitempty"`
	} `json:"data,omitempty"`
}

// SearchResult contains search results
type SearchResult struct {
	Total   int        `json:"total"`
	Matches []HostInfo `json:"matches"`
	Facets  map[string][]struct {
		Value string `json:"value"`
		Count int    `json:"count"`
	} `json:"facets,omitempty"`
}

// DNSDomain contains domain information
type DNSDomain struct {
	Domain     string   `json:"domain"`
	Subdomains []string `json:"subdomains,omitempty"`
	Data       []struct {
		Subdomain string `json:"subdomain,omitempty"`
		Type      string `json:"type,omitempty"`
		Value     string `json:"value,omitempty"`
		LastSeen  string `json:"last_seen,omitempty"`
	} `json:"data,omitempty"`
}

// Alert represents a Shodan alert
type Alert struct {
	ID      string                 `json:"id"`
	Name    string                 `json:"name"`
	Created string                 `json:"created"`
	Expires string                 `json:"expires,omitempty"`
	Expired bool                   `json:"expired"`
	Filters map[string]interface{} `json:"filters,omitempty"`
}

// AccountProfile contains account information
type AccountProfile struct {
	Member      bool   `json:"member"`
	Credits     int    `json:"credits"`
	DisplayName string `json:"display_name,omitempty"`
	Created     string `json:"created"`
}

// GetHostInfo retrieves information about a specific IP
func (c *Client) GetHostInfo(ip string, history, minify bool) (*HostInfo, error) {
	params := url.Values{}
	params.Set("key", c.apiKey)
	if history {
		params.Set("history", "true")
	}
	if minify {
		params.Set("minify", "true")
	}

	url := fmt.Sprintf("%s/shodan/host/%s?%s", ShodanAPIBase, ip, params.Encode())
	
	var result HostInfo
	if err := c.doRequest("GET", url, nil, &result); err != nil {
		return nil, err
	}
	
	return &result, nil
}

// Search performs a Shodan search
func (c *Client) Search(query, facets string, page int, minify bool) (*SearchResult, error) {
	params := url.Values{}
	params.Set("key", c.apiKey)
	params.Set("query", query)
	if facets != "" {
		params.Set("facets", facets)
	}
	if page > 0 {
		params.Set("page", fmt.Sprintf("%d", page))
	}
	if minify {
		params.Set("minify", "true")
	}

	url := fmt.Sprintf("%s/shodan/host/search?%s", ShodanAPIBase, params.Encode())
	
	var result SearchResult
	if err := c.doRequest("GET", url, nil, &result); err != nil {
		return nil, err
	}
	
	return &result, nil
}

// SearchCount gets the number of results for a search query
func (c *Client) SearchCount(query, facets string) (map[string]interface{}, error) {
	params := url.Values{}
	params.Set("key", c.apiKey)
	params.Set("query", query)
	if facets != "" {
		params.Set("facets", facets)
	}

	url := fmt.Sprintf("%s/shodan/host/count?%s", ShodanAPIBase, params.Encode())
	
	var result map[string]interface{}
	if err := c.doRequest("GET", url, nil, &result); err != nil {
		return nil, err
	}
	
	return result, nil
}

// DNSResolve resolves hostnames to IP addresses
func (c *Client) DNSResolve(hostnames []string) (map[string]string, error) {
	params := url.Values{}
	params.Set("key", c.apiKey)
	params.Set("hostnames", strings.Join(hostnames, ","))

	url := fmt.Sprintf("%s/dns/resolve?%s", ShodanAPIBase, params.Encode())
	
	var result map[string]string
	if err := c.doRequest("GET", url, nil, &result); err != nil {
		return nil, err
	}
	
	return result, nil
}

// DNSReverse performs reverse DNS lookup
func (c *Client) DNSReverse(ips []string) (map[string][]string, error) {
	params := url.Values{}
	params.Set("key", c.apiKey)
	params.Set("ips", strings.Join(ips, ","))

	url := fmt.Sprintf("%s/dns/reverse?%s", ShodanAPIBase, params.Encode())
	
	var result map[string][]string
	if err := c.doRequest("GET", url, nil, &result); err != nil {
		return nil, err
	}
	
	return result, nil
}

// GetDomainInfo gets information about a domain
func (c *Client) GetDomainInfo(domain string, history bool, recordType string, page int) (*DNSDomain, error) {
	params := url.Values{}
	params.Set("key", c.apiKey)
	if history {
		params.Set("history", "true")
	}
	if recordType != "" {
		params.Set("type", recordType)
	}
	if page > 0 {
		params.Set("page", fmt.Sprintf("%d", page))
	}

	url := fmt.Sprintf("%s/dns/domain/%s?%s", ShodanAPIBase, domain, params.Encode())
	
	var result DNSDomain
	if err := c.doRequest("GET", url, nil, &result); err != nil {
		return nil, err
	}
	
	return &result, nil
}

// Scan requests Shodan to scan IPs
func (c *Client) Scan(ips []string, force bool) (map[string]interface{}, error) {
	body := map[string]interface{}{
		"ips":   strings.Join(ips, ","),
		"force": force,
	}

	url := fmt.Sprintf("%s/shodan/scan?key=%s", ShodanAPIBase, c.apiKey)
	
	var result map[string]interface{}
	if err := c.doRequest("POST", url, body, &result); err != nil {
		return nil, err
	}
	
	return result, nil
}

// GetAccountProfile gets account profile information
func (c *Client) GetAccountProfile() (*AccountProfile, error) {
	url := fmt.Sprintf("%s/account/profile?key=%s", ShodanAPIBase, c.apiKey)
	
	var result AccountProfile
	if err := c.doRequest("GET", url, nil, &result); err != nil {
		return nil, err
	}
	
	return &result, nil
}

// GetMyIP gets the current external IP address
func (c *Client) GetMyIP() (string, error) {
	url := fmt.Sprintf("%s/tools/myip?key=%s", ShodanAPIBase, c.apiKey)
	
	var result map[string]string
	if err := c.doRequest("GET", url, nil, &result); err != nil {
		return "", err
	}
	
	ip, ok := result["ip"]
	if !ok {
		return "", fmt.Errorf("IP not found in response")
	}
	
	return ip, nil
}

// ListAlerts lists all alerts for the account
func (c *Client) ListAlerts() ([]Alert, error) {
	url := fmt.Sprintf("%s/shodan/alert?key=%s", ShodanAPIBase, c.apiKey)
	
	var result []Alert
	if err := c.doRequest("GET", url, nil, &result); err != nil {
		return nil, err
	}
	
	return result, nil
}

// doRequest performs an HTTP request
func (c *Client) doRequest(method, url string, body interface{}, result interface{}) error {
	logger.Get().Debug("[Shodan] %s %s", method, url)
	
	var bodyReader io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("failed to marshal request body: %w", err)
		}
		bodyReader = strings.NewReader(string(b))
	}
	
	req, err := http.NewRequest(method, url, bodyReader)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}
	
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()
	
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response: %w", err)
	}
	
	if resp.StatusCode != http.StatusOK {
		var errResp struct {
			Error string `json:"error"`
		}
		if json.Unmarshal(respBody, &errResp) == nil && errResp.Error != "" {
			return fmt.Errorf("API error: %s", errResp.Error)
		}
		return fmt.Errorf("API returned status %d: %s", resp.StatusCode, string(respBody))
	}
	
	if err := json.Unmarshal(respBody, result); err != nil {
		return fmt.Errorf("failed to unmarshal response: %w", err)
	}
	
	return nil
}