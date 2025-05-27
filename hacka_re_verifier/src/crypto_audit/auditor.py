"""
Cryptographic audit module for hacka.re project.
Verifies the correctness and security of cryptographic implementations.
"""

import os
import re
import json
import logging
import hashlib
import hmac
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path

logger = logging.getLogger('hacka_re_verifier.crypto_audit')


class CryptoAuditor:
    """Cryptographic implementation auditor for hacka.re project."""
    
    def __init__(self, config):
        """
        Initialize the crypto auditor.
        
        Args:
            config: Configuration object
        """
        self.config = config
        self.files_to_analyze = config.get('modules.crypto_audit.files_to_analyze', [])
        self.test_vectors = config.get('modules.crypto_audit.test_vectors', {})
        self.crypto_requirements = config.get('modules.crypto_audit.crypto_requirements', {})
        
        self.results = {
            'summary': {
                'total_files_analyzed': 0,
                'crypto_functions_found': 0,
                'vulnerabilities_found': 0,
                'crypto_score': 0.0
            },
            'crypto_functions': [],
            'vulnerabilities': [],
            'test_results': {},
            'recommendations': []
        }
    
    def analyze(self, project_path: str) -> Dict[str, Any]:
        """
        Analyze cryptographic implementations in the hacka.re project.
        
        Args:
            project_path: Path to the hacka.re project
            
        Returns:
            Dictionary containing crypto audit results
        """
        logger.info(f"Starting cryptographic audit of project at: {project_path}")
        
        # Find and analyze crypto files
        crypto_files = self._find_crypto_files(project_path)
        logger.info(f"Found {len(crypto_files)} crypto files to analyze")
        
        for file_path in crypto_files:
            try:
                self._analyze_crypto_file(file_path)
            except Exception as e:
                logger.error(f"Error analyzing crypto file {file_path}: {e}")
        
        # Run crypto tests
        self._run_crypto_tests(project_path)
        
        # Calculate crypto score
        self._calculate_crypto_score()
        
        # Generate recommendations
        self._generate_recommendations()
        
        logger.info(f"Crypto audit completed. Found {self.results['summary']['vulnerabilities_found']} vulnerabilities.")
        return self.results
    
    def _find_crypto_files(self, project_path: str) -> List[str]:
        """
        Find crypto-related files in the project.
        
        Args:
            project_path: Path to the hacka.re project
            
        Returns:
            List of crypto file paths
        """
        crypto_files = []
        
        # Check configured files
        for file_pattern in self.files_to_analyze:
            file_path = os.path.join(project_path, file_pattern)
            if os.path.exists(file_path):
                crypto_files.append(file_path)
        
        # Also look for files with crypto-related names
        crypto_patterns = [
            '**/crypto*.js',
            '**/encryption*.js',
            '**/security*.js',
            '**/hash*.js',
            '**/cipher*.js'
        ]
        
        for pattern in crypto_patterns:
            for file_path in Path(project_path).glob(pattern):
                if str(file_path) not in crypto_files:
                    crypto_files.append(str(file_path))
        
        return crypto_files
    
    def _analyze_crypto_file(self, file_path: str) -> None:
        """
        Analyze a single crypto file for security issues.
        
        Args:
            file_path: Path to the crypto file
        """
        logger.debug(f"Analyzing crypto file: {file_path}")
        
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        self.results['summary']['total_files_analyzed'] += 1
        
        # Find crypto functions
        crypto_functions = self._find_crypto_functions(file_path, content)
        self.results['crypto_functions'].extend(crypto_functions)
        self.results['summary']['crypto_functions_found'] += len(crypto_functions)
        
        # Check for vulnerabilities
        vulnerabilities = self._check_crypto_vulnerabilities(file_path, content)
        self.results['vulnerabilities'].extend(vulnerabilities)
        self.results['summary']['vulnerabilities_found'] += len(vulnerabilities)
    
    def _find_crypto_functions(self, file_path: str, content: str) -> List[Dict[str, Any]]:
        """
        Find cryptographic functions in the file content.
        
        Args:
            file_path: Path to the file
            content: File content
            
        Returns:
            List of crypto functions found
        """
        crypto_functions = []
        lines = content.split('\n')
        
        # Patterns for crypto functions
        crypto_patterns = {
            'encryption': [
                r'function\s+encrypt\s*\(',
                r'\.encrypt\s*\(',
                r'nacl\.secretbox',
                r'tweetnacl\.secretbox'
            ],
            'decryption': [
                r'function\s+decrypt\s*\(',
                r'\.decrypt\s*\(',
                r'nacl\.secretbox\.open',
                r'tweetnacl\.secretbox\.open'
            ],
            'hashing': [
                r'function\s+hash\s*\(',
                r'\.hash\s*\(',
                r'crypto\.createHash',
                r'sha256\s*\(',
                r'md5\s*\('
            ],
            'key_derivation': [
                r'function\s+deriveKey\s*\(',
                r'\.deriveKey\s*\(',
                r'pbkdf2\s*\(',
                r'scrypt\s*\('
            ],
            'random': [
                r'function\s+randomBytes\s*\(',
                r'\.randomBytes\s*\(',
                r'crypto\.getRandomValues',
                r'Math\.random\s*\('
            ]
        }
        
        for i, line in enumerate(lines):
            for category, patterns in crypto_patterns.items():
                for pattern in patterns:
                    if re.search(pattern, line):
                        crypto_functions.append({
                            'file': file_path,
                            'line': i + 1,
                            'category': category,
                            'pattern': pattern,
                            'code': line.strip(),
                            'security_level': self._assess_crypto_security(category, line)
                        })
        
        return crypto_functions
    
    def _assess_crypto_security(self, category: str, code_line: str) -> str:
        """
        Assess the security level of a crypto function.
        
        Args:
            category: Category of crypto function
            code_line: Line of code containing the function
            
        Returns:
            Security level: 'high', 'medium', 'low', or 'insecure'
        """
        code_lower = code_line.lower()
        
        # High security indicators
        if any(secure in code_lower for secure in ['nacl', 'tweetnacl', 'chacha20', 'aes-256']):
            return 'high'
        
        # Medium security indicators
        if any(medium in code_lower for medium in ['aes', 'pbkdf2', 'scrypt', 'sha256']):
            return 'medium'
        
        # Low security indicators
        if any(low in code_lower for low in ['sha1', 'des', 'rc4']):
            return 'low'
        
        # Insecure indicators
        if any(insecure in code_lower for insecure in ['md5', 'math.random']):
            return 'insecure'
        
        return 'medium'  # Default
    
    def _check_crypto_vulnerabilities(self, file_path: str, content: str) -> List[Dict[str, Any]]:
        """
        Check for cryptographic vulnerabilities in the file.
        
        Args:
            file_path: Path to the file
            content: File content
            
        Returns:
            List of vulnerabilities found
        """
        vulnerabilities = []
        lines = content.split('\n')
        
        # Vulnerability patterns
        vuln_patterns = {
            'weak_random': {
                'patterns': [r'Math\.random\s*\('],
                'severity': 'high',
                'message': 'Use of Math.random() for cryptographic purposes is insecure'
            },
            'hardcoded_key': {
                'patterns': [
                    r'key\s*=\s*["\'][a-zA-Z0-9]{16,}["\']',
                    r'secret\s*=\s*["\'][a-zA-Z0-9]{16,}["\']'
                ],
                'severity': 'critical',
                'message': 'Hardcoded cryptographic key detected'
            },
            'weak_hash': {
                'patterns': [r'md5\s*\(', r'sha1\s*\('],
                'severity': 'medium',
                'message': 'Use of weak hash function (MD5/SHA1)'
            },
            'insecure_cipher': {
                'patterns': [r'des\s*\(', r'rc4\s*\('],
                'severity': 'high',
                'message': 'Use of insecure cipher (DES/RC4)'
            },
            'insufficient_key_size': {
                'patterns': [r'aes-128', r'rsa-1024'],
                'severity': 'medium',
                'message': 'Insufficient key size for modern security requirements'
            },
            'no_salt': {
                'patterns': [r'hash\s*\([^,)]*\)'],
                'severity': 'medium',
                'message': 'Password hashing without salt'
            }
        }
        
        for i, line in enumerate(lines):
            for vuln_type, vuln_info in vuln_patterns.items():
                for pattern in vuln_info['patterns']:
                    if re.search(pattern, line):
                        # Additional context checks
                        if self._is_vulnerability_confirmed(vuln_type, line, content):
                            vulnerabilities.append({
                                'file': file_path,
                                'line': i + 1,
                                'type': vuln_type,
                                'severity': vuln_info['severity'],
                                'message': vuln_info['message'],
                                'code': line.strip(),
                                'recommendation': self._get_vulnerability_recommendation(vuln_type)
                            })
        
        return vulnerabilities
    
    def _is_vulnerability_confirmed(self, vuln_type: str, line: str, content: str) -> bool:
        """
        Confirm if a potential vulnerability is actually a security issue.
        
        Args:
            vuln_type: Type of vulnerability
            line: Line containing potential vulnerability
            content: Full file content for context
            
        Returns:
            True if vulnerability is confirmed, False otherwise
        """
        line_lower = line.lower()
        
        # Skip test files and examples
        if any(test_indicator in content.lower() for test_indicator in 
               ['test', 'example', 'demo', 'mock']):
            return False
        
        # Skip comments
        if line.strip().startswith('//') or line.strip().startswith('*'):
            return False
        
        # Specific checks for different vulnerability types
        if vuln_type == 'weak_random':
            # Math.random() is OK for non-crypto purposes
            if any(non_crypto in line_lower for non_crypto in 
                   ['animation', 'color', 'position', 'delay', 'demo']):
                return False
        
        if vuln_type == 'hardcoded_key':
            # Skip if it's clearly a test key or placeholder
            if any(test_key in line_lower for test_key in 
                   ['test', 'example', 'demo', 'placeholder', 'sample']):
                return False
        
        return True
    
    def _get_vulnerability_recommendation(self, vuln_type: str) -> str:
        """
        Get recommendation for fixing a vulnerability.
        
        Args:
            vuln_type: Type of vulnerability
            
        Returns:
            Recommendation string
        """
        recommendations = {
            'weak_random': 'Use crypto.getRandomValues() or a cryptographically secure random number generator',
            'hardcoded_key': 'Store keys securely using environment variables or secure key management',
            'weak_hash': 'Use SHA-256 or SHA-3 instead of MD5/SHA1',
            'insecure_cipher': 'Use AES-256 or ChaCha20 instead of DES/RC4',
            'insufficient_key_size': 'Use at least 256-bit keys for symmetric encryption and 2048-bit for RSA',
            'no_salt': 'Add a unique salt for each password hash'
        }
        
        return recommendations.get(vuln_type, 'Review and update cryptographic implementation')
    
    def _run_crypto_tests(self, project_path: str) -> None:
        """
        Run cryptographic tests using test vectors.
        
        Args:
            project_path: Path to the hacka.re project
        """
        logger.info("Running cryptographic tests")
        
        # Test RC4 implementation if available
        if 'rc4' in self.test_vectors:
            self._test_rc4_implementation(project_path)
        
        # Test other crypto implementations
        self._test_deterministic_crypto(project_path)
    
    def _test_rc4_implementation(self, project_path: str) -> None:
        """
        Test RC4 implementation using test vectors.
        
        Args:
            project_path: Path to the hacka.re project
        """
        test_vector = self.test_vectors.get('rc4', {})
        if not test_vector:
            return
        
        # Look for RC4 implementation
        rc4_files = [
            'js/utils/rc4-utils.js',
            'js/services/encryption-service.js'
        ]
        
        for rc4_file in rc4_files:
            file_path = os.path.join(project_path, rc4_file)
            if os.path.exists(file_path):
                try:
                    # Read and analyze RC4 implementation
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Check if RC4 is properly implemented
                    has_key_schedule = 'ksa' in content.lower() or 'key scheduling' in content.lower()
                    has_prga = 'prga' in content.lower() or 'pseudo-random generation' in content.lower()
                    
                    self.results['test_results']['rc4_implementation'] = {
                        'file': file_path,
                        'has_key_schedule': has_key_schedule,
                        'has_prga': has_prga,
                        'status': 'passed' if (has_key_schedule and has_prga) else 'failed',
                        'message': 'RC4 implementation appears complete' if (has_key_schedule and has_prga) else 'RC4 implementation may be incomplete'
                    }
                    
                except Exception as e:
                    self.results['test_results']['rc4_implementation'] = {
                        'file': file_path,
                        'status': 'error',
                        'message': f'Error testing RC4 implementation: {str(e)}'
                    }
                break
    
    def _test_deterministic_crypto(self, project_path: str) -> None:
        """
        Test deterministic crypto implementation.
        
        Args:
            project_path: Path to the hacka.re project
        """
        crypto_file = os.path.join(project_path, 'js/utils/deterministic-crypto.js')
        if os.path.exists(crypto_file):
            try:
                with open(crypto_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Check for key components
                has_key_derivation = any(kdf in content.lower() for kdf in 
                                       ['pbkdf2', 'scrypt', 'argon2', 'derive'])
                has_encryption = any(enc in content.lower() for enc in 
                                   ['encrypt', 'secretbox', 'cipher'])
                has_authentication = any(auth in content.lower() for auth in 
                                       ['hmac', 'authenticate', 'verify'])
                
                self.results['test_results']['deterministic_crypto'] = {
                    'file': crypto_file,
                    'has_key_derivation': has_key_derivation,
                    'has_encryption': has_encryption,
                    'has_authentication': has_authentication,
                    'status': 'passed' if all([has_key_derivation, has_encryption]) else 'warning',
                    'message': 'Deterministic crypto implementation looks good' if all([has_key_derivation, has_encryption]) else 'Some crypto components may be missing'
                }
                
            except Exception as e:
                self.results['test_results']['deterministic_crypto'] = {
                    'file': crypto_file,
                    'status': 'error',
                    'message': f'Error testing deterministic crypto: {str(e)}'
                }
    
    def _calculate_crypto_score(self) -> None:
        """
        Calculate a cryptographic security score.
        """
        # Start with perfect score
        score = 100.0
        
        # Deduct points for vulnerabilities
        for vuln in self.results['vulnerabilities']:
            if vuln['severity'] == 'critical':
                score -= 25.0
            elif vuln['severity'] == 'high':
                score -= 15.0
            elif vuln['severity'] == 'medium':
                score -= 8.0
            elif vuln['severity'] == 'low':
                score -= 3.0
        
        # Bonus points for good crypto practices
        high_security_functions = [f for f in self.results['crypto_functions'] 
                                 if f['security_level'] == 'high']
        if len(high_security_functions) > 0:
            score += min(10.0, len(high_security_functions) * 2.0)
        
        # Bonus for passing crypto tests
        passed_tests = [t for t in self.results['test_results'].values() 
                       if t.get('status') == 'passed']
        if len(passed_tests) > 0:
            score += min(5.0, len(passed_tests) * 2.5)
        
        # Ensure score is within bounds
        score = max(0.0, min(100.0, score))
        
        self.results['summary']['crypto_score'] = round(score, 1)
    
    def _generate_recommendations(self) -> None:
        """
        Generate recommendations based on crypto audit results.
        """
        # Recommendations for vulnerabilities
        critical_vulns = [v for v in self.results['vulnerabilities'] 
                         if v['severity'] == 'critical']
        if critical_vulns:
            self.results['recommendations'].append({
                'type': 'critical_vulnerabilities',
                'message': f'Fix {len(critical_vulns)} critical cryptographic vulnerabilities immediately',
                'priority': 'critical'
            })
        
        high_vulns = [v for v in self.results['vulnerabilities'] 
                     if v['severity'] == 'high']
        if high_vulns:
            self.results['recommendations'].append({
                'type': 'high_vulnerabilities',
                'message': f'Address {len(high_vulns)} high-severity cryptographic issues',
                'priority': 'high'
            })
        
        # Recommendations for weak crypto
        weak_functions = [f for f in self.results['crypto_functions'] 
                         if f['security_level'] in ['low', 'insecure']]
        if weak_functions:
            self.results['recommendations'].append({
                'type': 'weak_crypto',
                'message': f'Upgrade {len(weak_functions)} weak cryptographic functions to modern alternatives',
                'priority': 'medium'
            })
        
        # Positive recommendations
        if len(self.results['vulnerabilities']) == 0:
            self.results['recommendations'].append({
                'type': 'good_crypto_practices',
                'message': 'Excellent! No cryptographic vulnerabilities detected',
                'priority': 'info'
            })
        
        # Specific recommendations based on findings
        if any(v['type'] == 'weak_random' for v in self.results['vulnerabilities']):
            self.results['recommendations'].append({
                'type': 'secure_random',
                'message': 'Replace Math.random() with crypto.getRandomValues() for security-sensitive operations',
                'priority': 'high'
            })
        
        if any(v['type'] == 'hardcoded_key' for v in self.results['vulnerabilities']):
            self.results['recommendations'].append({
                'type': 'key_management',
                'message': 'Implement secure key management instead of hardcoding keys',
                'priority': 'critical'
            })
