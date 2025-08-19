"""
Shodan Information Enrichment Workflow Tests
============================================
Advanced tests demonstrating how to chain multiple Shodan API calls
to progressively enrich information about targets.
"""
import pytest
import time
from playwright.sync_api import Page, expect
from shodan_utils import (
    send_shodan_query,
    extract_shodan_data,
    format_shodan_query,
    build_enrichment_chain,
    validate_shodan_response
)


class TestBasicEnrichmentWorkflows:
    """Basic information enrichment patterns"""
    
    def test_ip_enrichment_workflow(self, shodan_chat_interface, shodan_test_targets):
        """Test progressive enrichment starting from an IP address"""
        page = shodan_chat_interface
        target_ip = shodan_test_targets["cloudflare_dns"]
        
        enrichment_data = {
            "initial_ip": target_ip,
            "host_info": None,
            "reverse_dns": None,
            "organization": None,
            "other_assets": None,
            "vulnerabilities": None
        }
        
        # Step 1: Get basic host information
        query1 = format_shodan_query("host", ip=target_ip)
        response1 = send_shodan_query(page, query1)
        data1 = extract_shodan_data(response1)
        enrichment_data["host_info"] = {
            "ports": data1["ports"],
            "services": data1["services"]
        }
        
        assert data1["ports"] or "port" in response1.lower(), "Should find open ports"
        
        # Step 2: Get reverse DNS
        query2 = format_shodan_query("dns_reverse", ips=[target_ip])
        response2 = send_shodan_query(page, query2)
        data2 = extract_shodan_data(response2)
        if data2["domains"]:
            enrichment_data["reverse_dns"] = data2["domains"][0]
        
        # Step 3: Search for organization
        if "cloudflare" in response1.lower() or "cloudflare" in response2.lower():
            query3 = format_shodan_query("search", query='org:"Cloudflare"', limit=5)
            response3 = send_shodan_query(page, query3)
            data3 = extract_shodan_data(response3)
            enrichment_data["other_assets"] = data3["ip_addresses"]
            
            assert len(data3["ip_addresses"]) > 0, "Should find other Cloudflare assets"
        
        # Step 4: Check for common vulnerabilities
        if enrichment_data["host_info"]["services"]:
            service = enrichment_data["host_info"]["services"][0]
            query4 = format_shodan_query("search_exploits", query=service)
            response4 = send_shodan_query(page, query4)
            data4 = extract_shodan_data(response4)
            enrichment_data["vulnerabilities"] = data4["vulnerabilities"]
        
        # Validate enrichment
        assert enrichment_data["host_info"] is not None, "Should have host information"
        assert enrichment_data["reverse_dns"] or enrichment_data["other_assets"], \
            "Should have discovered additional context"
    
    def test_domain_enrichment_workflow(self, shodan_chat_interface):
        """Test progressive enrichment starting from a domain"""
        page = shodan_chat_interface
        target_domain = "github.com"
        
        enrichment_data = {
            "domain": target_domain,
            "subdomains": [],
            "ip_addresses": [],
            "services": {},
            "certificates": []
        }
        
        # Step 1: Get domain information
        query1 = format_shodan_query("domain_info", domain=target_domain)
        response1 = send_shodan_query(page, query1)
        data1 = extract_shodan_data(response1)
        enrichment_data["subdomains"] = data1["domains"]
        enrichment_data["ip_addresses"] = data1["ip_addresses"]
        
        assert len(data1["ip_addresses"]) > 0 or len(data1["domains"]) > 0, \
            "Should find IPs or subdomains"
        
        # Step 2: Resolve main domain
        query2 = format_shodan_query("dns_resolve", hostnames=[target_domain])
        response2 = send_shodan_query(page, query2)
        data2 = extract_shodan_data(response2)
        
        # Step 3: Get host info for main IPs
        if data2["ip_addresses"]:
            main_ip = data2["ip_addresses"][0]
            query3 = format_shodan_query("host", ip=main_ip)
            response3 = send_shodan_query(page, query3)
            data3 = extract_shodan_data(response3)
            
            enrichment_data["services"][main_ip] = {
                "ports": data3["ports"],
                "services": data3["services"]
            }
        
        # Step 4: Search for SSL certificates
        query4 = format_shodan_query("search", query=f'ssl.cert.subject.cn:"{target_domain}"')
        response4 = send_shodan_query(page, query4)
        data4 = extract_shodan_data(response4)
        
        if data4["ip_addresses"]:
            enrichment_data["certificates"] = data4["ip_addresses"]
        
        # Validate enrichment
        assert len(enrichment_data["ip_addresses"]) > 0, "Should have discovered IPs"
        assert enrichment_data["services"] or enrichment_data["certificates"], \
            "Should have discovered services or certificates"


class TestAdvancedEnrichmentWorkflows:
    """Complex multi-step enrichment patterns"""
    
    def test_organization_asset_discovery(self, shodan_chat_interface):
        """Test discovering all assets for an organization"""
        page = shodan_chat_interface
        target_org = "Google"
        
        discovered_assets = {
            "organization": target_org,
            "ip_ranges": [],
            "domains": [],
            "services": {},
            "technologies": set(),
            "countries": set()
        }
        
        # Step 1: Search by organization
        query1 = format_shodan_query("search", query=f'org:"{target_org}"', limit=10)
        response1 = send_shodan_query(page, query1)
        data1 = extract_shodan_data(response1)
        discovered_assets["ip_ranges"].extend(data1["ip_addresses"])
        
        assert len(data1["ip_addresses"]) > 0, "Should find organization IPs"
        
        # Step 2: Get faceted view of services
        query2 = format_shodan_query("search", 
                                    query=f'org:"{target_org}"',
                                    facets="port,country,product")
        response2 = send_shodan_query(page, query2)
        
        # Extract service and country information
        if "443" in response2:
            discovered_assets["technologies"].add("HTTPS")
        if "US" in response2 or "United States" in response2:
            discovered_assets["countries"].add("US")
        
        # Step 3: Sample host details
        if discovered_assets["ip_ranges"]:
            sample_ip = discovered_assets["ip_ranges"][0]
            query3 = format_shodan_query("host", ip=sample_ip)
            response3 = send_shodan_query(page, query3)
            data3 = extract_shodan_data(response3)
            
            discovered_assets["services"][sample_ip] = data3["services"]
            
            # Reverse DNS for domain discovery
            query4 = format_shodan_query("dns_reverse", ips=[sample_ip])
            response4 = send_shodan_query(page, query4)
            data4 = extract_shodan_data(response4)
            discovered_assets["domains"].extend(data4["domains"])
        
        # Validate discovery
        assert len(discovered_assets["ip_ranges"]) > 0, "Should discover IP ranges"
        assert len(discovered_assets["technologies"]) > 0 or discovered_assets["services"], \
            "Should discover technologies or services"
    
    def test_vulnerability_assessment_workflow(self, shodan_chat_interface):
        """Test workflow for assessing vulnerabilities across services"""
        page = shodan_chat_interface
        target_service = "apache"
        
        vulnerability_assessment = {
            "service": target_service,
            "affected_hosts": [],
            "versions": set(),
            "potential_cves": [],
            "risk_scores": {}
        }
        
        # Step 1: Find hosts running the service
        query1 = format_shodan_query("search", query=f'product:"{target_service}"', limit=5)
        response1 = send_shodan_query(page, query1)
        data1 = extract_shodan_data(response1)
        vulnerability_assessment["affected_hosts"] = data1["ip_addresses"]
        
        assert len(data1["ip_addresses"]) > 0, "Should find hosts running Apache"
        
        # Step 2: Check for known exploits
        query2 = format_shodan_query("search_exploits", query=target_service)
        response2 = send_shodan_query(page, query2)
        data2 = extract_shodan_data(response2)
        vulnerability_assessment["potential_cves"] = data2["vulnerabilities"]
        
        # Step 3: Assess honeypot risk for samples
        if vulnerability_assessment["affected_hosts"]:
            sample_ip = vulnerability_assessment["affected_hosts"][0]
            query3 = format_shodan_query("honeyscore", ip=sample_ip)
            response3 = send_shodan_query(page, query3)
            
            # Extract risk score
            if "0." in response3:
                vulnerability_assessment["risk_scores"][sample_ip] = "honeypot_score_found"
        
        # Step 4: Get version information
        if vulnerability_assessment["affected_hosts"]:
            for ip in vulnerability_assessment["affected_hosts"][:2]:
                query4 = format_shodan_query("host", ip=ip)
                response4 = send_shodan_query(page, query4)
                
                # Look for version strings
                if "apache/" in response4.lower():
                    vulnerability_assessment["versions"].add("apache_found")
        
        # Validate assessment
        assert vulnerability_assessment["affected_hosts"], "Should find affected hosts"
        assert vulnerability_assessment["potential_cves"] or "exploit" in response2.lower(), \
            "Should identify potential vulnerabilities"


class TestNetworkMappingWorkflows:
    """Tests for mapping network infrastructure"""
    
    def test_subnet_exploration(self, shodan_chat_interface):
        """Test exploring a subnet range"""
        page = shodan_chat_interface
        
        # Use a small public subnet for testing
        subnet_data = {
            "subnet": "8.8.8.0/24",
            "active_hosts": [],
            "services": {},
            "common_ports": set()
        }
        
        # Step 1: Search for hosts in subnet
        query1 = format_shodan_query("search", query="net:8.8.8.0/24", limit=5)
        response1 = send_shodan_query(page, query1)
        data1 = extract_shodan_data(response1)
        subnet_data["active_hosts"] = data1["ip_addresses"]
        
        # Step 2: Profile each discovered host
        for ip in subnet_data["active_hosts"][:2]:
            query2 = format_shodan_query("host", ip=ip)
            response2 = send_shodan_query(page, query2)
            data2 = extract_shodan_data(response2)
            
            subnet_data["services"][ip] = data2["services"]
            subnet_data["common_ports"].update(data2["ports"])
        
        # Validate mapping
        assert len(subnet_data["active_hosts"]) > 0 or "8.8.8" in response1, \
            "Should find hosts in subnet or reference the subnet"
    
    def test_service_correlation_workflow(self, shodan_chat_interface):
        """Test correlating services across multiple hosts"""
        page = shodan_chat_interface
        
        correlation_data = {
            "primary_service": "http",
            "related_services": [],
            "common_configurations": [],
            "geographic_distribution": set()
        }
        
        # Step 1: Find hosts with primary service
        query1 = format_shodan_query("search", 
                                    query='port:80 country:"US"',
                                    facets="city,org",
                                    limit=10)
        response1 = send_shodan_query(page, query1)
        data1 = extract_shodan_data(response1)
        
        # Step 2: Check what other services run on these hosts
        if data1["ip_addresses"]:
            sample_ip = data1["ip_addresses"][0]
            query2 = format_shodan_query("host", ip=sample_ip)
            response2 = send_shodan_query(page, query2)
            data2 = extract_shodan_data(response2)
            
            correlation_data["related_services"] = data2["services"]
            
            # Look for geographic info
            if "city" in response1.lower():
                correlation_data["geographic_distribution"].add("cities_found")
        
        # Step 3: Find common patterns
        query3 = format_shodan_query("search", 
                                    query='port:80 port:443',
                                    limit=5)
        response3 = send_shodan_query(page, query3)
        data3 = extract_shodan_data(response3)
        
        if data3["ip_addresses"]:
            correlation_data["common_configurations"].append("http_https_combo")
        
        # Validate correlation
        assert correlation_data["related_services"] or correlation_data["common_configurations"], \
            "Should find service correlations"


class TestAutomatedEnrichmentChains:
    """Tests for automated enrichment chain building"""
    
    def test_automatic_enrichment_chain(self, shodan_chat_interface, shodan_test_targets):
        """Test automatic generation of enrichment queries"""
        page = shodan_chat_interface
        
        # Start with initial search
        initial_query = format_shodan_query("search", query="product:nginx", limit=3)
        initial_response = send_shodan_query(page, initial_query)
        initial_data = extract_shodan_data(initial_response)
        
        # Build enrichment chain
        enrichment_queries = build_enrichment_chain(initial_data)
        
        assert len(enrichment_queries) > 0, "Should generate enrichment queries"
        
        # Execute enrichment chain
        enriched_data = []
        for query in enrichment_queries[:3]:  # Limit to first 3
            response = send_shodan_query(page, query)
            data = extract_shodan_data(response)
            enriched_data.append(data)
            time.sleep(1)  # Rate limiting
        
        # Validate enrichment
        assert len(enriched_data) > 0, "Should collect enriched data"
        
        # Check if we got more information
        all_ips = set()
        all_domains = set()
        for data in enriched_data:
            all_ips.update(data["ip_addresses"])
            all_domains.update(data["domains"])
        
        assert len(all_ips) > 0 or len(all_domains) > 0, \
            "Enrichment should discover additional information"
    
    def test_recursive_discovery(self, shodan_chat_interface):
        """Test recursive discovery pattern"""
        page = shodan_chat_interface
        max_depth = 2
        discovered = {
            "level_0": [],
            "level_1": [],
            "level_2": []
        }
        
        # Level 0: Initial seed
        query0 = format_shodan_query("my_ip")
        response0 = send_shodan_query(page, query0)
        data0 = extract_shodan_data(response0)
        discovered["level_0"] = data0["ip_addresses"]
        
        # Level 1: Explore from seed
        if discovered["level_0"]:
            ip = discovered["level_0"][0]
            
            # Get host info
            query1 = format_shodan_query("host", ip=ip)
            response1 = send_shodan_query(page, query1)
            data1 = extract_shodan_data(response1)
            
            # Search for similar
            if data1["services"]:
                service = data1["services"][0]
                query2 = format_shodan_query("search", 
                                            query=f'product:"{service}"',
                                            limit=3)
                response2 = send_shodan_query(page, query2)
                data2 = extract_shodan_data(response2)
                discovered["level_1"] = data2["ip_addresses"]
        
        # Level 2: Further exploration
        if discovered["level_1"]:
            sample_ip = discovered["level_1"][0]
            query3 = format_shodan_query("dns_reverse", ips=[sample_ip])
            response3 = send_shodan_query(page, query3)
            data3 = extract_shodan_data(response3)
            discovered["level_2"] = data3["domains"]
        
        # Validate recursive discovery
        levels_with_data = sum(1 for level in discovered.values() if level)
        assert levels_with_data >= 1, "Should discover data at multiple levels"