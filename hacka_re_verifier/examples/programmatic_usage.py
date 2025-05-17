#!/usr/bin/env python3
"""
Example script demonstrating how to use the hacka.re verifier programmatically.
"""

import os
import sys
import logging
from pathlib import Path

# Add the parent directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from hacka_re_verifier.src.config import Config
from hacka_re_verifier.src.static_analysis.analyzer import StaticAnalyzer
from hacka_re_verifier.src.network_analysis.monitor import NetworkMonitor
from hacka_re_verifier.src.crypto_audit.auditor import CryptoAuditor
from hacka_re_verifier.src.storage_analysis.storage_checker import StorageChecker
from hacka_re_verifier.src.dependency_verification.dependency_checker import DependencyChecker
from hacka_re_verifier.src.report_generation.report_generator import ReportGenerator


def main():
    """Main entry point for the example script."""
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    # Path to the hacka.re project
    project_path = '/path/to/hacka.re'
    
    # Create a configuration
    config = Config()
    config.set('project_path', project_path)
    config.set('output_dir', 'custom_reports')
    config.set('report_format', 'html')
    
    # Customize configuration
    config.set('modules.static_analysis.exclude_dirs', ['node_modules', 'dist', 'build', '_venv', 'lib'])
    config.set('modules.network_analysis.headless', True)
    config.set('modules.storage_analysis.headless', True)
    
    # Run specific modules
    results = {}
    
    # Run static analysis
    print("Running static analysis...")
    static_analyzer = StaticAnalyzer(config)
    results['static_analysis'] = static_analyzer.analyze(project_path)
    
    # Run network analysis
    print("Running network analysis...")
    network_monitor = NetworkMonitor(config)
    results['network_analysis'] = network_monitor.analyze(project_path)
    
    # Run crypto audit
    print("Running cryptographic audit...")
    crypto_auditor = CryptoAuditor(config)
    results['crypto_audit'] = crypto_auditor.analyze(project_path)
    
    # Run storage analysis
    print("Running storage analysis...")
    storage_checker = StorageChecker(config)
    results['storage_analysis'] = storage_checker.analyze(project_path)
    
    # Run dependency verification
    print("Running dependency verification...")
    dependency_checker = DependencyChecker(config)
    results['dependency_verification'] = dependency_checker.analyze(project_path)
    
    # Generate report
    print("Generating report...")
    report_generator = ReportGenerator(config)
    report_path = report_generator.generate(results)
    
    print(f"Report generated: {report_path}")
    
    # Print summary
    print("\nSummary:")
    print(f"Static Analysis Security Score: {results['static_analysis']['summary']['security_score']}/100")
    print(f"Network Analysis Privacy Score: {results['network_analysis']['summary']['privacy_score']}/100")
    print(f"Cryptographic Audit Score: {results['crypto_audit']['summary']['crypto_score']}/100")
    print(f"Storage Analysis Score: {results['storage_analysis']['summary']['storage_score']}/100")
    print(f"Dependency Verification Score: {results['dependency_verification']['summary']['dependency_score']}/100")
    
    # Calculate overall score
    scores = [
        results['static_analysis']['summary']['security_score'],
        results['network_analysis']['summary']['privacy_score'],
        results['crypto_audit']['summary']['crypto_score'],
        results['storage_analysis']['summary']['storage_score'],
        results['dependency_verification']['summary']['dependency_score']
    ]
    overall_score = sum(scores) / len(scores)
    print(f"Overall Score: {overall_score:.1f}/100")
    
    return 0


if __name__ == '__main__':
    sys.exit(main())
