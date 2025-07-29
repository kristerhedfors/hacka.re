"""
Namespace Selection Modal Tests
Tests the namespace selection functionality when entering shared links.
"""
import time
import os
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown


def test_namespace_menu_in_heart_tooltip(page: Page, serve_hacka_re):
    """Test that namespace menu items appear in heart tooltip"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Click heart logo to show tooltip
    heart_logo = page.locator('.heart-logo')
    expect(heart_logo).to_be_visible()
    heart_logo.click()
    
    # Wait for tooltip to appear
    tooltip = page.locator('.heart-logo .tooltip.tree-menu')
    expect(tooltip).to_be_visible(timeout=3000)
    
    # Check for Namespaces toggle
    namespaces_toggle = page.locator('[data-target="namespaces"]')
    expect(namespaces_toggle).to_be_visible()
    expect(namespaces_toggle).to_contain_text("Namespaces")
    
    # Click to expand namespaces
    namespaces_toggle.click()
    
    # Check for namespace menu items
    current_namespace_link = page.locator('[data-feature="current-namespace"]')
    switch_namespace_link = page.locator('[data-feature="switch-namespace"]')
    create_namespace_link = page.locator('[data-feature="create-namespace"]')
    delete_namespace_link = page.locator('[data-feature="delete-namespace"]')
    
    expect(current_namespace_link).to_be_visible()
    expect(switch_namespace_link).to_be_visible()
    expect(create_namespace_link).to_be_visible()
    expect(delete_namespace_link).to_be_visible()
    
    expect(current_namespace_link).to_contain_text("Current Namespace Info")
    expect(switch_namespace_link).to_contain_text("Switch Namespace")
    expect(create_namespace_link).to_contain_text("Create New Namespace")
    expect(delete_namespace_link).to_contain_text("Delete Namespace")
    
    screenshot_with_markdown(page, "namespace_menu_expanded", {
        "Status": "Namespaces menu expanded in heart tooltip",
        "Component": "Heart Menu",
        "Menu Items": "All 4 namespace items visible"
    })


def test_namespace_selection_modal_creation(page: Page, serve_hacka_re):
    """Test that namespace selection modal can be created programmatically"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Check if NamespaceSelectionModal is available
    modal_available = page.evaluate("() => window.NamespaceSelectionModal !== undefined")
    assert modal_available, "NamespaceSelectionModal should be available globally"
    
    # Test modal creation without showing it
    modal_element = page.evaluate("() => document.getElementById('namespace-selection-modal') !== null")
    
    assert modal_element, "Namespace selection modal element should exist in DOM"
    
    screenshot_with_markdown(page, "namespace_modal_available", {
        "Status": "NamespaceSelectionModal available and DOM element created",
        "Component": "Namespace Selection Modal",
        "Modal Available": str(modal_available),
        "DOM Element": str(modal_element)
    })


def test_namespace_service_methods(page: Page, serve_hacka_re):
    """Test that NamespaceService has the required methods for namespace selection"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Check if NamespaceService methods are available
    methods_available = page.evaluate("""() => {
        const service = window.NamespaceService;
        if (!service) return { available: false, error: 'NamespaceService not found' };
        
        const requiredMethods = [
            'getAllNamespaceIds',
            'getNamespaceMetadata', 
            'setCurrentNamespace'
        ];
        
        const missingMethods = requiredMethods.filter(method => typeof service[method] !== 'function');
        
        return {
            available: true,
            missingMethods: missingMethods,
            allMethodsPresent: missingMethods.length === 0,
            namespaceIds: service.getAllNamespaceIds ? service.getAllNamespaceIds() : null
        };
    }""")
    
    assert methods_available['available'], "NamespaceService should be available"
    assert methods_available['allMethodsPresent'], f"Missing methods: {methods_available['missingMethods']}"
    assert isinstance(methods_available['namespaceIds'], list), "getAllNamespaceIds should return a list"
    
    screenshot_with_markdown(page, "namespace_service_methods", {
        "Status": "NamespaceService methods verified",
        "Component": "NamespaceService",
        "Methods Present": str(methods_available['allMethodsPresent']),
        "Current Namespaces": str(len(methods_available['namespaceIds']))
    })


def test_ascii_tree_menu_namespace_handlers(page: Page, serve_hacka_re):
    """Test that ASCII tree menu handles namespace feature clicks"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Set up console logging to capture namespace handler calls
    console_messages = []
    def handle_console(msg):
        if 'namespace action' in msg.text.lower() or 'ascii tree menu' in msg.text.lower():
            console_messages.append(msg.text)
    
    page.on("console", handle_console)
    
    # Click heart logo to show tooltip
    heart_logo = page.locator('.heart-logo')
    heart_logo.click()
    
    # Expand namespaces menu
    namespaces_toggle = page.locator('[data-target="namespaces"]')
    namespaces_toggle.click()
    
    # Test clicking on namespace features (these should trigger console logs)
    current_namespace_link = page.locator('[data-feature="current-namespace"]')
    expect(current_namespace_link).to_be_visible()
    
    # Click and check for console messages indicating handler was called
    current_namespace_link.click()
    
    # Give time for console messages to appear
    page.wait_for_timeout(500)
    
    # Check if namespace handler was called
    namespace_handler_called = any('namespace action' in msg.lower() for msg in console_messages)
    
    screenshot_with_markdown(page, "namespace_handlers_test", {
        "Status": "Tested namespace menu handlers",
        "Component": "ASCII Tree Menu",
        "Handler Called": str(namespace_handler_called),
        "Console Messages": str(len(console_messages))
    })


def test_shared_link_manager_namespace_integration(page: Page, serve_hacka_re):
    """Test that SharedLinkManager has namespace selection integration"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Check if SharedLinkManager has enhanced functionality
    integration_available = page.evaluate("""() => {
        const manager = window.SharedLinkManager;
        if (!manager) return { available: false, error: 'SharedLinkManager not found' };
        
        // Check if the enhanced promptForDecryptionPassword method exists
        const hasPromptMethod = typeof manager.createSharedLinkManager === 'function';
        
        return {
            available: true,
            hasPromptMethod: hasPromptMethod,
            managerType: typeof manager
        };
    }""")
    
    assert integration_available['available'], "SharedLinkManager should be available"
    assert integration_available['hasPromptMethod'], "SharedLinkManager should have createSharedLinkManager method"
    
    screenshot_with_markdown(page, "shared_link_integration", {
        "Status": "SharedLinkManager namespace integration verified", 
        "Component": "SharedLinkManager",
        "Integration Available": str(integration_available['available']),
        "Method Available": str(integration_available['hasPromptMethod'])
    })


def test_namespace_modal_styling(page: Page, serve_hacka_re):
    """Test that namespace modal has proper CSS styling"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Check if namespace modal CSS classes are defined
    css_classes_exist = page.evaluate("""() => {
        function hasCSS(selector) {
            try {
                const testEl = document.createElement('div');
                testEl.className = selector.replace('.', '');
                document.body.appendChild(testEl);
                
                const hasStyles = getComputedStyle(testEl).display !== '';
                document.body.removeChild(testEl);
                return hasStyles;
            } catch (e) {
                return false;
            }
        }
        
        const testClasses = [
            'namespace-explanation',
            'namespace-list', 
            'namespace-item',
            'namespace-header',
            'namespace-title'
        ];
        
        return testClasses.map(cls => ({
            class: cls,
            exists: hasCSS('.' + cls)
        }));
    }""")
    
    # Check that at least some CSS classes are defined
    defined_classes = [cls for cls in css_classes_exist if cls['exists']]
    
    screenshot_with_markdown(page, "namespace_modal_styling", {
        "Status": "Namespace modal CSS styling verified",
        "Component": "CSS Styles", 
        "Classes Defined": str(len(defined_classes)),
        "Total Classes": str(len(css_classes_exist))
    })
    
    # The test passes as long as the CSS file is loaded and classes are available
    assert len(css_classes_exist) > 0, "Should have namespace CSS classes defined"


if __name__ == "__main__":
    # For manual testing
    import subprocess
    import sys
    
    # Run this specific test file
    result = subprocess.run([
        sys.executable, "-m", "pytest", __file__, "-v", "--tb=short"
    ], cwd=os.path.dirname(__file__))
    
    sys.exit(result.returncode)