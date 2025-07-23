"""
Verify that the provider save fix is working correctly
"""
from playwright.sync_api import Page
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown

def test_provider_save_fix_verification(page: Page, serve_hacka_re, api_key):
    """Verify that provider selections are saved immediately when changed"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    print("=== VERIFYING PROVIDER SAVE FIX ===")
    
    # Step 1: Open settings
    settings_btn = page.locator('#settings-btn')
    settings_btn.click()
    page.wait_for_timeout(2000)  # Wait for initialization
    
    # Step 2: Check initial provider
    provider_select = page.locator('#base-url-select')
    initial_provider = provider_select.input_value()
    print(f"Initial provider: {initial_provider}")
    
    # Step 3: Change to groq and give time for save
    print("Changing provider to groq...")
    provider_select.select_option('groq')
    page.wait_for_timeout(1000)  # Give time for save operation
    
    # Step 4: Check what was saved immediately
    saved_check = page.evaluate("""() => {
        const savedProvider = window.DataService ? window.DataService.getBaseUrlProvider() : 'unknown';
        console.log('Provider saved to storage:', savedProvider);
        return savedProvider;
    }""")
    
    print(f"Provider saved to storage: {saved_check}")
    
    # Step 5: Close and reopen settings to test persistence
    close_settings_btn = page.locator('#close-settings')
    close_settings_btn.click()
    page.wait_for_timeout(500)
    
    # Reopen
    settings_btn.click()
    page.wait_for_timeout(2000)  # Wait for initialization
    
    # Step 6: Check what the dropdown shows
    final_provider = provider_select.input_value()
    print(f"Provider after reopen: {final_provider}")
    
    screenshot_with_markdown(page, "provider_save_verification", {
        "Initial Provider": initial_provider,
        "Saved Provider": saved_check,
        "Final Provider": final_provider,
        "Fix Working": str(saved_check == 'groq' and final_provider == 'groq')
    })
    
    # Step 7: Test the reverse - change back to openai
    print("\\nChanging provider back to openai...")
    provider_select.select_option('openai')
    page.wait_for_timeout(1000)  # Give time for save
    
    saved_check_2 = page.evaluate("""() => {
        const savedProvider = window.DataService ? window.DataService.getBaseUrlProvider() : 'unknown';
        console.log('Provider saved to storage (round 2):', savedProvider);
        return savedProvider;
    }""")
    
    print(f"Provider saved to storage (round 2): {saved_check_2}")
    
    # Final verification
    assert saved_check == 'groq', f"First save failed: expected 'groq', got '{saved_check}'"
    assert final_provider == 'groq', f"First persistence failed: expected 'groq', got '{final_provider}'"
    assert saved_check_2 == 'openai', f"Second save failed: expected 'openai', got '{saved_check_2}'"
    
    print("✅ Provider save fix is working correctly!")
    print("✅ Settings are saved immediately when provider changes!")
    
    close_settings_btn.click()