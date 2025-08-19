"""
Utility functions for Shodan MCP testing
=========================================
Helper functions for interacting with Shodan API through the MCP interface.
"""
import json
import re
import time
from typing import Dict, Any, List, Optional
from playwright.sync_api import Page


def send_shodan_query(page: Page, query: str) -> str:
    """
    Send a query to the chat interface and get the response.
    
    Args:
        page: Playwright page object
        query: The query to send
        
    Returns:
        The response text from the assistant
    """
    chat_input = page.locator("#userInput")
    chat_input.fill(query)
    
    send_btn = page.locator("#sendButton")
    send_btn.click()
    
    # Wait for response to appear
    page.wait_for_selector(".message.assistant", timeout=10000)
    page.wait_for_timeout(2000)  # Additional wait for complete response
    
    # Get the last assistant message
    messages = page.locator(".message.assistant").all()
    if messages:
        return messages[-1].text_content()
    return ""


def extract_json_from_response(response: str) -> Optional[Dict[str, Any]]:
    """
    Extract JSON data from a chat response.
    
    Args:
        response: The response text
        
    Returns:
        Parsed JSON data or None if not found
    """
    # Try to find JSON blocks in various formats
    patterns = [
        r'```json\s*(.*?)\s*```',  # JSON code blocks
        r'```\s*(.*?)\s*```',       # Generic code blocks
        r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}',  # Raw JSON objects
    ]
    
    for pattern in patterns:
        matches = re.findall(pattern, response, re.DOTALL)
        for match in matches:
            try:
                # Clean up the match
                if isinstance(match, str):
                    cleaned = match.strip()
                    if cleaned:
                        return json.loads(cleaned)
            except json.JSONDecodeError:
                continue
    
    return None


def extract_shodan_data(response: str) -> Dict[str, Any]:
    """
    Extract Shodan-specific data from a response.
    
    Args:
        response: The response text
        
    Returns:
        Dictionary with extracted data
    """
    data = {
        "raw_response": response,
        "json_data": None,
        "ip_addresses": [],
        "domains": [],
        "ports": [],
        "services": [],
        "vulnerabilities": [],
        "organizations": [],
        "countries": [],
        "asn": [],
        "hostnames": []
    }
    
    # Try to extract JSON
    json_data = extract_json_from_response(response)
    if json_data:
        data["json_data"] = json_data
    
    # Extract IP addresses
    ip_pattern = r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b'
    data["ip_addresses"] = list(set(re.findall(ip_pattern, response)))
    
    # Extract domains
    domain_pattern = r'\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}\b'
    data["domains"] = list(set(re.findall(domain_pattern, response)))
    
    # Extract ports
    port_pattern = r'\bport[:\s]+(\d{1,5})\b'
    data["ports"] = list(set(re.findall(port_pattern, response, re.IGNORECASE)))
    
    # Extract services
    service_keywords = ["http", "https", "ssh", "ftp", "telnet", "smtp", "dns", "mongodb", "mysql", "postgresql", "redis"]
    for service in service_keywords:
        if service.lower() in response.lower():
            data["services"].append(service)
    
    # Extract CVEs
    cve_pattern = r'CVE-\d{4}-\d{4,}'
    data["vulnerabilities"] = list(set(re.findall(cve_pattern, response)))
    
    return data


def build_enrichment_chain(initial_data: Dict[str, Any]) -> List[str]:
    """
    Build a chain of queries for information enrichment based on initial data.
    
    Args:
        initial_data: The initial data from a Shodan query
        
    Returns:
        List of follow-up queries for enrichment
    """
    queries = []
    
    # If we have IP addresses, get detailed host info
    for ip in initial_data.get("ip_addresses", [])[:3]:  # Limit to first 3
        queries.append(f"Get detailed Shodan host information for IP {ip}")
        queries.append(f"Check the honeyscore for IP {ip}")
    
    # If we have domains, do DNS lookups
    for domain in initial_data.get("domains", [])[:2]:  # Limit to first 2
        queries.append(f"Get Shodan DNS information for domain {domain}")
        queries.append(f"Resolve DNS for {domain}")
    
    # If we have services, search for similar
    for service in initial_data.get("services", [])[:2]:
        queries.append(f"Search Shodan for other hosts running {service}")
    
    # If we have vulnerabilities, search for affected systems
    for cve in initial_data.get("vulnerabilities", [])[:1]:
        queries.append(f"Search Shodan for systems vulnerable to {cve}")
    
    return queries


def validate_shodan_response(response: str, expected_fields: List[str]) -> bool:
    """
    Validate that a Shodan response contains expected fields.
    
    Args:
        response: The response text
        expected_fields: List of fields that should be present
        
    Returns:
        True if all expected fields are found
    """
    response_lower = response.lower()
    
    for field in expected_fields:
        if field.lower() not in response_lower:
            return False
    
    return True


def get_rate_limit_info(response: str) -> Dict[str, Any]:
    """
    Extract rate limit information from a response.
    
    Args:
        response: The response text
        
    Returns:
        Dictionary with rate limit info
    """
    info = {
        "query_credits": None,
        "scan_credits": None,
        "monitored_ips": None,
        "usage_limits": None
    }
    
    # Look for credit information
    credit_pattern = r'(?:query|scan)\s+credits?[:\s]+(\d+)'
    credits = re.findall(credit_pattern, response, re.IGNORECASE)
    if credits:
        info["query_credits"] = credits[0] if len(credits) > 0 else None
        info["scan_credits"] = credits[1] if len(credits) > 1 else None
    
    return info


def wait_for_mcp_connection(page: Page, timeout: int = 10000) -> bool:
    """
    Wait for MCP connection to be established.
    
    Args:
        page: Playwright page object
        timeout: Maximum time to wait in milliseconds
        
    Returns:
        True if connection established, False otherwise
    """
    try:
        # Check for MCP indicator or connection status
        page.wait_for_selector(".mcp-connected, .mcp-status-connected", timeout=timeout)
        return True
    except:
        # Alternative: Check if MCP tools are available in the UI
        try:
            page.wait_for_selector('[data-mcp-tool]', timeout=timeout//2)
            return True
        except:
            return False


def format_shodan_query(tool: str, **params) -> str:
    """
    Format a proper Shodan tool query for the chat interface.
    
    Args:
        tool: The Shodan tool name
        **params: Parameters for the tool
        
    Returns:
        Formatted query string
    """
    if not params:
        return f"Use the Shodan {tool} tool"
    
    param_list = []
    for key, value in params.items():
        if isinstance(value, str):
            param_list.append(f"{key}: \"{value}\"")
        else:
            param_list.append(f"{key}: {value}")
    
    param_str = ", ".join(param_list)
    return f"Use the Shodan {tool} tool with parameters: {param_str}"