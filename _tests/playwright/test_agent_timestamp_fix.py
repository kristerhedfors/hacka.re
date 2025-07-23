#!/usr/bin/env python3
"""
Quick test script to verify the agent model persistence timestamp fix.
This script tests if the model manager timestamp check works correctly after agent loading.
"""

import time
from playwright.sync_api import sync_playwright


def test_agent_model_persistence_fix():
    """Test that agent loading properly sets timestamps for model manager"""
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        
        # Console logging setup
        console_messages = []
        def log_console_message(msg):
            console_messages.append({
                'timestamp': time.time(),
                'type': msg.type,
                'text': msg.text
            })
            print(f"Console {msg.type}: {msg.text}")
        page.on("console", log_console_message)
        
        try:
            # Navigate to app
            page.goto("http://localhost:8000")
            page.wait_for_selector("#send-button", timeout=10000)
            
            # Close welcome modal
            try:
                welcome_modal = page.locator("#welcome-modal")
                if welcome_modal.is_visible():
                    close_button = page.locator("#welcome-modal .close")
                    close_button.click()
                    page.wait_for_timeout(500)
            except:
                pass
            
            print("✅ App loaded")
            
            # Open settings and configure with groq provider
            page.locator("#settings-button").click()
            page.wait_for_selector("#settings-modal", state="visible")
            
            # Set up base configuration
            base_url_select = page.locator("#base-url-select")
            base_url_select.select_option("groq")
            page.wait_for_timeout(1000)
            
            # Set groq model
            model_select = page.locator("#model-select")  
            model_select.select_option("qwen/qwen3-32b")
            page.wait_for_timeout(1000)
            
            # Close settings
            page.locator("#settings-modal .close").click()
            page.wait_for_timeout(500)
            
            print("✅ Groq configuration set")
            
            # Open agent modal and save agent
            page.locator("#agent-button").click()
            page.wait_for_selector("#agent-config-modal", state="visible")
            
            agent_name_input = page.locator("#agent-name-input")
            agent_name_input.fill("test_agent")
            
            save_button = page.locator("#save-agent-btn")
            save_button.click()
            page.wait_for_timeout(1000)
            
            print("✅ Agent saved")
            
            # Now switch to different provider (openai)
            page.locator("#settings-button").click()
            page.wait_for_selector("#settings-modal", state="visible")
            
            base_url_select = page.locator("#base-url-select")
            base_url_select.select_option("openai")
            page.wait_for_timeout(1000)
            
            model_select = page.locator("#model-select")
            model_select.select_option("gpt-4.1-mini")
            page.wait_for_timeout(1000)
            
            page.locator("#settings-modal .close").click()
            page.wait_for_timeout(500)
            
            print("✅ Switched to OpenAI configuration")
            
            # Now load the saved agent and check console for timestamp behavior
            page.locator("#agent-button").click()
            page.wait_for_selector("#agent-config-modal", state="visible")
            
            # Find and click load button for our agent
            load_buttons = page.locator(".load-agent-btn")
            for i in range(load_buttons.count()):
                button = load_buttons.nth(i)
                if "test_agent" in button.get_attribute("onclick", timeout=1000):
                    print("🔄 Loading agent...")
                    button.click()
                    # Accept confirmation dialog
                    page.wait_for_timeout(500)
                    page.on("dialog", lambda dialog: dialog.accept())
                    break
            
            # Wait for processing
            page.wait_for_timeout(3000)
            
            print("✅ Agent loading completed")
            
            # Analyze console messages for timestamp behavior
            model_mismatch_messages = [msg for msg in console_messages if 'Model mismatch detected' in msg['text']]
            storage_updated_messages = [msg for msg in console_messages if 'Storage was recently updated' in msg['text']]
            using_memory_messages = [msg for msg in console_messages if 'Using memory model and updating storage' in msg['text']]
            
            print(f"\n📊 Analysis:")
            print(f"Model mismatch detected: {len(model_mismatch_messages)}")
            print(f"Storage recently updated: {len(storage_updated_messages)}")  
            print(f"Using memory model: {len(using_memory_messages)}")
            
            # Check if the fix worked
            if len(storage_updated_messages) > 0 and len(using_memory_messages) == 0:
                print("✅ SUCCESS: Agent loading properly set timestamp, model manager respected storage")
            elif len(using_memory_messages) > 0:
                print("❌ ISSUE: Model manager still using memory model, timestamp fix may not be working")
            else:
                print("⚠️  UNCLEAR: Need more data to determine timestamp behavior")
            
            # Show recent console messages for debugging
            print(f"\n📝 Recent console messages:")
            recent_messages = console_messages[-20:]
            for msg in recent_messages:
                if any(keyword in msg['text'] for keyword in ['mismatch', 'Storage was', 'Using memory', 'applied successfully']):
                    print(f"  {msg['type']}: {msg['text']}")
            
        except Exception as e:
            print(f"❌ Test failed: {e}")
            
        finally:
            browser.close()


if __name__ == "__main__":
    test_agent_model_persistence_fix()