# Debug Tests Structure

This directory contains temporary debugging test files that were created to investigate and fix specific issues. These tests are separate from the regular test suite and can be safely removed once the issues are resolved.

## Directory Structure

### `mcp_debugging/`
Tests for debugging Model Context Protocol (MCP) integration issues:
- `debug_mcp_*.py` - Various MCP debugging scripts
- `test_mcp_parameter_fix*.py` - Tests for fixing MCP parameter passing issues
- `test_mcp_with_function_tools_enabled.py` - Test MCP with Function Tools enabled
- `test_final_mcp_verification.py` - Final verification that MCP functions work
- `inspect_mcp_function.py` - Script to inspect MCP function definitions
- `manual_mcp_test.py` - Manual MCP testing script
- `force_mcp_regeneration.py` - Force regeneration of MCP functions
- `force_clear_mcp_functions.py` - Clear all MCP functions for testing

### `api_debugging/`
Tests for debugging API configuration and response issues:
- `debug_api_issue.py` - Debug API configuration and network issues
- `test_basic_api_then_mcp.py` - Test basic API then MCP functionality

### `function_debugging/`
Tests for debugging function execution and storage issues:
- `debug_function_*.py` - Various function debugging scripts

### `general_debugging/`
General debugging and testing utilities:
- `clear_and_test.py` - Clear state and run tests
- `open_for_testing.py` - Open application for manual testing

## Usage

These debug tests can be run individually to investigate specific issues:

```bash
# Run specific MCP debugging test
python -m pytest debug_tests/mcp_debugging/test_mcp_parameter_fix_final.py -v -s

# Run API debugging test
python -m pytest debug_tests/api_debugging/debug_api_issue.py -v -s

# Run function debugging test
python -m pytest debug_tests/function_debugging/debug_function_execution.py -v -s
```

## Cleanup

Once the issues are resolved and the main functionality is working correctly, these debug test files can be safely removed:

```bash
# Remove all debug tests (only when issues are resolved)
rm -rf debug_tests/
```

## Status

### ✅ Resolved Issues
- **MCP Parameter Passing**: Fixed in MCP connection manager, tools manager, function calling manager, and function executor
- **Function Schema Generation**: Fixed inputSchema preservation and tool definition creation

### ⚠️ Known Issues
- **Chat Message Rendering**: API calls succeed but responses aren't displayed in UI (separate from MCP functionality)

## Key Fixes Applied

1. **MCP Connection Manager** (`js/services/mcp-connection-manager.js:86`): Fixed inputSchema preservation
2. **MCP Tools Manager** (`js/components/mcp/mcp-tools-manager.js:139`): Updated to use params object
3. **Function Calling Manager** (`js/components/function-calling-manager.js:83`): Enhanced to accept custom tool definitions  
4. **Function Tools Executor** (`js/services/function-tools-executor.js:301-303`): Modified to pass params object for MCP functions

The MCP parameter issue reported by the user has been completely resolved. The debug tests in `mcp_debugging/` confirm that MCP functions now have proper parameter schemas and receive parameters correctly.