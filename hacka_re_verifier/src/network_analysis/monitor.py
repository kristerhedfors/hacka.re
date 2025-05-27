"""
Network analysis module for hacka.re project.
Monitors network traffic to verify privacy claims.
"""

import os
import json
import logging
import asyncio
from typing import Dict, List, Any, Optional
from playwright.async_api import async_playwright, Page, Browser, BrowserContext
from urllib.parse import urlparse
import time

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
                'blocked_requests': 0,
                'allowed_requests': 0,
                'privacy_score': 0.0,
                'test_scenarios_passed': 0,
                'test_scenarios_failed': 0
            },
            'network_requests': [],
            'privacy_violations': [],
            'test_results': {},
            'screenshots': [],
            'recommendations': []
        }
    
    def analyze(self, project_path: str) -> Dict[str, Any]:
        """
        Analyze network traffic for the hacka.re project.
        
        Args:
            project_path: Path to the hacka.re project
            
        Returns:
            Dictionary containing network analysis results
        """
        logger.info(f"Starting network analysis of project at: {project_path}")
        
        # Run async analysis
        asyncio.run(self._run_analysis(project_path))
        
        # Calculate privacy score
        self._calculate_privacy_score()
        
        # Generate recommendations
        self._generate_recommendations()
        
        logger.info(f"Network analysis completed. Found {len(self.results['privacy_violations'])} privacy violations.")
        return self.results
    
    async def _run_analysis(self, project_path: str) -> None:
        """
        Run the network analysis using Playwright.
        
        Args:
            project_path: Path to the hacka.re project
        """
        async with async_playwright() as p:
            # Launch browser
            if self.browser_type == 'firefox':
                browser = await p.firefox.launch(headless=self.headless)
            elif self.browser_type == 'webkit':
                browser = await p.webkit.launch(headless=self.headless)
            else:
                browser = await p.chromium.launch(headless=self.headless)
            
            try:
                # Create context with network monitoring
                context = await browser.new_context()
                
                # Set up network monitoring
                context.on('request', self._on_request)
                context.on('response', self._on_response)
                
                # Run test scenarios
                for scenario in self.test_scenarios:
                    logger.info(f"Running test scenario: {scenario}")
                    try:
                        await self._run_test_scenario(context, project_path, scenario)
                        self.results['summary']['test_scenarios_passed'] += 1
                        self.results['test_results'][scenario] = {
                            'status': 'passed',
                            'message': 'Test scenario completed successfully'
                        }
                    except Exception as e:
                        logger.error(f"Test scenario {scenario} failed: {e}")
                        self.results['summary']['test_scenarios_failed'] += 1
                        self.results['test_results'][scenario] = {
                            'status': 'failed',
                            'message': str(e)
                        }
                
            finally:
                await browser.close()
    
    async def _run_test_scenario(self, context: BrowserContext, project_path: str, scenario: str) -> None:
        """
        Run a specific test scenario.
        
        Args:
            context: Browser context
            project_path: Path to the hacka.re project
            scenario: Test scenario name
        """
        page = await context.new_page()
        
        try:
            if scenario == 'page_load':
                await self._test_page_load(page, project_path)
            elif scenario == 'api_key_entry':
                await self._test_api_key_entry(page, project_path)
            elif scenario == 'chat_message':
                await self._test_chat_message(page, project_path)
            elif scenario == 'settings_change':
                await self._test_settings_change(page, project_path)
            elif scenario == 'function_calling':
                await self._test_function_calling(page, project_path)
            else:
                logger.warning(f"Unknown test scenario: {scenario}")
        
        finally:
            await page.close()
    
    async def _test_page_load(self, page: Page, project_path: str) -> None:
        """
        Test basic page loading for network requests.
        
        Args:
            page: Playwright page
            project_path: Path to the hacka.re project
        """
        # Navigate to the main page
        index_path = os.path.join(project_path, 'index.html')
        if os.path.exists(index_path):
            await page.goto(f'file://{os.path.abspath(index_path)}', timeout=self.timeout)
        else:
            # Try to find a local server or use localhost
            await page.goto('http://localhost:8000', timeout=self.timeout)
        
        # Wait for page to load
        await page.wait_for_load_state('networkidle', timeout=self.timeout)
        
        # Take screenshot
        screenshot_path = f"page_load_{int(time.time())}.png"
        await page.screenshot(path=screenshot_path)
        self.results['screenshots'].append({
            'scenario': 'page_load',
            'path': screenshot_path,
            'description': 'Page load screenshot'
        })
    
    async def _test_api_key_entry(self, page: Page, project_path: str) -> None:
        """
        Test API key entry for network requests.
        
        Args:
            page: Playwright page
            project_path: Path to the hacka.re project
        """
        # Navigate to the main page
        index_path = os.path.join(project_path, 'index.html')
        if os.path.exists(index_path):
            await page.goto(f'file://{os.path.abspath(index_path)}', timeout=self.timeout)
        else:
            await page.goto('http://localhost:8000', timeout=self.timeout)
        
        # Wait for page to load
        await page.wait_for_load_state('networkidle', timeout=self.timeout)
        
        # Try to find and fill API key field
        try:
            # Look for common API key input selectors
            api_key_selectors = [
                'input[placeholder*="API"]',
                'input[placeholder*="key"]',
                'input[id*="api"]',
                'input[name*="api"]',
                '#apiKey',
                '#api-key',
                '.api-key-input'
            ]
            
            for selector in api_key_selectors:
                try:
                    await page.fill(selector, 'test-api-key-12345', timeout=5000)
                    break
                except:
                    continue
            
            # Wait for any network requests
            await page.wait_for_timeout(2000)
            
        except Exception as e:
            logger.debug(f"Could not find API key input: {e}")
        
        # Take screenshot
        screenshot_path = f"api_key_entry_{int(time.time())}.png"
        await page.screenshot(path=screenshot_path)
        self.results['screenshots'].append({
            'scenario': 'api_key_entry',
            'path': screenshot_path,
            'description': 'API key entry screenshot'
        })
    
    async def _test_chat_message(self, page: Page, project_path: str) -> None:
        """
        Test sending a chat message for network requests.
        
        Args:
            page: Playwright page
            project_path: Path to the hacka.re project
        """
        # Navigate to the main page
        index_path = os.path.join(project_path, 'index.html')
        if os.path.exists(index_path):
            await page.goto(f'file://{os.path.abspath(index_path)}', timeout=self.timeout)
        else:
            await page.goto('http://localhost:8000', timeout=self.timeout)
        
        # Wait for page to load
        await page.wait_for_load_state('networkidle', timeout=self.timeout)
        
        try:
            # Look for message input field
            message_selectors = [
                'textarea[placeholder*="message"]',
                'input[placeholder*="message"]',
                'textarea[placeholder*="chat"]',
                '#messageInput',
                '#message-input',
                '.message-input'
            ]
            
            for selector in message_selectors:
                try:
                    await page.fill(selector, 'Test message for network analysis', timeout=5000)
                    
                    # Try to find and click send button
                    send_selectors = [
                        'button[type="submit"]',
                        'button:has-text("Send")',
                        'button:has-text("Submit")',
                        '#sendButton',
                        '.send-button'
                    ]
                    
                    for send_selector in send_selectors:
                        try:
                            await page.click(send_selector, timeout=5000)
                            break
                        except:
                            continue
                    
                    break
                except:
                    continue
            
            # Wait for any network requests
            await page.wait_for_timeout(3000)
            
        except Exception as e:
            logger.debug(f"Could not send chat message: {e}")
        
        # Take screenshot
        screenshot_path = f"chat_message_{int(time.time())}.png"
        await page.screenshot(path=screenshot_path)
        self.results['screenshots'].append({
            'scenario': 'chat_message',
            'path': screenshot_path,
            'description': 'Chat message screenshot'
        })
    
    async def _test_settings_change(self, page: Page, project_path: str) -> None:
        """
        Test changing settings for network requests.
        
        Args:
            page: Playwright page
            project_path: Path to the hacka.re project
        """
        # Navigate to the main page
        index_path = os.path.join(project_path, 'index.html')
        if os.path.exists(index_path):
            await page.goto(f'file://{os.path.abspath(index_path)}', timeout=self.timeout)
        else:
            await page.goto('http://localhost:8000', timeout=self.timeout)
        
        # Wait for page to load
        await page.wait_for_load_state('networkidle', timeout=self.timeout)
        
        try:
            # Look for settings button or menu
            settings_selectors = [
                'button:has-text("Settings")',
                'button:has-text("⚙")',
                '#settingsButton',
                '.settings-button',
                '[data-testid="settings"]'
            ]
            
            for selector in settings_selectors:
                try:
                    await page.click(selector, timeout=5000)
                    await page.wait_for_timeout(1000)
                    break
                except:
                    continue
            
            # Try to change some settings
            # Look for theme toggle, model selection, etc.
            setting_selectors = [
                'select[name*="model"]',
                'select[name*="theme"]',
                'input[type="checkbox"]',
                'input[type="radio"]'
            ]
            
            for selector in setting_selectors:
                try:
                    elements = await page.query_selector_all(selector)
                    if elements:
                        await elements[0].click()
                        await page.wait_for_timeout(500)
                except:
                    continue
            
            # Wait for any network requests
            await page.wait_for_timeout(2000)
            
        except Exception as e:
            logger.debug(f"Could not change settings: {e}")
        
        # Take screenshot
        screenshot_path = f"settings_change_{int(time.time())}.png"
        await page.screenshot(path=screenshot_path)
        self.results['screenshots'].append({
            'scenario': 'settings_change',
            'path': screenshot_path,
            'description': 'Settings change screenshot'
        })
    
    async def _test_function_calling(self, page: Page, project_path: str) -> None:
        """
        Test function calling feature for network requests.
        
        Args:
            page: Playwright page
            project_path: Path to the hacka.re project
        """
        # Navigate to the main page
        index_path = os.path.join(project_path, 'index.html')
        if os.path.exists(index_path):
            await page.goto(f'file://{os.path.abspath(index_path)}', timeout=self.timeout)
        else:
            await page.goto('http://localhost:8000', timeout=self.timeout)
        
        # Wait for page to load
        await page.wait_for_load_state('networkidle', timeout=self.timeout)
        
        try:
            # Look for function calling related elements
            function_selectors = [
                'button:has-text("Function")',
                'button:has-text("Tool")',
                '.function-button',
                '[data-testid="function"]'
            ]
            
            for selector in function_selectors:
                try:
                    await page.click(selector, timeout=5000)
                    await page.wait_for_timeout(1000)
                    break
                except:
                    continue
            
            # Wait for any network requests
            await page.wait_for_timeout(2000)
            
        except Exception as e:
            logger.debug(f"Could not test function calling: {e}")
        
        # Take screenshot
        screenshot_path = f"function_calling_{int(time.time())}.png"
        await page.screenshot(path=screenshot_path)
        self.results['screenshots'].append({
            'scenario': 'function_calling',
            'path': screenshot_path,
            'description': 'Function calling screenshot'
        })
    
    def _on_request(self, request) -> None:
        """
        Handle network requests.
        
        Args:
            request: Playwright request object
        """
        url = request.url
        domain = urlparse(url).netloc
        
        # Record the request
        request_info = {
            'url': url,
            'domain': domain,
            'method': request.method,
            'resource_type': request.resource_type,
            'timestamp': time.time()
        }
        
        self.results['network_requests'].append(request_info)
        self.results['summary']['total_requests'] += 1
        
        # Check if domain is allowed or blocked
        if self._is_blocked_domain(domain):
            self.results['summary']['blocked_requests'] += 1
            self.results['privacy_violations'].append({
                'type': 'blocked_domain_request',
                'severity': 'high',
                'message': f"Request to blocked domain: {domain}",
                'url': url,
                'domain': domain
            })
        elif self._is_allowed_domain(domain):
            self.results['summary']['allowed_requests'] += 1
        else:
            # Unknown domain - potential privacy concern
            if not self._is_local_request(url):
                self.results['privacy_violations'].append({
                    'type': 'unknown_domain_request',
                    'severity': 'medium',
                    'message': f"Request to unknown domain: {domain}",
                    'url': url,
                    'domain': domain
                })
        
        logger.debug(f"Network request: {request.method} {url}")
    
    def _on_response(self, response) -> None:
        """
        Handle network responses.
        
        Args:
            response: Playwright response object
        """
        # Log response for debugging
        logger.debug(f"Network response: {response.status} {response.url}")
    
    def _is_blocked_domain(self, domain: str) -> bool:
        """
        Check if a domain is in the blocked list.
        
        Args:
            domain: Domain to check
            
        Returns:
            True if domain is blocked, False otherwise
        """
        return any(blocked in domain for blocked in self.blocked_domains)
    
    def _is_allowed_domain(self, domain: str) -> bool:
        """
        Check if a domain is in the allowed list.
        
        Args:
            domain: Domain to check
            
        Returns:
            True if domain is allowed, False otherwise
        """
        return any(allowed in domain for allowed in self.allowed_domains)
    
    def _is_local_request(self, url: str) -> bool:
        """
        Check if a request is to a local resource.
        
        Args:
            url: URL to check
            
        Returns:
            True if request is local, False otherwise
        """
        return (url.startswith('file://') or 
                url.startswith('data:') or
                url.startswith('blob:') or
                'localhost' in url or
                '127.0.0.1' in url or
                url.startswith('/'))
    
    def _calculate_privacy_score(self) -> None:
        """
        Calculate a privacy score based on network analysis results.
        """
        total_requests = self.results['summary']['total_requests']
        
        if total_requests == 0:
            self.results['summary']['privacy_score'] = 100.0
            return
        
        # Start with perfect score
        score = 100.0
        
        # Deduct points for privacy violations
        for violation in self.results['privacy_violations']:
            if violation['severity'] == 'high':
                score -= 15.0
            elif violation['severity'] == 'medium':
                score -= 8.0
            elif violation['severity'] == 'low':
                score -= 3.0
        
        # Bonus points for having no external requests
        external_requests = [req for req in self.results['network_requests'] 
                           if not self._is_local_request(req['url'])]
        
        if len(external_requests) == 0:
            score += 10.0  # Bonus for no external requests
        
        # Ensure score is within bounds
        score = max(0.0, min(100.0, score))
        
        self.results['summary']['privacy_score'] = round(score, 1)
    
    def _generate_recommendations(self) -> None:
        """
        Generate recommendations based on network analysis results.
        """
        # Check for blocked domain requests
        blocked_violations = [v for v in self.results['privacy_violations'] 
                            if v['type'] == 'blocked_domain_request']
        if blocked_violations:
            self.results['recommendations'].append({
                'type': 'blocked_domain_request',
                'message': f"Remove requests to {len(blocked_violations)} blocked tracking domains",
                'priority': 'high'
            })
        
        # Check for unknown domain requests
        unknown_violations = [v for v in self.results['privacy_violations'] 
                            if v['type'] == 'unknown_domain_request']
        if unknown_violations:
            unique_domains = set(v['domain'] for v in unknown_violations)
            self.results['recommendations'].append({
                'type': 'unknown_domain_request',
                'message': f"Review requests to {len(unique_domains)} unknown domains: {', '.join(list(unique_domains)[:3])}{'...' if len(unique_domains) > 3 else ''}",
                'priority': 'medium'
            })
        
        # Check for excessive external requests
        external_requests = [req for req in self.results['network_requests'] 
                           if not self._is_local_request(req['url'])]
        if len(external_requests) > 10:
            self.results['recommendations'].append({
                'type': 'excessive_external_requests',
                'message': f"Consider reducing {len(external_requests)} external requests for better privacy",
                'priority': 'medium'
            })
        
        # Positive feedback for good privacy practices
        if len(self.results['privacy_violations']) == 0:
            self.results['recommendations'].append({
                'type': 'good_privacy_practices',
                'message': "Excellent! No privacy violations detected in network traffic",
                'priority': 'info'
            })
