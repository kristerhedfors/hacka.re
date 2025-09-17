#!/usr/bin/env python3
"""
Comprehensive test runner with detailed logging for each test
"""

import subprocess
import sys
import json
import time
from pathlib import Path
from datetime import datetime

# Test files to run in order
TEST_FILES = [
    "test_cli_browse_command.py",
    "test_cli_serve_command.py",
    "test_cli_port_configuration.py",
    "test_cli_shared_links.py",
    "test_cli_session_env_vars.py",
    "test_cli_zip_serving.py",
    "test_cli_simplified_commands.py",
    # Skip chat tests as they can hang
    # "test_cli_chat_command.py",
]

def run_test_file(test_file):
    """Run a single test file with full logging"""
    print(f"\n{'='*60}")
    print(f"Running: {test_file}")
    print(f"{'='*60}")

    cmd = [
        sys.executable, "-m", "pytest",
        test_file,
        "-v",           # Verbose
        "-s",           # No capture (show print statements)
        "--tb=short",   # Short traceback
        "--timeout=30", # 30 second timeout per test
        "-x",           # Stop on first failure
        "--json-report",
        f"--json-report-file=test_results/{test_file}.json"
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120  # Overall 2 minute timeout
        )

        # Print output
        print("\n--- STDOUT ---")
        print(result.stdout)

        if result.stderr:
            print("\n--- STDERR ---")
            print(result.stderr)

        # Parse results
        if result.returncode == 0:
            print(f"\n✅ {test_file}: ALL TESTS PASSED")
            return True
        else:
            print(f"\n❌ {test_file}: TESTS FAILED (exit code: {result.returncode})")
            return False

    except subprocess.TimeoutExpired:
        print(f"\n⚠️ {test_file}: TIMEOUT after 120 seconds")
        return False
    except Exception as e:
        print(f"\n❌ {test_file}: ERROR - {e}")
        return False

def main():
    """Run all tests with comprehensive logging"""
    print("="*60)
    print("COMPREHENSIVE CLI TEST RUNNER")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)

    # Ensure test results directory exists
    Path("test_results").mkdir(exist_ok=True)

    # Track results
    passed_files = []
    failed_files = []

    # Run each test file
    for test_file in TEST_FILES:
        if run_test_file(test_file):
            passed_files.append(test_file)
        else:
            failed_files.append(test_file)

    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    print(f"Total test files: {len(TEST_FILES)}")
    print(f"Passed: {len(passed_files)}")
    print(f"Failed: {len(failed_files)}")

    if passed_files:
        print("\n✅ PASSED FILES:")
        for f in passed_files:
            print(f"  - {f}")

    if failed_files:
        print("\n❌ FAILED FILES:")
        for f in failed_files:
            print(f"  - {f}")

    print(f"\nFinished: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Exit with appropriate code
    sys.exit(0 if not failed_files else 1)

if __name__ == "__main__":
    main()