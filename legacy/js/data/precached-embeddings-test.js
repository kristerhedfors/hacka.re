/**
 * Test Pre-cached Embeddings (Simplified)
 * Generated: 2025-09-01T21:01:15.790Z
 * 
 * This is a test file with mock embeddings for development.
 * Uses smaller embeddings (10 dimensions) for testing.
 */

window.precachedEmbeddings = {
  "version": "1.0",
  "generatedAt": "2025-09-01T21:01:15.789Z",
  "model": "text-embedding-3-small",
  "config": {
    "chunkSize": 512,
    "chunkOverlap": 50
  },
  "documents": [
    {
      "documentId": "test",
      "documentName": "Test Document",
      "vectors": [
        {
          "id": "test_chunk_0",
          "embedding": [
            -0.8085145062088954,
            0.8580401927189536,
            -0.6395852906109485,
            -0.32237086697296435,
            -0.22405073437791234,
            0.7360837271886016,
            -0.8543852122732543,
            -0.197805007707621,
            -0.9064327478702849,
            -0.8351281952968188
          ],
          "position": {
            "start": 0,
            "end": 100
          },
          "metadata": {
            "documentId": "test",
            "documentName": "Test Document",
            "chunkIndex": 0,
            "totalChunks": 3,
            "chunkSize": 100
          }
        },
        {
          "id": "test_chunk_1",
          "embedding": [
            -0.6361906077298856,
            0.5002305466199837,
            -0.9179721130882523,
            0.46035705560987417,
            -0.6919275298799565,
            0.3129377863807492,
            -0.5987885629508352,
            -0.4100618801607103,
            0.9053863391545418,
            0.8572457636283
          ],
          "position": {
            "start": 50,
            "end": 150
          },
          "metadata": {
            "documentId": "test",
            "documentName": "Test Document",
            "chunkIndex": 1,
            "totalChunks": 3,
            "chunkSize": 100
          }
        },
        {
          "id": "test_chunk_2",
          "embedding": [
            -0.02437343939956227,
            -0.9911066140328164,
            -0.7713562543278307,
            -0.19840682019348144,
            -0.9655827286428971,
            0.9803952272084797,
            0.6240811860035236,
            -0.6383383005504006,
            0.10186849220730654,
            -0.7205628151855255
          ],
          "position": {
            "start": 100,
            "end": 200
          },
          "metadata": {
            "documentId": "test",
            "documentName": "Test Document",
            "chunkIndex": 2,
            "totalChunks": 3,
            "chunkSize": 100
          }
        }
      ],
      "metadata": {
        "totalChunks": 3,
        "embeddingModel": "text-embedding-3-small",
        "chunkSize": 512,
        "chunkOverlap": 50,
        "generatedAt": "2025-09-01T21:01:15.790Z"
      }
    }
  ]
};

// Initialize function to load pre-cached embeddings into RAG system
window.initializePrecachedEmbeddings = function() {
    // Check if RAG vector store exists
    if (!window.ragVectorStore) {
        console.warn('RAG vector store not initialized yet');
        
        // Create a simple mock if needed for testing
        window.ragVectorStore = {
            vectors: {},
            storeVectors: function(docId, vectors) {
                this.vectors[docId] = vectors;
                console.log(`Stored ${vectors.length} vectors for document ${docId}`);
            },
            getVectors: function(docId) {
                return this.vectors[docId] || [];
            },
            hasVectors: function(docId) {
                return !!this.vectors[docId];
            },
            getDocumentIds: function() {
                return Object.keys(this.vectors);
            }
        };
    }
    
    const embeddings = window.precachedEmbeddings;
    let totalVectors = 0;
    
    for (const docData of embeddings.documents) {
        // Store vectors in memory
        window.ragVectorStore.storeVectors(docData.documentId, docData.vectors);
        totalVectors += docData.vectors.length;
        
        // Update document index metadata if CoreStorageService exists
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
    }
    
    console.log(`Loaded ${totalVectors} pre-cached embeddings for ${embeddings.documents.length} documents`);
    return true;
};

// Auto-initialize when RAG system is ready
if (window.ragVectorStore) {
    window.initializePrecachedEmbeddings();
} else {
    // Wait for RAG system to be ready
    const checkInterval = setInterval(() => {
        if (window.ragVectorStore) {
            clearInterval(checkInterval);
            window.initializePrecachedEmbeddings();
        }
    }, 100);
}
