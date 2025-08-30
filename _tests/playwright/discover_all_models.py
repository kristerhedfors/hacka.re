"""
Discover all available models from each provider
"""
import os
import time
import json
from playwright.sync_api import sync_playwright
from test_utils import dismiss_welcome_modal, dismiss_settings_modal
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
BERGET_API_KEY = os.getenv("BERGET_API_KEY")

def discover_provider_models(page, provider, api_key):
    """Discover all models available from a provider."""
    if not api_key:
        print(f"No API key for {provider}, skipping...")
        return []
    
    print(f"\n{'='*60}")
    print(f"Discovering {provider.upper()} models...")
    print('='*60)
    
    # Open settings
    settings_btn = page.locator("#settings-btn")
    settings_btn.click()
    page.wait_for_selector("#settings-modal.active", timeout=2000)
    
    # Configure API
    api_input = page.locator("#api-key-update")
    api_input.fill(api_key)
    
    provider_select = page.locator("#base-url-select")
    provider_select.select_option(provider)
    
    # Wait for reload button to be enabled
    page.wait_for_function(
        """() => {
            const btn = document.getElementById('model-reload-btn');
            return btn && !btn.disabled;
        }""",
        timeout=3000
    )
    
    reload_btn = page.locator("#model-reload-btn")
    reload_btn.click()
    
    # Wait for models to load
    time.sleep(3)
    
    # Get all available models with detailed info
    models = page.evaluate("""() => {
        const select = document.getElementById('model-select');
        if (!select) return [];
        return Array.from(select.options)
            .filter(opt => !opt.disabled)
            .map(opt => ({
                value: opt.value,
                text: opt.textContent.trim(),
                group: opt.parentElement.tagName === 'OPTGROUP' ? 
                       opt.parentElement.label : null
            }));
    }""")
    
    # Close settings
    close_btn = page.locator("#close-settings")
    if close_btn.is_visible():
        close_btn.click()
    else:
        save_btn = page.locator("#close-settings")
        save_btn.click(force=True)
    
    page.wait_for_selector("#settings-modal", state="hidden", timeout=2000)
    
    return models

def analyze_model_capabilities(model_name, model_text):
    """Analyze if a model likely supports chat and function calling."""
    name_lower = model_name.lower()
    text_lower = model_text.lower()
    
    # Models that definitely DON'T support chat/functions
    non_chat_patterns = [
        'whisper', 'tts', 'dall-e', 'embedding', 'moderation',
        'audio', 'transcribe', 'image', 'vision-preview',
        'realtime-preview', 'search-preview', 'guard', 'safety',
        'classifier', 'rerank', 'embed'
    ]
    
    # Models that likely DO support chat/functions
    chat_patterns = [
        'gpt', 'claude', 'llama', 'mistral', 'mixtral', 'qwen',
        'gemma', 'gemini', 'deepseek', 'yi', 'falcon', 'vicuna',
        'alpaca', 'wizard', 'openchat', 'starling', 'neural-chat',
        'phi', 'orca', 'zephyr', 'hermes', 'openhermes', 'nous-hermes',
        'dolphin', 'samantha', 'airoboros', 'chronos', 'solar',
        'command', 'chat', 'instruct', 'assistant', 'turbo',
        'kimi', 'compound', 'magistral', 'deepsee', 'qwq'
    ]
    
    # Check for non-chat models first
    for pattern in non_chat_patterns:
        if pattern in name_lower or pattern in text_lower:
            return False, "non-chat"
    
    # Check for chat models
    for pattern in chat_patterns:
        if pattern in name_lower or pattern in text_lower:
            return True, "chat"
    
    # If uncertain, mark as possible
    return True, "possible"

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # Navigate to the app
        page.goto("http://localhost:8000")
        dismiss_welcome_modal(page)
        dismiss_settings_modal(page)
        
        all_models = {}
        
        # Discover models from each provider
        for provider, api_key in [
            ("groq", GROQ_API_KEY),
            ("berget", BERGET_API_KEY),
            ("openai", OPENAI_API_KEY)
        ]:
            try:
                models = discover_provider_models(page, provider, api_key)
                all_models[provider] = models
                
                print(f"\nFound {len(models)} models for {provider}:")
                
                # Categorize models
                chat_models = []
                non_chat_models = []
                uncertain_models = []
                
                for model in models:
                    is_chat, category = analyze_model_capabilities(
                        model['value'], 
                        model['text']
                    )
                    
                    if category == "chat":
                        chat_models.append(model)
                    elif category == "non-chat":
                        non_chat_models.append(model)
                    else:
                        uncertain_models.append(model)
                
                print(f"\n📱 Chat/Function-capable models ({len(chat_models)}):")
                for model in chat_models:
                    print(f"  ✓ {model['value']}")
                
                if uncertain_models:
                    print(f"\n❓ Possibly chat-capable ({len(uncertain_models)}):")
                    for model in uncertain_models:
                        print(f"  ? {model['value']}")
                
                if non_chat_models:
                    print(f"\n🚫 Non-chat models ({len(non_chat_models)}):")
                    for model in non_chat_models:
                        print(f"  ✗ {model['value']}")
                
            except Exception as e:
                print(f"Error discovering {provider} models: {e}")
                all_models[provider] = []
        
        # Save results to JSON
        output = {
            "discovery_date": time.strftime("%Y-%m-%d %H:%M:%S"),
            "providers": {}
        }
        
        for provider, models in all_models.items():
            chat_models = []
            for model in models:
                is_chat, _ = analyze_model_capabilities(
                    model['value'], 
                    model['text']
                )
                if is_chat:
                    chat_models.append(model['value'])
            
            output["providers"][provider] = {
                "total_models": len(models),
                "chat_capable_models": chat_models,
                "all_models": models
            }
        
        with open("_tests/playwright/discovered_models.json", "w") as f:
            json.dump(output, f, indent=2)
        
        print("\n" + "="*60)
        print("Results saved to discovered_models.json")
        print("="*60)
        
        # Generate test list
        print("\n📋 MODELS TO TEST FOR FUNCTION CALLING:")
        print("="*60)
        
        for provider in ["groq", "berget", "openai"]:
            if provider in output["providers"]:
                chat_models = output["providers"][provider]["chat_capable_models"]
                print(f"\n{provider.upper()} ({len(chat_models)} models):")
                for model in chat_models[:10]:  # Show first 10
                    print(f"  '{model}',")
                if len(chat_models) > 10:
                    print(f"  # ... and {len(chat_models) - 10} more")
        
        browser.close()

if __name__ == "__main__":
    main()