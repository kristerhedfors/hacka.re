#!/usr/bin/env python3

import pytest
from playwright.sync_api import Page
from test_utils import dismiss_welcome_modal, dismiss_settings_modal

@pytest.fixture(scope="function") 
def api_key():
    """Provide API key from environment"""
    import os
    from dotenv import load_dotenv
    load_dotenv()
    return os.getenv("OPENAI_API_KEY")

def test_debug_api_issue(page: Page, serve_hacka_re, api_key):
    """Debug why API calls aren't working"""
    
    # Navigate and setup
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Enhanced console monitoring
    console_logs = []
    def handle_console(msg):
        text = msg.text
        console_logs.append(f'[{msg.type}] {text}')
        # Print streaming and API response related logs
        if any(keyword in text.lower() for keyword in ['stream', 'response', 'message', 'chat', 'error']):
            print(f'CONSOLE: [{msg.type}] {text}')
    
    page.on('console', handle_console)
    
    # Monitor network requests
    network_logs = []
    def handle_request(request):
        network_logs.append(f'REQUEST: {request.method} {request.url}')
        print(f'REQUEST: {request.method} {request.url}')
    
    def handle_response(response):
        network_logs.append(f'RESPONSE: {response.status} {response.url}')
        print(f'RESPONSE: {response.status} {response.url}')
    
    page.on('request', handle_request)
    page.on('response', handle_response)
    
    print("=== Setting up API ===")
    
    # Setup API with detailed logging
    page.click("#settings-btn")
    page.wait_for_selector("#settings-modal.active", state="visible")
    
    # Check if API key field exists and fill it
    api_key_field = page.locator("#api-key-update")
    if api_key_field.is_visible():
        api_key_field.fill(api_key)
        print(f"✅ API key filled: {api_key[:8]}...")
    else:
        print("❌ API key field not found")
        return "api_field_missing"
    
    # Set base URL
    base_url_select = page.locator("#base-url-select")
    if base_url_select.is_visible():
        base_url_select.select_option("openai")
        print("✅ Base URL set to OpenAI")
    else:
        print("❌ Base URL select not found")
    
    # Reload models
    model_reload_btn = page.locator("#model-reload-btn")
    if model_reload_btn.is_visible():
        model_reload_btn.click()
        print("✅ Model reload clicked")
        page.wait_for_timeout(3000)  # Wait longer for model loading
    else:
        print("❌ Model reload button not found")
    
    # Select model
    model_select = page.locator("#model-select")
    if model_select.is_visible():
        page.wait_for_timeout(1000)
        try:
            model_select.select_option("gpt-4o-mini")
            print("✅ Model selected: gpt-4o-mini")
        except Exception as e:
            print(f"⚠️ Could not select model: {e}")
            # Try to see available options
            options = page.evaluate("""() => {
                const select = document.getElementById('model-select');
                return Array.from(select.options).map(opt => ({value: opt.value, text: opt.text}));
            }""")
            print(f"Available models: {options}")
    else:
        print("❌ Model select not found")
    
    # Save settings explicitly before closing
    save_btn = page.locator("#save-settings-btn")
    if save_btn.is_visible():
        save_btn.click()
        print("✅ Save settings button clicked")
        page.wait_for_timeout(2000)
    else:
        print("⚠️ Save settings button not found, trying form submit")
        # Try submitting the form
        page.evaluate("""() => {
            const form = document.getElementById('settings-form');
            if (form) {
                form.dispatchEvent(new Event('submit', { bubbles: true }));
            }
        }""")
        page.wait_for_timeout(2000)
    
    page.keyboard.press("Escape")
    page.wait_for_selector("#settings-modal", state="hidden")
    
    print("\n=== Checking API Configuration ===")
    
    # Check API configuration programmatically
    api_config = page.evaluate("""() => {
        // Check various API-related services
        let config = {
            apiService: !!window.ApiService,
            apiKeySet: false,
            baseUrl: '',
            selectedModel: '',
            functionToolsEnabled: false
        };
        
        // Check API key
        if (window.CoreStorageService) {
            try {
                const apiKey = window.CoreStorageService.getValue('apiKey');
                config.apiKeySet = !!(apiKey && apiKey.length > 10);
            } catch (e) {
                console.error('Error checking API key:', e);
            }
        }
        
        // Check base URL
        if (window.CoreStorageService) {
            try {
                config.baseUrl = window.CoreStorageService.getValue('baseUrl') || 'not set';
            } catch (e) {
                console.error('Error checking base URL:', e);
            }
        }
        
        // Check selected model
        if (window.CoreStorageService) {
            try {
                config.selectedModel = window.CoreStorageService.getValue('selectedModel') || 'not set';
            } catch (e) {
                console.error('Error checking selected model:', e);
            }
        }
        
        // Check function tools
        if (window.FunctionToolsService) {
            try {
                config.functionToolsEnabled = window.FunctionToolsService.isFunctionToolsEnabled();
            } catch (e) {
                console.error('Error checking function tools:', e);
            }
        }
        
        console.log('API Configuration Check:', config);
        return config;
    }""")
    
    print(f"API Service available: {api_config['apiService']}")
    print(f"API Key set: {api_config['apiKeySet']}")
    print(f"Base URL: {api_config['baseUrl']}")
    print(f"Selected Model: {api_config['selectedModel']}")
    print(f"Function Tools: {api_config['functionToolsEnabled']}")
    
    print("\n=== Testing Simple Message ===")
    
    # Test a very simple message
    message_input = page.locator("#message-input")
    if message_input.is_visible():
        message_input.fill("Hello")
        print("✅ Message input filled")
    else:
        print("❌ Message input not found")
        return "input_missing"
    
    send_btn = page.locator("#send-btn")
    if send_btn.is_visible():
        send_btn.click()
        print("✅ Send button clicked")
    else:
        print("❌ Send button not found")
        return "send_btn_missing"
    
    print("Waiting 15 seconds for response...")
    page.wait_for_timeout(15000)
    
    # Check conversation state and chat container
    conversation_state = page.evaluate("""() => {
        console.log('=== CONVERSATION DEBUG ===');
        
        const messages = document.querySelectorAll('.chat-message');
        const messageCount = messages.length;
        const lastMessage = messages[messageCount - 1];
        
        // Check chat container
        const chatContainer = document.getElementById('chat-container');
        const chatContainerHTML = chatContainer ? chatContainer.innerHTML.substring(0, 500) : 'Chat container not found';
        
        // Check for any divs with content
        const allDivs = document.querySelectorAll('div');
        const divsWithText = Array.from(allDivs).filter(div => 
            div.textContent && div.textContent.trim().length > 5
        ).slice(0, 5).map(div => ({
            text: div.textContent.substring(0, 50),
            classes: Array.from(div.classList)
        }));
        
        console.log('Messages found:', messageCount);
        console.log('Chat container content length:', chatContainerHTML.length);
        console.log('Divs with text:', divsWithText.length);
        
        return {
            messageCount: messageCount,
            lastMessageText: lastMessage ? lastMessage.textContent.substring(0, 100) : 'No messages',
            lastMessageClasses: lastMessage ? Array.from(lastMessage.classList) : [],
            chatContainerContent: chatContainerHTML,
            divsWithText: divsWithText
        };
    }""")
    
    print(f"Total messages: {conversation_state['messageCount']}")
    print(f"Last message: {conversation_state['lastMessageText']}")
    print(f"Last message classes: {conversation_state['lastMessageClasses']}")
    print(f"Chat container content length: {len(conversation_state['chatContainerContent'])}")
    print(f"Divs with text: {len(conversation_state['divsWithText'])}")
    
    if conversation_state['divsWithText']:
        print("Sample divs with text:")
        for div in conversation_state['divsWithText']:
            print(f"  - {div['text']} (classes: {div['classes']})")
    
    # Show relevant network logs
    print("\n=== Network Activity ===")
    api_requests = [log for log in network_logs if 'openai' in log.lower() or 'chat' in log.lower()]
    for log in api_requests[-5:]:
        print(log)
    
    # Show relevant console logs
    print("\n=== Console Logs ===")
    error_logs = [log for log in console_logs if 'error' in log.lower() or 'failed' in log.lower()]
    for log in error_logs[-5:]:
        print(log)
    
    if conversation_state['messageCount'] > 1:
        print("\n✅ API appears to be working")
        return "working"
    else:
        print("\n❌ API not responding")
        return "not_working"

if __name__ == "__main__":
    print("Run with: python -m pytest debug_api_issue.py -v -s")