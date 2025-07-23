"""
Debug the provider dropdown options to understand why 'groq' selection fails
"""
from playwright.sync_api import Page
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown

def test_debug_provider_dropdown(page: Page, serve_hacka_re, api_key):
    """Debug provider dropdown options and selection"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    print("=== PROVIDER DROPDOWN DEBUG ===")
    
    # Check if settings modal is already open
    settings_modal = page.locator('#settings-modal')
    if not settings_modal.is_visible():
        # Only click if modal is not already open
        settings_btn = page.locator('#settings-btn')
        settings_btn.click()
        page.wait_for_timeout(2000)
    else:
        print("✅ Settings modal already open")
        page.wait_for_timeout(3000)  # Wait for full initialization
    
    # Get the provider dropdown
    provider_select = page.locator('#base-url-select')
    
    # Check if dropdown exists
    if not provider_select.count():
        print("❌ Provider dropdown not found!")
        return
        
    print("✅ Provider dropdown found")
    
    # Get all options
    options = page.evaluate("""() => {
        const select = document.getElementById('base-url-select');
        if (!select) return [];
        
        const options = [];
        for (let i = 0; i < select.options.length; i++) {
            const option = select.options[i];
            options.push({
                value: option.value,
                text: option.textContent,
                selected: option.selected
            });
        }
        return options;
    }""")
    
    print(f"Available options: {len(options)}")
    for i, option in enumerate(options):
        print(f"  {i}: value='{option['value']}', text='{option['text']}', selected={option['selected']}")
    
    # Check current value
    current_value = provider_select.input_value()
    print(f"Current dropdown value: '{current_value}'")
    
    # Try to select groq
    print("\nAttempting to select 'groq'...")
    try:
        provider_select.select_option('groq')
        print("✅ select_option('groq') completed without error")
    except Exception as e:
        print(f"❌ select_option('groq') failed: {e}")
        
    # Check value after selection attempt
    page.wait_for_timeout(500)
    new_value = provider_select.input_value()
    print(f"Value after selection attempt: '{new_value}'")
    
    # Check if groq option exists by trying to find it
    groq_option_exists = page.evaluate("""() => {
        const select = document.getElementById('base-url-select');
        if (!select) return false;
        
        for (let i = 0; i < select.options.length; i++) {
            if (select.options[i].value === 'groq') {
                return true;
            }
        }
        return false;
    }""")
    
    print(f"Groq option exists: {groq_option_exists}")
    
    # Try alternative selection methods if groq exists
    if groq_option_exists:
        print("\nTrying alternative selection methods...")
        
        # Method 1: Direct DOM manipulation
        result1 = page.evaluate("""() => {
            const select = document.getElementById('base-url-select');
            if (!select) return 'select not found';
            
            for (let i = 0; i < select.options.length; i++) {
                if (select.options[i].value === 'groq') {
                    select.selectedIndex = i;
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                    return `selected index ${i}, new value: ${select.value}`;
                }
            }
            return 'groq option not found';
        }""")
        
        print(f"Method 1 (DOM manipulation): {result1}")
        
        page.wait_for_timeout(1000)
        final_value = provider_select.input_value()
        print(f"Final value after DOM manipulation: '{final_value}'")
        
        # Check DataService
        data_service_provider = page.evaluate("""() => {
            return {
                provider: window.DataService ? window.DataService.getBaseUrlProvider() : 'DataService not found',
                baseUrl: window.DataService ? window.DataService.getBaseUrl() : 'DataService not found'
            };
        }""")
        
        print(f"DataService provider: {data_service_provider}")
    
    screenshot_with_markdown(page, "provider_dropdown_debug", {
        "Available Options": str(len(options)),
        "Groq Option Exists": str(groq_option_exists),
        "Current Value": current_value,
        "Final Value": new_value,
        "DataService Provider": str(data_service_provider.get('provider', 'unknown')) if groq_option_exists else 'N/A'
    })

if __name__ == "__main__":
    test_debug_provider_dropdown()