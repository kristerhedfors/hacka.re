"""
Comprehensive debugging test for Load button functionality
This test will capture console logs and step through the load process
"""
import pytest
import json
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown


def test_load_button_comprehensive_debug(page: Page, serve_hacka_re, api_key):
    """Comprehensive debug test to understand Load button failure"""
    
    # Capture all console messages
    console_messages = []
    def log_console_message(msg):
        timestamp = msg.location
        console_messages.append({
            'type': msg.type,
            'text': msg.text,
            'location': str(msg.location) if msg.location else None
        })
        print(f"Console {msg.type.upper()}: {msg.text}")
    
    page.on("console", log_console_message)
    
    # Navigate and setup
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    print("=== PHASE 1: Initial Setup ===")
    
    # Set initial configuration (Groq)
    settings_btn = page.locator('#settings-btn')
    settings_btn.click()
    page.wait_for_timeout(500)
    
    api_key_input = page.locator('#api-key-update')
    api_key_input.fill(api_key)
    
    provider_select = page.locator('#base-url-select')
    provider_select.select_option('groq')
    
    close_settings_btn = page.locator('#close-settings')
    close_settings_btn.click()
    page.wait_for_timeout(500)
    
    print("=== PHASE 2: Save Agent ===")
    
    # Save agent
    agent_btn = page.locator('#agent-config-btn')
    agent_btn.click()
    page.wait_for_timeout(500)
    
    agent_name_input = page.locator('#quick-agent-name')
    agent_name_input.fill('debug-load-agent')
    
    # Monitor for save-related console messages
    save_console_count = len(console_messages)
    
    # Set up dialog handler but also capture what happens
    dialog_triggered = False
    def handle_dialog(dialog):
        nonlocal dialog_triggered
        dialog_triggered = True
        print(f"Dialog triggered: {dialog.type} - {dialog.message}")
        dialog.accept()
    
    page.on("dialog", handle_dialog)
    
    save_btn = page.locator('#quick-save-agent')
    save_btn.click()
    page.wait_for_timeout(2000)  # Wait for save
    
    print(f"Dialog triggered during save: {dialog_triggered}")
    print(f"Console messages since save: {len(console_messages) - save_console_count}")
    
    screenshot_with_markdown(page, "debug_agent_saved", {
        "Status": "Agent saved - checking console logs",
        "Console Messages": str(len(console_messages)),
        "Dialog Triggered": str(dialog_triggered)
    })
    
    print("=== PHASE 3: Change Configuration ===")
    
    # Close agent modal
    close_agent_btn = page.locator('#close-agent-config-modal')
    close_agent_btn.click()
    page.wait_for_timeout(500)
    
    # Change to OpenAI
    settings_btn.click()
    page.wait_for_timeout(500)
    provider_select.select_option('openai')
    close_settings_btn.click()
    page.wait_for_timeout(500)
    
    # Verify change
    settings_btn.click()
    page.wait_for_timeout(500)
    current_provider = provider_select.input_value()
    print(f"Provider changed to: {current_provider}")
    assert current_provider == 'openai', f"Expected 'openai', got '{current_provider}'"
    close_settings_btn.click()
    page.wait_for_timeout(500)
    
    print("=== PHASE 4: Debug Load Process ===")
    
    # Open agent modal again
    agent_btn.click()
    page.wait_for_timeout(500)
    
    # Check if saved agent appears in the list
    saved_agents_section = page.locator('#saved-agents-list')
    if saved_agents_section.is_visible():
        print("✅ Saved agents section is visible")
        agents_html = saved_agents_section.inner_html()
        print(f"Agents HTML: {agents_html[:200]}...")
    else:
        print("❌ Saved agents section not visible")
    
    # Find all Load buttons
    load_buttons = page.locator('button:has-text("Load")')
    load_button_count = load_buttons.count()
    print(f"Found {load_button_count} Load buttons")
    
    if load_button_count == 0:
        print("❌ No Load buttons found!")
        screenshot_with_markdown(page, "debug_no_load_buttons", {
            "Status": "No Load buttons found",
            "Agent Modal HTML": saved_agents_section.inner_html()[:500] if saved_agents_section.is_visible() else "Section not visible"
        })
        return
    
    # Get the first Load button
    load_btn = load_buttons.first
    expect(load_btn).to_be_visible()
    expect(load_btn).to_be_enabled()
    
    # Check button properties
    button_text = load_btn.text_content()
    button_class = load_btn.get_attribute('class')
    print(f"Load button text: '{button_text}'")
    print(f"Load button class: '{button_class}'")
    
    screenshot_with_markdown(page, "debug_before_load_click", {
        "Status": "About to click Load button",
        "Load Buttons Found": str(load_button_count),
        "Button Text": button_text,
        "Button Class": button_class
    })
    
    # Monitor console messages before clicking
    pre_load_console_count = len(console_messages)
    
    # Reset dialog handler for load
    load_dialog_triggered = False
    def handle_load_dialog(dialog):
        nonlocal load_dialog_triggered
        load_dialog_triggered = True
        print(f"LOAD Dialog: {dialog.type} - {dialog.message}")
        dialog.accept()
    
    page.on("dialog", handle_load_dialog)
    
    print("=== CLICKING LOAD BUTTON ===")
    load_btn.click()
    page.wait_for_timeout(3000)  # Wait longer to see what happens
    
    print(f"Load dialog triggered: {load_dialog_triggered}")
    load_console_messages = console_messages[pre_load_console_count:]
    print(f"Console messages after load click: {len(load_console_messages)}")
    
    # Print all console messages from load
    for i, msg in enumerate(load_console_messages):
        print(f"  [{i+1}] {msg['type']}: {msg['text']}")
    
    screenshot_with_markdown(page, "debug_after_load_click", {
        "Status": "After clicking Load button",
        "Load Dialog Triggered": str(load_dialog_triggered),
        "Console Messages": str(len(load_console_messages)),
        "Load Messages": str([msg['text'] for msg in load_console_messages])
    })
    
    print("=== PHASE 5: Check Results ===")
    
    # Check if modal closed
    modal_visible = page.locator('#agent-config-modal').is_visible()
    print(f"Agent modal still visible: {modal_visible}")
    
    if modal_visible:
        close_agent_btn.click()
        page.wait_for_timeout(500)
    
    # Check if configuration was restored
    settings_btn.click()
    page.wait_for_timeout(500)
    
    restored_provider = provider_select.input_value()
    print(f"Provider after load: {restored_provider}")
    
    # Check localStorage for debugging
    storage_debug = page.evaluate("""() => {
        return {
            base_url_provider: localStorage.getItem('hackare__base_url_provider'),
            api_key: localStorage.getItem('hackare__api_key') ? '***' + localStorage.getItem('hackare__api_key').slice(-4) : 'none',
            model: localStorage.getItem('hackare__model'),
            saved_agents: localStorage.getItem('hackare__saved_agents') ? 'exists' : 'none'
        };
    }""")
    
    print(f"LocalStorage debug: {storage_debug}")
    
    screenshot_with_markdown(page, "debug_final_results", {
        "Status": "Final verification",
        "Expected Provider": "groq",
        "Actual Provider": restored_provider,
        "Load Success": str(restored_provider == 'groq'),
        "Modal Closed": str(not modal_visible),
        "Storage Debug": str(storage_debug),
        "Total Console Messages": str(len(console_messages))
    })
    
    # Save console log to file for analysis
    with open('debug_load_console.json', 'w') as f:
        json.dump(console_messages, f, indent=2)
    
    print("=== FINAL ASSESSMENT ===")
    if restored_provider == 'groq':
        print("✅ LOAD SUCCESS: Configuration was restored!")
    else:
        print(f"❌ LOAD FAILED: Provider is '{restored_provider}', expected 'groq'")
        print("Check debug_load_console.json for detailed console logs")
    
    # Close settings
    close_settings_btn.click()
    
    # The test itself doesn't assert - it's for debugging
    print(f"Test completed. Check screenshots and debug_load_console.json for analysis.")


def test_check_agent_service_availability(page: Page, serve_hacka_re, api_key):
    """Quick test to verify AgentService is available and working"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Check if services are available
    services_check = page.evaluate("""() => {
        return {
            AgentService: typeof window.AgentService,
            ConfigurationService: typeof window.ConfigurationService,
            DataService: typeof window.DataService,
            CoreStorageService: typeof window.CoreStorageService,
            NamespaceService: typeof window.NamespaceService
        };
    }""")
    
    print("Services availability:", services_check)
    
    # Try to create and retrieve an agent via JavaScript
    agent_test = page.evaluate("""() => {
        try {
            if (typeof window.AgentService === 'undefined') {
                return { error: 'AgentService not available' };
            }
            
            // Try to get all agents
            const agents = window.AgentService.getAllAgents();
            
            return {
                success: true,
                agentCount: Object.keys(agents).length,
                agentNames: Object.keys(agents)
            };
        } catch (error) {
            return { 
                error: error.message,
                stack: error.stack
            };
        }
    }""")
    
    print("Agent service test:", agent_test)
    
    screenshot_with_markdown(page, "debug_services_check", {
        "Services": str(services_check),
        "Agent Test": str(agent_test)
    })