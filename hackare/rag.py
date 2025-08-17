"""
Vector indexing and RAG functionality for hackare
"""

import json
import pickle
import numpy as np
from pathlib import Path
from typing import List, Dict, Any, Optional, Union
from datetime import datetime
import hashlib

try:
    from sentence_transformers import SentenceTransformer
    HAS_SENTENCE_TRANSFORMERS = True
except ImportError:
    HAS_SENTENCE_TRANSFORMERS = False

try:
    from scipy.spatial.distance import cosine
    HAS_SCIPY = True
except ImportError:
    HAS_SCIPY = False


class VectorIndexer:
    """Create vector embeddings for text content"""
    
    def __init__(self, model_name: str = "all-MiniLM-L6-v2", 
                 chunk_size: int = 512, chunk_overlap: int = 50,
                 exclude_extensions: Optional[List[str]] = None,
                 verbose: bool = False):
        self.model_name = model_name
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.exclude_extensions = exclude_extensions or ['.pyc', '.pyo', '.pyd', '.so', '.dll']
        self.verbose = verbose
        
        if not HAS_SENTENCE_TRANSFORMERS:
            raise ImportError(
                "sentence-transformers is required for vector indexing. "
                "Install with: pip install sentence-transformers"
            )
        
        self.model = SentenceTransformer(model_name)
        if verbose:
            print(f"Loaded model: {model_name}")
    
    def index_files(self, file_paths: List[Union[str, Path]]) -> Dict[str, Any]:
        """Index multiple files and directories
        
        Args:
            file_paths: List of file or directory paths to index
            
        Returns:
            Dictionary containing indexed chunks, embeddings, and metadata
        """
        all_chunks = []
        all_files = []
        
        for path in file_paths:
            path = Path(path)
            if path.is_file():
                chunks = self._process_file(path)
                all_chunks.extend(chunks)
                all_files.append(str(path))
            elif path.is_dir():
                for file_path in self._get_files_recursively(path):
                    chunks = self._process_file(file_path)
                    all_chunks.extend(chunks)
                    all_files.append(str(file_path))
        
        if self.verbose:
            print(f"Processing {len(all_chunks)} chunks from {len(all_files)} files")
        
        # Generate embeddings
        embeddings = self._generate_embeddings([chunk['content'] for chunk in all_chunks])
        
        # Add embeddings to chunks
        for i, chunk in enumerate(all_chunks):
            chunk['embedding'] = embeddings[i].tolist()
            chunk['embedding_hash'] = self._hash_embedding(embeddings[i])
        
        return {
            "chunks": all_chunks,
            "files": list(set(all_files)),
            "metadata": {
                "model": self.model_name,
                "chunk_size": self.chunk_size,
                "chunk_overlap": self.chunk_overlap,
                "total_chunks": len(all_chunks),
                "total_files": len(set(all_files)),
                "created_at": datetime.now().isoformat(),
                "embedding_dim": len(embeddings[0]) if embeddings else 0
            }
        }
    
    def _get_files_recursively(self, directory: Path) -> List[Path]:
        """Get all files in directory recursively, filtering by extensions"""
        files = []
        for file_path in directory.rglob("*"):
            if (file_path.is_file() and 
                file_path.suffix.lower() not in self.exclude_extensions):
                files.append(file_path)
        return files
    
    def _process_file(self, file_path: Path) -> List[Dict[str, Any]]:
        """Process a single file and return chunks"""
        if self.verbose:
            print(f"Processing: {file_path}")
        
        try:
            content = self._read_file(file_path)
            chunks = self._chunk_text(content)
            
            return [
                {
                    "content": chunk,
                    "file": str(file_path),
                    "chunk_index": i,
                    "file_size": file_path.stat().st_size,
                    "file_extension": file_path.suffix,
                    "chunk_hash": hashlib.md5(chunk.encode('utf-8')).hexdigest()
                }
                for i, chunk in enumerate(chunks)
            ]
        except Exception as e:
            if self.verbose:
                print(f"Error processing {file_path}: {e}")
            return []
    
    def _read_file(self, file_path: Path) -> str:
        """Read file content based on file type"""
        if file_path.suffix.lower() == '.pdf':
            return self._read_pdf(file_path)
        elif file_path.suffix.lower() in ['.html', '.htm']:
            return self._read_html(file_path)
        elif file_path.suffix.lower() in ['.md', '.markdown']:
            return self._read_markdown(file_path)
        else:
            # Try to read as text
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    return f.read()
            except UnicodeDecodeError:
                # Try with latin-1 encoding
                with open(file_path, 'r', encoding='latin-1') as f:
                    return f.read()
    
    def _read_pdf(self, file_path: Path) -> str:
        """Extract text from PDF file"""
        try:
            import PyPDF2
            with open(file_path, 'rb') as f:
                reader = PyPDF2.PdfReader(f)
                text = ""
                for page in reader.pages:
                    text += page.extract_text() + "\n"
                return text
        except ImportError:
            raise ImportError("PyPDF2 is required for PDF processing. Install with: pip install PyPDF2")
    
    def _read_html(self, file_path: Path) -> str:
        """Extract text from HTML file"""
        try:
            from bs4 import BeautifulSoup
            with open(file_path, 'r', encoding='utf-8') as f:
                soup = BeautifulSoup(f.read(), 'html.parser')
                return soup.get_text()
        except ImportError:
            raise ImportError("beautifulsoup4 is required for HTML processing. Install with: pip install beautifulsoup4")
    
    def _read_markdown(self, file_path: Path) -> str:
        """Read markdown file and optionally convert to text"""
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    
    def _chunk_text(self, text: str) -> List[str]:
        """Split text into overlapping chunks"""
        if len(text) <= self.chunk_size:
            return [text] if text.strip() else []
        
        chunks = []
        start = 0
        
        while start < len(text):
            end = start + self.chunk_size
            chunk = text[start:end]
            
            # Try to break at word boundaries
            if end < len(text):
                last_space = chunk.rfind(' ')
                if last_space > start + self.chunk_size * 0.5:  # Don't break too early
                    end = start + last_space
                    chunk = text[start:end]
            
            if chunk.strip():
                chunks.append(chunk.strip())
            
            start = end - self.chunk_overlap
            if start >= len(text):
                break
        
        return chunks
    
    def _generate_embeddings(self, texts: List[str]) -> np.ndarray:
        """Generate embeddings for a list of texts"""
        if not texts:
            return np.array([])
        
        embeddings = self.model.encode(texts, show_progress_bar=self.verbose)
        return embeddings
    
    def _hash_embedding(self, embedding: np.ndarray) -> str:
        """Create a hash of the embedding for deduplication"""
        return hashlib.md5(embedding.tobytes()).hexdigest()
    
    def save_index(self, indexed_content: Dict[str, Any], output_path: str, 
                   format: str = 'json'):
        """Save the index to file"""
        output_path = Path(output_path)
        
        if format == 'json':
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(indexed_content, f, indent=2, ensure_ascii=False)
        elif format == 'pickle':
            with open(output_path, 'wb') as f:
                pickle.dump(indexed_content, f)
        else:
            raise ValueError(f"Unsupported format: {format}")
        
        if self.verbose:
            print(f"Index saved to: {output_path}")


class CosineSimilarityRAG:
    """RAG system using cosine similarity for retrieval"""
    
    def __init__(self, model_name: Optional[str] = None, verbose: bool = False):
        self.model_name = model_name
        self.verbose = verbose
        self.index = None
        self.model = None
        
        if model_name and HAS_SENTENCE_TRANSFORMERS:
            self.model = SentenceTransformer(model_name)
            if verbose:
                print(f"Loaded query encoder: {model_name}")
    
    def load_index(self, index_path: Union[str, Path]):
        """Load a vector index from file"""
        index_path = Path(index_path)
        
        if index_path.suffix == '.json':
            with open(index_path, 'r', encoding='utf-8') as f:
                self.index = json.load(f)
        elif index_path.suffix in ['.pkl', '.pickle']:
            with open(index_path, 'rb') as f:
                self.index = pickle.load(f)
        else:
            raise ValueError(f"Unsupported index format: {index_path.suffix}")
        
        # Convert embeddings back to numpy arrays
        for chunk in self.index['chunks']:
            chunk['embedding'] = np.array(chunk['embedding'])
        
        if self.verbose:
            print(f"Loaded index with {len(self.index['chunks'])} chunks")
    
    def search(self, query: str, top_k: int = 5, threshold: float = 0.5) -> List[Dict[str, Any]]:
        """Search for relevant content using cosine similarity"""
        if not self.index:
            raise ValueError("No index loaded. Call load_index() first.")
        
        if not HAS_SCIPY:
            raise ImportError("scipy is required for similarity search. Install with: pip install scipy")
        
        # Generate query embedding
        if self.model:
            query_embedding = self.model.encode([query])[0]
        else:
            # Fallback to simple text matching if no model
            return self._text_search(query, top_k, threshold)
        
        # Calculate similarities
        similarities = []
        for chunk in self.index['chunks']:
            similarity = 1 - cosine(query_embedding, chunk['embedding'])
            similarities.append({
                'content': chunk['content'],
                'file': chunk['file'],
                'chunk_index': chunk['chunk_index'],
                'score': similarity,
                'metadata': {
                    'file_size': chunk.get('file_size'),
                    'file_extension': chunk.get('file_extension'),
                    'chunk_hash': chunk.get('chunk_hash')
                }
            })
        
        # Filter and sort
        filtered_results = [r for r in similarities if r['score'] >= threshold]
        sorted_results = sorted(filtered_results, key=lambda x: x['score'], reverse=True)
        
        return sorted_results[:top_k]
    
    def _text_search(self, query: str, top_k: int, threshold: float) -> List[Dict[str, Any]]:
        """Fallback text-based search when no embedding model is available"""
        query_words = set(query.lower().split())
        
        results = []
        for chunk in self.index['chunks']:
            content_words = set(chunk['content'].lower().split())
            overlap = len(query_words.intersection(content_words))
            total = len(query_words.union(content_words))
            score = overlap / total if total > 0 else 0
            
            if score >= threshold:
                results.append({
                    'content': chunk['content'],
                    'file': chunk['file'],
                    'chunk_index': chunk['chunk_index'],
                    'score': score,
                    'metadata': {
                        'file_size': chunk.get('file_size'),
                        'file_extension': chunk.get('file_extension'),
                        'chunk_hash': chunk.get('chunk_hash')
                    }
                })
        
        return sorted(results, key=lambda x: x['score'], reverse=True)[:top_k]
    
    def get_stats(self) -> Optional[Dict[str, Any]]:
        """Get statistics about the loaded index"""
        if not self.index:
            return None
        
        return self.index.get('metadata', {})