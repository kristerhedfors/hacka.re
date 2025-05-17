"""
Report generator for hacka.re verifier tool.
Generates detailed reports with findings and recommendations.
"""

import os
import json
import logging
import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional
import jinja2
import markdown
import pandas as pd
from tabulate import tabulate
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend

logger = logging.getLogger('hacka_re_verifier.report_generation')


class ReportGenerator:
    """Report generator for hacka.re verifier tool."""
    
    def __init__(self, config):
        """
        Initialize the report generator.
        
        Args:
            config: Configuration object
        """
        self.config = config
        self.formats = config.get('modules.report_generation.formats', ['html', 'json', 'markdown'])
        self.include_screenshots = config.get('modules.report_generation.include_screenshots', True)
        self.include_code_snippets = config.get('modules.report_generation.include_code_snippets', True)
        self.include_recommendations = config.get('modules.report_generation.include_recommendations', True)
        self.include_summary = config.get('modules.report_generation.include_summary', True)
        self.include_details = config.get('modules.report_generation.include_details', True)
        
        self.output_dir = config.get('output_dir', 'reports')
        self.report_format = config.get('report_format', 'html')
        
        # Load Jinja2 templates
        self.template_loader = jinja2.FileSystemLoader(searchpath=os.path.join(os.path.dirname(__file__), 'templates'))
        self.template_env = jinja2.Environment(loader=self.template_loader)
        
        # Create templates directory if it doesn't exist
        templates_dir = os.path.join(os.path.dirname(__file__), 'templates')
        os.makedirs(templates_dir, exist_ok=True)
        
        # Create default templates if they don't exist
        self._create_default_templates(templates_dir)
    
    def generate(self, results: Dict[str, Any]) -> str:
        """
        Generate a report from the verification results.
        
        Args:
            results: Verification results
            
        Returns:
            Path to the generated report
        """
        logger.info(f"Generating {self.report_format} report")
        
        # Create output directory if it doesn't exist
        os.makedirs(self.output_dir, exist_ok=True)
        
        # Generate report in the specified format
        if self.report_format == 'html':
            report_path = self._generate_html_report(results)
        elif self.report_format == 'json':
            report_path = self._generate_json_report(results)
        elif self.report_format == 'markdown':
            report_path = self._generate_markdown_report(results)
        elif self.report_format == 'pdf':
            report_path = self._generate_pdf_report(results)
        else:
            logger.warning(f"Unsupported report format: {self.report_format}, defaulting to HTML")
            report_path = self._generate_html_report(results)
        
        logger.info(f"Report generated: {report_path}")
        return report_path
    
    def _create_default_templates(self, templates_dir: str) -> None:
        """
        Create default templates if they don't exist.
        
        Args:
            templates_dir: Path to the templates directory
        """
        # HTML template
        html_template_path = os.path.join(templates_dir, 'report.html')
        if not os.path.exists(html_template_path):
            with open(html_template_path, 'w') as f:
                f.write('''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>hacka.re Verification Report</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            color: #333;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        h1, h2, h3, h4 {
            color: #2c3e50;
        }
        h1 {
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
        }
        h2 {
            border-bottom: 1px solid #3498db;
            padding-bottom: 5px;
            margin-top: 30px;
        }
        .summary {
            background-color: #f8f9fa;
            border-left: 4px solid #3498db;
            padding: 15px;
            margin: 20px 0;
        }
        .score {
            font-size: 24px;
            font-weight: bold;
        }
        .good {
            color: #27ae60;
        }
        .warning {
            color: #f39c12;
        }
        .danger {
            color: #e74c3c;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        .issue {
            margin-bottom: 20px;
            padding: 15px;
            border-radius: 5px;
        }
        .critical {
            background-color: #ffebee;
            border-left: 5px solid #e74c3c;
        }
        .high {
            background-color: #fff8e1;
            border-left: 5px solid #f39c12;
        }
        .medium {
            background-color: #e3f2fd;
            border-left: 5px solid #3498db;
        }
        .low {
            background-color: #e8f5e9;
            border-left: 5px solid #27ae60;
        }
        .recommendation {
            margin-bottom: 15px;
            padding: 10px;
            background-color: #f5f5f5;
            border-radius: 5px;
        }
        .code {
            font-family: monospace;
            background-color: #f5f5f5;
            padding: 10px;
            border-radius: 5px;
            overflow-x: auto;
            white-space: pre-wrap;
        }
        .chart {
            margin: 20px 0;
            text-align: center;
        }
        .chart img {
            max-width: 100%;
            height: auto;
        }
        .screenshot {
            margin: 20px 0;
            text-align: center;
        }
        .screenshot img {
            max-width: 100%;
            height: auto;
            border: 1px solid #ddd;
            border-radius: 5px;
        }
        .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 14px;
            color: #777;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>hacka.re Verification Report</h1>
        
        <div class="summary">
            <h2>Executive Summary</h2>
            <p>This report presents the results of a comprehensive verification of the hacka.re project's privacy and security claims.</p>
            
            <h3>Overall Scores</h3>
            <table>
                <tr>
                    <th>Category</th>
                    <th>Score</th>
                    <th>Rating</th>
                </tr>
                {% if 'static_analysis' in results %}
                <tr>
                    <td>Security (Static Analysis)</td>
                    <td class="score {% if results.static_analysis.summary.security_score >= 90 %}good{% elif results.static_analysis.summary.security_score >= 70 %}warning{% else %}danger{% endif %}">
                        {{ results.static_analysis.summary.security_score }}/100
                    </td>
                    <td>
                        {% if results.static_analysis.summary.security_score >= 90 %}
                            Excellent
                        {% elif results.static_analysis.summary.security_score >= 80 %}
                            Good
                        {% elif results.static_analysis.summary.security_score >= 70 %}
                            Satisfactory
                        {% elif results.static_analysis.summary.security_score >= 60 %}
                            Needs Improvement
                        {% else %}
                            Critical Issues
                        {% endif %}
                    </td>
                </tr>
                {% endif %}
                
                {% if 'network_analysis' in results %}
                <tr>
                    <td>Privacy (Network Analysis)</td>
                    <td class="score {% if results.network_analysis.summary.privacy_score >= 90 %}good{% elif results.network_analysis.summary.privacy_score >= 70 %}warning{% else %}danger{% endif %}">
                        {{ results.network_analysis.summary.privacy_score }}/100
                    </td>
                    <td>
                        {% if results.network_analysis.summary.privacy_score >= 90 %}
                            Excellent
                        {% elif results.network_analysis.summary.privacy_score >= 80 %}
                            Good
                        {% elif results.network_analysis.summary.privacy_score >= 70 %}
                            Satisfactory
                        {% elif results.network_analysis.summary.privacy_score >= 60 %}
                            Needs Improvement
                        {% else %}
                            Critical Issues
                        {% endif %}
                    </td>
                </tr>
                {% endif %}
                
                {% if 'crypto_audit' in results %}
                <tr>
                    <td>Cryptography</td>
                    <td class="score {% if results.crypto_audit.summary.crypto_score >= 90 %}good{% elif results.crypto_audit.summary.crypto_score >= 70 %}warning{% else %}danger{% endif %}">
                        {{ results.crypto_audit.summary.crypto_score }}/100
                    </td>
                    <td>
                        {% if results.crypto_audit.summary.crypto_score >= 90 %}
                            Excellent
                        {% elif results.crypto_audit.summary.crypto_score >= 80 %}
                            Good
                        {% elif results.crypto_audit.summary.crypto_score >= 70 %}
                            Satisfactory
                        {% elif results.crypto_audit.summary.crypto_score >= 60 %}
                            Needs Improvement
                        {% else %}
                            Critical Issues
                        {% endif %}
                    </td>
                </tr>
                {% endif %}
                
                {% if 'storage_analysis' in results %}
                <tr>
                    <td>Storage Security</td>
                    <td class="score {% if results.storage_analysis.summary.storage_score >= 90 %}good{% elif results.storage_analysis.summary.storage_score >= 70 %}warning{% else %}danger{% endif %}">
                        {{ results.storage_analysis.summary.storage_score }}/100
                    </td>
                    <td>
                        {% if results.storage_analysis.summary.storage_score >= 90 %}
                            Excellent
                        {% elif results.storage_analysis.summary.storage_score >= 80 %}
                            Good
                        {% elif results.storage_analysis.summary.storage_score >= 70 %}
                            Satisfactory
                        {% elif results.storage_analysis.summary.storage_score >= 60 %}
                            Needs Improvement
                        {% else %}
                            Critical Issues
                        {% endif %}
                    </td>
                </tr>
                {% endif %}
                
                {% if 'dependency_verification' in results %}
                <tr>
                    <td>Dependencies</td>
                    <td class="score {% if results.dependency_verification.summary.dependency_score >= 90 %}good{% elif results.dependency_verification.summary.dependency_score >= 70 %}warning{% else %}danger{% endif %}">
                        {{ results.dependency_verification.summary.dependency_score }}/100
                    </td>
                    <td>
                        {% if results.dependency_verification.summary.dependency_score >= 90 %}
                            Excellent
                        {% elif results.dependency_verification.summary.dependency_score >= 80 %}
                            Good
                        {% elif results.dependency_verification.summary.dependency_score >= 70 %}
                            Satisfactory
                        {% elif results.dependency_verification.summary.dependency_score >= 60 %}
                            Needs Improvement
                        {% else %}
                            Critical Issues
                        {% endif %}
                    </td>
                </tr>
                {% endif %}
                
                <tr>
                    <td><strong>Overall</strong></td>
                    <td class="score {% if overall_score >= 90 %}good{% elif overall_score >= 70 %}warning{% else %}danger{% endif %}">
                        {{ overall_score }}/100
                    </td>
                    <td>
                        {% if overall_score >= 90 %}
                            Excellent
                        {% elif overall_score >= 80 %}
                            Good
                        {% elif overall_score >= 70 %}
                            Satisfactory
                        {% elif overall_score >= 60 %}
                            Needs Improvement
                        {% else %}
                            Critical Issues
                        {% endif %}
                    </td>
                </tr>
            </table>
            
            <h3>Key Findings</h3>
            <ul>
                {% for finding in key_findings %}
                <li>{{ finding }}</li>
                {% endfor %}
            </ul>
        </div>
        
        <div class="chart">
            <h2>Score Breakdown</h2>
            <img src="score_chart.png" alt="Score Breakdown Chart">
        </div>
        
        <h2>Top Recommendations</h2>
        <div class="recommendations">
            {% for recommendation in top_recommendations %}
            <div class="recommendation {% if recommendation.priority == 'critical' %}critical{% elif recommendation.priority == 'high' %}high{% elif recommendation.priority == 'medium' %}medium{% else %}low{% endif %}">
                <h4>{{ recommendation.message }}</h4>
                <p><strong>Priority:</strong> {{ recommendation.priority|capitalize }}</p>
            </div>
            {% endfor %}
        </div>
        
        {% if 'static_analysis' in results %}
        <h2>Static Analysis</h2>
        <div class="summary">
            <p><strong>Files Analyzed:</strong> {{ results.static_analysis.summary.total_files_analyzed }}</p>
            <p><strong>Lines Analyzed:</strong> {{ results.static_analysis.summary.total_lines_analyzed }}</p>
            <p><strong>Issues Found:</strong> {{ results.static_analysis.summary.issues_found }}</p>
            <p><strong>Security Score:</strong> <span class="score {% if results.static_analysis.summary.security_score >= 90 %}good{% elif results.static_analysis.summary.security_score >= 70 %}warning{% else %}danger{% endif %}">{{ results.static_analysis.summary.security_score }}/100</span></p>
        </div>
        
        {% if results.static_analysis.security_issues %}
        <h3>Security Issues</h3>
        {% for issue in results.static_analysis.security_issues %}
        <div class="issue {{ issue.severity }}">
            <h4>{{ issue.message }}</h4>
            <p><strong>Severity:</strong> {{ issue.severity|capitalize }}</p>
            <p><strong>Type:</strong> {{ issue.type }}</p>
            {% if issue.details %}
            <p><strong>Details:</strong> {{ issue.details }}</p>
            {% endif %}
        </div>
        {% endfor %}
        {% endif %}
        
        {% if results.static_analysis.privacy_issues %}
        <h3>Privacy Issues</h3>
        {% for issue in results.static_analysis.privacy_issues %}
        <div class="issue {{ issue.severity }}">
            <h4>{{ issue.message }}</h4>
            <p><strong>Severity:</strong> {{ issue.severity|capitalize }}</p>
            <p><strong>Type:</strong> {{ issue.type }}</p>
            {% if issue.details %}
            <p><strong>Details:</strong> {{ issue.details }}</p>
            {% endif %}
        </div>
        {% endfor %}
        {% endif %}
        
        {% if results.static_analysis.recommendations %}
        <h3>Recommendations</h3>
        {% for recommendation in results.static_analysis.recommendations %}
        <div class="recommendation {% if recommendation.priority == 'critical' %}critical{% elif recommendation.priority == 'high' %}high{% elif recommendation.priority == 'medium' %}medium{% else %}low{% endif %}">
            <h4>{{ recommendation.message }}</h4>
            <p><strong>Priority:</strong> {{ recommendation.priority|capitalize }}</p>
        </div>
        {% endfor %}
        {% endif %}
        {% endif %}
        
        {% if 'network_analysis' in results %}
        <h2>Network Analysis</h2>
        <div class="summary">
            <p><strong>Total Requests:</strong> {{ results.network_analysis.summary.total_requests }}</p>
            <p><strong>Allowed Requests:</strong> {{ results.network_analysis.summary.allowed_requests }}</p>
            <p><strong>Blocked Requests:</strong> {{ results.network_analysis.summary.blocked_requests }}</p>
            <p><strong>Unknown Requests:</strong> {{ results.network_analysis.summary.unknown_requests }}</p>
            <p><strong>Privacy Score:</strong> <span class="score {% if results.network_analysis.summary.privacy_score >= 90 %}good{% elif results.network_analysis.summary.privacy_score >= 70 %}warning{% else %}danger{% endif %}">{{ results.network_analysis.summary.privacy_score }}/100</span></p>
        </div>
        
        {% if results.network_analysis.privacy_issues %}
        <h3>Privacy Issues</h3>
        {% for issue in results.network_analysis.privacy_issues %}
        <div class="issue {{ issue.severity }}">
            <h4>{{ issue.message }}</h4>
            <p><strong>Severity:</strong> {{ issue.severity|capitalize }}</p>
            <p><strong>Type:</strong> {{ issue.type }}</p>
            {% if issue.details %}
            <p><strong>Details:</strong> {{ issue.details }}</p>
            {% endif %}
        </div>
        {% endfor %}
        {% endif %}
        
        {% if results.network_analysis.recommendations %}
        <h3>Recommendations</h3>
        {% for recommendation in results.network_analysis.recommendations %}
        <div class="recommendation {% if recommendation.priority == 'critical' %}critical{% elif recommendation.priority == 'high' %}high{% elif recommendation.priority == 'medium' %}medium{% else %}low{% endif %}">
            <h4>{{ recommendation.message }}</h4>
            <p><strong>Priority:</strong> {{ recommendation.priority|capitalize }}</p>
        </div>
        {% endfor %}
        {% endif %}
        {% endif %}
        
        {% if 'crypto_audit' in results %}
        <h2>Cryptographic Audit</h2>
        <div class="summary">
            <p><strong>Files Analyzed:</strong> {{ results.crypto_audit.summary.total_files_analyzed }}</p>
            <p><strong>Crypto Functions Found:</strong> {{ results.crypto_audit.summary.crypto_functions_found }}</p>
            <p><strong>Crypto Issues Found:</strong> {{ results.crypto_audit.summary.crypto_issues_found }}</p>
            <p><strong>Crypto Score:</strong> <span class="score {% if results.crypto_audit.summary.crypto_score >= 90 %}good{% elif results.crypto_audit.summary.crypto_score >= 70 %}warning{% else %}danger{% endif %}">{{ results.crypto_audit.summary.crypto_score }}/100</span></p>
        </div>
        
        {% if results.crypto_audit.crypto_issues %}
        <h3>Cryptographic Issues</h3>
        {% for issue in results.crypto_audit.crypto_issues %}
        <div class="issue {{ issue.severity }}">
            <h4>{{ issue.message }}</h4>
            <p><strong>Severity:</strong> {{ issue.severity|capitalize }}</p>
            <p><strong>Type:</strong> {{ issue.type }}</p>
            <p><strong>File:</strong> {{ issue.file }}</p>
            <p><strong>Line:</strong> {{ issue.line }}</p>
            {% if issue.code %}
            <div class="code">{{ issue.code }}</div>
            {% endif %}
        </div>
        {% endfor %}
        {% endif %}
        
        {% if results.crypto_audit.recommendations %}
        <h3>Recommendations</h3>
        {% for recommendation in results.crypto_audit.recommendations %}
        <div class="recommendation {% if recommendation.priority == 'critical' %}critical{% elif recommendation.priority == 'high' %}high{% elif recommendation.priority == 'medium' %}medium{% else %}low{% endif %}">
            <h4>{{ recommendation.message }}</h4>
            <p><strong>Priority:</strong> {{ recommendation.priority|capitalize }}</p>
        </div>
        {% endfor %}
        {% endif %}
        {% endif %}
        
        {% if 'storage_analysis' in results %}
        <h2>Storage Analysis</h2>
        <div class="summary">
            <p><strong>Total Storage Items:</strong> {{ results.storage_analysis.summary.total_storage_items }}</p>
            <p><strong>Encrypted Items:</strong> {{ results.storage_analysis.summary.encrypted_items }}</p>
            <p><strong>Unencrypted Items:</strong> {{ results.storage_analysis.summary.unencrypted_items }}</p>
            <p><strong>Storage Score:</strong> <span class="score {% if results.storage_analysis.summary.storage_score >= 90 %}good{% elif results.storage_analysis.summary.storage_score >= 70 %}warning{% else %}danger{% endif %}">{{ results.storage_analysis.summary.storage_score }}/100</span></p>
        </div>
        
        {% if results.storage_analysis.storage_issues %}
        <h3>Storage Issues</h3>
        {% for issue in results.storage_analysis.storage_issues %}
        <div class="issue {{ issue.severity }}">
            <h4>{{ issue.message }}</h4>
            <p><strong>Severity:</strong> {{ issue.severity|capitalize }}</p>
            <p><strong>Type:</strong> {{ issue.type }}</p>
            {% if issue.details %}
            <p><strong>Details:</strong> {{ issue.details }}</p>
            {% endif %}
        </div>
        {% endfor %}
        {% endif %}
        
        {% if results.storage_analysis.recommendations %}
        <h3>Recommendations</h3>
        {% for recommendation in results.storage_analysis.recommendations %}
        <div class="recommendation {% if recommendation.priority == 'critical' %}critical{% elif recommendation.priority == 'high' %}high{% elif recommendation.priority == 'medium' %}medium{% else %}low{% endif %}">
            <h4>{{ recommendation.message }}</h4>
            <p><strong>Priority:</strong> {{ recommendation.priority|capitalize }}</p>
        </div>
        {% endfor %}
        {% endif %}
        {% endif %}
        
        {% if 'dependency_verification' in results %}
        <h2>Dependency Verification</h2>
        <div class="summary">
            <p><strong>Total Dependencies:</strong> {{ results.dependency_verification.summary.total_dependencies }}</p>
            <p><strong>Local Dependencies:</strong> {{ results.dependency_verification.summary.local_dependencies }}</p>
            <p><strong>External Dependencies:</strong> {{ results.dependency_verification.summary.external_dependencies }}</p>
            <p><strong>Missing Dependencies:</strong> {{ results.dependency_verification.summary.missing_dependencies }}</p>
            <p><strong>Vulnerable Dependencies:</strong> {{ results.dependency_verification.summary.vulnerable_dependencies }}</p>
            <p><strong>Dependency Score:</strong> <span class="score {% if results.dependency_verification.summary.dependency_score >= 90 %}good{% elif results.dependency_verification.summary.dependency_score >= 70 %}warning{% else %}danger{% endif %}">{{ results.dependency_verification.summary.dependency_score }}/100</span></p>
        </div>
        
        {% if results.dependency_verification.dependency_issues %}
        <h3>Dependency Issues</h3>
        {% for issue in results.dependency_verification.dependency_issues %}
        <div class="issue {{ issue.severity }}">
            <h4>{{ issue.message }}</h4>
            <p><strong>Severity:</strong> {{ issue.severity|capitalize }}</p>
            <p><strong>Type:</strong> {{ issue.type }}</p>
            {% if issue.details %}
            <p><strong>Details:</strong> {{ issue.details }}</p>
            {% endif %}
        </div>
        {% endfor %}
        {% endif %}
        
        {% if results.dependency_verification.recommendations %}
        <h3>Recommendations</h3>
        {% for recommendation in results.dependency_verification.recommendations %}
        <div class="recommendation {% if recommendation.priority == 'critical' %}critical{% elif recommendation.priority == 'high' %}high{% elif recommendation.priority == 'medium' %}medium{% else %}low{% endif %}">
            <h4>{{ recommendation.message }}</h4>
            <p><strong>Priority:</strong> {{ recommendation.priority|capitalize }}</p>
        </div>
        {% endfor %}
        {% endif %}
        {% endif %}
        
        <div class="footer">
            <p>Report generated on {{ timestamp }} by hacka.re Verifier</p>
        </div>
    </div>
</body>
</html>''')
        
        # Markdown template
        markdown_template_path = os.path.join(templates_dir, 'report.md')
        if not os.path.exists(markdown_template_path):
            with open(markdown_template_path, 'w') as f:
                f.write('''# hacka.re Verification Report

## Executive Summary

This report presents the results of a comprehensive verification of the hacka.re project's privacy and security claims.

### Overall Scores

{% if 'static_analysis' in results %}
- **Security (Static Analysis)**: {{ results.static_analysis.summary.security_score }}/100
{% endif %}
{% if 'network_analysis' in results %}
- **Privacy (Network Analysis)**: {{ results.network_analysis.summary.privacy_score }}/100
{% endif %}
{% if 'crypto_audit' in results %}
- **Cryptography**: {{ results.crypto_audit.summary.crypto_score }}/100
{% endif %}
{% if 'storage_analysis' in results %}
- **Storage Security**: {{ results.storage_analysis.summary.storage_score }}/100
{% endif %}
{% if 'dependency_verification' in results %}
- **Dependencies**: {{ results.dependency_verification.summary.dependency_score }}/100
{% endif %}
- **Overall**: {{ overall_score }}/100

### Key Findings

{% for finding in key_findings %}
- {{ finding }}
{% endfor %}

## Top Recommendations

{% for recommendation in top_recommendations %}
- **{{ recommendation.message }}** (Priority: {{ recommendation.priority|capitalize }})
{% endfor %}

{% if 'static_analysis' in results %}
## Static Analysis

- **Files Analyzed**: {{ results.static_analysis.summary.total_files_analyzed }}
- **Lines Analyzed**: {{ results.static_analysis.summary.total_lines_analyzed }}
- **Issues Found**: {{ results.static_analysis.summary.issues_found }}
- **Security Score**: {{ results.static_analysis.summary.security_score }}/100

{% if results.static_analysis.security_issues %}
### Security Issues

{% for issue in results.static_analysis.security_issues %}
#### {{ issue.message }}

- **Severity**: {{ issue.severity|capitalize }}
- **Type**: {{ issue.type }}
{% if issue.details %}
- **Details**: {{ issue.details }}
{% endif %}

{% endfor %}
{% endif %}

{% if results.static_analysis.privacy_issues %}
### Privacy Issues

{% for issue in results.static_analysis.privacy_issues %}
#### {{ issue.message }}

- **Severity**: {{ issue.severity|capitalize }}
- **Type**: {{ issue.type }}
{% if issue.details %}
- **Details**: {{ issue.details }}
{% endif %}

{% endfor %}
{% endif %}

{% if results.static_analysis.recommendations %}
### Recommendations

{% for recommendation in results.static_analysis.recommendations %}
- **{{ recommendation.message }}** (Priority: {{ recommendation.priority|capitalize }})
{% endfor %}
{% endif %}
{% endif %}

{% if 'network_analysis' in results %}
## Network Analysis

- **Total Requests**: {{ results.network_analysis.summary.total_requests }}
- **Allowed Requests**: {{ results.network_analysis.summary.allowed_requests }}
- **Blocked Requests**: {{ results.network_analysis.summary.blocked_requests }}
- **Unknown Requests**: {{ results.network_analysis.summary.unknown_requests }}
- **Privacy Score**: {{ results.network_analysis.summary.privacy_score }}/100

{% if results.network_analysis.privacy_issues %}
### Privacy Issues

{% for issue in results.network_analysis.privacy_issues %}
#### {{ issue.message }}

- **Severity**: {{ issue.severity|capitalize }}
- **Type**: {{ issue.type }}
{% if issue.details %}
- **Details**: {{ issue.details }}
{% endif %}

{% endfor %}
{% endif %}

{% if results.network_analysis.recommendations %}
### Recommendations

{% for recommendation in results.network_analysis.recommendations %}
- **{{ recommendation.message }}** (Priority: {{ recommendation.priority|capitalize }})
{% endfor %}
{% endif %}
{% endif %}

{% if 'crypto_audit' in results %}
## Cryptographic Audit

- **Files Analyzed**: {{ results.crypto_audit.summary.total_files_analyzed }}
- **Crypto Functions Found**: {{ results.crypto_audit.summary.crypto_functions_found }}
- **Crypto Issues Found**: {{ results.crypto_audit.summary.crypto_issues_found }}
- **Crypto Score**: {{ results.crypto_audit.summary.crypto_score }}/100

{% if results.crypto_audit.crypto_issues %}
### Cryptographic Issues

{% for issue in results.crypto_audit.crypto_issues %}
#### {{ issue.message }}

- **Severity**: {{ issue.severity|capitalize }}
- **Type**: {{ issue.type }}
- **File**: {{ issue.file }}
- **Line**: {{ issue.line }}
{% if issue.code %}
- **Code**:
```
{{ issue.code }}
```
{% endif %}

{% endfor %}
{% endif %}

{% if results.crypto_audit.recommendations %}
### Recommendations

{% for recommendation in results.crypto_audit.recommendations %}
- **{{ recommendation.message }}** (Priority: {{ recommendation.priority|capitalize }})
{% endfor %}
{% endif %}
{% endif %}

{% if 'storage_analysis' in results %}
## Storage Analysis

- **Total Storage Items**: {{ results.storage_analysis.summary.total_storage_items }}
- **Encrypted Items**: {{ results.storage_analysis.summary.encrypted_items }}
- **Unencrypted Items**: {{ results.storage_analysis.summary.unencrypted_items }}
- **Storage Score**: {{ results.storage_analysis.summary.storage_score }}/100

{% if results.storage_analysis.storage_issues %}
### Storage Issues

{% for issue in results.storage_analysis.storage_issues %}
#### {{ issue.message }}

- **Severity**: {{ issue.severity|capitalize }}
- **Type**: {{ issue.type }}
{% if issue.details %}
- **Details**: {{ issue.details }}
{% endif %}

{% endfor %}
{% endif %}

{% if results.storage_analysis.recommendations %}
### Recommendations

{% for recommendation in results.storage_analysis.recommendations %}
- **{{ recommendation.message }}** (Priority: {{ recommendation.priority|capitalize }})
{% endfor %}
{% endif %}
{% endif %}

{% if 'dependency_verification' in results %}
## Dependency Verification

- **Total Dependencies**: {{ results.dependency_verification.summary.total_dependencies }}
- **Local Dependencies**: {{ results.dependency_verification.summary.local_dependencies }}
- **External Dependencies**: {{ results.dependency_verification.summary.external_dependencies }}
- **Missing Dependencies**: {{ results.dependency_verification.summary.missing_dependencies }}
- **Vulnerable Dependencies**: {{ results.dependency_verification.summary.vulnerable_dependencies }}
- **Dependency Score**: {{ results.dependency_verification.summary.dependency_score }}/100

{% if results.dependency_verification.dependency_issues %}
### Dependency Issues

{% for issue in results.dependency_verification.dependency_issues %}
#### {{ issue.message }}

- **Severity**: {{ issue.severity|capitalize }}
- **Type**: {{ issue.type }}
{% if issue.details %}
- **Details**: {{ issue.details }}
{% endif %}

{% endfor %}
{% endif %}

{% if results.dependency_verification.recommendations %}
### Recommendations

{% for recommendation in results.dependency_verification.recommendations %}
- **{{ recommendation.message }}** (Priority: {{ recommendation.priority|capitalize }})
{% endfor %}
{% endif %}
{% endif %}

## Conclusion

This report has presented a comprehensive analysis of the hacka.re project's privacy and security claims. The verification process has identified both strengths and areas for improvement in the implementation.

Report generated on {{ timestamp }} by hacka.re Verifier
''')

    def _generate_html_report(self, results: Dict[str, Any]) -> str:
        """
        Generate an HTML report.
        
        Args:
            results: Verification results
            
        Returns:
            Path to the generated report
        """
        # Calculate overall score
        scores = []
        if 'static_analysis' in results and 'security_score' in results['static_analysis']['summary']:
            scores.append(results['static_analysis']['summary']['security_score'])
        if 'network_analysis' in results and 'privacy_score' in results['network_analysis']['summary']:
            scores.append(results['network_analysis']['summary']['privacy_score'])
        if 'crypto_audit' in results and 'crypto_score' in results['crypto_audit']['summary']:
            scores.append(results['crypto_audit']['summary']['crypto_score'])
        if 'storage_analysis' in results and 'storage_score' in results['storage_analysis']['summary']:
            scores.append(results['storage_analysis']['summary']['storage_score'])
        if 'dependency_verification' in results and 'dependency_score' in results['dependency_verification']['summary']:
            scores.append(results['dependency_verification']['summary']['dependency_score'])
        
        overall_score = round(sum(scores) / len(scores), 1) if scores else 0.0
        
        # Generate key findings
        key_findings = self._generate_key_findings(results)
        
        # Generate top recommendations
        top_recommendations = self._generate_top_recommendations(results)
        
        # Generate score chart
        self._generate_score_chart(results, overall_score)
        
        # Prepare template data
        template_data = {
            'results': results,
            'overall_score': overall_score,
            'key_findings': key_findings,
            'top_recommendations': top_recommendations,
            'timestamp': datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        # Render template
        template = self.template_env.get_template('report.html')
        report_content = template.render(**template_data)
        
        # Write report to file
        report_path = os.path.join(self.output_dir, 'report.html')
        with open(report_path, 'w') as f:
            f.write(report_content)
        
        return report_path
    
    def _generate_markdown_report(self, results: Dict[str, Any]) -> str:
        """
        Generate a Markdown report.
        
        Args:
            results: Verification results
            
        Returns:
            Path to the generated report
        """
        # Calculate overall score
        scores = []
        if 'static_analysis' in results and 'security_score' in results['static_analysis']['summary']:
            scores.append(results['static_analysis']['summary']['security_score'])
        if 'network_analysis' in results and 'privacy_score' in results['network_analysis']['summary']:
            scores.append(results['network_analysis']['summary']['privacy_score'])
        if 'crypto_audit' in results and 'crypto_score' in results['crypto_audit']['summary']:
            scores.append(results['crypto_audit']['summary']['crypto_score'])
        if 'storage_analysis' in results and 'storage_score' in results['storage_analysis']['summary']:
            scores.append(results['storage_analysis']['summary']['storage_score'])
        if 'dependency_verification' in results and 'dependency_score' in results['dependency_verification']['summary']:
            scores.append(results['dependency_verification']['summary']['dependency_score'])
        
        overall_score = round(sum(scores) / len(scores), 1) if scores else 0.0
        
        # Generate key findings
        key_findings = self._generate_key_findings(results)
        
        # Generate top recommendations
        top_recommendations = self._generate_top_recommendations(results)
        
        # Prepare template data
        template_data = {
            'results': results,
            'overall_score': overall_score,
            'key_findings': key_findings,
            'top_recommendations': top_recommendations,
            'timestamp': datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        # Render template
        template = self.template_env.get_template('report.md')
        report_content = template.render(**template_data)
        
        # Write report to file
        report_path = os.path.join(self.output_dir, 'report.md')
        with open(report_path, 'w') as f:
            f.write(report_content)
        
        return report_path
    
    def _generate_json_report(self, results: Dict[str, Any]) -> str:
        """
        Generate a JSON report.
        
        Args:
            results: Verification results
            
        Returns:
            Path to the generated report
        """
        # Calculate overall score
        scores = []
        if 'static_analysis' in results and 'security_score' in results['static_analysis']['summary']:
            scores.append(results['static_analysis']['summary']['security_score'])
        if 'network_analysis' in results and 'privacy_score' in results['network_analysis']['summary']:
            scores.append(results['network_analysis']['summary']['privacy_score'])
        if 'crypto_audit' in results and 'crypto_score' in results['crypto_audit']['summary']:
            scores.append(results['crypto_audit']['summary']['crypto_score'])
        if 'storage_analysis' in results and 'storage_score' in results['storage_analysis']['summary']:
            scores.append(results['storage_analysis']['summary']['storage_score'])
        if 'dependency_verification' in results and 'dependency_score' in results['dependency_verification']['summary']:
            scores.append(results['dependency_verification']['summary']['dependency_score'])
        
        overall_score = round(sum(scores) / len(scores), 1) if scores else 0.0
        
        # Generate key findings
        key_findings = self._generate_key_findings(results)
        
        # Generate top recommendations
        top_recommendations = self._generate_top_recommendations(results)
        
        # Prepare report data
        report_data = {
            'results': results,
            'overall_score': overall_score,
            'key_findings': key_findings,
            'top_recommendations': top_recommendations,
            'timestamp': datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        # Write report to file
        report_path = os.path.join(self.output_dir, 'report.json')
        with open(report_path, 'w') as f:
            json.dump(report_data, f, indent=2)
        
        return report_path
    
    def _generate_pdf_report(self, results: Dict[str, Any]) -> str:
        """
        Generate a PDF report.
        
        Args:
            results: Verification results
            
        Returns:
            Path to the generated report
        """
        # First generate HTML report
        html_report_path = self._generate_html_report(results)
        
        # Convert HTML to PDF
        try:
            import weasyprint
            
            # Read HTML content
            with open(html_report_path, 'r') as f:
                html_content = f.read()
            
            # Generate PDF
            pdf_report_path = os.path.join(self.output_dir, 'report.pdf')
            weasyprint.HTML(string=html_content).write_pdf(pdf_report_path)
            
            return pdf_report_path
        except ImportError:
            logger.warning("weasyprint not installed, falling back to HTML report")
            return html_report_path
    
    def _generate_key_findings(self, results: Dict[str, Any]) -> List[str]:
        """
        Generate key findings from the results.
        
        Args:
            results: Verification results
            
        Returns:
            List of key findings
        """
        key_findings = []
        
        # Add findings from static analysis
        if 'static_analysis' in results:
            if results['static_analysis']['summary']['security_score'] >= 90:
                key_findings.append("The codebase demonstrates excellent security practices with a score of " + 
                                   f"{results['static_analysis']['summary']['security_score']}/100.")
            elif results['static_analysis']['summary']['security_score'] >= 70:
                key_findings.append("The codebase demonstrates good security practices with a score of " + 
                                   f"{results['static_analysis']['summary']['security_score']}/100.")
            else:
                key_findings.append("The codebase has security issues that need to be addressed, with a score of " + 
                                   f"{results['static_analysis']['summary']['security_score']}/100.")
            
            # Add critical security issues
            critical_issues = [i for i in results['static_analysis'].get('security_issues', []) if i['severity'] == 'critical']
            if critical_issues:
                key_findings.append(f"Found {len(critical_issues)} critical security issues that require immediate attention.")
        
        # Add findings from network analysis
        if 'network_analysis' in results:
            if results['network_analysis']['summary']['privacy_score'] >= 90:
                key_findings.append("Network traffic analysis confirms excellent privacy practices with a score of " + 
                                   f"{results['network_analysis']['summary']['privacy_score']}/100.")
            elif results['network_analysis']['summary']['privacy_score'] >= 70:
                key_findings.append("Network traffic analysis confirms good privacy practices with a score of " + 
                                   f"{results['network_analysis']['summary']['privacy_score']}/100.")
            else:
                key_findings.append("Network traffic analysis reveals privacy issues that need to be addressed, with a score of " + 
                                   f"{results['network_analysis']['summary']['privacy_score']}/100.")
            
            # Add external requests
            if results['network_analysis']['summary']['blocked_requests'] > 0:
                key_findings.append(f"Detected {results['network_analysis']['summary']['blocked_requests']} requests to blocked domains.")
        
        # Add findings from crypto audit
        if 'crypto_audit' in results:
            if results['crypto_audit']['summary']['crypto_score'] >= 90:
                key_findings.append("Cryptographic implementation is excellent with a score of " + 
                                   f"{results['crypto_audit']['summary']['crypto_score']}/100.")
            elif results['crypto_audit']['summary']['crypto_score'] >= 70:
                key_findings.append("Cryptographic implementation is good with a score of " + 
                                   f"{results['crypto_audit']['summary']['crypto_score']}/100.")
            else:
                key_findings.append("Cryptographic implementation has issues that need to be addressed, with a score of " + 
                                   f"{results['crypto_audit']['summary']['crypto_score']}/100.")
        
        # Add findings from storage analysis
        if 'storage_analysis' in results:
            if results['storage_analysis']['summary']['storage_score'] >= 90:
                key_findings.append("Browser storage usage is secure with a score of " + 
                                   f"{results['storage_analysis']['summary']['storage_score']}/100.")
            elif results['storage_analysis']['summary']['storage_score'] >= 70:
                key_findings.append("Browser storage usage is generally secure with a score of " + 
                                   f"{results['storage_analysis']['summary']['storage_score']}/100.")
            else:
                key_findings.append("Browser storage usage has security issues that need to be addressed, with a score of " + 
                                   f"{results['storage_analysis']['summary']['storage_score']}/100.")
            
            # Add unencrypted items
            if results['storage_analysis']['summary'].get('unencrypted_items', 0) > 0:
                key_findings.append(f"Found {results['storage_analysis']['summary']['unencrypted_items']} unencrypted items in browser storage.")
        
        # Add findings from dependency verification
        if 'dependency_verification' in results:
            if results['dependency_verification']['summary']['dependency_score'] >= 90:
                key_findings.append("Dependencies are well-managed with a score of " + 
                                   f"{results['dependency_verification']['summary']['dependency_score']}/100.")
            elif results['dependency_verification']['summary']['dependency_score'] >= 70:
                key_findings.append("Dependencies are generally well-managed with a score of " + 
                                   f"{results['dependency_verification']['summary']['dependency_score']}/100.")
            else:
                key_findings.append("Dependency management has issues that need to be addressed, with a score of " + 
                                   f"{results['dependency_verification']['summary']['dependency_score']}/100.")
            
            # Add external dependencies
            if results['dependency_verification']['summary'].get('external_dependencies', 0) > 0:
                key_findings.append(f"Found {results['dependency_verification']['summary']['external_dependencies']} external dependencies that should be hosted locally.")
            
            # Add vulnerable dependencies
            if results['dependency_verification']['summary'].get('vulnerable_dependencies', 0) > 0:
                key_findings.append(f"Found {results['dependency_verification']['summary']['vulnerable_dependencies']} vulnerable dependencies that should be updated.")
        
        return key_findings
    
    def _generate_top_recommendations(self, results: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Generate top recommendations from the results.
        
        Args:
            results: Verification results
            
        Returns:
            List of top recommendations
        """
        all_recommendations = []
        
        # Add recommendations from static analysis
        if 'static_analysis' in results and 'recommendations' in results['static_analysis']:
            all_recommendations.extend(results['static_analysis']['recommendations'])
        
        # Add recommendations from network analysis
        if 'network_analysis' in results and 'recommendations' in results['network_analysis']:
            all_recommendations.extend(results['network_analysis']['recommendations'])
        
        # Add recommendations from crypto audit
        if 'crypto_audit' in results and 'recommendations' in results['crypto_audit']:
            all_recommendations.extend(results['crypto_audit']['recommendations'])
        
        # Add recommendations from storage analysis
        if 'storage_analysis' in results and 'recommendations' in results['storage_analysis']:
            all_recommendations.extend(results['storage_analysis']['recommendations'])
        
        # Add recommendations from dependency verification
        if 'dependency_verification' in results and 'recommendations' in results['dependency_verification']:
            all_recommendations.extend(results['dependency_verification']['recommendations'])
        
        # Sort recommendations by priority
        priority_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
        all_recommendations.sort(key=lambda x: priority_order.get(x.get('priority', 'low'), 4))
        
        # Return top 5 recommendations
        return all_recommendations[:5]
    
    def _generate_score_chart(self, results: Dict[str, Any], overall_score: float) -> None:
        """
        Generate a chart showing the scores.
        
        Args:
            results: Verification results
            overall_score: Overall score
        """
        # Collect scores
        categories = []
        scores = []
        
        if 'static_analysis' in results and 'security_score' in results['static_analysis']['summary']:
            categories.append('Security')
            scores.append(results['static_analysis']['summary']['security_score'])
        
        if 'network_analysis' in results and 'privacy_score' in results['network_analysis']['summary']:
            categories.append('Privacy')
            scores.append(results['network_analysis']['summary']['privacy_score'])
        
        if 'crypto_audit' in results and 'crypto_score' in results['crypto_audit']['summary']:
            categories.append('Cryptography')
            scores.append(results['crypto_audit']['summary']['crypto_score'])
        
        if 'storage_analysis' in results and 'storage_score' in results['storage_analysis']['summary']:
            categories.append('Storage')
            scores.append(results['storage_analysis']['summary']['storage_score'])
        
        if 'dependency_verification' in results and 'dependency_score' in results['dependency_verification']['summary']:
            categories.append('Dependencies')
            scores.append(results['dependency_verification']['summary']['dependency_score'])
        
        categories.append('Overall')
        scores.append(overall_score)
        
        # Create chart
        plt.figure(figsize=(10, 6))
        bars = plt.bar(categories, scores, color=['#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e74c3c'])
        
        # Add score labels
        for bar in bars:
            height = bar.get_height()
            plt.text(bar.get_x() + bar.get_width()/2., height + 1,
                    f'{height}',
                    ha='center', va='bottom')
        
        # Add chart details
        plt.ylim(0, 105)
        plt.title('hacka.re Verification Scores')
        plt.ylabel('Score (out of 100)')
        plt.grid(axis='y', linestyle='--', alpha=0.7)
        
        # Save chart
        chart_path = os.path.join(self.output_dir, 'score_chart.png')
        plt.savefig(chart_path, bbox_inches='tight')
        plt.close()
