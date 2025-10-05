"""
Debug test for OpenAI Prompt Library 2025 Counting
"""

import pytest
from playwright.sync_api import Page
from test_utils import dismiss_welcome_modal, screenshot_with_markdown


def test_debug_counting(page: Page, serve_hacka_re):
    """Debug the counting logic"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)

    # Open prompts modal
    page.locator("#prompts-btn").click()
    page.wait_for_selector("#prompts-modal", state="visible")

    # Expand sections
    page.locator(".default-prompts-header").click()
    page.wait_for_timeout(300)
    page.locator(".nested-section-header:has-text('Advanced')").click()
    page.wait_for_timeout(500)

    # Check the structure of the Advanced section
    advanced_section_structure = page.evaluate("""
        () => {
            const advanced = window.DefaultPromptsService.getDefaultPrompts()
                .find(p => p.id === 'advanced-section');

            if (!advanced) return { error: 'Advanced section not found' };

            return {
                id: advanced.id,
                isSection: advanced.isSection,
                hasItems: !!advanced.items,
                itemCount: advanced.items ? advanced.items.length : 0,
                items: advanced.items ? advanced.items.map(item => ({
                    id: item.id,
                    name: item.name,
                    isSection: item.isSection,
                    hasItems: !!item.items
                })) : []
            };
        }
    """)

    print("Advanced section structure:", advanced_section_structure)

    # Check the OpenAI Prompt Library item
    screenshot_with_markdown(
        page,
        "before_check",
        {"advanced_structure": str(advanced_section_structure)}
    )

    # Check the checkbox
    prompt_item = page.locator(".default-prompt-item").filter(
        has_text="OpenAI Prompt Library 2025"
    )
    checkbox = prompt_item.locator(".prompt-item-checkbox")
    checkbox.check()
    page.wait_for_timeout(500)

    # Check selected IDs
    selected_ids = page.evaluate("""
        () => window.DefaultPromptsService.getSelectedDefaultPromptIds()
    """)

    print("Selected IDs:", selected_ids)

    # Manually trigger the count update
    count_result = page.evaluate("""
        () => {
            const advanced = window.DefaultPromptsService.getDefaultPrompts()
                .find(p => p.id === 'advanced-section');
            const selectedIds = window.DefaultPromptsService.getSelectedDefaultPromptIds();

            let enabledCount = 0;
            let totalCount = 0;

            function countPromptsInSection(section) {
                section.items.forEach(item => {
                    console.log('Checking item:', item.id, 'isSection:', item.isSection, 'hasItems:', !!item.items);
                    if (item.isSection && item.items) {
                        countPromptsInSection(item);
                    } else {
                        totalCount++;
                        console.log('  Counting as prompt. Total now:', totalCount);
                        if (selectedIds.includes(item.id)) {
                            enabledCount++;
                            console.log('  This prompt is selected. Enabled now:', enabledCount);
                        }
                    }
                });
            }

            countPromptsInSection(advanced);

            return { enabledCount, totalCount, selectedIds };
        }
    """)

    print("Count result:", count_result)

    screenshot_with_markdown(
        page,
        "after_check",
        {"count_result": str(count_result), "selected_ids": str(selected_ids)}
    )


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
