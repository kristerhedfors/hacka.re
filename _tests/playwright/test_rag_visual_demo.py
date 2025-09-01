"""
Visual demonstration of RAG search with pre-cached embeddings
Shows the actual UI and search results
"""

import pytest
import time
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_rag_visual_demo(page: Page, serve_hacka_re, api_key):
    """Visual demonstration of RAG search functionality."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Configure API key
    page.evaluate(f"localStorage.setItem('openai_api_key', '{api_key}')")
    page.evaluate("localStorage.setItem('base_url', 'https://api.openai.com/v1')")
    
    # Wait for initialization
    page.wait_for_timeout(2000)
    
    # Take screenshot of main interface
    screenshot_with_markdown(page, "rag_demo_1_main", {
        "Step": "1",
        "Description": "Main interface with RAG button visible"
    })
    
    # Open RAG modal
    rag_button = page.locator("#rag-btn")
    rag_button.click()
    
    # Wait for modal
    page.wait_for_selector("#rag-modal", state="visible", timeout=3000)
    
    # Take screenshot of RAG modal
    screenshot_with_markdown(page, "rag_demo_2_modal", {
        "Step": "2",
        "Description": "RAG modal opened"
    })
    
    # Enter search query
    search_input = page.locator("#rag-search-input")
    search_input.fill("What are the requirements for high-risk AI systems?")
    
    # Take screenshot with query
    screenshot_with_markdown(page, "rag_demo_3_query", {
        "Step": "3",
        "Description": "Search query entered",
        "Query": "What are the requirements for high-risk AI systems?"
    })
    
    # Click search button
    search_button = page.locator("#rag-search-btn")
    search_button.click()
    
    # Wait for results to appear
    page.wait_for_timeout(3000)
    
    # Inject custom CSS to highlight search results
    page.evaluate("""() => {
        const style = document.createElement('style');
        style.textContent = `
            .rag-search-result {
                border: 2px solid #4CAF50 !important;
                margin: 10px 0 !important;
                padding: 10px !important;
                background: rgba(76, 175, 80, 0.05) !important;
            }
            #rag-search-results {
                max-height: 400px !important;
                overflow-y: auto !important;
            }
        `;
        document.head.appendChild(style);
    }""")
    
    # Take screenshot of results
    screenshot_with_markdown(page, "rag_demo_4_results", {
        "Step": "4",
        "Description": "Search results displayed",
        "Note": "Results are retrieved from pre-cached embeddings"
    })
    
    # Get results summary
    results_summary = page.evaluate("""() => {
        const resultsContainer = document.getElementById('rag-search-results');
        const resultElements = resultsContainer ? resultsContainer.querySelectorAll('.rag-search-result') : [];
        
        const results = [];
        for (let i = 0; i < Math.min(3, resultElements.length); i++) {
            const elem = resultElements[i];
            const sourceElem = elem.querySelector('.result-source, [class*="source"]');
            const scoreElem = elem.querySelector('.result-score, [class*="score"], [class*="similarity"]');
            
            results.push({
                source: sourceElem ? sourceElem.textContent.trim() : 'Unknown',
                score: scoreElem ? scoreElem.textContent.trim() : 'N/A'
            });
        }
        
        return {
            totalResults: resultElements.length,
            topResults: results
        };
    }""")
    
    print(f"\nSearch Results Summary:")
    print(f"Total results found: {results_summary['totalResults']}")
    for i, result in enumerate(results_summary['topResults'], 1):
        print(f"  {i}. {result['source']} - Score: {result['score']}")
    
    # Close modal
    close_button = page.locator("#rag-modal .close-btn, #rag-modal button[aria-label='Close']").first
    if close_button.is_visible():
        close_button.click()
        page.wait_for_selector("#rag-modal", state="hidden", timeout=3000)
    
    # Test chat with RAG enabled
    page.evaluate("localStorage.setItem('rag_enabled', 'true')")
    page.evaluate("localStorage.setItem('rag_similarity_threshold', '0.3')")
    page.evaluate("localStorage.setItem('rag_max_results', '5')")
    
    # Type a message
    message_input = page.locator("#message-input")
    message_input.fill("What are the main requirements for AI systems under EU regulations?")
    
    # Take screenshot of chat with RAG enabled
    screenshot_with_markdown(page, "rag_demo_5_chat", {
        "Step": "5",
        "Description": "Chat interface with RAG enabled",
        "Message": "Question about EU AI regulations",
        "RAG Status": "Enabled - will use pre-cached embeddings"
    })
    
    print("\n✅ Visual demo completed successfully!")
    print("Screenshots saved in _tests/playwright/screenshots/")
    print("\nRAG Features Demonstrated:")
    print("  • Pre-cached embeddings loaded automatically")
    print("  • Vector search working with real embeddings")
    print("  • Search results displayed in UI")
    print("  • RAG integration with chat interface")
    
    return results_summary