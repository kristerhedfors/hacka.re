# Test Organization Report

Generated: Wed Aug 27 08:48:08 CEST 2025

## Test Categories

## Summary Statistics

- **Total**: 0 tests

## Recommended Test Runners

Based on the categorization, use these scripts to run specific test groups:

```bash
# Run core tests (quick validation)
./run_core_tests.sh

# Run modal-specific tests
./run_modal_tests.sh

# Run sharing tests
./run_sharing_tests.sh

# Run MCP tests
./run_mcp_tests.sh

# Run function calling tests
./run_function_tests.sh

# Run RAG tests
./run_rag_tests.sh

# Run test audit to identify failing tests
./run_test_audit.sh

# Run smart test runner with retry logic
./run_tests_smart.sh --mode core
./run_tests_smart.sh --mode modal --max-retries 3
```
