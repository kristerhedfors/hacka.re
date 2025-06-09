# MCP (Model Context Protocol) Tests

This directory contains comprehensive test coverage for the MCP integration in hacka.re.

## Test Structure

### Unit Tests (`test_mcp_unit.py`)
- Tests MCP components in isolation with mocked dependencies
- Covers:
  - MCP manager initialization
  - Proxy connection states
  - Tool parameter validation
  - Tool registration with function calling system
  - Server command parsing
  - Error handling
  - Storage persistence

### Integration Tests (`test_mcp_integration.py`)
- Tests with real MCP stdio proxy and filesystem server
- Covers:
  - Full server lifecycle (start, connect, stop)
  - Tool discovery and loading
  - Tool execution through chat interface
  - Multiple server management
  - Error recovery and reconnection
  - File operations with test filesystem

### Existing Tests (`test_mcp_reconnection.py`)
- Tests MCP UI behavior during reconnection scenarios
- Covers proxy health checks and server state management

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

### All MCP Tests
```bash
./run_mcp_tests.sh
```

### Options
- `--unit` - Run only unit tests (fast, mocked)
- `--integration` - Run only integration tests (slower, real servers)
- `--headless` - Run without browser UI
- `--verbose` - Show detailed test output
- `--skip-server` - Don't start/stop HTTP server

### Examples
```bash
# Run only unit tests in headless mode
./run_mcp_tests.sh --unit --headless

# Run integration tests with verbose output
./run_mcp_tests.sh --integration --verbose

# Run all tests without starting HTTP server
./run_mcp_tests.sh --skip-server
```

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

## Writing New MCP Tests

### Unit Test Template
```python
@pytest.mark.asyncio
async def test_mcp_feature(page: Page, start_http_server):
    """Test description"""
    page.goto("http://localhost:8000")
    dismiss_welcome_modal(page)
    
    # Mock MCP proxy responses
    page.route("**/localhost:3001/health", lambda route: route.fulfill(
        status=200,
        json={"status": "ok", "servers": 0}
    ))
    
    # Test implementation
    # ...
    
    screenshot_with_markdown(page, "test_name.png", "Test Description")
```

### Integration Test Template
```python
@pytest.mark.asyncio
async def test_mcp_integration(page: Page, start_http_server, mcp_proxy):
    """Test with real MCP servers"""
    page.goto("http://localhost:8000")
    dismiss_welcome_modal(page)
    
    # Real proxy and server interactions
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