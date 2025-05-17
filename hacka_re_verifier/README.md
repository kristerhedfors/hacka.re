# hacka.re Verifier

A Python-based verification tool for auditing the privacy and security claims of the hacka.re project.

## Overview

The hacka.re Verifier is a comprehensive tool designed to analyze and verify the privacy and security claims of the hacka.re web client. It performs a series of automated checks across multiple dimensions:

1. **Static Analysis**: Examines JavaScript, HTML, and CSS code for security patterns and anti-patterns.
2. **Network Analysis**: Monitors network requests to verify that no tracking or external calls are made.
3. **Cryptographic Audit**: Verifies the correctness of cryptographic operations used for data protection.
4. **Storage Analysis**: Analyzes browser storage usage to ensure sensitive data is properly encrypted.
5. **Dependency Verification**: Checks that all dependencies are hosted locally and free from vulnerabilities.

The tool generates detailed reports with findings and recommendations to help maintain the privacy-focused nature of the hacka.re project.

## Installation

### Prerequisites

- Python 3.8 or higher
- pip (Python package installer)
- A local copy of the hacka.re project

### Install from Source

1. Clone this repository:
   ```
   git clone https://github.com/hacka-re/verifier.git
   cd verifier
   ```

2. Install the package and its dependencies:
   ```
   pip install -e .
   ```

3. Install Playwright browsers:
   ```
   playwright install
   ```

### Optional Dependencies

For PDF report generation:
```
pip install weasyprint
```

## Usage

### Basic Usage

Run the verifier on a local copy of the hacka.re project:

```
hacka-re-verifier --path /path/to/hacka.re
```

This will run all verification modules and generate an HTML report in the `reports` directory.

### Command Line Options

```
hacka-re-verifier --help
```

```
usage: hacka-re-verifier [-h] --path PATH [--config CONFIG] [--modules MODULES]
                        [--report-format {html,json,markdown,pdf}]
                        [--output-dir OUTPUT_DIR]
                        [--log-level {debug,info,warning,error,critical}]
                        [--headless] [--browser {chromium,firefox,webkit}]
                        [--timeout TIMEOUT] [--verbose]

Verify privacy and security claims of the hacka.re project

options:
  -h, --help            show this help message and exit
  --path PATH           Path to the hacka.re project
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

### Examples

Run only specific modules:
```
hacka-re-verifier --path /path/to/hacka.re --modules static_analysis,network_analysis
```

Generate a JSON report:
```
hacka-re-verifier --path /path/to/hacka.re --report-format json
```

Use a custom configuration file:
```
hacka-re-verifier --path /path/to/hacka.re --config custom_config.yaml
```

Run with verbose output:
```
hacka-re-verifier --path /path/to/hacka.re --verbose
```

## Configuration

The verifier can be customized using a YAML or JSON configuration file. Here's an example configuration:

```yaml
project_path: /path/to/hacka.re
output_dir: reports
report_format: html
log_level: info
timeout: 30
modules:
  static_analysis:
    enabled: true
    files_to_analyze:
      - "*.js"
      - "*.html"
      - "*.css"
    exclude_dirs:
      - node_modules
      - dist
      - build
      - _venv
  network_analysis:
    enabled: true
    allowed_domains:
      - api.groq.com
      - api.openai.com
      - localhost
      - 127.0.0.1
    blocked_domains:
      - google-analytics.com
      - googletagmanager.com
      # ... more domains
  # ... other modules
```

## Report Interpretation

The generated reports include:

- An executive summary with overall scores
- Key findings highlighting the most important issues
- Detailed analysis of each verification module
- Specific issues found, categorized by severity
- Recommendations for addressing identified issues
- Visual charts and graphs for easy interpretation

## Development

### Setting Up a Development Environment

1. Clone the repository
2. Install development dependencies:
   ```
   pip install -e ".[dev]"
   ```
3. Install pre-commit hooks:
   ```
   pre-commit install
   ```

### Running Tests

```
pytest
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgements

- The hacka.re team for creating a privacy-focused web client
- All the open-source libraries used in this project
