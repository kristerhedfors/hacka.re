#!/usr/bin/env python3
"""
Enhanced test runner with full visibility for debugging test failures.
Captures console logs, screenshots, and provides detailed output for each test.
"""

import subprocess
import sys
import os
import json
import time
from datetime import datetime
from pathlib import Path

# Ensure we're in the correct directory
PLAYWRIGHT_DIR = Path(__file__).parent
os.chdir(PLAYWRIGHT_DIR)

# List of tests we've fixed
FIXED_TESTS = [
    "test_debug_mode.py::test_debug_mode_checkbox_exists",
    "test_default_prompts.py::test_default_prompts_content",
    "test_default_prompts.py::test_default_prompts_selection",
    "test_function_group_colors.py::test_function_collection_colors",
    "test_function_icons.py::test_function_calling_icons",
    "test_function_icons.py::test_multiple_function_calls_colors",
]

def ensure_server():
    """Ensure the HTTP server is running."""
    print("🌐 Starting HTTP server...")
    result = subprocess.run(["./start_server.sh"], capture_output=True, text=True)
    if result.returncode == 0:
        print("✅ Server started successfully")
    else:
        print(f"⚠️ Server may already be running: {result.stderr}")
    return True

def run_single_test(test_path, output_dir):
    """Run a single test with full output capture."""
    test_name = test_path.replace("::", "_").replace(".py", "")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Create output files
    output_file = output_dir / f"{test_name}_{timestamp}.txt"
    json_file = output_dir / f"{test_name}_{timestamp}.json"
    
    print(f"\n{'='*60}")
    print(f"🧪 Running: {test_path}")
    print(f"📝 Output: {output_file}")
    print(f"{'='*60}")
    
    # Run the test with maximum verbosity
    cmd = [
        "../../_venv/bin/python", "-m", "pytest",
        test_path,
        "-v", "-s",
        "--tb=short",
        "--browser", "chromium"
        # Don't specify headed/headless - let default apply
    ]
    
    # Set environment variables
    env = os.environ.copy()
    env["PYTEST_CURRENT_TEST"] = test_path
    
    # Run the test
    start_time = time.time()
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        env=env
    )
    duration = time.time() - start_time
    
    # Save output
    with open(output_file, 'w') as f:
        f.write(f"Test: {test_path}\n")
        f.write(f"Duration: {duration:.2f} seconds\n")
        f.write(f"Return code: {result.returncode}\n")
        f.write("="*60 + "\n")
        f.write("STDOUT:\n")
        f.write(result.stdout)
        f.write("\n" + "="*60 + "\n")
        f.write("STDERR:\n")
        f.write(result.stderr)
    
    # Save JSON summary
    summary = {
        "test": test_path,
        "timestamp": timestamp,
        "duration": duration,
        "passed": result.returncode == 0,
        "return_code": result.returncode,
        "output_file": str(output_file),
        "stdout_lines": len(result.stdout.splitlines()),
        "stderr_lines": len(result.stderr.splitlines())
    }
    
    with open(json_file, 'w') as f:
        json.dump(summary, f, indent=2)
    
    # Print summary
    if result.returncode == 0:
        print(f"✅ PASSED in {duration:.2f}s")
    else:
        print(f"❌ FAILED in {duration:.2f}s")
        # Print last 20 lines of output for quick debugging
        print("\n📋 Last 20 lines of output:")
        print("-"*40)
        lines = result.stdout.splitlines()
        for line in lines[-20:]:
            print(line)
    
    return result.returncode == 0

def main():
    """Main test runner."""
    print("🚀 Enhanced Test Runner with Full Visibility")
    print("="*60)
    
    # Create output directory
    output_dir = PLAYWRIGHT_DIR / "test_runs" / datetime.now().strftime("%Y%m%d_%H%M%S")
    output_dir.mkdir(parents=True, exist_ok=True)
    print(f"📁 Output directory: {output_dir}")
    
    # Ensure server is running
    if not ensure_server():
        print("❌ Failed to start server")
        return 1
    
    # Track results
    results = {
        "passed": [],
        "failed": [],
        "errors": []
    }
    
    # Run each test
    for test_path in FIXED_TESTS:
        try:
            passed = run_single_test(test_path, output_dir)
            if passed:
                results["passed"].append(test_path)
            else:
                results["failed"].append(test_path)
        except Exception as e:
            print(f"❌ Error running {test_path}: {e}")
            results["errors"].append(test_path)
    
    # Print summary
    print("\n" + "="*60)
    print("📊 SUMMARY")
    print("="*60)
    print(f"✅ Passed: {len(results['passed'])}")
    for test in results["passed"]:
        print(f"   - {test}")
    
    print(f"\n❌ Failed: {len(results['failed'])}")
    for test in results["failed"]:
        print(f"   - {test}")
    
    if results["errors"]:
        print(f"\n⚠️ Errors: {len(results['errors'])}")
        for test in results["errors"]:
            print(f"   - {test}")
    
    # Save summary
    summary_file = output_dir / "summary.json"
    with open(summary_file, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"\n📝 Summary saved to: {summary_file}")
    
    # Return appropriate exit code
    return 0 if not results["failed"] and not results["errors"] else 1

if __name__ == "__main__":
    sys.exit(main())