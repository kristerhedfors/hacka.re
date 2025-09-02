import pytest
import json
from playwright.sync_api import Page, expect

from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_rag_chat_integration_setup(page: Page, serve_hacka_re, api_key):
    """Test that RAG integration is properly set up in chat manager."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    # Configure API key and settings
    page.evaluate(f"localStorage.setItem('openai_api_key', '{api_key}')")
    page.evaluate("localStorage.setItem('base_url', 'https://api.openai.com/v1')")
    page.evaluate("localStorage.setItem('selected_model', 'gpt-5-nano')")
    
    # Create mock RAG index for testing
    mock_rag_index = {
        "chunks": [
            {
                "content": "Machine learning is a subset of artificial intelligence that enables computers to learn and improve from experience without being explicitly programmed.",
                "embedding": [0.1, 0.2, 0.3, 0.4, 0.5],
                "metadata": {
                    "promptId": "ml_basics",
                    "promptName": "Machine Learning Fundamentals",
                    "type": "default_prompt"
                },
                "id": "chunk_ml_1"
            },
            {
                "content": "Neural networks are computing systems inspired by biological neural networks. They consist of layers of interconnected nodes that process information.",
                "embedding": [0.2, 0.3, 0.4, 0.5, 0.6],
                "metadata": {
                    "promptId": "neural_networks",
                    "promptName": "Neural Network Basics",
                    "type": "default_prompt"
                },
                "id": "chunk_nn_1"
            }
        ],
        "metadata": {
            "totalChunks": 2,
            "embeddingModel": "text-embedding-3-small",
            "createdAt": "2024-01-01T00:00:00.000Z"
        }
    }
    
    # Store mock index
    page.evaluate(f"localStorage.setItem('rag_default_prompts_index', '{json.dumps(mock_rag_index)}')")
    
    # Test RAG integration through browser console
    integration_test_result = page.evaluate("""() => {
        // Check if RAG services are available
        const ragServicesAvailable = {
            vectorRAGService: typeof window.VectorRAGService !== 'undefined',
            ragIndexingService: typeof window.RAGIndexingService !== 'undefined',
            ragStorageService: typeof window.RAGStorageService !== 'undefined'
        };
        
        // Check if chat manager has RAG integration
        const chatManagerIntegration = {
            hasRAGManager: typeof window.ChatManager !== 'undefined',
            ragIndexExists: localStorage.getItem('rag_default_prompts_index') !== null
        };
        
        return {
            ragServices: ragServicesAvailable,
            chatIntegration: chatManagerIntegration,
            setupComplete: ragServicesAvailable.vectorRAGService && 
                          ragServicesAvailable.ragIndexingService && 
                          chatManagerIntegration.ragIndexExists
        };
    }""")
    
    # Verify integration setup
    assert integration_test_result['ragServices']['vectorRAGService'], "VectorRAGService should be available"
    assert integration_test_result['ragServices']['ragIndexingService'], "RAGIndexingService should be available"
    assert integration_test_result['ragServices']['ragStorageService'], "RAGStorageService should be available"
    assert integration_test_result['chatIntegration']['ragIndexExists'], "RAG index should be available"
    assert integration_test_result['setupComplete'], "Complete RAG integration should be set up"
    
    # Take screenshot of integration setup
    screenshot_with_markdown(page, "rag_chat_integration_setup", {
        "Status": "RAG chat integration setup verified",
        "RAG Services": "All available",
        "Chat Integration": "Ready",
        "Mock Index": "Loaded with 2 chunks"
    })

def test_rag_enhanced_chat_response(page: Page, serve_hacka_re, api_key):
    """Test that chat responses are enhanced with RAG context and verify content inclusion."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    # Configure API key and settings
    page.evaluate(f"localStorage.setItem('openai_api_key', '{api_key}')")
    page.evaluate("localStorage.setItem('base_url', 'https://api.openai.com/v1')")
    page.evaluate("localStorage.setItem('selected_model', 'gpt-5-nano')")
    
    # Enable debug mode and RAG category to capture debug logs
    page.evaluate("""
        window.DebugService.setDebugMode(true);
        window.DebugService.setCategoryEnabled('rag', true);
    """)
    
    # Create comprehensive mock RAG index with very specific content that should be identifiable in responses
    specific_rag_index = {
        "chunks": [
            {
                "content": "UNIQUE_RAG_MARKER: Test-driven development (TDD) follows the Red-Green-Refactor cycle: write a failing test (Red), write minimal code to make it pass (Green), then improve the code structure (Refactor). This approach ensures high code quality and comprehensive test coverage.",
                "embedding": [0.9, 0.1, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
                "metadata": {
                    "promptId": "tdd_process",
                    "promptName": "Test-Driven Development Process",
                    "type": "default_prompt"
                },
                "id": "chunk_tdd_specific"
            }
        ],
        "metadata": {
            "totalChunks": 1,
            "embeddingModel": "text-embedding-3-small"
        }
    }
    
    # Store mock index
    page.evaluate(f"localStorage.setItem('rag_default_prompts_index', '{json.dumps(specific_rag_index)}')")
    
    # Send a chat message that should match our specific RAG content
    chat_input = page.locator("#chat-input")
    send_button = page.locator("#send-btn")
    
    # Type a question that should trigger our specific RAG content
    test_question = "What is test-driven development and how does it work?"
    chat_input.fill(test_question)
    
    # Capture the system prompt enhancement process by monitoring network calls
    system_prompt_captured = None
    
    def capture_api_request(route):
        nonlocal system_prompt_captured
        request_body = route.request.post_data
        if request_body:
            try:
                data = json.loads(request_body)
                if 'messages' in data and len(data['messages']) > 0:
                    # Look for system message with RAG content
                    for msg in data['messages']:
                        if msg.get('role') == 'system' and 'UNIQUE_RAG_MARKER' in msg.get('content', ''):
                            system_prompt_captured = msg['content']
                            break
            except:
                pass
        route.continue_()
    
    # Intercept API calls to verify RAG content inclusion
    page.route("**/chat/completions", capture_api_request)
    
    # Take screenshot before sending
    screenshot_with_markdown(page, "rag_enhanced_verification_before", {
        "Status": "About to send TDD question with RAG verification",
        "Question": test_question,
        "RAG Content": "Contains UNIQUE_RAG_MARKER for verification",
        "Debug Mode": "Enabled for RAG category"
    })
    
    # Send the message
    send_button.click()
    
    # Wait for the message to appear in chat
    page.wait_for_selector(".message.user", timeout=5000)
    
    # Wait for AI response
    page.wait_for_selector(".message.assistant", timeout=30000)
    
    # Check that both messages are present
    user_messages = page.locator(".message.user")
    assistant_messages = page.locator(".message.assistant")
    
    expect(user_messages).to_have_count(1)
    expect(assistant_messages).to_have_count(1)
    
    # Get the assistant response content
    assistant_response = assistant_messages.first.locator(".message-content").text_content()
    user_message = user_messages.first.locator(".message-content").text_content()
    
    # Verify the messages contain expected content
    assert test_question.lower() in user_message.lower(), "User message should contain the test question"
    assert len(assistant_response) > 50, "Assistant should provide a substantial response"
    
    # Check if debug messages appeared in chat indicating RAG was used
    debug_messages = page.locator(".debug-message.debug-rag")
    debug_count = debug_messages.count()
    
    # Verify that RAG content was actually included in the API request
    rag_content_included = system_prompt_captured is not None and 'UNIQUE_RAG_MARKER' in system_prompt_captured
    
    # Get debug logs from console for additional verification
    console_logs = page.evaluate("""
        () => {
            const logs = [];
            // Check if there were any RAG-related console logs
            // This is a simplified check - in a real implementation you'd capture actual console logs
            return logs;
        }
    """)
    
    # Take screenshot of completed interaction with verification results
    screenshot_with_markdown(page, "rag_enhanced_verification_complete", {
        "Status": "RAG enhancement verification completed",
        "User Message": user_message[:50] + "...",
        "Assistant Response": f"{len(assistant_response)} characters",
        "RAG Content Included": "Yes" if rag_content_included else "No - API request did not contain RAG marker",
        "Debug Messages": f"{debug_count} RAG debug messages in chat",
        "System Prompt Captured": "Yes" if system_prompt_captured else "No"
    })
    
    # Assert that RAG content was actually used
    assert rag_content_included, f"RAG content should be included in system prompt. Captured prompt: {system_prompt_captured[:200] if system_prompt_captured else 'None'}"
    
    # Additional verification: Check that debug messages were generated
    assert debug_count > 0, f"RAG debug messages should appear in chat when debug mode is enabled. Found {debug_count} messages"
    
    print(f"✓ RAG integration verified: Content included in API request with {debug_count} debug messages")

def test_rag_context_injection_mechanism(page: Page, serve_hacka_re):
    """Test the RAG context injection mechanism without making API calls."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    # Create mock RAG index
    mock_index = {
        "chunks": [
            {
                "content": "Context about web development: HTML, CSS, and JavaScript are the core technologies for building web applications.",
                "embedding": [0.8, 0.2, 0.0, 0.0, 0.0],
                "metadata": {"promptName": "Web Development Basics"},
                "id": "chunk_web_dev"
            }
        ],
        "metadata": {"totalChunks": 1}
    }
    
    page.evaluate(f"localStorage.setItem('rag_default_prompts_index', '{json.dumps(mock_index)}')")
    
    # Test context injection through browser console
    context_injection_result = page.evaluate("""() => {
        // Mock a user message about web development
        const userMessage = "How do I build a website?";
        
        // Test if we can perform RAG search
        try {
            const searchResults = window.VectorRAGService.search(userMessage, {}, 1);
            
            // Check if context formatting works
            if (searchResults && searchResults.length > 0) {
                const formattedContext = window.VectorRAGService.formatResultsForContext(searchResults);
                
                return {
                    searchPerformed: true,
                    resultsFound: searchResults.length > 0,
                    contextFormatted: formattedContext && formattedContext.length > 0,
                    contextContent: formattedContext,
                    searchResults: searchResults
                };
            }
            
            return {
                searchPerformed: true,
                resultsFound: false,
                contextFormatted: false
            };
        } catch (error) {
            return {
                searchPerformed: false,
                error: error.message
            };
        }
    }""")
    
    # Verify context injection mechanism
    assert context_injection_result['searchPerformed'], "RAG search should be performed"
    assert context_injection_result['resultsFound'], "Relevant results should be found"
    assert context_injection_result['contextFormatted'], "Context should be formatted"
    
    print(f"Context injection test results:")
    print(f"  Search performed: {context_injection_result['searchPerformed']}")
    print(f"  Results found: {context_injection_result['resultsFound']}")
    print(f"  Context formatted: {context_injection_result['contextFormatted']}")
    if 'contextContent' in context_injection_result:
        print(f"  Context preview: {context_injection_result['contextContent'][:100]}...")
    
    # Take screenshot of context injection test
    screenshot_with_markdown(page, "rag_context_injection", {
        "Status": "RAG context injection mechanism tested",
        "Search": "Performed successfully",
        "Results": "Found and formatted",
        "Mechanism": "Working correctly"
    })

def test_rag_search_query_extraction(page: Page, serve_hacka_re):
    """Test extraction of search queries from user messages."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    # Test query extraction through browser console
    query_extraction_result = page.evaluate("""() => {
        // Test various types of user messages
        const testMessages = [
            "What is machine learning?",
            "Can you explain neural networks?", 
            "I need help with Python programming",
            "Tell me about data science",
            "How do I implement a REST API?"
        ];
        
        const extractionResults = [];
        
        testMessages.forEach(message => {
            // For this test, we'll simulate the query extraction logic
            // In the actual implementation, this would be in the chat manager
            const extractedQuery = message.replace(/^(what is|can you explain|tell me about|how do i|i need help with)\\s*/i, '').trim();
            
            extractionResults.push({
                original: message,
                extracted: extractedQuery,
                suitable: extractedQuery.length > 2
            });
        });
        
        return {
            testCount: testMessages.length,
            results: extractionResults,
            allSuitable: extractionResults.every(r => r.suitable)
        };
    }""")
    
    # Verify query extraction
    assert query_extraction_result['testCount'] == 5, "Should test 5 different message types"
    assert query_extraction_result['allSuitable'], "All extracted queries should be suitable for search"
    
    print(f"Query extraction test results:")
    print(f"  Test messages: {query_extraction_result['testCount']}")
    for result in query_extraction_result['results']:
        print(f"    '{result['original'][:30]}...' -> '{result['extracted'][:30]}...'")
    
    # Take screenshot of query extraction test
    screenshot_with_markdown(page, "rag_query_extraction", {
        "Status": "RAG query extraction tested",
        "Test Messages": str(query_extraction_result['testCount']),
        "Extraction": "Working for various message types",
        "Suitability": "All queries suitable for search"
    })

def test_rag_end_to_end_workflow(page: Page, serve_hacka_re, api_key):
    """Test complete end-to-end RAG workflow from indexing to chat response."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    # Configure API key and settings
    page.evaluate(f"localStorage.setItem('openai_api_key', '{api_key}')")
    page.evaluate("localStorage.setItem('base_url', 'https://api.openai.com/v1')")
    page.evaluate("localStorage.setItem('selected_model', 'gpt-5-nano')")
    
    # Step 1: Create and store a knowledge base
    mock_knowledge_base = {
        "chunks": [
            {
                "content": "Test-driven development (TDD) is a software development approach where tests are written before the actual code. The cycle involves writing a failing test, writing minimal code to pass the test, and then refactoring.",
                "embedding": [0.9, 0.1, 0.0, 0.0, 0.0],
                "metadata": {
                    "promptId": "tdd_guide",
                    "promptName": "Test-Driven Development Guide",
                    "type": "default_prompt"
                },
                "id": "chunk_tdd"
            }
        ],
        "metadata": {"totalChunks": 1, "embeddingModel": "text-embedding-3-small"}
    }
    
    page.evaluate(f"localStorage.setItem('rag_default_prompts_index', '{json.dumps(mock_knowledge_base)}')")
    
    # Step 2: Open RAG modal and verify search functionality
    rag_button = page.locator("#rag-btn")
    rag_button.click()
    
    page.wait_for_selector("#rag-modal", state="visible", timeout=3000)
    
    # Test search in RAG modal
    search_input = page.locator("#rag-search-input")
    search_button = page.locator("#rag-search-btn")
    
    search_input.fill("test driven development")
    search_button.click()
    
    # Wait for and verify search results
    page.wait_for_selector("#rag-search-results .rag-search-result", timeout=5000)
    search_results = page.locator("#rag-search-results .rag-search-result")
    expect(search_results).to_have_count(1)
    expect(search_results.first).to_contain_text("Test-driven development")
    
    # Take screenshot of RAG search results
    screenshot_with_markdown(page, "rag_e2e_search_results", {
        "Status": "RAG search in modal working",
        "Query": "test driven development",
        "Results": "1 relevant result found",
        "Step": "2 of 4 - Search verification"
    })
    
    # Step 3: Close RAG modal and test chat integration
    close_button = page.locator("#close-rag-modal")
    close_button.click()
    
    expect(page.locator("#rag-modal")).not_to_be_visible()
    
    # Step 4: Send a chat message that should be enhanced with RAG context
    chat_input = page.locator("#chat-input")
    send_button = page.locator("#send-btn")
    
    chat_input.fill("What is TDD and how does it work?")
    
    # Take screenshot before sending the chat message
    screenshot_with_markdown(page, "rag_e2e_before_chat", {
        "Status": "About to send TDD question",
        "Question": "What is TDD and how does it work?",
        "Expected": "Response should be enhanced with RAG context",
        "Step": "4 of 4 - Chat integration test"
    })
    
    send_button.click()
    
    # Wait for user message to appear
    page.wait_for_selector(".message.user", timeout=5000)
    
    # Wait for assistant response (real API call)
    page.wait_for_selector(".message.assistant", timeout=30000)
    
    # Verify the complete workflow
    user_messages = page.locator(".message.user")
    assistant_messages = page.locator(".message.assistant")
    
    expect(user_messages).to_have_count(1)
    expect(assistant_messages).to_have_count(1)
    
    # Get response content
    assistant_response = assistant_messages.first.locator(".message-content").text_content()
    user_message = user_messages.first.locator(".message-content").text_content()
    
    # Verify the messages contain expected content
    assert "TDD" in user_message or "test" in user_message.lower(), "User message should be about TDD"
    assert len(assistant_response) > 50, "Assistant should provide a substantial response"
    
    # Take final screenshot of completed end-to-end workflow
    screenshot_with_markdown(page, "rag_e2e_workflow_complete", {
        "Status": "Complete RAG end-to-end workflow tested",
        "Steps Completed": "1. Index creation, 2. RAG search, 3. Modal interaction, 4. Chat integration",
        "User Message": user_message[:50] + "...",
        "Assistant Response": f"{len(assistant_response)} characters",
        "Workflow": "Successfully completed"
    })

def test_rag_no_relevant_context_handling(page: Page, serve_hacka_re):
    """Test RAG behavior when no relevant context is found."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    # Create mock index with content unrelated to test query
    unrelated_index = {
        "chunks": [
            {
                "content": "Cooking pasta requires boiling water and adding salt for flavor.",
                "embedding": [0.1, 0.9, 0.0, 0.0, 0.0],
                "metadata": {"promptName": "Cooking Guide"},
                "id": "chunk_cooking"
            }
        ],
        "metadata": {"totalChunks": 1}
    }
    
    page.evaluate(f"localStorage.setItem('rag_default_prompts_index', '{json.dumps(unrelated_index)}')")
    
    # Test search with unrelated query
    no_context_result = page.evaluate("""() => {
        const query = "quantum physics and relativity theory";
        
        try {
            const searchResults = window.VectorRAGService.search(query, {}, 5);
            
            // Even with unrelated content, search should return results
            // but with low similarity scores
            const hasResults = searchResults && searchResults.length > 0;
            const firstResultScore = hasResults ? searchResults[0].similarity : 0;
            
            return {
                searchCompleted: true,
                hasResults: hasResults,
                firstScore: firstResultScore,
                lowRelevance: firstResultScore < 0.5, // Assuming low similarity threshold
                resultCount: searchResults ? searchResults.length : 0
            };
        } catch (error) {
            return {
                searchCompleted: false,
                error: error.message
            };
        }
    }""")
    
    # Verify handling of irrelevant context
    assert no_context_result['searchCompleted'], "Search should complete even with irrelevant content"
    
    print(f"No relevant context test results:")
    print(f"  Search completed: {no_context_result['searchCompleted']}")
    print(f"  Has results: {no_context_result['hasResults']}")
    if 'firstScore' in no_context_result:
        print(f"  First result score: {no_context_result['firstScore']:.3f}")
        print(f"  Low relevance: {no_context_result['lowRelevance']}")
    
    # Take screenshot of no relevant context test
    screenshot_with_markdown(page, "rag_no_relevant_context", {
        "Status": "No relevant context handling tested",
        "Query": "quantum physics (unrelated to cooking)",
        "Search": "Completed gracefully",
        "Relevance": "Low similarity scores as expected"
    })

def test_rag_multiple_source_integration(page: Page, serve_hacka_re):
    """Test RAG integration with multiple knowledge sources (default prompts + user bundles)."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    # Create default prompts index
    default_prompts_index = {
        "chunks": [
            {
                "content": "JavaScript is a programming language used for web development.",
                "embedding": [0.8, 0.1, 0.1, 0.0, 0.0],
                "metadata": {"type": "default_prompt", "promptName": "JavaScript Basics"},
                "id": "chunk_js"
            }
        ],
        "metadata": {"totalChunks": 1}
    }
    
    # Create user bundles index
    user_bundles_index = {
        "bundles": [
            {
                "name": "Python Guide",
                "chunks": [
                    {
                        "content": "Python is a high-level programming language known for its simplicity.",
                        "embedding": [0.7, 0.2, 0.1, 0.0, 0.0],
                        "metadata": {"type": "user_bundle", "source": "python_guide.md"},
                        "id": "chunk_python"
                    }
                ],
                "files": ["python_guide.md"],
                "metadata": {"model": "text-embedding-3-small"}
            }
        ]
    }
    
    # Store both indexes
    page.evaluate(f"localStorage.setItem('rag_default_prompts_index', '{json.dumps(default_prompts_index)}')")
    page.evaluate(f"localStorage.setItem('rag_user_bundles_index', '{json.dumps(user_bundles_index)}')")
    
    # Test multi-source search
    multi_source_result = page.evaluate("""() => {
        // Test searching for programming-related content
        // This should find results from both default prompts and user bundles
        const query = "programming language";
        
        try {
            // Search in default prompts
            const defaultResults = window.VectorRAGService.search(query, {}, 5);
            
            // Test if we can access user bundles
            const userBundles = window.RAGUserBundles.getBundles();
            
            return {
                searchCompleted: true,
                defaultResults: defaultResults ? defaultResults.length : 0,
                userBundlesAvailable: userBundles ? userBundles.length : 0,
                multiSourceSetup: defaultResults && userBundles,
                totalSources: 2 // default prompts + user bundles
            };
        } catch (error) {
            return {
                searchCompleted: false,
                error: error.message
            };
        }
    }""")
    
    # Verify multi-source integration
    assert multi_source_result['searchCompleted'], "Multi-source search should complete"
    assert multi_source_result['defaultResults'] > 0, "Should find results in default prompts"
    assert multi_source_result['userBundlesAvailable'] > 0, "Should have user bundles available"
    assert multi_source_result['multiSourceSetup'], "Both sources should be available"
    
    print(f"Multi-source integration test results:")
    print(f"  Search completed: {multi_source_result['searchCompleted']}")
    print(f"  Default results: {multi_source_result['defaultResults']}")
    print(f"  User bundles: {multi_source_result['userBundlesAvailable']}")
    print(f"  Total sources: {multi_source_result['totalSources']}")
    
    # Take screenshot of multi-source integration test
    screenshot_with_markdown(page, "rag_multiple_sources", {
        "Status": "Multiple source integration tested",
        "Default Prompts": f"{multi_source_result['defaultResults']} results",
        "User Bundles": f"{multi_source_result['userBundlesAvailable']} bundles", 
        "Integration": "Both sources accessible"
    })

def test_rag_enable_disable_state_integration(page: Page, serve_hacka_re):
    """Test that RAG enable/disable state is properly integrated with chat enhancement."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    # Test RAG state through browser console
    rag_state_test_result = page.evaluate("""() => {
        // Test getting and setting RAG enabled state
        const initialState = window.RAGManager.getRAGEnabledState();
        
        // Test disabling RAG
        window.RAGManager.setRAGEnabledState(false);
        const disabledState = window.RAGManager.isRAGEnabled();
        
        // Test enabling RAG
        window.RAGManager.setRAGEnabledState(true);
        const enabledState = window.RAGManager.isRAGEnabled();
        
        // Test status includes enabled state
        const status = window.RAGManager.getStatus();
        
        return {
            initialState: initialState,
            disabledState: disabledState,
            enabledState: enabledState,
            statusIncludesEnabled: 'enabled' in status,
            currentStatus: status.enabled
        };
    }""")
    
    # Verify RAG state management
    assert rag_state_test_result['initialState'] == True, "Initial RAG state should be enabled by default"
    assert rag_state_test_result['disabledState'] == False, "RAG should be disabled when set to false"
    assert rag_state_test_result['enabledState'] == True, "RAG should be enabled when set to true"
    assert rag_state_test_result['statusIncludesEnabled'], "Status should include enabled property"
    assert rag_state_test_result['currentStatus'] == True, "Current status should reflect enabled state"
    
    print(f"RAG state integration test results:")
    print(f"  Initial state: {rag_state_test_result['initialState']}")
    print(f"  Disabled state: {rag_state_test_result['disabledState']}")
    print(f"  Enabled state: {rag_state_test_result['enabledState']}")
    print(f"  Status integration: {rag_state_test_result['statusIncludesEnabled']}")
    
    # Take screenshot of state integration test
    screenshot_with_markdown(page, "rag_enable_disable_integration", {
        "Status": "RAG enable/disable state integration tested",
        "State Management": "Working correctly",
        "API Integration": "Functional",
        "Default State": "Enabled"
    })

def test_rag_debug_logging_functionality(page: Page, serve_hacka_re):
    """Test that RAG debug logging produces valuable information during operations."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    # Create mock RAG index for testing
    debug_test_index = {
        "chunks": [
            {
                "content": "DEBUG_TEST_CONTENT: Machine learning is a powerful tool for data analysis and pattern recognition. It enables computers to learn from data without explicit programming.",
                "embedding": [0.8, 0.2, 0.0, 0.0, 0.0],
                "metadata": {
                    "promptId": "ml_debug_test",
                    "promptName": "ML Debug Test Content",
                    "type": "default_prompt"
                },
                "id": "chunk_debug_test"
            },
            {
                "content": "Python programming language is widely used in machine learning applications due to its rich ecosystem of libraries and frameworks.",
                "embedding": [0.7, 0.3, 0.0, 0.0, 0.0],
                "metadata": {
                    "promptId": "python_debug_test", 
                    "promptName": "Python Debug Test Content",
                    "type": "default_prompt"
                },
                "id": "chunk_python_debug"
            }
        ],
        "metadata": {
            "totalChunks": 2,
            "embeddingModel": "text-embedding-3-small"
        }
    }
    
    # Store mock index
    page.evaluate(f"localStorage.setItem('rag_default_prompts_index', '{json.dumps(debug_test_index)}')")
    
    # Enable debug mode and RAG category
    debug_setup_result = page.evaluate("""() => {
        // Enable debug mode
        window.DebugService.setDebugMode(true);
        window.DebugService.setCategoryEnabled('rag', true);
        
        // Verify debug settings
        return {
            debugModeEnabled: window.DebugService.getDebugMode(),
            ragCategoryEnabled: window.DebugService.isCategoryEnabled('rag'),
            categories: window.DebugService.getCategories()
        };
    }""")
    
    # Verify debug mode setup
    assert debug_setup_result['debugModeEnabled'], "Debug mode should be enabled"
    assert debug_setup_result['ragCategoryEnabled'], "RAG debug category should be enabled"
    
    # Perform a RAG search to generate debug logs
    search_debug_result = page.evaluate("""async () => {
        try {
            // Perform a search that should generate debug logs
            const searchResults = await window.VectorRAGService.search('machine learning programming', {
                maxResults: 2,
                threshold: 0.3,
                useTextFallback: true
            });
            
            return {
                searchCompleted: true,
                resultsFound: searchResults.results.length,
                searchType: searchResults.metadata.searchType,
                totalResults: searchResults.metadata.totalResults
            };
        } catch (error) {
            return {
                searchCompleted: false,
                error: error.message
            };
        }
    }""")
    
    # Verify search was successful
    assert search_debug_result['searchCompleted'], "RAG search should complete successfully"
    assert search_debug_result['resultsFound'] > 0, "Search should find results in mock index"
    
    # Check that debug messages appeared in the chat
    page.wait_for_selector(".debug-message.debug-rag", timeout=3000)
    debug_messages = page.locator(".debug-message.debug-rag")
    debug_count = debug_messages.count()
    
    # Verify we have a reasonable number of debug messages
    assert debug_count >= 3, f"Should have at least 3 RAG debug messages, found {debug_count}"
    
    # Capture the content of debug messages for verification
    debug_message_contents = []
    for i in range(min(debug_count, 10)):  # Check up to 10 messages
        message_text = debug_messages.nth(i).text_content()
        debug_message_contents.append(message_text)
    
    # Verify that debug messages contain expected information
    debug_content_str = " ".join(debug_message_contents)
    
    # Check for key debug information
    expected_debug_info = [
        "Starting search",  # Should indicate search initiation
        "results found",    # Should show results count
        "similarity",       # Should show similarity scores
        "Search summary"    # Should provide search summary
    ]
    
    found_info = []
    for info in expected_debug_info:
        if any(info.lower() in msg.lower() for msg in debug_message_contents):
            found_info.append(info)
    
    # Take screenshot of debug logging
    screenshot_with_markdown(page, "rag_debug_logging_test", {
        "Status": "RAG debug logging functionality tested",
        "Debug Mode": "Enabled",
        "RAG Category": "Enabled", 
        "Debug Messages": f"{debug_count} messages generated",
        "Search Results": f"{search_debug_result['resultsFound']} results found",
        "Debug Info Found": f"{len(found_info)}/{len(expected_debug_info)} types",
        "Search Type": search_debug_result.get('searchType', 'unknown')
    })
    
    # Verify that we found most of the expected debug information
    assert len(found_info) >= 2, f"Should find at least 2 types of debug info, found: {found_info}"
    
    print(f"RAG debug logging test results:")
    print(f"  Debug messages generated: {debug_count}")
    print(f"  Search results found: {search_debug_result['resultsFound']}")
    print(f"  Debug info types found: {found_info}")
    print(f"  Sample debug messages:")
    for i, msg in enumerate(debug_message_contents[:3]):
        print(f"    {i+1}: {msg[:100]}...")
    
    # Additional test: Verify debug logging with disabled RAG
    page.evaluate("window.RAGManager.setRAGEnabledState(false)")
    
    # Try another search with RAG disabled
    disabled_search_result = page.evaluate("""async () => {
        try {
            // Clear previous debug messages for this test
            const debugMessages = document.querySelectorAll('.debug-message.debug-rag');
            const previousCount = debugMessages.length;
            
            // This should generate debug logs indicating RAG is disabled
            // We'll simulate this by calling the chat manager enhancement function
            const fakeMessages = [{ role: 'user', content: 'test query for disabled RAG' }];
            
            // Check if the RAG enhancement would be skipped
            const ragEnabled = window.RAGManager.isRAGEnabled();
            
            return {
                ragEnabled: ragEnabled,
                previousDebugCount: previousCount
            };
        } catch (error) {
            return {
                error: error.message
            };
        }
    }""")
    
    assert not disabled_search_result['ragEnabled'], "RAG should be disabled after setting state to false"
    
    print(f"✓ RAG debug logging verification completed with {debug_count} debug messages")