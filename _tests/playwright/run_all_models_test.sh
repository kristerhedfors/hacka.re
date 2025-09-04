#!/bin/bash

# Comprehensive test runner for ALL chat models across all providers
# This will test function calling capabilities systematically

set -e

# Change to project root
cd "$(dirname "$0")/../.."

echo "========================================="
echo "COMPREHENSIVE FUNCTION CALLING TEST"
echo "Testing ALL Chat Models Across Providers"
echo "========================================="
echo ""

# Ensure virtual environment is activated
if [ ! -d "_venv" ]; then
    echo "Setting up environment..."
    ./setup_environment.sh
fi

# Parse command line arguments
PROVIDER=""
QUICK_MODE=""
OUTPUT_FILE="function_calling_results.json"

while [[ $# -gt 0 ]]; do
    case $1 in
        --groq)
            PROVIDER="groq"
            shift
            ;;
        --berget)
            PROVIDER="berget"  
            shift
            ;;
        --openai)
            PROVIDER="openai"
            shift
            ;;
        --quick)
            QUICK_MODE="--maxfail=3"
            shift
            ;;
        --output)
            OUTPUT_FILE="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --groq        Test only Groq models"
            echo "  --berget      Test only Berget models"
            echo "  --openai      Test only OpenAI models"
            echo "  --quick       Stop after 3 failures"
            echo "  --output FILE Save results to FILE"
            echo "  --help        Show this help message"
            echo ""
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Check server
if ! lsof -i:8000 > /dev/null 2>&1; then
    echo "Starting HTTP server..."
    ./scripts/start_server.sh
    sleep 2
fi

echo ""
echo "Testing Configuration:"
echo "----------------------"

# Count models to test
if [ -z "$PROVIDER" ]; then
    echo "Providers: ALL (Groq, Berget, OpenAI)"
    TOTAL_MODELS=59  # 15 Groq + 9 Berget + 35 OpenAI (approximate)
else
    echo "Provider: $PROVIDER"
    case $PROVIDER in
        groq) TOTAL_MODELS=15 ;;
        berget) TOTAL_MODELS=9 ;;
        openai) TOTAL_MODELS=35 ;;
    esac
fi

echo "Estimated models to test: ~$TOTAL_MODELS"
echo "Output file: $OUTPUT_FILE"
echo ""

# Build pytest command
PYTEST_CMD="_venv/bin/../../_venv/bin/python -m pytest _tests/playwright/test_all_models_function_calling.py"

# Add provider filter if specified
if [ ! -z "$PROVIDER" ]; then
    PYTEST_CMD="$PYTEST_CMD -k test_${PROVIDER}_models"
fi

# Add other options
PYTEST_CMD="$PYTEST_CMD -v --tb=line $QUICK_MODE"

echo "Starting tests..."
echo "Command: $PYTEST_CMD"
echo "========================================="
echo ""

# Run tests and capture output
set +e
$PYTEST_CMD 2>&1 | tee test_output.log
TEST_EXIT_CODE=$?
set -e

echo ""
echo "========================================="
echo "Generating compatibility report..."

# Parse results and generate report
_venv/bin/python -c "
import re
import json
import time

# Parse test output
results = {'providers': {}, 'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')}
current_provider = None

with open('test_output.log', 'r') as f:
    lines = f.readlines()
    
for line in lines:
    # Look for test results
    if 'Groq/' in line or 'Berget/' in line or 'OpenAI/' in line:
        parts = line.split('/')
        if len(parts) >= 2:
            provider = parts[0].split()[-1].lower()
            model_info = parts[1].strip()
            
            # Extract model name and result
            if ':' in model_info:
                model, rest = model_info.split(':', 1)
                success = '✓' in rest
                
                if provider not in results['providers']:
                    results['providers'][provider] = {'working': [], 'failed': []}
                
                if success:
                    results['providers'][provider]['working'].append(model)
                else:
                    results['providers'][provider]['failed'].append(model)

# Save JSON results
with open('$OUTPUT_FILE', 'w') as f:
    json.dump(results, f, indent=2)

# Print summary
print('')
print('='*60)
print('FUNCTION CALLING COMPATIBILITY SUMMARY')
print('='*60)

for provider, models in results['providers'].items():
    working = len(models.get('working', []))
    failed = len(models.get('failed', []))
    total = working + failed
    
    print(f'\n{provider.upper()} ({working}/{total} working):')
    
    if models.get('working'):
        print('  ✅ Working models:')
        for model in models['working'][:5]:
            print(f'    • {model}')
        if len(models['working']) > 5:
            print(f'    • ... and {len(models["working"]) - 5} more')
    
    if models.get('failed'):
        print('  ❌ Failed models:')
        for model in models['failed'][:3]:
            print(f'    • {model}')
        if len(models['failed']) > 3:
            print(f'    • ... and {len(models["failed"]) - 3} more')

print('')
print('='*60)
print(f'Full results saved to: $OUTPUT_FILE')
"

# Cleanup
rm -f test_output.log

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ All tests completed successfully!"
else
    echo "⚠️ Some tests failed or were skipped. Check results above."
fi

echo "========================================="
exit $TEST_EXIT_CODE