/**
 * RAG Regulations Service
 * Manages EU regulation documents for RAG integration
 * Integrates with existing RAG system in hacka.re
 * No ES6 modules to avoid CORS issues with file:// protocol
 */

window.RagRegulationsService = class RagRegulationsService {
    constructor() {
        this.regulations = new Map();
        this.initialized = false;
        this.loadingPromises = new Map();
    }

    /**
     * Initialize the regulations service
     */
    async initialize() {
        if (this.initialized) {
            return true;
        }

        try {
            // Load all available regulation modules
            await this.loadAllRegulations();
            this.initialized = true;
            console.log('✓ RAG Regulations Service initialized');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize RAG Regulations Service:', error);
            return false;
        }
    }

    /**
     * Load all regulation data from global variables set by regulation scripts
     */
    async loadAllRegulations() {
        // Wait a bit for regulation scripts to load
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const regulationConfigs = [
            {
                id: 'ai_act',
                globalVar: 'euRegulationAiActData',
                name: 'EU AI Act'
            },
            {
                id: 'dora',
                globalVar: 'euRegulationDoraData',
                name: 'DORA - Digital Operational Resilience Act'
            },
            {
                id: 'cra',
                globalVar: 'euRegulationCraData',
                name: 'Cyber Resilience Act'
            }
        ];

        regulationConfigs.forEach((regInfo) => {
            try {
                const regulationData = window[regInfo.globalVar];
                
                if (regulationData) {
                    this.regulations.set(regInfo.id, {
                        ...regulationData,
                        loaded: true,
                        loadedAt: new Date().toISOString()
                    });
                    console.log(`✓ Loaded regulation: ${regInfo.name}`);
                } else {
                    console.warn(`⚠️ Global variable ${regInfo.globalVar} not found for: ${regInfo.name}`);
                }
            } catch (error) {
                console.error(`❌ Failed to load regulation ${regInfo.name}:`, error);
            }
        });
    }

    /**
     * Get all available regulations metadata
     */
    getAvailableRegulations() {
        const regulations = [];
        for (const [id, data] of this.regulations) {
            regulations.push({
                id,
                name: data.name,
                title: data.metadata?.title || data.name,
                regulationNumber: data.metadata?.regulationNumber,
                officialDate: data.metadata?.officialDate,
                contentLength: data.content?.length || 0,
                loaded: data.loaded || false,
                loadedAt: data.loadedAt
            });
        }
        return regulations;
    }

    /**
     * Get regulation content by ID
     */
    getRegulationContent(regulationId) {
        const regulation = this.regulations.get(regulationId);
        return regulation?.content || null;
    }

    /**
     * Get regulation metadata by ID
     */
    getRegulationMetadata(regulationId) {
        const regulation = this.regulations.get(regulationId);
        return regulation?.metadata || null;
    }

    /**
     * Search regulations by content
     */
    searchRegulations(query, options = {}) {
        const {
            maxResults = 10,
            minMatchLength = 50,
            caseSensitive = false
        } = options;

        const results = [];
        const searchQuery = caseSensitive ? query : query.toLowerCase();

        for (const [id, regulation] of this.regulations) {
            if (!regulation.content) continue;

            const content = caseSensitive ? regulation.content : regulation.content.toLowerCase();
            const matches = [];

            // Simple text search - can be enhanced with better algorithms
            let index = content.indexOf(searchQuery);
            while (index !== -1 && matches.length < maxResults) {
                const start = Math.max(0, index - minMatchLength);
                const end = Math.min(content.length, index + searchQuery.length + minMatchLength);
                const context = regulation.content.substring(start, end);

                matches.push({
                    index,
                    context: context.trim(),
                    highlight: query
                });

                index = content.indexOf(searchQuery, index + 1);
            }

            if (matches.length > 0) {
                results.push({
                    regulationId: id,
                    regulationName: regulation.name,
                    metadata: regulation.metadata,
                    matches
                });
            }
        }

        return results.slice(0, maxResults);
    }

    /**
     * Get regulation chunks for RAG processing
     */
    getRegulationChunks(regulationId, chunkSize = 1000, overlap = 200) {
        const regulation = this.regulations.get(regulationId);
        if (!regulation?.content) {
            return [];
        }

        const chunks = [];
        const content = regulation.content;
        let start = 0;

        while (start < content.length) {
            const end = Math.min(start + chunkSize, content.length);
            const chunk = content.substring(start, end);

            chunks.push({
                regulationId,
                regulationName: regulation.name,
                chunkIndex: chunks.length,
                content: chunk,
                start,
                end,
                metadata: regulation.metadata
            });

            start = end - overlap;
        }

        return chunks;
    }

    /**
     * Get all regulation chunks for RAG indexing
     */
    getAllRegulationChunks(chunkSize = 1000, overlap = 200) {
        const allChunks = [];

        for (const [id, regulation] of this.regulations) {
            const chunks = this.getRegulationChunks(id, chunkSize, overlap);
            allChunks.push(...chunks);
        }

        return allChunks;
    }

    /**
     * Format regulation data for RAG modal display
     */
    formatForRagModal() {
        const regulations = this.getAvailableRegulations();
        
        return {
            category: 'EU Regulations',
            items: regulations.map(reg => ({
                id: `regulation_${reg.id}`,
                name: reg.name,
                description: `${reg.regulationNumber} - Official Date: ${reg.officialDate}`,
                content: this.getRegulationContent(reg.id),
                metadata: this.getRegulationMetadata(reg.id),
                type: 'regulation',
                size: reg.contentLength,
                enabled: true
            }))
        };
    }

    /**
     * Integration with existing RAG system
     */
    async integrateWithRagManager() {
        // Check if RAG manager exists
        if (typeof window !== 'undefined' && window.ragManager) {
            try {
                const formattedData = this.formatForRagModal();
                
                // Add regulations as a new data source category
                if (window.ragManager.addDataCategory) {
                    await window.ragManager.addDataCategory(formattedData);
                    console.log('✓ Integrated regulations with RAG manager');
                } else {
                    console.warn('⚠️ RAG manager does not support addDataCategory method');
                }
            } catch (error) {
                console.error('❌ Failed to integrate with RAG manager:', error);
            }
        } else {
            console.warn('⚠️ RAG manager not found - will retry later');
        }
    }

    /**
     * Check if service is ready
     */
    isReady() {
        return this.initialized && this.regulations.size > 0;
    }

    /**
     * Get service statistics
     */
    getStatistics() {
        let totalContent = 0;
        let loadedCount = 0;

        for (const [id, regulation] of this.regulations) {
            if (regulation.loaded) {
                loadedCount++;
                totalContent += regulation.content?.length || 0;
            }
        }

        return {
            totalRegulations: this.regulations.size,
            loadedRegulations: loadedCount,
            totalContentLength: totalContent,
            averageContentLength: loadedCount > 0 ? Math.round(totalContent / loadedCount) : 0,
            initialized: this.initialized
        };
    }
}

// Create singleton instance and make it globally available
window.ragRegulationsService = new window.RagRegulationsService();

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.ragRegulationsService.initialize().then(() => {
                // Try to integrate with RAG manager after a short delay
                setTimeout(() => window.ragRegulationsService.integrateWithRagManager(), 1000);
            });
        });
    } else {
        window.ragRegulationsService.initialize().then(() => {
            setTimeout(() => window.ragRegulationsService.integrateWithRagManager(), 1000);
        });
    }
}