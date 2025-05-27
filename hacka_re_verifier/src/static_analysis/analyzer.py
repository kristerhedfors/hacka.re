"""
Static code analyzer for hacka.re project.
Analyzes JavaScript code for security patterns and anti-patterns.
"""

import os
import re
import json
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple, Set
import jsbeautifier
import esprima
from glob import glob

logger = logging.getLogger('hacka_re_verifier.static_analysis')


class StaticAnalyzer:
    """Static code analyzer for hacka.re project."""
    
    def __init__(self, config):
        """
        Initialize the static analyzer.
        
        Args:
            config: Configuration object
        """
        self.config = config
        self.patterns = config.get('modules.static_analysis.patterns', {})
        self.files_to_analyze = config.get('modules.static_analysis.files_to_analyze', ['*.js', '*.html', '*.css'])
        self.exclude_dirs = config.get('modules.static_analysis.exclude_dirs', [])
        self.results = {
            'summary': {
                'total_files_analyzed': 0,
                'total_lines_analyzed': 0,
                'issues_found': 0,
                'security_score': 0.0
            },
            'findings': [],
            'patterns_found': {},
            'security_issues': [],
            'privacy_issues': [],
            'recommendations': []
        }
    
    def analyze(self, project_path: str) -> Dict[str, Any]:
        """
        Analyze the hacka.re project for security patterns and anti-patterns.
        
        Args:
            project_path: Path to the hacka.re project
            
        Returns:
            Dictionary containing analysis results
        """
        logger.info(f"Starting static analysis of project at: {project_path}")
        
        # Find all files to analyze
        files_to_analyze = self._find_files(project_path)
        logger.info(f"Found {len(files_to_analyze)} files to analyze")
        
        # Analyze each file
        total_lines = 0
        for file_path in files_to_analyze:
            try:
                lines, findings = self._analyze_file(file_path)
                total_lines += lines
                
                if findings:
                    self.results['findings'].extend(findings)
                    self.results['summary']['issues_found'] += len(findings)
            except Exception as e:
                logger.error(f"Error analyzing file {file_path}: {e}")
        
        # Update summary
        self.results['summary']['total_files_analyzed'] = len(files_to_analyze)
        self.results['summary']['total_lines_analyzed'] = total_lines
        
        # Analyze patterns found
        self._analyze_patterns()
        
        # Calculate security score
        self._calculate_security_score()
        
        # Generate recommendations
        self._generate_recommendations()
        
        logger.info(f"Static analysis completed. Found {self.results['summary']['issues_found']} issues.")
        return self.results
    
    def _find_files(self, project_path: str) -> List[str]:
        """
        Find all files to analyze in the project.
        
        Args:
            project_path: Path to the hacka.re project
            
        Returns:
            List of file paths to analyze
        """
        files = []
        for pattern in self.files_to_analyze:
            for file_path in glob(os.path.join(project_path, '**', pattern), recursive=True):
                # Check if file is in excluded directory
                if not any(excluded in file_path for excluded in self.exclude_dirs):
                    files.append(file_path)
        return files
    
    def _analyze_file(self, file_path: str) -> Tuple[int, List[Dict[str, Any]]]:
        """
        Analyze a single file for security patterns and anti-patterns.
        
        Args:
            file_path: Path to the file to analyze
            
        Returns:
            Tuple containing (number of lines, list of findings)
        """
        logger.debug(f"Analyzing file: {file_path}")
        
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        lines = content.count('\n') + 1
        findings = []
        
        # Analyze file based on extension
        ext = os.path.splitext(file_path)[1].lower()
        
        if ext == '.js':
            findings.extend(self._analyze_javascript(file_path, content))
        elif ext == '.html':
            findings.extend(self._analyze_html(file_path, content))
        elif ext == '.css':
            findings.extend(self._analyze_css(file_path, content))
        
        # Check for patterns in all file types
        findings.extend(self._check_patterns(file_path, content))
        
        return lines, findings
    
    def _analyze_javascript(self, file_path: str, content: str) -> List[Dict[str, Any]]:
        """
        Analyze JavaScript code for security patterns and anti-patterns.
        
        Args:
            file_path: Path to the JavaScript file
            content: Content of the JavaScript file
            
        Returns:
            List of findings
        """
        findings = []
        
        try:
            # Beautify JavaScript for better analysis
            options = jsbeautifier.default_options()
            beautified_content = jsbeautifier.beautify(content, options)
            
            # Parse JavaScript with esprima
            try:
                ast = esprima.parseScript(beautified_content, {'loc': True, 'comment': True})
                
                # Check for eval usage
                findings.extend(self._check_eval_usage(file_path, ast))
                
                # Check for localStorage usage
                findings.extend(self._check_local_storage_usage(file_path, ast))
                
                # Check for API key handling
                findings.extend(self._check_api_key_handling(file_path, ast))
                
                # Check for encryption usage
                findings.extend(self._check_encryption_usage(file_path, ast))
                
            except Exception as e:
                logger.warning(f"Error parsing JavaScript in {file_path}: {e}")
                # Add a finding for syntax error
                findings.append({
                    'file': file_path,
                    'line': 0,
                    'column': 0,
                    'type': 'syntax_error',
                    'severity': 'warning',
                    'message': f"JavaScript syntax error: {str(e)}",
                    'code': ''
                })
        except Exception as e:
            logger.error(f"Error analyzing JavaScript in {file_path}: {e}")
        
        return findings
    
    def _analyze_html(self, file_path: str, content: str) -> List[Dict[str, Any]]:
        """
        Analyze HTML code for security patterns and anti-patterns.
        
        Args:
            file_path: Path to the HTML file
            content: Content of the HTML file
            
        Returns:
            List of findings
        """
        findings = []
        
        # Check for inline scripts
        inline_scripts = re.findall(r'<script[^>]*>(.*?)</script>', content, re.DOTALL)
        for i, script in enumerate(inline_scripts):
            if script.strip():
                # Analyze the inline script
                script_findings = self._analyze_javascript(f"{file_path}#inline-script-{i+1}", script)
                findings.extend(script_findings)
        
        # Check for external scripts
        external_scripts = re.findall(r'<script[^>]*src=["\']([^"\']+)["\'][^>]*>', content)
        for script_src in external_scripts:
            if script_src.startswith('http') and not script_src.startswith('https://api.groq.com') and not script_src.startswith('https://api.openai.com'):
                findings.append({
                    'file': file_path,
                    'line': 0,  # Line number not available without more complex parsing
                    'column': 0,
                    'type': 'external_script',
                    'severity': 'warning',
                    'message': f"External script source detected: {script_src}",
                    'code': f'<script src="{script_src}">'
                })
        
        # Check for inline event handlers
        event_handlers = re.findall(r'on\w+=["\']([^"\']+)["\']', content)
        for handler in event_handlers:
            findings.append({
                'file': file_path,
                'line': 0,  # Line number not available without more complex parsing
                'column': 0,
                'type': 'inline_event_handler',
                'severity': 'info',
                'message': f"Inline event handler detected: {handler}",
                'code': handler
            })
        
        return findings
    
    def _analyze_css(self, file_path: str, content: str) -> List[Dict[str, Any]]:
        """
        Analyze CSS code for security patterns and anti-patterns.
        
        Args:
            file_path: Path to the CSS file
            content: Content of the CSS file
            
        Returns:
            List of findings
        """
        findings = []
        
        # Check for import statements
        imports = re.findall(r'@import\s+["\']([^"\']+)["\']', content)
        for import_url in imports:
            if import_url.startswith('http'):
                findings.append({
                    'file': file_path,
                    'line': 0,  # Line number not available without more complex parsing
                    'column': 0,
                    'type': 'external_css_import',
                    'severity': 'warning',
                    'message': f"External CSS import detected: {import_url}",
                    'code': f'@import "{import_url}"'
                })
        
        # Check for url() references
        urls = re.findall(r'url\(["\']?([^"\'\)]+)["\']?\)', content)
        for url in urls:
            if url.startswith('http'):
                findings.append({
                    'file': file_path,
                    'line': 0,  # Line number not available without more complex parsing
                    'column': 0,
                    'type': 'external_css_url',
                    'severity': 'info',
                    'message': f"External URL in CSS detected: {url}",
                    'code': f'url({url})'
                })
        
        return findings
    
    def _check_patterns(self, file_path: str, content: str) -> List[Dict[str, Any]]:
        """
        Check for specific patterns in the file content with context-aware analysis.
        
        Args:
            file_path: Path to the file
            content: Content of the file
            
        Returns:
            List of findings
        """
        findings = []
        
        # Get line numbers for better reporting
        lines = content.split('\n')
        
        # Check each pattern category
        for category, patterns in self.patterns.items():
            for pattern in patterns:
                for i, line in enumerate(lines):
                    if re.search(pattern, line):
                        # Context-aware filtering for false positives
                        if self._is_false_positive(line, pattern, category, file_path):
                            continue
                        
                        # Initialize pattern category in results if not exists
                        if category not in self.results['patterns_found']:
                            self.results['patterns_found'][category] = []
                        
                        # Add to patterns found
                        pattern_info = {
                            'file': file_path,
                            'line': i + 1,
                            'pattern': pattern,
                            'match': line.strip(),
                            'confidence': self._calculate_confidence(line, pattern, category)
                        }
                        self.results['patterns_found'][category].append(pattern_info)
                        
                        # Add as a finding if it's a security concern and high confidence
                        if category in ['tracking_code', 'external_requests'] and pattern_info['confidence'] > 0.7:
                            findings.append({
                                'file': file_path,
                                'line': i + 1,
                                'column': 0,
                                'type': category,
                                'severity': 'warning',
                                'message': f"{category.replace('_', ' ').title()} detected: {pattern}",
                                'code': line.strip(),
                                'confidence': pattern_info['confidence']
                            })
        
        return findings
    
    def _is_false_positive(self, line: str, pattern: str, category: str, file_path: str) -> bool:
        """
        Determine if a pattern match is likely a false positive.
        
        Args:
            line: The line containing the match
            pattern: The regex pattern that matched
            category: The category of the pattern
            file_path: Path to the file
            
        Returns:
            True if likely a false positive, False otherwise
        """
        line_lower = line.lower().strip()
        
        # Skip comments and documentation
        if (line_lower.startswith('//') or 
            line_lower.startswith('*') or 
            line_lower.startswith('<!--') or
            '/*' in line_lower or
            '*/' in line_lower):
            return True
        
        # Skip documentation files
        if any(doc_indicator in file_path.lower() for doc_indicator in 
               ['readme', 'doc', 'about', 'research-report', 'disclaimer']):
            return True
        
        # Skip test files for certain patterns
        if 'test' in file_path.lower() and category == 'tracking_code':
            # Allow tracking in test files unless it's actual tracking code
            if not any(actual_tracker in line_lower for actual_tracker in 
                      ['google-analytics.com', 'gtag(', 'ga(', '_gaq.push']):
                return True
        
        # Skip minified library files
        if 'lib/' in file_path and '.min.' in file_path:
            return True
        
        # Category-specific false positive detection
        if category == 'tracking_code':
            # Skip if it's just mentioning tracking in documentation context
            doc_keywords = ['does not use', 'no tracking', 'without tracking', 
                           'privacy', 'documentation', 'claims', 'features']
            if any(keyword in line_lower for keyword in doc_keywords):
                return True
            
            # Skip variable names and comments about tracking
            if any(indicator in line_lower for indicator in 
                  ['// ', 'tracking variable', 'track changes', 'keep track']):
                return True
        
        return False
    
    def _calculate_confidence(self, line: str, pattern: str, category: str) -> float:
        """
        Calculate confidence level for a pattern match.
        
        Args:
            line: The line containing the match
            pattern: The regex pattern that matched
            category: The category of the pattern
            
        Returns:
            Confidence level between 0.0 and 1.0
        """
        confidence = 0.5  # Base confidence
        
        line_lower = line.lower().strip()
        
        # High confidence indicators
        if category == 'tracking_code':
            if any(high_conf in pattern for high_conf in ['gtag(', 'ga(', '_gaq.push', 'fbq(']):
                confidence = 0.9
            elif any(domain in pattern for domain in ['.com', '.io']):
                confidence = 0.8
        
        # Medium confidence for external requests
        if category == 'external_requests':
            if 'fetch(' in line_lower or 'axios.' in line_lower:
                confidence = 0.8
        
        # Lower confidence for generic patterns
        if len(pattern) < 10:  # Short patterns are less specific
            confidence *= 0.8
        
        # Boost confidence if in actual code (not comments)
        if not any(comment_indicator in line_lower for comment_indicator in 
                  ['//', '/*', '*/', '<!--', '-->']):
            confidence *= 1.2
        
        return min(1.0, confidence)
    
    def _check_eval_usage(self, file_path: str, ast) -> List[Dict[str, Any]]:
        """
        Check for eval() usage in JavaScript.
        
        Args:
            file_path: Path to the JavaScript file
            ast: Abstract syntax tree of the JavaScript file
            
        Returns:
            List of findings
        """
        findings = []
        
        # Function to recursively traverse the AST
        def traverse(node, parent=None):
            if not hasattr(node, 'type'):
                return
                
            if node.type == 'CallExpression' and hasattr(node, 'callee'):
                if hasattr(node.callee, 'name') and node.callee.name == 'eval':
                    findings.append({
                        'file': file_path,
                        'line': node.loc.start.line,
                        'column': node.loc.start.column,
                        'type': 'eval_usage',
                        'severity': 'warning',
                        'message': "Use of eval() detected, which can lead to code injection vulnerabilities",
                        'code': 'eval(...)'  # Simplified code representation
                    })
                elif hasattr(node.callee, 'type') and node.callee.type == 'MemberExpression':
                    if hasattr(node.callee, 'property') and hasattr(node.callee.property, 'name') and node.callee.property.name == 'eval':
                        findings.append({
                            'file': file_path,
                            'line': node.loc.start.line,
                            'column': node.loc.start.column,
                            'type': 'eval_usage',
                            'severity': 'warning',
                            'message': "Use of indirect eval() detected, which can lead to code injection vulnerabilities",
                            'code': 'obj.eval(...)'  # Simplified code representation
                        })
            
            # Recursively traverse child nodes
            for key, value in vars(node).items():
                if isinstance(value, dict) and 'type' in value:
                    traverse(value, node)
                elif isinstance(value, list):
                    for child in value:
                        if isinstance(child, dict) and 'type' in child:
                            traverse(child, node)
        
        # Start traversal from the root
        traverse(ast)
        
        return findings
    
    def _check_local_storage_usage(self, file_path: str, ast) -> List[Dict[str, Any]]:
        """
        Check for localStorage usage in JavaScript.
        
        Args:
            file_path: Path to the JavaScript file
            ast: Abstract syntax tree of the JavaScript file
            
        Returns:
            List of findings
        """
        findings = []
        
        # Function to recursively traverse the AST
        def traverse(node, parent=None):
            if node.type == 'MemberExpression' and hasattr(node, 'object') and hasattr(node, 'property'):
                if hasattr(node.object, 'name') and node.object.name == 'localStorage':
                    # This is not a security issue, just tracking usage
                    method = node.property.name if hasattr(node.property, 'name') else 'unknown'
                    findings.append({
                        'file': file_path,
                        'line': node.loc.start.line,
                        'column': node.loc.start.column,
                        'type': 'local_storage_usage',
                        'severity': 'info',
                        'message': f"localStorage.{method} usage detected",
                        'code': f'localStorage.{method}'  # Simplified code representation
                    })
            
            # Recursively traverse child nodes
            for key in node:
                if isinstance(node[key], dict) and 'type' in node[key]:
                    traverse(node[key], node)
                elif isinstance(node[key], list):
                    for child in node[key]:
                        if isinstance(child, dict) and 'type' in child:
                            traverse(child, node)
        
        # Start traversal from the root
        traverse(ast)
        
        return findings
    
    def _check_api_key_handling(self, file_path: str, ast) -> List[Dict[str, Any]]:
        """
        Check for API key handling in JavaScript.
        
        Args:
            file_path: Path to the JavaScript file
            ast: Abstract syntax tree of the JavaScript file
            
        Returns:
            List of findings
        """
        findings = []
        
        # Function to recursively traverse the AST
        def traverse(node, parent=None):
            # Check for API key in string literals
            if node.type == 'Literal' and hasattr(node, 'value') and isinstance(node.value, str):
                value = node.value.lower()
                if ('api' in value and 'key' in value) or 'apikey' in value:
                    if re.match(r'sk-[a-zA-Z0-9]{48}', node.value):  # OpenAI API key pattern
                        findings.append({
                            'file': file_path,
                            'line': node.loc.start.line,
                            'column': node.loc.start.column,
                            'type': 'hardcoded_api_key',
                            'severity': 'critical',
                            'message': "Hardcoded API key detected",
                            'code': f'"{node.value[:10]}..."'  # Show only part of the key
                        })
            
            # Check for API key in variable names
            if node.type == 'VariableDeclarator' and hasattr(node, 'id') and hasattr(node.id, 'name'):
                name = node.id.name.lower()
                if ('api' in name and 'key' in name) or 'apikey' in name:
                    # This is not necessarily a security issue, just tracking usage
                    findings.append({
                        'file': file_path,
                        'line': node.loc.start.line,
                        'column': node.loc.start.column,
                        'type': 'api_key_variable',
                        'severity': 'info',
                        'message': f"API key variable detected: {node.id.name}",
                        'code': node.id.name
                    })
            
            # Recursively traverse child nodes
            for key in node:
                if isinstance(node[key], dict) and 'type' in node[key]:
                    traverse(node[key], node)
                elif isinstance(node[key], list):
                    for child in node[key]:
                        if isinstance(child, dict) and 'type' in child:
                            traverse(child, node)
        
        # Start traversal from the root
        traverse(ast)
        
        return findings
    
    def _check_encryption_usage(self, file_path: str, ast) -> List[Dict[str, Any]]:
        """
        Check for encryption usage in JavaScript.
        
        Args:
            file_path: Path to the JavaScript file
            ast: Abstract syntax tree of the JavaScript file
            
        Returns:
            List of findings
        """
        findings = []
        
        # Function to recursively traverse the AST
        def traverse(node, parent=None):
            # Check for encryption-related function calls
            if node.type == 'CallExpression' and hasattr(node, 'callee'):
                if hasattr(node.callee, 'property') and hasattr(node.callee.property, 'name'):
                    method = node.callee.property.name.lower()
                    if method in ['encrypt', 'decrypt', 'hash', 'sign', 'verify']:
                        # This is not a security issue, just tracking usage
                        findings.append({
                            'file': file_path,
                            'line': node.loc.start.line,
                            'column': node.loc.start.column,
                            'type': 'encryption_usage',
                            'severity': 'info',
                            'message': f"Encryption method detected: {method}",
                            'code': f'obj.{method}(...)'  # Simplified code representation
                        })
            
            # Recursively traverse child nodes
            for key in node:
                if isinstance(node[key], dict) and 'type' in node[key]:
                    traverse(node[key], node)
                elif isinstance(node[key], list):
                    for child in node[key]:
                        if isinstance(child, dict) and 'type' in child:
                            traverse(child, node)
        
        # Start traversal from the root
        traverse(ast)
        
        return findings
    
    def _analyze_patterns(self) -> None:
        """
        Analyze the patterns found and categorize them into security and privacy issues.
        """
        # Check for tracking code
        if 'tracking_code' in self.results['patterns_found']:
            for pattern in self.results['patterns_found']['tracking_code']:
                self.results['privacy_issues'].append({
                    'type': 'tracking_code',
                    'severity': 'high',
                    'message': f"Tracking code detected in {pattern['file']} at line {pattern['line']}",
                    'details': pattern['match']
                })
        
        # Check for external requests
        if 'external_requests' in self.results['patterns_found']:
            for pattern in self.results['patterns_found']['external_requests']:
                self.results['privacy_issues'].append({
                    'type': 'external_request',
                    'severity': 'medium',
                    'message': f"External request detected in {pattern['file']} at line {pattern['line']}",
                    'details': pattern['match']
                })
        
        # Check for API key storage
        if 'api_key_storage' in self.results['patterns_found']:
            # This is expected behavior, not an issue
            pass
        
        # Check for encryption usage
        if 'encryption_usage' in self.results['patterns_found']:
            # This is expected behavior, not an issue
            pass
        
        # Check for hardcoded API keys
        hardcoded_api_keys = [f for f in self.results['findings'] if f['type'] == 'hardcoded_api_key']
        if hardcoded_api_keys:
            for finding in hardcoded_api_keys:
                self.results['security_issues'].append({
                    'type': 'hardcoded_api_key',
                    'severity': 'critical',
                    'message': f"Hardcoded API key detected in {finding['file']} at line {finding['line']}",
                    'details': finding['code']
                })
        
        # Check for eval usage
        eval_usage = [f for f in self.results['findings'] if f['type'] == 'eval_usage']
        if eval_usage:
            for finding in eval_usage:
                self.results['security_issues'].append({
                    'type': 'eval_usage',
                    'severity': 'high',
                    'message': f"Use of eval() detected in {finding['file']} at line {finding['line']}",
                    'details': finding['code']
                })
    
    def _calculate_security_score(self) -> None:
        """
        Calculate a security score based on the findings with weighted confidence.
        """
        # Start with a perfect score
        score = 100.0
        
        # Deduct points for security issues with confidence weighting
        for issue in self.results['security_issues']:
            confidence_multiplier = 1.0
            if 'confidence' in issue:
                confidence_multiplier = issue['confidence']
            
            if issue['severity'] == 'critical':
                score -= 20.0 * confidence_multiplier
            elif issue['severity'] == 'high':
                score -= 10.0 * confidence_multiplier
            elif issue['severity'] == 'medium':
                score -= 5.0 * confidence_multiplier
            elif issue['severity'] == 'low':
                score -= 2.0 * confidence_multiplier
        
        # Deduct points for privacy issues with confidence weighting
        for issue in self.results['privacy_issues']:
            confidence_multiplier = 1.0
            if 'confidence' in issue:
                confidence_multiplier = issue['confidence']
            
            if issue['severity'] == 'high':
                score -= 10.0 * confidence_multiplier
            elif issue['severity'] == 'medium':
                score -= 5.0 * confidence_multiplier
            elif issue['severity'] == 'low':
                score -= 2.0 * confidence_multiplier
        
        # Bonus points for good practices
        if len(self.results['security_issues']) == 0:
            score += 5.0  # Bonus for no security issues
        
        if len(self.results['privacy_issues']) == 0:
            score += 5.0  # Bonus for no privacy issues
        
        # Bonus for using encryption
        encryption_usage = [f for f in self.results['findings'] if f['type'] == 'encryption_usage']
        if len(encryption_usage) > 0:
            score += min(5.0, len(encryption_usage))
        
        # Ensure score is within bounds
        score = max(0.0, min(100.0, score))
        
        self.results['summary']['security_score'] = round(score, 1)
    
    def _generate_recommendations(self) -> None:
        """
        Generate recommendations based on the findings.
        """
        # Check for hardcoded API keys
        if any(issue['type'] == 'hardcoded_api_key' for issue in self.results['security_issues']):
            self.results['recommendations'].append({
                'type': 'hardcoded_api_key',
                'message': "Remove hardcoded API keys and store them securely in localStorage or environment variables",
                'priority': 'high'
            })
        
        # Check for eval usage
        if any(issue['type'] == 'eval_usage' for issue in self.results['security_issues']):
            self.results['recommendations'].append({
                'type': 'eval_usage',
                'message': "Avoid using eval() as it can lead to code injection vulnerabilities. Use safer alternatives.",
                'priority': 'high'
            })
        
        # Check for tracking code
        if any(issue['type'] == 'tracking_code' for issue in self.results['privacy_issues']):
            self.results['recommendations'].append({
                'type': 'tracking_code',
                'message': "Remove tracking code to maintain privacy claims",
                'priority': 'high'
            })
        
        # Check for external requests
        if any(issue['type'] == 'external_request' for issue in self.results['privacy_issues']):
            self.results['recommendations'].append({
                'type': 'external_request',
                'message': "Minimize external requests to reduce privacy risks. Host dependencies locally.",
                'priority': 'medium'
            })
