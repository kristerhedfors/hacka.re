# Test Results Directory Structure

## Directory Organization

```
test_results/
├── README.md           # This file
├── daily/             # Daily test run results (YYYYMMDD_HHMMSS format)
│   ├── 20250915_130000.json    # Raw pytest JSON output
│   ├── 20250915_130000.md      # Markdown summary
│   └── 20250915_130000.log     # Full console output
├── comparison/        # Test comparison reports
│   ├── latest_vs_previous.md   # Always-updated comparison
│   └── archive/                # Historical comparisons
└── reports/           # Special test reports
    ├── coverage.html           # Code coverage reports
    └── performance.md          # Performance metrics
```

## File Naming Convention

### Daily Test Results
- Format: `YYYYMMDD_HHMMSS.{json|md|log}`
- Example: `20250915_143022.json`
- Always in UTC timezone

### Comparison Reports
- Latest comparison: `latest_vs_previous.md`
- Archived: `comparison_YYYYMMDD.md`

## Test Result Formats

### JSON Format (pytest --json-report)
Raw test data for automated processing and comparison.

### Markdown Format
Human-readable summary with:
- Test statistics
- Failed test details
- Timing information
- Environment details

### Log Format
Complete console output including:
- All test output
- Debug messages
- Stack traces

## Automated Symlinks

- `latest.json` → Most recent test run JSON
- `latest.md` → Most recent test run summary
- `previous.json` → Second-most recent test run JSON
- `previous.md` → Second-most recent test run summary