"""Debug network requests to understand why providers aren't responding."""

import pytest
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown
from playwright.sync_api import Page, expect
import time
import json


def test_debug_network_berget(page: Page, serve_hacka_re):
    """Debug network requests for Berget.ai."""
    page.goto(serve_hacka_re)
    
    berget_api_key = "sk_ber_3p6tTmkcEdBgEfIbAdU2BDxmyKbXB30RKoVfv_1f097c4eed0dac42"
    
    # Track network requests
    requests = []
    responses = []
    
    def handle_request(request):
        requests.append({
            'url': request.url,
            'method': request.method,
            'headers': dict(request.headers),
            'timestamp': time.strftime("%H:%M:%S")
        })
        print(f"REQUEST: {request.method} {request.url}")
    
    def handle_response(response):
        responses.append({
            'url': response.url,
            'status': response.status,
            'status_text': response.status_text,
            'headers': dict(response.headers),
            'timestamp': time.strftime("%H:%M:%S")
        })
        print(f"RESPONSE: {response.status} {response.url}")
    
    page.on("request", handle_request)
    page.on("response", handle_response)
    
    # Setup API key
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    settings_button = page.locator("#settings-btn")
    settings_button.click()
    page.wait_for_selector("#settings-modal", state="visible", timeout=5000)
    
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill(berget_api_key)
    page.wait_for_timeout(1000)
    
    page.keyboard.press("Escape")
    page.wait_for_selector("#settings-modal", state="hidden", timeout=5000)
    
    # Send message
    chat_input = page.locator("#message-input")
    chat_input.fill("Hello, what is 2+2?")
    
    send_button = page.locator("#send-btn")
    send_button.click()
    
    # Wait and capture network activity
    page.wait_for_timeout(10000)  # Wait 10 seconds to capture network activity
    
    # Save network data
    network_data = {
        'provider': 'Berget.ai',
        'api_key_prefix': berget_api_key[:20],
        'requests': requests,
        'responses': responses,
        'total_requests': len(requests),
        'total_responses': len(responses)
    }
    
    with open('_tests/playwright/berget_network_debug.json', 'w') as f:
        json.dump(network_data, f, indent=2)
    
    screenshot_with_markdown(page, "berget_network_debug", {
        "Provider": "Berget.ai",
        "Total Requests": str(len(requests)),
        "Total Responses": str(len(responses)),
        "API Requests": str([r for r in requests if 'api' in r['url'].lower()]),
        "Failed Responses": str([r for r in responses if r['status'] >= 400]),
        "Network Data Saved": "berget_network_debug.json"
    })
    
    print(f"\n=== BERGET.AI NETWORK DEBUG ===")
    print(f"Total requests: {len(requests)}")
    print(f"Total responses: {len(responses)}")
    
    api_requests = [r for r in requests if any(keyword in r['url'].lower() for keyword in ['api', 'chat', 'completion'])]
    print(f"API-related requests: {len(api_requests)}")
    
    for req in api_requests:
        print(f"  - {req['method']} {req['url']} at {req['timestamp']}")
    
    failed_responses = [r for r in responses if r['status'] >= 400]
    print(f"Failed responses: {len(failed_responses)}")
    
    for resp in failed_responses:
        print(f"  - {resp['status']} {resp['url']} at {resp['timestamp']}")


def test_debug_network_groq(page: Page, serve_hacka_re):
    """Debug network requests for Groq."""
    page.goto(serve_hacka_re)
    
    groq_api_key = "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"
    
    # Track network requests
    requests = []
    responses = []
    
    def handle_request(request):
        requests.append({
            'url': request.url,
            'method': request.method,
            'headers': dict(request.headers),
            'timestamp': time.strftime("%H:%M:%S")
        })
        print(f"REQUEST: {request.method} {request.url}")
    
    def handle_response(response):
        responses.append({
            'url': response.url,
            'status': response.status,
            'status_text': response.status_text,
            'headers': dict(response.headers),
            'timestamp': time.strftime("%H:%M:%S")
        })
        print(f"RESPONSE: {response.status} {response.url}")
    
    page.on("request", handle_request)
    page.on("response", handle_response)
    
    # Setup API key
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    settings_button = page.locator("#settings-btn")
    settings_button.click()
    page.wait_for_selector("#settings-modal", state="visible", timeout=5000)
    
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill(groq_api_key)
    page.wait_for_timeout(1000)
    
    page.keyboard.press("Escape")
    page.wait_for_selector("#settings-modal", state="hidden", timeout=5000)
    
    # Send message
    chat_input = page.locator("#message-input")
    chat_input.fill("Hello, what is 2+2?")
    
    send_button = page.locator("#send-btn")
    send_button.click()
    
    # Wait and capture network activity
    page.wait_for_timeout(10000)  # Wait 10 seconds to capture network activity
    
    # Save network data
    network_data = {
        'provider': 'Groq',
        'api_key_prefix': groq_api_key[:20],
        'requests': requests,
        'responses': responses,
        'total_requests': len(requests),
        'total_responses': len(responses)
    }
    
    with open('_tests/playwright/groq_network_debug.json', 'w') as f:
        json.dump(network_data, f, indent=2)
    
    screenshot_with_markdown(page, "groq_network_debug", {
        "Provider": "Groq",
        "Total Requests": str(len(requests)),
        "Total Responses": str(len(responses)),
        "API Requests": str([r for r in requests if 'api' in r['url'].lower()]),
        "Failed Responses": str([r for r in responses if r['status'] >= 400]),
        "Network Data Saved": "groq_network_debug.json"
    })
    
    print(f"\n=== GROQ NETWORK DEBUG ===")
    print(f"Total requests: {len(requests)}")
    print(f"Total responses: {len(responses)}")
    
    api_requests = [r for r in requests if any(keyword in r['url'].lower() for keyword in ['api', 'chat', 'completion'])]
    print(f"API-related requests: {len(api_requests)}")
    
    for req in api_requests:
        print(f"  - {req['method']} {req['url']} at {req['timestamp']}")
    
    failed_responses = [r for r in responses if r['status'] >= 400]
    print(f"Failed responses: {len(failed_responses)}")
    
    for resp in failed_responses:
        print(f"  - {resp['status']} {resp['url']} at {resp['timestamp']}")