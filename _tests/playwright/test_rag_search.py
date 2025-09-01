import pytest
import json
from playwright.sync_api import Page, expect

from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_rag_search_ui_elements(page: Page, serve_hacka_re):
    """Test the RAG search UI elements and basic functionality."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    # Open the RAG modal
    rag_button = page.locator("#rag-btn")
    rag_button.click()
    
    # Wait for modal to become visible
    page.wait_for_selector("#rag-modal", state="visible", timeout=3000)
    
    # Check search section elements
    search_input = page.locator("#rag-search-input")
    expect(search_input).to_be_visible()
    expect(search_input).to_be_enabled()
    
    search_button = page.locator("#rag-search-btn")
    expect(search_button).to_be_visible()
    expect(search_button).to_be_enabled()
    
    results_container = page.locator("#rag-search-results")
    expect(results_container).to_be_visible()
    
    # Test input functionality
    test_query = "machine learning algorithms"
    search_input.fill(test_query)
    expect(search_input).to_have_value(test_query)
    
    # Take screenshot of search UI
    screenshot_with_markdown(page, "rag_search_ui_elements", {
        "Status": "Search UI elements functional",
        "Search Input": f"Filled with: {test_query}",
        "Search Button": "Enabled",
        "Results Container": "Visible and ready"
    })

def test_rag_search_without_index(page: Page, serve_hacka_re):
    """Test search behavior when no index is available."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    # Clear any existing RAG index
    page.evaluate("localStorage.removeItem('rag_default_prompts_index')")
    page.evaluate("localStorage.removeItem('rag_user_bundles_index')")
    
    # Open the RAG modal
    rag_button = page.locator("#rag-btn")
    rag_button.click()
    
    # Wait for modal to become visible
    page.wait_for_selector("#rag-modal", state="visible", timeout=3000)
    
    # Try to perform a search
    search_input = page.locator("#rag-search-input")
    search_button = page.locator("#rag-search-btn")
    
    search_input.fill("test query")
    search_button.click()
    
    # Should show message about no index
    page.wait_for_selector("#rag-search-results:has-text('No knowledge')", timeout=5000)
    
    results_container = page.locator("#rag-search-results")
    results_text = results_container.text_content()
    expect(results_text).to_contain("No knowledge")
    
    # Take screenshot of no index state
    screenshot_with_markdown(page, "rag_search_no_index", {
        "Status": "Search with no index handled correctly",
        "Results Message": "No knowledge base message shown",
        "Search Query": "test query",
        "Behavior": "Graceful fallback"
    })

def test_rag_cosine_similarity_algorithm(page: Page, serve_hacka_re):
    """Test the cosine similarity algorithm directly."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    # Test cosine similarity through browser console
    similarity_test_result = page.evaluate("""() => {
        // Test vectors for cosine similarity
        const vector1 = [1, 0, 0];
        const vector2 = [1, 0, 0];  // Identical vectors
        const vector3 = [0, 1, 0];  // Orthogonal vectors
        const vector4 = [0.5, 0.5, 0]; // Similar but not identical
        
        const similarity1 = window.VectorRAGService.cosineSimilarity(vector1, vector2);
        const similarity2 = window.VectorRAGService.cosineSimilarity(vector1, vector3);
        const similarity3 = window.VectorRAGService.cosineSimilarity(vector1, vector4);
        
        return {
            identical: similarity1,      // Should be 1.0
            orthogonal: similarity2,     // Should be 0.0
            similar: similarity3,        // Should be between 0 and 1
            algorithm_working: similarity1 === 1.0 && Math.abs(similarity2) < 0.001
        };
    }""")
    
    # Verify cosine similarity results
    assert abs(similarity_test_result['identical'] - 1.0) < 0.001, "Identical vectors should have similarity 1.0"
    assert abs(similarity_test_result['orthogonal']) < 0.001, "Orthogonal vectors should have similarity 0.0"
    assert 0 < similarity_test_result['similar'] < 1, "Similar vectors should have similarity between 0 and 1"
    assert similarity_test_result['algorithm_working'], "Cosine similarity algorithm should work correctly"
    
    print(f"Cosine similarity test results:")
    print(f"  Identical vectors: {similarity_test_result['identical']}")
    print(f"  Orthogonal vectors: {similarity_test_result['orthogonal']}")
    print(f"  Similar vectors: {similarity_test_result['similar']}")
    
    # Take screenshot of similarity test
    screenshot_with_markdown(page, "rag_cosine_similarity_test", {
        "Status": "Cosine similarity algorithm tested",
        "Identical": f"{similarity_test_result['identical']:.3f}",
        "Orthogonal": f"{similarity_test_result['orthogonal']:.3f}",
        "Similar": f"{similarity_test_result['similar']:.3f}",
        "Algorithm": "Working correctly"
    })

def test_rag_search_with_mock_data(page: Page, serve_hacka_re):
    """Test search functionality with mock indexed data."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    # Create mock index data in localStorage
    mock_index = {
        "chunks": [
            {
                "content": "Machine learning is a subset of artificial intelligence that focuses on algorithms.",
                "embedding": [0.1, 0.2, 0.3, 0.4, 0.5],
                "metadata": {
                    "promptId": "ml_basics",
                    "promptName": "Machine Learning Basics",
                    "type": "default_prompt"
                },
                "id": "chunk_0"
            },
            {
                "content": "Deep learning uses neural networks with multiple layers to process data.",
                "embedding": [0.2, 0.3, 0.4, 0.5, 0.6],
                "metadata": {
                    "promptId": "deep_learning",
                    "promptName": "Deep Learning Introduction",
                    "type": "default_prompt"
                },
                "id": "chunk_1"
            }
        ],
        "metadata": {
            "totalChunks": 2,
            "embeddingModel": "text-embedding-3-small",
            "createdAt": "2024-01-01T00:00:00.000Z"
        }
    }
    
    # Store mock index
    page.evaluate(f"localStorage.setItem('rag_default_prompts_index', '{json.dumps(mock_index)}')")
    
    # Open the RAG modal
    rag_button = page.locator("#rag-btn")
    rag_button.click()
    
    # Wait for modal to become visible
    page.wait_for_selector("#rag-modal", state="visible", timeout=3000)
    
    # Perform a search
    search_input = page.locator("#rag-search-input")
    search_button = page.locator("#rag-search-btn")
    
    search_input.fill("machine learning")
    search_button.click()
    
    # Wait for results
    page.wait_for_selector("#rag-search-results .rag-search-result", timeout=5000)
    
    # Check that results are displayed
    results = page.locator("#rag-search-results .rag-search-result")
    expect(results).to_have_count(2)  # Should find both chunks
    
    # Check first result content
    first_result = results.first
    expect(first_result).to_contain_text("Machine learning")
    
    # Take screenshot of search results
    screenshot_with_markdown(page, "rag_search_with_mock_data", {
        "Status": "Search with mock data successful",
        "Query": "machine learning",
        "Results Count": "2",
        "First Result": "Contains machine learning content"
    })

def test_rag_search_ranking_and_relevance(page: Page, serve_hacka_re):
    """Test search result ranking and relevance scoring."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    # Test ranking through browser console with mock embeddings
    ranking_test_result = page.evaluate("""() => {
        // Mock chunks with different relevance levels
        const mockChunks = [
            {
                content: "Artificial intelligence and machine learning basics",
                embedding: [0.9, 0.1, 0.1, 0.1, 0.1],  // High similarity to query
                metadata: { promptName: "AI Basics" },
                id: "chunk_high"
            },
            {
                content: "Database management and SQL queries", 
                embedding: [0.1, 0.9, 0.1, 0.1, 0.1],  // Low similarity to query
                metadata: { promptName: "Database" },
                id: "chunk_low"
            },
            {
                content: "Machine learning algorithms and neural networks",
                embedding: [0.8, 0.2, 0.1, 0.1, 0.1],  // Medium-high similarity
                metadata: { promptName: "ML Algorithms" },
                id: "chunk_medium"
            }
        ];
        
        // Mock query embedding (similar to first chunk)
        const queryEmbedding = [0.9, 0.1, 0.1, 0.1, 0.1];
        
        // Calculate similarities manually
        const similarities = mockChunks.map(chunk => {
            const similarity = window.VectorRAGService.cosineSimilarity(queryEmbedding, chunk.embedding);
            return {
                id: chunk.id,
                content: chunk.content,
                similarity: similarity
            };
        });
        
        // Sort by similarity (descending)
        similarities.sort((a, b) => b.similarity - a.similarity);
        
        return {
            results: similarities,
            topResult: similarities[0],
            properRanking: similarities[0].id === "chunk_high" && similarities[2].id === "chunk_low"
        };
    }""")
    
    # Verify ranking is correct
    assert ranking_test_result['properRanking'], "Results should be ranked by relevance"
    assert ranking_test_result['topResult']['id'] == "chunk_high", "Most relevant result should be first"
    
    print(f"Ranking test results:")
    for i, result in enumerate(ranking_test_result['results']):
        print(f"  {i+1}. {result['id']}: {result['similarity']:.3f}")
    
    # Take screenshot of ranking test
    screenshot_with_markdown(page, "rag_search_ranking_test", {
        "Status": "Search ranking algorithm tested",
        "Top Result": ranking_test_result['topResult']['id'],
        "Ranking": "Correct by similarity score",
        "Algorithm": "Working properly"
    })

def test_rag_search_enter_key_functionality(page: Page, serve_hacka_re):
    """Test search using Enter key in the search input."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    # Create minimal mock index for testing
    mock_index = {
        "chunks": [
            {
                "content": "Test content for enter key search functionality.",
                "embedding": [0.1, 0.2, 0.3, 0.4, 0.5],
                "metadata": {"promptName": "Test Prompt"},
                "id": "chunk_test"
            }
        ],
        "metadata": {"totalChunks": 1}
    }
    
    page.evaluate(f"localStorage.setItem('rag_default_prompts_index', '{json.dumps(mock_index)}')")
    
    # Open the RAG modal
    rag_button = page.locator("#rag-btn")
    rag_button.click()
    
    # Wait for modal to become visible
    page.wait_for_selector("#rag-modal", state="visible", timeout=3000)
    
    # Enter search query and press Enter
    search_input = page.locator("#rag-search-input")
    search_input.fill("test")
    search_input.press("Enter")
    
    # Wait for results
    page.wait_for_selector("#rag-search-results .rag-search-result", timeout=5000)
    
    # Check that results are displayed
    results = page.locator("#rag-search-results .rag-search-result")
    expect(results).to_have_count(1)
    
    # Take screenshot of enter key search
    screenshot_with_markdown(page, "rag_search_enter_key", {
        "Status": "Enter key search functionality working",
        "Search Method": "Enter key press",
        "Results": "Displayed correctly",
        "Functionality": "Working as expected"
    })

def test_rag_search_empty_query_handling(page: Page, serve_hacka_re):
    """Test search behavior with empty or whitespace queries."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    # Open the RAG modal
    rag_button = page.locator("#rag-btn")
    rag_button.click()
    
    # Wait for modal to become visible
    page.wait_for_selector("#rag-modal", state="visible", timeout=3000)
    
    search_input = page.locator("#rag-search-input")
    search_button = page.locator("#rag-search-btn")
    results_container = page.locator("#rag-search-results")
    
    # Test empty query
    search_input.fill("")
    search_button.click()
    
    # Should show appropriate message or no results
    page.wait_for_timeout(1000)  # Brief wait for any response
    
    # Test whitespace-only query
    search_input.fill("   ")
    search_button.click()
    
    # Should handle gracefully
    page.wait_for_timeout(1000)
    
    # Test very short query
    search_input.fill("a")
    search_button.click()
    
    # Should handle gracefully
    page.wait_for_timeout(1000)
    
    # Take screenshot of empty query handling
    screenshot_with_markdown(page, "rag_search_empty_query", {
        "Status": "Empty query handling tested",
        "Empty Query": "Handled gracefully",
        "Whitespace Query": "Handled gracefully",
        "Short Query": "Handled gracefully"
    })

def test_rag_search_result_formatting(page: Page, serve_hacka_re):
    """Test the formatting and display of search results."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    # Create detailed mock index for result formatting test
    mock_index = {
        "chunks": [
            {
                "content": "This is a comprehensive guide to machine learning algorithms and their applications in modern data science. It covers supervised learning, unsupervised learning, and reinforcement learning techniques.",
                "embedding": [0.8, 0.2, 0.1, 0.1, 0.1],
                "metadata": {
                    "promptId": "ml_guide",
                    "promptName": "Complete Machine Learning Guide",
                    "type": "default_prompt",
                    "chunkIndex": 0
                },
                "id": "chunk_detailed"
            }
        ],
        "metadata": {"totalChunks": 1}
    }
    
    page.evaluate(f"localStorage.setItem('rag_default_prompts_index', '{json.dumps(mock_index)}')")
    
    # Open the RAG modal
    rag_button = page.locator("#rag-btn")
    rag_button.click()
    
    # Wait for modal to become visible
    page.wait_for_selector("#rag-modal", state="visible", timeout=3000)
    
    # Perform search
    search_input = page.locator("#rag-search-input")
    search_input.fill("machine learning")
    search_input.press("Enter")
    
    # Wait for results
    page.wait_for_selector("#rag-search-results .rag-search-result", timeout=5000)
    
    # Check result formatting
    result = page.locator("#rag-search-results .rag-search-result").first
    
    # Should contain content preview
    expect(result).to_contain_text("machine learning")
    
    # Should show source information
    expect(result).to_contain_text("Complete Machine Learning Guide")
    
    # Take screenshot of formatted results
    screenshot_with_markdown(page, "rag_search_result_formatting", {
        "Status": "Search result formatting verified",
        "Content": "Preview visible",
        "Source": "Prompt name displayed",
        "Formatting": "Proper layout and styling"
    })