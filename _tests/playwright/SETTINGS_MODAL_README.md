# Settings Modal Documentation

This document provides detailed information about the Settings Modal in hacka.re and its elements for testing and development purposes.

## 🔄 Recent Refactoring

The Settings Modal has been extensively refactored into a modular, component-based architecture:

### New Architecture (13 Specialized Components)

**Core Coordination:**
- `settings-manager.js` - Main entry point
- `settings-coordinator.js` - Core coordination logic  
- `settings-initialization.js` - Setup and initialization
- `settings-state-manager.js` - State management and persistence

**Specialized Managers:**
- `api-key-manager.js` - API key management and validation
- `base-url-manager.js` - API base URL configuration
- `model-manager.js` - AI model selection and management
- `system-prompt-manager.js` - System prompt configuration
- `title-subtitle-manager.js` - Title and subtitle management
- `tool-calling-manager.js` - Tool calling configuration
- `welcome-manager.js` - Welcome modal and onboarding

**Sharing Components:**
- `shared-link-manager.js` - Shared link functionality
- `shared-link-data-processor.js` - Shared link data processing
- `shared-link-modal-manager.js` - Shared link modal UI

## Overview

The Settings Modal is a core component of the hacka.re interface that allows users to configure various application settings, including:

1. API provider and base URL
2. API key
3. Model selection
5. System prompt configuration (via the Prompts Modal)

## Key Components

### Modal Structure

- **Settings Header**: Title with info icon and tooltip containing application information
- **API Provider Selection**: Dropdown to select the API provider (Groq, OpenAI, Ollama, or Custom)
- **Base URL Configuration**: Input field for custom base URL (visible when "Custom" provider is selected)
- **API Key Input**: Field to enter the API key
- **Model Selection**: Dropdown to select the AI model with reload button
- **System Prompt Configuration**: Link to open the Prompts Modal with preview area
- **Action Buttons**: Save Settings, Close/Cancel, and Delete GPT namespace link

### Important DOM Elements

| Element ID | Description | Notes |
|------------|-------------|-------|
| `#settings-modal` | The main modal container | |
| `#settings-form` | Form containing all settings inputs | |
| `#settings-info-icon` | Info icon in settings header | Contains tooltip with app information |
| `#base-url-select` | Dropdown for selecting API provider | Options: groq, openai, ollama, custom |
| `#custom-base-url-group` | Container for custom base URL field | Hidden by default, shown when "custom" selected |
| `#base-url` | Input field for custom base URL | Visible when "Custom" provider is selected |
| `#api-key-update` | Input field for API key | Password type field with placeholder |
| `#model-select` | Dropdown for selecting AI model | Populated dynamically from API |
| `#model-reload-btn` | Button to reload available models | Icon button with sync icon |
| `#open-prompts-config` | Link to open the Prompts Modal | Styled as function-library-link |
| `#system-prompt-preview` | Container for system prompt preview | Hidden by default |
| `#save-settings-btn` | Button to save settings | Primary button, form submit type |
| `#close-settings` | Button to close the Settings Modal | Secondary button |
| `#clear-all-settings` | Link to delete GPT namespace and settings | Styled as function-library-link |

## Key Behaviors

### Provider Selection

When a provider is selected from the dropdown:
1. The base URL is automatically set to the provider's default URL
2. If "Custom" is selected, the custom base URL group becomes visible
3. The model dropdown is updated with appropriate models for the selected provider

### API Key Handling

1. When an API key exists, it's displayed as placeholder dots
2. New API key is saved only if the field is not empty
3. API key is stored in localStorage with encryption

### Model Selection

1. Models are fetched from the API when:
   - The API key or base URL changes
   - The model reload button is clicked
   - The settings modal is opened (if models haven't been fetched recently)
2. If models can't be fetched, default models are populated
3. The selected model is saved to localStorage

### System Prompt Configuration

The system prompt section:
1. Shows a link to open the Prompts Modal for configuration
2. May display a preview area for the current system prompt (hidden by default)
3. The system prompt is composed of checked prompts in the prompt library

### Clearing Settings

The "Delete GPT namespace and settings" link:
1. Removes all settings from localStorage
2. Clears the chat history and conversation data
3. Resets the title and subtitle
4. Clears all namespace-specific data

## Interactions with Other Components

### Welcome Modal

The Settings Modal is shown automatically after:
1. The Welcome Modal is closed (for first-time users)
2. When no API key is found in localStorage

### Prompts Modal

The "Configure System Prompt" button opens the Prompts Modal, which allows users to:
1. Create and manage custom prompts
2. Select default prompts
3. Combine multiple prompts to create a system prompt

### Share Modal

The Settings Modal interacts with the Share Modal when:
1. A shared link contains settings (API key, base URL, model)
2. The user needs to enter a password to decrypt shared settings

## Testing the Settings Modal

### Test Setup

Before testing the Settings Modal, ensure:
1. The welcome modal is dismissed (if present)
2. Any existing settings are cleared (if needed for the test)

```python
# Standard setup for settings modal tests
page.goto(serve_hacka_re)
dismiss_welcome_modal(page)
```

### Opening the Modal

```python
# Open settings modal
page.locator("#settings-btn").click()
settings_modal = page.locator("#settings-modal")
expect(settings_modal).to_be_visible()
```

### Configuring Settings

```python
# Select API provider
base_url_select = page.locator("#base-url-select")
base_url_select.select_option("openai")

# Enter API key
api_key_input = page.locator("#api-key-update")
api_key_input.fill("test-api-key")

# Select model
model_select = page.locator("#model-select")
model_select.select_option("gpt-4o")

# Save settings
page.locator("#save-settings").click()

# Verify settings modal is closed
expect(settings_modal).not_to_be_visible()
```

### Testing Custom Provider Configuration

```python
# Open settings modal
page.locator("#settings-btn").click()

# Select Custom provider
base_url_select = page.locator("#base-url-select")
base_url_select.select_option("custom")

# Verify custom base URL field is visible
custom_url_group = page.locator("#custom-base-url-group")
expect(custom_url_group).to_be_visible()

# Fill custom base URL
page.locator("#base-url").fill("https://custom-api.example.com/v1")

# Enter API key
api_key_input = page.locator("#api-key-update")
api_key_input.fill("test-api-key")

# Save settings
page.locator("#save-settings-btn").click()
```

### Testing Delete GPT Namespace

```python
# Open settings modal
page.locator("#settings-btn").click()

# Handle the confirmation dialog
page.on("dialog", lambda dialog: dialog.accept())

# Click delete GPT namespace and settings
page.locator("#clear-all-settings").click()

# Verify settings modal is closed
expect(settings_modal).not_to_be_visible()

# Verify system message about clearing settings
system_message = page.locator(".message.system .message-content").last
expect(system_message).to_contain_text("namespace cleared")
```

## Common Testing Pitfalls

### 1. Not Handling Confirmation Dialogs

When clearing all settings, a confirmation dialog appears. Always set up a dialog handler before triggering the action:

```python
# Set up dialog handler before triggering action
page.on("dialog", lambda dialog: dialog.accept())
clear_button.click()  # Action that triggers a dialog
```

### 2. Not Waiting for Model Fetching

When changing API key or base URL, models are fetched asynchronously. Wait for the model select to be populated:

```python
# Wait for models to be fetched
page.wait_for_selector("#model-select option:not([disabled])", state="visible")
```

### 3. Not Checking for Custom Provider UI Changes

When selecting Custom provider, the UI changes. Ensure tests account for:
- Custom base URL field becoming visible
- Different validation requirements for custom endpoints
- Model fetching behavior with custom APIs

## Implementation Details

### Refactored Storage Architecture

**Service-Based Storage:**
- `settings-state-manager.js` - Centralized state management
- `core-storage-service.js` - Core storage operations
- `namespace-service.js` - Multi-tenant data isolation
- `encryption-service.js` - Data encryption/decryption

**Storage Structure:**
- `api_key`: The API key (encrypted via encryption-service)
- `model`: The selected model (managed by model-manager)
- `base_url`: The base URL for API requests (managed by base-url-manager)
- `base_url_provider`: The selected provider (groq, openai, ollama, custom)
- Various model and configuration data cached by provider

**Component Coordination:**
- Each specialized manager handles its own storage concerns
- State synchronization via settings-coordinator
- Centralized validation and error handling

### Model Caching

To improve performance, models are cached:
- Models are fetched when the settings modal is opened only if they haven't been fetched recently
- A 60-second cache timeout prevents excessive API calls
- The model reload button forces a fresh fetch regardless of cache

### API Key Security

API keys are handled securely:
- API keys are stored encrypted in localStorage
- When displayed in the UI, they are masked with placeholder dots
- They are only sent to the specified API endpoint, never to Github Pages where hacka.re static files are hosted

## Conclusion

The Settings Modal is a critical component of the hacka.re interface, providing users with the ability to configure the application to work with various AI providers. By following the guidelines in this document, you can write robust tests that accurately verify the functionality of this feature.
