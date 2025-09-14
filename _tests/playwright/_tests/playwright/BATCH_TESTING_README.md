# Batch Testing Strategy

## Problem Solved
The test suite contains 289+ test files which timeout when run all at once (2-minute pytest limit). This batch testing approach solves that by running tests in smaller, manageable groups.

## Available Test Runners

### Quick Test Suites
- `./run_core_tests.sh` - Core functionality (4 files, ~1 min)
- `./run_feature_tests.sh` - Advanced features (9 batches, ~10 min)

### Specialized Test Runners (NEW)
- `./run_function_tests.sh` - Function calling tests (16 files in batches of 4)
- `./run_mcp_tests.sh` - MCP integration tests (20 files in batches of 5)
- `./run_agent_tests.sh` - Agent tests (18 files in batches of 5)

### Comprehensive Runners
- `./run_tests.sh` - All 289+ tests in 20+ batches (~30 min)
- `./run_test_menu.sh` - Interactive menu for choosing test suites

## Batch Sizes
- Core tests: 1 file per batch (quick validation)
- Function tests: 4 files per batch
- MCP/Agent tests: 5 files per batch
- Feature tests: 4-5 files per batch
- All tests: Varies by category (3-5 files per batch)

## Timeout Configuration
All batches use `--timeout=120` (2 minutes) per batch to avoid pytest timeouts.

## Usage Examples

```bash
# Run core tests quickly
./run_core_tests.sh

# Run specific category
./run_mcp_tests.sh --verbose

# Run with existing server
./run_feature_tests.sh --skip-server

# Interactive menu
./run_test_menu.sh

# Run single file
./run_tests.sh --test-file test_api.py

# Run by pattern
./run_tests.sh -k "shodan"
```

## Benefits
1. **No More Timeouts** - Each batch completes within 2 minutes
2. **Better Debugging** - Failures are easier to identify in smaller batches
3. **Parallel Friendly** - Can run different categories in parallel terminals
4. **Progressive Testing** - Start with core, then features, then specialized
5. **Granular Control** - Run only what you need

## Test Categories (by volume)
- MCP: 20 files
- Agent: 18 files
- Shodan: 17 files
- Function: 16 files
- GitHub: 13 files
- RAG: 11 files
- Share: 6 files
- Model: 4 files
- Core: 4 files
- Others: 180+ files

## Output Files
Each runner creates its own output file:
- `run_core_tests.out`
- `run_feature_tests.out`
- `run_function_tests.out`
- `run_mcp_tests.out`
- `run_agent_tests.out`
- `run_tests.out`

All scripts also generate `run_tests.out_bundle.md` for markdown reports.
