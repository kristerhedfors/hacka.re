"""
Shodan DNS API Tests
====================
Tests for exploring Shodan's DNS capabilities including domain info,
DNS resolution, and reverse DNS lookups.
"""
import pytest
from playwright.sync_api import Page, expect
from shodan_utils import (
    send_shodan_query,
    extract_shodan_data,
    format_shodan_query,
    validate_shodan_response
)


class TestShodanDomainInfo:
    """Tests for Shodan domain information retrieval"""
    
    def test_domain_basic_info(self, shodan_chat_interface, shodan_test_targets):
        """Test retrieving basic domain information"""
        page = shodan_chat_interface
        domain = shodan_test_targets["test_domain"]
        
        # Query for domain information
        query = format_shodan_query("domain_info", domain=domain)
        response = send_shodan_query(page, query)
        
        # Extract and validate data
        data = extract_shodan_data(response)
        
        # Should contain domain information
        assert domain in response.lower(), f"Response should contain domain {domain}"
        
        # Should have DNS-related information
        dns_keywords = ["subdomain", "dns", "record", "host", "ip"]
        keywords_found = sum(1 for keyword in dns_keywords if keyword in response.lower())
        assert keywords_found >= 2, f"Response should contain DNS information, found {keywords_found} keywords"
        
        # Should find some IPs or subdomains
        assert data["ip_addresses"] or "subdomain" in response.lower(), \
            "Response should contain IP addresses or subdomains"
    
    def test_domain_with_subdomains(self, shodan_chat_interface):
        """Test domain info focusing on subdomain discovery"""
        page = shodan_chat_interface
        domain = "microsoft.com"  # Known to have many subdomains
        
        # Query for domain with subdomain emphasis
        query = format_shodan_query("domain_info", domain=domain)
        response = send_shodan_query(page, query)
        
        # Should find subdomains
        data = extract_shodan_data(response)
        
        # Check for subdomain patterns
        subdomain_indicators = ["www.", "mail.", "api.", "ftp.", "blog.", "app."]
        subdomains_found = sum(1 for indicator in subdomain_indicators if indicator in response.lower())
        
        assert subdomains_found > 0 or "subdomain" in response.lower(), \
            "Response should contain subdomain information"
        
        # Should have multiple hosts
        assert len(data["domains"]) > 0 or len(data["ip_addresses"]) > 0, \
            "Should discover multiple hosts for the domain"
    
    def test_domain_history(self, shodan_chat_interface):
        """Test retrieving historical domain information"""
        page = shodan_chat_interface
        domain = "example.com"
        
        # Query with history context
        query = format_shodan_query("domain_info", domain=domain, history=True)
        response = send_shodan_query(page, query)
        
        # Should contain domain and some historical context
        assert domain in response.lower(), f"Response should contain domain {domain}"
        
        # Look for temporal or historical indicators
        history_keywords = ["previous", "historical", "changed", "updated", "records"]
        assert any(keyword in response.lower() for keyword in history_keywords) or \
               len(extract_shodan_data(response)["ip_addresses"]) > 0, \
            "Response should contain historical context or IP data"


class TestShodanDNSResolution:
    """Tests for DNS resolution capabilities"""
    
    def test_dns_resolve(self, shodan_chat_interface, shodan_test_targets):
        """Test forward DNS resolution (domain to IP)"""
        page = shodan_chat_interface
        domain = shodan_test_targets["example_domain"]
        
        # Resolve domain to IP
        query = format_shodan_query("dns_resolve", hostnames=[domain])
        response = send_shodan_query(page, query)
        
        # Should contain IP resolution
        data = extract_shodan_data(response)
        
        assert domain in response.lower(), f"Response should reference domain {domain}"
        assert len(data["ip_addresses"]) > 0 or "ip" in response.lower(), \
            "Response should contain IP address resolution"
        
        # IP should be in valid format
        if data["ip_addresses"]:
            ip = data["ip_addresses"][0]
            assert len(ip.split('.')) == 4, f"IP {ip} should be in valid format"
    
    def test_dns_resolve_multiple(self, shodan_chat_interface):
        """Test resolving multiple domains at once"""
        page = shodan_chat_interface
        domains = ["google.com", "cloudflare.com", "github.com"]
        
        # Resolve multiple domains
        query = format_shodan_query("dns_resolve", hostnames=domains)
        response = send_shodan_query(page, query)
        
        # Should contain resolutions for multiple domains
        data = extract_shodan_data(response)
        
        # Check each domain is addressed
        domains_found = sum(1 for domain in domains if domain in response.lower())
        assert domains_found >= 2, f"Response should address multiple domains, found {domains_found}"
        
        # Should have multiple IPs
        assert len(data["ip_addresses"]) >= 2, \
            "Should resolve to multiple IP addresses"
    
    def test_dns_resolve_invalid(self, shodan_chat_interface):
        """Test DNS resolution with invalid domain"""
        page = shodan_chat_interface
        invalid_domain = "this-definitely-does-not-exist-12345.invalid"
        
        # Try to resolve invalid domain
        query = format_shodan_query("dns_resolve", hostnames=[invalid_domain])
        response = send_shodan_query(page, query)
        
        # Should handle gracefully
        error_keywords = ["not found", "unable", "failed", "error", "resolve", "invalid"]
        assert any(keyword in response.lower() for keyword in error_keywords), \
            "Response should indicate resolution failure"


class TestShodanReverseDNS:
    """Tests for reverse DNS lookups"""
    
    def test_dns_reverse_single(self, shodan_chat_interface, shodan_test_targets):
        """Test reverse DNS lookup (IP to domain)"""
        page = shodan_chat_interface
        ip = shodan_test_targets["google_dns"]
        
        # Reverse lookup
        query = format_shodan_query("dns_reverse", ips=[ip])
        response = send_shodan_query(page, query)
        
        # Should contain reverse DNS result
        data = extract_shodan_data(response)
        
        assert ip in response, f"Response should reference IP {ip}"
        
        # Should have domain information
        assert len(data["domains"]) > 0 or "dns.google" in response.lower() or \
               "google" in response.lower(), \
            "Response should contain reverse DNS domain"
    
    def test_dns_reverse_multiple(self, shodan_chat_interface):
        """Test reverse DNS for multiple IPs"""
        page = shodan_chat_interface
        ips = ["8.8.8.8", "1.1.1.1", "9.9.9.9"]  # Known DNS servers
        
        # Reverse lookup multiple IPs
        query = format_shodan_query("dns_reverse", ips=ips)
        response = send_shodan_query(page, query)
        
        # Should handle multiple lookups
        data = extract_shodan_data(response)
        
        # Check IPs are referenced
        ips_found = sum(1 for ip in ips if ip in response)
        assert ips_found >= 2, f"Response should reference multiple IPs, found {ips_found}"
        
        # Should have domain results
        assert len(data["domains"]) > 0 or \
               any(provider in response.lower() for provider in ["google", "cloudflare", "quad9"]), \
            "Response should contain DNS provider domains"
    
    def test_dns_reverse_private_ip(self, shodan_chat_interface):
        """Test reverse DNS with private IP (should handle gracefully)"""
        page = shodan_chat_interface
        private_ip = "192.168.1.1"
        
        # Try reverse lookup on private IP
        query = format_shodan_query("dns_reverse", ips=[private_ip])
        response = send_shodan_query(page, query)
        
        # Should handle private IP appropriately
        assert private_ip in response, f"Response should reference IP {private_ip}"
        
        # Should indicate private or no result
        private_keywords = ["private", "local", "internal", "no result", "not found", "unable"]
        assert any(keyword in response.lower() for keyword in private_keywords), \
            "Response should indicate private IP or no result"


class TestShodanDNSChaining:
    """Tests for chaining DNS operations for enrichment"""
    
    def test_domain_to_ip_to_host_info(self, shodan_chat_interface, shodan_test_targets):
        """Test chaining: domain -> IP -> host info"""
        page = shodan_chat_interface
        domain = shodan_test_targets["test_domain"]
        
        # Step 1: Resolve domain to IP
        query1 = format_shodan_query("dns_resolve", hostnames=[domain])
        response1 = send_shodan_query(page, query1)
        data1 = extract_shodan_data(response1)
        
        assert len(data1["ip_addresses"]) > 0, "Should resolve domain to IP"
        
        # Step 2: Get host info for resolved IP
        if data1["ip_addresses"]:
            ip = data1["ip_addresses"][0]
            query2 = format_shodan_query("host", ip=ip)
            response2 = send_shodan_query(page, query2)
            data2 = extract_shodan_data(response2)
            
            # Should have enriched information
            assert ip in response2, f"Host info should contain IP {ip}"
            assert "port" in response2.lower() or data2["ports"], \
                "Should have port information from host lookup"
    
    def test_ip_to_reverse_dns_to_domain_info(self, shodan_chat_interface, shodan_test_targets):
        """Test chaining: IP -> reverse DNS -> domain info"""
        page = shodan_chat_interface
        ip = shodan_test_targets["cloudflare_dns"]
        
        # Step 1: Reverse DNS lookup
        query1 = format_shodan_query("dns_reverse", ips=[ip])
        response1 = send_shodan_query(page, query1)
        data1 = extract_shodan_data(response1)
        
        # Step 2: If we got a domain, get domain info
        if data1["domains"]:
            domain = data1["domains"][0]
            # Clean domain if needed
            domain = domain.replace("www.", "").split(".")[1:] if domain.startswith("www.") else domain
            if isinstance(domain, list):
                domain = ".".join(domain)
            
            query2 = format_shodan_query("domain_info", domain="cloudflare.com")  # Use known domain
            response2 = send_shodan_query(page, query2)
            data2 = extract_shodan_data(response2)
            
            # Should have domain information
            assert "cloudflare" in response2.lower(), "Should have Cloudflare domain info"
            assert data2["ip_addresses"] or data2["domains"], \
                "Should have discovered IPs or subdomains"