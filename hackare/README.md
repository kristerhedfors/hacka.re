# hackare

A Python library and command-line tool for creating self-contained hacka.re instances with vector-indexed content for offline RAG (Retrieval-Augmented Generation).

## Features

- **Self-contained links**: Create shareable hacka.re links with embedded content
- **Complete bundles**: Generate full hacka.re instances with pre-indexed static content
- **Vector indexing**: Index documents using sentence transformers for semantic search
- **Offline RAG**: Perform retrieval-augmented generation without external vector databases
- **Multiple formats**: Support for PDF, HTML, Markdown, and plain text files
- **Client-side search**: RAG functionality runs entirely in the browser using cosine similarity

## Installation

```bash
# From source (development)
cd hackare
pip install -e .

# With all dependencies
pip install -e ".[dev]"
```

## Quick Start

### Create a Bundle with Indexed Content

```bash
# Index documents and create a complete hacka.re bundle
hackare bundle /path/to/docs --output my_knowledge_base --title "My Knowledge Base"

# Index specific file types only
hackare bundle /path/to/docs --exclude-extensions .log .tmp --output clean_docs

# Use a different embedding model
hackare bundle /path/to/docs --index-model all-mpnet-base-v2 --output advanced_index
```

### Create Shareable Links

```bash
# Create a simple content link
echo "Important information here" | hackare link --title "Quick Note"

# Create compressed link for larger content
hackare link "Long content..." --compress --output link.txt
```

### Index Content Only

```bash
# Create a vector index without the full bundle
hackare index /path/to/docs --output my_index.json

# Search the index
hackare search "machine learning" my_index.json --top-k 10
```

## Usage Examples

### Bundle Creation

```python
from hackare import HackaReBuilder, VectorIndexer

# Create vector index
indexer = VectorIndexer(
    model_name="all-MiniLM-L6-v2",
    chunk_size=512,
    chunk_overlap=50
)
indexed_content = indexer.index_files(["/path/to/docs"])

# Create bundle
builder = HackaReBuilder(
    output_dir="./my_bundle",
    title="Technical Documentation"
)
bundle_path = builder.create_bundle(indexed_content)
```

### RAG Search

```python
from hackare.rag import CosineSimilarityRAG

# Load index and search
rag = CosineSimilarityRAG(model_name="all-MiniLM-L6-v2")
rag.load_index("my_index.json")

results = rag.search("how to configure authentication", top_k=5)
for result in results:
    print(f"Score: {result['score']:.3f}")
    print(f"File: {result['file']}")
    print(f"Content: {result['content'][:200]}...")
```

## Command Reference

### `hackare bundle`

Create a complete hacka.re instance with indexed content:

```bash
hackare bundle [FILES/DIRS] --output OUTPUT_DIR [OPTIONS]
```

Options:
- `--title, -t`: Title for the bundle
- `--index-model`: Sentence transformer model (default: all-MiniLM-L6-v2)
- `--chunk-size`: Text chunk size for indexing (default: 512)
- `--chunk-overlap`: Overlap between chunks (default: 50)
- `--exclude-extensions`: File extensions to skip
- `--verbose, -v`: Enable verbose output

### `hackare link`

Create shareable links with embedded content:

```bash
hackare link CONTENT [OPTIONS]
```

Options:
- `--title, -t`: Title for the content
- `--compress`: Compress content in the link
- `--output, -o`: Save link to file

### `hackare index`

Create vector index from files:

```bash
hackare index [FILES/DIRS] [OPTIONS]
```

Options:
- `--model`: Embedding model to use
- `--output, -o`: Output file path
- `--format`: Output format (json, pickle)

### `hackare search`

Search a vector index:

```bash
hackare search QUERY INDEX_FILE [OPTIONS]
```

Options:
- `--top-k`: Number of results to return
- `--threshold`: Similarity threshold
- `--verbose, -v`: Enable verbose output

## Architecture

### Bundle Structure

A hackare bundle contains:

```
my_bundle/
├── index.html              # Main HTML file with RAG integration
├── js/                     # JavaScript application files
├── css/                    # Stylesheets
├── lib/                    # External libraries
├── data/
│   └── vector_index.json   # Pre-computed vector index
└── hackare_config.json     # Bundle configuration
```

### Vector Index Format

```json
{
  "chunks": [
    {
      "content": "Text chunk content",
      "file": "/path/to/source/file",
      "chunk_index": 0,
      "embedding": [0.1, 0.2, ...],
      "chunk_hash": "md5hash"
    }
  ],
  "files": ["list", "of", "source", "files"],
  "metadata": {
    "model": "all-MiniLM-L6-v2",
    "chunk_size": 512,
    "total_chunks": 150,
    "created_at": "2024-01-01T12:00:00"
  }
}
```

### Client-side RAG

The generated bundles include a JavaScript RAG service that:

1. Loads the pre-computed vector index
2. Performs cosine similarity search in the browser
3. Returns ranked results without external dependencies
4. Integrates with the hacka.re chat interface

## Development

### Setup

```bash
git clone <repository>
cd hackare
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -e ".[dev]"
```

### Testing

```bash
pytest tests/
```

### Code Quality

```bash
black hackare/
flake8 hackare/
mypy hackare/
```

## Dependencies

### Core Dependencies
- `click` - Command-line interface
- `numpy` - Numerical operations
- `sentence-transformers` - Text embeddings
- `scipy` - Cosine similarity calculations

### Optional Dependencies  
- `beautifulsoup4` - HTML processing
- `PyPDF2` - PDF text extraction
- `markdown` - Markdown processing

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure code quality checks pass
6. Submit a pull request

## Roadmap

- [ ] Support for more document formats (DOCX, EPUB)
- [ ] Advanced chunking strategies (semantic, hierarchical)
- [ ] Integration with more embedding models
- [ ] Real-time index updates
- [ ] Distributed indexing for large datasets
- [ ] Web interface for bundle creation