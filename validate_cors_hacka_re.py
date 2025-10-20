#!/usr/bin/env python3
"""
Validate that hacka.re is accepted as a CORS domain by the Hugging Face proxy.
Tests both preflight OPTIONS requests and actual API calls with hacka.re origin.
"""

import requests
import json
import sys
from typing import Dict, Any

# Colors for output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

def print_success(msg: str):
    print(f"{Colors.GREEN}✓ {msg}{Colors.RESET}")

def print_error(msg: str):
    print(f"{Colors.RED}✗ {msg}{Colors.RESET}")

def print_info(msg: str):
    print(f"{Colors.BLUE}ℹ {msg}{Colors.RESET}")

def print_warning(msg: str):
    print(f"{Colors.YELLOW}⚠ {msg}{Colors.RESET}")

def test_health_check() -> bool:
    """Test that the proxy server is running"""
    print_info("Testing proxy health check...")

    try:
        response = requests.get('http://localhost:8014/health', timeout=5)
        if response.status_code == 200:
            data = response.json()
            print_success(f"Proxy is running: {data}")
            return True
        else:
            print_error(f"Health check failed with status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print_error("Could not connect to proxy. Is it running on port 8014?")
        print_info("Start it with: python mcp_proxy/huggingface_proxy.py")
        return False
    except Exception as e:
        print_error(f"Health check error: {e}")
        return False

def test_cors_preflight(origin: str) -> bool:
    """Test CORS preflight OPTIONS request"""
    print_info(f"Testing CORS preflight with origin: {origin}")

    headers = {
        'Origin': origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
    }

    try:
        response = requests.options('http://localhost:8014/mcp', headers=headers, timeout=5)

        print(f"  Status: {response.status_code}")
        print(f"  Headers: {dict(response.headers)}")

        # Check CORS headers
        cors_origin = response.headers.get('Access-Control-Allow-Origin')
        cors_methods = response.headers.get('Access-Control-Allow-Methods')
        cors_headers = response.headers.get('Access-Control-Allow-Headers')

        if response.status_code == 204:
            print_success("Preflight request accepted (204 No Content)")
        else:
            print_warning(f"Unexpected status code: {response.status_code}")

        if cors_origin:
            if cors_origin == '*' or cors_origin == origin:
                print_success(f"CORS origin allowed: {cors_origin}")
            else:
                print_error(f"CORS origin mismatch: {cors_origin} (expected {origin} or *)")
                return False
        else:
            print_error("Missing Access-Control-Allow-Origin header")
            return False

        if cors_methods and 'POST' in cors_methods:
            print_success(f"POST method allowed: {cors_methods}")
        else:
            print_warning(f"POST might not be allowed: {cors_methods}")

        if cors_headers and ('*' in cors_headers or 'content-type' in cors_headers.lower()):
            print_success(f"Content-Type header allowed: {cors_headers}")
        else:
            print_warning(f"Content-Type might not be allowed: {cors_headers}")

        return True

    except Exception as e:
        print_error(f"Preflight test error: {e}")
        return False

def test_cors_api_call(origin: str) -> bool:
    """Test actual API call with CORS headers"""
    print_info(f"Testing API call with origin: {origin}")

    headers = {
        'Origin': origin,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }

    # Simple MCP request to test connectivity
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "ping",
        "params": {}
    }

    try:
        response = requests.post(
            'http://localhost:8014/mcp',
            headers=headers,
            json=payload,
            timeout=10
        )

        print(f"  Status: {response.status_code}")
        print(f"  Response headers: {dict(response.headers)}")

        # Check CORS headers in response
        cors_origin = response.headers.get('Access-Control-Allow-Origin')

        if cors_origin:
            if cors_origin == '*' or cors_origin == origin:
                print_success(f"CORS origin in response: {cors_origin}")
            else:
                print_error(f"CORS origin mismatch in response: {cors_origin}")
                return False
        else:
            print_error("Missing Access-Control-Allow-Origin in response")
            return False

        # Log response body (truncated)
        try:
            body = response.text
            if len(body) > 500:
                print(f"  Response body (truncated): {body[:500]}...")
            else:
                print(f"  Response body: {body}")
        except:
            print("  Response body: <binary data>")

        # We expect either a valid JSON-RPC response or an error from HF
        # The important part is that CORS headers are present
        if response.status_code in [200, 401, 404]:
            print_success(f"API call completed with status {response.status_code}")
            if response.status_code == 401:
                print_info("401 is expected - HF MCP requires authentication")
            return True
        else:
            print_warning(f"Unexpected status code: {response.status_code}")
            return True  # Still counts as success if CORS headers are present

    except Exception as e:
        print_error(f"API call test error: {e}")
        return False

def main():
    """Run all validation tests"""
    print("=" * 70)
    print("CORS Validation for hacka.re with Hugging Face Proxy")
    print("=" * 70)
    print()

    # Test 1: Health check
    if not test_health_check():
        print()
        print_error("Proxy is not running. Cannot continue tests.")
        sys.exit(1)

    print()

    # Test 2: CORS preflight with localhost (baseline)
    print("-" * 70)
    print("Test 2: CORS Preflight - localhost:8000")
    print("-" * 70)
    test_cors_preflight('http://localhost:8000')

    print()

    # Test 3: CORS preflight with hacka.re
    print("-" * 70)
    print("Test 3: CORS Preflight - hacka.re")
    print("-" * 70)
    hacka_re_preflight = test_cors_preflight('https://hacka.re')

    print()

    # Test 4: API call with localhost
    print("-" * 70)
    print("Test 4: API Call - localhost:8000")
    print("-" * 70)
    test_cors_api_call('http://localhost:8000')

    print()

    # Test 5: API call with hacka.re
    print("-" * 70)
    print("Test 5: API Call - hacka.re")
    print("-" * 70)
    hacka_re_api = test_cors_api_call('https://hacka.re')

    print()
    print("=" * 70)
    print("Summary")
    print("=" * 70)

    if hacka_re_preflight and hacka_re_api:
        print_success("All tests passed! hacka.re is accepted as a CORS domain")
        print()
        print_info("The proxy configuration allows all origins with:")
        print("  allow_origins=['*']")
        print()
        print_info("This means hacka.re can make requests to the proxy from:")
        print("  • https://hacka.re (production)")
        print("  • http://localhost:8000 (development)")
        print("  • Any other origin")
        return 0
    else:
        print_error("Some tests failed. Check the output above for details.")
        return 1

if __name__ == '__main__':
    sys.exit(main())
