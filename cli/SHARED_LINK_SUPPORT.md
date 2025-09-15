# Shared Link Support for Browse and Chat Commands

## Overview

Both `browse` and `chat` subcommands now accept shared link components as optional arguments, allowing users to load encrypted configurations directly when starting either the web interface or terminal chat session.

## Supported Formats

All three formats are supported for both commands:

1. **Full URL**: `https://hacka.re/#gpt=eyJlbmM...`
2. **Fragment with prefix**: `gpt=eyJlbmM...`
3. **Raw encrypted data**: `eyJlbmM...`

## Usage

### Browse Command with Shared Links

Start the web server with a pre-loaded configuration:

```bash
# Load configuration and start web server
./hacka.re browse "gpt=eyJlbmM..."

# With custom port
./hacka.re browse -p 3000 "gpt=eyJlbmM..."

# Full URL format
./hacka.re browse "https://hacka.re/#gpt=eyJlbmM..."

# Just the encrypted blob
./hacka.re browse "eyJlbmM..."
```

When a shared link is provided:
1. Prompts for the decryption password
2. Validates the configuration
3. Starts the web server
4. Opens browser with the configuration pre-loaded in the URL fragment

### Chat Command with Shared Links

Start a terminal chat session with a shared configuration:

```bash
# Load configuration and start chat
./hacka.re chat "gpt=eyJlbmM..."

# Full URL format
./hacka.re chat "https://hacka.re/#gpt=eyJlbmM..."

# Just the encrypted blob
./hacka.re chat "eyJlbmM..."
```

When a shared link is provided:
1. Prompts for the decryption password
2. Validates the configuration
3. Starts the chat session with the loaded settings

## Implementation Details

### Browse Command Enhancement

The browse command now:
- Accepts an optional positional argument after flags
- Decrypts and validates the shared configuration
- Re-encrypts the configuration for the web interface
- Appends the fragment to the browser URL automatically

### Chat Command Consistency

The chat command already supported shared links and now:
- Has consistent help text with browse command
- Uses the same argument formats
- Provides the same user experience

### Security

- Password prompt is secure (no echo)
- Configuration is validated before use
- Encrypted data remains encrypted when passed to browser
- No plaintext configuration is exposed in URLs

## Examples

### Workflow: Share Configuration for Web Browsing

1. User A creates a configuration on hacka.re
2. User A shares the encrypted link with User B
3. User B runs: `./hacka.re browse "gpt=eyJlbmM..."`
4. User B enters the password
5. Browser opens with configuration pre-loaded

### Workflow: Quick Chat Session with Shared Config

1. Team shares a standard configuration
2. Team member runs: `./hacka.re chat "gpt=eyJlbmM..."`
3. Enters password once
4. Immediately starts chatting with pre-configured settings

## Benefits

- **Consistency**: Both commands work the same way
- **Convenience**: No need to manually import configurations
- **Security**: Passwords are handled securely
- **Flexibility**: Works with all three URL formats
- **Integration**: Seamless transition from CLI to web interface