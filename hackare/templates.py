"""
Template management for hackare bundles
"""

from typing import Dict, List
from pathlib import Path


def get_template_files() -> Dict[str, str]:
    """Get template files for creating hackare bundles
    
    Returns:
        Dictionary mapping template names to their content
    """
    templates = {
        "basic_html": get_basic_html_template(),
        "rag_service": get_rag_service_template(),
        "config_json": get_config_template()
    }
    
    return templates


def get_basic_html_template() -> str:
    """Basic HTML template for hackare instances"""
    return '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/themes.css">
    <link rel="stylesheet" href="lib/font-awesome/all.min.css">
    <meta name="description" content="Privacy-focused AI chat interface with vector RAG">
</head>
<body>
    <div id="app">
        <header>
            <h1>{{title}}</h1>
            <div id="controls">
                <button id="settings-btn" title="Settings"><i class="fas fa-cog"></i></button>
                <button id="theme-toggle-btn" title="Toggle Theme"><i class="fas fa-moon"></i></button>
            </div>
        </header>
        
        <main>
            <div id="chat-container">
                <div id="chat-messages"></div>
                <div id="input-container">
                    <textarea id="chat-input" placeholder="Ask questions about the indexed content..."></textarea>
                    <button id="send-btn"><i class="fas fa-paper-plane"></i></button>
                </div>
            </div>
        </main>
        
        <div id="rag-status">
            <div id="rag-info">
                <span id="chunk-count">Loading index...</span>
                <span id="model-info"></span>
            </div>
        </div>
    </div>
    
    <!-- Core Libraries -->
    <script src="lib/marked/marked.min.js"></script>
    <script src="lib/highlight.js/highlight.min.js"></script>
    <script src="lib/dompurify/purify.min.js"></script>
    
    <!-- Core Application -->
    <script src="js/app.js"></script>
    <script src="js/services/storage-service.js"></script>
    <script src="js/services/api-service.js"></script>
    
    <!-- Vector RAG Integration -->
    <script src="js/services/vector-rag-service.js"></script>
    
    <script>
        // Initialize the application with RAG support
        document.addEventListener('DOMContentLoaded', function() {
            window.app = new HackaReApp({
                ragEnabled: true,
                indexPath: '/data/vector_index.json'
            });
        });
    </script>
</body>
</html>'''


def get_rag_service_template() -> str:
    """Client-side RAG service template"""
    return '''/**
 * Client-side Vector RAG Service for pre-indexed content
 */
class VectorRAGService {
    constructor() {
        this.index = null;
        this.isLoaded = false;
        this.stats = null;
    }
    
    async loadIndex(indexPath) {
        try {
            console.log('Loading vector index...');
            const response = await fetch(indexPath);
            if (!response.ok) {
                throw new Error(`Failed to fetch index: ${response.status}`);
            }
            
            this.index = await response.json();
            this.isLoaded = true;
            this.stats = this.index.metadata || {};
            
            console.log(`Loaded vector index with ${this.index.chunks.length} chunks from ${this.index.files.length} files`);
            this.updateUI();
        } catch (error) {
            console.error('Failed to load vector index:', error);
            this.showError('Failed to load content index');
        }
    }
    
    search(query, topK = 5, threshold = 0.3) {
        if (!this.isLoaded || !this.index) {
            console.warn('Vector index not loaded');
            return [];
        }
        
        // Enhanced text-based similarity for client-side search
        const results = this.index.chunks
            .map(chunk => ({
                ...chunk,
                score: this.calculateEnhancedSimilarity(query, chunk.content)
            }))
            .filter(result => result.score >= threshold)
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
        
        return results;
    }
    
    calculateEnhancedSimilarity(query, text) {
        // Convert to lowercase for comparison
        const queryLower = query.toLowerCase();
        const textLower = text.toLowerCase();
        
        // Word-based similarity
        const queryWords = queryLower.split(/\\W+/).filter(w => w.length > 2);
        const textWords = textLower.split(/\\W+/).filter(w => w.length > 2);
        
        if (queryWords.length === 0 || textWords.length === 0) {
            return 0;
        }
        
        // Calculate word overlap
        const querySet = new Set(queryWords);
        const textSet = new Set(textWords);
        const intersection = new Set([...querySet].filter(word => textSet.has(word)));
        
        // Base similarity from word overlap
        let similarity = intersection.size / Math.max(querySet.size, textSet.size);
        
        // Boost for exact phrase matches
        if (textLower.includes(queryLower)) {
            similarity += 0.3;
        }
        
        // Boost for partial phrase matches
        const queryPhrases = queryLower.split(/[.!?]+/).filter(p => p.trim().length > 0);
        for (const phrase of queryPhrases) {
            if (phrase.trim().length > 3 && textLower.includes(phrase.trim())) {
                similarity += 0.1;
            }
        }
        
        // Normalize similarity to [0, 1]
        return Math.min(similarity, 1.0);
    }
    
    updateUI() {
        const chunkCountEl = document.getElementById('chunk-count');
        const modelInfoEl = document.getElementById('model-info');
        
        if (chunkCountEl && this.stats) {
            chunkCountEl.textContent = `${this.stats.total_chunks} chunks from ${this.stats.total_files} files`;
        }
        
        if (modelInfoEl && this.stats) {
            modelInfoEl.textContent = `Model: ${this.stats.model || 'N/A'}`;
        }
    }
    
    showError(message) {
        const ragStatus = document.getElementById('rag-status');
        if (ragStatus) {
            ragStatus.innerHTML = `<div class="error">${message}</div>`;
        }
    }
    
    getStats() {
        return this.stats;
    }
    
    formatSearchResults(results) {
        if (!results || results.length === 0) {
            return "No relevant content found in the indexed documents.";
        }
        
        let formatted = "**Relevant content found:**\\n\\n";
        
        results.forEach((result, index) => {
            formatted += `**${index + 1}. From ${result.file}** (Relevance: ${(result.score * 100).toFixed(1)}%)\\n`;
            formatted += `${result.content.substring(0, 300)}${result.content.length > 300 ? '...' : ''}\\n\\n`;
        });
        
        return formatted;
    }
}

// Make available globally
window.VectorRAGService = VectorRAGService;'''


def get_config_template() -> str:
    """Configuration file template"""
    return '''{
    "title": "{{title}}",
    "type": "rag_bundle",
    "version": "{{version}}",
    "created_at": "{{timestamp}}",
    "stats": {
        "total_chunks": {{total_chunks}},
        "total_files": {{total_files}},
        "model_used": "{{model}}"
    },
    "rag_config": {
        "enabled": true,
        "index_path": "/data/vector_index.json",
        "default_top_k": 5,
        "default_threshold": 0.3
    }
}'''