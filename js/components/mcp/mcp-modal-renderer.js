/**
 * MCP Modal Renderer
 * Handles DOM rendering and expand/collapse functionality for the MCP modal interface
 * Based on the PromptsModalRenderer pattern
 */

window.MCPModalRenderer = (function() {
    
    /**
     * Initialize expand/collapse functionality for MCP modal
     */
    function initializeExpandCollapse() {
        // Setup expand/collapse for Advanced section
        const advancedHeader = document.querySelector('.mcp-advanced-header');
        const advancedList = document.querySelector('.mcp-advanced-list');
        
        if (advancedHeader && advancedList) {
            advancedHeader.addEventListener('click', () => {
                toggleSection(advancedHeader, advancedList);
            });
        }
        
        // Setup expand/collapse for Connected Servers section  
        const serversHeader = document.querySelector('.mcp-servers-header');
        const serversList = document.querySelector('.mcp-servers-list');
        
        if (serversHeader && serversList) {
            serversHeader.addEventListener('click', () => {
                toggleSection(serversHeader, serversList);
            });
        }
    }
    
    /**
     * Toggle expand/collapse state for a section
     * @param {HTMLElement} header - Section header element
     * @param {HTMLElement} list - Section content element
     */
    function toggleSection(header, list) {
        const icon = header.querySelector('i');
        const isExpanded = list.style.display !== 'none';
        
        if (isExpanded) {
            // Collapse
            list.style.display = 'none';
            if (icon) {
                icon.classList.remove('fa-chevron-down');
                icon.classList.add('fa-chevron-right');
            }
        } else {
            // Expand
            list.style.display = 'block';
            if (icon) {
                icon.classList.remove('fa-chevron-right'); 
                icon.classList.add('fa-chevron-down');
            }
        }
    }
    
    /**
     * Update the server count in the Connected MCP Servers header
     * @param {number} count - Number of connected servers
     */
    function updateServerCount(count) {
        const countElement = document.getElementById('mcp-servers-count');
        if (countElement) {
            countElement.textContent = count.toString();
        }
    }
    
    /**
     * Expand a specific section (Advanced or Servers)
     * @param {string} sectionName - 'advanced' or 'servers'
     */
    function expandSection(sectionName) {
        let header, list;
        
        if (sectionName === 'advanced') {
            header = document.querySelector('.mcp-advanced-header');
            list = document.querySelector('.mcp-advanced-list');
        } else if (sectionName === 'servers') {
            header = document.querySelector('.mcp-servers-header');
            list = document.querySelector('.mcp-servers-list');
        }
        
        if (header && list && list.style.display === 'none') {
            toggleSection(header, list);
        }
    }
    
    /**
     * Collapse a specific section (Advanced or Servers)
     * @param {string} sectionName - 'advanced' or 'servers'
     */
    function collapseSection(sectionName) {
        let header, list;
        
        if (sectionName === 'advanced') {
            header = document.querySelector('.mcp-advanced-header');
            list = document.querySelector('.mcp-advanced-list');
        } else if (sectionName === 'servers') {
            header = document.querySelector('.mcp-servers-header');
            list = document.querySelector('.mcp-servers-list');
        }
        
        if (header && list && list.style.display !== 'none') {
            toggleSection(header, list);
        }
    }
    
    /**
     * Check if a section is expanded
     * @param {string} sectionName - 'advanced' or 'servers'
     * @returns {boolean} True if section is expanded
     */
    function isSectionExpanded(sectionName) {
        let list;
        
        if (sectionName === 'advanced') {
            list = document.querySelector('.mcp-advanced-list');
        } else if (sectionName === 'servers') {
            list = document.querySelector('.mcp-servers-list');
        }
        
        return list ? list.style.display !== 'none' : false;
    }
    
    /**
     * Auto-expand sections based on content or user interaction
     * - Auto-expand Advanced section for new users
     * - Auto-expand Servers section when servers are connected
     * @param {Object} options - Options for auto-expansion
     */
    function autoExpandSections(options = {}) {
        const { hasServers = false, forceAdvanced = false } = options;
        
        // Auto-expand Advanced section for setup
        if (forceAdvanced) {
            expandSection('advanced');
        }
        
        // Auto-expand Servers section when there are connected servers
        if (hasServers) {
            expandSection('servers');
        }
    }
    
    // Public API
    return {
        initializeExpandCollapse,
        toggleSection,
        updateServerCount,
        expandSection,
        collapseSection, 
        isSectionExpanded,
        autoExpandSections
    };
})();