# MCP Tests Troubleshooting Guide

This document provides troubleshooting information for MCP (Model Context Protocol) tests, including historical issues, resolutions, and debugging guidance.

## Common Issues and Solutions

### Test Execution Issues

#### "No tests ran" Errors
**Problem:** Running old test function names that no longer exist
```bash
# These commands will fail:
pytest test_mcp_unit.py::test_mcp_server_connection -v
pytest test_mcp_integration.py::test_mcp_tool_parameter_validation -v
```

**Solution:** Use current test function names
```bash
# Working commands:
pytest test_mcp_unit.py::test_mcp_proxy_connection_states_mocked -v
pytest test_mcp_integration.py::test_mcp_tool_execution -v
```

#### Connection Refused in Unit Tests  
**Problem:** Unit tests trying to make real network connections
```
ConnectionError: Failed to establish a new connection: [Errno 61] Connection refused
```

**Solution:** Unit tests now use proper mocking and don't require server connections
- Check that you're running unit tests: `./run_mcp_tests.sh --unit`
- Unit tests should not require MCP proxy or real servers

#### Integration Test Server Startup Failures
**Problem:** Integration tests fail due to missing Node.js or npm
```
Error: Node.js not found. Please install Node.js
Error: Cannot start MCP proxy
```

**Solution:** Install Node.js or run unit tests only
```bash
# Install Node.js, then:
./run_mcp_tests.sh --integration

# Or run only unit tests:
./run_mcp_tests.sh --unit
```

### Historical Issues (Resolved)

#### Phase 1: Original Unit Test Problems

**Issue:** Connection Refused Errors
- **Symptom:** Unit tests failing with network connection errors
- **Cause:** Tests making real HTTP calls instead of using mocks
- **Resolution:** Replaced real network calls with Playwright route mocking
- **Files Fixed:** `test_mcp_unit.py`

**Issue:** JavaScript Evaluation Errors  
- **Symptom:** "Illegal return statement" in complex JS code evaluation
- **Cause:** Complex JavaScript evaluation in page context
- **Resolution:** Removed complex JS evaluation, focused on UI testing
- **Files Fixed:** `test_mcp_unit.py`

**Issue:** Modal Interference
- **Symptom:** Tests failing due to settings modal blocking interactions
- **Cause:** Missing `dismiss_settings_modal()` calls
- **Resolution:** Added proper modal dismissal in test setup
- **Files Fixed:** All test files

**Issue:** Text Assertion Mismatches
- **Symptom:** Expected "Failed to connect" but got "Connection failed"
- **Cause:** Hardcoded expected text not matching actual UI text
- **Resolution:** Fixed assertions to match actual UI text
- **Files Fixed:** `test_mcp_unit.py`, `test_mcp_integration.py`

#### Phase 2: Reconnection Test Problems

**Issue:** Timeout Looking for Load Tools Button
- **Symptom:** `AssertionError` with timeout waiting for "Load Tools" elements
- **Cause:** Tests looking for UI elements that only exist with real MCP servers
- **Resolution:** Created simplified tests focusing on proxy connection behavior
- **Files Fixed:** `test_mcp_reconnection.py` (completely rewritten)

**Issue:** Complex Server State Dependencies
- **Symptom:** Tests requiring specific server running states
- **Cause:** Tests depending on complex MCP server interactions
- **Resolution:** Simplified to test UI behavior rather than server state
- **Files Fixed:** `test_mcp_reconnection.py`

#### Phase 3: Integration Test Optimization

**Issue:** Proxy Lifecycle Management
- **Symptom:** Proxy processes not starting/stopping cleanly
- **Cause:** Inadequate process management and error handling
- **Resolution:** Robust proxy startup/shutdown with error handling
- **Files Fixed:** `conftest.py`, integration test fixtures

**Issue:** Missing Dependencies
- **Symptom:** Tests failing when Node.js or npm packages missing
- **Cause:** No dependency checking or graceful fallbacks
- **Resolution:** Automatic dependency management with graceful fallbacks
- **Files Fixed:** `run_mcp_tests.sh`, integration test setup

**Issue:** Race Conditions
- **Symptom:** Intermittent test failures due to timing issues
- **Cause:** Inadequate wait strategies and connection verification
- **Resolution:** Proper wait strategies and connection verification
- **Files Fixed:** All integration tests

## Test Command Reference

### Working Individual Test Commands

**Unit Tests**
```bash
# Manager initialization test
pytest test_mcp_unit.py::test_mcp_manager_initialization -v

# Proxy connection test (mocked) 
pytest test_mcp_unit.py::test_mcp_proxy_connection_states_mocked -v

# Server form validation test
pytest test_mcp_unit.py::test_mcp_server_form_validation -v

# Modal UI interactions test
pytest test_mcp_unit.py::test_mcp_modal_ui_interactions -v

# Proxy button functionality test
pytest test_mcp_unit.py::test_mcp_proxy_button_interaction -v

# Server list area test
pytest test_mcp_unit.py::test_mcp_server_list_area -v
```

**Simple Tests**
```bash
# Button existence test
pytest test_mcp_simple.py::test_mcp_button_exists -v

# Modal opening test
pytest test_mcp_simple.py::test_mcp_modal_opens -v

# Initial proxy status test
pytest test_mcp_simple.py::test_mcp_proxy_status_initial -v

# Server input field test
pytest test_mcp_simple.py::test_mcp_server_input_exists -v

# Form submission test
pytest test_mcp_simple.py::test_mcp_form_submission -v

# Modal close test
pytest test_mcp_simple.py::test_mcp_modal_close -v
```

**Reconnection Tests**
```bash
# Proxy connection status updates
pytest test_mcp_reconnection.py::test_mcp_proxy_connection_status_updates -v

# Proxy reconnection flow with server counts
pytest test_mcp_reconnection.py::test_mcp_proxy_reconnection_flow -v

# Server form after proxy connection
pytest test_mcp_reconnection.py::test_mcp_server_form_after_connection -v

# Modal close and reopen state persistence
pytest test_mcp_reconnection.py::test_mcp_modal_close_and_reopen -v

# Connection error handling and recovery
pytest test_mcp_reconnection.py::test_mcp_connection_error_handling -v

# Server list visibility
pytest test_mcp_reconnection.py::test_mcp_server_list_visibility -v
```

**Integration Tests**
```bash
# Filesystem server integration
pytest test_mcp_integration.py::test_mcp_filesystem_server_integration -v

# Tool execution setup
pytest test_mcp_integration.py::test_mcp_tool_execution -v

# Multiple servers test
pytest test_mcp_integration.py::test_mcp_multiple_servers -v

# Proxy connection with real server
pytest test_mcp_integration_simple.py::test_mcp_proxy_connection -v

# Server form with proxy
pytest test_mcp_integration_simple.py::test_mcp_server_form_with_proxy -v

# Filesystem server attempt
pytest test_mcp_integration_simple.py::test_mcp_filesystem_server_attempt -v

# Modal UI with proxy
pytest test_mcp_integration_simple.py::test_mcp_modal_ui_with_proxy -v

# Proxy health endpoint
pytest test_mcp_integration_simple.py::test_mcp_proxy_health_endpoint -v
```

### File-Level Commands
```bash
# All unit tests (18 tests)
pytest test_mcp_unit.py test_mcp_simple.py test_mcp_reconnection.py -v

# All integration tests (8 tests)  
pytest test_mcp_integration.py test_mcp_integration_simple.py -v

# All MCP tests (26 tests)
pytest test_mcp_unit.py test_mcp_simple.py test_mcp_reconnection.py test_mcp_integration.py test_mcp_integration_simple.py -v
```

### Test Suite Commands
```bash
# Unit tests only (18 tests)
./run_mcp_tests.sh --unit

# Integration tests only (8 tests)
./run_mcp_tests.sh --integration

# All MCP tests (26 tests)
./run_mcp_tests.sh
```

## Old Test Names (NO LONGER EXIST)

These were removed because they were broken:
- ❌ `test_mcp_proxy_connection_states` (use `test_mcp_proxy_connection_states_mocked`)
- ❌ `test_mcp_tool_parameter_validation` (replaced with form validation tests)
- ❌ `test_mcp_tool_registration` (replaced with UI interaction tests)
- ❌ `test_mcp_server_command_parsing` (replaced with form validation tests)
- ❌ `test_mcp_error_handling` (covered in button interaction tests)
- ❌ `test_mcp_storage_persistence` (not reliably testable in unit tests)

## Debugging Techniques

### View Proxy Logs
```bash
tail -f /tmp/mcp-proxy-test.log
```

### Check Running Servers
```bash
curl http://localhost:3001/mcp/list
```

### Check Proxy Health
```bash
curl http://localhost:3001/health
```

### Screenshots
All tests save screenshots to `screenshots/` directory for debugging.

### Verbose Test Output
```bash
# Run with verbose output and screenshots
./run_mcp_tests.sh --verbose

# Run specific test with full debug output
pytest test_mcp_integration.py::test_mcp_tool_execution -v -s
```

### Common Debugging Steps

1. **Check Server Status**
   ```bash
   curl http://localhost:3001/health
   ```

2. **Verify Node.js Installation**
   ```bash
   node --version
   npm --version
   ```

3. **Check MCP Proxy Directory**
   ```bash
   ls -la ../../mcp-stdio-proxy/
   ```

4. **Review Test Screenshots**
   ```bash
   ls -la screenshots/mcp_*
   ```

5. **Check Test Logs**
   ```bash
   cat test_output.log | grep -i mcp
   ```

## Test Environment Setup

### Requirements for Integration Tests
1. **Node.js and npm** - For running MCP proxy and servers
2. **@modelcontextprotocol/server-filesystem** - Automatically installed during tests
3. **mcp-stdio-proxy** - Located in `../../mcp-stdio-proxy/`

### Automatic Setup Features
- Node.js version checking
- npm package installation  
- MCP proxy process management
- Graceful handling of missing dependencies

### Manual Setup (if needed)
```bash
# Install Node.js (if not present)
# Platform-specific installation

# Install MCP proxy dependencies
cd ../../mcp-stdio-proxy
npm install

# Return to test directory
cd _tests/playwright

# Run tests
./run_mcp_tests.sh
```

## Performance Troubleshooting

### Slow Test Execution
- **Unit tests should complete in ~29 seconds**
- **Integration tests should complete in ~34 seconds**
- If tests are slower, check for:
  - Network connectivity issues
  - Node.js installation problems
  - Disk I/O performance

### Memory Issues
- **Integration tests may use more memory due to real servers**
- **Monitor proxy processes for memory leaks**
- **Clean up test artifacts regularly**

### Port Conflicts
- **MCP proxy uses port 3001**
- **HTTP server uses port 8000**
- **Check for conflicting processes:**
  ```bash
  lsof -i :3001
  lsof -i :8000
  ```

## Known Limitations

### Unit Test Limitations
- Cannot test actual MCP protocol communication
- UI behavior only, no real server state validation
- Mocked responses may not reflect real server behavior

### Integration Test Limitations  
- Require Node.js environment
- May fail in restricted network environments
- Dependent on external package availability (@modelcontextprotocol/server-filesystem)

### Platform Limitations
- Integration tests primarily tested on macOS
- Windows and Linux compatibility may vary
- Container environments may require additional setup