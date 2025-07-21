/**
 * Demo/Test file for the refactored share system
 * This demonstrates how the new registry-based system works alongside existing code
 */

import { SHARE_CONFIG } from '../config/share-config.js';
import { getShareItemRegistry } from '../services/share-item-registry.js';
import { getSharePluginManager } from '../plugins/share-plugin-manager.js';
import { ShareServiceV2 } from '../services/share-service-v2.js';
import { ShareUIManagerV2 } from '../components/ui/share-ui-manager-v2.js';
import { initializeShareItemsRegistry } from '../config/share-items-registry.js';

/**
 * Demo class to showcase the new share system
 */
export class ShareRefactorDemo {
    constructor() {
        this.registry = null;
        this.pluginManager = null;
        this.shareService = null;
        this.uiManager = null;
        this.initialized = false;
    }

    /**
     * Initialize the demo
     */
    async initialize() {
        console.log('🚀 Initializing Share Refactor Demo...');
        
        try {
            // Initialize the registry with existing items
            initializeShareItemsRegistry();
            this.registry = getShareItemRegistry();
            
            // Initialize plugin manager
            this.pluginManager = getSharePluginManager();
            
            // Initialize ShareServiceV2
            this.shareService = new ShareServiceV2();
            
            // Initialize UI Manager (requires DOM elements)
            const elements = this.getDOMElements();
            this.uiManager = new ShareUIManagerV2(elements);
            
            // Register a demo plugin
            await this.registerDemoPlugin();
            
            // Setup demo event listeners
            this.setupDemoEventListeners();
            
            this.initialized = true;
            console.log('✅ Share Refactor Demo initialized successfully');
            
            // Log system status
            this.logSystemStatus();
            
        } catch (error) {
            console.error('❌ Failed to initialize Share Refactor Demo:', error);
        }
    }

    /**
     * Get DOM elements (mock for demo purposes)
     */
    getDOMElements() {
        return {
            shareForm: document.getElementById('share-form'),
            sharePassword: document.getElementById('share-password'),
            shareWelcomeMessageCheckbox: document.getElementById('share-welcome-message-checkbox'),
            shareWelcomeMessageInput: document.getElementById('share-welcome-message'),
            lockSessionKeyCheckbox: document.getElementById('lock-session-key'),
            passwordInputContainer: document.querySelector('.password-input-container'),
            togglePasswordVisibilityBtn: document.getElementById('toggle-password-visibility'),
            messageHistoryCount: document.getElementById('message-history-count'),
            messageHistoryContainer: document.querySelector('.message-history-container'),
            linkLengthText: document.getElementById('link-length-text'),
            linkLengthFill: document.getElementById('link-length-fill'),
            linkLengthWarning: document.getElementById('link-length-warning'),
            shareQrCodeContainer: document.getElementById('share-qr-code-container'),
            qrCodeWarning: document.getElementById('qr-code-warning'),
            generatedLinkContainer: document.getElementById('generated-link-container')
        };
    }

    /**
     * Register a demo plugin to show how easy it is with the new system
     */
    async registerDemoPlugin() {
        console.log('📝 Registering demo plugin...');
        
        // Example: A simple settings plugin
        const settingsPlugin = this.pluginManager.createSimplePlugin({
            id: 'user-settings',
            label: 'Include User Settings',
            priority: 65,
            sensitive: false,
            getData: async () => {
                // Mock user settings data
                return {
                    theme: 'dark',
                    language: 'en',
                    notifications: true,
                    autoSave: false
                };
            },
            setData: async (data) => {
                // Mock applying user settings
                console.log('Applying user settings:', data);
                if (data.theme) localStorage.setItem('theme', data.theme);
                if (data.language) localStorage.setItem('language', data.language);
                // ... apply other settings
            }
        });
        
        const success = this.pluginManager.registerPlugin(settingsPlugin);
        if (success) {
            console.log('✅ Demo plugin registered successfully');
        } else {
            console.warn('⚠️ Failed to register demo plugin');
        }
    }

    /**
     * Setup demo event listeners
     */
    setupDemoEventListeners() {
        // Add a demo button to the page
        this.createDemoUI();
        
        // Listen for registry changes
        console.log('📡 Setting up demo event listeners...');
    }

    /**
     * Create demo UI elements
     */
    createDemoUI() {
        // Check if demo UI already exists
        if (document.getElementById('share-demo-container')) {
            return;
        }
        
        const demoContainer = document.createElement('div');
        demoContainer.id = 'share-demo-container';
        demoContainer.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #1a1a1a;
            color: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            font-family: monospace;
            font-size: 12px;
            max-width: 300px;
            z-index: 10000;
        `;
        
        demoContainer.innerHTML = `
            <h4 style="margin: 0 0 10px 0; color: #4CAF50;">Share System Demo</h4>
            <button id="demo-test-registry" style="margin: 2px; padding: 5px 8px; font-size: 11px;">Test Registry</button>
            <button id="demo-test-plugins" style="margin: 2px; padding: 5px 8px; font-size: 11px;">Test Plugins</button>
            <button id="demo-create-link" style="margin: 2px; padding: 5px 8px; font-size: 11px;">Create Link</button>
            <button id="demo-estimate-size" style="margin: 2px; padding: 5px 8px; font-size: 11px;">Estimate Size</button>
            <div id="demo-output" style="margin-top: 10px; padding: 8px; background: #2a2a2a; border-radius: 4px; max-height: 100px; overflow-y: auto; font-size: 10px;"></div>
        `;
        
        document.body.appendChild(demoContainer);
        
        // Add event listeners to demo buttons
        document.getElementById('demo-test-registry').addEventListener('click', () => this.testRegistry());
        document.getElementById('demo-test-plugins').addEventListener('click', () => this.testPlugins());
        document.getElementById('demo-create-link').addEventListener('click', () => this.testCreateLink());
        document.getElementById('demo-estimate-size').addEventListener('click', () => this.testEstimateSize());
    }

    /**
     * Test registry functionality
     */
    testRegistry() {
        console.log('🧪 Testing registry...');
        const output = document.getElementById('demo-output');
        
        const stats = this.registry.getStats();
        const selected = this.registry.getSelected();
        
        const result = `
Registry Stats:
- Total: ${stats.total}
- Enabled: ${stats.enabled}
- Sensitive: ${stats.sensitive}
- Default Checked: ${stats.defaultChecked}

Selected Items: ${selected.length}
${selected.map(([id, config]) => `- ${id}: ${config.label}`).join('\n')}
        `;
        
        output.textContent = result;
        console.log('Registry test completed');
    }

    /**
     * Test plugin functionality
     */
    testPlugins() {
        console.log('🔌 Testing plugins...');
        const output = document.getElementById('demo-output');
        
        const plugins = this.pluginManager.getPlugins();
        const stats = this.pluginManager.getStats();
        
        const result = `
Plugin Stats:
- Total: ${stats.total}
- With Auto UI: ${stats.withAutoUI}
- With Initializer: ${stats.withInitializer}
- Sensitive: ${stats.sensitive}

Registered Plugins:
${plugins.map(p => `- ${p.id} v${p.version}: ${p.name}`).join('\n')}
        `;
        
        output.textContent = result;
        console.log('Plugin test completed');
    }

    /**
     * Test creating a share link
     */
    async testCreateLink() {
        console.log('🔗 Testing link creation...');
        const output = document.getElementById('demo-output');
        
        try {
            const password = this.shareService.generateStrongPassword();
            const mockOptions = { title: 'Demo Link', subtitle: 'Testing V2' };
            
            // Note: This will fail in demo because we don't have real data,
            // but it shows the API
            const link = await this.shareService.createShareLink(password, mockOptions);
            
            const result = `
Link Created Successfully!
Password: ${password}
Length: ${link.length} bytes
URL: ${link.substring(0, 100)}...
            `;
            
            output.textContent = result;
            
        } catch (error) {
            output.textContent = `Error: ${error.message}`;
            console.warn('Link creation failed (expected in demo):', error);
        }
    }

    /**
     * Test size estimation
     */
    async testEstimateSize() {
        console.log('📏 Testing size estimation...');
        const output = document.getElementById('demo-output');
        
        try {
            const totalSize = await this.shareService.estimateTotalSize();
            const summary = this.shareService.getShareSummary();
            
            const result = `
Size Estimation:
- Total Estimated: ${totalSize} bytes
- Selected Items: ${summary.selectedItems}
- Sensitive Items: ${summary.sensitiveItems}
- Percentage of Max: ${Math.round((totalSize / SHARE_CONFIG.MAX_LINK_LENGTH) * 100)}%

Selected IDs:
${summary.selectedIds.join(', ') || 'None'}
            `;
            
            output.textContent = result;
            
        } catch (error) {
            output.textContent = `Error: ${error.message}`;
            console.error('Size estimation failed:', error);
        }
    }

    /**
     * Log system status
     */
    logSystemStatus() {
        console.log('📊 Share System Status:');
        console.log('Registry:', this.registry.getStats());
        console.log('Plugins:', this.pluginManager.getStats());
        console.log('Service initialized:', !!this.shareService);
        console.log('UI Manager initialized:', !!this.uiManager);
        
        // Show comparison with old system
        console.log('\n🔄 Comparison with existing system:');
        console.log('- Old system: Manual registration in multiple files');
        console.log('- New system: Single registration call per item');
        console.log('- Old system: Scattered size calculation logic');
        console.log('- New system: Centralized via registry');
        console.log('- Old system: Direct DOM manipulation');
        console.log('- New system: Component-based with validation');
    }

    /**
     * Demonstrate adding a new share item (the easy way)
     */
    async demonstrateAddingNewItem() {
        console.log('➕ Demonstrating how to add a new share item...');
        
        // Example: Adding a custom data item
        const customPlugin = this.pluginManager.createSimplePlugin({
            id: 'custom-data',
            label: 'Include Custom Data',
            priority: 80,
            sensitive: false,
            getData: async () => {
                return {
                    timestamp: Date.now(),
                    browserInfo: navigator.userAgent,
                    screenSize: `${screen.width}x${screen.height}`
                };
            },
            setData: async (data) => {
                console.log('Received custom data:', data);
                // Apply the data as needed
            }
        });
        
        // Register the plugin (creates UI automatically)
        const success = this.pluginManager.registerPlugin(customPlugin);
        
        if (success) {
            console.log('✅ New share item added successfully!');
            console.log('- Checkbox automatically created');
            console.log('- Size calculation automatically included');
            console.log('- Data collection/application configured');
            console.log('- No changes needed in other files');
        }
        
        return success;
    }

    /**
     * Demonstrate the migration path
     */
    showMigrationPath() {
        console.log('🛤️ Migration Path:');
        console.log('Phase 1: ✅ New system created alongside existing');
        console.log('Phase 2: 🔄 Migrate existing items to registry');
        console.log('Phase 3: 🔄 Update UI components to use registry');
        console.log('Phase 4: ⏳ Remove old code after testing');
        console.log('Phase 5: ⏳ Document new plugin system');
        
        console.log('\n📈 Benefits achieved:');
        console.log('- Single registration point for new items');
        console.log('- Consistent interface across all share items');
        console.log('- Better testability and maintainability');
        console.log('- Plugin system for extensibility');
        console.log('- Reduced coupling between components');
    }
}

// Auto-initialize if in demo mode
if (window.location.search.includes('demo=share') || 
    window.location.hash.includes('demo=share')) {
    
    document.addEventListener('DOMContentLoaded', async () => {
        const demo = new ShareRefactorDemo();
        await demo.initialize();
        
        // Show migration path info
        setTimeout(() => {
            demo.showMigrationPath();
        }, 2000);
        
        // Make demo available globally for console testing
        window.shareDemo = demo;
        
        console.log('\n🎮 Demo ready! Try these in console:');
        console.log('shareDemo.testRegistry()');
        console.log('shareDemo.testPlugins()');
        console.log('shareDemo.demonstrateAddingNewItem()');
    });
}

export { ShareRefactorDemo };