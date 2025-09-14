# Shared Links Architecture Documentation

## Overview

The shared links feature in hacka.re enables users to create encrypted, shareable URLs that contain application configurations, data, and state. This document provides a comprehensive technical overview of how shared links work, intended for LLM-assisted workflows and developers implementing persistent history for shared links.

## Architecture Components

### 1. Core Services

#### LinkSharingService (`js/services/link-sharing-service.js`)
- **Purpose**: Low-level service handling URL construction, encryption, and decryption
- **Key Methods**:
  - `createShareableLink(apiKey, password)`: Creates a simple encrypted link with just API key
  - `createCustomShareableLink(payload, password, options)`: Creates comprehensive links with multiple data types
  - `hasSharedApiKey()`: Checks if current URL contains shared data
  - `extractSharedApiKey(password)`: Decrypts and extracts data from URL
  - `clearSharedApiKeyFromUrl()`: Removes shared data from URL after extraction

#### ShareService (`js/services/share-service.js`)
- **Purpose**: High-level orchestration of sharing functionality
- **Key Methods**:
  - `createShareLink(options)`: Main entry point for creating share links
  - `generateStrongPassword()`: Creates 12-character alphanumeric passwords
  - `createComprehensiveShareableLink(options, password)`: Legacy wrapper for backward compatibility

### 2. UI Components

#### ShareManager (`js/components/share-manager.js`)
- **Purpose**: Manages share modal UI and user interactions
- **Responsibilities**:
  - Handle checkbox selections for what to include
  - Manage password/session key generation and locking
  - Coordinate link generation with services
  - Store/retrieve share preferences

#### ShareUIManager (`js/components/ui/share-ui-manager.js`)
- **Purpose**: Visual feedback and UI updates
- **Key Features**:
  - Link length estimation bar
  - Copy-to-clipboard notifications
  - Warning messages for sensitive data
  - QR code generation

### 3. Data Processing

#### SharedLinkManager (`js/components/settings/shared-link-manager.js`)
- **Purpose**: Handles incoming shared links
- **Key Methods**:
  - `hasSharedLink()`: Detects shared link in URL
  - `promptForDecryptionPassword()`: Shows password modal
  - `trySessionKeyDecryption()`: Attempts automatic decryption with stored session key

#### SharedLinkDataProcessor (`js/components/settings/shared-link-data-processor.js`)
- **Purpose**: Applies shared data to application state
- **Handles**:
  - API keys and configuration
  - Chat messages and system prompts
  - Prompt and function libraries
  - MCP connections (GitHub tokens, etc.)

#### ConfigurationService (`js/services/configuration-service.js`)
- **Purpose**: Unified configuration collection and application
- **Key Methods**:
  - `collectCurrentConfiguration(options)`: Gathers all shareable data
  - `applyConfiguration(config)`: Applies shared configuration to app

## URL Structure

### Format
```
https://hacka.re/#gpt=<encrypted-base64-data>
```

### Components
- **Base URL**: The hacka.re domain and path
- **Fragment Identifier**: `#gpt=` (legacy: `#shared=`)
- **Encrypted Data**: Base64-encoded encrypted payload

### Why Fragment Identifier?
- Never sent to server (privacy)
- Accessible via JavaScript
- Survives page refreshes
- Works with static hosting

## Encryption Details

### Algorithm: TweetNaCl (NaCl secretbox)
- **Symmetric encryption**: XSalsa20-Poly1305 authenticated encryption
- **Key Derivation**: Iterative SHA-512 (computational irreducibility)
- **Structure**: 
  ```
  [10-byte salt][10-byte nonce][encrypted payload]
  ```
- **Encoding**: Base64 URL-safe encoding

### Dual-Key Architecture
1. **Decryption Key**: Derived from `password + salt`
   - Used to decrypt the shared payload
   - 8,192 rounds of SHA-512 iteration
   
2. **Master Key**: Derived from `password + salt + nonce`
   - Used for localStorage encryption
   - Never transmitted in the share link
   - Derived implicitly on the receiving end

### Encryption Process
1. User provides or generates password (12 alphanumeric characters)
2. Payload compressed and serialized to JSON
3. Salt generated (10 random bytes)
4. Nonce generated (10 random bytes)
5. Decryption key derived: 8,192 iterations of SHA-512(previous + salt)
6. Nonce expanded to 24 bytes via single SHA-512 hash
7. Data encrypted with XSalsa20-Poly1305
8. Binary structure `[salt][nonce][ciphertext]` Base64-encoded

### Security Considerations
- Password never included in URL
- Master key never transmitted (derived from visible parameters)
- Each link has unique salt and nonce
- 8,192 iterations provide time-based security
- Full 512-bit entropy preserved during key derivation
- Authenticated encryption prevents tampering

## Data Payload Structure

### Version 2.0 Schema
```javascript
{
  // Core Configuration
  "apiKey": "sk-...",              // Encrypted API key
  "baseUrl": "https://api...",     // API endpoint
  "model": "gpt-4",                // Selected model
  "provider": "openai",            // Provider name
  
  // Chat Data
  "systemPrompt": "You are...",    // System prompt
  "messages": [...],               // Chat history array
  "welcomeMessage": "Welcome...",  // Custom welcome message
  
  // Libraries
  "prompts": [...],                // Custom prompts array
  "selectedPromptIds": [...],      // Active prompt IDs
  "selectedDefaultPromptIds": [...], // Default prompt selections
  
  "functions": {...},              // JavaScript functions object
  "enabledFunctions": [...],       // Enabled function names
  
  // MCP Connections
  "mcpConnections": {
    "github": "ghp_...",           // GitHub token (string)
    "gmail": {...},                // Gmail OAuth data
    // Other OAuth connections
  }
}
```

### Data Size Considerations
- URLs have practical length limits (~2000 characters)
- Base64 encoding adds ~33% overhead
- Encryption adds only 20 bytes overhead (salt + nonce)
- UI shows real-time link length estimation

## Share Flow

### Creating a Share Link

1. **User Interaction**
   ```
   User → Opens Share Modal → Selects Options → Enters/Generates Password
   ```

2. **Data Collection**
   ```javascript
   ShareManager.generateComprehensiveShareLink()
   ├─ Validates selections
   ├─ Collects data based on checkboxes
   │  ├─ API configuration (if selected)
   │  ├─ Chat messages (if selected, with count limit)
   │  ├─ Prompt library (if selected)
   │  ├─ Function library (if selected)
   │  └─ MCP connections (if selected)
   └─ Passes to ShareService
   ```

3. **Link Generation**
   ```javascript
   ShareService.createShareLink()
   ├─ Builds payload object
   ├─ Calls LinkSharingService.createCustomShareableLink()
   │  ├─ JSON.stringify(payload)
   │  ├─ CryptoUtils.encryptData(json, password)
   │  └─ Returns base URL + #gpt= + encrypted data
   └─ Returns complete URL
   ```

4. **UI Update**
   ```
   Generated URL → Display in modal → Generate QR code → Enable copy buttons
   ```

### Opening a Share Link

1. **Detection**
   ```javascript
   App initialization
   ├─ SharedLinkManager.hasSharedLink() checks URL
   └─ If true, prompts for password
   ```

2. **Password Handling**
   ```javascript
   SharedLinkManager.promptForDecryptionPassword()
   ├─ First tries session key (if locked)
   ├─ If fails, shows password modal
   └─ User enters password
   ```

3. **Decryption**
   ```javascript
   LinkSharingService.extractSharedApiKey(password)
   ├─ Extracts encrypted data from URL
   ├─ CryptoUtils.decryptData(data, password)
   ├─ JSON.parse(decrypted)
   └─ Returns payload object
   ```

4. **Data Application**
   ```javascript
   SharedLinkDataProcessor.processSharedData()
   ├─ Validates data structure
   ├─ Applies each component:
   │  ├─ API key → DataService.saveApiKey()
   │  ├─ Model → Trigger model selection
   │  ├─ Messages → Load into chat
   │  ├─ Prompts → PromptsService.importPrompts()
   │  ├─ Functions → FunctionToolsService.importFunctions()
   │  └─ MCP → Restore connections
   └─ Clears URL hash
   ```

## Session Key Feature

### Purpose
- Convenience: Reuse same password for multiple shares
- Security: Password still required to decrypt links
- UX: Reduces friction for creating multiple links

### Implementation
```javascript
// Locking session key
ShareManager.setSessionKey(password)
├─ Stores in memory (not localStorage)
├─ Locks password field in UI
└─ Reuses for future shares

// Automatic decryption attempt
SharedLinkManager.trySessionKeyDecryption()
├─ Gets current session key
├─ Attempts decryption
└─ If successful, skips password prompt
```

## Special Features

### 1. MCP Connection Sharing
```javascript
// Collection
if (includeMcpConnections) {
  const githubToken = await CoreStorageService.getValue('mcp_github_token');
  if (githubToken) {
    // Ensure token is string, not object
    mcpConnections.github = typeof githubToken === 'object' ? 
                           githubToken.token : githubToken;
  }
}

// Application
if (data.mcpConnections?.github) {
  await CoreStorageService.setValue('mcp_github_token', data.mcpConnections.github);
  // Trigger reconnection if MCP service is available
}
```

### 2. Welcome Message
- Custom HTML-enabled welcome message
- Stored but not auto-displayed (privacy)
- Pre-populates share modal for re-sharing

### 3. Partial Sharing
- Any combination of components can be shared
- No longer requires API key (can share just conversation)
- Validation ensures at least one item selected

### 4. Link Length Management
```javascript
// Real-time estimation
updateLinkLengthBar() {
  let length = baseURL.length + 8; // "#gpt="
  
  // Add each component's size
  if (includeApiKey) length += apiKey.length + 20;
  if (includeMessages) length += JSON.stringify(messages).length;
  
  // Account for encoding
  length = Math.ceil(length * 1.33); // Base64
  length += 100; // Encryption overhead
  
  // Update UI
  progressBar.style.width = `${(length / 2000) * 100}%`;
}
```

## Storage and State

### What's Stored
- **Share preferences**: Which checkboxes were selected
- **Session key**: In memory only (not persisted)
- **Shared data**: Applied to respective services

### What's NOT Stored
- Generated links (privacy)
- Passwords (security)
- Link history (privacy)

## Error Handling

### Common Scenarios
1. **Invalid password**: Shows error, allows retry
2. **Corrupted data**: Graceful failure, logs error
3. **Missing components**: Applies what's available
4. **Version mismatch**: Future: migration logic

### User Feedback
- Password errors shown in modal
- System messages for success/failure
- Console logging for debugging

## Testing Considerations

### Key Test Cases
1. **Round-trip**: Data survives encryption/decryption
2. **Partial data**: Works with any combination
3. **Large payloads**: Handles conversation history
4. **Special characters**: JSON/Base64 encoding
5. **Session key**: Lock/unlock behavior
6. **MCP tokens**: Proper string handling

### Playwright Test Patterns
```python
# Create share link
share_button = page.locator("#share-btn")
share_button.click()
page.locator("#share-api-key-checkbox").check()
page.locator("#generate-share-link").click()
link = page.locator("#generated-link").input_value()

# Test link in new context
new_page = context.new_page()
new_page.goto(link)
# Enter password and verify data applied
```

## Implementation Tips for Persistent History

### Recommended Approach
1. **Store metadata, not links**:
   ```javascript
   {
     id: "share_123",
     created: "2024-01-01T00:00:00Z",
     components: ["apiKey", "model", "prompts"],
     description: "Shared API + Prompts",
     // Don't store: password, encrypted data, full link
   }
   ```

2. **Regenerate links on demand**:
   - Store configuration snapshots
   - Generate fresh links with new passwords
   - Ensures forward compatibility

3. **Privacy considerations**:
   - Allow users to delete history
   - Don't log sensitive data
   - Consider auto-expiration

4. **UI/UX suggestions**:
   - Show what was shared (checkboxes)
   - Quick "reshare" with same options
   - Copy previous selections

### Database Schema (Example)
```sql
CREATE TABLE share_history (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMP,
  components JSON,  -- ["apiKey", "model", etc.]
  description TEXT,
  metadata JSON,    -- Custom user notes
  expires_at TIMESTAMP
);
```

## Security Best Practices

1. **Never store passwords or full links**
2. **Use strong password generation** (12+ characters)
3. **Validate all shared data** before applying
4. **Sanitize HTML in welcome messages**
5. **Rate limit share creation** (if applicable)
6. **Consider link expiration** for sensitive data

## Future Enhancements

### Planned Features
1. **Compression**: Reduce payload size
2. **Chunked links**: Split large data across multiple URLs
3. **Expiring links**: Time-based invalidation
4. **Share templates**: Predefined sharing configurations
5. **Analytics**: Usage patterns (privacy-preserving)

### Backward Compatibility
- Support `#shared=` format (legacy)
- Version field enables migrations
- Graceful degradation for unknown fields

## Conclusion

The shared links architecture provides a secure, privacy-focused way to share hacka.re configurations. The system's modular design enables easy extension while maintaining security through client-side encryption. Understanding these components and flows is essential for implementing features like persistent share history while preserving the privacy-first philosophy of hacka.re.