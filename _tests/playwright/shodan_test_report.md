# Shodan MCP Test Report

## Configuration
- **Browser**: chromium
- **Mode**: Headless
- **Timeout**: 30000ms
- **Date**: Tue Aug 19 20:45:42 CEST 2025

## Test Results
```
ImportError while loading conftest '/Users/user/dev/hacka.re/_tests/playwright/shodan/conftest.py'.
shodan/conftest.py:20: in <module>
    from conftest import serve_hacka_re
E   ImportError: cannot import name 'serve_hacka_re' from partially initialized module 'conftest' (most likely due to a circular import) (/Users/user/dev/hacka.re/_tests/playwright/shodan/conftest.py)
```

## Test Categories Covered
- **Search APIs**: Host information, search queries, facets, filters
- **DNS APIs**: Domain info, DNS resolution, reverse DNS
- **Account APIs**: Profile, API info, rate limits
- **Enrichment Workflows**: Multi-step information gathering

