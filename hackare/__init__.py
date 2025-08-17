"""
hackare - A tool for creating self-contained hacka.re instances with vector-indexed content

This package provides functionality to:
1. Create self-contained hacka.re links with embedded data
2. Generate complete hacka.re bundles with pre-indexed static content
3. Perform offline RAG using cosine similarity on pre-indexed structured content
"""

__version__ = "0.1.0"
__author__ = "hacka.re contributors"
__description__ = "Create self-contained hacka.re instances with vector-indexed content"

from .cli import main
from .core import HackaReBuilder
from .rag import VectorIndexer, CosineSimilarityRAG

__all__ = [
    "main",
    "HackaReBuilder", 
    "VectorIndexer",
    "CosineSimilarityRAG"
]