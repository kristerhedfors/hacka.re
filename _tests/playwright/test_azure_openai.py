import pytest
from playwright.sync_api import expect
import time
import re
from test_utils import dismiss_welcome_modal

"""
Test for Azure OpenAI integration
"""

def test_azure_openai_settings(page, serve_hacka_re):
    """Test that Azure OpenAI settings can be configured in the settings modal"""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Wait for the page to load
    page.wait_for_selector("body", state="visible")
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Open settings modal
    page.click("#settings-btn")
    
    # Wait for settings modal to be fully loaded and visible
    page.wait_for_selector("#settings-modal.active", state="visible", timeout=5000)
    
    # Wait for the base-url-select to be visible and enabled
    page.wait_for_selector("#base-url-select", state="visible", timeout=5000)
    
    # First check that standard model dropdown is visible with default provider
    expect(page.locator("#model-select")).to_be_visible()
    
    # Select Azure OpenAI provider
    base_url_select = page.locator("#base-url-select")
    base_url_select.select_option("azure-openai")
    
    # Wait for the change to take effect
    page.wait_for_timeout(500)
    
    # Verify that Azure OpenAI settings are displayed
    expect(page.locator("#azure-settings-group")).to_be_visible()
    
    # Verify that standard model dropdown is hidden when Azure OpenAI is selected
    expect(page.locator("#model-select")).not_to_be_visible()
    
    # Fill in Azure OpenAI settings
    page.fill("#azure-api-base", "https://test-resource.openai.azure.com")
    page.fill("#azure-api-version", "2024-03-01-preview")
    page.fill("#azure-deployment-name", "test-deployment")
    page.fill("#azure-model-name", "gpt-4")
    
    # Fill in API key
    page.fill("#api-key-update", "test-api-key")
    
    # Save settings
    page.click("#save-settings-btn")
    
    # Wait for a moment to ensure the system message appears
    page.wait_for_timeout(500)
    
    # Get the count of system messages before checking
    system_messages_count = page.locator(".message.system").count()
    
    # Verify that a system message is displayed confirming settings were saved
    # Use the last system message which should be the most recent one
    last_system_message = page.locator(".message.system").nth(system_messages_count - 1)
    expect(last_system_message).to_contain_text("Settings saved")
    
    # Open settings modal again to verify settings were saved
    page.click("#settings-btn")
    
    # Verify that Azure OpenAI is still selected
    expect(page.locator("#base-url-select")).to_have_value("azure-openai")
    
    # Verify that Azure OpenAI settings are still displayed
    expect(page.locator("#azure-settings-group")).to_be_visible()
    
    # Verify that Azure OpenAI settings have the correct values
    expect(page.locator("#azure-api-base")).to_have_value("https://test-resource.openai.azure.com")
    expect(page.locator("#azure-api-version")).to_have_value("2024-03-01-preview")
    expect(page.locator("#azure-deployment-name")).to_have_value("test-deployment")
    expect(page.locator("#azure-model-name")).to_have_value("gpt-4")
    
    # Close settings modal
    page.click("#close-settings")

def test_azure_openai_clear_settings(page, serve_hacka_re):
    """Test that Azure OpenAI settings are cleared when clearing all settings"""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Wait for the page to load
    page.wait_for_selector("body", state="visible")
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Open settings modal
    page.click("#settings-btn")
    
    # Wait for settings modal to be fully loaded and visible
    page.wait_for_selector("#settings-modal.active", state="visible", timeout=5000)
    
    # Wait for the base-url-select to be visible and enabled
    page.wait_for_selector("#base-url-select", state="visible", timeout=5000)
    
    # First check that standard model dropdown is visible with default provider
    expect(page.locator("#model-select")).to_be_visible()
    
    # Select Azure OpenAI provider
    base_url_select = page.locator("#base-url-select")
    base_url_select.select_option("azure-openai")
    
    # Wait for the change to take effect
    page.wait_for_timeout(500)
    
    # Verify that standard model dropdown is hidden when Azure OpenAI is selected
    expect(page.locator("#model-select")).not_to_be_visible()
    
    # Fill in Azure OpenAI settings
    page.fill("#azure-api-base", "https://test-resource.openai.azure.com")
    page.fill("#azure-api-version", "2024-03-01-preview")
    page.fill("#azure-deployment-name", "test-deployment")
    
    # Fill in API key
    page.fill("#api-key-update", "test-api-key")
    
    # Save settings
    page.click("#save-settings-btn")
    
    # Open settings modal again
    page.click("#settings-btn")
    
    # Set up dialog handler before clicking clear all settings
    page.on("dialog", lambda dialog: dialog.accept())
    
    # Clear all settings
    page.click("#clear-all-settings")
    
    # Wait for a moment to ensure the system message appears
    page.wait_for_timeout(500)
    
    # Get the count of system messages before checking
    system_messages_count = page.locator(".message.system").count()
    
    # Verify that a system message is displayed confirming settings were cleared
    # Use the last system message which should be the most recent one
    last_system_message = page.locator(".message.system").nth(system_messages_count - 1)
    expect(last_system_message).to_contain_text("All settings have been cleared")
    
    # Open settings modal again to verify settings were cleared
    page.click("#settings-btn")
    
    # Verify that Azure OpenAI is not selected (should be default provider)
    expect(page.locator("#base-url-select")).not_to_have_value("azure-openai")
    
    # Verify that Azure OpenAI settings are not displayed
    expect(page.locator("#azure-settings-group")).not_to_be_visible()
    
    # Verify that standard model dropdown is visible again after clearing settings
    expect(page.locator("#model-select")).to_be_visible()
    
    # Close settings modal
    page.click("#close-settings")

def test_azure_openai_provider_switch(page, serve_hacka_re):
    """Test switching between Azure OpenAI and other providers"""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Wait for the page to load
    page.wait_for_selector("body", state="visible")
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Open settings modal
    page.click("#settings-btn")
    
    # Wait for settings modal to be fully loaded and visible
    page.wait_for_selector("#settings-modal.active", state="visible", timeout=5000)
    
    # Wait for the base-url-select to be visible and enabled
    page.wait_for_selector("#base-url-select", state="visible", timeout=5000)
    
    # First check that standard model dropdown is visible with default provider
    expect(page.locator("#model-select")).to_be_visible()
    
    # Select Azure OpenAI provider
    base_url_select = page.locator("#base-url-select")
    base_url_select.select_option("azure-openai")
    
    # Wait for the change to take effect
    page.wait_for_timeout(500)
    
    # Verify that Azure OpenAI settings are displayed
    expect(page.locator("#azure-settings-group")).to_be_visible()
    
    # Verify that standard model dropdown is hidden when Azure OpenAI is selected
    expect(page.locator("#model-select")).not_to_be_visible()
    
    # Switch to OpenAI provider
    base_url_select = page.locator("#base-url-select")
    base_url_select.select_option("openai")
    
    # Wait for the change to take effect
    page.wait_for_timeout(500)
    
    # Verify that Azure OpenAI settings are not displayed
    expect(page.locator("#azure-settings-group")).not_to_be_visible()
    
    # Verify that standard model dropdown is visible again
    expect(page.locator("#model-select")).to_be_visible()
    
    # Switch back to Azure OpenAI provider
    base_url_select = page.locator("#base-url-select")
    base_url_select.select_option("azure-openai")
    
    # Wait for the change to take effect
    page.wait_for_timeout(500)
    
    # Verify that Azure OpenAI settings are displayed again
    expect(page.locator("#azure-settings-group")).to_be_visible()
    
    # Verify again that standard model dropdown is hidden
    expect(page.locator("#model-select")).not_to_be_visible()
    
    # Close settings modal
    page.click("#close-settings")
