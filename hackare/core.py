"""
Core functionality for creating hacka.re bundles and links
"""

import os
import shutil
import json
import base64
import gzip
from pathlib import Path
from typing import Dict, Any, Optional, List
from urllib.parse import urlencode

from .templates import get_template_files


class HackaReBuilder:
    """Main class for building hacka.re instances and links"""
    
    def __init__(self, output_dir: Optional[Path] = None, title: str = "Custom hacka.re",
                 verbose: bool = False):
        self.output_dir = output_dir
        self.title = title
        self.verbose = verbose
        
    def log(self, message: str):
        """Log a message if verbose mode is enabled"""
        if self.verbose:
            print(f"[hackare] {message}")
    
    def create_bundle(self, indexed_content: Dict[str, Any]) -> Path:
        """Create a complete hacka.re bundle with pre-indexed content
        
        Args:
            indexed_content: Dictionary containing indexed chunks and metadata
            
        Returns:
            Path to the created bundle directory
        """
        if not self.output_dir:
            raise ValueError("output_dir must be specified for bundle creation")
            
        self.log(f"Creating bundle at {self.output_dir}")
        
        # Create output directory
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Copy base hacka.re files
        self._copy_base_files()
        
        # Create the vector index data file
        self._create_index_data_file(indexed_content)
        
        # Modify the HTML to include RAG functionality
        self._modify_html_for_rag()
        
        # Create configuration file
        self._create_config_file(indexed_content)
        
        self.log(f"Bundle created successfully at {self.output_dir}")
        return self.output_dir
    
    def create_link(self, content: str, title: str = "Shared Content",
                   compress: bool = False) -> str:
        """Create a self-contained hacka.re link with embedded content
        
        Args:
            content: Text content to embed
            title: Title for the content
            compress: Whether to compress the content
            
        Returns:
            Complete shareable URL
        """
        self.log(f"Creating link for content of length {len(content)}")
        
        # Prepare the data payload
        data = {
            "title": title,
            "content": content,
            "timestamp": self._get_timestamp()
        }
        
        # Convert to JSON
        json_data = json.dumps(data, separators=(',', ':'))
        
        # Optionally compress
        if compress:
            json_data = self._compress_data(json_data)
            self.log("Content compressed")
        
        # Base64 encode
        encoded_data = base64.b64encode(json_data.encode('utf-8')).decode('ascii')
        
        # Create the URL
        base_url = "https://hacka.re"  # This should be configurable
        params = {
            "data": encoded_data
        }
        
        if compress:
            params["compressed"] = "1"
        
        url = f"{base_url}#{urlencode(params)}"
        
        self.log(f"Generated link of length {len(url)}")
        return url
    
    def _copy_base_files(self):
        """Copy base hacka.re files to the output directory"""
        self.log("Copying base hacka.re files")
        
        # Get the parent directory (hacka.re project root)
        project_root = Path(__file__).parent.parent
        
        # Files and directories to copy
        items_to_copy = [
            "index.html",
            "js/",
            "css/", 
            "lib/",
            "about/",
            "images/"
        ]
        
        for item in items_to_copy:
            src = project_root / item
            dst = self.output_dir / item
            
            if src.exists():
                if src.is_dir():
                    shutil.copytree(src, dst, dirs_exist_ok=True)
                else:
                    dst.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(src, dst)
                self.log(f"Copied {item}")
            else:
                self.log(f"Warning: {item} not found, skipping")
    
    def _create_index_data_file(self, indexed_content: Dict[str, Any]):
        """Create the vector index data file"""
        data_dir = self.output_dir / "data"
        data_dir.mkdir(exist_ok=True)
        
        index_file = data_dir / "vector_index.json"
        
        with open(index_file, 'w', encoding='utf-8') as f:
            json.dump(indexed_content, f, indent=2, ensure_ascii=False)
        
        self.log(f"Created vector index data file: {index_file}")
    
    def _modify_html_for_rag(self):
        """Modify the main HTML file to include RAG functionality"""
        html_file = self.output_dir / "index.html"
        
        if not html_file.exists():
            self.log("Warning: index.html not found, creating basic template")
            self._create_basic_html()
            return
        
        # Read the existing HTML
        with open(html_file, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        # Insert RAG scripts before closing body tag
        rag_scripts = '''
    <!-- Vector RAG Integration -->
    <script src="js/services/vector-rag-service.js"></script>
    <script>
        // Initialize RAG functionality when page loads
        document.addEventListener('DOMContentLoaded', function() {
            if (window.VectorRAGService) {
                window.vectorRAG = new VectorRAGService();
                window.vectorRAG.loadIndex('/data/vector_index.json');
            }
        });
    </script>
'''
        
        # Insert before closing body tag
        html_content = html_content.replace('</body>', rag_scripts + '\n</body>')
        
        # Write back the modified HTML
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        # Create the RAG service file
        self._create_rag_service_file()
        
        self.log("Modified HTML to include RAG functionality")
    
    def _create_rag_service_file(self):
        """Create the client-side RAG service JavaScript file"""
        js_services_dir = self.output_dir / "js" / "services"
        js_services_dir.mkdir(parents=True, exist_ok=True)
        
        rag_service_file = js_services_dir / "vector-rag-service.js"
        
        rag_service_content = '''
/**
 * Client-side Vector RAG Service for pre-indexed content
 */
class VectorRAGService {
    constructor() {
        this.index = null;
        this.isLoaded = false;
    }
    
    async loadIndex(indexPath) {
        try {
            const response = await fetch(indexPath);
            this.index = await response.json();
            this.isLoaded = true;
            console.log(`Loaded vector index with ${this.index.chunks.length} chunks`);
        } catch (error) {
            console.error('Failed to load vector index:', error);
        }
    }
    
    search(query, topK = 5, threshold = 0.5) {
        if (!this.isLoaded || !this.index) {
            console.warn('Vector index not loaded');
            return [];
        }
        
        // Convert query to vector (this would need actual embedding)
        // For now, use simple text matching as fallback
        const results = this.index.chunks
            .map(chunk => ({
                ...chunk,
                score: this.calculateTextSimilarity(query, chunk.content)
            }))
            .filter(result => result.score >= threshold)
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
        
        return results;
    }
    
    calculateTextSimilarity(text1, text2) {
        // Simple text similarity using word overlap
        const words1 = text1.toLowerCase().split(/\\W+/);
        const words2 = text2.toLowerCase().split(/\\W+/);
        
        const set1 = new Set(words1);
        const set2 = new Set(words2);
        
        const intersection = new Set([...set1].filter(word => set2.has(word)));
        const union = new Set([...set1, ...set2]);
        
        return intersection.size / union.size;
    }
    
    getStats() {
        if (!this.isLoaded) return null;
        
        return {
            totalChunks: this.index.chunks.length,
            totalFiles: this.index.files.length,
            modelUsed: this.index.metadata.model,
            indexedAt: this.index.metadata.created_at
        };
    }
}

// Make available globally
window.VectorRAGService = VectorRAGService;
'''
        
        with open(rag_service_file, 'w', encoding='utf-8') as f:
            f.write(rag_service_content)
        
        self.log("Created RAG service file")
    
    def _create_config_file(self, indexed_content: Dict[str, Any]):
        """Create a configuration file for the bundle"""
        config = {
            "title": self.title,
            "type": "rag_bundle",
            "version": "0.1.0",
            "created_at": self._get_timestamp(),
            "stats": {
                "total_chunks": len(indexed_content.get("chunks", [])),
                "total_files": len(indexed_content.get("files", [])),
                "model_used": indexed_content.get("metadata", {}).get("model", "unknown")
            }
        }
        
        config_file = self.output_dir / "hackare_config.json"
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2)
        
        self.log("Created configuration file")
    
    def _create_basic_html(self):
        """Create a basic HTML template if none exists"""
        basic_html = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <link rel="stylesheet" href="css/styles.css">
</head>
<body>
    <div id="app">
        <h1>{title}</h1>
        <div id="chat-interface">
            <!-- Chat interface will be initialized here -->
        </div>
    </div>
    
    <script src="js/app.js"></script>
</body>
</html>'''.format(title=self.title)
        
        html_file = self.output_dir / "index.html"
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(basic_html)
    
    def _compress_data(self, data: str) -> bytes:
        """Compress data using gzip"""
        return gzip.compress(data.encode('utf-8'))
    
    def _get_timestamp(self) -> str:
        """Get current timestamp in ISO format"""
        from datetime import datetime
        return datetime.now().isoformat()
'''
        
        with open(core_file, 'w', encoding='utf-8') as f:
            f.write(core_content)
        
        self.log("Created core.py file")