#!/usr/bin/env python3

"""
Generate embeddings for EU regulation documents using OpenAI API
Limited version for testing - only processes first 10 chunks per document
"""

import json
import os
import sys
from pathlib import Path
import re
from typing import List, Dict, Any
from datetime import datetime
import openai
from dotenv import load_dotenv

# Load environment variables from playwright tests
env_path = Path(__file__).parent.parent / '_tests' / 'playwright' / '.env'
load_dotenv(env_path)

# Configuration
CONFIG = {
    'chunk_size': 200,  # tokens (approximate)
    'chunk_overlap': 20,  # tokens
    'char_per_token': 4,  # rough approximation
    'embedding_model': 'text-embedding-3-small',
    'batch_size': 10,  # embeddings per API call
    'max_chunks_per_doc': 10,  # LIMITED FOR TESTING
    'output_file': Path(__file__).parent.parent / 'js' / 'data' / 'precached-embeddings-test.js'
}

# Set OpenAI API key
api_key = os.getenv('OPENAI_API_KEY')
if not api_key:
    print("Error: OPENAI_API_KEY not found in .env file")
    sys.exit(1)

openai.api_key = api_key
print(f"✓ API key loaded: {api_key[:20]}...")

# Regulation files
REGULATIONS = [
    {
        'id': 'aia',
        'name': 'EU AI Act',
        'file': Path(__file__).parent.parent / 'js' / 'data' / 'regulations' / 'eu-regulation-ai-act.js'
    }
]

def load_regulation_content(file_path: Path) -> str:
    """Extract content from regulation JavaScript file"""
    content = file_path.read_text(encoding='utf-8')
    
    # Extract content from template literal
    match = re.search(r'content:\s*`([^`]+)`', content, re.DOTALL)
    if match:
        return match.group(1)
    
    raise ValueError(f"Could not extract content from {file_path}")

def chunk_text(text: str, chunk_size: int = 512, chunk_overlap: int = 50, max_chunks: int = None) -> List[Dict]:
    """Chunk text into smaller pieces with overlap"""
    chunk_size_chars = chunk_size * CONFIG['char_per_token']
    chunk_overlap_chars = chunk_overlap * CONFIG['char_per_token']
    
    chunks = []
    start = 0
    
    while start < len(text) and (max_chunks is None or len(chunks) < max_chunks):
        end = min(start + chunk_size_chars, len(text))
        chunk = text[start:end]
        
        # Try to break at sentence boundaries
        if end < len(text):
            for delimiter in ['. ', '.\n', '! ', '? ', '\n\n']:
                last_delimiter = chunk.rfind(delimiter)
                if last_delimiter > chunk_size_chars * 0.5:
                    chunk = text[start:start + last_delimiter + len(delimiter)]
                    end = start + last_delimiter + len(delimiter)
                    break
        
        chunk = chunk.strip()
        if chunk:
            chunks.append({
                'content': chunk,
                'position': {
                    'start': start,
                    'end': end
                }
            })
        
        start = end - chunk_overlap_chars
        if start <= 0:
            start = end
        
        if start >= len(text):
            break
    
    return chunks

def generate_embeddings(text_chunks: List[str]) -> List[List[float]]:
    """Generate embeddings using OpenAI API"""
    from openai import OpenAI
    
    print(f"  Generating embeddings for {len(text_chunks)} chunks...")
    
    client = OpenAI(api_key=api_key)
    embeddings = []
    
    try:
        response = client.embeddings.create(
            model=CONFIG['embedding_model'],
            input=text_chunks,
            encoding_format="float"
        )
        
        for item in response.data:
            embeddings.append(item.embedding)
            
    except Exception as e:
        print(f"\n  ✗ Error generating embeddings: {e}")
        raise
    
    print(f"  ✓ Embeddings generated successfully")
    return embeddings

def process_regulation(regulation: Dict) -> Dict:
    """Process a single regulation document"""
    print(f"\nProcessing {regulation['name']}...")
    
    # Load content
    content = load_regulation_content(regulation['file'])
    print(f"  Loaded {len(content)} characters")
    
    # Chunk the content
    chunks = chunk_text(
        content, 
        CONFIG['chunk_size'], 
        CONFIG['chunk_overlap'],
        CONFIG['max_chunks_per_doc']
    )
    print(f"  Created {len(chunks)} chunks (limited for testing)")
    
    # Extract just the text for embedding
    text_chunks = [chunk['content'] for chunk in chunks]
    
    # Generate embeddings
    embeddings = generate_embeddings(text_chunks)
    
    # Create vectors with metadata
    vectors = []
    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        vectors.append({
            'id': f"{regulation['id']}_chunk_{i}",
            'embedding': embedding,
            'position': chunk['position'],
            'metadata': {
                'documentId': regulation['id'],
                'documentName': regulation['name'],
                'chunkIndex': i,
                'totalChunks': len(chunks),
                'chunkSize': len(chunk['content'])
            }
        })
    
    return {
        'documentId': regulation['id'],
        'documentName': regulation['name'],
        'vectors': vectors,
        'metadata': {
            'totalChunks': len(chunks),
            'embeddingModel': CONFIG['embedding_model'],
            'chunkSize': CONFIG['chunk_size'],
            'chunkOverlap': CONFIG['chunk_overlap'],
            'generatedAt': datetime.now().isoformat()
        }
    }

def main():
    """Main execution"""
    print("TEST: Limited Embeddings Generator")
    print("=" * 50)
    print(f"Model: {CONFIG['embedding_model']}")
    print(f"Chunk size: {CONFIG['chunk_size']} tokens")
    print(f"Max chunks per doc: {CONFIG['max_chunks_per_doc']} (LIMITED FOR TESTING)")
    print(f"Output: {CONFIG['output_file']}")
    
    embeddings_data = {
        'version': '1.0',
        'generatedAt': datetime.now().isoformat(),
        'model': CONFIG['embedding_model'],
        'config': {
            'chunkSize': CONFIG['chunk_size'],
            'chunkOverlap': CONFIG['chunk_overlap']
        },
        'documents': []
    }
    
    total_vectors = 0
    
    for regulation in REGULATIONS:
        try:
            doc_data = process_regulation(regulation)
            embeddings_data['documents'].append(doc_data)
            total_vectors += len(doc_data['vectors'])
        except Exception as e:
            print(f"  ✗ Error processing {regulation['name']}: {e}")
            import traceback
            traceback.print_exc()
            continue
    
    # Summary
    print("\n" + "=" * 50)
    print("✅ TEST Complete!")
    print(f"Total documents: {len(embeddings_data['documents'])}")
    print(f"Total vectors: {total_vectors}")

if __name__ == '__main__':
    main()