# RAG (Retrieval-Augmented Generation) Test Suite

This document describes the comprehensive Playwright test suite for hacka.re's RAG functionality.

## Overview

The RAG test suite validates all aspects of the knowledge base and retrieval-augmented generation features, from UI interactions to chat integration. Tests are organized into focused categories for efficient execution and debugging.

## Test Files

### 1. `test_rag_modal.py` - Modal UI and Basic Interactions
- **Purpose**: Tests RAG button visibility, modal opening/closing, and UI structure
- **Key Tests**:
  - RAG button visibility and positioning in toolbar
  - Modal open/close functionality
  - Section structure (enable section, default prompts, user bundles, search)
  - RAG enable/disable checkbox functionality
  - Default prompts indexing status indicators
  - Keyboard interactions (Enter to search, close button)
- **Dependencies**: None (UI only)
- **Execution Time**: Fast (~30 seconds)

### 2. `test_rag_indexing.py` - Embedding Generation and Text Processing
- **Purpose**: Tests embedding generation, text chunking, and indexing processes
- **Key Tests**:
  - Real OpenAI API embedding generation with progress tracking
  - Text chunking algorithm with overlap strategy
  - Embedding caching mechanisms
  - Error handling for missing API keys
  - Progress callback functionality
- **Dependencies**: OpenAI API key required for some tests
- **Execution Time**: Moderate (~2-3 minutes with API calls)

### 3. `test_rag_search.py` - Vector Search and Similarity Ranking
- **Purpose**: Tests search functionality, cosine similarity, and result ranking
- **Key Tests**:
  - Cosine similarity algorithm verification
  - Search with mock indexed data
  - Result ranking by relevance scores
  - Empty query handling
  - Search result formatting
- **Dependencies**: None (uses mock data)
- **Execution Time**: Fast (~45 seconds)

### 4. `test_rag_bundles.py` - User Knowledge Bundle Management
- **Purpose**: Tests user-defined bundle loading, validation, and management
- **Key Tests**:
  - Bundle validation algorithm with various inputs
  - Storage operations (add, remove, retrieve)
  - Bundle display elements and UI interactions
  - File input creation and handling
  - Removal confirmation workflows
  - Statistics calculation accuracy
- **Dependencies**: None (localStorage operations)
- **Execution Time**: Fast (~1 minute)

### 5. `test_rag_integration.py` - Chat Integration and End-to-End Workflows
- **Purpose**: Tests complete RAG integration with chat system
- **Key Tests**:
  - RAG service availability and setup
  - Chat response enhancement with RAG context
  - Context injection mechanisms
  - Query extraction from user messages
  - RAG enable/disable state integration
  - Complete end-to-end workflow (index → search → chat)
  - Multiple knowledge source integration
  - No relevant context handling
- **Dependencies**: OpenAI API key for real chat tests
- **Execution Time**: Longer (~3-5 minutes with API calls)

## Test Execution Scripts

### Primary RAG Test Script: `run_rag_tests.sh`

```bash
# Run all RAG tests
./run_rag_tests.sh

# Run specific categories
./run_rag_tests.sh --category modal      # UI tests only
./run_rag_tests.sh --category indexing   # Embedding generation
./run_rag_tests.sh --category search     # Search functionality
./run_rag_tests.sh --category bundles    # User bundle management
./run_rag_tests.sh --category integration # Chat integration

# Quick tests (no API calls)
./run_rag_tests.sh --category quick

# API-dependent tests only
./run_rag_tests.sh --category api

# With options
./run_rag_tests.sh --headless --verbose
```

### Integration with Existing Scripts

RAG tests are also included in:
- `./run_feature_tests.sh` - Runs RAG tests alongside other advanced features
- `./run_tests.sh` - Runs all tests including RAG in comprehensive suite

## Test Categories by Requirements

### No API Key Required (Quick Tests)
- Modal UI tests (`test_rag_modal.py`)
- Most search tests (`test_rag_search.py`) 
- Bundle management tests (`test_rag_bundles.py`)
- Some integration tests with mock data

### API Key Required (API Tests)
- Real embedding generation (`test_rag_indexing.py`)
- End-to-end chat integration (`test_rag_integration.py`)
- Progress tracking with actual API calls

## Test Data and Mocking

### Mock Data Strategy
Tests use carefully crafted mock data to verify algorithms without API dependencies:
- **Mock embeddings**: Known vector values for predictable similarity calculations
- **Mock knowledge bases**: Themed content (ML, cooking, programming) for relevance testing
- **Mock bundles**: Valid JSON structures following hackare tool output format

### Real API Integration
When API keys are available, tests make real calls to:
- OpenAI embeddings API (`text-embedding-3-small` model)
- OpenAI chat API (`gpt-4o-mini` model for cost efficiency)
- Verify actual functionality end-to-end

## Debugging and Screenshots

All tests use the `screenshot_with_markdown()` utility to capture:
- **Visual state**: Screenshots at key test points
- **Context metadata**: Test parameters, expected results, error states
- **Debug information**: Console logs, storage contents, API responses

Screenshot files are saved to:
- `screenshots/` - PNG images
- `screenshots_data/` - Markdown metadata files

## Performance and Timing

### Expected Test Times
- **Modal tests**: 30 seconds
- **Search tests**: 45 seconds  
- **Bundle tests**: 1 minute
- **Indexing tests**: 2-3 minutes (with API)
- **Integration tests**: 3-5 minutes (with API)
- **Total suite**: 7-10 minutes

### Optimization Notes
- Mock data used where possible to avoid API delays
- Chunking tests use small text samples for speed
- Batch embedding tests limited to small sets
- Real API tests use cost-effective models

## Common Issues and Solutions

### API Key Configuration
```bash
# Ensure .env file exists with API key
cp .env.example .env
# Edit .env with your OpenAI API key
```

### Test Failures
- **Embedding generation fails**: Check API key and network connectivity
- **Modal not opening**: Verify RAG button implementation and CSS
- **Search returns no results**: Check mock data loading and index format
- **Bundle loading fails**: Verify JSON structure and validation logic

### Performance Issues
- Use `--category quick` for development iteration
- Run API tests separately with `--category api`
- Use headless mode (`--headless`) for faster execution

## Contributing

When adding new RAG functionality:

1. **Add corresponding tests** in the appropriate test file
2. **Update mock data** if new data structures are introduced
3. **Include screenshot debugging** for visual verification
4. **Test both with and without API keys** where applicable
5. **Update this README** with new test descriptions

### Test Naming Convention
- `test_rag_[component]_[functionality]` - e.g., `test_rag_search_ranking_algorithm`
- Include docstrings describing test purpose and expected behavior
- Use descriptive screenshot names: `rag_[component]_[state]`

## Integration with CI/CD

The RAG test suite is designed for CI/CD integration:
- **Exit codes**: Proper failure reporting
- **Output capture**: All results saved to `.out` files
- **Markdown reports**: Generated for analysis and sharing
- **Categorized execution**: Run subsets based on environment capabilities
- **Mock fallbacks**: Tests degrade gracefully without API access