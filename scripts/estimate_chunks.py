#!/usr/bin/env python3

"""
Estimate how many chunks we'll get from each document
"""

from pathlib import Path
import re

# Configuration
CHUNK_SIZE = 200  # tokens
CHUNK_OVERLAP = 20  # tokens
CHAR_PER_TOKEN = 4  # rough approximation

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

def estimate_chunks(text_length: int, chunk_size_tokens: int = 200, overlap_tokens: int = 20) -> int:
    """Estimate number of chunks for given text length"""
    chunk_size_chars = chunk_size_tokens * CHAR_PER_TOKEN
    overlap_chars = overlap_tokens * CHAR_PER_TOKEN
    
    if text_length <= chunk_size_chars:
        return 1
    
    # First chunk
    chunks = 1
    position = chunk_size_chars
    
    # Subsequent chunks with overlap
    while position < text_length:
        chunks += 1
        position += (chunk_size_chars - overlap_chars)
    
    return chunks

print("Chunk Size Estimation")
print("=" * 60)
print(f"Chunk size: {CHUNK_SIZE} tokens (~{CHUNK_SIZE * CHAR_PER_TOKEN} chars)")
print(f"Overlap: {CHUNK_OVERLAP} tokens (~{CHUNK_OVERLAP * CHAR_PER_TOKEN} chars)")
print(f"Effective advance: {CHUNK_SIZE - CHUNK_OVERLAP} tokens (~{(CHUNK_SIZE - CHUNK_OVERLAP) * CHAR_PER_TOKEN} chars)")
print()

total_chunks = 0
total_chars = 0

for reg in REGULATIONS:
    content = load_regulation_content(reg['file'])
    content_length = len(content)
    estimated_chunks = estimate_chunks(content_length, CHUNK_SIZE, CHUNK_OVERLAP)
    
    print(f"{reg['name']} ({reg['id'].upper()}):")
    print(f"  Content length: {content_length:,} characters")
    print(f"  Estimated tokens: ~{content_length // CHAR_PER_TOKEN:,}")
    print(f"  Estimated chunks: {estimated_chunks}")
    print(f"  API calls needed: {(estimated_chunks + 9) // 10}")  # batch size is 10
    print()
    
    total_chunks += estimated_chunks
    total_chars += content_length

print("-" * 60)
print(f"TOTAL:")
print(f"  Total characters: {total_chars:,}")
print(f"  Total chunks: {total_chunks}")
print(f"  Total API calls: {(total_chunks + 9) // 10}")
print(f"  Estimated cost: ~${(total_chunks * 0.00002):.4f} (at $0.02 per 1M tokens)")
print(f"  Estimated time: ~{(total_chunks + 9) // 10 * 2} seconds")