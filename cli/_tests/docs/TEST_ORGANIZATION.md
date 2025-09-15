# Test Organization Documentation

## Overview
The CLI test suite has been reorganized with structured result logging, comparison tracking, and artifact management.

## Directory Structure

```
_tests/
├── test_results/              # All test execution results
│   ├── README.md             # Directory structure documentation
│   ├── daily/                # Timestamped test runs
│   │   ├── YYYYMMDD_HHMMSS.json   # Raw pytest JSON output
│   │   ├── YYYYMMDD_HHMMSS.md     # Human-readable summary
│   │   ├── YYYYMMDD_HHMMSS.log    # Full console output
│   │   ├── latest.*          # Symlinks to most recent run
│   │   └── previous.*        # Symlinks to second-most recent
│   ├── comparison/           # Test comparison reports
│   │   ├── latest_vs_previous.md  # Auto-generated comparison
│   │   └── archive/         # Historical comparisons
│   └── reports/             # Special reports
│       ├── COMPLETE_TEST_RESULTS.md
│       ├── FINAL_TEST_REPORT.md
│       └── ZIP_SERVING_FIXED.md
├── docs/                    # Test documentation
│   ├── TEST_COVERAGE.md   # Test suite coverage documentation
│   └── TEST_ORGANIZATION.md # This file
├── screenshots/            # Playwright screenshots
├── screenshots_data/       # Screenshot metadata
└── cli_test_results/      # Legacy results (to be migrated)
```

## Key Scripts

### 1. `run_tests_with_logging.sh`
Main test runner with structured logging:
- Generates timestamped JSON, Markdown, and log files
- Updates latest/previous symlinks
- Creates automatic comparison reports
- Shows test regressions, fixes, and new tests

**Usage:**
```bash
# Run all CLI tests
./run_tests_with_logging.sh

# Run specific test pattern
./run_tests_with_logging.sh "test_cli_browse*.py"
```

### 2. `cleanup_test_artifacts.sh`
Maintains clean test environment:
- Archives old test results (gzip after 7 days)
- Removes old screenshots (after 3 days)
- Cleans orphaned metadata files
- Shows disk usage statistics

**Usage:**
```bash
# Run cleanup with defaults
./cleanup_test_artifacts.sh

# Dry run to see what would be done
./cleanup_test_artifacts.sh --dry-run

# Custom retention periods
./cleanup_test_artifacts.sh --archive-days 14 --screenshot-days 7
```

### 3. Legacy Scripts (Still Functional)
- `run_cli_tests.sh` - Original test runner
- `run_quick_tests.sh` - Quick non-browser tests
- `setup_test_env.sh` - Environment setup

## Test Result Formats

### JSON Format (`*.json`)
- Raw pytest-json-report output
- Machine-readable for comparisons
- Contains all test metadata

### Markdown Format (`*.md`)
- Human-readable summary
- Test statistics and pass rates
- Failed test details with truncated errors
- Environment information

### Log Format (`*.log`)
- Complete console output
- Full stack traces
- Debug information

## Comparison Reports

Every test run automatically generates comparison with previous run showing:

1. **Summary Changes**: Total tests, pass/fail counts, duration
2. **Fixed Tests**: Previously failing, now passing ✅
3. **Broken Tests**: Previously passing, now failing ❌
4. **New Tests**: Added since last run 🆕
5. **Removed Tests**: No longer in suite 🗑️

## Best Practices

### Running Tests
1. Always use `run_tests_with_logging.sh` for tracked results
2. Review `latest_vs_previous.md` after each run
3. Archive important test runs with descriptive names

### Debugging Failures
1. Check `test_results/daily/latest.log` for full output
2. Review screenshots in `screenshots/` directory
3. Compare with previous run to identify changes

### Maintaining Clean Environment
1. Run `cleanup_test_artifacts.sh` weekly
2. Use `--dry-run` first to preview changes
3. Adjust retention periods based on needs

## Environment Variables

### `HACKARE_WEB_PORT`
- Default port for web server (8080)
- Used by both `browse` and `serve` commands
- Can be overridden with `-p` flag

## Test Categories

### 1. Browse Command (`test_cli_browse_command.py`)
- Help text verification
- Server startup and port configuration
- Static file serving
- Environment variables
- Shared configuration support

### 2. Serve Command (`test_cli_serve_command.py`)
- No browser launch
- Verbose logging levels
- Request/header logging
- Performance testing

### 3. Chat Command (`test_cli_chat_command.py`)
- Subcommand registration
- Configuration handling
- Terminal interaction

### 4. Port Configuration (`test_cli_port_configuration.py`)
- Default port behavior
- Flag precedence
- Environment variables
- Port conflicts

### 5. ZIP Serving (`test_cli_zip_serving.py`)
- Embedded ZIP verification
- Memory serving
- MIME types
- Concurrent requests

### 6. Shared Links (`test_cli_shared_links.py`)
- URL formats
- Encryption/decryption
- Password handling

## Metrics and Monitoring

Current test suite statistics:
- **Total Tests**: 47
- **Categories**: 6
- **Average Duration**: ~30 seconds
- **Pass Rate Target**: >95%

## Migration Notes

The test infrastructure has been updated to:
1. Remove `--no-browser` flag from browse command
2. Unify environment variable to `HACKARE_WEB_PORT`
3. Use `serve` command for headless testing
4. Implement structured result logging

All tests have been updated to reflect these changes.