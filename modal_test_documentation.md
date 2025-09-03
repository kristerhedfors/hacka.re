# Modal Test Documentation

This document provides comprehensive documentation of all modal elements, identifiers, and properties for testing purposes. Each modal section includes all known selectors and their expected behavior based on passing tests.

## Welcome Modal

### Main Container
- **ID**: `#welcome-modal`
- **Classes**: `.modal`, `.active` (when visible)
- **State**: Appears on first visit, can be dismissed permanently

### Elements
| Selector | Type | Description | Properties |
|----------|------|-------------|------------|
| `#welcome-modal` | Container | Main modal container | Visible on first visit |
| `#close-welcome-modal` | Button | Close button | Dismisses modal |
| `.modal-content` | Container | Content wrapper | Contains modal body |
| `.primary-btn` | Button | Primary action button | Alternative close method |

### Testing Notes
- Use `dismiss_welcome_modal()` helper function after page navigation
- Modal can be prevented with URL hash: `#welcome=false`
- State persists in localStorage

---

## Settings Modal

### Main Container
- **ID**: `#settings-modal`
- **Classes**: `.modal`, `.active` (when visible)
- **Trigger**: `#settings-btn`

### Elements
| Selector | Type | Description | Properties |
|----------|------|-------------|------------|
| `#settings-btn` | Button | Opens settings modal | In header toolbar |
| `#settings-modal` | Container | Main modal container | |
| `#settings-form` | Form | Settings form container | |
| `#base-url-select` | Select | API provider dropdown | Options: openai, groq, ollama, custom |
| `#model-select` | Select | Model selection dropdown | Dynamic based on provider |
| `#api-key-update` | Input | API key input field | Type: password |
| `#open-prompts-config` | Button | Opens prompts configurator | Secondary button |
| `#close-settings` | Button | Close modal button | |
| `.settings-header h2` | Heading | Modal title | Text: "Settings" |

### Testing Notes
- Modal should be dismissed if open before interacting with other UI elements
- API key persists in encrypted localStorage
- Model selection updates based on provider selection

---

## Prompts Modal

### Main Container
- **ID**: `#prompts-modal`
- **Classes**: `.modal`, `.active` (when visible)
- **Trigger**: `#prompts-btn`

### Elements
| Selector | Type | Description | Properties |
|----------|------|-------------|------------|
| `#prompts-btn` | Button | Opens prompts modal | In header toolbar |
| `#prompts-modal` | Container | Main modal container | |
| `#prompts-list` | Container | List of prompts | Contains prompt items |
| `#close-prompts-modal` | Button | Close modal button | |
| `.prompt-item` | Container | Individual prompt item | Multiple instances |
| `.prompt-checkbox` | Checkbox | Enable/disable prompt | Per prompt item |
| `.prompt-name` | Text | Prompt name/title | |
| `.prompt-expand` | Button | Expand/collapse prompt | Shows full content |

### Testing Notes
- Prompts can be expanded/collapsed individually
- Selection state persists in localStorage
- Default prompts are pre-populated

---

## Share Modal

### Main Container
- **ID**: `#share-modal`  
- **Classes**: `.modal`, `.active` (when visible)
- **Trigger**: `#share-btn`

### Elements
| Selector | Type | Description | Properties |
|----------|------|-------------|------------|
| `#share-btn` | Button | Opens share modal | In header toolbar |
| `#share-modal` | Container | Main modal container | |
| `#share-form` | Form | Share configuration form | |
| `#share-password` | Input | Session key/password input | Auto-generated |
| `#regenerate-password` | Button | Generate new session key | |
| `#share-model` | Checkbox | Include model in share | |
| `#share-api-key` | Checkbox | Include API key in share | |
| `#share-prompts` | Checkbox | Include prompts in share | |
| `#share-functions` | Checkbox | Include functions in share | |
| `#generate-share-link-btn` | Button | Generate share link | |
| `#generated-link` | Input | Generated link field | Read-only |
| `#copy-share-link` | Button | Copy link to clipboard | |
| `#close-share-modal` | Button | Close modal button | |
| `.share-options` | Container | Share options container | |
| `.share-welcome-message` | Container | Welcome message section | |
| `#share-welcome-enabled` | Checkbox | Enable welcome message | |
| `#share-welcome-text` | Textarea | Welcome message text | |

### Testing Notes
- Session key is required for encryption
- Generated links include `#gpt=` hash parameter
- Welcome message feature for shared links

---

## Function Calling Modal

### Main Container
- **ID**: `#function-modal`
- **Classes**: `.modal`, `.active` (when visible)
- **Trigger**: `#function-btn`

### Elements
| Selector | Type | Description | Properties |
|----------|------|-------------|------------|
| `#function-btn` | Button | Opens function modal | In header toolbar |
| `#function-modal` | Container | Main modal container | |
| `#function-code` | Textarea | Code editor area | JavaScript functions |
| `#function-name` | Input | Function name field | Auto-populated, read-only |
| `#function-list` | Container | List of saved functions | |
| `#function-save-js` | Button | Save function button | |
| `#function-validate-btn` | Button | Validate syntax button | |
| `#function-validation-result` | Container | Validation results | |
| `#function-execute-btn` | Button | Execute/test function | Opens execute modal |
| `#function-clear-btn` | Button | Clear editor | |
| `#close-function-modal` | Button | Close modal button | |
| `.function-item` | Container | Individual function item | In function list |
| `.function-item-name` | Text | Function name display | |
| `.function-item-delete` | Button | Delete function button | |
| `.function-collection-container` | Container | Function collection/group | |
| `.function-collection-header` | Header | Collection header | |
| `.function-collection-delete` | Button | Delete collection | |

### Execute Modal
| Selector | Type | Description | Properties |
|----------|------|-------------|------------|
| `#function-execute-modal` | Container | Execute modal container | |
| `#function-execute-run` | Button | Run function button | |
| `#function-execute-output-section` | Container | Output display section | |
| `#function-execute-output-content` | Pre | Output content display | |
| `#function-execute-error-section` | Container | Error display section | |
| `#function-execute-error-message` | Pre | Error message display | |

### Testing Notes
- Function name auto-populates from code
- Functions tagged with `@callable` or `@tool` are AI-accessible
- Validation checks JavaScript syntax
- Functions persist in localStorage

---

## RAG (Knowledge Base) Modal

### Main Container
- **ID**: `#rag-modal`
- **Classes**: `.modal`, `.active` (when visible)
- **Trigger**: `#rag-btn`

### Elements
| Selector | Type | Description | Properties |
|----------|------|-------------|------------|
| `#rag-btn` | Button | Opens RAG modal | In header toolbar |
| `.rag-icon` | Span | RAG button icon | Text: "RAG" |
| `#rag-modal` | Container | Main modal container | |
| `.settings-header h2` | Heading | Modal title | Text: "Knowledge Base" |
| `#close-rag-modal` | Button | Close modal button | |
| `.rag-section` | Container | Section container | Multiple sections |
| `.rag-enable-section` | Container | Enable/disable section | |
| `#rag-enabled-checkbox` | Checkbox | Enable RAG feature | Disabled for non-OpenAI |
| `#rag-disabled-message` | Text | Disabled message | Shows when unavailable |
| `#rag-search-input` | Input | Search query input | |
| `#rag-search-btn` | Button | Search button | |
| `#rag-search-results` | Container | Search results container | |
| `#rag-generate-embeddings-btn` | Button | Generate embeddings | For default prompts |
| `#rag-load-bundle-btn` | Button | Load bundle button | For user content |
| `#rag-indexing-status` | Container | Indexing status display | |
| `.rag-bundle-item` | Container | Bundle item | |

### Testing Notes
- RAG only available with OpenAI provider (requires embeddings API)
- Checkbox disabled and grayed out for non-OpenAI providers
- Search functionality requires embeddings to be generated
- Multiple sections for different RAG features

---

## Agent/MCP Modal

### Main Container
- **ID**: `#agent-config-modal`
- **Classes**: `.modal`, `.active` (when visible)
- **Trigger**: `#agent-config-btn`

### Elements
| Selector | Type | Description | Properties |
|----------|------|-------------|------------|
| `#agent-config-btn` | Button | Opens agent modal | In header, has robot icon |
| `i.fas.fa-robot` | Icon | Robot icon | In agent button |
| `#agent-config-modal` | Container | Main modal container | |
| `h2:has-text("Agent Management")` | Heading | Modal title | |
| `#close-agent-config-modal` | Button | Close modal button | |
| `h3:has-text("💾 Save Current Configuration")` | Heading | Save section title | |
| `h3:has-text("🤖 Saved Agents")` | Heading | Saved agents section | |
| `h3:has-text("🔌 External Agent Services")` | Heading | External services section | |
| `#quick-agent-name` | Input | Agent name input | Placeholder: "Enter agent name" |
| `#quick-save-agent` | Button | Save current config | Text: "Save Current" |
| `.agent-item` | Container | Individual saved agent | |
| `.agent-load-btn` | Button | Load agent button | |
| `.agent-delete-btn` | Button | Delete agent button | |

### MCP Section Elements
| Selector | Type | Description | Properties |
|----------|------|-------------|------------|
| `#mcp-enabled` | Checkbox | Enable MCP | |
| `#mcp-server-url` | Input | MCP server URL | |
| `#mcp-connect-btn` | Button | Connect to MCP | |
| `#mcp-status` | Container | Connection status | |
| `.mcp-tool-item` | Container | Individual MCP tool | |

### Testing Notes
- Agent configurations include API settings, prompts, and functions
- MCP (Model Context Protocol) integration for external tools
- Saved agents persist in localStorage
- Quick save captures current configuration

---

## Common Modal Patterns

### Modal States
- **Closed**: No `.active` class
- **Open**: Has `.active` class  
- **Transition**: CSS transitions for smooth open/close

### Standard Controls
- Close buttons typically have ID pattern: `#close-[modal-name]-modal`
- Modal containers have ID pattern: `#[feature]-modal`
- Forms within modals: `#[feature]-form`

### Testing Best Practices
1. **Always dismiss welcome modal first**:
   ```python
   dismiss_welcome_modal(page)
   ```

2. **Wait for modal visibility**:
   ```python
   page.wait_for_selector("#modal-id", state="visible", timeout=3000)
   ```

3. **Check modal is closed**:
   ```python
   expect(modal).not_to_be_visible()
   expect(modal).not_to_have_class("modal active")
   ```

4. **Handle modal transitions**:
   - Allow time for CSS transitions
   - Use proper wait conditions
   - Check for `.active` class changes

5. **Screenshot key states**:
   ```python
   screenshot_with_markdown(page, "modal_state", {
       "Status": "Description",
       "Component": "Modal name"
   })
   ```

---

## Test Coverage Status

Based on `test_summary_pr.md`:

| Modal | Core Tests | Feature Tests | Notes |
|-------|------------|---------------|-------|
| Welcome | ✅ Pass | ✅ Pass | All scenarios working |
| Settings | ✅ Pass | ✅ Pass | API key persistence working |
| Prompts | ✅ Pass | ⚠️ Some failures | Function library prompt ordering issues |
| Share | ✅ Pass | ✅ Pass | Basic sharing working |
| Function | ✅ Pass | ❌ Multiple failures | Colors, icons, parsing logic issues |
| RAG | ✅ Pass | ❌ Multiple failures | Embedding generation, integration issues |
| Agent/MCP | ✅ Pass | ⚠️ Some issues | Basic functionality works |

---

## Known Issues from Testing

### Function Modal Issues
- Function collection colors not working correctly
- Function icons display issues  
- Function parsing logic for `@callable` and `@tool` tags failing
- Library sharing functionality issues

### RAG Modal Issues
- Embedding generation UI not functioning
- Bundle loading functionality broken
- Integration with chat not working
- Requires OpenAI API for embeddings

### Other Issues
- Logo tooltip test failing
- Context window display issues
- Function library default prompt ordering

---

## Usage in Tests

### Importing Test Utilities
```python
from test_utils import dismiss_welcome_modal, screenshot_with_markdown
from playwright.sync_api import Page, expect
```

### Basic Modal Test Pattern
```python
def test_modal_functionality(page: Page, serve_hacka_re):
    """Test description"""
    # Navigate and setup
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Open modal
    trigger_button = page.locator("#modal-trigger-btn")
    trigger_button.click()
    
    # Wait for modal
    page.wait_for_selector("#modal-id", state="visible", timeout=3000)
    
    # Test modal elements
    modal = page.locator("#modal-id")
    expect(modal).to_be_visible()
    expect(modal).to_have_class("modal active")
    
    # Interact with modal elements
    # ...
    
    # Close modal
    close_button = page.locator("#close-modal-id")
    close_button.click()
    
    # Verify closed
    expect(modal).not_to_be_visible()
```

This documentation provides all known modal identifiers and properties based on passing tests to help write new tests effectively.