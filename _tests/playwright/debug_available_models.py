"""
Debug script to check what models are available from OpenAI and Groq
"""
import os
import time
from playwright.sync_api import sync_playwright
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

def check_available_models():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        
        # Navigate to the app
        page.goto("http://localhost:8000")
        
        # Dismiss welcome modal if present
        try:
            welcome_close = page.locator(".modal.active .close-modal-btn, #close-welcome-modal")
            if welcome_close.is_visible(timeout=2000):
                welcome_close.click()
        except:
            pass
        
        # Check OpenAI models
        print("\n=== CHECKING OPENAI MODELS ===")
        check_provider_models(page, "openai", OPENAI_API_KEY)
        
        # Check Groq models
        print("\n=== CHECKING GROQ MODELS ===")
        check_provider_models(page, "groq", GROQ_API_KEY)
        
        browser.close()

def check_provider_models(page, provider, api_key):
    if not api_key:
        print(f"No API key for {provider}")
        return
    
    # Open settings
    settings_btn = page.locator("#settings-btn")
    settings_btn.click()
    page.wait_for_selector("#settings-modal.active", timeout=2000)
    
    # Enter API key
    api_input = page.locator("#api-key-update")
    api_input.fill(api_key)
    
    # Select provider
    provider_select = page.locator("#base-url-select")
    provider_select.select_option(provider)
    
    # Click reload models
    reload_btn = page.locator("#model-reload-btn")
    reload_btn.click()
    
    # Wait for models to load
    time.sleep(3)
    
    # Get available models
    models = page.evaluate("""() => {
        const select = document.getElementById('model-select');
        if (!select) return [];
        return Array.from(select.options)
            .filter(opt => !opt.disabled)
            .map(opt => ({
                value: opt.value,
                text: opt.textContent,
                selected: opt.selected
            }));
    }""")
    
    print(f"\nAvailable {provider.upper()} models:")
    for model in models:
        selected = " (SELECTED)" if model.get('selected') else ""
        print(f"  - {model['value']}: {model['text']}{selected}")
    
    # Close modal
    close_btn = page.locator("#close-settings")
    if close_btn.is_visible():
        close_btn.click()
    else:
        # Try the X button
        x_btn = page.locator("#settings-modal .close-modal-btn")
        if x_btn.is_visible():
            x_btn.click()
    
    page.wait_for_selector("#settings-modal", state="hidden", timeout=2000)

if __name__ == "__main__":
    check_available_models()