#!/usr/bin/env python3

"""
Generate embeddings for EU regulation documents using OpenAI API
Enhanced version with better progress reporting and debugging
"""

import json
import os
import sys
from pathlib import Path
import re
from typing import List, Dict, Any
from datetime import datetime
import time
from dotenv import load_dotenv

# Load environment variables from playwright tests
env_path = Path(__file__).parent.parent / '_tests' / 'playwright' / '.env'
load_dotenv(env_path)

# Configuration
CONFIG = {
    'chunk_size': 512,  # tokens (standard size for embeddings)
    'chunk_overlap': 50,  # tokens (about 10% overlap)
    'char_per_token': 4,  # rough approximation
    'embedding_model': 'text-embedding-3-small',
    'batch_size': 10,  # embeddings per API call
    'max_chunks_per_doc': 300,  # Safety limit per document (with 512 tokens, should be ~150-200 per doc)
    'max_total_chunks': 1000,  # Safety limit for all chunks
    'output_file': Path(__file__).parent.parent / 'js' / 'data' / 'precached-embeddings.js',
    'minify': True  # Minify the output JavaScript file
}

# Set OpenAI API key
api_key = os.getenv('OPENAI_API_KEY')
if not api_key:
    print("Error: OPENAI_API_KEY not found in .env file")
    sys.exit(1)

print(f"✓ API key loaded: {api_key[:20]}...")

# Regulation files
REGULATIONS = [
    {
        'id': 'aia',
        'name': 'EU AI Act',
        'file': Path(__file__).parent.parent / 'js' / 'data' / 'regulations' / 'eu-regulation-ai-act.js',
        'expected_chunks': 135  # With 512 tokens per chunk (~246k chars / 2048 chars per chunk)
    },
    {
        'id': 'cra',
        'name': 'EU Cyber Resilience Act',
        'file': Path(__file__).parent.parent / 'js' / 'data' / 'regulations' / 'eu-regulation-cra.js',
        'expected_chunks': 195  # With 512 tokens per chunk (~358k chars / 2048 chars per chunk)
    },
    {
        'id': 'dora',
        'name': 'EU Digital Operational Resilience Act',
        'file': Path(__file__).parent.parent / 'js' / 'data' / 'regulations' / 'eu-regulation-dora.js',
        'expected_chunks': 170  # With 512 tokens per chunk (~312k chars / 2048 chars per chunk)
    }
]

def load_regulation_content(file_path: Path) -> str:
    """Extract content from regulation JavaScript file"""
    print(f"    Loading from: {file_path}")
    content = file_path.read_text(encoding='utf-8')
    
    # Extract content from template literal
    match = re.search(r'content:\s*`([^`]+)`', content, re.DOTALL)
    if match:
        extracted = match.group(1)
        print(f"    Extracted {len(extracted)} characters")
        return extracted
    
    raise ValueError(f"Could not extract content from {file_path}")

def chunk_text(text: str, chunk_size: int = 512, chunk_overlap: int = 50, max_chunks: int = None) -> List[Dict]:
    """Chunk text into smaller pieces with overlap"""
    chunk_size_chars = chunk_size * CONFIG['char_per_token']
    chunk_overlap_chars = chunk_overlap * CONFIG['char_per_token']
    
    print(f"    Chunking parameters:")
    print(f"      - Chunk size: {chunk_size} tokens (~{chunk_size_chars} chars)")
    print(f"      - Overlap: {chunk_overlap} tokens (~{chunk_overlap_chars} chars)")
    print(f"      - Max chunks: {max_chunks if max_chunks else 'No limit'}")
    print(f"      - Text length: {len(text)} chars")
    
    chunks = []
    start = 0
    safety_counter = 0
    max_iterations = 10000  # Safety limit to prevent infinite loops
    
    while start < len(text):
        safety_counter += 1
        if safety_counter > max_iterations:
            print(f"    ⚠️  Safety limit reached: {max_iterations} iterations")
            break
            
        # Check if we've hit max chunks limit
        if max_chunks is not None and len(chunks) >= max_chunks:
            print(f"    ⚠️  Reached max chunks limit of {max_chunks}")
            break
            
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
            
            # Progress reporting every 50 chunks
            if len(chunks) % 50 == 0:
                progress = (end / len(text)) * 100
                print(f"      Created {len(chunks)} chunks ({progress:.1f}% of text processed)")
        
        # Calculate next start position with overlap
        if end >= len(text):
            # We've reached the end of the text
            break
        
        # Move forward with overlap
        start = end - chunk_overlap_chars
        
        # Make sure we're actually moving forward
        if start <= chunks[-1]['position']['start']:
            # Force forward movement if overlap would cause backward movement
            start = end
    
    print(f"    ✓ Created {len(chunks)} chunks total")
    return chunks

def generate_embeddings(text_chunks: List[str]) -> List[List[float]]:
    """Generate embeddings using OpenAI API"""
    from openai import OpenAI
    
    client = OpenAI(api_key=api_key)
    embeddings = []
    batch_size = CONFIG['batch_size']
    total_batches = (len(text_chunks) + batch_size - 1) // batch_size
    
    print(f"    Generating embeddings for {len(text_chunks)} chunks")
    print(f"    Will process in {total_batches} batches of {batch_size}")
    
    start_time = time.time()
    
    for i in range(0, len(text_chunks), batch_size):
        batch = text_chunks[i:i + batch_size]
        batch_num = i//batch_size + 1
        progress = (i / len(text_chunks)) * 100
        
        print(f"      Batch {batch_num}/{total_batches} ({progress:.1f}%) - {len(batch)} chunks...", flush=True)
        
        try:
            response = client.embeddings.create(
                model=CONFIG['embedding_model'],
                input=batch,
                encoding_format="float"
            )
            
            for item in response.data:
                embeddings.append(item.embedding)
                
        except Exception as e:
            print(f"\n    ✗ Error generating embeddings at batch {batch_num}: {e}")
            raise
    
    elapsed = time.time() - start_time
    print(f"    ✓ Generated {len(embeddings)} embeddings in {elapsed:.1f} seconds")
    return embeddings

def process_regulation(regulation: Dict) -> Dict:
    """Process a single regulation document"""
    print(f"\n{'='*60}")
    print(f"Processing: {regulation['name']}")
    print(f"Expected chunks: ~{regulation.get('expected_chunks', 'Unknown')}")
    print(f"{'='*60}")
    
    # Load content
    content = load_regulation_content(regulation['file'])
    
    # Chunk the content
    chunks = chunk_text(
        content, 
        CONFIG['chunk_size'], 
        CONFIG['chunk_overlap'],
        CONFIG['max_chunks_per_doc']
    )
    
    if 'expected_chunks' in regulation:
        diff = len(chunks) - regulation['expected_chunks']
        if abs(diff) > 50:
            print(f"    ⚠️  Warning: Got {len(chunks)} chunks, expected ~{regulation['expected_chunks']} (diff: {diff:+d})")
    
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
    
    print(f"    ✓ Document complete: {len(vectors)} vectors created")
    
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
    print(f"\n{'='*60}")
    print(f"Writing JavaScript file...")
    print(f"Output: {output_file}")
    print(f"Minification: {'Enabled' if CONFIG.get('minify', False) else 'Disabled'}")
    
    with open(output_file, 'w', encoding='utf-8') as f:
        # Write header
        f.write(f"""/**
 * Pre-cached Embeddings for EU Regulation Documents
 * Generated: {datetime.now().isoformat()}
 * Model: {CONFIG['embedding_model']}
 * Chunk size: {CONFIG['chunk_size']} tokens
 * This file contains pre-computed embeddings for EU regulation documents.
 */
window.precachedEmbeddings=""")
        
        # Write the data as JSON (minified or formatted)
        if CONFIG.get('minify', False):
            json.dump(embeddings_data, f, separators=(',', ':'))
        else:
            json.dump(embeddings_data, f, indent=2)
        
        # Write the initialization function (minified or formatted)
        if CONFIG.get('minify', False):
            f.write(""";window.initializePrecachedEmbeddings=function(){if(!window.ragVectorStore){console.warn('RAG vector store not initialized yet');return false;}const embeddings=window.precachedEmbeddings;let totalVectors=0;console.log('Loading pre-cached embeddings...');for(const docData of embeddings.documents){window.ragVectorStore.storeVectors(docData.documentId,docData.vectors);totalVectors+=docData.vectors.length;if(window.CoreStorageService){const euDocsIndex=window.CoreStorageService.getValue('rag_eu_documents_index')||{};euDocsIndex[docData.documentId]={name:docData.documentName,enabled:true,lastIndexed:docData.metadata.generatedAt,chunks:docData.vectors.length,metadata:docData.metadata};window.CoreStorageService.setValue('rag_eu_documents_index',euDocsIndex);}console.log(`  Loaded ${docData.vectors.length} vectors for ${docData.documentName}`);}console.log(`Successfully loaded ${totalVectors} pre-cached embeddings for ${embeddings.documents.length} documents`);if(window.RAGIndexStatsManager){window.RAGIndexStatsManager.updateStats();}return true;};(function(){let initAttempts=0;const maxAttempts=50;function tryInit(){if(window.ragVectorStore&&window.CoreStorageService){window.initializePrecachedEmbeddings();}else if(initAttempts<maxAttempts){initAttempts++;setTimeout(tryInit,100);}else{console.warn('Failed to initialize pre-cached embeddings after',maxAttempts,'attempts');}}if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',tryInit);}else{tryInit();}})();""")
        else:
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
    print("\n" + "="*60)
    print("PRE-CACHED EMBEDDINGS GENERATOR (FULL VERSION)")
    print("="*60)
    print(f"Model: {CONFIG['embedding_model']}")
    print(f"Chunk size: {CONFIG['chunk_size']} tokens (~{CONFIG['chunk_size'] * CONFIG['char_per_token']} chars)")
    print(f"Chunk overlap: {CONFIG['chunk_overlap']} tokens")
    print(f"Max chunks per doc: {'No limit' if CONFIG['max_chunks_per_doc'] is None else CONFIG['max_chunks_per_doc']}")
    print(f"Output: {CONFIG['output_file']}")
    
    start_time = time.time()
    
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
    
    # Write JavaScript file
    write_javascript_file(embeddings_data, CONFIG['output_file'])
    
    # Summary
    elapsed = time.time() - start_time
    print("\n" + "="*60)
    print("✅ GENERATION COMPLETE!")
    print("="*60)
    print(f"Total documents: {len(embeddings_data['documents'])}")
    print(f"Total vectors: {total_vectors}")
    print(f"Output file: {CONFIG['output_file']}")
    
    # File size check
    if CONFIG['output_file'].exists():
        file_size = CONFIG['output_file'].stat().st_size / 1024 / 1024
        print(f"File size: {file_size:.2f} MB")
    
    print(f"Total time: {elapsed:.1f} seconds ({elapsed/60:.1f} minutes)")
    
    # Document summary
    print("\nDocument Summary:")
    for doc in embeddings_data['documents']:
        print(f"  - {doc['documentName']}: {len(doc['vectors'])} chunks")
    
    print("\nThe embeddings are ready to use!")
    print("They will be automatically loaded when the application starts.")

if __name__ == '__main__':
    main()