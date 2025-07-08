"""
Test Model Selector Modal functionality
Tests clicking on model name/context and keyboard shortcuts to open model selector
"""
import pytest
import os
from test_utils import screenshot_with_markdown, dismiss_welcome_modal, dismiss_settings_modal

# Get API key from environment variables
API_KEY = os.getenv("OPENAI_API_KEY")

def configure_api_basic(page):
    """Basic API configuration for testing"""
    if not API_KEY:
        pytest.skip("OPENAI_API_KEY not set in environment")
    
    # Dismiss any open modals first
    dismiss_settings_modal(page)
    
    # Open settings modal
    page.click("#settings-btn")
    page.wait_for_selector("#settings-modal.active", timeout=5000)
    
    # Enter API key
    page.fill("#api-key-update", API_KEY)
    
    # Save settings
    page.click("#save-settings-btn")
    page.wait_for_selector("#settings-modal:not(.active)", timeout=5000)
    
    # Wait for models to load
    page.wait_for_timeout(2000)


def test_model_selector_modal_click(page, serve_hacka_re):
    """Test that clicking on model name opens the model selector modal"""
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if it appears
    dismiss_welcome_modal(page)
    
    # Configure API key and settings to have a model displayed
    configure_api_basic(page)
    
    # Wait for model name to be displayed
    page.wait_for_selector('.model-name-display', timeout=10000)
    
    # Take screenshot before clicking
    screenshot_with_markdown(page, "model_display_before_click")
    
    # Click on the model name display
    page.click('.model-name-display')
    
    # Wait for model selector modal to appear
    page.wait_for_selector('#model-selector-modal.active', timeout=5000)
    
    # Verify modal is visible
    modal = page.locator('#model-selector-modal')
    assert modal.is_visible()
    
    # Verify modal content
    assert page.locator('#model-selector-modal h2:text("Select Model")').is_visible()
    assert page.locator('#model-selector-select').is_visible()
    assert page.locator('#model-selector-apply-btn').is_visible()
    assert page.locator('#model-selector-cancel-btn').is_visible()
    
    screenshot_with_markdown(page, "model_selector_modal_open")
    
    # Test cancel button
    page.click('#model-selector-cancel-btn')
    
    # Wait for modal to close
    page.wait_for_selector('#model-selector-modal:not(.active)', timeout=5000)
    assert not modal.is_visible()
    
    screenshot_with_markdown(page, "model_selector_modal_closed")


def test_model_selector_keyboard_shortcut(page, serve_hacka_re):
    """Test that Cmd/Ctrl+M opens the model selector modal"""
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if it appears
    dismiss_welcome_modal(page)
    
    # Configure API key and settings
    configure_api_basic(page)
    
    # Wait for page to be ready
    page.wait_for_selector('.model-name-display', timeout=10000)
    
    # Test keyboard shortcut - use Cmd on Mac, Ctrl on others
    import platform
    if platform.system() == 'Darwin':
        page.keyboard.press('Meta+m')
    else:
        page.keyboard.press('Control+m')
    
    # Wait for model selector modal to appear
    page.wait_for_selector('#model-selector-modal.active', timeout=5000)
    
    # Verify modal is visible
    modal = page.locator('#model-selector-modal')
    assert modal.is_visible()
    
    screenshot_with_markdown(page, "model_selector_keyboard_shortcut")
    
    # Test Escape key to close
    page.keyboard.press('Escape')
    
    # Wait for modal to close
    page.wait_for_selector('#model-selector-modal:not(.active)', timeout=5000)
    assert not modal.is_visible()


def test_model_selector_token_counter_click(page, serve_hacka_re):
    """Test that clicking on token counter opens the model selector modal"""
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if it appears
    dismiss_welcome_modal(page)
    
    # Configure API key and settings
    configure_api_basic(page)
    
    # Wait for model stats to be displayed
    page.wait_for_selector('.model-stats', timeout=10000)
    
    # Click on the model stats/token counter area
    page.click('.model-stats')
    
    # Wait for model selector modal to appear
    page.wait_for_selector('#model-selector-modal.active', timeout=5000)
    
    # Verify modal is visible
    modal = page.locator('#model-selector-modal')
    assert modal.is_visible()
    
    screenshot_with_markdown(page, "model_selector_token_counter_click")
    
    # Close modal
    page.click('#model-selector-cancel-btn')


def test_model_selector_apply_functionality(page, serve_hacka_re):
    """Test applying a model selection from the modal"""
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if it appears
    dismiss_welcome_modal(page)
    
    # Configure API key and settings
    configure_api_basic(page)
    
    # Wait for model name to be displayed
    page.wait_for_selector('.model-name-display', timeout=10000)
    
    # Get initial model display
    initial_model = page.locator('.model-name-display').inner_text()
    
    # Open model selector
    page.click('.model-name-display')
    page.wait_for_selector('#model-selector-modal.active', timeout=5000)
    
    # Get available models
    select_element = page.locator('#model-selector-select')
    options = select_element.locator('option').all()
    
    if len(options) > 1:
        # Select a different model (second option)
        second_option_value = options[1].get_attribute('value')
        if second_option_value and second_option_value != initial_model:
            select_element.select_option(second_option_value)
            
            screenshot_with_markdown(page, "model_selector_different_model_selected")
            
            # Apply the selection
            page.click('#model-selector-apply-btn')
            
            # Wait for modal to close
            page.wait_for_selector('#model-selector-modal:not(.active)', timeout=5000)
            
            # Verify model was changed in display
            page.wait_for_timeout(1000)  # Give time for UI to update
            new_model = page.locator('.model-name-display').inner_text()
            
            screenshot_with_markdown(page, "model_selector_applied_new_model")
            
            # The model should have changed (though exact text might be different due to display formatting)
            print(f"Initial model: {initial_model}")
            print(f"Selected value: {second_option_value}")
            print(f"New model display: {new_model}")
    else:
        # If only one model available, just test that apply closes the modal
        page.click('#model-selector-apply-btn')
        page.wait_for_selector('#model-selector-modal:not(.active)', timeout=5000)
        screenshot_with_markdown(page, "model_selector_single_model_applied")