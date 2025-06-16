# Share Modal Integration Guide

## Overview

The share modal in hacka.re provides a secure way to share application configurations and data through encrypted URLs. This guide explains how to integrate new items into the share modal, covering the complete process from UI to serialization/deserialization.

## Architecture Overview

### Core Components

1. **ShareManager** (`js/components/share-manager.js`)
   - Main orchestrator for sharing functionality
   - Manages modal state and user interactions
   - Coordinates between UI and service layers

2. **ShareService** (`js/services/share-service.js`)
   - Handles data collection and encryption
   - Creates shareable links
   - Manages share options persistence

3. **ShareUIManager** (`js/components/ui/share-ui-manager.js`)
   - Updates UI elements (link length bar, warnings)
   - Manages visual feedback
   - Handles copy operations

4. **LinkSharingService** (`js/services/link-sharing-service.js`)
   - Low-level encryption/decryption
   - URL construction and parsing
   - Cryptographic operations using TweetNaCl

5. **SharedLinkDataProcessor** (`js/components/settings/shared-link-data-processor.js`)
   - Processes received shared data
   - Applies configurations to the application
   - Handles data validation

## How Link Length Calculation Works

The estimated link length bar provides visual feedback about the size of the generated link. Here's how it works:

### Calculation Process

1. **Base Length**: Starts with the current URL length + "#shared=" (8 bytes)
2. **Data Collection**: For each selected item, the actual data size is calculated
3. **Encoding Overhead**: Base64 encoding adds ~33% to the size
4. **Encryption Overhead**: Fixed 100 bytes for salt, nonce, and padding
5. **Visual Update**: Progress bar shows percentage of 2000-byte recommended limit

### Implementation in ShareUIManager

```javascript
updateLinkLengthBar() {
    let estimatedLength = window.location.origin.length + window.location.pathname.length + 8;
    
    // Add length for each selected item
    if (shareApiKeyCheckbox.checked) {
        const apiKey = apiKeyElement.value || '';
        estimatedLength += apiKey.length + 20; // 20 for JSON structure
    }
    
    // Account for base64 encoding (increases by ~33%)
    estimatedLength = Math.ceil(estimatedLength * 1.33);
    
    // Add encryption overhead
    estimatedLength += 100;
    
    // Update progress bar
    const percentage = Math.min((estimatedLength / 2000) * 100, 100);
    linkLengthBar.style.width = `${percentage}%`;
}
```

## Serialization and Deserialization

### Serialization Process

1. **Data Collection**: Gather all selected items into a payload object
2. **JSON Conversion**: Convert payload to JSON string
3. **Encryption**: Encrypt using password-derived key
4. **URL Creation**: Append encrypted data as URL fragment

```javascript
// In ShareService.createComprehensiveShareableLink()
const payload = {
    version: "2.0",
    baseUrl: options.includeBaseUrl ? baseUrl : undefined,
    model: options.includeModel ? model : undefined,
    conversation: options.includeConversation ? conversationData : undefined,
    // ... other fields
};

// In LinkSharingService.createCustomShareableLink()
const jsonString = JSON.stringify(payload);
const encrypted = CryptoUtils.encryptMessage(jsonString, password);
return `${baseUrl}#gpt=${encrypted}`;
```

### Deserialization Process

1. **URL Parsing**: Extract encrypted data from URL fragment
2. **Decryption**: Decrypt using provided password
3. **JSON Parsing**: Convert back to JavaScript object
4. **Data Application**: Apply configurations to the application

```javascript
// In LinkSharingService.extractSharedApiKey()
const encryptedData = url.split('#gpt=')[1];
const decrypted = CryptoUtils.decryptMessage(encryptedData, password);
const payload = JSON.parse(decrypted);
return payload;
```

## Step-by-Step Integration Guide

### Step 1: Add HTML Checkbox

Add a new checkbox to the share modal in `index.html`:

```html
<div class="checkbox-group">
    <input type="checkbox" id="share-your-feature" class="share-checkbox">
    <label for="share-your-feature">Include Your Feature</label>
</div>
```

### Step 2: Register DOM Element

Add reference in `js/components/dom-elements.js`:

```javascript
shareYourFeatureCheckbox: document.getElementById('share-your-feature'),
```

### Step 3: Add Event Listener

In `js/components/ai-hackare.js`, add change listener:

```javascript
if (this.elements.shareYourFeatureCheckbox) {
    this.elements.shareYourFeatureCheckbox.addEventListener('change', () => {
        this.shareUIManager.updateLinkLengthBar();
    });
}
```

### Step 4: Update ShareManager

Modify `saveShareOptions()` and `loadShareOptions()` in ShareManager:

```javascript
saveShareOptions() {
    const options = {
        // ... existing options
        includeYourFeature: this.domElements.shareYourFeatureCheckbox?.checked || false
    };
    localStorage.setItem('shareOptions', JSON.stringify(options));
}

loadShareOptions() {
    const options = JSON.parse(localStorage.getItem('shareOptions') || '{}');
    // ... existing options
    if (this.domElements.shareYourFeatureCheckbox && options.includeYourFeature !== undefined) {
        this.domElements.shareYourFeatureCheckbox.checked = options.includeYourFeature;
    }
}
```

### Step 5: Update ShareService

Modify `createComprehensiveShareableLink()` to collect your data:

```javascript
if (options.includeYourFeature) {
    const yourFeatureData = this.getYourFeatureData();
    if (yourFeatureData) {
        payload.yourFeature = yourFeatureData;
    }
}
```

Add data collection method:

```javascript
getYourFeatureData() {
    // Retrieve your feature's data from storage or state
    const data = localStorage.getItem('yourFeatureData');
    return data ? JSON.parse(data) : null;
}
```

### Step 6: Update ShareUIManager

Modify `updateLinkLengthBar()` to include your data size:

```javascript
if (this.domElements.shareYourFeatureCheckbox?.checked) {
    const yourFeatureData = this.shareService.getYourFeatureData();
    if (yourFeatureData) {
        estimatedLength += JSON.stringify(yourFeatureData).length + 20;
    }
}
```

### Step 7: Update SharedLinkDataProcessor

Add processing for your feature in `processSharedData()`:

```javascript
async processSharedData(data, password) {
    // ... existing processing
    
    if (data.yourFeature) {
        await this.applyYourFeature(data.yourFeature);
    }
}

async applyYourFeature(yourFeatureData) {
    try {
        // Apply your feature configuration
        localStorage.setItem('yourFeatureData', JSON.stringify(yourFeatureData));
        // Update UI or trigger necessary actions
        console.log('Applied shared feature data:', yourFeatureData);
    } catch (error) {
        console.error('Error applying feature data:', error);
    }
}
```

## Encryption Details

The share links use TweetNaCl for symmetric encryption:

- **Algorithm**: NaCl secretbox
- **Key Derivation**: PBKDF with 10,000 iterations of SHA-512
- **Components**: 16-byte salt + 24-byte nonce + encrypted data
- **Encoding**: Base64 for URL safety

## Best Practices

1. **Data Size**: Keep shared data minimal to avoid URL length limits
2. **Sensitive Data**: Always mark sensitive checkboxes appropriately
3. **Validation**: Validate data before applying shared configurations
4. **Error Handling**: Gracefully handle missing or invalid data
5. **UI Feedback**: Update link length bar for accurate estimates
6. **Testing**: Test with various data sizes and combinations

## Refactoring Plan

### Current Issues

1. **Tight Coupling**: Components have direct dependencies on DOM elements
2. **Scattered Logic**: Share-related code spread across multiple files
3. **Inconsistent Patterns**: Different approaches for similar operations
4. **Limited Extensibility**: Adding new items requires changes in many places

### Proposed Improvements

#### 1. Create Share Item Registry

```javascript
// js/services/share-item-registry.js
class ShareItemRegistry {
    constructor() {
        this.items = new Map();
    }
    
    register(id, config) {
        this.items.set(id, {
            checkboxId: config.checkboxId,
            label: config.label,
            collectData: config.collectData,
            applyData: config.applyData,
            estimateSize: config.estimateSize,
            isSensitive: config.isSensitive || false
        });
    }
    
    getAll() {
        return Array.from(this.items.entries());
    }
}
```

#### 2. Centralize Share Configuration

```javascript
// js/config/share-config.js
export const SHARE_CONFIG = {
    MAX_LINK_LENGTH: 2000,
    ENCODING_OVERHEAD: 1.33,
    ENCRYPTION_OVERHEAD: 100,
    DEFAULT_PASSWORD_LENGTH: 12,
    VERSION: "2.0"
};
```

#### 3. Create Share Item Components

```javascript
// js/components/share/share-item.js
class ShareItem {
    constructor(id, config) {
        this.id = id;
        this.config = config;
        this.checkbox = document.getElementById(config.checkboxId);
    }
    
    isSelected() {
        return this.checkbox?.checked || false;
    }
    
    async collectData() {
        if (!this.isSelected()) return null;
        return await this.config.collectData();
    }
    
    estimateSize() {
        if (!this.isSelected()) return 0;
        return this.config.estimateSize();
    }
}
```

#### 4. Refactor ShareService

```javascript
// js/services/share-service-v2.js
class ShareServiceV2 {
    constructor(registry, cryptoService) {
        this.registry = registry;
        this.crypto = cryptoService;
    }
    
    async createShareLink(password) {
        const payload = await this.collectAllData();
        return this.crypto.createEncryptedLink(payload, password);
    }
    
    async collectAllData() {
        const payload = { version: SHARE_CONFIG.VERSION };
        
        for (const [id, item] of this.registry.getAll()) {
            const data = await item.collectData();
            if (data !== null) {
                payload[id] = data;
            }
        }
        
        return payload;
    }
}
```

#### 5. Implement Plugin System

```javascript
// js/plugins/share-plugins.js
class SharePluginManager {
    static registerPlugin(plugin) {
        const registry = ShareItemRegistry.getInstance();
        registry.register(plugin.id, plugin);
        
        // Auto-generate UI if needed
        if (plugin.autoCreateUI) {
            this.createCheckboxUI(plugin);
        }
    }
    
    static createCheckboxUI(plugin) {
        const container = document.querySelector('.share-items-container');
        const div = document.createElement('div');
        div.className = 'checkbox-group';
        div.innerHTML = `
            <input type="checkbox" id="${plugin.checkboxId}" class="share-checkbox">
            <label for="${plugin.checkboxId}">${plugin.label}</label>
        `;
        container.appendChild(div);
    }
}
```

### Migration Strategy

1. **Phase 1**: Create new registry and config systems alongside existing code
2. **Phase 2**: Migrate existing share items to use registry
3. **Phase 3**: Refactor UI components to use new architecture
4. **Phase 4**: Remove old code and update tests
5. **Phase 5**: Document new plugin system for future extensions

### Benefits of Refactoring

1. **Single Registration Point**: New items need only one registration call
2. **Consistent Interface**: All share items follow same pattern
3. **Better Testability**: Components can be tested in isolation
4. **Reduced Coupling**: UI and business logic separated
5. **Easier Maintenance**: Changes localized to specific components
6. **Plugin Support**: Third-party extensions possible

## Testing Considerations

When adding new share items, ensure:

1. **Size Calculation**: Test with various data sizes
2. **Serialization**: Verify data survives round-trip
3. **Edge Cases**: Handle missing or corrupted data
4. **UI Updates**: Link length bar updates correctly
5. **Persistence**: Share options saved and restored
6. **Security**: Sensitive data properly encrypted

## MCP Connections Support

The share modal now includes full support for sharing MCP (Model Context Protocol) connections, particularly GitHub classic tokens:

### **GitHub Classic Token Integration**

1. **Token Management**: 
   - `GitHubTokenManager` provides easy setup and validation
   - Tokens are encrypted and stored locally
   - Real-time validation during input

2. **Share Integration**:
   - Automatically included in the registry as `mcpConnections`
   - Marked as sensitive data (shows lock icon)
   - Proper size estimation for share links

3. **Auto-Connect**: 
   - When shared links are opened, GitHub tokens are automatically applied
   - Connection is re-established automatically if MCP service connectors are available

### **Usage Example**

```javascript
// Setup GitHub token
const githubManager = new GitHubTokenManager();
await githubManager.quickSetup(); // Shows token input dialog

// The token is now automatically available in share links
// when "Include MCP Connections" is checked
```

### **Security Considerations**

- GitHub tokens are treated as sensitive data
- Tokens are validated before being included in shares
- Recipients get the same permissions as the original token
- Only share with trusted individuals

## Common Pitfalls

1. **Forgetting Event Listeners**: Link length won't update without change listener
2. **Missing DOM References**: Causes errors if elements not properly registered
3. **Incorrect Size Estimates**: Can lead to truncated links
4. **Synchronous Assumptions**: Some data collection may be async
5. **State Conflicts**: Ensure shared data doesn't conflict with existing state
6. **MCP Token Validation**: Always validate tokens before sharing to prevent sharing invalid credentials

## Future Enhancements

1. **Compression**: Add data compression before encryption
2. **Chunking**: Support multi-part links for large data
3. **Selective Sync**: Allow partial data updates
4. **Version Migration**: Handle older share link formats
5. **Analytics**: Track which items are most commonly shared