"""
Command-line interface for the hackare tool
"""

import click
import os
import sys
from pathlib import Path
from typing import List, Optional

from .core import HackaReBuilder
from .rag import VectorIndexer


@click.group()
@click.version_option()
def cli():
    """hackare - Create self-contained hacka.re instances with vector-indexed content"""
    pass


@cli.command()
@click.argument('input_files', nargs=-1, type=click.Path(exists=True))
@click.option('--output', '-o', type=click.Path(), 
              help='Output directory for the hacka.re bundle')
@click.option('--title', '-t', default='Custom hacka.re Instance',
              help='Title for the hacka.re instance')
@click.option('--index-model', default='all-MiniLM-L6-v2',
              help='Sentence transformer model for vector indexing')
@click.option('--chunk-size', default=512, type=int,
              help='Text chunk size for indexing')
@click.option('--chunk-overlap', default=50, type=int,
              help='Overlap between text chunks')
@click.option('--exclude-extensions', multiple=True,
              help='File extensions to exclude from indexing')
@click.option('--verbose', '-v', is_flag=True,
              help='Enable verbose output')
def bundle(input_files: tuple, output: Optional[str], title: str,
           index_model: str, chunk_size: int, chunk_overlap: int,
           exclude_extensions: tuple, verbose: bool):
    """Create a complete hacka.re bundle with pre-indexed content.
    
    INPUT_FILES can be files or directories to index and include in the bundle.
    """
    if not input_files:
        click.echo("Error: No input files or directories specified", err=True)
        sys.exit(1)
    
    if not output:
        output = "hackare_bundle"
    
    output_path = Path(output)
    
    if verbose:
        click.echo(f"Creating hacka.re bundle: {title}")
        click.echo(f"Output directory: {output_path}")
        click.echo(f"Input files: {input_files}")
        click.echo(f"Vector model: {index_model}")
    
    try:
        builder = HackaReBuilder(
            output_dir=output_path,
            title=title,
            verbose=verbose
        )
        
        # Index content
        indexer = VectorIndexer(
            model_name=index_model,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            exclude_extensions=list(exclude_extensions)
        )
        
        indexed_content = indexer.index_files(list(input_files))
        
        # Build bundle
        bundle_path = builder.create_bundle(indexed_content)
        
        click.echo(f"✅ Successfully created hacka.re bundle at: {bundle_path}")
        
    except Exception as e:
        click.echo(f"❌ Error creating bundle: {e}", err=True)
        sys.exit(1)


@cli.command()
@click.argument('content', type=str)
@click.option('--output', '-o', type=click.Path(),
              help='Output file for the shareable link')
@click.option('--title', '-t', default='Shared Content',
              help='Title for the shared content')
@click.option('--compress', is_flag=True,
              help='Compress the content in the link')
@click.option('--verbose', '-v', is_flag=True,
              help='Enable verbose output')
def link(content: str, output: Optional[str], title: str,
         compress: bool, verbose: bool):
    """Create a self-contained hacka.re link with embedded content.
    
    CONTENT is the text content to embed in the link.
    """
    if verbose:
        click.echo(f"Creating hacka.re link: {title}")
        click.echo(f"Content length: {len(content)} characters")
        click.echo(f"Compression: {'enabled' if compress else 'disabled'}")
    
    try:
        builder = HackaReBuilder(verbose=verbose)
        link_url = builder.create_link(content, title=title, compress=compress)
        
        if output:
            with open(output, 'w') as f:
                f.write(link_url)
            click.echo(f"✅ Link saved to: {output}")
        else:
            click.echo(f"✅ Generated link:")
            click.echo(link_url)
            
    except Exception as e:
        click.echo(f"❌ Error creating link: {e}", err=True)
        sys.exit(1)


@cli.command()
@click.argument('files_or_dirs', nargs=-1, type=click.Path(exists=True))
@click.option('--model', default='all-MiniLM-L6-v2',
              help='Sentence transformer model for indexing')
@click.option('--output', '-o', type=click.Path(),
              help='Output file for the index')
@click.option('--format', 'output_format', type=click.Choice(['json', 'pickle']),
              default='json', help='Output format for the index')
@click.option('--verbose', '-v', is_flag=True,
              help='Enable verbose output')
def index(files_or_dirs: tuple, model: str, output: Optional[str],
          output_format: str, verbose: bool):
    """Create a vector index from files and directories.
    
    FILES_OR_DIRS are the files and directories to index.
    """
    if not files_or_dirs:
        click.echo("Error: No files or directories specified", err=True)
        sys.exit(1)
        
    if not output:
        output = f"hackare_index.{output_format}"
    
    if verbose:
        click.echo(f"Creating vector index")
        click.echo(f"Model: {model}")
        click.echo(f"Output: {output}")
        click.echo(f"Format: {output_format}")
    
    try:
        indexer = VectorIndexer(model_name=model, verbose=verbose)
        indexed_content = indexer.index_files(list(files_or_dirs))
        
        indexer.save_index(indexed_content, output, format=output_format)
        
        click.echo(f"✅ Index created successfully: {output}")
        click.echo(f"📊 Indexed {len(indexed_content['chunks'])} chunks from {len(indexed_content['files'])} files")
        
    except Exception as e:
        click.echo(f"❌ Error creating index: {e}", err=True)
        sys.exit(1)


@cli.command()
@click.argument('query', type=str)
@click.argument('index_file', type=click.Path(exists=True))
@click.option('--top-k', default=5, type=int,
              help='Number of top results to return')
@click.option('--threshold', default=0.5, type=float,
              help='Similarity threshold for results')
@click.option('--verbose', '-v', is_flag=True,
              help='Enable verbose output')
def search(query: str, index_file: str, top_k: int, threshold: float, verbose: bool):
    """Search a vector index for relevant content.
    
    QUERY is the search query text.
    INDEX_FILE is the path to the vector index file.
    """
    if verbose:
        click.echo(f"Searching index: {index_file}")
        click.echo(f"Query: {query}")
        click.echo(f"Top-k: {top_k}")
        click.echo(f"Threshold: {threshold}")
    
    try:
        from .rag import CosineSimilarityRAG
        
        rag = CosineSimilarityRAG(verbose=verbose)
        rag.load_index(index_file)
        
        results = rag.search(query, top_k=top_k, threshold=threshold)
        
        if not results:
            click.echo("No relevant results found.")
            return
        
        click.echo(f"Found {len(results)} relevant results:")
        click.echo()
        
        for i, result in enumerate(results, 1):
            click.echo(f"{i}. Score: {result['score']:.3f}")
            click.echo(f"   File: {result['file']}")
            click.echo(f"   Content: {result['content'][:200]}...")
            click.echo()
            
    except Exception as e:
        click.echo(f"❌ Error searching index: {e}", err=True)
        sys.exit(1)


def main():
    """Entry point for the CLI"""
    cli()


if __name__ == '__main__':
    main()