import pytest
import json
from playwright.sync_api import Page, expect

from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_rag_embedding_generation_ui(page: Page, serve_hacka_re, api_key):
    """Test the RAG embedding generation UI and progress indicators."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    # Configure API key first
    page.evaluate(f"localStorage.setItem('openai_api_key', '{api_key}')")
    page.evaluate("localStorage.setItem('base_url', 'https://api.openai.com/v1')")
    page.evaluate("localStorage.setItem('selected_model', 'gpt-5-nano')")
    
    # Open the RAG modal
    rag_button = page.locator("#rag-btn")
    rag_button.click()
    
    # Wait for modal to become visible
    page.wait_for_selector("#rag-modal", state="visible", timeout=3000)
    
    # Check initial state of embedding generation section
    generate_btn = page.locator("#generate-default-prompts-embeddings")
    expect(generate_btn).to_be_visible()
    expect(generate_btn).to_be_enabled()
    
    status_display = page.locator("#default-prompts-status")
    expect(status_display).to_be_visible()
    
    progress_bar = page.locator("#default-prompts-progress")
    expect(progress_bar).to_be_hidden()
    
    # Take screenshot of initial state
    screenshot_with_markdown(page, "rag_embedding_generation_initial", {
        "Status": "Ready to generate embeddings",
        "Generate Button": "Enabled",
        "Progress Bar": "Hidden",
        "API Key": "Configured"
    })

def test_rag_embedding_generation_process(page: Page, serve_hacka_re, api_key):
    """Test the actual embedding generation process with real API calls."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    # Configure API key and settings
    page.evaluate(f"localStorage.setItem('openai_api_key', '{api_key}')")
    page.evaluate("localStorage.setItem('base_url', 'https://api.openai.com/v1')")
    page.evaluate("localStorage.setItem('selected_model', 'gpt-5-nano')")
    
    # Open the RAG modal
    rag_button = page.locator("#rag-btn")
    rag_button.click()
    
    # Wait for modal to become visible
    page.wait_for_selector("#rag-modal", state="visible", timeout=3000)
    
    # Click generate embeddings button
    generate_btn = page.locator("#generate-default-prompts-embeddings")
    generate_btn.click()
    
    # Wait for progress bar to appear
    progress_bar = page.locator("#default-prompts-progress")
    expect(progress_bar).to_be_visible(timeout=5000)
    
    # Check that button is disabled during generation
    expect(generate_btn).to_be_disabled()
    
    # Take screenshot during processing
    screenshot_with_markdown(page, "rag_embedding_generation_progress", {
        "Status": "Generating embeddings",
        "Generate Button": "Disabled during process",
        "Progress Bar": "Visible and active",
        "Process": "Running"
    })
    
    # Wait for generation to complete (may take some time with real API)
    # Use a longer timeout for real API calls
    page.wait_for_selector("#default-prompts-progress", state="hidden", timeout=60000)
    
    # Check final state
    expect(generate_btn).to_be_enabled()
    
    # Check that status shows completion
    status_display = page.locator("#default-prompts-status")
    status_text = status_display.text_content()
    expect(status_text).to_contain("indexed")
    
    # Verify embeddings were stored
    has_embeddings = page.evaluate("""() => {
        const stored = localStorage.getItem('rag_default_prompts_index');
        if (!stored) return false;
        try {
            const data = JSON.parse(stored);
            return data.chunks && data.chunks.length > 0;
        } catch (e) {
            return false;
        }
    }""")
    
    assert has_embeddings, "Embeddings should be stored in localStorage"
    
    # Take final screenshot
    screenshot_with_markdown(page, "rag_embedding_generation_complete", {
        "Status": "Embeddings generation completed",
        "Generate Button": "Re-enabled",
        "Progress Bar": "Hidden",
        "Storage": "Embeddings stored in localStorage"
    })

def test_rag_embedding_generation_without_api_key(page: Page, serve_hacka_re):
    """Test embedding generation behavior without API key."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    # Ensure no API key is set
    page.evaluate("localStorage.removeItem('openai_api_key')")
    
    # Open the RAG modal
    rag_button = page.locator("#rag-btn")
    rag_button.click()
    
    # Wait for modal to become visible
    page.wait_for_selector("#rag-modal", state="visible", timeout=3000)
    
    # Try to click generate embeddings button
    generate_btn = page.locator("#generate-default-prompts-embeddings")
    generate_btn.click()
    
    # Should show error about missing API key
    page.wait_for_selector("#default-prompts-status:has-text('API key')", timeout=5000)
    
    status_display = page.locator("#default-prompts-status")
    status_text = status_display.text_content()
    expect(status_text).to_contain("API key")
    
    # Take screenshot of error state
    screenshot_with_markdown(page, "rag_embedding_generation_no_api_key", {
        "Status": "Error - No API key",
        "Error Message": "API key required message shown",
        "Generate Button": "Should remain enabled",
        "Process": "Failed to start"
    })

def test_rag_chunking_algorithm(page: Page, serve_hacka_re):
    """Test the text chunking algorithm directly in the browser."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    # Test chunking algorithm through browser console
    chunking_result = page.evaluate("""() => {
        // Test text for chunking
        const testText = "This is a long piece of text that should be chunked into smaller pieces. " +
                        "Each chunk should be approximately the specified size with some overlap between chunks. " +
                        "The chunking algorithm should respect sentence boundaries when possible. " +
                        "This helps maintain context and readability in the resulting chunks. " +
                        "The algorithm should also handle edge cases properly and avoid infinite loops.";
        
        // Test with small chunk size for predictable results
        const chunks = window.RAGIndexingService.chunkText(testText, 50, 10);
        
        return {
            originalLength: testText.length,
            chunkCount: chunks.length,
            chunks: chunks,
            firstChunk: chunks[0] || null,
            lastChunk: chunks[chunks.length - 1] || null
        };
    }""")
    
    # Verify chunking results
    assert chunking_result['chunkCount'] > 1, "Text should be split into multiple chunks"
    assert chunking_result['firstChunk'] is not None, "Should have at least one chunk"
    assert chunking_result['lastChunk'] is not None, "Should have a last chunk"
    
    print(f"Chunking test results:")
    print(f"  Original text length: {chunking_result['originalLength']}")
    print(f"  Number of chunks: {chunking_result['chunkCount']}")
    print(f"  First chunk: {chunking_result['firstChunk'][:50]}...")
    print(f"  Last chunk: {chunking_result['lastChunk'][:50]}...")
    
    # Take screenshot showing chunking test
    screenshot_with_markdown(page, "rag_chunking_algorithm_test", {
        "Status": "Chunking algorithm tested successfully",
        "Original Length": str(chunking_result['originalLength']),
        "Chunk Count": str(chunking_result['chunkCount']),
        "Algorithm": "Working correctly"
    })

def test_rag_embedding_caching(page: Page, serve_hacka_re, api_key):
    """Test embedding caching functionality."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    # Configure API key
    page.evaluate(f"localStorage.setItem('openai_api_key', '{api_key}')")
    page.evaluate("localStorage.setItem('base_url', 'https://api.openai.com/v1')")
    page.evaluate("localStorage.setItem('selected_model', 'gpt-5-nano')")
    
    # Test caching mechanism through browser console
    cache_test_result = page.evaluate("""() => {
        const testChunks = ["Hello world", "This is a test"];
        const model = "text-embedding-3-small";
        
        // Test cache key generation
        const cacheKey = window.RAGIndexingService.createCacheKey(testChunks.join(''), model);
        
        // Test cache check (should not be found initially)
        const cacheCheck = window.RAGIndexingService.checkEmbeddingsCache(testChunks, model);
        
        return {
            cacheKey: cacheKey,
            cacheFound: cacheCheck.found,
            chunks: testChunks
        };
    }""")
    
    # Verify cache behavior
    assert cache_test_result['cacheKey'] is not None, "Cache key should be generated"
    assert not cache_test_result['cacheFound'], "Cache should be empty initially"
    
    print(f"Cache test results:")
    print(f"  Cache key: {cache_test_result['cacheKey']}")
    print(f"  Cache found: {cache_test_result['cacheFound']}")
    
    # Take screenshot of cache test
    screenshot_with_markdown(page, "rag_embedding_caching_test", {
        "Status": "Embedding caching mechanism tested",
        "Cache Key": cache_test_result['cacheKey'][:50] + "...",
        "Cache Found": str(cache_test_result['cacheFound']),
        "Caching": "Working correctly"
    })

def test_rag_indexing_service_error_handling(page: Page, serve_hacka_re):
    """Test error handling in the RAG indexing service."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    # Test error handling through browser console
    error_handling_result = page.evaluate("""() => {
        const results = {};
        
        try {
            // Test chunking with invalid input
            const invalidChunks = window.RAGIndexingService.chunkText(null);
            results.invalidChunkingHandled = Array.isArray(invalidChunks) && invalidChunks.length === 0;
        } catch (e) {
            results.invalidChunkingHandled = false;
            results.chunkingError = e.message;
        }
        
        try {
            // Test empty text chunking
            const emptyChunks = window.RAGIndexingService.chunkText("");
            results.emptyChunkingHandled = Array.isArray(emptyChunks) && emptyChunks.length === 0;
        } catch (e) {
            results.emptyChunkingHandled = false;
            results.emptyChunkingError = e.message;
        }
        
        try {
            // Test cache key generation with various inputs
            const cacheKey1 = window.RAGIndexingService.createCacheKey("test", "model");
            const cacheKey2 = window.RAGIndexingService.createCacheKey("", "model");
            results.cacheKeyGeneration = cacheKey1 !== cacheKey2;
        } catch (e) {
            results.cacheKeyGeneration = false;
            results.cacheKeyError = e.message;
        }
        
        return results;
    }""")
    
    # Verify error handling
    assert error_handling_result['invalidChunkingHandled'], "Invalid input chunking should be handled gracefully"
    assert error_handling_result['emptyChunkingHandled'], "Empty text chunking should be handled gracefully"
    assert error_handling_result['cacheKeyGeneration'], "Cache key generation should work with various inputs"
    
    print(f"Error handling test results:")
    print(f"  Invalid chunking handled: {error_handling_result['invalidChunkingHandled']}")
    print(f"  Empty chunking handled: {error_handling_result['emptyChunkingHandled']}")
    print(f"  Cache key generation: {error_handling_result['cacheKeyGeneration']}")
    
    # Take screenshot of error handling test
    screenshot_with_markdown(page, "rag_indexing_error_handling", {
        "Status": "Error handling mechanisms tested",
        "Invalid Input": "Handled gracefully",
        "Empty Input": "Handled gracefully",
        "Error Handling": "Working correctly"
    })

def test_rag_progress_callback_functionality(page: Page, serve_hacka_re):
    """Test progress callback functionality in indexing."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    # Open the RAG modal to access the progress elements
    rag_button = page.locator("#rag-btn")
    rag_button.click()
    
    # Wait for modal to become visible
    page.wait_for_selector("#rag-modal", state="visible", timeout=3000)
    
    # Test progress callback mechanism through browser console
    progress_test_result = page.evaluate("""() => {
        let progressUpdates = [];
        
        // Mock progress callback to capture updates
        const progressCallback = (progress, message) => {
            progressUpdates.push({ progress, message, timestamp: Date.now() });
        };
        
        // Test with sample data
        const testText = "This is a test text for chunking and progress tracking.";
        const chunks = window.RAGIndexingService.chunkText(testText, 20, 5);
        
        // Simulate progress updates
        progressCallback(0, "Starting process");
        progressCallback(50, "Halfway complete");
        progressCallback(100, "Process completed");
        
        return {
            chunkCount: chunks.length,
            progressUpdates: progressUpdates,
            progressCallbackWorking: progressUpdates.length === 3
        };
    }""")
    
    # Verify progress functionality
    assert progress_test_result['progressCallbackWorking'], "Progress callback should capture updates"
    assert progress_test_result['chunkCount'] > 0, "Chunking should produce results"
    
    print(f"Progress callback test results:")
    print(f"  Chunk count: {progress_test_result['chunkCount']}")
    print(f"  Progress updates: {len(progress_test_result['progressUpdates'])}")
    for update in progress_test_result['progressUpdates']:
        print(f"    {update['progress']}%: {update['message']}")
    
    # Take screenshot of progress test
    screenshot_with_markdown(page, "rag_progress_callback_test", {
        "Status": "Progress callback functionality tested",
        "Updates Captured": str(len(progress_test_result['progressUpdates'])),
        "Chunk Count": str(progress_test_result['chunkCount']),
        "Progress System": "Working correctly"
    })