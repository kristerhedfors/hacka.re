import pytest
import json
import tempfile
import os
from playwright.sync_api import Page, expect

from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown

def test_rag_user_bundles_ui_elements(page: Page, serve_hacka_re):
    """Test the user bundles UI elements and basic functionality."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Open the RAG modal
    rag_button = page.locator("#rag-btn")
    rag_button.click()
    
    # Wait for modal to become visible
    page.wait_for_selector("#rag-modal", state="visible", timeout=3000)
    
    # Check user bundles section elements
    user_bundles_section = page.locator("#rag-user-bundles-section")
    expect(user_bundles_section).to_be_visible()
    
    # Check section title and description
    section_title = user_bundles_section.locator("h3")
    expect(section_title).to_have_text("User Knowledge Bundles")
    
    description = user_bundles_section.locator("p")
    expect(description).to_contain_text("hackare tool")
    
    # Check load bundle button
    load_bundle_btn = page.locator("#load-user-bundle-btn")
    expect(load_bundle_btn).to_be_visible()
    expect(load_bundle_btn).to_be_enabled()
    
    # Check bundles container
    bundles_container = page.locator("#user-bundles-container")
    expect(bundles_container).to_be_visible()
    
    # Take screenshot of user bundles UI
    screenshot_with_markdown(page, "rag_user_bundles_ui", {
        "Status": "User bundles UI elements visible",
        "Load Button": "Enabled and ready",
        "Container": "Empty and ready for bundles",
        "Description": "References hackare tool"
    })

def test_rag_bundle_validation_algorithm(page: Page, serve_hacka_re):
    """Test the bundle validation algorithm with various inputs."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Test bundle validation through browser console
    validation_test_result = page.evaluate("""() => {
        const results = {};
        
        // Test valid bundle
        const validBundle = {
            chunks: [
                {
                    content: "Test content",
                    embedding: [0.1, 0.2, 0.3],
                    metadata: { source: "test.txt" }
                }
            ],
            files: ["test.txt"],
            metadata: { model: "text-embedding-3-small" }
        };
        
        const validResult = window.RAGUserBundles.validateBundle(validBundle);
        results.validBundle = validResult.isValid;
        results.validBundleErrors = validResult.errors;
        
        // Test invalid bundle - missing chunks
        const invalidBundle1 = {
            files: ["test.txt"],
            metadata: { model: "test" }
        };
        
        const invalidResult1 = window.RAGUserBundles.validateBundle(invalidBundle1);
        results.missingChunks = !invalidResult1.isValid;
        results.missingChunksErrors = invalidResult1.errors;
        
        // Test invalid bundle - missing files
        const invalidBundle2 = {
            chunks: [{ content: "test", embedding: [0.1], metadata: {} }],
            metadata: { model: "test" }
        };
        
        const invalidResult2 = window.RAGUserBundles.validateBundle(invalidBundle2);
        results.missingFiles = !invalidResult2.isValid;
        
        // Test invalid bundle - bad chunk structure
        const invalidBundle3 = {
            chunks: [{ content: "test" }], // Missing embedding and metadata
            files: ["test.txt"],
            metadata: { model: "test" }
        };
        
        const invalidResult3 = window.RAGUserBundles.validateBundle(invalidBundle3);
        results.badChunkStructure = !invalidResult3.isValid;
        
        return results;
    }""")
    
    # Verify validation results
    assert validation_test_result['validBundle'], "Valid bundle should pass validation"
    assert len(validation_test_result['validBundleErrors']) == 0, "Valid bundle should have no errors"
    assert validation_test_result['missingChunks'], "Bundle missing chunks should fail validation"
    assert validation_test_result['missingFiles'], "Bundle missing files should fail validation"
    assert validation_test_result['badChunkStructure'], "Bundle with bad chunk structure should fail validation"
    
    print(f"Bundle validation test results:")
    print(f"  Valid bundle passed: {validation_test_result['validBundle']}")
    print(f"  Missing chunks detected: {validation_test_result['missingChunks']}")
    print(f"  Missing files detected: {validation_test_result['missingFiles']}")
    print(f"  Bad chunk structure detected: {validation_test_result['badChunkStructure']}")
    
    # Take screenshot of validation test
    screenshot_with_markdown(page, "rag_bundle_validation", {
        "Status": "Bundle validation algorithm tested",
        "Valid Bundle": str(validation_test_result['validBundle']),
        "Error Detection": "Working correctly",
        "Validation": "Comprehensive checks performed"
    })

def test_rag_bundle_storage_operations(page: Page, serve_hacka_re):
    """Test bundle storage and retrieval operations."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Clear any existing bundles
    page.evaluate("localStorage.removeItem('rag_user_bundles_index')")
    
    # Test storage operations through browser console
    storage_test_result = page.evaluate("""() => {
        const results = {};
        
        // Test adding a bundle
        const testBundle = {
            name: "Test Bundle",
            chunks: [
                {
                    content: "Test content for storage",
                    embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
                    metadata: { source: "test.txt" }
                }
            ],
            files: ["test.txt"],
            metadata: { model: "text-embedding-3-small" }
        };
        
        const addResult = window.RAGUserBundles.addBundle(testBundle);
        results.bundleAdded = addResult;
        
        // Test retrieving bundles
        const bundles = window.RAGUserBundles.getBundles();
        results.bundleCount = bundles.length;
        results.bundleRetrieved = bundles.length > 0 && bundles[0].name === "Test Bundle";
        
        // Test bundle statistics
        const stats = window.RAGUserBundles.getBundleStats();
        results.statsGenerated = stats.bundleCount === 1 && stats.totalChunks === 1;
        
        // Test removing bundle
        const removeResult = window.RAGUserBundles.removeBundle("Test Bundle");
        results.bundleRemoved = removeResult;
        
        // Verify removal
        const bundlesAfterRemoval = window.RAGUserBundles.getBundles();
        results.bundleActuallyRemoved = bundlesAfterRemoval.length === 0;
        
        return results;
    }""")
    
    # Verify storage operations
    assert storage_test_result['bundleAdded'], "Bundle should be added successfully"
    assert storage_test_result['bundleRetrieved'], "Bundle should be retrievable"
    assert storage_test_result['statsGenerated'], "Bundle statistics should be accurate"
    assert storage_test_result['bundleRemoved'], "Bundle should be removed successfully"
    assert storage_test_result['bundleActuallyRemoved'], "Bundle should actually be gone after removal"
    
    print(f"Storage operations test results:")
    print(f"  Bundle added: {storage_test_result['bundleAdded']}")
    print(f"  Bundle retrieved: {storage_test_result['bundleRetrieved']}")
    print(f"  Stats generated: {storage_test_result['statsGenerated']}")
    print(f"  Bundle removed: {storage_test_result['bundleRemoved']}")
    
    # Take screenshot of storage test
    screenshot_with_markdown(page, "rag_bundle_storage_operations", {
        "Status": "Bundle storage operations tested",
        "Add Operation": "Working",
        "Retrieve Operation": "Working",
        "Remove Operation": "Working",
        "Statistics": "Accurate"
    })

def test_rag_bundle_display_elements(page: Page, serve_hacka_re):
    """Test bundle display and UI elements."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Add a test bundle through console
    page.evaluate("""() => {
        const testBundle = {
            name: "Sample Bundle",
            chunks: [
                {
                    content: "Sample content 1",
                    embedding: [0.1, 0.2, 0.3],
                    metadata: { source: "file1.txt" }
                },
                {
                    content: "Sample content 2", 
                    embedding: [0.4, 0.5, 0.6],
                    metadata: { source: "file2.txt" }
                }
            ],
            files: ["file1.txt", "file2.txt"],
            metadata: { model: "text-embedding-3-small" }
        };
        
        window.RAGUserBundles.addBundle(testBundle);
    }""")
    
    # Open the RAG modal
    rag_button = page.locator("#rag-btn")
    rag_button.click()
    
    # Wait for modal to become visible
    page.wait_for_selector("#rag-modal", state="visible", timeout=3000)
    
    # Test bundle display creation through console
    display_test_result = page.evaluate("""() => {
        const bundles = window.RAGUserBundles.getBundles();
        if (bundles.length === 0) return { bundleFound: false };
        
        const bundle = bundles[0];
        
        // Create display element
        const displayElement = window.RAGUserBundles.createBundleDisplayElement(bundle, (name) => {
            console.log('Remove callback triggered for:', name);
        });
        
        // Test display element properties
        const hasName = displayElement.querySelector('.rag-bundle-name') !== null;
        const hasStats = displayElement.querySelector('.rag-bundle-stats') !== null;
        const hasRemoveButton = displayElement.querySelector('.rag-remove-bundle-btn') !== null;
        
        return {
            bundleFound: true,
            bundleName: bundle.name,
            chunkCount: bundle.chunks.length,
            hasDisplayElements: hasName && hasStats && hasRemoveButton,
            displayElementCreated: displayElement !== null
        };
    }""")
    
    # Verify display elements
    assert display_test_result['bundleFound'], "Test bundle should be found"
    assert display_test_result['hasDisplayElements'], "Display element should have all required components"
    assert display_test_result['displayElementCreated'], "Display element should be created successfully"
    
    print(f"Bundle display test results:")
    print(f"  Bundle found: {display_test_result['bundleFound']}")
    print(f"  Bundle name: {display_test_result['bundleName']}")
    print(f"  Chunk count: {display_test_result['chunkCount']}")
    print(f"  Display elements complete: {display_test_result['hasDisplayElements']}")
    
    # Take screenshot of display test
    screenshot_with_markdown(page, "rag_bundle_display_elements", {
        "Status": "Bundle display elements tested",
        "Bundle Name": display_test_result['bundleName'],
        "Chunk Count": str(display_test_result['chunkCount']),
        "Display Elements": "Complete with name, stats, and remove button"
    })

def test_rag_bundle_file_input_creation(page: Page, serve_hacka_re):
    """Test bundle file input creation and basic functionality."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Test file input creation through browser console
    file_input_test_result = page.evaluate("""() => {
        let loadCallbackTriggered = false;
        let errorCallbackTriggered = false;
        let loadedData = null;
        
        // Create file input with callbacks
        const fileInput = window.RAGUserBundles.createBundleFileInput(
            (data) => {
                loadCallbackTriggered = true;
                loadedData = data;
            },
            (error) => {
                errorCallbackTriggered = true;
            }
        );
        
        // Test file input properties
        const isFileInput = fileInput.type === 'file';
        const acceptsJson = fileInput.accept === '.json';
        const singleFile = !fileInput.multiple;
        
        return {
            fileInputCreated: fileInput !== null,
            correctType: isFileInput,
            correctAccept: acceptsJson,
            singleFileMode: singleFile,
            hasEventListener: fileInput.onchange !== null || fileInput.addEventListener !== undefined
        };
    }""")
    
    # Verify file input creation
    assert file_input_test_result['fileInputCreated'], "File input should be created"
    assert file_input_test_result['correctType'], "File input should have correct type"
    assert file_input_test_result['correctAccept'], "File input should accept JSON files"
    assert file_input_test_result['singleFileMode'], "File input should be in single file mode"
    
    print(f"File input creation test results:")
    print(f"  File input created: {file_input_test_result['fileInputCreated']}")
    print(f"  Correct type: {file_input_test_result['correctType']}")
    print(f"  Accepts JSON: {file_input_test_result['correctAccept']}")
    print(f"  Single file mode: {file_input_test_result['singleFileMode']}")
    
    # Take screenshot of file input test
    screenshot_with_markdown(page, "rag_bundle_file_input", {
        "Status": "Bundle file input creation tested",
        "Input Type": "File input",
        "Accepted Format": "JSON only",
        "File Mode": "Single file",
        "Callbacks": "Configured for load and error"
    })

def test_rag_bundle_load_button_interaction(page: Page, serve_hacka_re):
    """Test the load bundle button interaction."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Open the RAG modal
    rag_button = page.locator("#rag-btn")
    rag_button.click()
    
    # Wait for modal to become visible
    page.wait_for_selector("#rag-modal", state="visible", timeout=3000)
    
    # Check load bundle button
    load_bundle_btn = page.locator("#load-user-bundle-btn")
    expect(load_bundle_btn).to_be_visible()
    expect(load_bundle_btn).to_be_enabled()
    
    # Click the load bundle button (this should trigger file input creation)
    load_bundle_btn.click()
    
    # The button should remain functional after click
    expect(load_bundle_btn).to_be_enabled()
    
    # Take screenshot of load button interaction
    screenshot_with_markdown(page, "rag_bundle_load_button", {
        "Status": "Load bundle button interaction tested",
        "Button State": "Remains enabled after click",
        "Functionality": "Triggers file input mechanism",
        "UI Response": "Working correctly"
    })

def test_rag_bundle_removal_confirmation(page: Page, serve_hacka_re):
    """Test bundle removal with confirmation dialog."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Add a test bundle
    page.evaluate("""() => {
        const testBundle = {
            name: "Test Bundle for Removal",
            chunks: [{ content: "test", embedding: [0.1], metadata: {} }],
            files: ["test.txt"],
            metadata: { model: "test" }
        };
        window.RAGUserBundles.addBundle(testBundle);
    }""")
    
    # Test removal confirmation through console
    removal_test_result = page.evaluate("""() => {
        let confirmCalled = false;
        let removeCalled = false;
        
        // Mock confirm function
        const originalConfirm = window.confirm;
        window.confirm = (message) => {
            confirmCalled = true;
            return true; // Simulate user clicking OK
        };
        
        // Create display element with remove callback
        const bundles = window.RAGUserBundles.getBundles();
        if (bundles.length === 0) return { bundleFound: false };
        
        const bundle = bundles[0];
        const displayElement = window.RAGUserBundles.createBundleDisplayElement(bundle, (name) => {
            removeCalled = true;
            window.RAGUserBundles.removeBundle(name);
        });
        
        // Simulate clicking remove button
        const removeBtn = displayElement.querySelector('.rag-remove-bundle-btn');
        if (removeBtn) {
            removeBtn.click();
        }
        
        // Restore original confirm
        window.confirm = originalConfirm;
        
        // Check if bundle was actually removed
        const bundlesAfterRemoval = window.RAGUserBundles.getBundles();
        
        return {
            bundleFound: true,
            confirmCalled: confirmCalled,
            removeCalled: removeCalled,
            bundleRemoved: bundlesAfterRemoval.length === 0,
            removeButtonExists: removeBtn !== null
        };
    }""")
    
    # Verify removal confirmation
    assert removal_test_result['bundleFound'], "Test bundle should be found"
    assert removal_test_result['removeButtonExists'], "Remove button should exist"
    assert removal_test_result['confirmCalled'], "Confirmation dialog should be called"
    assert removal_test_result['removeCalled'], "Remove callback should be triggered"
    assert removal_test_result['bundleRemoved'], "Bundle should be actually removed"
    
    print(f"Bundle removal test results:")
    print(f"  Bundle found: {removal_test_result['bundleFound']}")
    print(f"  Confirm called: {removal_test_result['confirmCalled']}")
    print(f"  Remove called: {removal_test_result['removeCalled']}")
    print(f"  Bundle removed: {removal_test_result['bundleRemoved']}")
    
    # Take screenshot of removal test
    screenshot_with_markdown(page, "rag_bundle_removal_confirmation", {
        "Status": "Bundle removal confirmation tested",
        "Confirmation": "Dialog triggered correctly",
        "Removal": "Executed successfully",
        "UI Flow": "Complete workflow functional"
    })

def test_rag_bundle_statistics_accuracy(page: Page, serve_hacka_re):
    """Test bundle statistics calculation accuracy."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Clear existing bundles and add test data
    page.evaluate("""() => {
        localStorage.removeItem('rag_user_bundles_index');
        
        // Add multiple test bundles with different sizes
        const bundle1 = {
            name: "Bundle 1",
            chunks: [
                { content: "chunk1", embedding: [0.1], metadata: {} },
                { content: "chunk2", embedding: [0.2], metadata: {} }
            ],
            files: ["file1.txt", "file2.txt"],
            metadata: { model: "model1" }
        };
        
        const bundle2 = {
            name: "Bundle 2", 
            chunks: [
                { content: "chunk3", embedding: [0.3], metadata: {} }
            ],
            files: ["file3.txt"],
            metadata: { model: "model2" }
        };
        
        window.RAGUserBundles.addBundle(bundle1);
        window.RAGUserBundles.addBundle(bundle2);
    }""")
    
    # Test statistics calculation
    stats_test_result = page.evaluate("""() => {
        const stats = window.RAGUserBundles.getBundleStats();
        
        return {
            bundleCount: stats.bundleCount,
            totalChunks: stats.totalChunks,
            totalFiles: stats.totalFiles,
            bundleDetails: stats.bundles,
            statsStructure: {
                hasBundleCount: 'bundleCount' in stats,
                hasTotalChunks: 'totalChunks' in stats,
                hasTotalFiles: 'totalFiles' in stats,
                hasBundleDetails: 'bundles' in stats && Array.isArray(stats.bundles)
            }
        };
    }""")
    
    # Verify statistics accuracy
    assert stats_test_result['bundleCount'] == 2, "Should count 2 bundles"
    assert stats_test_result['totalChunks'] == 3, "Should count 3 total chunks"
    assert stats_test_result['totalFiles'] == 3, "Should count 3 total files"
    assert len(stats_test_result['bundleDetails']) == 2, "Should have details for 2 bundles"
    assert stats_test_result['statsStructure']['hasBundleCount'], "Stats should include bundle count"
    assert stats_test_result['statsStructure']['hasTotalChunks'], "Stats should include total chunks"
    
    print(f"Bundle statistics test results:")
    print(f"  Bundle count: {stats_test_result['bundleCount']}")
    print(f"  Total chunks: {stats_test_result['totalChunks']}")
    print(f"  Total files: {stats_test_result['totalFiles']}")
    print(f"  Bundle details count: {len(stats_test_result['bundleDetails'])}")
    
    # Take screenshot of statistics test
    screenshot_with_markdown(page, "rag_bundle_statistics", {
        "Status": "Bundle statistics calculation tested",
        "Bundle Count": str(stats_test_result['bundleCount']),
        "Total Chunks": str(stats_test_result['totalChunks']),
        "Total Files": str(stats_test_result['totalFiles']),
        "Accuracy": "All counts correct"
    })