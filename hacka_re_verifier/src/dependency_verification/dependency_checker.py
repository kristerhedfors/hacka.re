"""
Dependency verification for hacka.re project.
Checks for local hosting of dependencies and potential vulnerabilities.
"""

import os
import re
import json
import logging
import hashlib
from pathlib import Path
from typing import Dict, List, Any, Optional, Set, Tuple
from bs4 import BeautifulSoup

logger = logging.getLogger('hacka_re_verifier.dependency_verification')


class DependencyChecker:
    """Dependency checker for hacka.re project."""
    
    def __init__(self, config):
        """
        Initialize the dependency checker.
        
        Args:
            config: Configuration object
        """
        self.config = config
        self.required_local_libs = config.get('modules.dependency_verification.required_local_libs', [])
        self.check_external_requests = config.get('modules.dependency_verification.check_external_requests', True)
        self.check_integrity = config.get('modules.dependency_verification.check_integrity', True)
        self.check_vulnerabilities = config.get('modules.dependency_verification.check_vulnerabilities', True)
        
        self.results = {
            'summary': {
                'total_dependencies': 0,
                'local_dependencies': 0,
                'external_dependencies': 0,
                'missing_dependencies': 0,
                'vulnerable_dependencies': 0,
                'dependency_score': 0.0
            },
            'dependencies': [],
            'dependency_issues': [],
            'recommendations': []
        }
    
    def analyze(self, project_path: str) -> Dict[str, Any]:
        """
        Analyze the dependencies of the hacka.re project.
        
        Args:
            project_path: Path to the hacka.re project
            
        Returns:
            Dictionary containing analysis results
        """
        logger.info(f"Starting dependency verification of project at: {project_path}")
        
        # Find all HTML files
        html_files = self._find_html_files(project_path)
        logger.info(f"Found {len(html_files)} HTML files to analyze")
        
        # Analyze each HTML file for dependencies
        for html_file in html_files:
            self._analyze_html_file(html_file)
        
        # Check for required local libraries
        self._check_required_local_libs(project_path)
        
        # Check for external requests in JavaScript files
        if self.check_external_requests:
            self._check_external_requests(project_path)
        
        # Check for integrity of local dependencies
        if self.check_integrity:
            self._check_integrity(project_path)
        
        # Check for vulnerabilities in dependencies
        if self.check_vulnerabilities:
            self._check_vulnerabilities(project_path)
        
        # Update summary
        self.results['summary']['total_dependencies'] = len(self.results['dependencies'])
        self.results['summary']['local_dependencies'] = sum(1 for d in self.results['dependencies'] if d['location'] == 'local')
        self.results['summary']['external_dependencies'] = sum(1 for d in self.results['dependencies'] if d['location'] == 'external')
        self.results['summary']['missing_dependencies'] = sum(1 for d in self.results['dependencies'] if d['location'] == 'missing')
        self.results['summary']['vulnerable_dependencies'] = sum(1 for d in self.results['dependencies'] if d.get('vulnerable', False))
        
        # Calculate dependency score
        self._calculate_dependency_score()
        
        # Generate recommendations
        self._generate_recommendations()
        
        logger.info(f"Dependency verification completed. Found {len(self.results['dependency_issues'])} issues.")
        return self.results
    
    def _find_html_files(self, project_path: str) -> List[str]:
        """
        Find all HTML files in the project.
        
        Args:
            project_path: Path to the hacka.re project
            
        Returns:
            List of HTML file paths
        """
        html_files = []
        for root, _, files in os.walk(project_path):
            for file in files:
                if file.endswith('.html'):
                    html_files.append(os.path.join(root, file))
        return html_files
    
    def _analyze_html_file(self, html_file: str) -> None:
        """
        Analyze an HTML file for dependencies.
        
        Args:
            html_file: Path to the HTML file
        """
        logger.debug(f"Analyzing HTML file: {html_file}")
        
        try:
            with open(html_file, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            # Parse HTML
            soup = BeautifulSoup(content, 'html.parser')
            
            # Find script tags
            script_tags = soup.find_all('script')
            for script in script_tags:
                self._analyze_script_tag(script, html_file)
            
            # Find link tags (CSS)
            link_tags = soup.find_all('link', rel='stylesheet')
            for link in link_tags:
                self._analyze_link_tag(link, html_file)
        except Exception as e:
            logger.error(f"Error analyzing HTML file {html_file}: {e}")
    
    def _analyze_script_tag(self, script_tag, html_file: str) -> None:
        """
        Analyze a script tag for dependencies.
        
        Args:
            script_tag: BeautifulSoup script tag
            html_file: Path to the HTML file
        """
        src = script_tag.get('src')
        if src:
            # Determine if it's a local or external dependency
            if src.startswith(('http://', 'https://', '//')):
                location = 'external'
                path = src
                
                # Add as a dependency issue
                issue = {
                    'type': 'external_script',
                    'severity': 'high',
                    'message': f"External script dependency detected in {os.path.basename(html_file)}: {src}",
                    'details': {
                        'file': html_file,
                        'src': src
                    }
                }
                self.results['dependency_issues'].append(issue)
            else:
                location = 'local'
                # Get the absolute path to the dependency
                if src.startswith('/'):
                    # Absolute path from project root
                    path = os.path.normpath(os.path.join(os.path.dirname(html_file), src.lstrip('/')))
                else:
                    # Relative path from HTML file
                    path = os.path.normpath(os.path.join(os.path.dirname(html_file), src))
                
                # Check if the file exists
                if not os.path.exists(path):
                    location = 'missing'
                    
                    # Add as a dependency issue
                    issue = {
                        'type': 'missing_script',
                        'severity': 'high',
                        'message': f"Missing script dependency detected in {os.path.basename(html_file)}: {src}",
                        'details': {
                            'file': html_file,
                            'src': src,
                            'expected_path': path
                        }
                    }
                    self.results['dependency_issues'].append(issue)
            
            # Extract library name from path
            library_name = self._extract_library_name(src)
            
            # Add to dependencies
            dependency = {
                'type': 'script',
                'name': library_name,
                'path': src,
                'location': location,
                'file': html_file
            }
            
            # Check if this dependency is already in the list
            if not any(d['path'] == src and d['file'] == html_file for d in self.results['dependencies']):
                self.results['dependencies'].append(dependency)
    
    def _analyze_link_tag(self, link_tag, html_file: str) -> None:
        """
        Analyze a link tag for dependencies.
        
        Args:
            link_tag: BeautifulSoup link tag
            html_file: Path to the HTML file
        """
        href = link_tag.get('href')
        if href:
            # Determine if it's a local or external dependency
            if href.startswith(('http://', 'https://', '//')):
                location = 'external'
                path = href
                
                # Add as a dependency issue
                issue = {
                    'type': 'external_css',
                    'severity': 'medium',
                    'message': f"External CSS dependency detected in {os.path.basename(html_file)}: {href}",
                    'details': {
                        'file': html_file,
                        'href': href
                    }
                }
                self.results['dependency_issues'].append(issue)
            else:
                location = 'local'
                # Get the absolute path to the dependency
                if href.startswith('/'):
                    # Absolute path from project root
                    path = os.path.normpath(os.path.join(os.path.dirname(html_file), href.lstrip('/')))
                else:
                    # Relative path from HTML file
                    path = os.path.normpath(os.path.join(os.path.dirname(html_file), href))
                
                # Check if the file exists
                if not os.path.exists(path):
                    location = 'missing'
                    
                    # Add as a dependency issue
                    issue = {
                        'type': 'missing_css',
                        'severity': 'medium',
                        'message': f"Missing CSS dependency detected in {os.path.basename(html_file)}: {href}",
                        'details': {
                            'file': html_file,
                            'href': href,
                            'expected_path': path
                        }
                    }
                    self.results['dependency_issues'].append(issue)
            
            # Extract library name from path
            library_name = self._extract_library_name(href)
            
            # Add to dependencies
            dependency = {
                'type': 'css',
                'name': library_name,
                'path': href,
                'location': location,
                'file': html_file
            }
            
            # Check if this dependency is already in the list
            if not any(d['path'] == href and d['file'] == html_file for d in self.results['dependencies']):
                self.results['dependencies'].append(dependency)
    
    def _extract_library_name(self, path: str) -> str:
        """
        Extract library name from a path.
        
        Args:
            path: Path to the library
            
        Returns:
            Library name
        """
        # Try to extract library name from path
        # Examples:
        # - lib/marked/marked.min.js -> marked
        # - https://cdnjs.cloudflare.com/ajax/libs/marked/2.0.0/marked.min.js -> marked
        
        # First, get the filename
        filename = os.path.basename(path)
        
        # Remove extension
        name = os.path.splitext(filename)[0]
        
        # Remove version number and .min suffix
        name = re.sub(r'[\.-]min$', '', name)
        name = re.sub(r'[\.-]v?\d+(\.\d+)*$', '', name)
        
        # If the path contains a library name in a directory, use that instead
        path_parts = path.split('/')
        for i, part in enumerate(path_parts):
            if part == 'lib' or part == 'libs' or part == 'vendor':
                if i + 1 < len(path_parts):
                    return path_parts[i + 1]
        
        # Common library names to check
        common_libs = [
            'jquery', 'bootstrap', 'react', 'vue', 'angular', 'lodash', 'moment',
            'marked', 'dompurify', 'highlight', 'fontawesome', 'font-awesome',
            'tweetnacl', 'nacl', 'crypto', 'qrcode'
        ]
        
        for lib in common_libs:
            if lib in path.lower():
                return lib
        
        return name
    
    def _check_required_local_libs(self, project_path: str) -> None:
        """
        Check if required local libraries are present.
        
        Args:
            project_path: Path to the hacka.re project
        """
        for lib in self.required_local_libs:
            # Check if the library is in the dependencies list
            lib_deps = [d for d in self.results['dependencies'] if d['name'].lower() == lib.lower()]
            
            if not lib_deps:
                # Check if the library exists in the lib directory
                lib_dir = os.path.join(project_path, 'lib', lib)
                if os.path.exists(lib_dir):
                    # Library exists but is not referenced in HTML files
                    logger.info(f"Library {lib} exists in lib directory but is not referenced in HTML files")
                else:
                    # Library is missing
                    issue = {
                        'type': 'missing_required_lib',
                        'severity': 'high',
                        'message': f"Required local library {lib} is missing",
                        'details': {
                            'library': lib,
                            'expected_path': lib_dir
                        }
                    }
                    self.results['dependency_issues'].append(issue)
            else:
                # Check if all instances of the library are local
                external_libs = [d for d in lib_deps if d['location'] == 'external']
                if external_libs:
                    # Library is referenced from external source
                    for ext_lib in external_libs:
                        issue = {
                            'type': 'external_required_lib',
                            'severity': 'high',
                            'message': f"Required library {lib} is referenced from external source: {ext_lib['path']}",
                            'details': {
                                'library': lib,
                                'path': ext_lib['path'],
                                'file': ext_lib['file']
                            }
                        }
                        self.results['dependency_issues'].append(issue)
    
    def _check_external_requests(self, project_path: str) -> None:
        """
        Check for external requests in JavaScript files.
        
        Args:
            project_path: Path to the hacka.re project
        """
        # Find all JavaScript files
        js_files = []
        for root, _, files in os.walk(project_path):
            for file in files:
                if file.endswith('.js'):
                    js_files.append(os.path.join(root, file))
        
        # Patterns to look for
        patterns = [
            (r'fetch\([\'"]https?://', 'fetch'),
            (r'\.ajax\(\s*{\s*url\s*:\s*[\'"]https?://', 'jQuery.ajax'),
            (r'\.get\([\'"]https?://', 'jQuery.get'),
            (r'\.post\([\'"]https?://', 'jQuery.post'),
            (r'new XMLHttpRequest\(\s*\)\s*\.open\([\'"]GET[\'"],\s*[\'"]https?://', 'XMLHttpRequest'),
            (r'new XMLHttpRequest\(\s*\)\s*\.open\([\'"]POST[\'"],\s*[\'"]https?://', 'XMLHttpRequest'),
            (r'axios\.get\([\'"]https?://', 'axios.get'),
            (r'axios\.post\([\'"]https?://', 'axios.post'),
            (r'src\s*=\s*[\'"]https?://', 'src attribute')
        ]
        
        # Allowed domains (API endpoints)
        allowed_domains = [
            'api.groq.com',
            'api.openai.com',
            'localhost',
            '127.0.0.1'
        ]
        
        # Check each JavaScript file
        for js_file in js_files:
            try:
                with open(js_file, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                
                for pattern, method in patterns:
                    for match in re.finditer(pattern, content):
                        # Extract the URL
                        line = content[match.start():match.start() + 100]  # Get 100 chars after match
                        url_match = re.search(r'https?://[^\'")\s]+', line)
                        if url_match:
                            url = url_match.group(0)
                            
                            # Check if it's an allowed domain
                            if not any(domain in url for domain in allowed_domains):
                                # Get line number
                                line_number = content[:match.start()].count('\n') + 1
                                
                                issue = {
                                    'type': 'external_request',
                                    'severity': 'high',
                                    'message': f"External request detected in {os.path.basename(js_file)} at line {line_number}: {url}",
                                    'details': {
                                        'file': js_file,
                                        'line': line_number,
                                        'url': url,
                                        'method': method
                                    }
                                }
                                self.results['dependency_issues'].append(issue)
            except Exception as e:
                logger.error(f"Error checking external requests in {js_file}: {e}")
    
    def _check_integrity(self, project_path: str) -> None:
        """
        Check the integrity of local dependencies.
        
        Args:
            project_path: Path to the hacka.re project
        """
        # Check each local dependency
        for dependency in self.results['dependencies']:
            if dependency['location'] == 'local':
                # Get the absolute path to the dependency
                if dependency['path'].startswith('/'):
                    # Absolute path from project root
                    path = os.path.normpath(os.path.join(project_path, dependency['path'].lstrip('/')))
                else:
                    # Relative path from HTML file
                    path = os.path.normpath(os.path.join(os.path.dirname(dependency['file']), dependency['path']))
                
                # Check if the file exists
                if os.path.exists(path):
                    # Calculate file hash
                    file_hash = self._calculate_file_hash(path)
                    dependency['hash'] = file_hash
                    
                    # Check for minified files
                    if '.min.' in path:
                        # Check if there's a non-minified version
                        non_min_path = path.replace('.min.', '.')
                        if os.path.exists(non_min_path):
                            # Compare file sizes
                            min_size = os.path.getsize(path)
                            non_min_size = os.path.getsize(non_min_path)
                            
                            if min_size > non_min_size:
                                # Minified file is larger than non-minified
                                issue = {
                                    'type': 'suspicious_minified_file',
                                    'severity': 'medium',
                                    'message': f"Suspicious minified file: {os.path.basename(path)} is larger than its non-minified version",
                                    'details': {
                                        'file': path,
                                        'minified_size': min_size,
                                        'non_minified_size': non_min_size,
                                        'difference': min_size - non_min_size
                                    }
                                }
                                self.results['dependency_issues'].append(issue)
    
    def _check_vulnerabilities(self, project_path: str) -> None:
        """
        Check for vulnerabilities in dependencies.
        
        Args:
            project_path: Path to the hacka.re project
        """
        # This is a simplified vulnerability check
        # In a real-world scenario, you would use a vulnerability database
        
        # Known vulnerable versions (simplified)
        vulnerable_versions = {
            'jquery': ['1.', '2.0', '2.1', '2.2', '3.0', '3.1', '3.2', '3.3.0', '3.4.0'],
            'bootstrap': ['2.', '3.0', '3.1', '3.2', '3.3', '4.0', '4.1'],
            'marked': ['0.', '1.', '2.0.0', '2.0.1'],
            'lodash': ['4.17.0', '4.17.1', '4.17.2', '4.17.3', '4.17.4', '4.17.5', '4.17.10', '4.17.11', '4.17.15', '4.17.19']
        }
        
        # Check each dependency
        for dependency in self.results['dependencies']:
            name = dependency['name'].lower()
            path = dependency['path']
            
            # Extract version from path
            version_match = re.search(r'[\.-]v?(\d+\.\d+\.\d+|\d+\.\d+|\d+)', path)
            if version_match:
                version = version_match.group(1)
                dependency['version'] = version
                
                # Check if it's a known vulnerable version
                if name in vulnerable_versions:
                    for vuln_version in vulnerable_versions[name]:
                        if version.startswith(vuln_version):
                            dependency['vulnerable'] = True
                            
                            issue = {
                                'type': 'vulnerable_dependency',
                                'severity': 'critical',
                                'message': f"Vulnerable dependency detected: {name} version {version}",
                                'details': {
                                    'library': name,
                                    'version': version,
                                    'path': path,
                                    'file': dependency['file']
                                }
                            }
                            self.results['dependency_issues'].append(issue)
                            break
    
    def _calculate_file_hash(self, file_path: str) -> str:
        """
        Calculate the SHA-256 hash of a file.
        
        Args:
            file_path: Path to the file
            
        Returns:
            SHA-256 hash of the file
        """
        try:
            with open(file_path, 'rb') as f:
                file_hash = hashlib.sha256()
                chunk = f.read(8192)
                while chunk:
                    file_hash.update(chunk)
                    chunk = f.read(8192)
                return file_hash.hexdigest()
        except Exception as e:
            logger.error(f"Error calculating hash for {file_path}: {e}")
            return ''
    
    def _calculate_dependency_score(self) -> None:
        """
        Calculate a dependency score based on the findings.
        """
        # Start with a perfect score
        score = 100.0
        
        # Deduct points for dependency issues
        for issue in self.results['dependency_issues']:
            if issue['severity'] == 'critical':
                score -= 20.0
            elif issue['severity'] == 'high':
                score -= 10.0
            elif issue['severity'] == 'medium':
                score -= 5.0
            elif issue['severity'] == 'low':
                score -= 2.0
        
        # Deduct points for external dependencies
        external_percentage = 0
        if self.results['summary']['total_dependencies'] > 0:
            external_percentage = (self.results['summary']['external_dependencies'] / self.results['summary']['total_dependencies']) * 100
        
        if external_percentage > 75:
            score -= 30.0
        elif external_percentage > 50:
            score -= 20.0
        elif external_percentage > 25:
            score -= 10.0
        elif external_percentage > 0:
            score -= 5.0
        
        # Deduct points for missing dependencies
        missing_percentage = 0
        if self.results['summary']['total_dependencies'] > 0:
            missing_percentage = (self.results['summary']['missing_dependencies'] / self.results['summary']['total_dependencies']) * 100
        
        if missing_percentage > 50:
            score -= 20.0
        elif missing_percentage > 25:
            score -= 10.0
        elif missing_percentage > 10:
            score -= 5.0
        elif missing_percentage > 0:
            score -= 2.0
        
        # Deduct points for vulnerable dependencies
        vulnerable_percentage = 0
        if self.results['summary']['total_dependencies'] > 0:
            vulnerable_percentage = (self.results['summary']['vulnerable_dependencies'] / self.results['summary']['total_dependencies']) * 100
        
        if vulnerable_percentage > 0:
            score -= 30.0  # Any vulnerable dependency is a serious issue
        
        # Ensure score is not negative
        score = max(0.0, score)
        
        self.results['summary']['dependency_score'] = round(score, 1)
    
    def _generate_recommendations(self) -> None:
        """
        Generate recommendations based on the findings.
        """
        # Check for external dependencies
        if self.results['summary']['external_dependencies'] > 0:
            self.results['recommendations'].append({
                'type': 'external_dependencies',
                'message': "Host all dependencies locally to prevent external requests and tracking",
                'priority': 'high'
            })
        
        # Check for missing dependencies
        if self.results['summary']['missing_dependencies'] > 0:
            self.results['recommendations'].append({
                'type': 'missing_dependencies',
                'message': "Fix missing dependencies to ensure proper functionality",
                'priority': 'high'
            })
        
        # Check for vulnerable dependencies
        if self.results['summary']['vulnerable_dependencies'] > 0:
            self.results['recommendations'].append({
                'type': 'vulnerable_dependencies',
                'message': "Update vulnerable dependencies to their latest secure versions",
                'priority': 'critical'
            })
        
        # Check for external requests
        if any(issue['type'] == 'external_request' for issue in self.results['dependency_issues']):
            self.results['recommendations'].append({
                'type': 'external_requests',
                'message': "Remove or replace external requests to prevent data leakage",
                'priority': 'high'
            })
        
        # Check for suspicious minified files
        if any(issue['type'] == 'suspicious_minified_file' for issue in self.results['dependency_issues']):
            self.results['recommendations'].append({
                'type': 'suspicious_minified_files',
                'message': "Review suspicious minified files for potential security issues",
                'priority': 'medium'
            })
        
        # General recommendations
        self.results['recommendations'].append({
            'type': 'general',
            'message': "Implement Subresource Integrity (SRI) for all dependencies",
            'priority': 'medium'
        })
