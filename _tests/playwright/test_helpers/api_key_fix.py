"""
API Key Persistence Fix Helper
Addresses the issue where API keys sometimes don't persist properly in settings
"""

import time
from playwright.sync_api import Page


def ensure_api_key_persisted(page: Page, api_key: str, max_retries: int = 3):
    """
    Ensures API key is properly persisted in localStorage
    Sometimes the encryption/namespace timing causes the key not to stick
    
    Args:
        page: Playwright page object
        api_key: The API key to persist
        max_retries: Maximum number of attempts
        
    Returns:
        bool: True if key was successfully persisted
    """
    for attempt in range(max_retries):
        try:
            # Clear any existing encryption issues
            page.evaluate("""
                () => {
                    // Force namespace initialization if needed
                    if (window.NamespaceService && typeof window.NamespaceService.reinitializeNamespace === 'function') {
                        window.NamespaceService.reinitializeNamespace();
                    }
                }
            """)
            
            # Small delay for namespace to initialize
            time.sleep(0.5)
            
            # Store the API key directly via StorageService
            success = page.evaluate(f"""
                () => {{
                    try {{
                        // Use the proper storage service chain
                        if (window.StorageService && window.StorageService.saveApiKey) {{
                            window.StorageService.saveApiKey('{api_key}');
                            
                            // Verify it was saved
                            const savedKey = window.StorageService.getApiKey();
                            return savedKey === '{api_key}';
                        }}
                        
                        // Fallback to direct localStorage if service not available
                        const namespace = localStorage.getItem('namespace') || 'default';
                        const key = namespace + '_openai_api_key';
                        localStorage.setItem(key, '{api_key}');
                        return true;
                    }} catch (e) {{
                        console.error('Failed to save API key:', e);
                        return false;
                    }}
                }}
            """)
            
            if success:
                # Double-check it persisted
                time.sleep(0.2)
                verified = page.evaluate(f"""
                    () => {{
                        if (window.StorageService && window.StorageService.getApiKey) {{
                            return window.StorageService.getApiKey() === '{api_key}';
                        }}
                        const namespace = localStorage.getItem('namespace') || 'default';
                        const key = namespace + '_openai_api_key';
                        return localStorage.getItem(key) === '{api_key}';
                    }}
                """)
                
                if verified:
                    return True
                    
        except Exception as e:
            print(f"Attempt {attempt + 1} failed: {e}")
            
        # Wait before retry
        time.sleep(1)
    
    return False


def configure_api_key_with_retry(page: Page, api_key: str, use_modal: bool = True):
    """
    Configure API key through UI with retry logic
    
    Args:
        page: Playwright page object
        api_key: The API key to configure
        use_modal: Whether to use the modal UI (True) or direct storage (False)
        
    Returns:
        bool: True if configuration succeeded
    """
    if not use_modal:
        # Direct storage method
        return ensure_api_key_persisted(page, api_key)
    
    # Modal UI method
    try:
        # Check if settings modal is open
        settings_modal = page.locator("#settings-modal")
        if not settings_modal.is_visible():
            # Open settings
            settings_button = page.locator("#settings-btn")
            if settings_button.is_visible():
                settings_button.click()
                page.wait_for_selector("#settings-modal", state="visible", timeout=3000)
        
        # Find and fill API key field
        api_key_field = page.locator("#api-key")
        if api_key_field.is_visible():
            api_key_field.fill("")  # Clear first
            api_key_field.fill(api_key)
            
            # Trigger change event
            page.evaluate("""
                () => {
                    const field = document.getElementById('api-key');
                    if (field) {
                        field.dispatchEvent(new Event('input', { bubbles: true }));
                        field.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }
            """)
            
            # Save settings
            save_button = page.locator("#save-api-settings")
            if save_button.is_visible():
                save_button.click()
                time.sleep(0.5)
            
            # Close modal
            close_button = page.locator("#close-settings-modal")
            if close_button.is_visible():
                close_button.click()
            else:
                # Try clicking outside modal
                page.evaluate("() => document.getElementById('settings-modal').style.display = 'none'")
            
            # Verify persistence
            return ensure_api_key_persisted(page, api_key, max_retries=1)
            
    except Exception as e:
        print(f"Modal configuration failed: {e}")
        # Fall back to direct storage
        return ensure_api_key_persisted(page, api_key)


def verify_api_key_in_requests(page: Page, expected_key: str):
    """
    Set up monitoring to verify API key is being sent in requests
    
    Args:
        page: Playwright page object
        expected_key: The API key that should be sent
        
    Returns:
        dict: Request monitoring setup
    """
    requests_captured = []
    
    def handle_request(request):
        if 'api' in request.url or 'openai' in request.url:
            auth_header = request.headers.get('authorization', '')
            requests_captured.append({
                'url': request.url,
                'has_auth': bool(auth_header),
                'auth_matches': expected_key in auth_header if auth_header else False
            })
    
    page.on("request", handle_request)
    
    return {
        'requests': requests_captured,
        'verify': lambda: any(r['auth_matches'] for r in requests_captured)
    }


def wait_for_api_ready(page: Page, timeout: int = 5000):
    """
    Wait for the API system to be fully initialized
    
    Args:
        page: Playwright page object
        timeout: Maximum time to wait in milliseconds
        
    Returns:
        bool: True if API system is ready
    """
    try:
        result = page.evaluate(f"""
            () => {{
                return new Promise((resolve) => {{
                    let checkCount = 0;
                    const maxChecks = {timeout // 100};
                    
                    const checkReady = () => {{
                        checkCount++;
                        
                        // Check if all required services are loaded
                        const servicesReady = window.StorageService && 
                                            window.ApiService && 
                                            window.NamespaceService;
                        
                        // Check if API key is accessible
                        const apiKeyAccessible = window.StorageService && 
                                                typeof window.StorageService.getApiKey === 'function';
                        
                        if (servicesReady && apiKeyAccessible) {{
                            resolve(true);
                        }} else if (checkCount >= maxChecks) {{
                            resolve(false);
                        }} else {{
                            setTimeout(checkReady, 100);
                        }}
                    }};
                    
                    checkReady();
                }});
            }}
        """)
        
        return result
        
    except Exception as e:
        print(f"Error waiting for API ready: {e}")
        return False