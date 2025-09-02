"""
Test RAG search functionality with pre-cached embeddings
Verifies that actual vector search works with the generated embeddings
"""

import pytest
import time
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_rag_search_with_real_embeddings(page: Page, serve_hacka_re, api_key):
    """Test that RAG search works with real pre-cached embeddings and API key for query."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Configure API key for query embedding generation
    page.evaluate(f"localStorage.setItem('openai_api_key', '{api_key}')")
    page.evaluate("localStorage.setItem('base_url', 'https://api.openai.com/v1')")
    page.evaluate("localStorage.setItem('selected_model', 'gpt-5-nano')")
    
    # Wait for initialization
    page.wait_for_timeout(2000)
    
    # Verify pre-cached embeddings are loaded
    embeddings_info = page.evaluate("""() => {
        const stats = {
            hasVectorStore: !!window.ragVectorStore,
            hasVectorService: !!window.VectorRAGService,
            documentCount: 0,
            totalVectors: 0,
            documents: []
        };
        
        if (window.ragVectorStore) {
            const docIds = window.ragVectorStore.getDocumentIds();
            stats.documentCount = docIds.length;
            
            docIds.forEach(id => {
                const vectors = window.ragVectorStore.getVectors(id);
                if (vectors) {
                    stats.totalVectors += vectors.length;
                    stats.documents.push({
                        id: id,
                        vectorCount: vectors.length,
                        hasEmbeddings: vectors.length > 0 && vectors[0].embedding && vectors[0].embedding.length > 0,
                        embeddingDims: vectors[0].embedding ? vectors[0].embedding.length : 0
                    });
                }
            });
        }
        
        return stats;
    }""")
    
    print(f"Pre-cached embeddings info: {embeddings_info}")
    assert embeddings_info['totalVectors'] == 150, f"Expected 150 vectors, got {embeddings_info['totalVectors']}"
    assert embeddings_info['documentCount'] == 3, f"Expected 3 documents, got {embeddings_info['documentCount']}"
    
    # Open RAG modal
    rag_button = page.locator("#rag-btn")
    rag_button.click()
    
    # Wait for modal
    page.wait_for_selector("#rag-modal", state="visible", timeout=3000)
    
    # Enter search query
    search_input = page.locator("#rag-search-input")
    search_input.fill("artificial intelligence high-risk systems")
    
    # Click search button
    search_button = page.locator("#rag-search-btn")
    search_button.click()
    
    # Wait a bit for search to process
    page.wait_for_timeout(3000)
    
    # Check search results using VectorRAGService directly
    search_results = page.evaluate("""async () => {
        if (!window.VectorRAGService) {
            return { error: 'VectorRAGService not available' };
        }
        
        const apiKey = localStorage.getItem('openai_api_key');
        const baseUrl = localStorage.getItem('base_url') || 'https://api.openai.com/v1';
        
        try {
            // Perform actual search
            const results = await window.VectorRAGService.search(
                'artificial intelligence high-risk systems',
                {
                    maxResults: 10,
                    threshold: 0.3,
                    apiKey: apiKey,
                    baseUrl: baseUrl,
                    embeddingModel: 'text-embedding-3-small'
                }
            );
            
            return {
                success: true,
                totalResults: results.results ? results.results.length : 0,
                searchType: results.metadata ? results.metadata.searchType : 'unknown',
                topResults: results.results ? results.results.slice(0, 3).map(r => ({
                    source: r.documentName || r.source,
                    similarity: r.similarity,
                    contentPreview: r.content ? r.content.substring(0, 100) : ''
                })) : []
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }""")
    
    print(f"Search results: {search_results}")
    
    # Verify search worked
    assert search_results['success'], f"Search failed: {search_results.get('error', 'Unknown error')}"
    assert search_results['totalResults'] > 0, "No search results found"
    assert search_results['searchType'] == 'vector', f"Expected vector search, got {search_results['searchType']}"
    
    # Take screenshot
    screenshot_with_markdown(page, "rag_search_real_embeddings", {
        "Status": "RAG search with real embeddings",
        "Query": "artificial intelligence high-risk systems",
        "Results Found": str(search_results['totalResults']),
        "Search Type": search_results['searchType'],
        "Top Match Similarity": f"{search_results['topResults'][0]['similarity']:.3f}" if search_results['topResults'] else "N/A"
    })

def test_rag_context_injection_with_embeddings(page: Page, serve_hacka_re, api_key):
    """Test that RAG context is properly injected into chat messages."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Configure API key and enable RAG
    page.evaluate(f"localStorage.setItem('openai_api_key', '{api_key}')")
    page.evaluate("localStorage.setItem('base_url', 'https://api.openai.com/v1')")
    page.evaluate("localStorage.setItem('selected_model', 'gpt-5-nano')")
    page.evaluate("localStorage.setItem('rag_enabled', 'true')")
    page.evaluate("localStorage.setItem('rag_similarity_threshold', '0.3')")
    page.evaluate("localStorage.setItem('rag_max_results', '5')")
    
    # Wait for initialization
    page.wait_for_timeout(2000)
    
    # Test RAG context generation
    rag_context_test = page.evaluate("""async () => {
        if (!window.VectorRAGService) {
            return { error: 'VectorRAGService not available' };
        }
        
        const apiKey = localStorage.getItem('openai_api_key');
        const baseUrl = localStorage.getItem('base_url') || 'https://api.openai.com/v1';
        const query = 'What are the requirements for AI systems under EU regulations?';
        
        try {
            // Search for relevant content
            const searchResults = await window.VectorRAGService.search(query, {
                maxResults: 5,
                threshold: 0.3,
                apiKey: apiKey,
                baseUrl: baseUrl
            });
            
            // Format results for context
            const context = window.VectorRAGService.formatResultsForContext(
                searchResults.results,
                2000 // max context length
            );
            
            return {
                success: true,
                query: query,
                resultsFound: searchResults.results ? searchResults.results.length : 0,
                contextGenerated: context.length > 0,
                contextLength: context.length,
                contextPreview: context.substring(0, 200)
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }""")
    
    print(f"RAG context test: {rag_context_test}")
    
    # Verify context generation
    assert rag_context_test['success'], f"Context generation failed: {rag_context_test.get('error', 'Unknown error')}"
    assert rag_context_test['resultsFound'] > 0, "No results found for context"
    assert rag_context_test['contextGenerated'], "No context was generated"
    assert rag_context_test['contextLength'] > 0, "Context is empty"
    
    # Take screenshot
    screenshot_with_markdown(page, "rag_context_injection", {
        "Status": "RAG context injection test",
        "Query": rag_context_test['query'],
        "Results Found": str(rag_context_test['resultsFound']),
        "Context Generated": "Yes" if rag_context_test['contextGenerated'] else "No",
        "Context Length": f"{rag_context_test['contextLength']} characters"
    })

def test_rag_similarity_threshold(page: Page, serve_hacka_re, api_key):
    """Test that similarity threshold properly filters results."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Configure API key
    page.evaluate(f"localStorage.setItem('openai_api_key', '{api_key}')")
    page.evaluate("localStorage.setItem('base_url', 'https://api.openai.com/v1')")
    
    # Wait for initialization
    page.wait_for_timeout(2000)
    
    # Test different threshold values
    threshold_tests = []
    
    for threshold in [0.2, 0.3, 0.4, 0.5]:
        result = page.evaluate(f"""async () => {{
            const results = await window.VectorRAGService.search(
                'AI system requirements',
                {{
                    maxResults: 50,
                    threshold: {threshold},
                    apiKey: localStorage.getItem('openai_api_key'),
                    baseUrl: localStorage.getItem('base_url')
                }}
            );
            
            return {{
                threshold: {threshold},
                resultCount: results.results ? results.results.length : 0,
                minSimilarity: results.results && results.results.length > 0 
                    ? Math.min(...results.results.map(r => r.similarity))
                    : 0,
                maxSimilarity: results.results && results.results.length > 0
                    ? Math.max(...results.results.map(r => r.similarity))
                    : 0
            }};
        }}""")
        
        threshold_tests.append(result)
        print(f"Threshold {threshold}: {result['resultCount']} results, similarity range: {result['minSimilarity']:.3f} - {result['maxSimilarity']:.3f}")
    
    # Verify threshold filtering works
    for test in threshold_tests:
        if test['resultCount'] > 0:
            assert test['minSimilarity'] >= test['threshold'] - 0.01, \
                f"Results below threshold {test['threshold']}: min similarity {test['minSimilarity']}"
    
    # Results should decrease as threshold increases
    for i in range(1, len(threshold_tests)):
        assert threshold_tests[i]['resultCount'] <= threshold_tests[i-1]['resultCount'], \
            f"Higher threshold should have fewer results"
    
    # Take screenshot
    screenshot_with_markdown(page, "rag_threshold_test", {
        "Status": "Similarity threshold test completed",
        "Thresholds Tested": "0.2, 0.3, 0.4, 0.5",
        "Results at 0.2": str(threshold_tests[0]['resultCount']),
        "Results at 0.3": str(threshold_tests[1]['resultCount']),
        "Results at 0.4": str(threshold_tests[2]['resultCount']),
        "Results at 0.5": str(threshold_tests[3]['resultCount'])
    })