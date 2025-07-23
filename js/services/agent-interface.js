/**
 * Agent Interface Service
 * Provides abstraction layer for querying agents with isolated configurations
 * Allows sending queries to agents without affecting main application state
 */

window.AgentInterface = (function() {
    
    // Active agent sessions
    const activeSessions = new Map();
    
    /**
     * Create a new agent session with isolated configuration
     * @param {string} agentName - Name of the agent to load
     * @param {Object} options - Session options
     * @param {boolean} options.isolated - Whether to create fully isolated session (default: true)
     * @param {string} options.sessionId - Custom session ID (auto-generated if not provided)
     * @returns {string|null} Session ID or null if failed
     */
    function createAgentSession(agentName, options = {}) {
        try {
            // Load agent configuration
            const agent = AgentService.loadAgent(agentName);
            if (!agent) {
                console.error(`Cannot create session for agent "${agentName}" - agent not found`);
                return null;
            }
            
            // Generate session ID
            const sessionId = options.sessionId || generateSessionId();
            
            // Create session object
            const session = {
                sessionId: sessionId,
                agentName: agentName,
                agentConfig: agent.config,
                agentMetadata: {
                    name: agent.name,
                    description: agent.description,
                    agentType: agent.agentType,
                    createdAt: agent.createdAt
                },
                isolated: options.isolated !== false, // Default to true
                createdAt: new Date().toISOString(),
                lastUsed: new Date().toISOString(),
                queryCount: 0,
                currentState: null // Will store current chat state if needed
            };
            
            // Store session
            activeSessions.set(sessionId, session);
            
            console.log(`Created agent session "${sessionId}" for agent "${agentName}"`);
            return sessionId;
            
        } catch (error) {
            console.error('Error creating agent session:', error);
            return null;
        }
    }
    
    /**
     * Query an agent in an isolated session
     * @param {string} sessionId - Session ID
     * @param {string} message - Message to send to the agent
     * @param {Object} options - Query options
     * @param {boolean} options.streamResponse - Whether to stream the response
     * @param {Function} options.onResponse - Callback for response chunks (if streaming)
     * @param {Function} options.onComplete - Callback when query is complete
     * @param {Function} options.onError - Callback for errors
     * @returns {Promise} Promise that resolves with the response
     */
    async function queryAgent(sessionId, message, options = {}) {
        try {
            // Get session
            const session = activeSessions.get(sessionId);
            if (!session) {
                throw new Error(`Session "${sessionId}" not found`);
            }
            
            // Update session usage
            session.lastUsed = new Date().toISOString();
            session.queryCount++;
            
            // If isolated, we need to temporarily apply the agent configuration
            let originalConfig = null;
            if (session.isolated) {
                // Store current application state
                originalConfig = ConfigurationService.collectCurrentConfiguration();
                
                // Apply agent configuration
                ConfigurationService.applyConfiguration(session.agentConfig);
            }
            
            try {
                // Prepare the query
                const queryOptions = {
                    message: message,
                    stream: options.streamResponse || false,
                    onResponse: options.onResponse,
                    onComplete: options.onComplete,
                    onError: options.onError
                };
                
                // Execute the query using the current API service
                const response = await executeAgentQuery(queryOptions);
                
                console.log(`Agent query completed for session "${sessionId}"`);
                return response;
                
            } finally {
                // Restore original configuration if isolated
                if (session.isolated && originalConfig) {
                    ConfigurationService.applyConfiguration(originalConfig);
                }
            }
            
        } catch (error) {
            console.error('Error querying agent:', error);
            if (options.onError) {
                options.onError(error);
            }
            throw error;
        }
    }
    
    /**
     * Execute the actual agent query using API service
     * @private
     * @param {Object} options - Query options
     * @returns {Promise} Promise that resolves with response
     */
    async function executeAgentQuery(options) {
        return new Promise((resolve, reject) => {
            try {
                // Check if API service is available
                if (!window.ApiService || typeof window.ApiService.sendMessage !== 'function') {
                    throw new Error('API service not available');
                }
                
                // Prepare message for API
                const messages = [
                    {
                        role: 'user',
                        content: options.message
                    }
                ];
                
                // Build API request
                const apiOptions = {
                    messages: messages,
                    stream: options.stream,
                    onSuccess: (response) => {
                        if (options.onComplete) {
                            options.onComplete(response);
                        }
                        resolve(response);
                    },
                    onError: (error) => {
                        if (options.onError) {
                            options.onError(error);
                        }
                        reject(error);
                    },
                    onChunk: options.onResponse // For streaming responses
                };
                
                // Send message via API service
                window.ApiService.sendMessage(apiOptions);
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    /**
     * Get information about an active session
     * @param {string} sessionId - Session ID
     * @returns {Object|null} Session information or null if not found
     */
    function getSessionInfo(sessionId) {
        const session = activeSessions.get(sessionId);
        if (!session) {
            return null;
        }
        
        // Return safe copy without full config
        return {
            sessionId: session.sessionId,
            agentName: session.agentName,
            agentMetadata: session.agentMetadata,
            isolated: session.isolated,
            createdAt: session.createdAt,
            lastUsed: session.lastUsed,
            queryCount: session.queryCount,
            hasLLMConfig: !!(session.agentConfig && session.agentConfig.llm),
            hasPrompts: !!(session.agentConfig && session.agentConfig.prompts),
            hasFunctions: !!(session.agentConfig && session.agentConfig.functions),
            hasMCP: !!(session.agentConfig && session.agentConfig.mcp)
        };
    }
    
    /**
     * List all active sessions
     * @returns {Array} Array of session information objects
     */
    function listActiveSessions() {
        const sessions = [];
        for (const [sessionId, session] of activeSessions) {
            sessions.push(getSessionInfo(sessionId));
        }
        return sessions;
    }
    
    /**
     * Close an agent session
     * @param {string} sessionId - Session ID to close
     * @returns {boolean} True if successful
     */
    function closeAgentSession(sessionId) {
        try {
            const session = activeSessions.get(sessionId);
            if (!session) {
                console.warn(`Session "${sessionId}" not found for closing`);
                return false;
            }
            
            // Remove from active sessions
            activeSessions.delete(sessionId);
            
            console.log(`Closed agent session "${sessionId}"`);
            return true;
            
        } catch (error) {
            console.error('Error closing agent session:', error);
            return false;
        }
    }
    
    /**
     * Close all active sessions
     * @returns {number} Number of sessions closed
     */
    function closeAllSessions() {
        try {
            const count = activeSessions.size;
            activeSessions.clear();
            console.log(`Closed ${count} agent sessions`);
            return count;
        } catch (error) {
            console.error('Error closing all sessions:', error);
            return 0;
        }
    }
    
    /**
     * Quick query - create session, query, and close in one call
     * @param {string} agentName - Name of the agent
     * @param {string} message - Message to send
     * @param {Object} options - Query options
     * @returns {Promise} Promise that resolves with the response
     */
    async function quickQuery(agentName, message, options = {}) {
        try {
            // Create temporary session
            const sessionId = createAgentSession(agentName, { isolated: true });
            if (!sessionId) {
                throw new Error(`Failed to create session for agent "${agentName}"`);
            }
            
            try {
                // Execute query
                const response = await queryAgent(sessionId, message, options);
                return response;
            } finally {
                // Always close the session
                closeAgentSession(sessionId);
            }
            
        } catch (error) {
            console.error('Error in quick query:', error);
            throw error;
        }
    }
    
    /**
     * Apply agent configuration to current application (non-isolated)
     * @param {string} agentName - Name of the agent
     * @returns {boolean} True if successful
     */
    function applyAgentToApplication(agentName) {
        try {
            return AgentService.applyAgent(agentName);
        } catch (error) {
            console.error('Error applying agent to application:', error);
            return false;
        }
    }
    
    /**
     * Generate a unique session ID
     * @private
     * @returns {string} Session ID
     */
    function generateSessionId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `agent_${timestamp}_${random}`;
    }
    
    /**
     * Clean up old inactive sessions (older than specified time)
     * @param {number} maxAgeMinutes - Maximum age in minutes (default: 60)
     * @returns {number} Number of sessions cleaned up
     */
    function cleanupInactiveSessions(maxAgeMinutes = 60) {
        try {
            const cutoffTime = new Date(Date.now() - (maxAgeMinutes * 60 * 1000));
            let cleanupCount = 0;
            
            for (const [sessionId, session] of activeSessions) {
                const lastUsed = new Date(session.lastUsed);
                if (lastUsed < cutoffTime) {
                    activeSessions.delete(sessionId);
                    cleanupCount++;
                }
            }
            
            if (cleanupCount > 0) {
                console.log(`Cleaned up ${cleanupCount} inactive agent sessions`);
            }
            
            return cleanupCount;
        } catch (error) {
            console.error('Error cleaning up inactive sessions:', error);
            return 0;
        }
    }
    
    /**
     * Get session statistics
     * @returns {Object} Statistics about active sessions
     */
    function getSessionStatistics() {
        try {
            const stats = {
                totalSessions: activeSessions.size,
                agentTypes: {},
                queryStats: {
                    totalQueries: 0,
                    averageQueries: 0
                },
                oldestSession: null,
                newestSession: null
            };
            
            if (activeSessions.size === 0) {
                return stats;
            }
            
            let totalQueries = 0;
            let oldestTime = null;
            let newestTime = null;
            
            for (const [sessionId, session] of activeSessions) {
                // Count agent types
                const agentType = session.agentMetadata.agentType || 'general';
                stats.agentTypes[agentType] = (stats.agentTypes[agentType] || 0) + 1;
                
                // Sum queries
                totalQueries += session.queryCount;
                
                // Track oldest and newest
                const createdTime = new Date(session.createdAt);
                if (!oldestTime || createdTime < oldestTime) {
                    oldestTime = createdTime;
                    stats.oldestSession = sessionId;
                }
                if (!newestTime || createdTime > newestTime) {
                    newestTime = createdTime;
                    stats.newestSession = sessionId;
                }
            }
            
            stats.queryStats.totalQueries = totalQueries;
            stats.queryStats.averageQueries = Math.round(totalQueries / activeSessions.size * 100) / 100;
            
            return stats;
        } catch (error) {
            console.error('Error getting session statistics:', error);
            return {
                totalSessions: 0,
                agentTypes: {},
                queryStats: { totalQueries: 0, averageQueries: 0 }
            };
        }
    }
    
    // Public API
    return {
        createAgentSession: createAgentSession,
        queryAgent: queryAgent,
        getSessionInfo: getSessionInfo,
        listActiveSessions: listActiveSessions,
        closeAgentSession: closeAgentSession,
        closeAllSessions: closeAllSessions,
        quickQuery: quickQuery,
        applyAgentToApplication: applyAgentToApplication,
        cleanupInactiveSessions: cleanupInactiveSessions,
        getSessionStatistics: getSessionStatistics
    };
})();