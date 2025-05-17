import pytest
import time
import os
from dotenv import load_dotenv
from playwright.sync_api import Page, expect

from test_utils import dismiss_welcome_modal, dismiss_settings_modal, check_system_messages, screenshot_with_markdown

# Load environment variables from .env file in the current directory
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

def test_system_prompt_menu_single_scrollbar(page: Page, serve_hacka_re):
    """Test that the System Prompt Menu modal has only one level of scrollbars."""
    # STEP 1: Navigate to the application
    page.goto(serve_hacka_re)
    
    # STEP 2: Handle welcome and settings modals
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Wait for the page to load
    page.wait_for_selector("#settings-btn", state="visible")
    
    # Open settings modal
    page.click("#settings-btn")
    
    # Wait for settings modal to be visible
    page.wait_for_selector("#settings-modal.active", state="visible")
    
    # Open prompts modal
    page.click("#open-prompts-config")
    
    # Wait for the prompts modal to be visible
    page.wait_for_selector(".prompts-container", state="visible")
    
    # STEP 3: Take a screenshot of the initial state
    screenshot_with_markdown(page, "system_prompt_scrollbar_initial.png", {
        "Status": "System Prompt Menu opened",
        "Test": "System Prompt Menu Scrollbar Test",
        "Description": "Checking for single scrollbar in System Prompt Menu"
    })
    
    # STEP 4: Get the computed style for the modal content
    modal_content_overflow = page.evaluate("""() => {
        const modalContent = document.querySelector('#prompts-modal .modal-content');
        return window.getComputedStyle(modalContent).overflowY;
    }""")
    
    # Get the computed style for the prompts list
    prompts_list_overflow = page.evaluate("""() => {
        const promptsList = document.querySelector('#prompts-list');
        return window.getComputedStyle(promptsList).overflowY;
    }""")
    
    # STEP 5: Take a screenshot with the results
    screenshot_with_markdown(page, "system_prompt_scrollbar_results.png", {
        "Status": "Computed styles retrieved",
        "Modal Content overflow-y": modal_content_overflow,
        "Prompts List overflow-y": prompts_list_overflow,
        "Expected Modal Content overflow-y": "auto",
        "Expected Prompts List overflow-y": "visible"
    })
    
    # STEP 6: Assert that the modal content has overflow-y: auto
    assert modal_content_overflow == "auto", f"Expected modal content to have overflow-y: auto, but got {modal_content_overflow}"
    
    # Assert that the prompts list does NOT have overflow-y: auto
    assert prompts_list_overflow != "auto", f"Expected prompts list to NOT have overflow-y: auto, but got {prompts_list_overflow}"
    
    # STEP 7: Close the prompts modal
    page.click("#close-prompts-modal")
    
    # STEP 8: Take a final screenshot
    screenshot_with_markdown(page, "system_prompt_scrollbar_final.png", {
        "Status": "Test completed",
        "Result": "System Prompt Menu has only one level of scrollbars",
        "Modal Content overflow-y": modal_content_overflow,
        "Prompts List overflow-y": prompts_list_overflow
    })
    
    # STEP 9: Check for any system messages or errors
    check_system_messages(page)
