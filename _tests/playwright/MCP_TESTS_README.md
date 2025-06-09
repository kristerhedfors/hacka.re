# MCP (Model Context Protocol) Tests

This directory contains comprehensive test coverage for the MCP integration in hacka.re, providing 26 total tests covering UI interactions, proxy connectivity, and real server integrations.

## Quick Start

### Run All Tests
```bash
./run_mcp_tests.sh              # All 26 tests (~48s)
```

### Run by Category  
```bash
./run_mcp_tests.sh --unit       # 18 unit tests (~29s)
./run_mcp_tests.sh --integration # 8 integration tests (~34s)
```

### Individual Test Files
```bash
pytest test_mcp_unit.py -v           # 6 core unit tests
pytest test_mcp_simple.py -v         # 6 basic UI tests
pytest test_mcp_reconnection.py -v   # 6 reconnection tests
pytest test_mcp_integration.py -v    # 3 full integration tests
pytest test_mcp_integration_simple.py -v # 5 simple integration tests
```

## Test Architecture

### MCP Implementation Components

hacka.re's MCP implementation consists of:
- **MCPClientService** (`js/services/mcp-client-service.js`) - Zero-dependency MCP client
- **MCPManager** (`js/components/mcp-manager.js`) - UI component for server management  
- **mcp-stdio-proxy** (`mcp-stdio-proxy/server.js`) - Node.js proxy for local MCP servers
- **Integration layer** - Automatic tool registration with hacka.re's function calling system

### Test Categories

**Unit Tests (18 tests)** - Mocked dependencies for isolated testing
- Core MCP manager functionality
- Basic UI interactions
- Reconnection and error handling scenarios

**Integration Tests (8 tests)** - Real MCP proxy and server testing  
- Full server lifecycle testing
- Simplified integration scenarios

## Test Filesystem

The `mcp_test_filesystem/` directory contains sample files for testing:
```
mcp_test_filesystem/
├── documents/
│   ├── readme.txt         # Plain text file
│   └── test_config.json   # JSON configuration
├── projects/
│   └── sample_project.md  # Markdown file with code
└── data/
    └── numbers.csv        # CSV data file
```

## Running Tests

### Test Options
- `--unit` - Run only unit tests (18 tests, mocked dependencies)
- `--integration` - Run only integration tests (8 tests, real servers)
- `--headless` - Run without browser UI (faster)
- `--verbose` - Show detailed test output with timings
- `--skip-server` - Don't start/stop HTTP server (if managing manually)

### Command Examples
```bash
# Quick validation (unit tests only, headless)
./run_mcp_tests.sh --unit --headless

# Full integration validation with details
./run_mcp_tests.sh --integration --verbose

# Complete test suite for CI pipelines
./run_mcp_tests.sh --headless --verbose
```

## Additional Documentation

- **[MCP_TESTS_STATUS.md](MCP_TESTS_STATUS.md)** - Current test results and performance metrics
- **[MCP_TESTS_TROUBLESHOOTING.md](MCP_TESTS_TROUBLESHOOTING.md)** - Common issues, debugging, and command reference

## MCP Proxy Management

The test suite includes helper scripts for the MCP stdio proxy:

### Start Proxy Manually
```bash
./start_mcp_proxy.sh
```

### Stop Proxy
```bash
./stop_mcp_proxy.sh
```

The integration tests automatically manage the proxy lifecycle.

## Requirements

1. **Node.js and npm** - For running MCP proxy and servers
2. **Python environment** - Activated with test dependencies
3. **OpenAI API key** - Set in `.env` for function calling tests

## Test Fixtures

### `mcp_proxy`
- Automatically starts/stops MCP stdio proxy for integration tests
- Manages proxy lifecycle and health checks

### Standard Fixtures
- `page` - Playwright browser page
- `start_http_server` - Starts hacka.re on port 8000

## Current Implementation Details

### MCP Client Service Features
- **Zero-dependency** - Pure JavaScript implementation, no external libraries
- **Stdio transport** - Local process communication via mcp-stdio-proxy
- **SSE transport** - HTTP-based MCP servers with Server-Sent Events
- **Auto-registration** - Tools automatically register with hacka.re's function calling system
- **Progress callbacks** - Real-time progress notifications for long-running tools
- **Error handling** - Comprehensive error recovery and connection management

### Proxy Architecture
```
Browser (hacka.re) ←→ mcp-stdio-proxy ←→ MCP Server Process
     (HTTP/SSE)              (stdio)        (filesystem/etc)
```

### Tool Integration Flow
1. User adds MCP server command in UI
2. Proxy starts server process with stdio communication
3. MCPClientService establishes JSON-RPC connection
4. Server capabilities (tools/resources/prompts) are fetched
5. Tools automatically register as callable functions in hacka.re
6. AI models can call tools through normal function calling interface

### Writing New MCP Tests

**Unit Test Template** (with mocking)
```python
def test_mcp_feature(page: Page, serve_hacka_re):
    """Test MCP feature with mocked responses"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Mock MCP proxy responses
    page.route("**/localhost:3001/health", lambda route: route.fulfill(
        status=200,
        json={"status": "ok", "servers": 0}
    ))
    
    # Open MCP modal and test functionality
    page.locator("#mcp-servers-btn").click()
    expect(page.locator("#mcp-servers-modal")).to_be_visible()
    
    # Test implementation with assertions
    # ...
    
    screenshot_with_markdown(page, "test_name", {
        "Status": "Test completed",
        "Component": "MCP Manager",
        "Action": "Feature tested"
    })
```

**Integration Test Template** (with real servers)
```python
def test_mcp_integration_feature(page: Page, serve_hacka_re, mcp_proxy):
    """Test with real MCP proxy and servers"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Use real proxy connection
    page.locator("#mcp-servers-btn").click()
    page.locator("#test-proxy-btn").click()
    
    # Test with actual server communication
    # ...
```

## Debugging

### View Proxy Logs
```bash
tail -f /tmp/mcp-proxy-test.log
```

### Check Running Servers
```bash
curl http://localhost:3001/mcp/list
```

### Screenshots
All tests save screenshots to `screenshots/` directory for debugging.

## Common Issues

1. **Proxy won't start**: Check if port 3001 is already in use
2. **Server connection fails**: Ensure npx is installed and internet is available
3. **Tests timeout**: Integration tests may need longer timeouts for server startup

## CI/CD Integration

The MCP tests are included in the main test suite and run in CI pipelines. They use real API calls and servers to ensure accurate validation of the MCP integration.