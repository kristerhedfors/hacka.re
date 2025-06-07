#!/usr/bin/env python3
"""
Main entry point for OpenAI Proxy package
"""

import argparse
import sys
import os
from typing import Optional

def main():
    """Main entry point for the OpenAI Proxy package"""
    parser = argparse.ArgumentParser(description='OpenAI Proxy - Minimal API-compatible proxies')
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Proxy commands
    proxy_parser = subparsers.add_parser('proxy', help='Run a proxy server')
    proxy_parser.add_argument('--type', choices=['wsgi', 'starlette', 'flask', 'authenticated', 'ed25519'], 
                             required=True, help='Type of proxy to run')
    proxy_parser.add_argument('--host', default='127.0.0.1', help='Host to bind to (default: 127.0.0.1)')
    proxy_parser.add_argument('--port', type=int, default=8000, help='Port to bind to (default: 8000)')
    proxy_parser.add_argument('--rate-limited', action='store_true', help='Use rate-limited version')
    
    # Test commands
    test_parser = subparsers.add_parser('test', help='Run tests')
    test_parser.add_argument('--type', choices=['all', 'minimal', 'rate-limited', 'pure-python', 'openai-api', 'tool-calling'],
                            default='all', help='Type of tests to run')
    test_parser.add_argument('--proxy-url', default='http://localhost:8000', help='Proxy URL for testing')
    
    # Content commands
    content_parser = subparsers.add_parser('content', help='Content development tools')
    content_parser.add_argument('--generate', choices=['functions', 'prompts'], help='Generate example content')
    content_parser.add_argument('--export', action='store_true', help='Export to hacka.re format')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return 1
    
    try:
        if args.command == 'proxy':
            return run_proxy(args)
        elif args.command == 'test':
            return run_tests(args)
        elif args.command == 'content':
            return run_content_tools(args)
        else:
            print(f"Unknown command: {args.command}")
            return 1
    except KeyboardInterrupt:
        print("\nInterrupted by user")
        return 1
    except Exception as e:
        print(f"Error: {e}")
        return 1

def run_proxy(args):
    """Run a proxy server"""
    print(f"Starting {args.type} proxy on {args.host}:{args.port}")
    
    if args.rate_limited:
        print("Using rate-limited version")
        from .proxies.rate_limited import get_proxy_app
    else:
        from .proxies.minimal import get_proxy_app
    
    app = get_proxy_app(args.type)
    
    if args.type == 'wsgi':
        # Use gunicorn for WSGI
        import subprocess
        cmd = [
            'gunicorn', 
            f'openai_proxy.src.proxies.{"rate_limited" if args.rate_limited else "minimal"}.wsgi_proxy:application',
            '--bind', f'{args.host}:{args.port}',
            '--workers', '1'
        ]
        return subprocess.call(cmd)
    elif args.type in ['starlette', 'authenticated', 'ed25519']:
        # Use uvicorn for ASGI
        import uvicorn
        uvicorn.run(app, host=args.host, port=args.port)
    elif args.type == 'flask':
        # Run Flask directly
        app.run(host=args.host, port=args.port)
    
    return 0

def run_tests(args):
    """Run tests"""
    print(f"Running {args.type} tests against {args.proxy_url}")
    
    if args.type == 'all':
        from .testing import test_minimal_proxies, test_rate_limited_proxies, test_pure_python, test_openai_api, test_tool_calling
        modules = [test_minimal_proxies, test_rate_limited_proxies, test_pure_python, test_openai_api, test_tool_calling]
    elif args.type == 'minimal':
        from .testing import test_minimal_proxies
        modules = [test_minimal_proxies]
    elif args.type == 'rate-limited':
        from .testing import test_rate_limited_proxies
        modules = [test_rate_limited_proxies]
    elif args.type == 'pure-python':
        from .testing import test_pure_python
        modules = [test_pure_python]
    elif args.type == 'openai-api':
        from .testing import test_openai_api
        modules = [test_openai_api]
    elif args.type == 'tool-calling':
        from .testing import test_tool_calling
        modules = [test_tool_calling]
    
    success = True
    for module in modules:
        try:
            result = module.run_tests(args.proxy_url)
            if not result:
                success = False
        except Exception as e:
            print(f"Test module {module.__name__} failed: {e}")
            success = False
    
    return 0 if success else 1

def run_content_tools(args):
    """Run content development tools"""
    if args.generate:
        print(f"Generating example {args.generate}")
        if args.generate == 'functions':
            from .content.default_functions import examples
            examples.generate_examples()
        elif args.generate == 'prompts':
            from .content.default_prompts import examples
            examples.generate_examples()
    
    if args.export:
        print("Exporting to hacka.re format")
        # TODO: Implement export functionality
    
    return 0

if __name__ == '__main__':
    sys.exit(main())
