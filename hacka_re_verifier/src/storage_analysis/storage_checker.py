"""
Browser storage analyzer for hacka.re project.
Analyzes localStorage usage and encryption.
"""

import os
import re
import json
import logging
import asyncio
from pathlib import Path
from typing import Dict, List, Any, Optional, Set
from playwright.async_api import async_playwright, Page, Browser, BrowserContext

logger = logging.getLogger('hacka_re_verifier.storage_analysis')


class StorageChecker:
    """Browser storage analyzer for hacka.re project."""
    
    def __init__(self, config):
        """
        Initialize the storage analyzer.
        
        Args:
            config: Configuration object
        """
        self.config = config
        self.storage_keys = config.get('modules.storage_analysis.storage_keys', [])
        self.test_scenarios = config.get('modules.storage_analysis.test_scenarios', [])
        self.browser_type = config.get('modules.storage_analysis.browser', 'chromium')
        self.headless = config.get('modules.storage_analysis.headless', True)
        self.timeout = config.get('timeout', 30) * 1000  # Convert to milliseconds
        
        self.results = {
            'summary': {
                'total_storage_items': 0,
                'encrypted_items': 0,
                'unencrypted_items': 0,
                'storage_score': 0.0
            },
            'storage_items': [],
            'storage_issues': [],
            'recommendations': [],
            'test_scenarios': {}
        }
    
    def analyze(self, project_path: str) -> Dict[str, Any]:
        """
        Analyze the browser storage usage of the hacka.re project.
        
        Args:
            project_path: Path to the hacka.re project
            
        Returns:
            Dictionary containing analysis results
        """
        logger.info(f"Starting browser storage analysis of project at: {project_path}")
        
        # Run the storage analysis asynchronously
        asyncio.run(self._run_analysis(project_path))
        
        # Calculate storage score
        self._calculate_storage_score()
        
        # Generate recommendations
        self._generate_recommendations()
        
        logger.info(f"Browser storage analysis completed. Found {len(self.results['storage_issues'])} storage issues.")
        return self.results
    
    async def _run_analysis(self, project_path: str) -> None:
        """
        Run the storage analysis asynchronously.
        
        Args:
            project_path: Path to the hacka.re project
        """
        async with async_playwright() as playwright:
            # Launch browser
            browser_type = getattr(playwright, self.browser_type)
            browser = await browser_type.launch(headless=self.headless)
            
            try:
                # Create a new browser context
                context = await browser.new_context(
                    viewport={'width': 1280, 'height': 800},
                    user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                )
                
                # Run test scenarios
                for scenario in self.test_scenarios:
                    logger.info(f"Running test scenario: {scenario}")
                    scenario_results = await self._run_test_scenario(context, project_path, scenario)
                    self.results['test_scenarios'][scenario] = scenario_results
            finally:
                await browser.close()
    
    async def _run_test_scenario(self, context: BrowserContext, project_path: str, scenario: str) -> Dict[str, Any]:
        """
        Run a specific test scenario.
        
        Args:
            context: Browser context
            project_path: Path to the hacka.re project
            scenario: Name of the test scenario
            
        Returns:
            Dictionary containing scenario results
        """
        scenario_results = {
            'storage_items': [],
            'issues': []
        }
        
        # Create a new page
        page = await context.new_page()
        
        try:
            # Run the appropriate scenario
            if scenario == 'api_key_storage':
                await self._test_api_key_storage(page, project_path, scenario_results)
            elif scenario == 'conversation_history':
                await self._test_conversation_history(page, project_path, scenario_results)
            elif scenario == 'settings_persistence':
                await self._test_settings_persistence(page, project_path, scenario_results)
            elif scenario == 'namespace_isolation':
                await self._test_namespace_isolation(page, project_path, scenario_results)
            else:
                logger.warning(f"Unknown test scenario: {scenario}")
        except Exception as e:
            logger.error(f"Error running test scenario {scenario}: {e}")
            scenario_results['error'] = str(e)
        finally:
            await page.close()
        
        return scenario_results
    
    async def _test_api_key_storage(self, page: Page, project_path: str, scenario_results: Dict[str, Any]) -> None:
        """
        Test scenario: API key storage.
        
        Args:
            page: Playwright page
            project_path: Path to the hacka.re project
            scenario_results: Dictionary to store scenario results
        """
        # Load the index.html file
        file_url = f"file://{os.path.join(project_path, 'index.html')}"
        await page.goto(file_url, timeout=self.timeout)
        
        # Wait for page to load completely
        await page.wait_for_load_state('networkidle', timeout=self.timeout)
        
        # Check if API key modal is visible
        api_key_modal_visible = await page.is_visible('#api-key-modal')
        
        if api_key_modal_visible:
            # Enter a test API key
            await page.fill('#api-key', 'sk-test-api-key-for-verification-purposes-only')
            
            # Submit the form
            await page.click('#api-key-form button[type="submit"]')
            
            # Wait for any storage operations to complete
            await page.wait_for_timeout(1000)
        else:
            # Open settings modal
            await page.click('#settings-btn')
            
            # Wait for settings modal to appear
            await page.wait_for_selector('#settings-modal', state='visible', timeout=self.timeout)
            
            # Enter a test API key
            await page.fill('#api-key-update', 'sk-test-api-key-for-verification-purposes-only')
            
            # Save settings
            await page.click('#save-settings-btn')
            
            # Wait for any storage operations to complete
            await page.wait_for_timeout(1000)
        
        # Check localStorage for API key
        storage_items = await self._get_local_storage(page)
        
        # Look for API key in storage
        api_key_found = False
        api_key_encrypted = False
        
        for key, value in storage_items.items():
            if 'api_key' in key.lower() or 'apikey' in key.lower():
                api_key_found = True
                self.results['storage_items'].append({
                    'key': key,
                    'value': value,
                    'type': 'api_key',
                    'encrypted': self._is_likely_encrypted(value)
                })
                
                scenario_results['storage_items'].append({
                    'key': key,
                    'value': value,
                    'type': 'api_key',
                    'encrypted': self._is_likely_encrypted(value)
                })
                
                if self._is_likely_encrypted(value):
                    api_key_encrypted = True
                    self.results['summary']['encrypted_items'] += 1
                else:
                    self.results['summary']['unencrypted_items'] += 1
                    
                    # Add as a storage issue
                    issue = {
                        'type': 'unencrypted_api_key',
                        'severity': 'critical',
                        'message': f"API key stored unencrypted in localStorage: {key}",
                        'details': {
                            'key': key,
                            'value': value[:10] + '...' if len(value) > 10 else value  # Show only part of the key
                        }
                    }
                    self.results['storage_issues'].append(issue)
                    scenario_results['issues'].append(issue)
        
        if not api_key_found:
            # Add as a storage issue
            issue = {
                'type': 'api_key_not_found',
                'severity': 'high',
                'message': "API key not found in localStorage after submission",
                'details': {
                    'storage_items': list(storage_items.keys())
                }
            }
            self.results['storage_issues'].append(issue)
            scenario_results['issues'].append(issue)
        
        # Take a screenshot for the report
        screenshot_path = os.path.join(project_path, 'reports', 'api_key_storage.png')
        os.makedirs(os.path.dirname(screenshot_path), exist_ok=True)
        await page.screenshot(path=screenshot_path)
        scenario_results['screenshot'] = screenshot_path
    
    async def _test_conversation_history(self, page: Page, project_path: str, scenario_results: Dict[str, Any]) -> None:
        """
        Test scenario: Conversation history.
        
        Args:
            page: Playwright page
            project_path: Path to the hacka.re project
            scenario_results: Dictionary to store scenario results
        """
        # Load the index.html file
        file_url = f"file://{os.path.join(project_path, 'index.html')}"
        await page.goto(file_url, timeout=self.timeout)
        
        # Wait for page to load completely
        await page.wait_for_load_state('networkidle', timeout=self.timeout)
        
        # Check if API key modal is visible and handle it
        api_key_modal_visible = await page.is_visible('#api-key-modal')
        if api_key_modal_visible:
            # Enter a test API key
            await page.fill('#api-key', 'sk-test-api-key-for-verification-purposes-only')
            
            # Submit the form
            await page.click('#api-key-form button[type="submit"]')
            
            # Wait for any storage operations to complete
            await page.wait_for_timeout(1000)
        
        # Enter a test message
        await page.fill('#message-input', 'This is a test message for storage analysis')
        
        # Submit the message
        await page.click('#send-btn')
        
        # Wait for any storage operations to complete
        await page.wait_for_timeout(1000)
        
        # Check localStorage for conversation history
        storage_items = await self._get_local_storage(page)
        
        # Look for conversation history in storage
        history_found = False
        history_encrypted = False
        
        for key, value in storage_items.items():
            if 'history' in key.lower() or 'conversation' in key.lower() or 'messages' in key.lower() or 'chat' in key.lower():
                history_found = True
                self.results['storage_items'].append({
                    'key': key,
                    'value': value,
                    'type': 'conversation_history',
                    'encrypted': self._is_likely_encrypted(value)
                })
                
                scenario_results['storage_items'].append({
                    'key': key,
                    'value': value,
                    'type': 'conversation_history',
                    'encrypted': self._is_likely_encrypted(value)
                })
                
                if self._is_likely_encrypted(value):
                    history_encrypted = True
                    self.results['summary']['encrypted_items'] += 1
                else:
                    self.results['summary']['unencrypted_items'] += 1
                    
                    # Add as a storage issue
                    issue = {
                        'type': 'unencrypted_conversation_history',
                        'severity': 'medium',
                        'message': f"Conversation history stored unencrypted in localStorage: {key}",
                        'details': {
                            'key': key,
                            'value': value[:50] + '...' if len(value) > 50 else value  # Show only part of the value
                        }
                    }
                    self.results['storage_issues'].append(issue)
                    scenario_results['issues'].append(issue)
        
        if not history_found:
            # Add as a storage issue
            issue = {
                'type': 'conversation_history_not_found',
                'severity': 'medium',
                'message': "Conversation history not found in localStorage after sending message",
                'details': {
                    'storage_items': list(storage_items.keys())
                }
            }
            self.results['storage_issues'].append(issue)
            scenario_results['issues'].append(issue)
        
        # Take a screenshot for the report
        screenshot_path = os.path.join(project_path, 'reports', 'conversation_history.png')
        os.makedirs(os.path.dirname(screenshot_path), exist_ok=True)
        await page.screenshot(path=screenshot_path)
        scenario_results['screenshot'] = screenshot_path
    
    async def _test_settings_persistence(self, page: Page, project_path: str, scenario_results: Dict[str, Any]) -> None:
        """
        Test scenario: Settings persistence.
        
        Args:
            page: Playwright page
            project_path: Path to the hacka.re project
            scenario_results: Dictionary to store scenario results
        """
        # Load the index.html file
        file_url = f"file://{os.path.join(project_path, 'index.html')}"
        await page.goto(file_url, timeout=self.timeout)
        
        # Wait for page to load completely
        await page.wait_for_load_state('networkidle', timeout=self.timeout)
        
        # Check if API key modal is visible and handle it
        api_key_modal_visible = await page.is_visible('#api-key-modal')
        if api_key_modal_visible:
            # Enter a test API key
            await page.fill('#api-key', 'sk-test-api-key-for-verification-purposes-only')
            
            # Submit the form
            await page.click('#api-key-form button[type="submit"]')
            
            # Wait for any storage operations to complete
            await page.wait_for_timeout(1000)
        
        # Open settings modal
        await page.click('#settings-btn')
        
        # Wait for settings modal to appear
        await page.wait_for_selector('#settings-modal', state='visible', timeout=self.timeout)
        
        # Change model selection if available
        model_select_visible = await page.is_visible('#model-select')
        if model_select_visible:
            await page.select_option('#model-select', value='llama-3.1-8b-instant')
        
        # Save settings
        await page.click('#save-settings-btn')
        
        # Wait for any storage operations to complete
        await page.wait_for_timeout(1000)
        
        # Check localStorage for settings
        storage_items = await self._get_local_storage(page)
        
        # Look for settings in storage
        settings_found = False
        settings_encrypted = False
        
        for key, value in storage_items.items():
            if 'model' in key.lower() or 'settings' in key.lower() or 'config' in key.lower() or 'preferences' in key.lower():
                settings_found = True
                self.results['storage_items'].append({
                    'key': key,
                    'value': value,
                    'type': 'settings',
                    'encrypted': self._is_likely_encrypted(value)
                })
                
                scenario_results['storage_items'].append({
                    'key': key,
                    'value': value,
                    'type': 'settings',
                    'encrypted': self._is_likely_encrypted(value)
                })
                
                if self._is_likely_encrypted(value):
                    settings_encrypted = True
                    self.results['summary']['encrypted_items'] += 1
                else:
                    self.results['summary']['unencrypted_items'] += 1
                    
                    # Add as a storage issue (but with lower severity than API keys)
                    issue = {
                        'type': 'unencrypted_settings',
                        'severity': 'low',
                        'message': f"Settings stored unencrypted in localStorage: {key}",
                        'details': {
                            'key': key,
                            'value': value[:50] + '...' if len(value) > 50 else value  # Show only part of the value
                        }
                    }
                    self.results['storage_issues'].append(issue)
                    scenario_results['issues'].append(issue)
        
        if not settings_found:
            # Add as a storage issue
            issue = {
                'type': 'settings_not_found',
                'severity': 'low',
                'message': "Settings not found in localStorage after changing settings",
                'details': {
                    'storage_items': list(storage_items.keys())
                }
            }
            self.results['storage_issues'].append(issue)
            scenario_results['issues'].append(issue)
        
        # Take a screenshot for the report
        screenshot_path = os.path.join(project_path, 'reports', 'settings_persistence.png')
        os.makedirs(os.path.dirname(screenshot_path), exist_ok=True)
        await page.screenshot(path=screenshot_path)
        scenario_results['screenshot'] = screenshot_path
    
    async def _test_namespace_isolation(self, page: Page, project_path: str, scenario_results: Dict[str, Any]) -> None:
        """
        Test scenario: Namespace isolation.
        
        Args:
            page: Playwright page
            project_path: Path to the hacka.re project
            scenario_results: Dictionary to store scenario results
        """
        # Load the index.html file
        file_url = f"file://{os.path.join(project_path, 'index.html')}"
        await page.goto(file_url, timeout=self.timeout)
        
        # Wait for page to load completely
        await page.wait_for_load_state('networkidle', timeout=self.timeout)
        
        # Check if API key modal is visible and handle it
        api_key_modal_visible = await page.is_visible('#api-key-modal')
        if api_key_modal_visible:
            # Enter a test API key
            await page.fill('#api-key', 'sk-test-api-key-for-verification-purposes-only')
            
            # Submit the form
            await page.click('#api-key-form button[type="submit"]')
            
            # Wait for any storage operations to complete
            await page.wait_for_timeout(1000)
        
        # Get initial localStorage state
        initial_storage = await self._get_local_storage(page)
        
        # Open share modal
        await page.click('#share-btn')
        
        # Wait for share modal to appear
        await page.wait_for_selector('#share-modal', state='visible', timeout=self.timeout)
        
        # Set welcome message
        await page.fill('#share-welcome-message', 'Welcome to my test environment!')
        
        # Generate link
        await page.click('#generate-share-link-btn')
        
        # Wait for any storage operations to complete
        await page.wait_for_timeout(1000)
        
        # Get updated localStorage state
        updated_storage = await self._get_local_storage(page)
        
        # Check for namespace-related keys
        namespace_keys = []
        for key in updated_storage.keys():
            if 'namespace' in key.lower():
                namespace_keys.append(key)
        
        # Check if namespace keys were found
        if namespace_keys:
            # Check for namespace isolation
            namespace_isolation_found = False
            
            # Look for evidence of namespace isolation
            for key in namespace_keys:
                self.results['storage_items'].append({
                    'key': key,
                    'value': updated_storage[key],
                    'type': 'namespace',
                    'encrypted': self._is_likely_encrypted(updated_storage[key])
                })
                
                scenario_results['storage_items'].append({
                    'key': key,
                    'value': updated_storage[key],
                    'type': 'namespace',
                    'encrypted': self._is_likely_encrypted(updated_storage[key])
                })
                
                if self._is_likely_encrypted(updated_storage[key]):
                    namespace_isolation_found = True
                    self.results['summary']['encrypted_items'] += 1
                else:
                    self.results['summary']['unencrypted_items'] += 1
            
            if not namespace_isolation_found:
                # Add as a storage issue
                issue = {
                    'type': 'unencrypted_namespace',
                    'severity': 'medium',
                    'message': "Namespace information stored unencrypted in localStorage",
                    'details': {
                        'namespace_keys': namespace_keys
                    }
                }
                self.results['storage_issues'].append(issue)
                scenario_results['issues'].append(issue)
        else:
            # Add as a storage issue
            issue = {
                'type': 'namespace_not_found',
                'severity': 'high',
                'message': "Namespace information not found in localStorage after changing welcome message",
                'details': {
                    'storage_items': list(updated_storage.keys())
                }
            }
            self.results['storage_issues'].append(issue)
            scenario_results['issues'].append(issue)
        
        # Take a screenshot for the report
        screenshot_path = os.path.join(project_path, 'reports', 'namespace_isolation.png')
        os.makedirs(os.path.dirname(screenshot_path), exist_ok=True)
        await page.screenshot(path=screenshot_path)
        scenario_results['screenshot'] = screenshot_path
    
    async def _get_local_storage(self, page: Page) -> Dict[str, str]:
        """
        Get all items from localStorage.
        
        Args:
            page: Playwright page
            
        Returns:
            Dictionary of localStorage items
        """
        return await page.evaluate('''() => {
            const items = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                items[key] = localStorage.getItem(key);
            }
            return items;
        }''')
    
    def _is_likely_encrypted(self, value: str) -> bool:
        """
        Check if a value is likely encrypted.
        
        Args:
            value: Value to check
            
        Returns:
            True if the value is likely encrypted, False otherwise
        """
        # Check if the value is base64-encoded
        base64_pattern = r'^[A-Za-z0-9+/]+={0,2}$'
        if re.match(base64_pattern, value):
            # Check if the decoded value contains non-printable characters
            try:
                import base64
                decoded = base64.b64decode(value)
                # If more than 20% of the characters are non-printable, it's likely encrypted
                non_printable_count = sum(1 for b in decoded if b < 32 or b > 126)
                return non_printable_count / len(decoded) > 0.2
            except:
                # If decoding fails, it's not valid base64
                pass
        
        # Check for other common encryption patterns
        encryption_patterns = [
            # NaCl secretbox format
            r'^[A-Za-z0-9+/]{16,}={0,2}$',
            # JSON with encrypted data
            r'{"(?:iv|salt|nonce|ciphertext|encrypted)"',
            # Hex-encoded data
            r'^[0-9a-fA-F]{32,}$'
        ]
        
        for pattern in encryption_patterns:
            if re.search(pattern, value):
                return True
        
        return False
    
    def _calculate_storage_score(self) -> None:
        """
        Calculate a storage score based on the findings.
        """
        # Start with a perfect score
        score = 100.0
        
        # Deduct points for storage issues
        for issue in self.results['storage_issues']:
            if issue['severity'] == 'critical':
                score -= 20.0
            elif issue['severity'] == 'high':
                score -= 10.0
            elif issue['severity'] == 'medium':
                score -= 5.0
            elif issue['severity'] == 'low':
                score -= 2.0
        
        # Deduct points for unencrypted items
        if self.results['summary']['total_storage_items'] > 0:
            unencrypted_percentage = (self.results['summary']['unencrypted_items'] / self.results['summary']['total_storage_items']) * 100
            
            if unencrypted_percentage > 75:
                score -= 30.0
            elif unencrypted_percentage > 50:
                score -= 20.0
            elif unencrypted_percentage > 25:
                score -= 10.0
            elif unencrypted_percentage > 0:
                score -= 5.0
        
        # Ensure score is not negative
        score = max(0.0, score)
        
        self.results['summary']['storage_score'] = round(score, 1)
    
    def _generate_recommendations(self) -> None:
        """
        Generate recommendations based on the findings.
        """
        # Check for unencrypted API keys
        if any(issue['type'] == 'unencrypted_api_key' for issue in self.results['storage_issues']):
            self.results['recommendations'].append({
                'type': 'unencrypted_api_key',
                'message': "Encrypt API keys before storing them in localStorage",
                'priority': 'critical'
            })
        
        # Check for unencrypted conversation history
        if any(issue['type'] == 'unencrypted_conversation_history' for issue in self.results['storage_issues']):
            self.results['recommendations'].append({
                'type': 'unencrypted_conversation_history',
                'message': "Encrypt conversation history before storing it in localStorage",
                'priority': 'medium'
            })
        
        # Check for unencrypted settings
        if any(issue['type'] == 'unencrypted_settings' for issue in self.results['storage_issues']):
            self.results['recommendations'].append({
                'type': 'unencrypted_settings',
                'message': "Encrypt settings before storing them in localStorage",
                'priority': 'low'
            })
        
        # Check for namespace isolation issues
        if any(issue['type'] in ['unencrypted_namespace', 'namespace_not_found'] for issue in self.results['storage_issues']):
            self.results['recommendations'].append({
                'type': 'namespace_isolation',
                'message': "Implement proper namespace isolation with encryption for multi-tenant support",
                'priority': 'medium'
            })
        
        # General recommendations
        self.results['recommendations'].append({
            'type': 'general',
            'message': "Use a consistent encryption approach for all sensitive data stored in localStorage",
            'priority': 'medium'
        })
