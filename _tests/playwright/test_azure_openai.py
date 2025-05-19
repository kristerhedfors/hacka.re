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
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Open settings modal
    page.click("#settings-btn")
    
    # Select Azure OpenAI provider
    page.select_option("#base-url-select", "azure-openai")
    
    # Verify that Azure OpenAI settings are displayed
    expect(page.locator("#azure-settings-group")).to_be_visible()
    
    # Fill in Azure OpenAI settings
    page.fill("#azure-api-base", "https://test-resource.openai.azure.com")
    page.fill("#azure-api-version", "2024-03-01-preview")
    page.fill("#azure-deployment-name", "test-deployment")
    page.fill("#azure-model-name", "gpt-4")
    page.fill("#azure-model-name", "gpt-4")
    
    # Fill in API key
    page.fill("#api-key-update", "test-api-key")
    
    # Save settings
    page.click("#save-settings-btn")
    
    # Verify that a system message is displayed confirming settings were saved
    expect(page.locator(".message.system")).to_contain_text("Settings saved")
    
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
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Open settings modal
    page.click("#settings-btn")
    
    # Select Azure OpenAI provider
    page.select_option("#base-url-select", "azure-openai")
    
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
    
    # Clear all settings
    page.click("#clear-all-settings")
    
    # Confirm clearing settings
    page.on("dialog", lambda dialog: dialog.accept())
    
    # Verify that a system message is displayed confirming settings were cleared
    expect(page.locator(".message.system")).to_contain_text("All settings have been cleared")
    
    # Open settings modal again to verify settings were cleared
    page.click("#settings-btn")
    
    # Verify that Azure OpenAI is not selected (should be default provider)
    expect(page.locator("#base-url-select")).not_to_have_value("azure-openai")
    
    # Verify that Azure OpenAI settings are not displayed
    expect(page.locator("#azure-settings-group")).not_to_be_visible()
    
    # Close settings modal
    page.click("#close-settings")

def test_azure_openai_provider_switch(page, serve_hacka_re):
    """Test switching between Azure OpenAI and other providers"""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Open settings modal
    page.click("#settings-btn")
    
    # First check that standard model dropdown and reload button are visible with default provider
    expect(page.locator("#model-select")).to_be_visible()
    expect(page.locator("#reload-models-btn")).to_be_visible()
    
    # Select Azure OpenAI provider
    page.select_option("#base-url-select", "azure-openai")
    
    # Verify that Azure OpenAI settings are displayed
    expect(page.locator("#azure-settings-group")).to_be_visible()
    
    # Verify that standard model dropdown and reload button are hidden when Azure OpenAI is selected
    expect(page.locator("#model-select")).not_to_be_visible()
    expect(page.locator("#reload-models-btn")).not_to_be_visible()
    
    # Switch to OpenAI provider
    page.select_option("#base-url-select", "openai")
    
    # Verify that Azure OpenAI settings are not displayed
    expect(page.locator("#azure-settings-group")).not_to_be_visible()
    
    # Verify that standard model dropdown and reload button are visible again
    expect(page.locator("#model-select")).to_be_visible()
    expect(page.locator("#reload-models-btn")).to_be_visible()
    
    # Switch back to Azure OpenAI provider
    page.select_option("#base-url-select", "azure-openai")
    
    # Verify that Azure OpenAI settings are displayed again
    expect(page.locator("#azure-settings-group")).to_be_visible()
    
    # Verify again that standard model dropdown and reload button are hidden
    expect(page.locator("#model-select")).not_to_be_visible()
    expect(page.locator("#reload-models-btn")).not_to_be_visible()
    
    # Close settings modal
    page.click("#close-settings")
