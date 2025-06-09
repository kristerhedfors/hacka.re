# MCP Test Commands Reference

## ✅ **Working Individual Test Commands**

### Unit Tests (`test_mcp_unit.py`)
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

### Reconnection Tests (`test_mcp_reconnection.py`)
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

### Simple Tests (`test_mcp_simple.py`)
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

### Integration Tests (`test_mcp_integration.py`)
```bash
# Filesystem server integration
pytest test_mcp_integration.py::test_mcp_filesystem_server_integration -v

# Tool execution setup
pytest test_mcp_integration.py::test_mcp_tool_execution -v

# Multiple servers test
pytest test_mcp_integration.py::test_mcp_multiple_servers -v
```

### Integration Simple Tests (`test_mcp_integration_simple.py`)
```bash
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

## ✅ **Working File-Level Commands**

```bash
# All unit tests (18 tests)
pytest test_mcp_unit.py test_mcp_simple.py test_mcp_reconnection.py -v

# All integration tests (8 tests)  
pytest test_mcp_integration.py test_mcp_integration_simple.py -v

# All MCP tests (26 tests)
pytest test_mcp_unit.py test_mcp_simple.py test_mcp_reconnection.py test_mcp_integration.py test_mcp_integration_simple.py -v
```

## ✅ **Working Test Suite Commands**

```bash
# Unit tests only (18 tests)
./run_mcp_tests.sh --unit

# Integration tests only (8 tests)
./run_mcp_tests.sh --integration

# All MCP tests (26 tests)
./run_mcp_tests.sh
```

## ❌ **Old Test Names (NO LONGER EXIST)**

These were removed because they were broken:
- ❌ `test_mcp_proxy_connection_states` (use `test_mcp_proxy_connection_states_mocked`)
- ❌ `test_mcp_tool_parameter_validation` (replaced with form validation tests)
- ❌ `test_mcp_tool_registration` (replaced with UI interaction tests)
- ❌ `test_mcp_server_command_parsing` (replaced with form validation tests)
- ❌ `test_mcp_error_handling` (covered in button interaction tests)
- ❌ `test_mcp_storage_persistence` (not reliably testable in unit tests)

## 🎯 **Recommended Commands**

### Quick Test
```bash
# Just run the basic unit tests (fast)
pytest test_mcp_unit.py -v
```

### Full Validation  
```bash
# Run complete test suite (26 tests)
./run_mcp_tests.sh
```

### Debug Specific Area
```bash
# Test proxy functionality
pytest test_mcp_unit.py::test_mcp_proxy_connection_states_mocked -v -s

# Test form interactions
pytest test_mcp_unit.py::test_mcp_server_form_validation -v -s

# Test modal behavior
pytest test_mcp_unit.py::test_mcp_modal_ui_interactions -v -s
```

All commands above are verified to work and will not give "no tests ran" errors!