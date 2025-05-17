"""
Configuration module for hacka.re verifier tool.
Loads and provides access to configuration settings.
"""

import os
import json
import logging
import yaml
from pathlib import Path
from typing import Dict, List, Any, Optional, Union

logger = logging.getLogger('hacka_re_verifier.config')


class Config:
    """Configuration manager for hacka.re verifier tool."""
    
    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize the configuration manager.
        
        Args:
            config_path: Path to a custom configuration file
        """
        # Default configuration
        self.config = {
            'project_path': None,
            'output_dir': 'reports',
            'report_format': 'html',
            'log_level': 'info',
            'timeout': 30,
            'modules': {
                'static_analysis': {
                    'enabled': True,
                    'files_to_analyze': ['*.js', '*.html', '*.css'],
                    'exclude_dirs': ['node_modules', 'dist', 'build', '_venv'],
                    'patterns': {
                        'tracking_code': [
                            r'google-analytics',
                            r'googletagmanager',
                            r'gtag',
                            r'analytics\.js',
                            r'mixpanel',
                            r'segment',
                            r'amplitude',
                            r'tracking'
                        ],
                        'external_requests': [
                            r'fetch\([\'"]https?://',
                            r'\.ajax\(\s*{\s*url\s*:\s*[\'"]https?://',
                            r'\.get\([\'"]https?://',
                            r'\.post\([\'"]https?://',
                            r'new XMLHttpRequest\(\s*\)\s*\.open\([\'"]GET[\'"],\s*[\'"]https?://',
                            r'new XMLHttpRequest\(\s*\)\s*\.open\([\'"]POST[\'"],\s*[\'"]https?://',
                            r'axios\.get\([\'"]https?://',
                            r'axios\.post\([\'"]https?://'
                        ],
                        'api_key_storage': [
                            r'localStorage\.setItem\([\'"]api[_-]?key[\'"]',
                            r'localStorage\.getItem\([\'"]api[_-]?key[\'"]',
                            r'localStorage\[[\'"]api[_-]?key[\'"]\]'
                        ],
                        'encryption_usage': [
                            r'encrypt',
                            r'decrypt',
                            r'hash',
                            r'sign',
                            r'verify',
                            r'nacl',
                            r'tweetnacl',
                            r'crypto'
                        ]
                    }
                },
                'network_analysis': {
                    'enabled': True,
                    'allowed_domains': [
                        'api.groq.com',
                        'api.openai.com',
                        'localhost',
                        '127.0.0.1'
                    ],
                    'blocked_domains': [
                        'google-analytics.com',
                        'googletagmanager.com',
                        'doubleclick.net',
                        'facebook.net',
                        'facebook.com',
                        'twitter.com',
                        'linkedin.com',
                        'amplitude.com',
                        'mixpanel.com',
                        'segment.io',
                        'hotjar.com'
                    ],
                    'test_scenarios': [
                        'page_load',
                        'api_key_entry',
                        'chat_message',
                        'settings_change',
                        'function_calling'
                    ],
                    'browser': 'chromium',
                    'headless': True
                },
                'crypto_audit': {
                    'enabled': True,
                    'files_to_analyze': [
                        'js/utils/crypto-utils.js',
                        'js/utils/rc4-utils.js',
                        'js/services/encryption-service.js',
                        'js/services/storage-service.js',
                        'js/services/link-sharing-service.js',
                        'js/services/share-service.js'
                    ],
                    'test_vectors': {
                        'rc4': {
                            'key': 'Key',
                            'plaintext': 'Plaintext',
                            'ciphertext': 'BBF316E8D940AF0AD3'
                        }
                    },
                    'crypto_requirements': {
                        'min_key_size': 256,
                        'min_iterations': 1000
                    }
                },
                'storage_analysis': {
                    'enabled': True,
                    'storage_keys': [
                        'api_key',
                        'apiKey',
                        'history',
                        'conversation',
                        'messages',
                        'settings',
                        'model',
                        'namespace'
                    ],
                    'test_scenarios': [
                        'api_key_storage',
                        'conversation_history',
                        'settings_persistence',
                        'namespace_isolation'
                    ],
                    'browser': 'chromium',
                    'headless': True
                },
                'dependency_verification': {
                    'enabled': True,
                    'required_local_libs': [
                        'dompurify',
                        'marked',
                        'tweetnacl',
                        'qrcode'
                    ],
                    'check_external_requests': True,
                    'check_integrity': True,
                    'check_vulnerabilities': True
                },
                'report_generation': {
                    'enabled': True,
                    'formats': ['html', 'json', 'markdown'],
                    'include_screenshots': True,
                    'include_code_snippets': True,
                    'include_recommendations': True,
                    'include_summary': True,
                    'include_details': True
                }
            }
        }
        
        # Load custom configuration if provided
        if config_path:
            self._load_config(config_path)
    
    def _load_config(self, config_path: str) -> None:
        """
        Load configuration from a file.
        
        Args:
            config_path: Path to the configuration file
        """
        try:
            if not os.path.exists(config_path):
                logger.warning(f"Configuration file not found: {config_path}")
                return
            
            # Determine file format based on extension
            ext = os.path.splitext(config_path)[1].lower()
            
            if ext == '.json':
                with open(config_path, 'r') as f:
                    custom_config = json.load(f)
            elif ext in ['.yaml', '.yml']:
                with open(config_path, 'r') as f:
                    custom_config = yaml.safe_load(f)
            else:
                logger.warning(f"Unsupported configuration file format: {ext}")
                return
            
            # Merge custom configuration with default configuration
            self._merge_config(self.config, custom_config)
            
            logger.info(f"Loaded configuration from {config_path}")
        except Exception as e:
            logger.error(f"Error loading configuration: {e}")
    
    def _merge_config(self, base_config: Dict[str, Any], custom_config: Dict[str, Any]) -> None:
        """
        Recursively merge custom configuration into base configuration.
        
        Args:
            base_config: Base configuration
            custom_config: Custom configuration to merge
        """
        for key, value in custom_config.items():
            if key in base_config and isinstance(base_config[key], dict) and isinstance(value, dict):
                self._merge_config(base_config[key], value)
            else:
                base_config[key] = value
    
    def get(self, key: str, default: Any = None) -> Any:
        """
        Get a configuration value.
        
        Args:
            key: Configuration key (dot-separated for nested keys)
            default: Default value if key is not found
            
        Returns:
            Configuration value or default
        """
        keys = key.split('.')
        value = self.config
        
        for k in keys:
            if isinstance(value, dict) and k in value:
                value = value[k]
            else:
                return default
        
        return value
    
    def set(self, key: str, value: Any) -> None:
        """
        Set a configuration value.
        
        Args:
            key: Configuration key (dot-separated for nested keys)
            value: Value to set
        """
        keys = key.split('.')
        config = self.config
        
        for i, k in enumerate(keys[:-1]):
            if k not in config:
                config[k] = {}
            config = config[k]
        
        config[keys[-1]] = value
    
    def get_enabled_modules(self) -> List[str]:
        """
        Get a list of enabled modules.
        
        Returns:
            List of enabled module names
        """
        enabled_modules = []
        
        if 'modules' in self.config:
            for module, module_config in self.config['modules'].items():
                if isinstance(module_config, dict) and module_config.get('enabled', False):
                    enabled_modules.append(module)
        
        return enabled_modules
    
    def save(self, config_path: str) -> None:
        """
        Save the current configuration to a file.
        
        Args:
            config_path: Path to save the configuration file
        """
        try:
            # Determine file format based on extension
            ext = os.path.splitext(config_path)[1].lower()
            
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(os.path.abspath(config_path)), exist_ok=True)
            
            if ext == '.json':
                with open(config_path, 'w') as f:
                    json.dump(self.config, f, indent=2)
            elif ext in ['.yaml', '.yml']:
                with open(config_path, 'w') as f:
                    yaml.dump(self.config, f, default_flow_style=False)
            else:
                logger.warning(f"Unsupported configuration file format: {ext}")
                return
            
            logger.info(f"Saved configuration to {config_path}")
        except Exception as e:
            logger.error(f"Error saving configuration: {e}")
