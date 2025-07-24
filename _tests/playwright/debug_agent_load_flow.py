"""
Debug the complete agent load flow to understand the timestamp issue
"""
from playwright.sync_api import Page
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_debug_agent_load_flow(page: Page, serve_hacka_re, api_key):
    """Debug the complete agent load flow step by step"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    print("=== COMPLETE AGENT LOAD FLOW DEBUG ===")
    
    # Step 1: Configure OpenAI (original)
    print("\nStep 1: Configuring OpenAI...")
    
    # Handle auto-opened settings modal
    settings_modal = page.locator('#settings-modal')
    if settings_modal.is_visible():
        print("Settings modal auto-opened")
        page.wait_for_timeout(2000)
    else:
        settings_btn = page.locator('#settings-btn')
        settings_btn.click()
        page.wait_for_timeout(2000)
    
    # Configure OpenAI
    api_key_input = page.locator('#api-key-update')
    api_key_input.fill(api_key)
    
    provider_select = page.locator('#base-url-select')
    provider_select.select_option('openai')
    page.wait_for_timeout(500)
    
    close_settings_btn = page.locator('#close-settings')
    close_settings_btn.click()
    page.wait_for_timeout(1000)
    
    openai_config = page.evaluate("""() => {
        return {
            provider: window.DataService ? window.DataService.getBaseUrlProvider() : 'none',
            model: window.DataService ? window.DataService.getModel() : 'none'
        };
    }""")
    print(f"OpenAI config: {openai_config}")
    
    # Step 2: Save as agent "opp"
    print("\nStep 2: Saving OpenAI config as agent 'opp'...")
    
    agent_btn = page.locator('#agent-config-btn')
    agent_btn.click()
    page.wait_for_timeout(500)
    
    agent_name_input = page.locator('#quick-agent-name')
    agent_name_input.fill('opp')
    
    page.on("dialog", lambda dialog: dialog.accept())
    save_btn = page.locator('#quick-save-agent')
    save_btn.click()
    page.wait_for_timeout(1000)
    
    close_agent_btn = page.locator('#close-agent-config-modal')
    close_agent_btn.click()
    page.wait_for_timeout(500)
    
    print("✅ Agent 'opp' saved")
    
    # Step 3: Configure Groq (second provider)
    print("\nStep 3: Configuring Groq...")
    
    settings_btn = page.locator('#settings-btn')
    settings_btn.click()
    page.wait_for_timeout(2000)
    
    provider_select.select_option('groq')
    page.wait_for_timeout(500)
    
    close_settings_btn.click()
    page.wait_for_timeout(1000)
    
    groq_config = page.evaluate("""() => {
        return {
            provider: window.DataService ? window.DataService.getBaseUrlProvider() : 'none',
            model: window.DataService ? window.DataService.getModel() : 'none'
        };
    }""")
    print(f"Groq config: {groq_config}")
    
    # Step 4: Load agent "opp" back
    print("\nStep 4: Loading agent 'opp' back...")
    
    # First, let's check timestamp support
    timestamp_check = page.evaluate("""() => {
        const now = Date.now();
        localStorage.setItem('test_timestamp', now.toString());
        sessionStorage.setItem('test_timestamp', now.toString());
        
        const stored_local = localStorage.getItem('test_timestamp');
        const stored_session = sessionStorage.getItem('test_timestamp'); 
        
        return {
            now: now,
            stored_local: stored_local,
            stored_session: stored_session,
            timestamp_works: stored_local !== null && stored_session !== null
        };
    }""")
    print(f"Timestamp test: {timestamp_check}")
    
    agent_btn.click()
    page.wait_for_timeout(500)
    
    # Check model timestamp before loading
    before_load_check = page.evaluate("""() => {
        return {
            model_timestamp_local: localStorage.getItem('model_last_updated'),
            model_timestamp_session: sessionStorage.getItem('model_last_updated'),
            current_model: window.DataService ? window.DataService.getModel() : 'none',
            current_provider: window.DataService ? window.DataService.getBaseUrlProvider() : 'none'
        };
    }""")
    print(f"Before load: {before_load_check}")
    
    # Load the agent
    load_btn = page.locator('button:has-text("Load")').first
    load_btn.click()
    page.wait_for_timeout(2000)  # Wait for load to complete
    
    # Check immediately after loading
    after_load_check = page.evaluate("""() => {
        return {
            model_timestamp_local: localStorage.getItem('model_last_updated'),
            model_timestamp_session: sessionStorage.getItem('model_last_updated'),
            current_model: window.DataService ? window.DataService.getModel() : 'none',
            current_provider: window.DataService ? window.DataService.getBaseUrlProvider() : 'none',
            time_now: Date.now()
        };
    }""")
    print(f"After load: {after_load_check}")
    
    # Calculate time difference
    if after_load_check['model_timestamp_local']:
        time_diff = after_load_check['time_now'] - int(after_load_check['model_timestamp_local'])
        print(f"Time since model timestamp: {time_diff}ms")
        print(f"Should trust storage? {time_diff < 5000}")
    
    # Close agent modal
    if page.locator('#agent-config-modal').is_visible():
        close_agent_btn.click()
        page.wait_for_timeout(500)
    
    final_config = page.evaluate("""() => {
        return {
            provider: window.DataService ? window.DataService.getBaseUrlProvider() : 'none',
            model: window.DataService ? window.DataService.getModel() : 'none'
        };
    }""")
    print(f"Final config after load: {final_config}")
    
    # Step 5: Test message sending
    print("\nStep 5: Testing message sending...")
    
    # Enable console logging to catch model mismatch
    page.on("console", lambda msg: print(f"CONSOLE {msg.type.upper()}: {msg.text}"))
    
    input_field = page.locator('#message-input')
    input_field.fill('hello test')
    
    send_btn = page.locator('#send-btn')
    send_btn.click()
    
    page.wait_for_timeout(3000)  # Wait for any errors
    
    print("\n=== SUMMARY ===")
    print(f"OpenAI config: {openai_config}")
    print(f"Groq config: {groq_config}")
    print(f"Final config: {final_config}")
    print(f"Expected after load: provider='openai', model='{openai_config['model']}'")
    print(f"Load successful: {final_config['provider'] == 'openai'}")
    
    screenshot_with_markdown(page, "agent_load_flow_debug", {
        "Test Phase": "Agent load flow complete",
        "OpenAI Config": str(openai_config),
        "Groq Config": str(groq_config), 
        "Final Config": str(final_config),
        "Load Successful": str(final_config['provider'] == 'openai'),
        "Timestamp Check": str(timestamp_check['timestamp_works'])
    })

if __name__ == "__main__":
    test_debug_agent_load_flow()