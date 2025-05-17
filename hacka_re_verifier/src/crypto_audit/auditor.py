"""
Cryptographic implementation auditor for hacka.re project.
Verifies the correctness of cryptographic operations.
"""

import os
import re
import json
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional, Set, Tuple
import jsbeautifier
import esprima

logger = logging.getLogger('hacka_re_verifier.crypto_audit')


class CryptoAuditor:
    """Cryptographic implementation auditor for hacka.re project."""
    
    def __init__(self, config):
        """
        Initialize the cryptographic auditor.
        
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
                'crypto_issues_found': 0,
                'crypto_score': 0.0
            },
            'crypto_functions': [],
            'crypto_issues': [],
            'recommendations': [],
            'key_management': {
                'key_derivation': None,
                'key_storage': None,
                'key_usage': None
            },
            'encryption': {
                'algorithm': None,
                'mode': None,
                'key_size': None,
                'iv_generation': None,
                'authenticated': None
            }
        }
    
    def analyze(self, project_path: str) -> Dict[str, Any]:
        """
        Analyze the cryptographic implementation of the hacka.re project.
        
        Args:
            project_path: Path to the hacka.re project
            
        Returns:
            Dictionary containing analysis results
        """
        logger.info(f"Starting cryptographic audit of project at: {project_path}")
        
        # Analyze each file
        for file_name in self.files_to_analyze:
            file_path = os.path.join(project_path, file_name)
            if os.path.exists(file_path):
                self._analyze_file(file_path)
            else:
                logger.warning(f"File not found: {file_path}")
        
        # Update summary
        self.results['summary']['total_files_analyzed'] = len(self.files_to_analyze)
        self.results['summary']['crypto_functions_found'] = len(self.results['crypto_functions'])
        self.results['summary']['crypto_issues_found'] = len(self.results['crypto_issues'])
        
        # Analyze key management
        self._analyze_key_management()
        
        # Analyze encryption
        self._analyze_encryption()
        
        # Calculate crypto score
        self._calculate_crypto_score()
        
        # Generate recommendations
        self._generate_recommendations()
        
        logger.info(f"Cryptographic audit completed. Found {self.results['summary']['crypto_issues_found']} issues.")
        return self.results
    
    def _analyze_file(self, file_path: str) -> None:
        """
        Analyze a single file for cryptographic implementations.
        
        Args:
            file_path: Path to the file to analyze
        """
        logger.debug(f"Analyzing file: {file_path}")
        
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            # Beautify JavaScript for better analysis
            options = jsbeautifier.default_options()
            beautified_content = jsbeautifier.beautify(content, options)
            
            # Parse JavaScript with esprima
            try:
                ast = esprima.parseScript(beautified_content, {'loc': True, 'comment': True})
                
                # Extract crypto functions
                crypto_functions = self._extract_crypto_functions(file_path, ast)
                self.results['crypto_functions'].extend(crypto_functions)
                
                # Check for crypto issues
                crypto_issues = self._check_crypto_issues(file_path, ast, beautified_content)
                self.results['crypto_issues'].extend(crypto_issues)
                
            except Exception as e:
                logger.warning(f"Error parsing JavaScript in {file_path}: {e}")
                # Add a finding for syntax error
                self.results['crypto_issues'].append({
                    'file': file_path,
                    'line': 0,
                    'column': 0,
                    'type': 'syntax_error',
                    'severity': 'warning',
                    'message': f"JavaScript syntax error: {str(e)}",
                    'code': ''
                })
        except Exception as e:
            logger.error(f"Error analyzing file {file_path}: {e}")
    
    def _extract_crypto_functions(self, file_path: str, ast) -> List[Dict[str, Any]]:
        """
        Extract cryptographic functions from the AST.
        
        Args:
            file_path: Path to the file
            ast: Abstract syntax tree of the file
            
        Returns:
            List of cryptographic functions
        """
        crypto_functions = []
        
        # Function to recursively traverse the AST
        def traverse(node, parent=None):
            # Check for function declarations
            if node.type == 'FunctionDeclaration' and hasattr(node, 'id') and hasattr(node.id, 'name'):
                function_name = node.id.name
                
                # Check if it's a crypto function
                if self._is_crypto_function(function_name):
                    crypto_functions.append({
                        'file': file_path,
                        'line': node.loc.start.line,
                        'column': node.loc.start.column,
                        'name': function_name,
                        'type': self._get_crypto_function_type(function_name),
                        'code': self._get_node_code(node, file_path)
                    })
            
            # Check for method definitions
            elif node.type == 'MethodDefinition' and hasattr(node, 'key') and hasattr(node.key, 'name'):
                method_name = node.key.name
                
                # Check if it's a crypto method
                if self._is_crypto_function(method_name):
                    crypto_functions.append({
                        'file': file_path,
                        'line': node.loc.start.line,
                        'column': node.loc.start.column,
                        'name': method_name,
                        'type': self._get_crypto_function_type(method_name),
                        'code': self._get_node_code(node, file_path)
                    })
            
            # Check for variable declarations with function expressions
            elif node.type == 'VariableDeclarator' and hasattr(node, 'id') and hasattr(node.id, 'name'):
                var_name = node.id.name
                
                # Check if it's a crypto function
                if self._is_crypto_function(var_name) and hasattr(node, 'init') and node.init is not None:
                    if node.init.type in ['FunctionExpression', 'ArrowFunctionExpression']:
                        crypto_functions.append({
                            'file': file_path,
                            'line': node.loc.start.line,
                            'column': node.loc.start.column,
                            'name': var_name,
                            'type': self._get_crypto_function_type(var_name),
                            'code': self._get_node_code(node, file_path)
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
        
        return crypto_functions
    
    def _check_crypto_issues(self, file_path: str, ast, content: str) -> List[Dict[str, Any]]:
        """
        Check for cryptographic issues in the AST.
        
        Args:
            file_path: Path to the file
            ast: Abstract syntax tree of the file
            content: Content of the file
            
        Returns:
            List of cryptographic issues
        """
        crypto_issues = []
        
        # Check for weak key sizes
        weak_key_sizes = self._check_weak_key_sizes(file_path, content)
        crypto_issues.extend(weak_key_sizes)
        
        # Check for insecure random number generation
        insecure_random = self._check_insecure_random(file_path, content)
        crypto_issues.extend(insecure_random)
        
        # Check for hardcoded secrets
        hardcoded_secrets = self._check_hardcoded_secrets(file_path, content)
        crypto_issues.extend(hardcoded_secrets)
        
        # Check for insufficient key derivation
        insufficient_kdf = self._check_insufficient_kdf(file_path, content)
        crypto_issues.extend(insufficient_kdf)
        
        # Check for unauthenticated encryption
        unauthenticated_encryption = self._check_unauthenticated_encryption(file_path, content)
        crypto_issues.extend(unauthenticated_encryption)
        
        return crypto_issues
    
    def _is_crypto_function(self, function_name: str) -> bool:
        """
        Check if a function name indicates a cryptographic function.
        
        Args:
            function_name: Name of the function
            
        Returns:
            True if it's a cryptographic function, False otherwise
        """
        crypto_keywords = [
            'encrypt', 'decrypt', 'hash', 'sign', 'verify', 'hmac',
            'cipher', 'crypto', 'key', 'salt', 'iv', 'nonce',
            'random', 'secure', 'nacl', 'tweetnacl', 'secretbox',
            'derive', 'kdf', 'pbkdf', 'scrypt', 'bcrypt', 'argon'
        ]
        
        function_name_lower = function_name.lower()
        return any(keyword in function_name_lower for keyword in crypto_keywords)
    
    def _get_crypto_function_type(self, function_name: str) -> str:
        """
        Get the type of a cryptographic function based on its name.
        
        Args:
            function_name: Name of the function
            
        Returns:
            Type of the cryptographic function
        """
        function_name_lower = function_name.lower()
        
        if 'encrypt' in function_name_lower:
            return 'encryption'
        elif 'decrypt' in function_name_lower:
            return 'decryption'
        elif 'hash' in function_name_lower:
            return 'hashing'
        elif 'sign' in function_name_lower:
            return 'signing'
        elif 'verify' in function_name_lower:
            return 'verification'
        elif 'derive' in function_name_lower or 'kdf' in function_name_lower:
            return 'key_derivation'
        elif 'random' in function_name_lower:
            return 'random_generation'
        elif 'key' in function_name_lower:
            return 'key_management'
        elif 'salt' in function_name_lower:
            return 'salt_generation'
        elif 'iv' in function_name_lower or 'nonce' in function_name_lower:
            return 'iv_generation'
        else:
            return 'other'
    
    def _get_node_code(self, node, file_path: str) -> str:
        """
        Get the code representation of a node.
        
        Args:
            node: AST node
            file_path: Path to the file
            
        Returns:
            Code representation of the node
        """
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            lines = content.split('\n')
            start_line = node.loc.start.line - 1
            end_line = node.loc.end.line - 1
            
            if start_line == end_line:
                return lines[start_line]
            else:
                return '\n'.join(lines[start_line:end_line + 1])
        except Exception as e:
            logger.error(f"Error getting node code: {e}")
            return ""
    
    def _check_weak_key_sizes(self, file_path: str, content: str) -> List[Dict[str, Any]]:
        """
        Check for weak key sizes in the file content.
        
        Args:
            file_path: Path to the file
            content: Content of the file
            
        Returns:
            List of weak key size issues
        """
        issues = []
        
        # Check for key size specifications
        key_size_patterns = [
            r'keySize\s*=\s*(\d+)',
            r'key[_\s]?size\s*=\s*(\d+)',
            r'key[_\s]?length\s*=\s*(\d+)',
            r'generateKey\(\s*(\d+)\s*\)',
            r'createKey\(\s*(\d+)\s*\)'
        ]
        
        for pattern in key_size_patterns:
            for match in re.finditer(pattern, content):
                key_size = int(match.group(1))
                if key_size < self.crypto_requirements.get('min_key_size', 256):
                    line_number = content[:match.start()].count('\n') + 1
                    issues.append({
                        'file': file_path,
                        'line': line_number,
                        'column': 0,
                        'type': 'weak_key_size',
                        'severity': 'high',
                        'message': f"Weak key size detected: {key_size} bits (minimum recommended: {self.crypto_requirements.get('min_key_size', 256)} bits)",
                        'code': match.group(0)
                    })
        
        return issues
    
    def _check_insecure_random(self, file_path: str, content: str) -> List[Dict[str, Any]]:
        """
        Check for insecure random number generation in the file content.
        
        Args:
            file_path: Path to the file
            content: Content of the file
            
        Returns:
            List of insecure random number generation issues
        """
        issues = []
        
        # Check for insecure random number generation
        insecure_random_patterns = [
            r'Math\.random\(\)',
            r'new Date\(\)\.getTime\(\)',
            r'Date\.now\(\)'
        ]
        
        for pattern in insecure_random_patterns:
            for match in re.finditer(pattern, content):
                line_number = content[:match.start()].count('\n') + 1
                issues.append({
                    'file': file_path,
                    'line': line_number,
                    'column': 0,
                    'type': 'insecure_random',
                    'severity': 'high',
                    'message': f"Insecure random number generation detected: {match.group(0)}",
                    'code': match.group(0)
                })
        
        return issues
    
    def _check_hardcoded_secrets(self, file_path: str, content: str) -> List[Dict[str, Any]]:
        """
        Check for hardcoded secrets in the file content.
        
        Args:
            file_path: Path to the file
            content: Content of the file
            
        Returns:
            List of hardcoded secret issues
        """
        issues = []
        
        # Check for hardcoded secrets
        secret_patterns = [
            r'const\s+(?:secret|key|password|salt)\s*=\s*[\'"]([^\'"]{8,})[\'"]',
            r'let\s+(?:secret|key|password|salt)\s*=\s*[\'"]([^\'"]{8,})[\'"]',
            r'var\s+(?:secret|key|password|salt)\s*=\s*[\'"]([^\'"]{8,})[\'"]'
        ]
        
        for pattern in secret_patterns:
            for match in re.finditer(pattern, content):
                line_number = content[:match.start()].count('\n') + 1
                issues.append({
                    'file': file_path,
                    'line': line_number,
                    'column': 0,
                    'type': 'hardcoded_secret',
                    'severity': 'critical',
                    'message': f"Hardcoded secret detected: {match.group(0)}",
                    'code': match.group(0)
                })
        
        return issues
    
    def _check_insufficient_kdf(self, file_path: str, content: str) -> List[Dict[str, Any]]:
        """
        Check for insufficient key derivation in the file content.
        
        Args:
            file_path: Path to the file
            content: Content of the file
            
        Returns:
            List of insufficient key derivation issues
        """
        issues = []
        
        # Check for key derivation iterations
        iteration_patterns = [
            r'iterations\s*=\s*(\d+)',
            r'iterations\s*:\s*(\d+)',
            r'rounds\s*=\s*(\d+)',
            r'rounds\s*:\s*(\d+)'
        ]
        
        for pattern in iteration_patterns:
            for match in re.finditer(pattern, content):
                iterations = int(match.group(1))
                if iterations < self.crypto_requirements.get('min_iterations', 1000):
                    line_number = content[:match.start()].count('\n') + 1
                    issues.append({
                        'file': file_path,
                        'line': line_number,
                        'column': 0,
                        'type': 'insufficient_kdf',
                        'severity': 'medium',
                        'message': f"Insufficient key derivation iterations: {iterations} (minimum recommended: {self.crypto_requirements.get('min_iterations', 1000)})",
                        'code': match.group(0)
                    })
        
        return issues
    
    def _check_unauthenticated_encryption(self, file_path: str, content: str) -> List[Dict[str, Any]]:
        """
        Check for unauthenticated encryption in the file content.
        
        Args:
            file_path: Path to the file
            content: Content of the file
            
        Returns:
            List of unauthenticated encryption issues
        """
        issues = []
        
        # Check for unauthenticated encryption modes
        unauthenticated_modes = [
            r'ECB',
            r'CBC',
            r'CFB',
            r'OFB',
            r'CTR'
        ]
        
        # Only flag if there's no HMAC or authenticated mode
        has_authentication = re.search(r'HMAC|GCM|CCM|EAX|OCB|Poly1305|ChaCha20-Poly1305', content) is not None
        
        if not has_authentication:
            for mode in unauthenticated_modes:
                for match in re.finditer(mode, content):
                    line_number = content[:match.start()].count('\n') + 1
                    issues.append({
                        'file': file_path,
                        'line': line_number,
                        'column': 0,
                        'type': 'unauthenticated_encryption',
                        'severity': 'high',
                        'message': f"Unauthenticated encryption mode detected: {mode}",
                        'code': match.group(0)
                    })
        
        return issues
    
    def _analyze_key_management(self) -> None:
        """
        Analyze key management practices.
        """
        # Check for key derivation
        key_derivation_functions = [f for f in self.results['crypto_functions'] if f['type'] == 'key_derivation']
        if key_derivation_functions:
            self.results['key_management']['key_derivation'] = {
                'found': True,
                'functions': key_derivation_functions,
                'issues': [i for i in self.results['crypto_issues'] if i['type'] == 'insufficient_kdf']
            }
        else:
            self.results['key_management']['key_derivation'] = {
                'found': False,
                'functions': [],
                'issues': []
            }
        
        # Check for key storage
        key_storage_functions = [f for f in self.results['crypto_functions'] if f['type'] == 'key_management']
        if key_storage_functions:
            self.results['key_management']['key_storage'] = {
                'found': True,
                'functions': key_storage_functions,
                'issues': [i for i in self.results['crypto_issues'] if i['type'] == 'hardcoded_secret']
            }
        else:
            self.results['key_management']['key_storage'] = {
                'found': False,
                'functions': [],
                'issues': []
            }
        
        # Check for key usage
        key_usage_functions = [f for f in self.results['crypto_functions'] if f['type'] in ['encryption', 'decryption', 'signing', 'verification']]
        if key_usage_functions:
            self.results['key_management']['key_usage'] = {
                'found': True,
                'functions': key_usage_functions,
                'issues': [i for i in self.results['crypto_issues'] if i['type'] == 'weak_key_size']
            }
        else:
            self.results['key_management']['key_usage'] = {
                'found': False,
                'functions': [],
                'issues': []
            }
    
    def _analyze_encryption(self) -> None:
        """
        Analyze encryption practices.
        """
        # Check for encryption algorithm
        encryption_functions = [f for f in self.results['crypto_functions'] if f['type'] == 'encryption']
        if encryption_functions:
            # Try to determine the algorithm
            algorithm = self._determine_encryption_algorithm(encryption_functions)
            self.results['encryption']['algorithm'] = algorithm
        
        # Check for encryption mode
        if encryption_functions:
            # Try to determine the mode
            mode = self._determine_encryption_mode(encryption_functions)
            self.results['encryption']['mode'] = mode
        
        # Check for key size
        key_size_issues = [i for i in self.results['crypto_issues'] if i['type'] == 'weak_key_size']
        if key_size_issues:
            self.results['encryption']['key_size'] = {
                'issues': key_size_issues,
                'adequate': False
            }
        else:
            self.results['encryption']['key_size'] = {
                'issues': [],
                'adequate': True
            }
        
        # Check for IV generation
        iv_generation_functions = [f for f in self.results['crypto_functions'] if f['type'] == 'iv_generation']
        if iv_generation_functions:
            self.results['encryption']['iv_generation'] = {
                'found': True,
                'functions': iv_generation_functions,
                'issues': [i for i in self.results['crypto_issues'] if i['type'] == 'insecure_random']
            }
        else:
            self.results['encryption']['iv_generation'] = {
                'found': False,
                'functions': [],
                'issues': []
            }
        
        # Check for authenticated encryption
        unauthenticated_issues = [i for i in self.results['crypto_issues'] if i['type'] == 'unauthenticated_encryption']
        if unauthenticated_issues:
            self.results['encryption']['authenticated'] = {
                'is_authenticated': False,
                'issues': unauthenticated_issues
            }
        else:
            self.results['encryption']['authenticated'] = {
                'is_authenticated': True,
                'issues': []
            }
    
    def _determine_encryption_algorithm(self, encryption_functions: List[Dict[str, Any]]) -> Optional[str]:
        """
        Determine the encryption algorithm used.
        
        Args:
            encryption_functions: List of encryption functions
            
        Returns:
            Encryption algorithm or None if not determined
        """
        # Check function names and code for algorithm indicators
        for func in encryption_functions:
            code = func['code'].lower()
            
            if 'aes' in code:
                return 'AES'
            elif 'chacha20' in code:
                return 'ChaCha20'
            elif 'xsalsa20' in code:
                return 'XSalsa20'
            elif 'nacl' in code or 'tweetnacl' in code:
                return 'XSalsa20 (TweetNaCl)'
            elif 'secretbox' in code:
                return 'XSalsa20-Poly1305 (NaCl secretbox)'
        
        return None
    
    def _determine_encryption_mode(self, encryption_functions: List[Dict[str, Any]]) -> Optional[str]:
        """
        Determine the encryption mode used.
        
        Args:
            encryption_functions: List of encryption functions
            
        Returns:
            Encryption mode or None if not determined
        """
        # Check function names and code for mode indicators
        for func in encryption_functions:
            code = func['code'].lower()
            
            if 'gcm' in code:
                return 'GCM'
            elif 'cbc' in code:
                return 'CBC'
            elif 'ctr' in code:
                return 'CTR'
            elif 'ecb' in code:
                return 'ECB'
            elif 'poly1305' in code:
                return 'Poly1305'
            elif 'secretbox' in code:
                return 'XSalsa20-Poly1305'
        
        return None
    
    def _calculate_crypto_score(self) -> None:
        """
        Calculate a cryptographic score based on the findings.
        """
        # Start with a perfect score
        score = 100.0
        
        # Deduct points for crypto issues
        for issue in self.results['crypto_issues']:
            if issue['severity'] == 'critical':
                score -= 20.0
            elif issue['severity'] == 'high':
                score -= 10.0
            elif issue['severity'] == 'medium':
                score -= 5.0
            elif issue['severity'] == 'low':
                score -= 2.0
        
        # Check key management
        if not self.results['key_management']['key_derivation']['found']:
            score -= 10.0
        elif self.results['key_management']['key_derivation']['issues']:
            score -= 5.0
        
        if not self.results['key_management']['key_storage']['found']:
            score -= 10.0
        elif self.results['key_management']['key_storage']['issues']:
            score -= 5.0
        
        if not self.results['key_management']['key_usage']['found']:
            score -= 10.0
        elif self.results['key_management']['key_usage']['issues']:
            score -= 5.0
        
        # Check encryption
        if not self.results['encryption']['algorithm']:
            score -= 10.0
        
        if not self.results['encryption']['mode']:
            score -= 10.0
        
        if not self.results['encryption']['key_size']['adequate']:
            score -= 10.0
        
        if not self.results['encryption']['iv_generation']['found']:
            score -= 10.0
        elif self.results['encryption']['iv_generation']['issues']:
            score -= 5.0
        
        if not self.results['encryption']['authenticated']['is_authenticated']:
            score -= 10.0
        
        # Ensure score is not negative
        score = max(0.0, score)
        
        self.results['summary']['crypto_score'] = round(score, 1)
    
    def _generate_recommendations(self) -> None:
        """
        Generate recommendations based on the findings.
        """
        # Check for weak key sizes
        if any(issue['type'] == 'weak_key_size' for issue in self.results['crypto_issues']):
            self.results['recommendations'].append({
                'type': 'weak_key_size',
                'message': f"Use key sizes of at least {self.crypto_requirements.get('min_key_size', 256)} bits for all cryptographic operations",
                'priority': 'high'
            })
        
        # Check for insecure random number generation
        if any(issue['type'] == 'insecure_random' for issue in self.results['crypto_issues']):
            self.results['recommendations'].append({
                'type': 'insecure_random',
                'message': "Use cryptographically secure random number generation (e.g., window.crypto.getRandomValues())",
                'priority': 'high'
            })
        
        # Check for hardcoded secrets
        if any(issue['type'] == 'hardcoded_secret' for issue in self.results['crypto_issues']):
            self.results['recommendations'].append({
                'type': 'hardcoded_secret',
                'message': "Avoid hardcoding secrets in the source code",
                'priority': 'critical'
            })
        
        # Check for insufficient key derivation
        if any(issue['type'] == 'insufficient_kdf' for issue in self.results['crypto_issues']):
            self.results['recommendations'].append({
                'type': 'insufficient_kdf',
                'message': f"Use at least {self.crypto_requirements.get('min_iterations', 1000)} iterations for key derivation functions",
                'priority': 'medium'
            })
        
        # Check for unauthenticated encryption
        if any(issue['type'] == 'unauthenticated_encryption' for issue in self.results['crypto_issues']):
            self.results['recommendations'].append({
                'type': 'unauthenticated_encryption',
                'message': "Use authenticated encryption modes (e.g., GCM, Poly1305) or add a separate authentication step (HMAC)",
                'priority': 'high'
            })
        
        # General recommendations
        if not self.results['key_management']['key_derivation']['found']:
            self.results['recommendations'].append({
                'type': 'key_derivation',
                'message': "Implement proper key derivation functions for deriving encryption keys from passwords",
                'priority': 'high'
            })
        
        if not self.results['encryption']['iv_generation']['found']:
            self.results['recommendations'].append({
                'type': 'iv_generation',
                'message': "Use unique initialization vectors (IVs) or nonces for each encryption operation",
                'priority': 'high'
            })
