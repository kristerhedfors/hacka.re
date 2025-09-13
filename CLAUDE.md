# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working with this repository.

## Project Overview

hacka.re - Privacy-focused, serverless chat interface for OpenAI-compatible APIs. Pure HTML/CSS/ES6 JavaScript, entirely client-side, no backend/build system/TypeScript.

## Development Commands

### Environment Setup

Three separate `.venv` environments:
- **Root `.venv/`** - Utility scripts
- **`_tests/playwright/.venv/`** - Playwright tests  
- **`hackare/.venv/`** - CLI application

```bash
./setup_environment.sh  # Master setup for all environments
```

Configure `.env` files from `.env.example` templates in each directory.

### HTTP Server Management

**Use ONLY these scripts (never `python3 -m http.server`):**

```bash
./scripts/start_server.sh    # Start on port 8000
./scripts/stop_server.sh     # Stop cleanly
./scripts/server_status.sh   # Check status
```

Files: `.server.pid` (process ID), `.server.log` (logs). URL: `http://localhost:8000`

### Testing

**🚨 CRITICAL: Must have full console logs + screenshots for debugging**

**Rules:**
- **RUN FROM PROJECT ROOT** - Never cd into _tests/playwright
- **CAPTURE EVERYTHING** - Console logs, screenshots, page state
- Use `screenshot_with_markdown()` for debug context

**Running Tests:**
```bash
# From project root (ALWAYS run from here):
_tests/playwright/.venv/bin/python -m pytest _tests/playwright/test_*.py -v

# Using scripts (fixed to use correct .venv path):
_tests/playwright/run_core_tests.sh      # Basic UI, API, chat (56 tests)
_tests/playwright/run_feature_tests.sh   # Function calling, MCP, sharing
_tests/playwright/run_tests.sh          # All 377+ tests

# With manual server control:
./scripts/start_server.sh                # Start server first
_tests/playwright/run_core_tests.sh --skip-server  # Run tests
```

**Timeout Management (377+ tests total):**
- Small batches: Run individual test files
- Large bundles: Use `--timeout=600` (10 min) or `--timeout=1200` (20 min)
- Never run all tests without timeout - will fail!

```bash
./scripts/project_metrics.sh  # Project metrics
python run_verifier.py        # Security verification
```

## Architecture

Pure client-side, modular component-based, service-oriented (33+ modules), event-driven vanilla JavaScript. Recently refactored from monolithic.

### Key Directories
```
js/
├── components/         # UI managers (39 files)
│   ├── function-calling/  # 11 modules
│   ├── settings/          # 13 modules
│   ├── mcp/              # 6 modules
│   └── prompts/, ui/, share-manager.js
├── services/          # Business logic (33 files)
│   ├── api-*.js          # 7 modules
│   ├── function-tools-*  # 8 modules
│   ├── mcp-*.js         # 5 modules
│   └── chat-*, storage-*, etc.
├── default-functions/  # RC4, math, auth, MCP examples
└── utils/, default-prompts/
```

### Service Architecture

**Key Services:**
- **API** (7): service, request-builder, response-parser, stream-processor, tool-call-handler, debugger, tools-service
- **Function Tools** (8): service, config, logger, storage, parser, executor, registry, processor (load in dependency order)
- **Storage** (4): service, core-storage, encryption (TweetNaCl), namespace
- **MCP** (5): client-core, connection-manager, transport, tool-registry, request-manager
- **Others**: link-sharing, chat-streaming, prompts, model-info, +8 more

## Key Features

- **RAG**: OpenAI-only (needs embeddings API), auto-disabled for other providers
- **Function Calling**: 8-module system, `@callable`/`@tool` tags, RC4 built-in
- **Default Functions**: Pre-built groups (RC4, math, auth, MCP), checkbox enable/disable
- **Privacy**: TweetNaCl encryption, no backend, encrypted sharing, no tracking
- **Multi-Provider**: OpenAI, Groq, Ollama, custom endpoints with token tracking

### MCP Connectors

- **GitHub** (PAT): `#service-pat-input-modal`, functions: list_repos, get_repo, list_issues
- **Gmail** (OAuth): Requires Google Cloud setup, functions: list/get/search_messages  
- **Shodan** (API Key): `#service-apikey-input-modal`, functions: dns_resolve, host_info

Note: Gmail may show cosmetic JSON errors in console (doesn't affect execution).

## Playwright Testing

**Philosophy**: No mocking, real API calls (`gpt-5-nano`), screenshot-driven debugging.

**Structure**: `_tests/playwright/` with fixtures, utils, 80+ test files, screenshots, execution scripts.

### Test Execution

```bash
./run_core_tests.sh        # UI, API, chat basics
./run_feature_tests.sh     # Function calling, MCP, sharing
./run_tests.sh            # All 377+ tests
./run_mcp_tests.sh        # MCP-specific (26 tests)
./run_tests.sh -k "api"    # Filter by keyword
./run_tests.sh --skip-server  # Manual server control
```

### Debug Capabilities

```python
# Screenshot with metadata
screenshot_with_markdown(page, "phase", {"Status": "...", "Error": "..."})

# Console logging
page.on("console", lambda msg: print(f"{msg.type}: {msg.text}"))

# Interactive debug
page.pause()  # Opens inspector
```

Reports: `bundle_test_results.sh` → markdown output with screenshots.

### Writing Tests

```python
def test_feature(page: Page, serve_hacka_re):
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Wait for specific conditions, not arbitrary timeouts
    page.wait_for_selector("#result:not(:empty)", state="visible")
    
    # Handle dialogs proactively
    page.on("dialog", lambda dialog: dialog.accept())
    
    # Function name auto-populates from code
    function_code.fill("function test() {...}")
    page.evaluate("document.getElementById('function-code').dispatchEvent(new Event('input'))")
```

### Test Setup

```bash
cp .env.example _tests/playwright/.env  # Configure API key
# Tests auto-manage server on port 8000
# Use --skip-server for manual control
```

### Debugging Workflow

1. Create debug script in `debug_tests/`
2. Run with visible browser: `python debug_script.py`
3. Use `page.pause()` for inspector
4. Capture console logs to JSON for analysis

```python
console_messages = []
page.on("console", lambda msg: console_messages.append({
    'type': msg.type, 'text': msg.text
}))
# Save for LLM analysis
json.dump(console_messages, open("debug.json", 'w'))
```

## Development Practices

### Code Organization
- Specialized component managers, modular services, manager pattern
- Service layer with clear dependencies
- Categories: function-calling, settings, mcp, prompts, ui

### Refactoring Philosophy
- REMOVE old code completely - no backwards compatibility
- Clean removal prevents legacy patterns from re-emerging

### Testing Requirements  
- Include debug info with `screenshot_with_markdown()`
- Function names auto-populate from code
- Wait for specific conditions, not arbitrary timeouts
- Dismiss welcome modal after navigation
- Test against real APIs (`gpt-5-nano`), no mocking
- Handle dialogs proactively with `page.on("dialog")`

### UI Element Identifiers

**Confirmed working selectors:**

**Modals:**
- Containers: `#welcome-modal`, `#settings-modal`, `#function-modal`, `#prompts-modal`, `#share-modal`, `#rag-modal`, `#function-execution-modal`, `#mcp-servers-modal`
- Close buttons: `#close-welcome-modal`, `#close-settings` (NOT -modal), `#close-function-modal`, etc.

**MCP Elements:**
- `#mcp-servers-btn`, `#mcp-servers-modal`, `#mcp-server-url`, `#mcp-server-list`
- Quick connectors: `.quick-connector-card`, `button:has-text('Connect')` (Shodan is 3rd)
- Shodan modal: `#service-apikey-input-modal`, `input[placeholder*='Shodan API key']`
- Config: `#mcp-share-link-enable`, `#mcp-introspection-enable`

**Settings:**
- `#api-key-update` (NOT #api-key-input)
- `#base-url-select`, `#model-select`
- `#yolo-mode` (NOT #yolo-mode-checkbox)
- `#voice-control` (NOT #voice-control-checkbox)
- `#namespace-input`, `#clear-namespace-select`

**YOLO Mode** (auto-execute functions):
- ID: `#yolo-mode` in Settings modal
- CRITICAL: Must handle confirmation dialog when enabling
- Use `click()` not `check()`, accept dialog
- Benefits: No approval modals, seamless multi-function workflows

```python
def enable_yolo_mode(page):
    page.locator("#settings-btn").click()
    yolo = page.locator("#yolo-mode")
    if not yolo.is_checked():
        page.on("dialog", lambda d: d.accept())
        yolo.click()  # Triggers dialog
    page.locator("#close-settings").click()
```

**Chat Interface:**
- `#message-input` (NOT #chat-input), `#send-btn` (NOT #send-message-btn)
- `.message.assistant` (NOT .assistant-message), `.message.user`, `.message.system`
- Note: Function calls create 2 assistant messages (acknowledgment + result)

**Function Execution Modal:**
- Buttons: `#exec-execute-btn`, `#exec-block-btn`, `#exec-intercept-btn`
- Content: `#exec-function-name`, `#exec-args-textarea`, `#exec-result-textarea`

**Function Modal:**
- `#function-code`, `#function-name` (auto-populated), `#function-validate-btn`
- `.function-item`, `.function-collection-delete` (NOT individual delete)
- `#function-editor-form button[type='submit']` (submit button)

**Prompts Modal:**
- `.default-prompts-header` (click to expand/collapse)
- `.default-prompts-list` (container for default prompts)
- `.default-prompt-item` (individual prompt items)
- Default prompts include: "README.md", "Function library" (with lowercase 'l')
- `.prompt-item-checkbox`, `.prompt-item-info` (prompt item controls)

**Main Buttons:**
`#settings-btn`, `#prompts-btn`, `#share-btn`, `#function-btn`, `#rag-btn`, `#mcp-servers-btn`

**Common Mistakes:**
- Use `#close-settings` NOT `#close-settings-modal`
- Use `#api-key-update` NOT `#api-key-input`
- Use `#voice-control` NOT `#voice-control-checkbox`
- Use `.message.assistant` NOT `.assistant-message`
- Default prompt "Function library" has lowercase 'l', not "Function Library"
- Configure through UI, not localStorage directly

**Testing Function Execution:**
1. Click `#exec-execute-btn` to approve
2. Wait for modal close and generation complete:
```python
page.wait_for_function(
    "() => !document.querySelector('#send-btn').hasAttribute('data-generating')",
    timeout=30000
)
```
3. Check `.message.assistant .message-content` for response
4. Note: Content streams progressively, wait for `data-generating` removal

### Security
- Never commit API keys
- All libraries hosted locally (no CDN)
- TweetNaCl encryption for storage
- Secure sharing via encrypted URLs

## Validation

```bash
python run_verifier.py                    # Security check
_tests/playwright/run_core_tests.sh      # Test suite
```

## Common Tasks

**Adding Functions:**
- Define in Function Calling UI
- Use JSDoc comments and `@callable`/`@tool` tags

**Adding Tests:**
- Create in `_tests/playwright/`
- Use fixtures, dismiss welcome modal
- Wait for specific conditions
- Test against real APIs (`gpt-5-nano`)

**Modifying Services:**
- Services in `js/services/` (33+ files)
- Components in `js/components/` (39+ files)
- Follow dependency hierarchy

Emphasizes privacy, security, real API testing.