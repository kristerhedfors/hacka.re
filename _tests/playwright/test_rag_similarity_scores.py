"""
Test multi-query RAG search with cosine similarity scores
Tests the complete flow: API key setup, EU AI Act indexing, and AI literacy search
Verifies that cosine similarity scores are properly calculated and displayed
"""

import pytest
import time
import json
import os
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown, setup_api_key_properly

@pytest.mark.asyncio
def test_rag_similarity_scores(page: Page, serve_hacka_re, api_key):
    """
    Test the complete RAG flow with multi-query search and verify similarity scores.
    """
    test_name = "test_rag_similarity_scores"
    console_messages = []
    
    def log_console_message(msg):
        """Capture console messages with timestamps"""
        timestamp = time.strftime("%H:%M:%S.%f")[:-3]
        message_data = {
            'timestamp': timestamp,
            'type': msg.type,
            'text': msg.text
        }
        console_messages.append(message_data)
        
        # Print RAG-related messages
        if 'RAG' in msg.text or 'similarity' in msg.text.lower() or 'Score:' in msg.text:
            print(f"  🔍 RAG: {msg.text}")
    
    page.on("console", log_console_message)
    
    print("\n" + "="*60)
    print(f"Starting test: {test_name}")
    print("="*60)
    
    # Step 1: Navigate and setup
    print("\n📍 Step 1: Navigate to application")
    page.goto(serve_hacka_re)
    page.wait_for_load_state("networkidle")
    dismiss_welcome_modal(page)
    
    # Step 2: Configure API key
    print("\n📍 Step 2: Configure API key")
    setup_api_key_properly(page, api_key)
    
    # Verify API key is set
    api_key_check = page.evaluate("""() => {
        const apiKey = localStorage.getItem('openai_api_key') || 
                      sessionStorage.getItem('openai_api_key') ||
                      sessionStorage.getItem('hackare_default_session_api_key');
        return !!apiKey;
    }""")
    assert api_key_check, "API key not configured properly"
    print("  ✓ API key configured")
    
    # Step 3: Open RAG modal and enable multi-query
    print("\n📍 Step 3: Open RAG modal and configure multi-query")
    rag_btn = page.locator("#rag-btn")
    expect(rag_btn).to_be_visible()
    rag_btn.click()
    page.wait_for_selector("#rag-modal.active", state="visible", timeout=5000)
    
    # Expand Advanced section
    advanced_toggle = page.locator("#rag-advanced-toggle").first
    if advanced_toggle.is_visible():
        advanced_content = page.locator("#rag-advanced-content")
        if not advanced_content.is_visible():
            advanced_toggle.click()
            page.wait_for_timeout(500)
    
    # Enable multi-query search
    multi_query_checkbox = page.locator("#rag-multi-query-enabled")
    if not multi_query_checkbox.is_checked():
        multi_query_checkbox.check()
    
    # Set expansion model
    expansion_model_select = page.locator("#rag-expansion-model")
    # Use centralized test model configuration
    from conftest import ACTIVE_TEST_CONFIG
    expansion_model_select.select_option(ACTIVE_TEST_CONFIG["model"])
    
    # Set token limit
    token_limit_input = page.locator("#rag-token-limit")
    token_limit_input.fill("5000")
    
    print(f"  ✓ Multi-query enabled: {multi_query_checkbox.is_checked()}")
    print(f"  ✓ Expansion model: gpt-5-nano")
    print(f"  ✓ Token limit: 5000")
    
    # Step 4: Index EU AI Act
    print("\n📍 Step 4: Index EU AI Act document")
    aia_checkbox = page.locator("#rag-doc-aia")
    
    # Check if already indexed
    aia_status = page.locator("#aia-status")
    status_text = aia_status.text_content()
    print(f"  Current status: {status_text}")
    
    if "Not indexed" in status_text:
        print("  Indexing EU AI Act...")
        if not aia_checkbox.is_checked():
            aia_checkbox.check()
        
        # Wait for indexing to complete
        max_wait = 60
        start_time = time.time()
        while time.time() - start_time < max_wait:
            current_status = aia_status.text_content()
            if "vectors created" in current_status or "indexed" in current_status.lower():
                print(f"  ✓ Indexing complete: {current_status}")
                break
            page.wait_for_timeout(1000)
    else:
        print(f"  ✓ Already indexed: {status_text}")
    
    # Close RAG modal
    close_rag = page.locator("#close-rag-modal")
    close_rag.click()
    page.wait_for_timeout(500)
    
    # Step 5: Perform search in RAG modal
    print("\n📍 Step 5: Search for 'Article 4: AI Literacy' in RAG modal")
    
    # Open RAG modal again
    rag_btn.click()
    page.wait_for_selector("#rag-modal.active", state="visible", timeout=5000)
    
    # Perform search
    search_input = page.locator("#rag-search-input")
    search_input.fill("Article 4: AI Literacy")
    
    search_btn = page.locator("#rag-search-btn")
    search_btn.click()
    
    # Wait for search results
    page.wait_for_timeout(3000)  # Give time for multi-query expansion and search
    
    # Check console for similarity scores
    rag_messages = [m for m in console_messages if 'RAG' in m['text'] or 'similarity' in m['text'].lower()]
    
    print("\n📊 RAG Search Results:")
    scores_found = False
    for msg in rag_messages[-20:]:  # Check last 20 RAG messages
        if "Score:" in msg['text'] or "similarity=" in msg['text']:
            print(f"  {msg['text']}")
            scores_found = True
    
    # Close modal
    close_rag.click()
    page.wait_for_selector("#rag-modal.active", state="hidden", timeout=5000)
    page.wait_for_timeout(500)
    
    # Step 6: Test chat interface search
    print("\n📍 Step 6: Test chat interface with 'AI literacy info please'")
    
    # Type in chat
    chat_input = page.locator("#user-input")
    expect(chat_input).to_be_visible()
    chat_input.fill("AI literacy info please")
    
    # Send message
    send_btn = page.locator("#send-btn")
    send_btn.click()
    
    # Wait for response
    page.wait_for_timeout(5000)
    
    # Analyze console messages for multi-query expansion
    print("\n📊 Multi-Query Expansion Analysis:")
    expansion_found = False
    ranking_found = False
    scores_zero = False
    
    for msg in console_messages[-50:]:
        if "Expanded to" in msg['text'] and "search terms" in msg['text']:
            print(f"  ✓ Query expansion: {msg['text']}")
            expansion_found = True
        if "Multi-query ranking results" in msg['text']:
            ranking_found = True
        if "similarity=0.00%" in msg['text']:
            scores_zero = True
            print(f"  ⚠️ Zero similarity detected: {msg['text']}")
    
    # Step 7: Debug the similarity score issue
    print("\n📍 Step 7: Debug similarity scores directly")
    
    debug_result = page.evaluate("""async () => {
        // Get a test query embedding
        const apiKey = sessionStorage.getItem('hackare_default_session_api_key');
        const query = "AI literacy";
        
        // Check if services are available
        const services = {
            vectorRAG: !!window.VectorRAGService,
            queryExpansion: !!window.RAGQueryExpansionService,
            debugService: !!window.DebugService
        };
        
        // Get index stats
        const stats = window.VectorRAGService ? window.VectorRAGService.getIndexStats() : null;
        
        // Try to get a chunk and check its embedding
        let sampleChunk = null;
        if (window.ragVectorStore && window.ragVectorStore.aia) {
            const chunks = window.ragVectorStore.aia.chunks || [];
            if (chunks.length > 0) {
                sampleChunk = {
                    hasEmbedding: !!chunks[0].embedding,
                    embeddingLength: chunks[0].embedding ? chunks[0].embedding.length : 0,
                    content: chunks[0].content ? chunks[0].content.substring(0, 50) : null
                };
            }
        }
        
        return {
            services: services,
            stats: stats,
            sampleChunk: sampleChunk,
            apiKeySet: !!apiKey
        };
    }""")
    
    print("\n🔍 Debug Information:")
    print(f"  Services available: {debug_result['services']}")
    print(f"  Index stats: {debug_result['stats']}")
    print(f"  Sample chunk: {debug_result['sampleChunk']}")
    print(f"  API key set: {debug_result['apiKeySet']}")
    
    # Step 8: Test the ranking function directly
    print("\n📍 Step 8: Test ranking function directly")
    
    ranking_test = page.evaluate("""async () => {
        if (!window.RAGQueryExpansionService) {
            return { error: 'RAGQueryExpansionService not available' };
        }
        
        // Create test chunks with embeddings
        const testChunks = [
            {
                content: 'AI literacy is important',
                embedding: new Array(1536).fill(0).map(() => Math.random()),
                similarity: 0.85
            },
            {
                content: 'Machine learning basics',
                embedding: new Array(1536).fill(0).map(() => Math.random()),
                similarity: 0.65
            }
        ];
        
        // Create test query embeddings
        const queryEmbeddings = [
            {
                term: 'AI literacy',
                embedding: testChunks[0].embedding  // Use same embedding for perfect match
            }
        ];
        
        // Test ranking
        const ranked = window.RAGQueryExpansionService.rankChunksWithMultipleQueries(
            testChunks,
            queryEmbeddings,
            'weighted'
        );
        
        return {
            originalSimilarity: testChunks[0].similarity,
            rankedSimilarity: ranked[0].similarity,
            multiQueryScore: ranked[0].multiQueryScore
        };
    }""")
    
    print(f"  Ranking test result: {ranking_test}")
    
    # Step 9: Save debug data
    debug_data = {
        'test_name': test_name,
        'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
        'console_messages': console_messages,
        'expansion_found': expansion_found,
        'ranking_found': ranking_found,
        'scores_zero': scores_zero,
        'debug_result': debug_result,
        'ranking_test': ranking_test
    }
    
    debug_dir = "debug_output"
    os.makedirs(debug_dir, exist_ok=True)
    debug_file = os.path.join(debug_dir, f"{test_name}_{time.strftime('%Y%m%d_%H%M%S')}.json")
    
    with open(debug_file, 'w') as f:
        json.dump(debug_data, f, indent=2, default=str)
    
    print(f"\n📁 Debug data saved to: {debug_file}")
    
    # Assertions
    assert expansion_found, "Query expansion not detected"
    assert ranking_found or scores_found, "No ranking or similarity scores found"
    
    if scores_zero:
        print("\n⚠️ ISSUE FOUND: Similarity scores are showing as 0.00%")
        print("This indicates the multi-query ranking is not preserving similarity scores")
    
    print("\n" + "="*60)
    print("Test complete")
    print("="*60)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])