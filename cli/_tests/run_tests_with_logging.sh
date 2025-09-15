#!/bin/bash

# Test runner with structured logging and result comparison
# Usage: ./run_tests_with_logging.sh [test_file_pattern]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get timestamp
TIMESTAMP=$(date -u +"%Y%m%d_%H%M%S")

# Directories
TEST_DIR="/Users/user/dev/hacka.re/cli/_tests"
RESULTS_DIR="${TEST_DIR}/test_results"
DAILY_DIR="${RESULTS_DIR}/daily"
COMPARISON_DIR="${RESULTS_DIR}/comparison"

# Ensure directories exist
mkdir -p "$DAILY_DIR" "$COMPARISON_DIR/archive"

# Result files
JSON_FILE="${DAILY_DIR}/${TIMESTAMP}.json"
MD_FILE="${DAILY_DIR}/${TIMESTAMP}.md"
LOG_FILE="${DAILY_DIR}/${TIMESTAMP}.log"

# Test pattern (default: all CLI tests)
TEST_PATTERN="${1:-test_cli_*.py}"

echo -e "${GREEN}=== CLI Test Runner ===${NC}"
echo "Timestamp: $TIMESTAMP"
echo "Test pattern: $TEST_PATTERN"
echo ""

# Activate virtual environment
source .venv/bin/activate

# Install pytest-json-report if needed
pip install -q pytest-json-report 2>/dev/null || true

# Run tests with JSON reporting and full logging
echo -e "${YELLOW}Running tests...${NC}"
pytest $TEST_PATTERN \
    -v \
    --json-report \
    --json-report-file="$JSON_FILE" \
    --tb=short \
    --capture=no \
    2>&1 | tee "$LOG_FILE"

# Capture exit code
TEST_EXIT_CODE=${PIPESTATUS[0]}

# Parse JSON results and create markdown summary
echo -e "${YELLOW}Generating markdown summary...${NC}"
python3 << EOF
import json
import os
from datetime import datetime

json_file = "$JSON_FILE"
md_file = "$MD_FILE"

# Read JSON results
try:
    with open(json_file, 'r') as f:
        data = json.load(f)
except:
    # If JSON report failed, create basic summary
    with open(md_file, 'w') as f:
        f.write(f"# Test Run: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write("**Error**: Failed to generate JSON report\n")
        f.write(f"See log file: {os.path.basename('$LOG_FILE')}\n")
    exit(0)

# Extract summary data
summary = data.get('summary', {})
total = summary.get('total', 0)
passed = summary.get('passed', 0)
failed = summary.get('failed', 0)
skipped = summary.get('skipped', 0)
errors = summary.get('error', 0)
duration = data.get('duration', 0)

# Calculate pass rate
pass_rate = (passed / total * 100) if total > 0 else 0

# Write markdown summary
with open(md_file, 'w') as f:
    f.write(f"# Test Run: $TIMESTAMP\n\n")
    f.write("## Summary\n\n")
    f.write(f"- **Total Tests**: {total}\n")
    f.write(f"- **Passed**: {passed} ✅\n")
    f.write(f"- **Failed**: {failed} ❌\n")
    f.write(f"- **Skipped**: {skipped} ⏭️\n")
    f.write(f"- **Errors**: {errors} 🔥\n")
    f.write(f"- **Pass Rate**: {pass_rate:.1f}%\n")
    f.write(f"- **Duration**: {duration:.2f}s\n\n")
    
    # Environment info
    f.write("## Environment\n\n")
    env = data.get('environment', {})
    f.write(f"- **Python**: {env.get('Python', 'unknown')}\n")
    f.write(f"- **Platform**: {env.get('Platform', 'unknown')}\n")
    f.write(f"- **CLI Binary**: ../hacka.re\n\n")
    
    # Failed tests details
    if failed > 0 or errors > 0:
        f.write("## Failed Tests\n\n")
        tests = data.get('tests', [])
        for test in tests:
            if test.get('outcome') in ['failed', 'error']:
                f.write(f"### {test.get('nodeid', 'unknown')}\n\n")
                f.write(f"**Outcome**: {test.get('outcome')}\n\n")
                if test.get('call', {}).get('longrepr'):
                    f.write("\`\`\`\\n")
                    longrepr = test['call']['longrepr']
                    f.write(longrepr[:500])  # Truncate long errors
                    if len(longrepr) > 500:
                        f.write("\\n... (truncated)")
                    f.write("\\n\`\`\`\\n\\n")
    
    # Test files covered
    f.write("## Test Files\n\n")
    test_files = set()
    for test in data.get('tests', []):
        nodeid = test.get('nodeid', '')
        if '::' in nodeid:
            test_file = nodeid.split('::')[0]
            test_files.add(test_file)
    
    for tf in sorted(test_files):
        f.write(f"- {tf}\n")

print(f"Markdown summary created: {os.path.basename(md_file)}")
EOF

# Update symlinks for latest results
echo -e "${YELLOW}Updating latest symlinks...${NC}"
cd "$DAILY_DIR"

# Move current latest to previous
if [ -L "latest.json" ]; then
    rm -f previous.json previous.md previous.log
    ln -sf "$(readlink latest.json)" previous.json
    ln -sf "$(readlink latest.md)" previous.md
    ln -sf "$(readlink latest.log)" previous.log
fi

# Create new latest symlinks
ln -sf "${TIMESTAMP}.json" latest.json
ln -sf "${TIMESTAMP}.md" latest.md
ln -sf "${TIMESTAMP}.log" latest.log

cd "$TEST_DIR"

# Generate comparison report if previous exists
if [ -f "${DAILY_DIR}/previous.json" ]; then
    echo -e "${YELLOW}Generating comparison report...${NC}"
    python3 << EOF
import json
import os

latest_json = "${DAILY_DIR}/latest.json"
previous_json = "${DAILY_DIR}/previous.json"
comparison_file = "${COMPARISON_DIR}/latest_vs_previous.md"

# Read both JSON files
with open(latest_json, 'r') as f:
    latest = json.load(f)
with open(previous_json, 'r') as f:
    previous = json.load(f)

# Extract summaries
latest_summary = latest.get('summary', {})
previous_summary = previous.get('summary', {})

# Calculate differences
diff_total = latest_summary.get('total', 0) - previous_summary.get('total', 0)
diff_passed = latest_summary.get('passed', 0) - previous_summary.get('passed', 0)
diff_failed = latest_summary.get('failed', 0) - previous_summary.get('failed', 0)
diff_duration = latest.get('duration', 0) - previous.get('duration', 0)

# Get test details
latest_tests = {t['nodeid']: t for t in latest.get('tests', [])}
previous_tests = {t['nodeid']: t for t in previous.get('tests', [])}

# Find new, fixed, and broken tests
new_tests = set(latest_tests.keys()) - set(previous_tests.keys())
removed_tests = set(previous_tests.keys()) - set(latest_tests.keys())

fixed_tests = []
broken_tests = []
for test_id in set(latest_tests.keys()) & set(previous_tests.keys()):
    latest_outcome = latest_tests[test_id].get('outcome')
    previous_outcome = previous_tests[test_id].get('outcome')
    
    if previous_outcome in ['failed', 'error'] and latest_outcome == 'passed':
        fixed_tests.append(test_id)
    elif previous_outcome == 'passed' and latest_outcome in ['failed', 'error']:
        broken_tests.append(test_id)

# Write comparison report
with open(comparison_file, 'w') as f:
    f.write("# Test Comparison: Latest vs Previous\n\n")
    f.write(f"**Latest**: $TIMESTAMP\n")
    f.write(f"**Previous**: {os.path.basename(previous_json).replace('.json', '')}\n\n")
    
    f.write("## Summary Changes\n\n")
    f.write("| Metric | Previous | Latest | Change |\n")
    f.write("|--------|----------|--------|--------|\n")
    f.write(f"| Total Tests | {previous_summary.get('total', 0)} | {latest_summary.get('total', 0)} | {diff_total:+d} |\n")
    f.write(f"| Passed | {previous_summary.get('passed', 0)} | {latest_summary.get('passed', 0)} | {diff_passed:+d} |\n")
    f.write(f"| Failed | {previous_summary.get('failed', 0)} | {latest_summary.get('failed', 0)} | {diff_failed:+d} |\n")
    f.write(f"| Duration | {previous.get('duration', 0):.2f}s | {latest.get('duration', 0):.2f}s | {diff_duration:+.2f}s |\n\n")
    
    if fixed_tests:
        f.write("## 🎉 Fixed Tests\n\n")
        for test in fixed_tests:
            f.write(f"- ✅ {test}\n")
        f.write("\n")
    
    if broken_tests:
        f.write("## ⚠️ Broken Tests\n\n")
        for test in broken_tests:
            f.write(f"- ❌ {test}\n")
        f.write("\n")
    
    if new_tests:
        f.write("## 🆕 New Tests\n\n")
        for test in new_tests:
            outcome = latest_tests[test].get('outcome')
            icon = "✅" if outcome == "passed" else "❌"
            f.write(f"- {icon} {test}\n")
        f.write("\n")
    
    if removed_tests:
        f.write("## 🗑️ Removed Tests\n\n")
        for test in removed_tests:
            f.write(f"- {test}\n")

print("Comparison report created: latest_vs_previous.md")
EOF
fi

# Display summary
echo ""
echo -e "${GREEN}=== Test Run Complete ===${NC}"
echo "Results saved to:"
echo "  - JSON: ${JSON_FILE#$TEST_DIR/}"
echo "  - Summary: ${MD_FILE#$TEST_DIR/}"
echo "  - Full log: ${LOG_FILE#$TEST_DIR/}"

if [ -f "${COMPARISON_DIR}/latest_vs_previous.md" ]; then
    echo ""
    echo "Comparison report: ${COMPARISON_DIR#$TEST_DIR/}/latest_vs_previous.md"
fi

# Show quick summary
echo ""
cat "$MD_FILE" | grep -A 7 "^## Summary"

# Exit with test exit code
exit $TEST_EXIT_CODE