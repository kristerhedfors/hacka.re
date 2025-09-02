#!/usr/bin/env python3
"""
Run comprehensive tests with Groq Cloud models to identify model-specific issues.
Provides full visibility with console logging, screenshots, and detailed output.
"""

import subprocess
import sys
import os
import json
import time
from datetime import datetime
from pathlib import Path
import shutil

# Ensure we're in the correct directory
PLAYWRIGHT_DIR = Path(__file__).parent
os.chdir(PLAYWRIGHT_DIR)

# Groq-specific test configuration
GROQ_MODELS = [
    "llama-3.3-70b-versatile",  # Latest Llama model
    "llama-3.1-8b-instant",      # Fast Llama model
    "mixtral-8x7b-32768",        # Mixtral model
    "gemma2-9b-it",              # Google's Gemma model
]

# Tests to run with Groq
TEST_SUITES = {
    "core": [
        "test_page.py::test_chat_interface_elements",
        "test_api.py::test_api_key_persistence",
        "test_chat.py::test_basic_chat_functionality",
    ],
    "function_calling": [
        "test_function_icons.py::test_function_calling_icons",
        "test_function_icons.py::test_multiple_function_calls_colors",
        "test_function_group_colors.py::test_function_collection_colors",
    ],
    "modals": [
        "test_modals.py::test_settings_modal",
        "test_modals.py::test_prompts_modal",
        "test_welcome_modal.py::test_welcome_modal_basic",
    ],
}

def ensure_server():
    """Ensure the HTTP server is running."""
    print("🌐 Starting HTTP server...")
    # Go to project root to start server
    project_root = Path(__file__).parent.parent.parent
    result = subprocess.run(["./scripts/start_server.sh"], capture_output=True, text=True, cwd=project_root)
    if result.returncode == 0:
        print("✅ Server started successfully")
    else:
        print(f"⚠️ Server may already be running: {result.stderr}")
    return True

def check_groq_api_key():
    """Check if Groq API key is configured."""
    env_path = PLAYWRIGHT_DIR / ".env"
    if not env_path.exists():
        print("❌ .env file not found")
        return False
    
    with open(env_path, 'r') as f:
        env_content = f.read()
        if "GROQ_API_KEY" not in env_content:
            print("❌ GROQ_API_KEY not found in .env")
            return False
    
    # Load the key
    from dotenv import load_dotenv
    load_dotenv(env_path)
    groq_key = os.getenv("GROQ_API_KEY")
    
    if not groq_key or groq_key == "your-groq-api-key-here":
        print("❌ GROQ_API_KEY not configured properly")
        return False
    
    print(f"✅ GROQ_API_KEY found: {groq_key[:10]}...")
    return True

def create_groq_test_script(model, test_path, output_dir):
    """Create a test script that configures Groq and runs a specific test."""
    script_name = f"groq_test_{model.replace('-', '_')}_{test_path.replace('::', '_').replace('.py', '')}.py"
    script_path = output_dir / script_name
    
    script_content = f'''#!/usr/bin/env python3
"""
Groq test runner for {model} - {test_path}
"""
import os
import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright
from dotenv import load_dotenv

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

# Load environment variables
load_dotenv(Path(__file__).parent / ".env")

def run_test():
    """Run test with Groq configuration."""
    import pytest
    from test_utils import dismiss_welcome_modal, screenshot_with_markdown, enable_yolo_mode
    
    # Set environment variables for Groq
    os.environ["TEST_PROVIDER"] = "groq"
    os.environ["TEST_MODEL"] = "{model}"
    os.environ["GROQ_API_KEY"] = os.getenv("GROQ_API_KEY", "")
    
    print(f"🧪 Testing with Groq model: {model}")
    print(f"📝 Test: {test_path}")
    
    # Run the test with enhanced output
    result = pytest.main([
        "{test_path}",
        "-v", "-s",
        "--tb=short",
        "--capture=no",
        "--browser", "chromium",
        "--headed",  # Run with visible browser for debugging
    ])
    
    return result

if __name__ == "__main__":
    sys.exit(run_test())
'''
    
    with open(script_path, 'w') as f:
        f.write(script_content)
    
    os.chmod(script_path, 0o755)
    return script_path

def run_single_test_with_groq(model, test_path, output_dir):
    """Run a single test with a specific Groq model."""
    test_name = test_path.replace("::", "_").replace(".py", "")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Create output files
    output_file = output_dir / f"{model}_{test_name}_{timestamp}.txt"
    json_file = output_dir / f"{model}_{test_name}_{timestamp}.json"
    
    print(f"\n{'='*60}")
    print(f"🧪 Model: {model}")
    print(f"📝 Test: {test_path}")
    print(f"📁 Output: {output_file}")
    print(f"{'='*60}")
    
    # Create custom test command that sets up Groq
    env = os.environ.copy()
    env["GROQ_API_KEY"] = os.getenv("GROQ_API_KEY", "")
    env["TEST_PROVIDER"] = "groq"
    env["TEST_MODEL"] = model
    env["PYTEST_CURRENT_TEST"] = test_path
    
    # Build pytest command
    cmd = [
        "../../_venv/bin/python", "-m", "pytest",
        test_path,
        "-v", "-s",
        "--tb=short",
        "--browser", "chromium",
        "-o", "log_cli=true",
        "-o", "log_cli_level=INFO",
    ]
    
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
        f.write(f"Groq Model: {model}\n")
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
        "model": model,
        "test": test_path,
        "timestamp": timestamp,
        "duration": duration,
        "passed": result.returncode == 0,
        "return_code": result.returncode,
        "output_file": str(output_file),
        "stdout_lines": len(result.stdout.splitlines()),
        "stderr_lines": len(result.stderr.splitlines()),
        "errors": []
    }
    
    # Extract errors from output
    if "FAILED" in result.stdout or "ERROR" in result.stdout:
        for line in result.stdout.splitlines():
            if "AssertionError" in line or "TimeoutError" in line or "FAILED" in line:
                summary["errors"].append(line.strip())
    
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
    
    return result.returncode == 0, summary

def main():
    """Main test runner for Groq models."""
    print("🚀 Groq Cloud Test Runner with Full Visibility")
    print("="*60)
    
    # Check Groq API key
    if not check_groq_api_key():
        print("❌ Cannot proceed without GROQ_API_KEY")
        return 1
    
    # Create output directory
    output_dir = PLAYWRIGHT_DIR / "groq_test_runs" / datetime.now().strftime("%Y%m%d_%H%M%S")
    output_dir.mkdir(parents=True, exist_ok=True)
    print(f"📁 Output directory: {output_dir}")
    
    # Ensure server is running
    if not ensure_server():
        print("❌ Failed to start server")
        return 1
    
    # Track results
    all_results = {
        "models": {},
        "tests": {},
        "summary": {
            "total": 0,
            "passed": 0,
            "failed": 0,
            "errors": 0
        }
    }
    
    # Run tests for each model
    for model in GROQ_MODELS:
        print(f"\n{'='*60}")
        print(f"🎯 Testing with Groq Model: {model}")
        print(f"{'='*60}")
        
        model_results = {
            "passed": [],
            "failed": [],
            "errors": []
        }
        
        # Run each test suite
        for suite_name, tests in TEST_SUITES.items():
            print(f"\n📦 Suite: {suite_name}")
            
            for test_path in tests:
                try:
                    passed, summary = run_single_test_with_groq(model, test_path, output_dir)
                    all_results["summary"]["total"] += 1
                    
                    if passed:
                        model_results["passed"].append(test_path)
                        all_results["summary"]["passed"] += 1
                    else:
                        model_results["failed"].append(test_path)
                        all_results["summary"]["failed"] += 1
                        
                    # Track by test
                    if test_path not in all_results["tests"]:
                        all_results["tests"][test_path] = {}
                    all_results["tests"][test_path][model] = passed
                    
                except Exception as e:
                    print(f"❌ Error running {test_path}: {e}")
                    model_results["errors"].append(test_path)
                    all_results["summary"]["errors"] += 1
        
        all_results["models"][model] = model_results
    
    # Print comprehensive summary
    print("\n" + "="*60)
    print("📊 COMPREHENSIVE SUMMARY")
    print("="*60)
    
    # Overall stats
    print(f"\n📈 Overall Statistics:")
    print(f"  Total Tests Run: {all_results['summary']['total']}")
    print(f"  ✅ Passed: {all_results['summary']['passed']}")
    print(f"  ❌ Failed: {all_results['summary']['failed']}")
    print(f"  ⚠️ Errors: {all_results['summary']['errors']}")
    
    # Model-by-model summary
    print(f"\n🤖 Model Performance:")
    for model, results in all_results["models"].items():
        total = len(results["passed"]) + len(results["failed"]) + len(results["errors"])
        pass_rate = (len(results["passed"]) / total * 100) if total > 0 else 0
        print(f"\n  {model}:")
        print(f"    Pass Rate: {pass_rate:.1f}%")
        print(f"    ✅ Passed: {len(results['passed'])}")
        print(f"    ❌ Failed: {len(results['failed'])}")
        if results["failed"]:
            for test in results["failed"]:
                print(f"      - {test}")
    
    # Test-by-test comparison
    print(f"\n🔍 Test Compatibility Matrix:")
    print(f"{'Test':<50} | " + " | ".join([m[:8] for m in GROQ_MODELS]))
    print("-" * (52 + len(GROQ_MODELS) * 11))
    
    for test_path in sorted(all_results["tests"].keys()):
        row = f"{test_path:<50} | "
        for model in GROQ_MODELS:
            if model in all_results["tests"][test_path]:
                status = "✅" if all_results["tests"][test_path][model] else "❌"
            else:
                status = "⚠️"
            row += f"{status:^9} | "
        print(row)
    
    # Save comprehensive summary
    summary_file = output_dir / "groq_test_summary.json"
    with open(summary_file, 'w') as f:
        json.dump(all_results, f, indent=2)
    print(f"\n📝 Full summary saved to: {summary_file}")
    
    # Save markdown report
    report_file = output_dir / "groq_test_report.md"
    with open(report_file, 'w') as f:
        f.write("# Groq Cloud Test Report\n\n")
        f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        
        f.write("## Summary\n\n")
        f.write(f"- Total Tests: {all_results['summary']['total']}\n")
        f.write(f"- Passed: {all_results['summary']['passed']}\n")
        f.write(f"- Failed: {all_results['summary']['failed']}\n")
        f.write(f"- Errors: {all_results['summary']['errors']}\n\n")
        
        f.write("## Model Performance\n\n")
        for model, results in all_results["models"].items():
            f.write(f"### {model}\n\n")
            f.write(f"- Passed: {len(results['passed'])}\n")
            f.write(f"- Failed: {len(results['failed'])}\n")
            if results["failed"]:
                f.write("\nFailed Tests:\n")
                for test in results["failed"]:
                    f.write(f"- `{test}`\n")
            f.write("\n")
    
    print(f"📄 Markdown report saved to: {report_file}")
    
    # Return appropriate exit code
    return 0 if all_results["summary"]["failed"] == 0 and all_results["summary"]["errors"] == 0 else 1

if __name__ == "__main__":
    sys.exit(main())