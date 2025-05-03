import pytest
import time
import os
import base64
import json
from dotenv import load_dotenv
from playwright.sync_api import Page, expect

from test_utils import timed_test, dismiss_welcome_modal, dismiss_settings_modal, check_system_messages

# Load environment variables from .env file in the current directory
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
# Get API key from environment variables
API_KEY = os.getenv("OPENAI_API_KEY", "sk-test-key-for-model-sharing-tests")

@timed_test
def test_model_sharing_link_creation(page, serve_hacka_re):
    """Test creating a share link with a specific model."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if already open
    dismiss_settings_modal(page)
    
    # Set up API key and model
    setup_api_and_model(page)
    
    # Click the share button to open share modal
    share_button = page.locator("#share-btn")
    share_button.click(timeout=1000)
    
    # Wait for the share modal to become visible
    page.wait_for_selector("#share-modal.active", state="visible", timeout=5000)
    
    # Make sure model sharing is enabled
    model_checkbox = page.locator("#share-model-checkbox")
    if not model_checkbox.is_checked():
        model_checkbox.check()
    
    # Generate a session key if needed
    session_key_input = page.locator("#session-key-input")
    session_key = session_key_input.input_value()
    
    if not session_key:
        # Generate a new session key
        regenerate_button = page.locator("#regenerate-password-btn")
        regenerate_button.click()
        
        # Wait for the session key to be generated
        time.sleep(0.5)
        
        # Get the generated session key
        session_key = session_key_input.input_value()
        print(f"Generated session key: {session_key}")
    
    # Click the generate share link button
    generate_button = page.locator("#generate-share-link-btn")
    generate_button.click()
    
    # Wait for the link to be generated
    time.sleep(1)
    
    # Get the generated link
    generated_link = page.locator("#generated-link").input_value()
    print(f"Generated share link: {generated_link}")
    
    # Verify the link contains the expected format
    assert "#gpt=" in generated_link, "Generated link does not contain the expected format"
    
    # Extract the encrypted data from the link
    encrypted_data = generated_link.split("#gpt=")[1]
    
    # Store the session key and encrypted data for the next test
    page.evaluate(f"""(sessionKey, encryptedData) => {{
        window.localStorage.setItem('test_session_key', sessionKey);
        window.localStorage.setItem('test_encrypted_data', encryptedData);
    }}""", session_key, encrypted_data)
    
    # Close the share modal
    close_button = page.locator("#close-share-modal-btn")
    close_button.click()
    
    # Wait for the modal to close
    page.wait_for_selector("#share-modal", state="hidden", timeout=5000)
    
    print("Model sharing link creation test passed")

@timed_test
def test_model_sharing_link_loading(page, serve_hacka_re):
    """Test loading a share link with a specific model."""
    # First, create a share link with a specific model and session key
    # This is done by constructing a URL with the encrypted data
    
    # Create a mock model to share
    mock_model = "llama-3.1-8b-instant"  # This matches the model from the console output
    
    # Create a payload with the model
    payload = {
        "apiKey": API_KEY,
        "model": mock_model
    }
    
    # Create a simple session key for testing
    test_session_key = "test_session_key_123"
    
    # Create a mock encrypted payload (in a real scenario, this would be encrypted)
    # For testing, we'll use a base64 encoded JSON string
    mock_encrypted_data = base64.b64encode(json.dumps(payload).encode()).decode()
    
    # Construct the URL with the encrypted data
    share_url = f"{serve_hacka_re}#gpt={mock_encrypted_data}"
    
    # Mock the decryption function to return our payload
    page.evaluate(f"""(testSessionKey, mockEncryptedData, mockPayload) => {{
        // Store the session key for later use
        window.localStorage.setItem('test_session_key', testSessionKey);
        
        // Override the CryptoUtils.decryptData function to return our mock payload
        const originalDecryptData = window.CryptoUtils.decryptData;
        window.CryptoUtils.decryptData = function(encryptedData, password) {{
            if (encryptedData === mockEncryptedData && password === testSessionKey) {{
                return mockPayload;
            }}
            return originalDecryptData(encryptedData, password);
        }};
    }}""", test_session_key, mock_encrypted_data, payload)
    
    # Navigate to the application with the share link
    page.goto(share_url)
    
    # Wait for the password modal to appear
    page.wait_for_selector("#password-modal", state="visible", timeout=5000)
    
    # Enter the session key
    password_input = page.locator("#decrypt-password")
    password_input.fill(test_session_key)
    
    # Submit the form
    password_form = page.locator("#password-form")
    password_form.evaluate("form => form.dispatchEvent(new Event('submit'))")
    
    # Wait for the password modal to close
    page.wait_for_selector("#password-modal", state="hidden", timeout=5000)
    
    # Check for system messages about the shared model
    time.sleep(1)  # Give time for system messages to appear
    system_messages = check_system_messages(page)
    
    # Verify that the model was applied
    model_info = page.locator("#model-info")
    model_text = model_info.text_content()
    print(f"Model info text: {model_text}")
    
    # Check if the model name appears in the model info
    assert mock_model in model_text or "llama" in model_text.lower(), f"Model info does not contain the expected model: {mock_model}"
    
    print("Model sharing link loading test passed")

def setup_api_and_model(page):
    """Set up API key and model for testing."""
    # Click the settings button
    settings_button = page.locator("#settings-btn")
    settings_button.click(timeout=1000)
    
    # Wait for the settings modal to become visible
    page.wait_for_selector("#settings-modal.active", state="visible", timeout=5000)
    
    # Enter the API key
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill(API_KEY)
    
    # Mock the API response for model list
    def handle_models_request(route):
        route.fulfill(
            status=200,
            content_type="application/json",
            body="""
            {
                "data": [
                    {"id": "llama-3.1-8b-instant", "name": "Llama 3.1 8B Instant"},
                    {"id": "mixtral-8x7b-32768", "name": "Mixtral 8x7B 32K"},
                    {"id": "gemma-7b-it", "name": "Gemma 7B IT"}
                ]
            }
            """
        )
    
    # Intercept API calls to the models endpoint
    page.route("**/models", handle_models_request)
    
    # Select Groq Cloud as the API provider
    base_url_select = page.locator("#base-url-select")
    base_url_select.select_option("groq")
    
    # Click the reload models button
    reload_button = page.locator("#model-reload-btn")
    reload_button.click()
    
    # Wait for the models to be loaded
    time.sleep(1)
    
    # Select the Llama model
    model_select = page.locator("#model-select")
    model_select.select_option("llama-3.1-8b-instant")
    
    # Save the settings
    save_button = page.locator("#save-settings-btn")
    save_button.click(force=True)
    
    # Wait for the settings modal to close
    page.wait_for_selector("#settings-modal", state="hidden", timeout=5000)
