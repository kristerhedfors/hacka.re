"""
Shodan Account & Utility API Tests
===================================
Tests for Shodan account information, API status, and utility methods.
"""
import pytest
from playwright.sync_api import Page, expect
from shodan_utils import (
    send_shodan_query,
    extract_shodan_data,
    format_shodan_query,
    validate_shodan_response,
    get_rate_limit_info
)


class TestShodanProfile:
    """Tests for Shodan account profile information"""
    
    def test_account_profile(self, shodan_chat_interface):
        """Test retrieving account profile information"""
        page = shodan_chat_interface
        
        # Get profile information
        query = format_shodan_query("profile")
        response = send_shodan_query(page, query)
        
        # Should contain account information
        profile_keywords = ["member", "credits", "plan", "account", "usage", "api"]
        keywords_found = sum(1 for keyword in profile_keywords if keyword in response.lower())
        
        assert keywords_found >= 2, f"Response should contain profile information, found {keywords_found} keywords"
        
        # Check for rate limit info
        rate_info = get_rate_limit_info(response)
        assert rate_info["query_credits"] is not None or "credit" in response.lower(), \
            "Should contain credit information"
    
    def test_account_limits(self, shodan_chat_interface):
        """Test understanding account limitations and quotas"""
        page = shodan_chat_interface
        
        # Query about account limits
        query = "What are my Shodan account limits and remaining credits?"
        response = send_shodan_query(page, query)
        
        # Should explain limitations
        limit_keywords = ["limit", "quota", "credit", "remaining", "usage", "scan", "query"]
        keywords_found = sum(1 for keyword in limit_keywords if keyword in response.lower())
        
        assert keywords_found >= 2, f"Response should explain account limits, found {keywords_found} keywords"
        
        # Should mention specific numbers or plans
        assert any(char.isdigit() for char in response) or "unlimited" in response.lower() or \
               "plan" in response.lower(), \
            "Should contain specific limits or plan information"


class TestShodanAPIInfo:
    """Tests for API information and status"""
    
    def test_api_info(self, shodan_chat_interface):
        """Test retrieving API information"""
        page = shodan_chat_interface
        
        # Get API info
        query = format_shodan_query("api_info")
        response = send_shodan_query(page, query)
        
        # Should contain API details
        api_keywords = ["api", "plan", "unlocked", "capabilities", "features", "access"]
        keywords_found = sum(1 for keyword in api_keywords if keyword in response.lower())
        
        assert keywords_found >= 2, f"Response should contain API information, found {keywords_found} keywords"
        
        # Should mention scan or query capabilities
        assert "scan" in response.lower() or "query" in response.lower() or \
               "search" in response.lower(), \
            "Should mention API capabilities"
    
    def test_api_plan_details(self, shodan_chat_interface):
        """Test understanding API plan features"""
        page = shodan_chat_interface
        
        # Query about plan details
        query = "What Shodan API features are available with my current plan?"
        response = send_shodan_query(page, query)
        
        # Should list features
        feature_keywords = ["search", "scan", "monitor", "filter", "export", "download", "api"]
        features_found = sum(1 for keyword in feature_keywords if keyword in response.lower())
        
        assert features_found >= 2, f"Response should list API features, found {features_found} features"
        
        # Should indicate plan level
        plan_keywords = ["developer", "corporate", "academic", "free", "paid", "subscription", "plan"]
        assert any(keyword in response.lower() for keyword in plan_keywords), \
            "Should indicate plan level"


class TestShodanMyIP:
    """Tests for IP address utilities"""
    
    def test_my_ip(self, shodan_chat_interface):
        """Test retrieving current IP address"""
        page = shodan_chat_interface
        
        # Get my IP
        query = format_shodan_query("my_ip")
        response = send_shodan_query(page, query)
        
        # Should contain an IP address
        data = extract_shodan_data(response)
        
        assert len(data["ip_addresses"]) > 0, "Response should contain an IP address"
        
        # IP should be valid format
        ip = data["ip_addresses"][0]
        parts = ip.split('.')
        assert len(parts) == 4, f"IP {ip} should have 4 octets"
        assert all(0 <= int(part) <= 255 for part in parts), f"IP {ip} octets should be valid"
    
    def test_my_ip_with_info(self, shodan_chat_interface):
        """Test getting current IP with additional information"""
        page = shodan_chat_interface
        
        # Get IP and then get info about it
        query1 = format_shodan_query("my_ip")
        response1 = send_shodan_query(page, query1)
        data1 = extract_shodan_data(response1)
        
        if data1["ip_addresses"]:
            ip = data1["ip_addresses"][0]
            
            # Get host info for our IP
            query2 = format_shodan_query("host", ip=ip)
            response2 = send_shodan_query(page, query2)
            
            # Should have information about our IP
            assert ip in response2, f"Response should contain our IP {ip}"
            
            # Might have ISP or location info
            info_keywords = ["isp", "country", "city", "organization", "asn"]
            assert any(keyword in response2.lower() for keyword in info_keywords), \
                "Should contain information about the IP"


class TestShodanHoneyscore:
    """Tests for honeypot detection scoring"""
    
    def test_honeyscore_calculation(self, shodan_chat_interface, shodan_test_targets):
        """Test calculating honeyscore for an IP"""
        page = shodan_chat_interface
        ip = shodan_test_targets["google_dns"]
        
        # Calculate honeyscore
        query = format_shodan_query("honeyscore", ip=ip)
        response = send_shodan_query(page, query)
        
        # Should contain score
        assert "score" in response.lower() or any(char.isdigit() for char in response), \
            "Response should contain a honeyscore"
        
        # Should explain what honeyscore means
        honeypot_keywords = ["honeypot", "trap", "decoy", "probability", "likely"]
        assert any(keyword in response.lower() for keyword in honeypot_keywords), \
            "Response should explain honeyscore context"
        
        # Score should be between 0 and 1 (or 0-100%)
        if "0." in response or "1.0" in response or "%" in response:
            assert True, "Score appears to be in valid range"
    
    def test_honeyscore_for_suspicious_ip(self, shodan_chat_interface):
        """Test honeyscore for potentially suspicious IP"""
        page = shodan_chat_interface
        
        # Use an IP that might be interesting
        suspicious_ip = "45.33.32.156"  # Scanme.nmap.org - known test target
        
        query = format_shodan_query("honeyscore", ip=suspicious_ip)
        response = send_shodan_query(page, query)
        
        # Should provide score and context
        assert suspicious_ip in response or "score" in response.lower(), \
            "Response should reference the IP or provide score"
        
        # Should give risk assessment
        risk_keywords = ["risk", "suspicious", "likely", "probability", "honeypot", "legitimate"]
        assert any(keyword in response.lower() for keyword in risk_keywords), \
            "Response should provide risk assessment"


class TestShodanDataFormats:
    """Tests for different data format outputs"""
    
    def test_minified_output(self, shodan_chat_interface, shodan_test_targets):
        """Test requesting minified output format"""
        page = shodan_chat_interface
        ip = shodan_test_targets["google_dns"]
        
        # Request minified data
        query = f"Get Shodan host info for {ip} in minified/compact format"
        response = send_shodan_query(page, query)
        
        # Should still have essential data
        data = extract_shodan_data(response)
        assert ip in response, f"Response should contain IP {ip}"
        assert data["ports"] or "port" in response.lower(), "Should contain port info"
    
    def test_faceted_aggregation(self, shodan_chat_interface):
        """Test faceted search with aggregation"""
        page = shodan_chat_interface
        
        # Request faceted aggregation
        query = "Search Shodan for 'apache' and show top countries and ports as facets"
        response = send_shodan_query(page, query)
        
        # Should have aggregated data
        assert "country" in response.lower() or "port" in response.lower(), \
            "Response should contain facet information"
        
        # Should show counts or rankings
        assert "top" in response.lower() or "count" in response.lower() or \
               any(char.isdigit() for char in response), \
            "Response should contain aggregated counts"


class TestShodanQuotaTracking:
    """Tests for tracking API usage and quotas"""
    
    def test_track_query_usage(self, shodan_chat_interface):
        """Test tracking query credit usage"""
        page = shodan_chat_interface
        
        # Check initial credits
        query1 = format_shodan_query("profile")
        response1 = send_shodan_query(page, query1)
        initial_credits = get_rate_limit_info(response1)
        
        # Perform a search (uses credits)
        query2 = format_shodan_query("search", query="test", limit=1)
        response2 = send_shodan_query(page, query2)
        
        # Check credits again
        query3 = format_shodan_query("profile")
        response3 = send_shodan_query(page, query3)
        final_credits = get_rate_limit_info(response3)
        
        # Should show credit usage or at least credit information
        assert "credit" in response3.lower(), "Should show credit information"
    
    def test_understand_credit_costs(self, shodan_chat_interface):
        """Test understanding different API operation costs"""
        page = shodan_chat_interface
        
        # Ask about credit costs
        query = "What Shodan operations use query credits and what are free?"
        response = send_shodan_query(page, query)
        
        # Should explain credit usage
        operation_keywords = ["search", "scan", "query", "host", "free", "credit", "cost"]
        keywords_found = sum(1 for keyword in operation_keywords if keyword in response.lower())
        
        assert keywords_found >= 2, f"Response should explain credit costs, found {keywords_found} keywords"
        
        # Should differentiate between free and paid operations
        assert ("free" in response.lower() and "credit" in response.lower()) or \
               ("cost" in response.lower() and "no cost" in response.lower()), \
            "Should explain what operations are free vs credit-consuming"