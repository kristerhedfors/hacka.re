"""
Tests for the Config class.
"""

import os
import tempfile
import unittest
import json
import yaml

from hacka_re_verifier.src.config import Config


class TestConfig(unittest.TestCase):
    """Tests for the Config class."""
    
    def test_default_config(self):
        """Test that default configuration is loaded correctly."""
        config = Config()
        
        # Check that default values are set
        self.assertEqual(config.get('output_dir'), 'reports')
        self.assertEqual(config.get('report_format'), 'html')
        self.assertEqual(config.get('log_level'), 'info')
        self.assertEqual(config.get('timeout'), 30)
        
        # Check that modules are enabled by default
        self.assertTrue(config.get('modules.static_analysis.enabled'))
        self.assertTrue(config.get('modules.network_analysis.enabled'))
        self.assertTrue(config.get('modules.crypto_audit.enabled'))
        self.assertTrue(config.get('modules.storage_analysis.enabled'))
        self.assertTrue(config.get('modules.dependency_verification.enabled'))
        self.assertTrue(config.get('modules.report_generation.enabled'))
        
        # Check that enabled modules are returned correctly
        enabled_modules = config.get_enabled_modules()
        self.assertIn('static_analysis', enabled_modules)
        self.assertIn('network_analysis', enabled_modules)
        self.assertIn('crypto_audit', enabled_modules)
        self.assertIn('storage_analysis', enabled_modules)
        self.assertIn('dependency_verification', enabled_modules)
        self.assertIn('report_generation', enabled_modules)
    
    def test_get_set_config(self):
        """Test getting and setting configuration values."""
        config = Config()
        
        # Test getting existing value
        self.assertEqual(config.get('output_dir'), 'reports')
        
        # Test getting non-existent value with default
        self.assertEqual(config.get('non_existent', 'default'), 'default')
        
        # Test setting value
        config.set('output_dir', 'new_reports')
        self.assertEqual(config.get('output_dir'), 'new_reports')
        
        # Test setting nested value
        config.set('modules.static_analysis.enabled', False)
        self.assertFalse(config.get('modules.static_analysis.enabled'))
        
        # Test setting new value
        config.set('new_key', 'new_value')
        self.assertEqual(config.get('new_key'), 'new_value')
        
        # Test setting new nested value
        config.set('new_section.new_key', 'new_value')
        self.assertEqual(config.get('new_section.new_key'), 'new_value')
    
    def test_load_json_config(self):
        """Test loading configuration from a JSON file."""
        # Create a temporary JSON configuration file
        with tempfile.NamedTemporaryFile(suffix='.json', delete=False) as f:
            json.dump({
                'output_dir': 'custom_reports',
                'modules': {
                    'static_analysis': {
                        'enabled': False
                    }
                }
            }, f)
            config_path = f.name
        
        try:
            # Load the configuration
            config = Config(config_path)
            
            # Check that values are overridden
            self.assertEqual(config.get('output_dir'), 'custom_reports')
            self.assertFalse(config.get('modules.static_analysis.enabled'))
            
            # Check that other values are preserved
            self.assertEqual(config.get('report_format'), 'html')
        finally:
            # Clean up
            os.unlink(config_path)
    
    def test_load_yaml_config(self):
        """Test loading configuration from a YAML file."""
        # Create a temporary YAML configuration file
        with tempfile.NamedTemporaryFile(suffix='.yaml', delete=False) as f:
            yaml.dump({
                'output_dir': 'custom_reports',
                'modules': {
                    'static_analysis': {
                        'enabled': False
                    }
                }
            }, f)
            config_path = f.name
        
        try:
            # Load the configuration
            config = Config(config_path)
            
            # Check that values are overridden
            self.assertEqual(config.get('output_dir'), 'custom_reports')
            self.assertFalse(config.get('modules.static_analysis.enabled'))
            
            # Check that other values are preserved
            self.assertEqual(config.get('report_format'), 'html')
        finally:
            # Clean up
            os.unlink(config_path)
    
    def test_save_config(self):
        """Test saving configuration to a file."""
        config = Config()
        
        # Modify configuration
        config.set('output_dir', 'custom_reports')
        config.set('modules.static_analysis.enabled', False)
        
        # Save to a temporary JSON file
        with tempfile.NamedTemporaryFile(suffix='.json', delete=False) as f:
            json_path = f.name
        
        try:
            config.save(json_path)
            
            # Load the saved configuration
            new_config = Config(json_path)
            
            # Check that values are preserved
            self.assertEqual(new_config.get('output_dir'), 'custom_reports')
            self.assertFalse(new_config.get('modules.static_analysis.enabled'))
        finally:
            # Clean up
            os.unlink(json_path)
        
        # Save to a temporary YAML file
        with tempfile.NamedTemporaryFile(suffix='.yaml', delete=False) as f:
            yaml_path = f.name
        
        try:
            config.save(yaml_path)
            
            # Load the saved configuration
            new_config = Config(yaml_path)
            
            # Check that values are preserved
            self.assertEqual(new_config.get('output_dir'), 'custom_reports')
            self.assertFalse(new_config.get('modules.static_analysis.enabled'))
        finally:
            # Clean up
            os.unlink(yaml_path)


if __name__ == '__main__':
    unittest.main()
