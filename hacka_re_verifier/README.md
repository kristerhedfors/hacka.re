# hacka.re Verifier

A comprehensive verification tool for validating the privacy and security claims of the [hacka.re](https://hacka.re) project.

## Overview

The hacka.re Verifier is a specialized tool designed to analyze and verify the privacy and security features of the hacka.re web client. It performs a series of automated checks across multiple dimensions to ensure that the project adheres to its stated privacy-focused principles.

## Features

- **Static Analysis**: Examines JavaScript code for security vulnerabilities, privacy leaks, and best practices
- **Network Analysis**: Monitors network traffic to detect any unauthorized external calls
- **Cryptographic Audit**: Verifies the implementation of cryptographic functions
- **Storage Analysis**: Checks browser storage usage for secure data handling
- **Dependency Verification**: Analyzes external dependencies for security risks
- **Report Generation**: Creates comprehensive HTML, JSON, Markdown, or PDF reports

## Installation

### Prerequisites

- Python 3.8 or higher
- Playwright for browser-based tests

### Install from Source

```bash
# Clone the repository
git clone https://github.com/hacka-re/verifier.git
cd verifier

# Install the package in development mode
pip install -e .

# Install Playwright browsers
python -m playwright install
```

### Install from PyPI

```bash
pip install hacka-re-verifier
python -m playwright install
```

## Usage

### Command Line Interface

The verifier can be run from the command line:

```bash
# Basic usage
hacka-re-verifier --path /path/to/hacka.re

# Run specific modules
hacka-re-verifier --path /path/to/hacka.re --modules static_analysis,network_analysis

# Generate a specific report format
hacka-re-verifier --path /path/to/hacka.re --report-format json

# Run in headless mode
hacka-re-verifier --path /path/to/hacka.re --headless

# For more options
hacka-re-verifier --help
```

### Available Options

```
--path PATH           Path to the hacka.re project (required)
--config CONFIG       Path to a custom configuration file
--modules MODULES     Comma-separated list of modules to run (default: all)
--report-format {html,json,markdown,pdf}
                      Report format (default: html)
--output-dir OUTPUT_DIR
                      Output directory for reports (default: ./reports)
--log-level {debug,info,warning,error,critical}
                      Logging level (default: info)
--headless            Run browser tests in headless mode
--browser {chromium,firefox,webkit}
                      Browser to use for tests (default: chromium)
--timeout TIMEOUT     Timeout in seconds for browser operations (default: 30)
--verbose             Enable verbose output
```

### Programmatic Usage

You can also use the verifier programmatically in your Python code:

```python
from hacka_re_verifier.src import Config
from hacka_re_verifier.src.static_analysis import StaticAnalyzer
from hacka_re_verifier.src.network_analysis import NetworkMonitor
from hacka_re_verifier.src.crypto_audit import CryptoAuditor
from hacka_re_verifier.src.storage_analysis import StorageChecker
from hacka_re_verifier.src.dependency_verification import DependencyChecker
from hacka_re_verifier.src.report_generation import ReportGenerator

# Path to the hacka.re project
project_path = '/path/to/hacka.re'

# Create a configuration
config = Config()
config.set('project_path', project_path)
config.set('output_dir', 'custom_reports')
config.set('report_format', 'html')

# Customize configuration
config.set('modules.static_analysis.exclude_dirs', ['node_modules', 'dist', 'build'])
config.set('modules.network_analysis.headless', True)

# Run specific modules
results = {}

# Run static analysis
static_analyzer = StaticAnalyzer(config)
results['static_analysis'] = static_analyzer.analyze(project_path)

# Run network analysis
network_monitor = NetworkMonitor(config)
results['network_analysis'] = network_monitor.analyze(project_path)

# Generate report
report_generator = ReportGenerator(config)
report_path = report_generator.generate(results)

print(f"Report generated: {report_path}")
```

See the `examples/programmatic_usage.py` file for a complete example.

## Configuration

The verifier can be configured using a JSON or YAML configuration file:

```bash
hacka-re-verifier --path /path/to/hacka.re --config my_config.json
```

### Example Configuration (JSON)

```json
{
  "output_dir": "custom_reports",
  "report_format": "html",
  "log_level": "info",
  "timeout": 30,
  "modules": {
    "static_analysis": {
      "enabled": true,
      "exclude_dirs": ["node_modules", "dist", "build", "_venv", "lib"]
    },
    "network_analysis": {
      "enabled": true,
      "headless": true,
      "browser": "chromium"
    },
    "crypto_audit": {
      "enabled": true
    },
    "storage_analysis": {
      "enabled": true,
      "headless": true,
      "browser": "chromium"
    },
    "dependency_verification": {
      "enabled": true
    },
    "report_generation": {
      "enabled": true
    }
  }
}
```

### Example Configuration (YAML)

```yaml
output_dir: custom_reports
report_format: html
log_level: info
timeout: 30
modules:
  static_analysis:
    enabled: true
    exclude_dirs:
      - node_modules
      - dist
      - build
      - _venv
      - lib
  network_analysis:
    enabled: true
    headless: true
    browser: chromium
  crypto_audit:
    enabled: true
  storage_analysis:
    enabled: true
    headless: true
    browser: chromium
  dependency_verification:
    enabled: true
  report_generation:
    enabled: true
```

## Modules and Implementation Status

### Static Analysis

The static analysis module examines JavaScript code for security vulnerabilities, privacy leaks, and best practices.

**Features and Implementation Status:**

| Feature | Status | Description |
|---------|--------|-------------|
| JavaScript Code Analysis | ✅ Implemented | Parses and analyzes JavaScript code using esprima with improved AST traversal |
| HTML Analysis | ✅ Implemented | Examines HTML files for script and link tags, excludes test files |
| CSS Analysis | ✅ Implemented | Checks CSS files for external resources |
| Eval Usage Detection | ✅ Implemented | Identifies potentially dangerous eval() calls via AST analysis |
| External API Call Detection | ✅ Implemented | Finds calls to external APIs and services with context filtering |
| Hardcoded Secrets Detection | ✅ Implemented | Locates hardcoded API keys and secrets |
| Pattern Matching | ✅ Implemented | Uses regex patterns with confidence scoring |
| Security Scoring | ✅ Implemented | Calculates weighted security score based on findings and confidence |
| Recommendation Generation | ✅ Implemented | Provides actionable recommendations |
| Error Handling | ✅ Implemented | Graceful handling of JavaScript parsing failures |
| False Positive Filtering | ✅ Implemented | Context-aware filtering to reduce irrelevant warnings |

### Network Analysis

The network analysis module monitors network traffic to verify data privacy claims.

**Features and Implementation Status:**

| Feature | Status | Description |
|---------|--------|-------------|
| Browser Automation | ✅ Implemented | Uses Playwright to automate browser interactions |
| Network Request Monitoring | ✅ Implemented | Captures and analyzes all network requests |
| Domain Allowlist/Blocklist | ✅ Implemented | Checks requests against allowed/blocked domains |
| API Key Leak Detection | ✅ Implemented | Detects API keys in URLs and headers |
| Test Scenarios | ✅ Implemented | Includes page load, API key entry, chat message, settings change, and function calling scenarios |
| Privacy Scoring | ✅ Implemented | Calculates a privacy score based on findings |
| Screenshot Capture | ✅ Implemented | Takes screenshots for visual verification |
| Recommendation Generation | ✅ Implemented | Provides actionable recommendations |

### Cryptographic Audit

The cryptographic audit module verifies the correctness of cryptographic operations.

**Features and Implementation Status:**

| Feature | Status | Description |
|---------|--------|-------------|
| Crypto Function Detection | ✅ Implemented | Identifies cryptographic functions in code |
| Weak Key Size Detection | ✅ Implemented | Checks for insufficient key sizes |
| Insecure Random Detection | ✅ Implemented | Identifies insecure random number generation |
| Hardcoded Secret Detection | ✅ Implemented | Finds hardcoded cryptographic secrets |
| Key Derivation Analysis | ✅ Implemented | Verifies proper key derivation practices |
| Encryption Mode Analysis | ✅ Implemented | Checks for secure encryption modes |
| Unauthenticated Encryption Detection | ✅ Implemented | Identifies encryption without authentication |
| Crypto Scoring | ✅ Implemented | Calculates a cryptographic score based on findings |
| Recommendation Generation | ✅ Implemented | Provides actionable recommendations |

### Storage Analysis

The storage analysis module examines browser storage usage for secure data handling.

**Features and Implementation Status:**

| Feature | Status | Description |
|---------|--------|-------------|
| Browser Automation | ✅ Implemented | Uses Playwright to automate browser interactions |
| LocalStorage Analysis | ✅ Implemented | Examines localStorage for sensitive data |
| Encryption Detection | ✅ Implemented | Determines if stored data is encrypted |
| API Key Storage Analysis | ✅ Implemented | Checks how API keys are stored |
| Conversation History Analysis | ✅ Implemented | Examines storage of conversation history |
| Settings Persistence Analysis | ✅ Implemented | Checks how settings are stored |
| Namespace Isolation Analysis | ✅ Implemented | Verifies proper data isolation |
| Storage Scoring | ✅ Implemented | Calculates a storage security score based on findings |
| Screenshot Capture | ✅ Implemented | Takes screenshots for visual verification |
| Recommendation Generation | ✅ Implemented | Provides actionable recommendations |

### Dependency Verification

The dependency verification module analyzes external dependencies for security risks.

**Features and Implementation Status:**

| Feature | Status | Description |
|---------|--------|-------------|
| HTML Dependency Analysis | ✅ Implemented | Identifies script and link tags in HTML files |
| Local vs External Detection | ✅ Implemented | Distinguishes between local and external dependencies |
| Missing Dependency Detection | ✅ Implemented | Identifies referenced but missing dependencies |
| External Request Detection | ✅ Implemented | Finds external requests in JavaScript files |
| Library Integrity Checking | ✅ Implemented | Calculates file hashes for integrity verification |
| Vulnerability Detection | ✅ Implemented | Checks for known vulnerable versions |
| Suspicious Minified File Detection | ✅ Implemented | Identifies potentially tampered minified files |
| Dependency Scoring | ✅ Implemented | Calculates a dependency score based on findings |
| Recommendation Generation | ✅ Implemented | Provides actionable recommendations |

### Report Generation

The report generation module creates comprehensive reports with findings and recommendations.

**Features and Implementation Status:**

| Feature | Status | Description |
|---------|--------|-------------|
| HTML Report Generation | ✅ Implemented | Creates detailed HTML reports |
| JSON Report Generation | ✅ Implemented | Generates structured JSON reports |
| Markdown Report Generation | ✅ Implemented | Produces Markdown reports |
| PDF Report Generation | ✅ Implemented | Converts HTML reports to PDF (requires weasyprint) |
| Score Visualization | ✅ Implemented | Generates charts showing scores across modules |
| Key Findings Extraction | ✅ Implemented | Highlights the most important findings |
| Top Recommendations | ✅ Implemented | Prioritizes the most critical recommendations |
| Template Customization | ✅ Implemented | Supports customizable report templates |

## Development

### Project Structure

```
hacka_re_verifier/
├── bin/
│   └── hacka-re-verifier       # Command-line entry point
├── examples/
│   ├── config.json             # Example JSON configuration
│   ├── config.yaml             # Example YAML configuration
│   └── programmatic_usage.py   # Example programmatic usage
├── src/
│   ├── __init__.py
│   ├── config.py               # Configuration handling
│   ├── main.py                 # Main entry point
│   ├── crypto_audit/           # Cryptographic audit module
│   ├── dependency_verification/# Dependency verification module
│   ├── network_analysis/       # Network analysis module
│   ├── report_generation/      # Report generation module
│   ├── static_analysis/        # Static analysis module
│   └── storage_analysis/       # Storage analysis module
└── tests/                      # Unit tests
```

### Running Tests

```bash
# Run all tests
python -m unittest discover tests

# Run specific test
python -m unittest tests.test_config
```

### Building the Package

```bash
# Install build dependencies
pip install build

# Build the package
python -m build
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
