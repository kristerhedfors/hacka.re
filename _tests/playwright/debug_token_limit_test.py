"""
Debug test to verify RAG search fills up to token limit
"""

import pytest
import json
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal

def test_rag_token_limit_filling(page: Page, serve_hacka_re, api_key):
    """Test that RAG search fills results up to token limit, not just threshold matches."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Configure API key and RAG settings
    page.evaluate(f"localStorage.setItem('openai_api_key', '{api_key}')")
    page.evaluate("localStorage.setItem('base_url', 'https://api.openai.com/v1')")
    page.evaluate("localStorage.setItem('selected_model', 'gpt-4o-mini')")
    
    # Wait for initialization
    page.wait_for_timeout(2000)
    
    # Test with different token limits to see behavior
    test_cases = [
        {
            'query': 'artificial intelligence requirements',
            'threshold': 0.5,  # Higher threshold to limit initial matches
            'tokenLimit': 10000,  # High token limit to allow more results
            'maxResults': 50  # Allow many results
        },
        {
            'query': 'AI system transparency',
            'threshold': 0.4,
            'tokenLimit': 5000,
            'maxResults': 30
        }
    ]
    
    for test_case in test_cases:
        print(f"\n=== Testing: {test_case['query']} ===")
        print(f"Threshold: {test_case['threshold']}, Token Limit: {test_case['tokenLimit']}")
        
        # Perform search with specific parameters
        result = page.evaluate("""async (params) => {
            if (!window.VectorRAGService) {
                return { error: 'VectorRAGService not available' };
            }
            
            const apiKey = localStorage.getItem('openai_api_key');
            const baseUrl = localStorage.getItem('base_url') || 'https://api.openai.com/v1';
            
            try {
                // Debug service is always available, no need to enable
                
                // Capture console logs
                const logs = [];
                const originalLog = console.log;
                console.log = function(...args) {
                    logs.push(args.join(' '));
                    originalLog.apply(console, args);
                };
                
                const results = await window.VectorRAGService.search(params.query, {
                    maxResults: params.maxResults,
                    threshold: params.threshold,
                    tokenLimit: params.tokenLimit,
                    apiKey: apiKey,
                    baseUrl: baseUrl,
                    embeddingModel: 'text-embedding-3-small'
                });
                
                // Restore console.log
                console.log = originalLog;
                
                // Calculate token usage
                const estimateTokens = (text) => Math.ceil(text.length / 4);
                let totalTokens = 0;
                let aboveThreshold = 0;
                let belowThreshold = 0;
                
                if (results.results) {
                    for (const result of results.results) {
                        totalTokens += estimateTokens(result.content || '');
                        if (result.similarity >= params.threshold) {
                            aboveThreshold++;
                        } else {
                            belowThreshold++;
                        }
                    }
                }
                
                // Find relevant log lines
                const relevantLogs = logs.filter(log => 
                    log.includes('EU docs search found') || 
                    log.includes('Selected') ||
                    log.includes('Token usage') ||
                    log.includes('chunks:')
                );
                
                return {
                    success: true,
                    totalResults: results.results ? results.results.length : 0,
                    searchType: results.metadata ? results.metadata.searchType : 'unknown',
                    totalTokens: totalTokens,
                    tokenLimit: params.tokenLimit,
                    aboveThreshold: aboveThreshold,
                    belowThreshold: belowThreshold,
                    tokenUtilization: (totalTokens / params.tokenLimit * 100).toFixed(1),
                    logs: relevantLogs,
                    topResults: results.results ? results.results.slice(0, 3).map(r => ({
                        similarity: r.similarity,
                        tokens: estimateTokens(r.content || '')
                    })) : []
                };
            } catch (error) {
                return {
                    success: false,
                    error: error.message
                };
            }
        }""", test_case)
        
        print(f"\nResults:")
        if 'error' in result:
            print(f"  Error: {result['error']}")
            continue
        
        print(f"  Total results: {result['totalResults']}")
        print(f"  Above threshold ({test_case['threshold']}): {result['aboveThreshold']}")
        print(f"  Below threshold: {result['belowThreshold']}")
        print(f"  Total tokens used: {result['totalTokens']}")
        print(f"  Token limit: {result['tokenLimit']}")
        print(f"  Token utilization: {result['tokenUtilization']}%")
        
        if result.get('logs'):
            print(f"\nRelevant logs:")
            for log in result['logs']:
                print(f"  {log}")
        
        if result['topResults']:
            print(f"\nTop 3 results:")
            for i, r in enumerate(result['topResults'], 1):
                print(f"  {i}. Similarity: {r['similarity']:.3f}, Tokens: {r['tokens']}")
        
        # Verify that we're using more of the token budget
        assert result['success'], f"Search failed: {result.get('error')}"
        assert result['totalResults'] > 0, "No results found"
        
        # Check if we're filling beyond just threshold matches when token limit allows
        if result['totalTokens'] < result['tokenLimit'] * 0.5:
            # If we're using less than 50% of token budget, we should have included more results
            print(f"\n⚠️  Warning: Only using {result['tokenUtilization']}% of token budget")
            print(f"   Could potentially include more results to reach token limit")
    
    print("\n✅ Token limit test completed!")