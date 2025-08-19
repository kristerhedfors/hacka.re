"""
Shodan Search API Tests
=======================
Tests for exploring Shodan's search capabilities including host info, search queries,
facets, and filters. All tests use real Shodan API for accurate validation.
"""
import pytest
from playwright.sync_api import Page, expect
from shodan_utils import (
    send_shodan_query,
    extract_shodan_data,
    format_shodan_query,
    validate_shodan_response,
    extract_json_from_response
)


class TestShodanHostInfo:
    """Tests for Shodan host information retrieval"""
    
    def test_host_basic_info(self, shodan_chat_interface, shodan_test_targets):
        """Test retrieving basic host information for a known IP"""
        page = shodan_chat_interface
        target_ip = shodan_test_targets["google_dns"]
        
        # Query for host information
        query = format_shodan_query("host", ip=target_ip)
        response = send_shodan_query(page, query)
        
        # Extract and validate data
        data = extract_shodan_data(response)
        
        # Should contain key host information
        assert target_ip in response, f"Response should contain target IP {target_ip}"
        assert validate_shodan_response(response, ["port", "service"]), "Response should contain port and service info"
        
        # Check for structured data
        json_data = data.get("json_data")
        if json_data:
            assert "data" in json_data or "ports" in json_data, "JSON should contain host data"
    
    def test_host_with_history(self, shodan_chat_interface, shodan_test_targets):
        """Test retrieving host information with historical data"""
        page = shodan_chat_interface
        target_ip = shodan_test_targets["cloudflare_dns"]
        
        # Query with history parameter
        query = format_shodan_query("host", ip=target_ip, history=True)
        response = send_shodan_query(page, query)
        
        # Validate response contains historical context
        data = extract_shodan_data(response)
        assert target_ip in response, f"Response should contain target IP {target_ip}"
        
        # Look for temporal indicators
        temporal_keywords = ["last_update", "timestamp", "seen", "history"]
        assert any(keyword in response.lower() for keyword in temporal_keywords), \
            "Response should contain temporal/historical information"
    
    def test_host_minify_option(self, shodan_chat_interface, shodan_test_targets):
        """Test host info with minify option for reduced data"""
        page = shodan_chat_interface
        target_ip = shodan_test_targets["google_dns"]
        
        # Query with minify option
        query = format_shodan_query("host", ip=target_ip, minify=True)
        response = send_shodan_query(page, query)
        
        # Response should be more concise
        data = extract_shodan_data(response)
        assert target_ip in response, f"Response should contain target IP {target_ip}"
        
        # Minified response should still have essential info
        assert data["ports"] or "port" in response.lower(), "Should contain port information"


class TestShodanSearch:
    """Tests for Shodan search functionality"""
    
    def test_basic_search(self, shodan_chat_interface, shodan_test_targets):
        """Test basic Shodan search with simple query"""
        page = shodan_chat_interface
        search_query = shodan_test_targets["safe_query"]
        
        # Perform search
        query = format_shodan_query("search", query=search_query)
        response = send_shodan_query(page, query)
        
        # Validate search results
        data = extract_shodan_data(response)
        
        # Should contain search results
        assert "results" in response.lower() or data["ip_addresses"], \
            "Response should contain search results"
        assert validate_shodan_response(response, ["port", "443"]), \
            "Response should contain port 443 as specified in query"
    
    def test_search_with_facets(self, shodan_chat_interface, shodan_test_targets):
        """Test search with facet analysis"""
        page = shodan_chat_interface
        search_query = "apache"
        facets = shodan_test_targets["facet_fields"]
        
        # Search with facets
        query = format_shodan_query("search", query=search_query, facets=",".join(facets))
        response = send_shodan_query(page, query)
        
        # Should contain facet information
        data = extract_shodan_data(response)
        
        # Check for facet keywords
        for facet in facets:
            assert facet in response.lower(), f"Response should contain facet: {facet}"
        
        # Should have aggregated data
        assert "count" in response.lower() or "total" in response.lower(), \
            "Response should contain count/total information"
    
    def test_search_with_pagination(self, shodan_chat_interface):
        """Test search with pagination parameters"""
        page = shodan_chat_interface
        
        # Search with specific page
        query = format_shodan_query("search", query="nginx", page=2)
        response = send_shodan_query(page, query)
        
        # Validate paginated results
        data = extract_shodan_data(response)
        
        # Should have results
        assert data["ip_addresses"] or "results" in response.lower(), \
            "Response should contain search results"
        
        # Should indicate pagination context
        pagination_keywords = ["page", "results", "total", "matches"]
        assert any(keyword in response.lower() for keyword in pagination_keywords), \
            "Response should contain pagination context"
    
    def test_search_count(self, shodan_chat_interface, shodan_test_targets):
        """Test getting count of search results without full data"""
        page = shodan_chat_interface
        search_query = shodan_test_targets["safe_query"]
        
        # Get count only
        query = format_shodan_query("search_count", query=search_query)
        response = send_shodan_query(page, query)
        
        # Should contain count information
        assert "count" in response.lower() or "total" in response.lower() or \
               any(char.isdigit() for char in response), \
            "Response should contain numerical count"
        
        # Should not have detailed results
        data = extract_shodan_data(response)
        # Count query should be brief
        assert len(response) < 1000, "Count response should be concise"


class TestShodanFilters:
    """Tests for Shodan search filters and tokens"""
    
    def test_search_filters(self, shodan_chat_interface):
        """Test retrieving available search filters"""
        page = shodan_chat_interface
        
        # Get search filters
        query = format_shodan_query("search_filters")
        response = send_shodan_query(page, query)
        
        # Should list available filters
        filter_keywords = ["port", "country", "org", "hostname", "city", "os", "asn"]
        filters_found = sum(1 for keyword in filter_keywords if keyword in response.lower())
        
        assert filters_found >= 3, f"Response should contain at least 3 filter types, found {filters_found}"
        
        # Should explain filter usage
        assert "filter" in response.lower() or "search" in response.lower(), \
            "Response should explain filter context"
    
    def test_search_tokens(self, shodan_chat_interface):
        """Test search tokens for query building"""
        page = shodan_chat_interface
        
        # Get search tokens for a query
        query = format_shodan_query("search_tokens", query="apache port:443")
        response = send_shodan_query(page, query)
        
        # Should parse the query into tokens
        assert "apache" in response.lower(), "Response should contain 'apache' token"
        assert "443" in response or "port" in response.lower(), \
            "Response should contain port token"
        
        # Should show token structure
        token_keywords = ["token", "filter", "query", "attribute"]
        assert any(keyword in response.lower() for keyword in token_keywords), \
            "Response should explain token structure"
    
    def test_complex_filter_combination(self, shodan_chat_interface):
        """Test complex search with multiple filters"""
        page = shodan_chat_interface
        
        # Complex multi-filter search
        complex_query = 'country:"US" port:443 org:"Google" http.title:"Example"'
        query = format_shodan_query("search", query=complex_query)
        response = send_shodan_query(page, query)
        
        # Validate complex filtering
        data = extract_shodan_data(response)
        
        # Should process all filters
        assert "US" in response or "United States" in response or "country" in response.lower(), \
            "Response should reflect country filter"
        assert "443" in response or "https" in response.lower(), \
            "Response should reflect port filter"
        
        # Should return filtered results or indicate the filter criteria
        assert data["ip_addresses"] or "no results" in response.lower() or "matches" in response.lower(), \
            "Response should contain results or indicate search status"


class TestShodanExploits:
    """Tests for exploit and vulnerability searches"""
    
    def test_search_exploits(self, shodan_chat_interface):
        """Test searching for exploits"""
        page = shodan_chat_interface
        
        # Search for Apache exploits
        query = format_shodan_query("search_exploits", query="apache")
        response = send_shodan_query(page, query)
        
        # Should contain exploit information
        exploit_keywords = ["exploit", "vulnerability", "cve", "security", "patch"]
        keywords_found = sum(1 for keyword in exploit_keywords if keyword in response.lower())
        
        assert keywords_found >= 2, f"Response should contain exploit-related information, found {keywords_found} keywords"
        
        # May contain CVE identifiers
        data = extract_shodan_data(response)
        if data["vulnerabilities"]:
            assert any(cve.startswith("CVE-") for cve in data["vulnerabilities"]), \
                "CVE identifiers should be properly formatted"
    
    def test_exploit_count(self, shodan_chat_interface):
        """Test getting count of available exploits"""
        page = shodan_chat_interface
        
        # Get exploit count for a service
        query = format_shodan_query("exploits_count", query="wordpress")
        response = send_shodan_query(page, query)
        
        # Should contain count
        assert any(char.isdigit() for char in response), \
            "Response should contain numerical count"
        
        # Should mention exploits or vulnerabilities
        assert "exploit" in response.lower() or "vulnerabilit" in response.lower(), \
            "Response should mention exploits or vulnerabilities"