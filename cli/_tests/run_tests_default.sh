#!/bin/bash

# Default test runner - Fast and reliable
# Runs all CLI tests with sensible defaults

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}Running CLI Test Suite${NC}"
echo "========================"
echo

# Activate virtual environment
source .venv/bin/activate

# Run all tests with reasonable settings
# - Exclude slow/interactive tests by default
# - Show progress but not too verbose
# - Stop on first failure for quick feedback
python -m pytest \
    test_cli_*.py \
    -v \
    --tb=short \
    -x \
    -k "not (browse_with_session or serve_with_session or chat_with_session)" \
    --json-report \
    --json-report-file=test_results.json

# Show summary
echo
if [ -f test_results.json ]; then
    echo -e "${GREEN}Test Summary:${NC}"
    python -c "
import json
data = json.load(open('test_results.json'))
summary = data.get('summary', {})
print(f\"  Total: {summary.get('total', 0)}\")
print(f\"  Passed: {summary.get('passed', 0)}\")
print(f\"  Failed: {summary.get('failed', 0)}\")
print(f\"  Skipped: {summary.get('skipped', 0)}\")
print(f\"  Duration: {data.get('duration', 0):.2f}s\")
"
fi

echo
echo -e "${YELLOW}For detailed output, run: ./run_tests_with_logging.sh${NC}"
echo -e "${YELLOW}For all tests including slow ones, run: ./run_all_tests_smooth.sh${NC}"