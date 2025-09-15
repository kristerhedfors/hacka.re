# CLAUDE.md - CLI Testing Guide

This local CLAUDE.md takes precedence over the project root CLAUDE.md when working in the CLI directory.

## CRITICAL: Working Directory
**ALWAYS verify you're in the correct directory before running commands:**
```bash
pwd  # Should be /Users/user/dev/hacka.re/cli or /Users/user/dev/hacka.re/cli/_tests
```

## CLI Binary Overview

The `hacka.re` CLI is a Go application that embeds the entire web interface as a ZIP file and serves it from memory.

### Key Features
- **browse**: Start web server and open browser (port 8080 default)
- **serve**: Start web server without opening browser
- **chat**: Interactive terminal chat session
- **Embedded ZIP**: ~13MB binary with all web assets
- **Memory serving**: No disk extraction required

## Building the CLI

### Prerequisites
- Go 1.19+ installed
- Project ZIP built: `./scripts/build-release-zip.sh`

### Build Commands
```bash
# From cli directory
cd /Users/user/dev/hacka.re/cli

# Build with embedded assets
./build-with-assets.sh

# Or manual build
go build -o hacka.re cmd/hacka.re/main.go
```

## Testing the CLI

### Test Environment Setup
```bash
cd /Users/user/dev/hacka.re/cli/_tests

# First time setup
./setup_test_env.sh

# Activate environment for each session
source .venv/bin/activate
```

### Running Tests

#### Quick Test Suite (No Browser)
```bash
./run_quick_tests.sh
```

#### Full Test Suite
```bash
./run_cli_tests.sh
```

#### Individual Test Categories
```bash
# Browse command tests
pytest test_cli_browse_command.py -v

# Serve command tests  
pytest test_cli_serve_command.py -v

# Chat command tests
pytest test_cli_chat_command.py -v

# Port configuration tests
pytest test_cli_port_configuration.py -v

# Shared links tests
pytest test_cli_shared_links.py -v

# ZIP serving tests
pytest test_cli_zip_serving.py -v
```

#### Run Non-Browser Tests Only
```bash
pytest -k "not chromium" -v
```

#### Run Specific Test
```bash
pytest test_cli_browse_command.py::TestCliBrowseCommand::test_browse_help -v
```

## Test Coverage Areas

### 1. Browse Command
- Help text and usage
- Server startup on various ports
- Environment variable `HACKARE_WEB_PORT`
- Browser auto-launch behavior
- Shared configuration links

### 2. Serve Command  
- No browser launch
- Verbose logging (`-v` and `-vv`)
- Web/API subcommands
- Request logging with timestamps
- Header logging with `-vv`

### 3. Chat Command
- Subcommand recognition
- Configuration file handling
- Shared link acceptance
- Terminal interaction
- Legacy `--chat` flag deprecation

### 4. Port Configuration
- Default port 8080
- `-p` and `--port` flags
- Environment variable override
- Flag precedence over environment
- Port conflict detection
- Invalid port handling

### 5. ZIP Serving
- Binary contains embedded ZIP (~13MB)
- Files served from memory
- No extraction to disk
- Correct MIME types
- 404 for non-existent files
- Concurrent request handling
- **Note**: Uses `/js/app.js` not `/js/main.js`

### 6. Shared Links
All commands accept three formats:
- Full URL: `https://hacka.re/#gpt=eyJlbmM...`
- Fragment: `gpt=eyJlbmM...`
- Raw data: `eyJlbmM...`

## Common Test Commands

### Check CLI Binary
```bash
# Verify binary exists and size
ls -lh ../hacka.re
# Should be ~13MB with embedded ZIP
```

### Test Server Manually
```bash
# Start server
../hacka.re serve -p 9000 -v

# In another terminal
curl http://localhost:9000/
curl http://localhost:9000/js/app.js
curl http://localhost:9000/css/styles.css
```

### Test Browse Command
```bash
# Opens browser automatically
../hacka.re browse

# Custom port without browser
../hacka.re browse -p 3000 --no-browser

# With environment variable
HACKARE_WEB_PORT=9000 ../hacka.re browse --no-browser
```

### Test Verbose Logging
```bash
# Basic request logging
../hacka.re serve -v

# Request with headers
../hacka.re serve -vv
```

## Debugging Test Failures

### Common Issues

1. **Port Already in Use**
```bash
# Find process using port
lsof -i :8080
# Kill if needed
kill -9 <PID>
```

2. **Test Timeouts**
- Some tests like `test_serve_shows_url` may timeout due to blocking I/O
- Run individually with shorter timeout:
```bash
pytest test_cli_serve_command.py::TestCliServeCommand::test_serve_shows_url --timeout=5 -v
```

3. **Missing Files in ZIP**
- The app uses `/js/app.js` NOT `/js/main.js`
- Libraries are in subdirectories: `/lib/tweetnacl/nacl-fast.min.js`

4. **Browser Tests Failing**
```bash
# Install/update Playwright browsers
playwright install chromium
```

## Test Results Location

- **Screenshots**: `_tests/screenshots/`
- **Metadata**: `_tests/screenshots_data/`
- **Test Reports**: `_tests/cli_test_results/`
- **Logs**: `_tests/cli_test_results/test_run_*.log`

## Expected Test Results

### Current Status (as of last run)
- **Total Tests**: 47
- **Passing**: 44+ (93%+)
- **Known Issues**:
  - `test_serve_shows_url` - May timeout (blocking I/O)
  - Some assertion checks may be too strict

### All ZIP Serving Tests Should Pass
```
✅ test_zip_embedded_in_binary
✅ test_serves_from_memory_not_disk  
✅ test_all_file_types_served
✅ test_404_for_nonexistent_files
✅ test_concurrent_requests_from_zip
✅ test_hacka_re_app_loads
✅ test_no_directory_listing
```

## Test Result Management

### Directory Structure
```
_tests/
├── test_results/           # All test execution results
│   ├── daily/             # Timestamped test runs
│   │   ├── YYYYMMDD_HHMMSS.json   # Raw pytest JSON
│   │   ├── YYYYMMDD_HHMMSS.md     # Human-readable summary
│   │   ├── YYYYMMDD_HHMMSS.log    # Full console output
│   │   ├── latest.{json,md,log}   # Symlinks to most recent
│   │   └── previous.{json,md,log} # Symlinks to second-most recent
│   ├── comparison/        # Test comparison reports
│   │   ├── latest_vs_previous.md  # Auto-generated comparison
│   │   └── archive/               # Historical comparisons
│   └── reports/           # Special reports (coverage, etc.)
├── docs/                  # Test documentation
│   └── TEST_COVERAGE.md  # Test coverage documentation
└── screenshots/           # Playwright screenshots
```

### Running Tests with Proper Logging

#### Standard Test Run with Full Logging
```bash
# Run all CLI tests with structured logging
./run_tests_with_logging.sh

# Run specific test pattern
./run_tests_with_logging.sh "test_cli_browse*.py"

# Output includes:
# - Timestamped JSON results for comparison
# - Markdown summary for quick review
# - Full console log for debugging
# - Automatic comparison with previous run
```

#### Viewing Results
```bash
# View latest summary
cat test_results/daily/latest.md

# View comparison with previous run
cat test_results/comparison/latest_vs_previous.md

# View specific test run
ls -la test_results/daily/  # Find timestamp
cat test_results/daily/20250915_143022.md
```

#### Test Result Comparison
Every test run automatically:
1. Saves results with UTC timestamp
2. Updates latest/previous symlinks
3. Generates comparison report showing:
   - Fixed tests (were failing, now passing)
   - Broken tests (were passing, now failing)
   - New tests added
   - Tests removed
   - Performance changes

### Quick Validation Script

For quick CLI validation without full test suite:
```bash
#!/bin/bash
echo "=== CLI Quick Validation ==="

# Check binary
echo "Binary size: $(ls -lh ../hacka.re | awk '{print $5}')"

# Test help
../hacka.re --help > /dev/null && echo "✓ Help works"

# Test browse help
../hacka.re browse --help > /dev/null && echo "✓ Browse help works"

# Test serve help  
../hacka.re serve --help > /dev/null && echo "✓ Serve help works"

# Test chat help
../hacka.re chat --help > /dev/null && echo "✓ Chat help works"

# Test server startup
timeout 2 ../hacka.re serve -p 9999 > /dev/null 2>&1
[ $? -eq 124 ] && echo "✓ Server starts (timeout expected)"

echo "=== Validation Complete ==="
```

## Important Notes

1. **Always run tests from `cli/_tests` directory**
2. **Activate virtual environment before running Python tests**
3. **CLI binary must be built before running tests**
4. **ZIP must be embedded (use `build-with-assets.sh`)**
5. **Some tests require Playwright for browser automation**
6. **The app uses modular JS, not a single main.js file**
7. **Use `run_tests_with_logging.sh` for proper result tracking**
8. **Test results are timestamped in UTC for consistency**
9. **Always review comparison report after test runs**

## Test Result Best Practices

### When Running Tests
1. **Use the logging script**: `./run_tests_with_logging.sh` instead of direct pytest
2. **Review comparisons**: Check `latest_vs_previous.md` for regressions
3. **Archive important runs**: Copy significant test results to `reports/` with descriptive names

### When Debugging Failures
1. **Check the full log**: `test_results/daily/latest.log` has complete output
2. **Use screenshots**: Check `screenshots/` directory for visual debugging
3. **Compare with previous**: Use the comparison report to identify what changed

### When Adding New Tests
1. **Run before and after**: Generate comparison to show new tests added
2. **Document coverage**: Update `docs/TEST_COVERAGE.md` with new test areas
3. **Verify in CI**: Ensure new tests work in clean environment

This guide ensures comprehensive testing of the hacka.re CLI with full visibility, proper logging, and result tracking.