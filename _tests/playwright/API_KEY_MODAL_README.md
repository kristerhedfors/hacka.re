# API Key Modal Documentation

This document provides information about the API Key Modal in hacka.re and its elements for testing and development purposes.

## Overview

The API Key Modal is a simple, lightweight modal that serves as a fallback or legacy interface for API key entry. It provides a quick way for users to enter their API key without accessing the full Settings Modal.

**Note**: For primary API configuration and testing, use the Settings Modal instead. The API Key Modal has limited functionality compared to the full Settings Modal.

## Key Components

### Modal Structure

- **Modal Header**: Simple title for API key entry
- **Information Text**: Brief explanation about API key privacy
- **API Key Input**: Single input field for the API key
- **Action Button**: Submit button to save the API key

### Important DOM Elements

| Element ID | Description | Notes |
|------------|-------------|-------|
| `#api-key-modal` | The main modal container | Legacy/fallback modal |
| `.modal-content` | Container for the modal content | |
| `#api-key-form` | Form containing the API key input | |

## Key Behaviors

### Modal Usage

1. **Simple API Key Entry**: Provides a minimal interface for entering an API key
2. **Privacy Notice**: Informs users that the API key is stored locally and not sent to external servers
3. **Basic Validation**: Performs simple validation on API key format

### Storage

- API keys entered through this modal are stored in localStorage
- The key is encrypted using the same encryption system as the Settings Modal

## Testing the API Key Modal

### Opening the Modal

The API Key Modal is typically shown programmatically rather than through a button click. It may appear:
- As a fallback when the Settings Modal is not available
- In certain error conditions
- For simplified onboarding flows

```python
# The modal may be triggered programmatically
# Check if it's visible
api_key_modal = page.locator("#api-key-modal")
if api_key_modal.is_visible():
    expect(api_key_modal).to_be_visible()
```

### Entering an API Key

```python
# If the API key modal is present, fill it
api_key_form = page.locator("#api-key-form")
if api_key_form.is_visible():
    # Fill the API key
    page.fill("#api-key-form input[type='password']", "test-api-key")
    
    # Submit the form
    page.locator("#api-key-form button[type='submit']").click()
```

## Common Testing Pitfalls

### 1. Assuming Modal is Always Present

The API Key Modal is not always present in the DOM. Always check for its existence before interacting with it:

```python
# Check if modal exists before testing
if page.locator("#api-key-modal").count() > 0:
    # Test the modal
    pass
else:
    # Use Settings Modal instead
    pass
```

### 2. Preferring Settings Modal

For comprehensive testing, prefer using the Settings Modal over the API Key Modal:

```python
# Preferred approach - use Settings Modal
page.locator("#settings-btn").click()
settings_modal = page.locator("#settings-modal")
expect(settings_modal).to_be_visible()
```

## Implementation Details

### Modal Purpose

The API Key Modal serves as:
- A legacy interface for backwards compatibility
- A fallback option when the full Settings Modal cannot be used
- A simplified entry point for basic API key configuration

### Integration

- Shares the same storage system as the Settings Modal
- Uses the same encryption for API key security
- Minimal UI for focused API key entry only

## Conclusion

While the API Key Modal exists in the application, it serves a limited role compared to the comprehensive Settings Modal. For most testing scenarios, prefer using the Settings Modal which provides complete API configuration options and better test coverage of the application's configuration functionality.