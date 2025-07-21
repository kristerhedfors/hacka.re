# Share Modal Documentation

This document provides detailed information about the Share Modal in hacka.re and its elements for testing and development purposes.

## Overview

The Share Modal is a key component of the hacka.re interface that allows users to:

1. Create shareable links containing various application settings and content
2. Configure what information is included in the shared link
3. Protect shared content with password encryption
4. Generate QR codes for easy sharing

## Key Components

### Modal Structure

- **Share Options**: Checkboxes to select what to include in the shared link
- **Password/Session Key**: Field for the encryption password
- **Title/Subtitle**: Fields to customize the title and subtitle of the shared instance
- **Generated Link**: Display field for the generated shareable link
- **QR Code**: Visual representation of the shareable link
- **Action Buttons**: Generate Link, Copy Link, Copy Password, and Close buttons

### Important DOM Elements

| Element ID | Description | Notes |
|------------|-------------|-------|
| `#share-modal` | The main modal container | |
| `#share-form` | Form containing all share options | |
| `#close-share-modal` | Button to close the modal | |
| `#share-password` | Input field for encryption password | |
| `#lock-session-key-checkbox` | Checkbox to lock the session key | When checked, the same key is reused for future shares |
| `#password-input-container` | Container for password input | Gets 'locked' class when session key is locked |
| `#regenerate-password` | Button to generate a new random password | |
| `#copy-password` | Button to copy password to clipboard | |
| `.share-options` | Container for share option checkboxes | |
| `#share-base-url-checkbox` | Checkbox to include base URL in shared link | |
| `#share-api-key-checkbox` | Checkbox to include API key in shared link | |
| `#share-model-checkbox` | Checkbox to include model in shared link | |
| `#share-conversation-checkbox` | Checkbox to include conversation in shared link | |
| `#share-prompt-library-checkbox` | Checkbox to include prompt library in shared link | |
| `#share-function-library-checkbox` | Checkbox to include function library in shared link | |
| `#message-history-count` | Input for number of messages to include | Enabled when conversation checkbox is checked |
| `#message-history-container` | Container for message history count | Gets 'active' class when conversation checkbox is checked |
| `#share-welcome-message-checkbox` | Checkbox to include welcome message in shared link | |
| `#share-welcome-message` | Textarea for custom welcome message | |
| `#generate-share-link` | Button to generate the shareable link | |
| `#generated-link-container` | Container for the generated link | Hidden until link is generated |
| `#generated-link` | Input field containing the generated link | |
| `#copy-generated-link` | Button to copy the generated link | |
| `#qr-code-container` | Container for the QR code | |

## Key Behaviors

### Share Options

1. **Base URL**:
   - When checked, includes the current API base URL in the shared link
   - Allows the recipient to use the same API endpoint

2. **API Key**:
   - When checked, includes the current API key in the shared link
   - Allows the recipient to use the same API key
   - The API key is encrypted with the password/session key

3. **Model**:
   - When checked, includes the current model selection in the shared link
   - Allows the recipient to use the same model

4. **Conversation**:
   - When checked, includes the chat conversation in the shared link
   - The number of messages to include can be specified
   - Messages are included from newest to oldest

5. **Prompt Library**:
   - When checked, includes the user's custom prompts in the shared link
   - Allows the recipient to use the same custom prompts

6. **Function Library**:
   - When checked, includes the user's JavaScript functions in the shared link
   - Allows the recipient to use the same functions for tool calling

### Password/Session Key Management

1. **Password Generation**:
   - A strong random password is generated automatically
   - The "Regenerate Password" button creates a new random password
   - The password is used to encrypt the shared content

2. **Session Key Locking**:
   - When the "Lock session key" checkbox is checked, the current password is saved as a session key
   - The session key is reused for future shares until unlocked
   - When locked, the password field becomes read-only

3. **Password Copying**:
   - The "Copy Password" button copies the password to the clipboard
   - A visual notification confirms the copy action

### Link Generation and Sharing

1. **Link Generation**:
   - The "Generate Link" button creates a shareable link based on selected options
   - The link contains encrypted data based on the selected share options
   - The link is displayed in the "Generated Link" field

2. **Link Copying**:
   - The "Copy Link" button copies the generated link to the clipboard
   - A visual notification confirms the copy action

3. **QR Code**:
   - A QR code is automatically generated for the shareable link
   - The QR code can be scanned to open the shared link on mobile devices

## Interactions with Other Components

### Settings Manager

The Share Modal interacts with the Settings Manager to:
1. Retrieve the current API key, base URL, and model
2. Access the current system prompt configuration

### Prompts Manager

When the "Include Prompt Library" option is selected:
1. The Share Modal retrieves all custom prompts from the Prompts Manager
2. Selected prompts are included in the shared link

### Function Calling Manager

When the "Include Function Library" option is selected:
1. The Share Modal retrieves all JavaScript functions from the Function Calling Manager
2. Function definitions, tool definitions, and enabled status are included in the shared link

## Testing the Share Modal

### Test Setup

Before testing the Share Modal, ensure:
1. The welcome modal is dismissed (if present)
2. An API key is configured (required for generating links)

```python
# Standard setup for share modal tests
page.goto(serve_hacka_re)
dismiss_welcome_modal(page)
configure_api_key(page, "test-api-key")
```

### Opening the Modal

```python
# Open share modal
page.locator("#share-btn").click()
share_modal = page.locator("#share-modal")
expect(share_modal).to_be_visible()
```

### Configuring Share Options

```python
# Select share options
page.locator("#share-api-key-checkbox").check()
page.locator("#share-model-checkbox").check()
page.locator("#share-conversation-checkbox").check()

# Set message history count
page.locator("#message-history-count").fill("5")

# Check welcome message checkbox and set custom welcome message
page.locator("#share-welcome-message-checkbox").check()
page.locator("#share-welcome-message").fill("Welcome to my custom AI assistant!")
```

### Generating and Copying a Link

```python
# Generate link
page.locator("#generate-share-link").click()

# Wait for the generated link to appear
generated_link_container = page.locator("#generated-link-container")
expect(generated_link_container).to_be_visible()

# Verify the link was generated
generated_link = page.locator("#generated-link")
expect(generated_link).not_to_have_value("")

# Copy the link
page.locator("#copy-generated-link").click()

# Verify the copy notification appears
page.wait_for_selector(".copy-notification", state="visible")
```

### Testing Password Management

```python
# Get the initial password
initial_password = page.locator("#share-password").input_value()

# Regenerate password
page.locator("#regenerate-password").click()

# Verify the password changed
new_password = page.locator("#share-password").input_value()
assert initial_password != new_password

# Lock the session key
page.locator("#lock-session-key-checkbox").check()

# Verify the password field is locked
password_container = page.locator("#password-input-container")
expect(password_container).to_have_class("locked")

# Try to regenerate password (should not change when locked)
page.locator("#regenerate-password").click()
locked_password = page.locator("#share-password").input_value()
assert new_password == locked_password
```

## Common Testing Pitfalls

### 1. Not Waiting for Link Generation

Link generation involves encryption and can take time. Always wait for the generated link container to be visible:

```python
# Wait for the generated link to appear
page.wait_for_selector("#generated-link-container", state="visible")
```

### 2. Not Handling Copy Notifications

Copy operations show temporary notifications. Tests should either:
1. Wait for the notification to appear and then disappear
2. Or continue without waiting, as the notification doesn't block UI interaction

```python
# Wait for copy notification to appear
page.wait_for_selector(".copy-notification", state="visible")

# Optionally wait for it to disappear
page.wait_for_selector(".copy-notification", state="hidden", timeout=2000)
```

### 3. Not Accounting for Session Key Behavior

The session key behavior can affect tests that run in sequence:
1. If a test locks the session key, subsequent tests will use that key
2. Tests should explicitly unlock the session key if they need to test password generation

```python
# Unlock the session key at the start of a test
if page.locator("#password-input-container").has_class("locked"):
    page.locator("#lock-session-key-checkbox").uncheck()
```

## Implementation Details

### Share Link Format

The shareable link is a URL with a hash fragment containing encrypted data:
- Base URL: `https://hacka.re/`
- Hash fragment: `#share=<encrypted-data>`
- The encrypted data is encoded using RC4 encryption and Base64 encoding

### Data Encryption

The Share Modal uses RC4 encryption to protect sensitive data:
1. The password/session key is used as the encryption key
2. The data is serialized to JSON before encryption
3. The encrypted data is Base64-encoded for URL safety

### QR Code Generation

QR codes are generated using the qrcode.js library:
1. The shareable link is passed to the QR code generator
2. The QR code is rendered as an SVG in the `#qr-code-container`
3. The QR code is regenerated whenever a new link is created

### Share Options Storage

Share options are saved to localStorage to remember the user's preferences:
- `share_options`: Object containing all share option settings
- Options are loaded when the Share Modal is opened
- Options are saved when a link is generated

## Conclusion

The Share Modal is a powerful feature that allows users to share their hacka.re configuration and content with others. By following the guidelines in this document, you can write robust tests that accurately verify the functionality of this feature.
