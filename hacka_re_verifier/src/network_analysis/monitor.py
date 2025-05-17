"""
Network traffic monitor for hacka.re project.
Monitors network requests to verify data privacy claims.
"""

import os
import re
import json
import logging
import asyncio
from pathlib import Path
from typing import Dict, List, Any, Optional, Set
from urllib.parse import urlparse
from playwright.async_api import async_playwright, Page, Browser, BrowserContext, Request, Response

logger = logging.getLogger('hacka_re_verifier.network_analysis')


class NetworkMonitor:
    """Network traffic monitor for hacka.re project."""
    
    def __init__(self, config):
        """
        Initialize the network monitor.
        
        Args:
            config: Configuration object
        """
        self.config = config
        self.allowed_domains = config.get('modules.network_analysis.allowed_domains', [])
        self.blocked_domains = config.get('modules.network_analysis.blocked_domains', [])
        self.test_scenarios = config.get('modules.network_analysis.test_scenarios', [])
        self.browser_type = config.get('modules.network_analysis.browser', 'chromium')
        self.headless = config.get('modules.network_analysis.headless', True)
        self.timeout = config.get('timeout', 30) * 1000  # Convert to milliseconds
        
        self.results = {
            'summary': {
                'total_requests': 0,
                'allowed_requests': 0,
                'blocked_requests': 0,
                'unknown_requests': 0,
                'privacy_score': 0.0
            },
            'requests': [],
            'privacy_issues': [],
            'recommendations': [],
            'test_scenarios': {}
        }
    
    def analyze(self, project_path: str) -> Dict[str, Any]:
        """
        Analyze the network traffic of the hacka.re project.
        
        Args:
            project_path: Path to the hacka.re project
            
        Returns:
            Dictionary containing analysis results
        """
        logger.info(f"Starting network analysis of project at: {project_path}")
        
        # Run the network analysis asynchronously
        asyncio.run(self._run_analysis(project_path))
        
        # Calculate privacy score
        self._calculate_privacy_score()
        
        # Generate recommendations
        self._generate_recommendations()
        
        logger.info(f"Network analysis completed. Found {len(self.results['privacy_issues'])} privacy issues.")
        return self.results
    
    async def _run_analysis(self, project_path: str) -> None:
        """
        Run the network analysis asynchronously.
        
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
            'requests': [],
            'issues': []
        }
        
        # Create a new page
        page = await context.new_page()
        
        try:
            # Set up request monitoring
            await self._setup_request_monitoring(page, scenario_results)
            
            # Run the appropriate scenario
            if scenario == 'page_load':
                await self._test_page_load(page, project_path, scenario_results)
            elif scenario == 'api_key_entry':
                await self._test_api_key_entry(page, project_path, scenario_results)
            elif scenario == 'chat_message':
                await self._test_chat_message(page, project_path, scenario_results)
            elif scenario == 'settings_change':
                await self._test_settings_change(page, project_path, scenario_results)
            elif scenario == 'function_calling':
                await self._test_function_calling(page, project_path, scenario_results)
            else:
                logger.warning(f"Unknown test scenario: {scenario}")
        except Exception as e:
            logger.error(f"Error running test scenario {scenario}: {e}")
            scenario_results['error'] = str(e)
        finally:
            await page.close()
        
        return scenario_results
    
    async def _setup_request_monitoring(self, page: Page, scenario_results: Dict[str, Any]) -> None:
        """
        Set up request monitoring for a page.
        
        Args:
            page: Playwright page
            scenario_results: Dictionary to store scenario results
        """
        # Monitor all requests
        async def on_request(request: Request):
            url = request.url
            method = request.method
            headers = request.headers
            post_data = request.post_data
            resource_type = request.resource_type
            
            # Parse URL to get domain
            parsed_url = urlparse(url)
            domain = parsed_url.netloc
            
            # Determine if request is allowed
            is_allowed = self._is_domain_allowed(domain)
            is_blocked = self._is_domain_blocked(domain)
            
            # Create request info
            request_info = {
                'url': url,
                'method': method,
                'headers': headers,
                'post_data': post_data,
                'resource_type': resource_type,
                'domain': domain,
                'is_allowed': is_allowed,
                'is_blocked': is_blocked
            }
            
            # Add to scenario results
            scenario_results['requests'].append(request_info)
            
            # Add to overall results
            self.results['requests'].append(request_info)
            self.results['summary']['total_requests'] += 1
            
            if is_allowed:
                self.results['summary']['allowed_requests'] += 1
            elif is_blocked:
                self.results['summary']['blocked_requests'] += 1
                
                # Add as a privacy issue
                self.results['privacy_issues'].append({
                    'type': 'blocked_domain_request',
                    'severity': 'high',
                    'message': f"Request to blocked domain detected: {domain}",
                    'details': {
                        'url': url,
                        'method': method,
                        'resource_type': resource_type
                    }
                })
                
                # Add to scenario issues
                scenario_results['issues'].append({
                    'type': 'blocked_domain_request',
                    'severity': 'high',
                    'message': f"Request to blocked domain detected: {domain}",
                    'details': {
                        'url': url,
                        'method': method,
                        'resource_type': resource_type
                    }
                })
            else:
                self.results['summary']['unknown_requests'] += 1
                
                # Add as a privacy issue with lower severity
                self.results['privacy_issues'].append({
                    'type': 'unknown_domain_request',
                    'severity': 'medium',
                    'message': f"Request to unknown domain detected: {domain}",
                    'details': {
                        'url': url,
                        'method': method,
                        'resource_type': resource_type
                    }
                })
                
                # Add to scenario issues
                scenario_results['issues'].append({
                    'type': 'unknown_domain_request',
                    'severity': 'medium',
                    'message': f"Request to unknown domain detected: {domain}",
                    'details': {
                        'url': url,
                        'method': method,
                        'resource_type': resource_type
                    }
                })
            
            # Check for API key in URL or headers
            if self._contains_api_key(url) or self._contains_api_key_in_headers(headers):
                # Check if it's going to an allowed domain
                if not is_allowed:
                    self.results['privacy_issues'].append({
                        'type': 'api_key_leak',
                        'severity': 'critical',
                        'message': f"API key sent to non-allowed domain: {domain}",
                        'details': {
                            'url': url,
                            'method': method,
                            'resource_type': resource_type
                        }
                    })
                    
                    # Add to scenario issues
                    scenario_results['issues'].append({
                        'type': 'api_key_leak',
                        'severity': 'critical',
                        'message': f"API key sent to non-allowed domain: {domain}",
                        'details': {
                            'url': url,
                            'method': method,
                            'resource_type': resource_type
                        }
                    })
        
        # Set up request handler
        page.on('request', on_request)
    
    async def _test_page_load(self, page: Page, project_path: str, scenario_results: Dict[str, Any]) -> None:
        """
        Test scenario: Page load.
        
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
        
        # Take a screenshot for the report
        screenshot_path = os.path.join(project_path, 'reports', 'page_load.png')
        os.makedirs(os.path.dirname(screenshot_path), exist_ok=True)
        await page.screenshot(path=screenshot_path)
        scenario_results['screenshot'] = screenshot_path
    
    async def _test_api_key_entry(self, page: Page, project_path: str, scenario_results: Dict[str, Any]) -> None:
        """
        Test scenario: API key entry.
        
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
            
            # Wait for any network activity to settle
            await page.wait_for_load_state('networkidle', timeout=self.timeout)
        else:
            # Open settings modal
            await page.click('#settings-btn')
            
            # Wait for settings modal to appear
            await page.wait_for_selector('#settings-modal', state='visible', timeout=self.timeout)
            
            # Enter a test API key
            await page.fill('#api-key-update', 'sk-test-api-key-for-verification-purposes-only')
            
            # Save settings
            await page.click('#save-settings-btn')
            
            # Wait for any network activity to settle
            await page.wait_for_load_state('networkidle', timeout=self.timeout)
        
        # Take a screenshot for the report
        screenshot_path = os.path.join(project_path, 'reports', 'api_key_entry.png')
        os.makedirs(os.path.dirname(screenshot_path), exist_ok=True)
        await page.screenshot(path=screenshot_path)
        scenario_results['screenshot'] = screenshot_path
    
    async def _test_chat_message(self, page: Page, project_path: str, scenario_results: Dict[str, Any]) -> None:
        """
        Test scenario: Chat message.
        
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
            
            # Wait for any network activity to settle
            await page.wait_for_load_state('networkidle', timeout=self.timeout)
        
        # Enter a test message
        await page.fill('#message-input', 'This is a test message for network analysis')
        
        # Submit the message
        await page.click('#send-btn')
        
        # Wait for any network activity to settle
        await page.wait_for_load_state('networkidle', timeout=self.timeout)
        
        # Take a screenshot for the report
        screenshot_path = os.path.join(project_path, 'reports', 'chat_message.png')
        os.makedirs(os.path.dirname(screenshot_path), exist_ok=True)
        await page.screenshot(path=screenshot_path)
        scenario_results['screenshot'] = screenshot_path
    
    async def _test_settings_change(self, page: Page, project_path: str, scenario_results: Dict[str, Any]) -> None:
        """
        Test scenario: Settings change.
        
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
            
            # Wait for any network activity to settle
            await page.wait_for_load_state('networkidle', timeout=self.timeout)
        
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
        
        # Wait for any network activity to settle
        await page.wait_for_load_state('networkidle', timeout=self.timeout)
        
        # Take a screenshot for the report
        screenshot_path = os.path.join(project_path, 'reports', 'settings_change.png')
        os.makedirs(os.path.dirname(screenshot_path), exist_ok=True)
        await page.screenshot(path=screenshot_path)
        scenario_results['screenshot'] = screenshot_path
    
    async def _test_function_calling(self, page: Page, project_path: str, scenario_results: Dict[str, Any]) -> None:
        """
        Test scenario: Function calling.
        
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
            
            # Wait for any network activity to settle
            await page.wait_for_load_state('networkidle', timeout=self.timeout)
        
        # Open function modal
        await page.click('#function-btn')
        
        # Wait for function modal to appear
        await page.wait_for_selector('#function-modal', state='visible', timeout=self.timeout)
        
        # Add a test function
        await page.fill('#function-code', '''
        /**
         * @description Add two numbers together
         * @param {number} a - First number
         * @param {number} b - Second number
         */
        function add_numbers(a, b) {
            return a + b;
        }
        ''')
        
        # Wait for function name to be auto-populated
        await page.wait_for_selector('#function-name[value="add_numbers"]', timeout=self.timeout)
        
        # Save the function
        await page.click('#function-editor-form button[type="submit"]')
        
        # Close the function modal
        await page.click('#close-function-modal')
        
        # Wait for any network activity to settle
        await page.wait_for_load_state('networkidle', timeout=self.timeout)
        
        # Take a screenshot for the report
        screenshot_path = os.path.join(project_path, 'reports', 'function_calling.png')
        os.makedirs(os.path.dirname(screenshot_path), exist_ok=True)
        await page.screenshot(path=screenshot_path)
        scenario_results['screenshot'] = screenshot_path
    
    def _is_domain_allowed(self, domain: str) -> bool:
        """
        Check if a domain is in the allowed list.
        
        Args:
            domain: Domain to check
            
        Returns:
            True if the domain is allowed, False otherwise
        """
        return any(allowed in domain for allowed in self.allowed_domains)
    
    def _is_domain_blocked(self, domain: str) -> bool:
        """
        Check if a domain is in the blocked list.
        
        Args:
            domain: Domain to check
            
        Returns:
            True if the domain is blocked, False otherwise
        """
        return any(blocked in domain for blocked in self.blocked_domains)
    
    def _contains_api_key(self, url: str) -> bool:
        """
        Check if a URL contains an API key.
        
        Args:
            url: URL to check
            
        Returns:
            True if the URL contains an API key, False otherwise
        """
        # Check for common API key patterns in URL
        api_key_patterns = [
            r'api[_-]?key=([^&]+)',
            r'apikey=([^&]+)',
            r'key=([^&]+)',
            r'token=([^&]+)',
            r'auth=([^&]+)',
            r'sk-[a-zA-Z0-9]+'  # OpenAI API key pattern
        ]
        
        for pattern in api_key_patterns:
            if re.search(pattern, url, re.IGNORECASE):
                return True
        
        return False
    
    def _contains_api_key_in_headers(self, headers: Dict[str, str]) -> bool:
        """
        Check if headers contain an API key.
        
        Args:
            headers: Headers to check
            
        Returns:
            True if the headers contain an API key, False otherwise
        """
        # Check for common API key patterns in headers
        api_key_headers = [
            'authorization',
            'x-api-key',
            'api-key',
            'apikey',
            'x-auth-token',
            'token'
        ]
        
        for header in api_key_headers:
            if header in headers:
                # Check if it's a Bearer token
                if header == 'authorization' and headers[header].startswith('Bearer '):
                    return True
                # Check for other API key patterns
                elif header in headers:
                    return True
        
        return False
    
    def _calculate_privacy_score(self) -> None:
        """
        Calculate a privacy score based on the findings.
        """
        # Start with a perfect score
        score = 100.0
        
        # Deduct points for privacy issues
        for issue in self.results['privacy_issues']:
            if issue['severity'] == 'critical':
                score -= 20.0
            elif issue['severity'] == 'high':
                score -= 10.0
            elif issue['severity'] == 'medium':
                score -= 5.0
            elif issue['severity'] == 'low':
                score -= 2.0
        
        # Deduct points for unknown requests
        unknown_requests_percentage = 0
        if self.results['summary']['total_requests'] > 0:
            unknown_requests_percentage = (self.results['summary']['unknown_requests'] / self.results['summary']['total_requests']) * 100
        
        if unknown_requests_percentage > 50:
            score -= 20.0
        elif unknown_requests_percentage > 25:
            score -= 10.0
        elif unknown_requests_percentage > 10:
            score -= 5.0
        elif unknown_requests_percentage > 0:
            score -= 2.0
        
        # Deduct points for blocked requests
        blocked_requests_percentage = 0
        if self.results['summary']['total_requests'] > 0:
            blocked_requests_percentage = (self.results['summary']['blocked_requests'] / self.results['summary']['total_requests']) * 100
        
        if blocked_requests_percentage > 0:
            score -= 30.0  # Any blocked request is a serious privacy issue
        
        # Ensure score is not negative
        score = max(0.0, score)
        
        self.results['summary']['privacy_score'] = round(score, 1)
    
    def _generate_recommendations(self) -> None:
        """
        Generate recommendations based on the findings.
        """
        # Check for API key leaks
        if any(issue['type'] == 'api_key_leak' for issue in self.results['privacy_issues']):
            self.results['recommendations'].append({
                'type': 'api_key_leak',
                'message': "Ensure API keys are only sent to authorized domains",
                'priority': 'critical'
            })
        
        # Check for blocked domain requests
        if any(issue['type'] == 'blocked_domain_request' for issue in self.results['privacy_issues']):
            self.results['recommendations'].append({
                'type': 'blocked_domain_request',
                'message': "Remove requests to tracking and analytics domains",
                'priority': 'high'
            })
        
        # Check for unknown domain requests
        if any(issue['type'] == 'unknown_domain_request' for issue in self.results['privacy_issues']):
            self.results['recommendations'].append({
                'type': 'unknown_domain_request',
                'message': "Review and validate all external domain requests",
                'priority': 'medium'
            })
        
        # General recommendation for network privacy
        self.results['recommendations'].append({
            'type': 'general',
            'message': "Implement Content Security Policy (CSP) to restrict external connections",
            'priority': 'medium'
        })
