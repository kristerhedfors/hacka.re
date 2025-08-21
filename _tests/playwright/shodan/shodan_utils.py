"""
Utility functions for Shodan MCP testing
=========================================
Helper functions for interacting with Shodan API through the MCP interface.
"""
import json
import os
import re
import time
from typing import Dict, Any, List, Optional
from playwright.sync_api import Page


def handle_active_modals(page: Page):
    """
    Intelligently detect and handle any active modals that might block interaction.
    """
    max_attempts = 3
    for attempt in range(max_attempts):
        # Check for different types of modals in priority order
        modals_to_check = [
            {
                'selector': '#service-apikey-input-modal',
                'name': 'Shodan API Key Modal',
                'handler': handle_shodan_api_key_modal
            },
            {
                'selector': '#api-key-modal', 
                'name': 'LLM API Key Modal',
                'handler': handle_llm_api_key_modal
            },
            {
                'selector': '#openai-api-key-modal',
                'name': 'OpenAI API Key Modal', 
                'handler': handle_llm_api_key_modal
            },
            {
                'selector': '.modal[style*="display: block"]',
                'name': 'Visible Modal (style)',
                'handler': handle_generic_modal
            },
            {
                'selector': '.modal.active',
                'name': 'Generic Active Modal',
                'handler': handle_generic_modal
            }
        ]
        
        modal_found = False
        for modal_config in modals_to_check:
            modal = page.locator(modal_config['selector'])
            if modal.is_visible(timeout=500):
                modal_found = True
                success = modal_config['handler'](page, modal)
                if success:
                    break
        
        if not modal_found:
            break
            
        # Wait and check again
        page.wait_for_timeout(2000)
        
        # Final verification - check if any modal is still blocking
        blocking_modals = page.locator('.modal.active')
        if not blocking_modals.is_visible():
            break


def handle_shodan_api_key_modal(page: Page, modal) -> bool:
    """Handle Shodan API key setup modal"""
    shodan_api_key = os.environ.get("SHODAN_API_KEY", "t2hW0hPlKpQY1KF0bn3kuhp3Mef7hptV")
    
    try:
        # Fill API key input
        input_selectors = [
            '#service-apikey-input-modal input[type="password"]',
            '#service-apikey-input-modal input[type="text"]',
            'input[placeholder*="API key"]',
            'input[placeholder*="api key"]'
        ]
        
        for selector in input_selectors:
            try:
                api_input = page.locator(selector).first
                if api_input.is_visible():
                    api_input.clear()
                    api_input.fill(shodan_api_key)
                    break
            except:
                continue
        else:
            return False
        
        # Look for Connect/Save button
        button_selectors = [
            'button:text("Connect")',
            'button:text("Save & Connect")', 
            'button:text("Save")',
            '#service-apikey-input-modal .btn-primary',
            '#service-apikey-input-modal button[type="submit"]'
        ]
        
        for selector in button_selectors:
            try:
                button = page.locator(selector).first
                if button.is_visible():
                    button.click()
                    break
            except:
                continue
        else:
            return False
        
        # Wait for modal to close
        page.wait_for_selector('#service-apikey-input-modal', state='hidden', timeout=8000)
        return True
        
    except Exception:
        return False


def handle_llm_api_key_modal(page: Page, modal) -> bool:
    """Handle LLM API key modal"""
    openai_api_key = os.environ.get("OPENAI_API_KEY")
    
    if not openai_api_key:
        return False
    
    try:
        # Try multiple selectors for API key input
        input_selectors = [
            '#api-key-modal input[type="text"]',
            '#api-key-modal input[type="password"]',
            '#openai-api-key-modal input[type="text"]',
            '#openai-api-key-modal input[type="password"]',
            '#api-key-input',
            'input[placeholder*="API key"]',
            'input[placeholder*="OpenAI"]'
        ]
        
        for selector in input_selectors:
            try:
                api_input = page.locator(selector).first
                if api_input.is_visible():
                    api_input.clear()
                    api_input.fill(openai_api_key)
                    break
            except:
                continue
        else:
            return False
        
        # Try multiple selectors for save button
        button_selectors = [
            'button:text("Save")',
            'button:text("Save & Continue")',
            'button:text("Connect")',
            '#api-key-modal .btn-primary',
            '#openai-api-key-modal .btn-primary',
            '#save-api-key-btn',
            'button[type="submit"]'
        ]
        
        for selector in button_selectors:
            try:
                save_btn = page.locator(selector).first
                if save_btn.is_visible():
                    save_btn.click()
                    break
            except:
                continue
        else:
            return False
        
        # Wait for modal to close (try multiple modal IDs)
        modal_selectors = ['#api-key-modal', '#openai-api-key-modal']
        for modal_selector in modal_selectors:
            try:
                page.wait_for_selector(modal_selector, state='hidden', timeout=3000)
                break
            except:
                continue
        
        return True
        
    except Exception:
        return False


def handle_generic_modal(page: Page, modal) -> bool:
    """Handle any generic modal by trying common close methods"""
    try:
        # Try common close buttons
        close_selectors = [
            'button:text("Cancel")',
            'button:text("Close")', 
            'button:text("Skip")',
            '.modal-close',
            '.btn-secondary',
            '.close-btn'
        ]
        
        for selector in close_selectors:
            try:
                close_btn = page.locator(selector).first
                if close_btn.is_visible():
                    close_btn.click()
                    page.wait_for_timeout(500)
                    return True
            except:
                continue
        
        # Try pressing Escape
        page.keyboard.press('Escape')
        page.wait_for_timeout(500)
        
        return True
        
    except Exception:
        return False


def send_shodan_query(page: Page, query: str) -> str:
    """
    Send a query to the chat interface and get the response.
    
    Args:
        page: Playwright page object
        query: The query to send
        
    Returns:
        The response text from the assistant
    """
    chat_input = page.locator("#message-input")
    
    # Handle any modals before typing the message
    handle_active_modals(page)
    
    # Fill the message and verify it's there
    chat_input.fill(query)
    
    # Verify the message is in the input field
    current_value = chat_input.input_value()
    if current_value != query:
        chat_input.clear()
        chat_input.fill(query)
    
    send_btn = page.locator("#send-btn")
    
    # Try to click send button, but handle any modals that appear
    max_click_attempts = 3
    for attempt in range(max_click_attempts):
        # Re-check message is still there before clicking send
        current_value = chat_input.input_value()
        if current_value != query:
            chat_input.clear()
            chat_input.fill(query)
        
        try:
            # Check if send button is actually clickable
            if send_btn.is_visible() and send_btn.is_enabled():
                send_btn.click()
                
                # After clicking, check if message was sent or if modal appeared
                page.wait_for_timeout(500)
                remaining_value = chat_input.input_value()
                if remaining_value == "":
                    break  # Message successfully sent
                else:
                    handle_active_modals(page)
                    # Continue to next attempt
            else:
                handle_active_modals(page)
        except Exception:
            handle_active_modals(page)
            
        page.wait_for_timeout(1000)
    else:
        return ""  # Failed to send after all attempts
    
    # After successful send, handle any new modals that might appear
    handle_active_modals(page)
    
    # Wait for response to appear (using working test pattern)
    try:
        page.wait_for_selector(".message.assistant .message-content", state="visible", timeout=15000)
        
        # Wait a short time to ensure content is fully loaded
        page.wait_for_timeout(500)
        
        # Get all assistant messages (check all, not just last)
        assistant_messages = page.locator(".message.assistant .message-content")
        message_count = assistant_messages.count()
        
        # Check all assistant messages for content, return the best one
        best_response = ""
        
        for i in range(message_count):
            message_text = assistant_messages.nth(i).text_content()
            
            # If this message has substantial content, use it
            if message_text and len(message_text.strip()) > 5:
                best_response = message_text
        
        return best_response
        
    except Exception:
        # Check one more time for modals that might be blocking
        handle_active_modals(page)
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