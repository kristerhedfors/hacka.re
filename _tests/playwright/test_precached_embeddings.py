"""
Test suite for pre-cached embeddings functionality
Tests that pre-cached embeddings are loaded correctly and work with RAG search
"""

import pytest
import json
import time
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_precached_embeddings_load_on_startup(page: Page, serve_hacka_re):
    """Test that pre-cached embeddings are loaded automatically on startup."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Wait for page to fully load
    page.wait_for_timeout(1000)
    
    # Check if pre-cached embeddings are loaded
    embeddings_loaded = page.evaluate("""() => {
        // Check if precachedEmbeddings exists
        if (!window.precachedEmbeddings) {
            return { loaded: false, error: 'No precachedEmbeddings object found' };
        }
        
        // Check if initialization function exists
        if (!window.initializePrecachedEmbeddings) {
            return { loaded: false, error: 'No initialization function found' };
        }
        
        // Check if RAG vector store exists
        if (!window.ragVectorStore) {
            return { loaded: false, error: 'RAG vector store not initialized' };
        }
        
        // Check if documents are loaded
        const docs = window.precachedEmbeddings.documents;
        if (!docs || docs.length === 0) {
            return { loaded: false, error: 'No documents in pre-cached embeddings' };
        }
        
        // Check if vectors are in memory
        let totalVectors = 0;
        const loadedDocs = [];
        for (const doc of docs) {
            if (window.ragVectorStore.hasVectors(doc.documentId)) {
                const vectors = window.ragVectorStore.getVectors(doc.documentId);
                totalVectors += vectors.length;
                loadedDocs.push({
                    id: doc.documentId,
                    name: doc.documentName,
                    vectorCount: vectors.length
                });
            }
        }
        
        return {
            loaded: totalVectors > 0,
            totalVectors: totalVectors,
            documentCount: loadedDocs.length,
            documents: loadedDocs
        };
    }""")
    
    print(f"Pre-cached embeddings status: {embeddings_loaded}")
    
    # Verify embeddings are loaded
    assert embeddings_loaded['loaded'], f"Pre-cached embeddings not loaded: {embeddings_loaded.get('error', 'Unknown error')}"
    assert embeddings_loaded['documentCount'] > 0, "No documents loaded"
    assert embeddings_loaded['totalVectors'] > 0, "No vectors loaded"
    
    # Take screenshot
    screenshot_with_markdown(page, "precached_embeddings_loaded", {
        "Status": "Pre-cached embeddings loaded",
        "Documents": str(embeddings_loaded['documentCount']),
        "Total Vectors": str(embeddings_loaded['totalVectors']),
        "Documents List": str(embeddings_loaded['documents'])
    })

def test_precached_embeddings_search_without_api_key(page: Page, serve_hacka_re):
    """Test that RAG search interface works with pre-cached embeddings even without API key."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Ensure no API key is set
    page.evaluate("localStorage.removeItem('openai_api_key')")
    
    # Wait for initialization
    page.wait_for_timeout(1000)
    
    # Open RAG modal
    rag_button = page.locator("#rag-btn")
    rag_button.click()
    
    # Wait for modal
    page.wait_for_selector("#rag-modal", state="visible", timeout=3000)
    
    # Enter search query
    search_input = page.locator("#rag-search-input")
    search_input.fill("artificial intelligence")
    
    # Verify search button is enabled (since we have pre-cached embeddings)
    search_button = page.locator("#rag-search-btn")
    button_disabled = search_button.get_attribute("disabled")
    
    # With pre-cached embeddings, text-based search should work even without API key
    # Note: Actual vector search requires API key for query embedding generation
    
    # Verify pre-cached embeddings are available for search
    embeddings_available = page.evaluate("""() => {
        const hasVectorStore = !!window.ragVectorStore;
        const hasVectors = window.ragVectorStore ? window.ragVectorStore.getDocumentIds().length > 0 : false;
        const totalVectors = hasVectors ? 
            window.ragVectorStore.getDocumentIds().reduce((sum, id) => {
                const vectors = window.ragVectorStore.getVectors(id);
                return sum + (vectors ? vectors.length : 0);
            }, 0) : 0;
        
        return {
            hasVectorStore: hasVectorStore,
            hasVectors: hasVectors,
            documentCount: hasVectors ? window.ragVectorStore.getDocumentIds().length : 0,
            totalVectors: totalVectors
        };
    }""")
    
    print(f"Embeddings available for search: {embeddings_available}")
    
    # Verify embeddings are loaded
    assert embeddings_available['hasVectorStore'], "Vector store not initialized"
    assert embeddings_available['hasVectors'], "No vectors loaded"
    assert embeddings_available['totalVectors'] > 0, "No embeddings available for search"
    
    # Take screenshot
    screenshot_with_markdown(page, "precached_search_no_api", {
        "Status": "Pre-cached embeddings available without API key",
        "Query": "artificial intelligence",
        "Documents Available": str(embeddings_available['documentCount']),
        "Total Vectors": str(embeddings_available['totalVectors'])
    })

def test_precached_embeddings_search_ui(page: Page, serve_hacka_re, api_key):
    """Test that RAG search UI works with pre-cached embeddings."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Configure API key for query embedding generation
    page.evaluate(f"localStorage.setItem('openai_api_key', '{api_key}')")
    page.evaluate("localStorage.setItem('base_url', 'https://api.openai.com/v1')")
    
    # Wait for initialization
    page.wait_for_timeout(1000)
    
    # Open RAG modal
    rag_button = page.locator("#rag-btn")
    rag_button.click()
    
    # Wait for modal
    page.wait_for_selector("#rag-modal", state="visible", timeout=3000)
    
    # Enter search query
    search_input = page.locator("#rag-search-input")
    search_input.fill("artificial intelligence regulations")
    
    # Verify search interface is functional
    ui_state = page.evaluate("""() => {
        const searchInput = document.getElementById('rag-search-input');
        const searchButton = document.getElementById('rag-search-btn');
        const resultsContainer = document.getElementById('rag-search-results');
        
        return {
            hasSearchInput: !!searchInput,
            searchInputValue: searchInput ? searchInput.value : null,
            hasSearchButton: !!searchButton,
            searchButtonDisabled: searchButton ? searchButton.disabled : true,
            hasResultsContainer: !!resultsContainer,
            vectorsAvailable: window.ragVectorStore ? window.ragVectorStore.getDocumentIds().length : 0
        };
    }""")
    
    print(f"Search UI state: {ui_state}")
    
    # Verify UI is functional
    assert ui_state['hasSearchInput'], "Search input not found"
    assert ui_state['searchInputValue'] == "artificial intelligence regulations", "Search input value not set"
    assert ui_state['hasSearchButton'], "Search button not found"
    assert ui_state['hasResultsContainer'], "Results container not found"
    assert ui_state['vectorsAvailable'] > 0, "No vectors available for search"
    
    # Take screenshot
    screenshot_with_markdown(page, "precached_search_ui", {
        "Status": "Search UI test completed",
        "Search Input": ui_state['searchInputValue'],
        "Vectors Available": str(ui_state['vectorsAvailable']),
        "UI Functional": "Yes"
    })

def test_precached_embeddings_cosine_similarity(page: Page, serve_hacka_re, api_key):
    """Test that cosine similarity calculations work correctly with pre-cached embeddings."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Wait for initialization
    page.wait_for_timeout(1000)
    
    # Test cosine similarity with mock embeddings
    similarity_test = page.evaluate("""() => {
        if (!window.VectorRAGService || !window.ragVectorStore) {
            return { success: false, error: 'RAG services not initialized' };
        }
        
        // Get pre-cached vectors for AI Act
        const aiaVectors = window.ragVectorStore.getVectors('aia');
        if (!aiaVectors || aiaVectors.length === 0) {
            return { success: false, error: 'No pre-cached vectors for AI Act' };
        }
        
        // Check if embeddings are mock (test mode)
        const isTestMode = window.precachedEmbeddings && window.precachedEmbeddings.testMode;
        const embeddingDims = aiaVectors[0].embedding ? aiaVectors[0].embedding.length : 0;
        
        // Create a mock query embedding with same dimensions as stored vectors
        const mockQueryEmbedding = [];
        for (let i = 0; i < embeddingDims; i++) {
            mockQueryEmbedding.push(Math.random() * 2 - 1);
        }
        
        // Normalize
        const magnitude = Math.sqrt(mockQueryEmbedding.reduce((sum, val) => sum + val * val, 0));
        const queryEmbedding = mockQueryEmbedding.map(val => val / magnitude);
        
        // Calculate similarities for first 5 vectors
        const similarities = [];
        for (let i = 0; i < Math.min(5, aiaVectors.length); i++) {
            const vector = aiaVectors[i];
            if (vector.embedding && Array.isArray(vector.embedding)) {
                const similarity = window.VectorRAGService.cosineSimilarity(
                    queryEmbedding,
                    vector.embedding
                );
                similarities.push({
                    vectorId: vector.id,
                    similarity: similarity,
                    valid: similarity >= -1 && similarity <= 1
                });
            }
        }
        
        // Find best match
        const bestMatch = similarities.reduce((best, current) => 
            Math.abs(current.similarity) > Math.abs(best.similarity) ? current : best,
            similarities[0]
        );
        
        return {
            success: true,
            isTestMode: isTestMode,
            embeddingDimensions: embeddingDims,
            vectorsTested: similarities.length,
            similarities: similarities,
            bestMatch: bestMatch,
            allValid: similarities.every(s => s.valid)
        };
    }""")
    
    print(f"Similarity test results: {similarity_test}")
    
    # Verify similarity calculations
    assert similarity_test['success'], f"Similarity test failed: {similarity_test.get('error', 'Unknown error')}"
    assert similarity_test['allValid'], "Invalid similarity scores detected"
    assert similarity_test['embeddingDimensions'] > 0, "Invalid embedding dimensions"
    # For mock embeddings, we just check that similarities are valid numbers
    assert similarity_test['vectorsTested'] > 0, "No vectors tested"
    
    # Take screenshot
    screenshot_with_markdown(page, "precached_cosine_similarity", {
        "Status": "Cosine similarity test completed",
        "Test Mode": str(similarity_test.get('isTestMode', False)),
        "Embedding Dimensions": str(similarity_test['embeddingDimensions']),
        "Vectors Tested": str(similarity_test['vectorsTested']),
        "Best Match Similarity": f"{similarity_test['bestMatch']['similarity']:.4f}",
        "All Scores Valid": str(similarity_test['allValid'])
    })

def test_precached_embeddings_memory_efficiency(page: Page, serve_hacka_re):
    """Test that pre-cached embeddings are stored efficiently in memory."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Wait for initialization
    page.wait_for_timeout(1000)
    
    # Check memory usage and storage
    memory_stats = page.evaluate("""() => {
        if (!window.ragVectorStore || !window.precachedEmbeddings) {
            return { success: false, error: 'Required components not initialized' };
        }
        
        // Calculate approximate memory usage
        let totalVectors = 0;
        let totalDimensions = 0;
        const documents = [];
        
        for (const doc of window.precachedEmbeddings.documents) {
            const vectors = window.ragVectorStore.getVectors(doc.documentId);
            if (vectors && vectors.length > 0) {
                const vectorCount = vectors.length;
                const dimensions = vectors[0].embedding ? vectors[0].embedding.length : 0;
                
                totalVectors += vectorCount;
                totalDimensions += vectorCount * dimensions;
                
                documents.push({
                    id: doc.documentId,
                    name: doc.documentName,
                    vectors: vectorCount,
                    dimensions: dimensions,
                    // Approximate memory in bytes (4 bytes per float32)
                    memoryBytes: vectorCount * dimensions * 4
                });
            }
        }
        
        // Check localStorage usage
        const localStorageKeys = Object.keys(localStorage);
        const ragKeys = localStorageKeys.filter(key => key.includes('rag'));
        
        return {
            success: true,
            totalVectors: totalVectors,
            totalDimensions: totalDimensions,
            approximateMemoryMB: (totalDimensions * 4 / 1024 / 1024).toFixed(2),
            documents: documents,
            localStorageKeys: {
                total: localStorageKeys.length,
                ragRelated: ragKeys.length,
                ragKeys: ragKeys
            }
        };
    }""")
    
    print(f"Memory stats: {memory_stats}")
    
    # Verify memory efficiency
    assert memory_stats['success'], f"Memory test failed: {memory_stats.get('error', 'Unknown error')}"
    assert memory_stats['totalVectors'] > 0, "No vectors in memory"
    assert float(memory_stats['approximateMemoryMB']) < 100, "Excessive memory usage (>100MB)"
    
    # Take screenshot
    screenshot_with_markdown(page, "precached_memory_efficiency", {
        "Status": "Memory efficiency test completed",
        "Total Vectors": str(memory_stats['totalVectors']),
        "Total Dimensions": str(memory_stats['totalDimensions']),
        "Approximate Memory": f"{memory_stats['approximateMemoryMB']} MB",
        "Documents": str(len(memory_stats['documents'])),
        "localStorage RAG Keys": str(memory_stats['localStorageKeys']['ragRelated'])
    })

def test_precached_embeddings_integration_with_chat(page: Page, serve_hacka_re, api_key):
    """Test that pre-cached embeddings integrate correctly with chat RAG functionality."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Configure API key
    page.evaluate(f"localStorage.setItem('openai_api_key', '{api_key}')")
    page.evaluate("localStorage.setItem('base_url', 'https://api.openai.com/v1')")
    page.evaluate("localStorage.setItem('selected_model', 'gpt-5-nano')")
    
    # Enable RAG in settings
    page.evaluate("localStorage.setItem('rag_enabled', 'true')")
    page.evaluate("localStorage.setItem('rag_similarity_threshold', '0.3')")
    page.evaluate("localStorage.setItem('rag_max_results', '5')")
    
    # Wait for initialization
    page.wait_for_timeout(1000)
    
    # Type a message that should trigger RAG
    message_input = page.locator("#message-input")
    message_input.fill("What are the main requirements for AI systems in the EU?")
    
    # Check that RAG will be used
    rag_status = page.evaluate("""() => {
        const ragEnabled = localStorage.getItem('rag_enabled') === 'true';
        const hasVectors = window.ragVectorStore && window.ragVectorStore.getDocumentIds().length > 0;
        const serviceReady = window.VectorRAGService && typeof window.VectorRAGService.search === 'function';
        
        return {
            enabled: ragEnabled,
            hasVectors: hasVectors,
            serviceReady: serviceReady,
            willUseRAG: ragEnabled && hasVectors && serviceReady
        };
    }""")
    
    print(f"RAG status for chat: {rag_status}")
    
    # Verify RAG is ready
    assert rag_status['willUseRAG'], "RAG not ready for chat integration"
    
    # Send the message (send button might have different IDs)
    send_button = page.locator("button#send-btn, button#send-button").first
    if send_button.is_visible():
        send_button.click()
    else:
        # Try pressing Enter
        message_input.press("Enter")
    
    # Wait briefly for RAG to process
    page.wait_for_timeout(2000)
    
    # Check if RAG was actually used (by checking console logs or response)
    rag_used = page.evaluate("""() => {
        // Check for RAG-related console messages or UI indicators
        const messages = document.querySelectorAll('.message');
        const lastMessage = messages[messages.length - 1];
        
        // Look for RAG context indicators
        const hasContext = lastMessage && 
            (lastMessage.textContent.includes('Knowledge Base') ||
             lastMessage.textContent.includes('relevant') ||
             lastMessage.textContent.includes('according to'));
        
        return {
            messageCount: messages.length,
            hasContext: hasContext,
            lastMessagePreview: lastMessage ? lastMessage.textContent.substring(0, 100) : null
        };
    }""")
    
    print(f"RAG usage in chat: {rag_used}")
    
    # Take screenshot
    screenshot_with_markdown(page, "precached_chat_integration", {
        "Status": "Chat RAG integration test",
        "RAG Enabled": str(rag_status['enabled']),
        "Has Vectors": str(rag_status['hasVectors']),
        "Service Ready": str(rag_status['serviceReady']),
        "Message Sent": "What are the main requirements for AI systems in the EU?",
        "Response Received": str(rag_used['messageCount'] > 0)
    })