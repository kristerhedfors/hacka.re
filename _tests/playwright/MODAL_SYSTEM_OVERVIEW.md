# Modal System Overview

This document provides a high-level overview of the modal system in hacka.re, including modal architecture, relationships, and testing approaches.

## Modal Architecture

### Refactored Component-Based Structure

Following the recent refactoring, all modals in hacka.re utilize a modern, component-based architecture with specialized manager classes:

1. **Modal Container** - Main modal wrapper with backdrop
2. **Modal Content** - Inner content area with specific functionality  
3. **Modal Header** - Title and close button
4. **Modal Body** - Primary content and controls
5. **Modal Footer** - Action buttons (save, cancel, etc.)

### Manager-Based Architecture

**Settings Modal System:**
- `settings-coordinator.js` - Main coordination logic
- `settings-initialization.js` - Setup and initialization
- `settings-state-manager.js` - State management and persistence
- 10 specialized managers (api-key, model, shared-link, etc.)

**Function Modal System:**
- `function-modal-manager.js` - Main modal orchestrator
- `function-code-editor.js` - Code editor component
- `function-copy-manager.js` - Function copying and sharing
- `function-editor-manager.js` - Function editing interface
- `function-executor.js` - Function execution handling
- `function-library-manager.js` - Library operations
- `function-list-renderer.js` - List display
- `function-parser.js` - Function parsing
- `function-validator.js` - Validation logic

**Prompts Modal System:**
- `prompts-manager.js` - Main prompts orchestrator
- `prompts-list-manager.js` - List operations
- `prompts-token-manager.js` - Token management
- `prompts-event-handlers.js` - Event handling
- `prompts-modal-renderer.js` - Rendering logic

**UI Management:**
- `modal-manager.js` - Generic modal system
- `ui-coordinator.js` - UI coordination
- Various display managers for context, model info, etc.

### CSS Classes and States

**Standard Classes:**
- `.modal` - Base modal container
- `.modal-content` - Inner content wrapper
- `.modal-header` - Header section
- `.modal-body` - Main content area
- `.modal-footer` - Footer with action buttons

**State Classes:**
- `.active` - Modal is visible and active
- `.fade-in` / `.fade-out` - Animation states

### DOM Structure Pattern

```html
<div id="modal-name-modal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h2>Modal Title</h2>
            <button id="close-modal-name" class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
            <!-- Modal-specific content -->
        </div>
        <div class="modal-footer">
            <button type="submit">Save</button>
            <button type="button">Cancel</button>
        </div>
    </div>
</div>
```

## Modal Inventory

### Core Application Modals

| Modal | ID | Purpose | Trigger | Key Features |
|-------|----|---------|---------| -------------|
| **Settings** | `#settings-modal` | API configuration, model selection | `#settings-btn` | Provider selection, API keys, model management |
| **Prompts** | `#prompts-modal` | System prompt management | `#prompts-btn` | Prompt library, default prompts, token usage |
| **Function Calling** | `#function-modal` | JavaScript function management | `#function-btn` | Code editor, validation, tool definitions |
| **Share** | `#share-modal` | Create shareable links | `#share-btn` | Encryption, QR codes, password protection |
| **Welcome** | `#welcome-modal` | First-time user onboarding | Automatic on first visit | Dynamic creation, localStorage detection |

### Specialized Modals

| Modal | ID | Purpose | Trigger | Key Features |
|-------|----|---------|---------| -------------|
| **API Key** | `#api-key-modal` | Quick API key entry | Legacy/fallback | Simple key input (rarely used) |

## Modal Relationships and Flow

### User Journey Flow

```
First Visit:
Welcome Modal → Settings Modal → Prompts Modal → Function Modal → Chat

Returning User:
Direct Access to any Modal → Chat
```

### Inter-Modal Dependencies

#### Welcome → Settings
- Welcome modal directs new users to settings configuration
- Automatic settings modal opening after welcome dismissal
- API key requirement before proceeding

#### Settings → Prompts  
- "Configure System Prompt" button in settings opens prompts modal
- System prompt configuration affects chat behavior
- Model selection influences prompt token limits

#### Prompts ↔ Function Calling
- Function Library prompt dynamically includes defined functions
- Changes in function modal update the Function Library prompt
- Bidirectional relationship for tool calling integration

#### Settings ↔ Share
- Share modal can include API settings in shared configurations
- Shared links can configure API settings when opened
- Model and provider settings included in shareable state

#### All Modals ↔ Share
- Share modal can include content from any other modal
- Prompts, functions, and settings can all be shared
- Granular control over what gets included in shared links

## Modal Lifecycle

### Opening Sequence
1. **Trigger Event** - Button click or automatic condition
2. **DOM Preparation** - Modal content setup and data loading
3. **Animation Start** - CSS transition begins
4. **State Update** - `.active` class added
5. **Focus Management** - Focus moves to modal
6. **Event Binding** - Modal-specific event handlers attached

### Active State
1. **User Interactions** - Form inputs, button clicks, validation
2. **Real-time Updates** - Dynamic content updates (token counts, validation)
3. **State Persistence** - Changes saved to localStorage
4. **Cross-Modal Communication** - Updates affecting other modals

### Closing Sequence
1. **Trigger Event** - Close button, escape key, or save action
2. **Validation** - Check for unsaved changes or required fields
3. **State Persistence** - Final save to localStorage
4. **Animation Start** - CSS transition begins
5. **DOM Cleanup** - Event handlers removed
6. **State Update** - `.active` class removed
7. **Focus Restoration** - Focus returns to triggering element

## Testing Architecture

### Common Testing Patterns

**Modal Opening/Closing:**
```python
# Open modal
page.locator("#modal-trigger-btn").click()
expect(page.locator("#modal-id")).to_be_visible()

# Close modal
page.locator("#close-modal-id").click()
expect(page.locator("#modal-id")).not_to_be_visible()
```

**State Verification:**
```python
# Check modal is active
modal = page.locator("#modal-id")
expect(modal).to_have_class("active")
expect(modal).to_be_visible()
```

**Form Interactions:**
```python
# Fill and submit form
page.locator("#form-field").fill("value")
page.locator("#submit-btn").click()
```

### Modal-Specific Testing

**Settings Modal:**
- API provider selection and base URL changes
- Model loading and selection
- Settings persistence and validation

**Prompts Modal:**
- Prompt creation, editing, and deletion
- Default prompts selection and nested sections
- Token usage calculation and display

**Function Modal:**
- Function code editing and validation
- Tool definition generation
- Function grouping and deletion

**Share Modal:**
- Link generation and QR code creation
- Password protection and encryption
- Selective content sharing

**Welcome Modal:**
- First-time detection and display
- localStorage state management
- Dismissal and progression to settings

## Implementation Details

### Refactored Service-Oriented Architecture

Modals now use a sophisticated service-oriented approach with dedicated managers:

```javascript
// Modern modal management with specialized components
class ModalManager {
    constructor() {
        this.settingsCoordinator = new SettingsCoordinator();
        this.functionModalManager = new FunctionModalManager();
        this.promptsManager = new PromptsManager();
    }
    
    openModal(modalType, config) {
        switch(modalType) {
            case 'settings':
                return this.settingsCoordinator.showModal(config);
            case 'function':
                return this.functionModalManager.showModal(config);
            // etc.
        }
    }
}

// Specialized event handling within components
class SettingsCoordinator {
    initializeEventListeners() {
        this.apiKeyManager.bindEvents();
        this.modelManager.bindEvents();
        this.sharedLinkManager.bindEvents();
        // etc.
    }
}
```

### State Management

**Service-Based Storage:**
- `core-storage-service.js` - Core storage operations
- `storage-service.js` - Main storage interface
- `namespace-service.js` - Multi-tenant data isolation
- `encryption-service.js` - Data encryption/decryption

**Component State Coordination:**
- `settings-state-manager.js` - Settings state persistence
- `function-tools-storage.js` - Function library state
- `prompts-service.js` - Prompts state management

**Cross-Modal Communication:**
- Service layer for shared functionality
- Event-driven updates between components
- Real-time state synchronization
- Dependency injection for clean component interactions

### CSS Transitions

**Animation System:**
```css
.modal {
    opacity: 0;
    transform: scale(0.7);
    transition: all 0.3s ease;
}

.modal.active {
    opacity: 1;
    transform: scale(1);
}
```

### Accessibility Features

**Keyboard Navigation:**
- Tab order management within modals
- Escape key to close modals
- Focus trapping within active modal

**Screen Reader Support:**
- ARIA labels and descriptions
- Role attributes for modal content
- Live regions for dynamic updates

## Common Issues and Solutions

### Modal Interference
**Problem:** Multiple modals open simultaneously
**Solution:** Ensure proper modal dismissal before opening new modals

### Focus Management
**Problem:** Focus lost or trapped incorrectly
**Solution:** Implement proper focus restoration and trapping

### State Synchronization
**Problem:** Modal state out of sync with application state
**Solution:** Event-driven updates and consistent state management

### Animation Timing
**Problem:** Tests failing due to animation timing
**Solution:** Wait for animation completion or use appropriate timeouts

### Memory Leaks
**Problem:** Event handlers not cleaned up properly
**Solution:** Proper event handler removal on modal close

## Best Practices

### Modal Design
1. **Consistent Structure** - Follow standard DOM patterns
2. **Clear Purpose** - Each modal has a single, well-defined purpose
3. **Minimal Complexity** - Keep modal content focused and simple
4. **Responsive Design** - Ensure modals work on all screen sizes

### State Management
1. **Persistent State** - Save important state to localStorage
2. **Validation** - Validate input before saving
3. **Error Handling** - Provide clear feedback for errors
4. **Cleanup** - Clean up temporary state on modal close

### Testing Strategy
1. **Isolation** - Test modals independently when possible
2. **Integration** - Test modal interactions and workflows
3. **Edge Cases** - Test error conditions and edge cases
4. **Accessibility** - Verify keyboard and screen reader functionality

### Performance
1. **Lazy Loading** - Load modal content only when needed
2. **Event Delegation** - Use efficient event handling
3. **DOM Efficiency** - Minimize DOM manipulation
4. **Memory Management** - Clean up resources properly

This overview provides the foundation for understanding and working with hacka.re's modal system. Refer to individual modal documentation for specific implementation details and testing examples.