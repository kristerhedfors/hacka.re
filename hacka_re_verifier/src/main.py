#!/usr/bin/env python3
"""
Main entry point for the hacka.re verifier tool.
"""

import os
import sys
import argparse
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional

from .config import Config
from .static_analysis.analyzer import StaticAnalyzer
from .network_analysis.monitor import NetworkMonitor
from .crypto_audit.auditor import CryptoAuditor
from .storage_analysis.storage_checker import StorageChecker
from .dependency_verification.dependency_checker import DependencyChecker
from .report_generation.report_generator import ReportGenerator


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('hacka_re_verifier.log')
    ]
)
logger = logging.getLogger('hacka_re_verifier')


def parse_args() -> argparse.Namespace:
    """
    Parse command line arguments.
    
    Returns:
        Parsed arguments
    """
    parser = argparse.ArgumentParser(
        description='Verify privacy and security claims of the hacka.re project'
    )
    
    parser.add_argument(
        '--path',
        type=str,
        help='Path to the hacka.re project',
        required=True
    )
    
    parser.add_argument(
        '--config',
        type=str,
        help='Path to a custom configuration file',
        default=None
    )
    
    parser.add_argument(
        '--modules',
        type=str,
        help='Comma-separated list of modules to run (default: all)',
        default='all'
    )
    
    parser.add_argument(
        '--report-format',
        type=str,
        choices=['html', 'json', 'markdown', 'pdf'],
        help='Report format (default: html)',
        default='html'
    )
    
    parser.add_argument(
        '--output-dir',
        type=str,
        help='Output directory for reports (default: ./reports)',
        default='./reports'
    )
    
    parser.add_argument(
        '--log-level',
        type=str,
        choices=['debug', 'info', 'warning', 'error', 'critical'],
        help='Logging level (default: info)',
        default='info'
    )
    
    parser.add_argument(
        '--headless',
        action='store_true',
        help='Run browser tests in headless mode'
    )
    
    parser.add_argument(
        '--browser',
        type=str,
        choices=['chromium', 'firefox', 'webkit'],
        help='Browser to use for tests (default: chromium)',
        default='chromium'
    )
    
    parser.add_argument(
        '--timeout',
        type=int,
        help='Timeout in seconds for browser operations (default: 30)',
        default=30
    )
    
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Enable verbose output'
    )
    
    return parser.parse_args()


def configure_logging(log_level: str) -> None:
    """
    Configure logging level.
    
    Args:
        log_level: Logging level (debug, info, warning, error, critical)
    """
    numeric_level = getattr(logging, log_level.upper(), None)
    if not isinstance(numeric_level, int):
        raise ValueError(f'Invalid log level: {log_level}')
    
    logger.setLevel(numeric_level)
    for handler in logger.handlers:
        handler.setLevel(numeric_level)


def get_modules_to_run(config: Config, modules_arg: str) -> List[str]:
    """
    Get the list of modules to run based on the command line argument.
    
    Args:
        config: Configuration object
        modules_arg: Comma-separated list of modules or 'all'
        
    Returns:
        List of module names to run
    """
    if modules_arg.lower() == 'all':
        return config.get_enabled_modules()
    
    requested_modules = [m.strip() for m in modules_arg.split(',')]
    available_modules = list(config.config.get('modules', {}).keys())
    
    # Validate requested modules
    for module in requested_modules:
        if module not in available_modules:
            logger.warning(f"Unknown module: {module}. Available modules: {', '.join(available_modules)}")
            requested_modules.remove(module)
    
    return requested_modules


def run_verification(config: Config, modules_to_run: List[str]) -> Dict[str, Any]:
    """
    Run the verification process for the specified modules.
    
    Args:
        config: Configuration object
        modules_to_run: List of module names to run
        
    Returns:
        Dictionary containing verification results for each module
    """
    results = {}
    project_path = config.get('project_path')
    
    if not project_path or not os.path.exists(project_path):
        logger.error(f"Project path does not exist: {project_path}")
        sys.exit(1)
    
    logger.info(f"Starting verification of hacka.re project at: {project_path}")
    logger.info(f"Running modules: {', '.join(modules_to_run)}")
    
    # Run static analysis
    if 'static_analysis' in modules_to_run:
        logger.info("Running static analysis...")
        analyzer = StaticAnalyzer(config)
        results['static_analysis'] = analyzer.analyze(project_path)
    
    # Run network analysis
    if 'network_analysis' in modules_to_run:
        logger.info("Running network analysis...")
        monitor = NetworkMonitor(config)
        results['network_analysis'] = monitor.analyze(project_path)
    
    # Run crypto audit
    if 'crypto_audit' in modules_to_run:
        logger.info("Running cryptographic implementation audit...")
        auditor = CryptoAuditor(config)
        results['crypto_audit'] = auditor.analyze(project_path)
    
    # Run storage analysis
    if 'storage_analysis' in modules_to_run:
        logger.info("Running browser storage analysis...")
        storage_checker = StorageChecker(config)
        results['storage_analysis'] = storage_checker.analyze(project_path)
    
    # Run dependency verification
    if 'dependency_verification' in modules_to_run:
        logger.info("Running dependency verification...")
        dependency_checker = DependencyChecker(config)
        results['dependency_verification'] = dependency_checker.analyze(project_path)
    
    return results


def generate_report(config: Config, results: Dict[str, Any]) -> None:
    """
    Generate a report from the verification results.
    
    Args:
        config: Configuration object
        results: Verification results
    """
    if 'report_generation' in config.get_enabled_modules():
        logger.info("Generating report...")
        report_generator = ReportGenerator(config)
        report_path = report_generator.generate(results)
        logger.info(f"Report generated: {report_path}")


def main() -> None:
    """Main entry point for the hacka.re verifier tool."""
    # Parse command line arguments
    args = parse_args()
    
    # Load configuration
    config = Config(args.config)
    
    # Update configuration with command line arguments
    config.set('project_path', args.path)
    config.set('output_dir', args.output_dir)
    config.set('report_format', args.report_format)
    config.set('log_level', args.log_level)
    config.set('modules.network_analysis.headless', args.headless)
    config.set('modules.storage_analysis.headless', args.headless)
    config.set('modules.network_analysis.browser', args.browser)
    config.set('modules.storage_analysis.browser', args.browser)
    config.set('timeout', args.timeout)
    
    # Configure logging
    configure_logging(args.log_level)
    
    if args.verbose:
        logger.setLevel(logging.DEBUG)
    
    # Get modules to run
    modules_to_run = get_modules_to_run(config, args.modules)
    
    try:
        # Run verification
        results = run_verification(config, modules_to_run)
        
        # Generate report
        generate_report(config, results)
        
        logger.info("Verification completed successfully")
        return 0
    except Exception as e:
        logger.error(f"Verification failed: {e}", exc_info=True)
        return 1


if __name__ == '__main__':
    sys.exit(main())
