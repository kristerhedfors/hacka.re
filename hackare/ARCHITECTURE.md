# hackare Architecture

## Overview

The `hackare` package provides tools for creating self-contained hacka.re instances with pre-indexed vector content for offline RAG (Retrieval-Augmented Generation).

## Core Components

### 1. CLI Interface (`cli.py`)

Command-line interface with four main commands:

- **`bundle`**: Create complete hacka.re bundles with indexed content
- **`link`**: Generate shareable links with embedded content  
- **`index`**: Create vector indexes from documents
- **`search`**: Search existing vector indexes

### 2. Core Builder (`core.py`)

Main orchestration class that:

- Copies base hacka.re files to output directory
- Integrates vector indexes into the web application
- Modifies HTML to include RAG functionality
- Creates configuration files

### 3. Vector RAG System (`rag.py`)

Two main classes:

#### VectorIndexer
- Processes files (PDF, HTML, Markdown, text)
- Chunks text with configurable size and overlap
- Generates embeddings using sentence-transformers
- Saves indexes in JSON or pickle format

#### CosineSimilarityRAG
- Loads pre-computed vector indexes
- Performs similarity search using cosine distance
- Provides fallback text-based search
- Returns ranked results with metadata

### 4. Templates (`templates.py`)

Template management for:
- HTML templates with RAG integration
- JavaScript RAG service
- Configuration files

## RAG Architecture

### Server-side (Python)

```
Input Documents → Text Extraction → Chunking → Embedding → Vector Index
     ↓
     PDF/HTML/MD/TXT files
     ↓
     Structured text content
     ↓  
     512-token chunks with 50-token overlap
     ↓
     sentence-transformers embeddings
     ↓
     JSON index with vectors and metadata
```

### Client-side (JavaScript)

```
Vector Index → Browser Load → Query Processing → Similarity Search → Results
     ↓
     Pre-computed JSON index
     ↓
     Loaded into memory
     ↓
     User query text
     ↓
     Cosine similarity calculation
     ↓
     Ranked relevant chunks
```

## Bundle Structure

Generated hacka.re bundles have this structure:

```
my_bundle/
├── index.html                    # Modified HTML with RAG integration
├── js/
│   ├── app.js                    # Core application
│   ├── services/
│   │   ├── vector-rag-service.js # Client-side RAG implementation
│   │   └── ...                   # Other services
│   └── ...
├── css/                          # Stylesheets
├── lib/                          # External libraries  
├── data/
│   └── vector_index.json         # Pre-computed vector index
└── hackare_config.json           # Bundle configuration
```

## Vector Index Format

```json
{
  "chunks": [
    {
      "content": "Text content of the chunk",
      "file": "source/file/path",
      "chunk_index": 0,
      "embedding": [0.1, 0.2, 0.3, ...],
      "chunk_hash": "md5_hash",
      "file_size": 1024,
      "file_extension": ".md"
    }
  ],
  "files": ["list", "of", "processed", "files"],
  "metadata": {
    "model": "all-MiniLM-L6-v2",
    "chunk_size": 512,
    "chunk_overlap": 50,
    "total_chunks": 150,
    "total_files": 25,
    "created_at": "2024-01-01T12:00:00",
    "embedding_dim": 384
  }
}
```

## Workflow Examples

### 1. Creating a Knowledge Base Bundle

```bash
# Index documentation and create bundle
hackare bundle /docs/project --output knowledge_base --title "Project Docs"
```

**Process:**
1. Recursively scan `/docs/project` for supported files
2. Extract text content from each file
3. Split into 512-token chunks with 50-token overlap
4. Generate embeddings using `all-MiniLM-L6-v2`
5. Copy hacka.re base files to output directory
6. Create vector index JSON file
7. Modify HTML to include RAG service
8. Generate bundle configuration

### 2. Sharing Content via Links

```bash
# Create shareable link with content
echo "Important meeting notes..." | hackare link --title "Meeting Notes"
```

**Process:**
1. Encode content as JSON with metadata
2. Optionally compress using gzip
3. Base64 encode the payload
4. Generate hacka.re URL with data parameter

### 3. Offline Search

```bash
# Search pre-built index
hackare search "authentication setup" docs_index.json --top-k 5
```

**Process:**
1. Load vector index from JSON file
2. Generate query embedding (or use text fallback)
3. Calculate cosine similarity with all chunks
4. Return top-k results above threshold

## Client-side RAG Implementation

The JavaScript RAG service provides:

### Enhanced Similarity Calculation
- Word overlap scoring
- Exact phrase matching bonuses
- Partial phrase matching
- Normalized similarity scores

### Real-time Search
- Loads index once on page load
- Performs searches entirely client-side
- No external API calls required
- Results available instantly

### Integration Points
- Hooks into hacka.re chat interface
- Augments AI responses with relevant context
- Displays source information with results
- Updates UI with index statistics

## Extensibility

### Adding New File Types
1. Extend `_read_file()` method in VectorIndexer
2. Add format-specific text extraction
3. Update exclude_extensions configuration

### Custom Embedding Models
1. Modify model_name parameter
2. Ensure sentence-transformers compatibility
3. Update client-side similarity if needed

### Advanced Chunking
1. Implement semantic chunking strategies
2. Add hierarchical document structure
3. Preserve document metadata

## Performance Considerations

### Indexing Performance
- Batch processing for large document sets
- Parallel embedding generation
- Memory-efficient file processing
- Progress tracking with tqdm

### Client Performance
- Lazy loading of vector index
- Efficient similarity calculations
- Result caching for repeated queries
- Responsive UI updates

### Bundle Size Optimization
- Configurable embedding dimensions
- Optional index compression
- Selective file inclusion
- Efficient JSON serialization

## Security Considerations

### Data Privacy
- All processing happens locally
- No external API calls during indexing
- Vector data stays in generated bundle
- No telemetry or tracking

### Bundle Integrity
- File hashes for chunk verification
- Embedding hashes for deduplication
- Metadata validation
- Secure file copying

## Future Enhancements

### Planned Features
- [ ] Hierarchical document indexing
- [ ] Real-time index updates
- [ ] Advanced chunking strategies
- [ ] Multi-language support
- [ ] Integration with more embedding models
- [ ] Distributed indexing for large datasets

### API Extensions
- [ ] REST API for remote indexing
- [ ] WebSocket integration for real-time search
- [ ] Plugin system for custom processors
- [ ] Advanced filtering and faceting