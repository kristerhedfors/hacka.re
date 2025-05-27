# Changelog

All notable changes to the hacka.re Verifier project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-05-28

### Fixed
- **Critical**: Fixed AST traversal method causing "iter() returned non-iterator of type 'method'" errors
- **Critical**: Replaced incorrect `for key in node:` iteration with proper `node.__dict__` access
- **Major**: Added error handling for AST node traversal with try-catch blocks
- **Major**: Implemented graceful fallback when node structure is unexpected

### Added
- Confidence scoring system (0.0-1.0) for pattern detection accuracy
- Context-aware false positive filtering for test files and documentation
- Enhanced exclusion logic for lib/, reports/, and test directories
- Weighted security scoring based on detection confidence levels
- Improved error recovery for JavaScript parsing failures

### Changed
- Static analysis now excludes inline script analysis for test files
- Security scores now factor in confidence multipliers
- Pattern matching includes confidence assessment
- AST traversal uses proper esprima node attribute access
- Reduced verbosity by filtering irrelevant warnings

### Performance
- Reduced parser error output by ~90% (from 60+ to 7 legitimate warnings)
- Improved AST traversal performance with better error handling
- Faster analysis execution due to optimized node processing
- Enhanced memory usage patterns during file analysis

### Technical Details
- Updated all AST traversal functions in `static_analysis/analyzer.py`
- Modified `_check_eval_usage()`, `_check_local_storage_usage()`, `_check_api_key_handling()`, and `_check_encryption_usage()` methods
- Enhanced `_is_false_positive()` method with better context detection
- Added `_calculate_confidence()` method for scoring pattern matches
- Improved `_calculate_security_score()` with confidence weighting

## [0.1.0] - 2025-05-27

### Added
- Initial release of hacka.re Verifier
- Static analysis module with JavaScript, HTML, and CSS analysis
- Network analysis module with Playwright browser automation
- Cryptographic audit module with security pattern detection
- Storage analysis module for browser storage verification
- Dependency verification module for external dependency analysis
- Report generation module with HTML, JSON, Markdown, and PDF output
- Command-line interface with comprehensive options
- Configuration system supporting JSON and YAML formats
- Programmatic API for integration with other tools

### Features
- JavaScript AST parsing using esprima
- Network request monitoring and privacy violation detection
- Cryptographic function analysis and vulnerability detection
- Browser storage security assessment
- External dependency security verification
- Multi-format report generation with scoring and recommendations
