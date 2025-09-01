#!/usr/bin/env python3

"""
Generate embeddings for EU regulation documents using OpenAI API
Directly outputs JavaScript file with pre-cached embeddings
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
    'chunk_size': 512,  # tokens (approximate)
    'chunk_overlap': 50,  # tokens
    'char_per_token': 4,  # rough approximation
    'embedding_model': 'text-embedding-3-small',
    'batch_size': 10,  # embeddings per API call
    'max_chunks_per_doc': 50,  # limit chunks to avoid memory issues
    'output_file': Path(__file__).parent.parent / 'js' / 'data' / 'precached-embeddings.js'
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
    },
    {
        'id': 'cra',
        'name': 'EU Cyber Resilience Act',
        'file': Path(__file__).parent.parent / 'js' / 'data' / 'regulations' / 'eu-regulation-cra.js'
    },
    {
        'id': 'dora',
        'name': 'EU Digital Operational Resilience Act',
        'file': Path(__file__).parent.parent / 'js' / 'data' / 'regulations' / 'eu-regulation-dora.js'
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

def chunk_text(text: str, chunk_size: int = 512, chunk_overlap: int = 50, max_chunks: int = 50) -> List[Dict]:
    """Chunk text into smaller pieces with overlap"""
    chunk_size_chars = chunk_size * CONFIG['char_per_token']
    chunk_overlap_chars = chunk_overlap * CONFIG['char_per_token']
    
    chunks = []
    start = 0
    
    while start < len(text) and len(chunks) < max_chunks:
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
    
    client = OpenAI(api_key=api_key)
    embeddings = []
    batch_size = CONFIG['batch_size']
    
    for i in range(0, len(text_chunks), batch_size):
        batch = text_chunks[i:i + batch_size]
        progress = int((i / len(text_chunks)) * 100)
        print(f"\r  {progress}% - Processing batch {i//batch_size + 1}...", end='')
        
        try:
            response = client.embeddings.create(
                model=CONFIG['embedding_model'],
                input=batch,
                encoding_format="float"
            )
            
            for item in response.data:
                embeddings.append(item.embedding)
                
        except Exception as e:
            print(f"\n  ✗ Error generating embeddings: {e}")
            raise
    
    print("\n  ✓ Embeddings generated successfully")
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
    print(f"  Created {len(chunks)} chunks")
    
    # Extract just the text for embedding
    text_chunks = [chunk['content'] for chunk in chunks]
    
    # Generate embeddings
    print(f"  Generating embeddings...")
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

def write_javascript_file(embeddings_data: Dict, output_file: Path):
    """Write embeddings data as JavaScript file"""
    print(f"\nWriting JavaScript file to {output_file}...")
    
    with open(output_file, 'w', encoding='utf-8') as f:
        # Write header
        f.write(f"""/**
 * Pre-cached Embeddings for EU Regulation Documents
 * Generated: {datetime.now().isoformat()}
 * Model: {CONFIG['embedding_model']}
 * 
 * This file contains pre-computed embeddings for EU regulation documents
 * to enable RAG functionality without requiring API calls for indexing.
 */

window.precachedEmbeddings = """)
        
        # Write the data as JSON
        json.dump(embeddings_data, f, indent=2)
        
        # Write the initialization function
        f.write(""";

// Initialize function to load pre-cached embeddings into RAG system
window.initializePrecachedEmbeddings = function() {
    if (!window.ragVectorStore) {
        console.warn('RAG vector store not initialized yet');
        return false;
    }
    
    const embeddings = window.precachedEmbeddings;
    let totalVectors = 0;
    
    console.log('Loading pre-cached embeddings...');
    
    for (const docData of embeddings.documents) {
        // Store vectors in memory
        window.ragVectorStore.storeVectors(docData.documentId, docData.vectors);
        totalVectors += docData.vectors.length;
        
        // Update document index metadata
        if (window.CoreStorageService) {
            const euDocsIndex = window.CoreStorageService.getValue('rag_eu_documents_index') || {};
            euDocsIndex[docData.documentId] = {
                name: docData.documentName,
                enabled: true,
                lastIndexed: docData.metadata.generatedAt,
                chunks: docData.vectors.length,
                metadata: docData.metadata
            };
            window.CoreStorageService.setValue('rag_eu_documents_index', euDocsIndex);
        }
        
        console.log(`  Loaded ${docData.vectors.length} vectors for ${docData.documentName}`);
    }
    
    console.log(`Successfully loaded ${totalVectors} pre-cached embeddings for ${embeddings.documents.length} documents`);
    
    // Notify other components
    if (window.RAGIndexStatsManager) {
        window.RAGIndexStatsManager.updateStats();
    }
    
    return true;
};

// Auto-initialize when RAG system is ready
(function() {
    let initAttempts = 0;
    const maxAttempts = 50;
    
    function tryInit() {
        if (window.ragVectorStore && window.CoreStorageService) {
            window.initializePrecachedEmbeddings();
        } else if (initAttempts < maxAttempts) {
            initAttempts++;
            setTimeout(tryInit, 100);
        } else {
            console.warn('Failed to initialize pre-cached embeddings after', maxAttempts, 'attempts');
        }
    }
    
    // Start initialization after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryInit);
    } else {
        tryInit();
    }
})();
""")
    
    print(f"  ✓ JavaScript file written successfully")

def main():
    """Main execution"""
    print("Pre-cached Embeddings Generator (Python)")
    print("=" * 50)
    print(f"Model: {CONFIG['embedding_model']}")
    print(f"Max chunks per doc: {CONFIG['max_chunks_per_doc']}")
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
            continue
    
    # Write JavaScript file
    write_javascript_file(embeddings_data, CONFIG['output_file'])
    
    # Summary
    print("\n" + "=" * 50)
    print("✅ Generation Complete!")
    print(f"Total documents: {len(embeddings_data['documents'])}")
    print(f"Total vectors: {total_vectors}")
    print(f"Output file: {CONFIG['output_file']}")
    print(f"File size: {CONFIG['output_file'].stat().st_size / 1024 / 1024:.2f} MB")
    print("\nThe embeddings are ready to use!")
    print("They will be automatically loaded when the application starts.")

if __name__ == '__main__':
    main()