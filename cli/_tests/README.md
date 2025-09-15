# CLI Test Suite

Comprehensive test suite for the hacka.re CLI using Python/Playwright.

## Quick Start

```bash
# Run default tests (fast, reliable)
./run_tests_default.sh

# Run with detailed logging and comparison
./run_tests_with_logging.sh

# Run all tests including slow ones
./run_all_tests_smooth.sh
```

## Test Coverage

- **64 tests** covering all CLI functionality
- **100% success rate** for file serving from embedded ZIP
- **< 0.1s response time** for concurrent requests
- **Session environment variables** (HACKARE_LINK, HACKARE_SESSION, HACKARE_CONFIG)

## Test Categories

### Core Commands (21 tests)
- `browse` - Web server with browser launch
- `serve` - Web server without browser
- `chat` - Interactive terminal chat

### Configuration (26 tests)
- Port configuration and environment variables
- Shared links in 3 formats (URL, fragment, raw)
- Session environment variables (3 synonymous vars)

### Infrastructure (17 tests)
- ZIP serving from memory
- Concurrent request handling
- Performance validation

## Key Features

✅ **No native Go tests needed** - Playwright tests the compiled binary directly
✅ **Real API testing** - No mocking, tests against actual behavior
✅ **Screenshot capture** - Visual debugging for browser tests
✅ **Performance assertions** - Ensures instant response from memory-served files
✅ **Environment isolation** - Each test cleans up after itself

## Running Individual Tests

```bash
# Activate environment
source .venv/bin/activate

# Run specific test file
pytest test_cli_browse_command.py -v

# Run specific test
pytest test_cli_serve_command.py::TestCliServeCommand::test_serve_performance -v

# Skip slow/interactive tests
pytest -k "not (browse_with_session or serve_with_session or chat_with_session)" -v
```

## Test Scripts

- `run_tests_default.sh` - Quick reliable run (skips slow tests)
- `run_tests_with_logging.sh` - Full logging with JSON reports and comparisons
- `run_all_tests_smooth.sh` - Organized batch execution with summary
- `run_cli_tests.sh` - Legacy runner (use run_tests_default.sh instead)

## Performance Standards

- **File serving**: 100% success rate required
- **Response time**: < 0.1s for static files
- **Concurrency**: 10+ simultaneous requests handled smoothly
- **Error handling**: Multiple env vars properly rejected

## Session Environment Variables

The CLI supports three **synonymous** environment variables:
- `HACKARE_LINK`
- `HACKARE_SESSION`
- `HACKARE_CONFIG`

All accept the same formats (URL, fragment, or raw data). Only ONE should be set at a time.

## Test Results

Results are saved in `test_results/daily/` with:
- JSON reports for programmatic analysis
- Markdown summaries for quick review
- Comparison reports showing changes between runs
- Screenshots for visual debugging