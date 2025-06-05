# Playwright Test Reorganization Plan

## Current State Analysis

### Total Test Files: 43 active test files
### Tests Currently Excluded from Runners: 6
- test_debug_mode.py
- test_model_context_window.py
- test_model_context_window_fallback.py
- test_owasp_prompt_bug.py
- test_prompt_order_and_function_library_prompt.py
- test_template.py

### Major Overlaps Identified

#### 1. Function Calling Tests (5 overlapping files)
- **test_function_calling.py** - Complex, has @timed_test decorator issues
- **test_function_calling_correct.py** - Basic UI testing, clean implementation
- **test_function_calling_simple.py** - Simple UI testing
- **test_function_calling_with_api.py** - Wrapper around function_calling_api/ tests
- **test_function_calling_icons.py** - Icons testing

#### 2. Clear Chat Tests (2 overlapping files)
- **test_clear_chat.py** - Full functionality with API setup
- **test_clear_chat_button.py** - Button-focused testing

#### 3. Model Context Window Tests (2 overlapping files)
- **test_model_context_window.py** - Base functionality
- **test_model_context_window_fallback.py** - Fallback behavior

## Proposed Reorganization

### Phase 1: Consolidate Function Calling Tests

**REMOVE:**
- ❌ test_function_calling.py (problematic @timed_test decorator)
- ❌ test_function_calling_simple.py (redundant)
- ❌ test_function_calling_with_api.py (unnecessary wrapper)

**KEEP & RENAME:**
- ✅ test_function_calling_correct.py → **test_function_modal.py**
- ✅ test_function_calling_icons.py → **test_function_icons.py**

**ENHANCE:**
- Expand test_function_modal.py to cover all function modal functionality per FUNCTION_MODAL_README.md
- Keep function_calling_api/ directory as-is for API integration tests

### Phase 2: Organize Modal Tests by README Structure

**NEW MODAL TEST STRUCTURE:**
- ✅ **test_function_modal.py** (consolidated from function calling tests)
- ✅ **test_settings_modal.py** (enhance existing test_modals.py)
- ✅ **test_prompts_modal.py** (split from test_modals.py)
- ✅ **test_share_modal.py** (new, comprehensive sharing tests)
- ✅ **test_welcome_modal.py** (rename test_welcome_manager.py)

### Phase 3: Consolidate Feature Overlaps

**MERGE CLEAR CHAT TESTS:**
- ✅ Merge test_clear_chat_button.py INTO test_clear_chat.py
- ❌ Remove test_clear_chat_button.py

**MERGE MODEL CONTEXT TESTS:**
- ✅ Merge test_model_context_window_fallback.py INTO test_model_context_window.py
- ❌ Remove test_model_context_window_fallback.py

**MERGE SYSTEM PROMPT TESTS:**
- ✅ Merge test_system_prompt_*.py files INTO test_system_prompt.py
- ❌ Remove test_system_prompt_scrollbar.py, test_system_prompt_status.py, test_system_prompt_token_counter.py

### Phase 4: Include Excluded Tests

**ADD TO FEATURE RUNNER:**
- ✅ test_debug_mode.py
- ✅ test_model_context_window.py (merged)
- ✅ test_owasp_prompt_bug.py
- ✅ test_prompt_order_and_function_library_prompt.py

**EVALUATE:**
- test_template.py (may be a template, not a real test)

### Phase 5: Update Test Runners

**CORE TESTS** (quick validation - ~1 minute):
```bash
CORE_TESTS_FILTER="test_page or test_api or test_chat or test_welcome_modal"
```

**FEATURE TESTS** (comprehensive - ~5-10 minutes):
```bash
FEATURE_TESTS_INCLUDE="test_function_modal or test_settings_modal or test_prompts_modal or test_share_modal or test_sharing or test_default_prompts or test_themes or test_clear_chat or test_model_selection or test_copy_chat or test_button_tooltips or test_function_library or test_context_window or test_function_copy or test_function_deletion or test_function_editing or test_function_group or test_function_parsing or test_function_tooltip or test_function_icons or test_deterministic_crypto or test_clear_namespace or test_system_prompt or test_token_counter or test_input_field or test_logo_tooltip or test_debug_mode or test_model_context_window or test_owasp_prompt_bug or test_prompt_order_and_function_library_prompt"
```

## Implementation Plan

### Step 1: Remove Overlapping Tests (Immediate)
```bash
rm test_function_calling.py
rm test_function_calling_simple.py  
rm test_function_calling_with_api.py
rm test_clear_chat_button.py
rm test_model_context_window_fallback.py
rm test_system_prompt_scrollbar.py
rm test_system_prompt_status.py
rm test_system_prompt_token_counter.py
```

### Step 2: Rename for Consistency
```bash
mv test_function_calling_correct.py test_function_modal.py
mv test_function_calling_icons.py test_function_icons.py
mv test_welcome_manager.py test_welcome_modal.py
```

### Step 3: Enhance Existing Tests
- **test_function_modal.py**: Expand to cover all FUNCTION_MODAL_README.md requirements
- **test_clear_chat.py**: Merge functionality from test_clear_chat_button.py
- **test_model_context_window.py**: Merge fallback behavior tests
- **test_system_prompt.py**: Create new consolidated system prompt test

### Step 4: Split Modal Tests
- **test_modals.py**: Split into test_settings_modal.py and test_prompts_modal.py
- Create **test_share_modal.py** for comprehensive sharing modal tests

### Step 5: Update Test Runners
- Update run_core_tests.sh with new core filter
- Update run_feature_tests.sh with new feature filter including all excluded tests

## Expected Results

### Before Reorganization:
- **43 test files**
- **6 tests excluded** from runners
- **Multiple overlapping tests** causing maintenance burden
- **Inconsistent naming** and organization

### After Reorganization:
- **~35 test files** (8 fewer)
- **0 tests excluded** from runners
- **No overlapping functionality**
- **Clear modal-based organization** aligned with README documentation
- **Improved test coverage** through consolidation
- **Faster test execution** due to elimination of redundant tests

## Test Categories After Reorganization

### Core Tests (4 files - ~1 minute)
1. test_page.py - Basic page functionality
2. test_api.py - API configuration
3. test_chat.py - Basic chat functionality  
4. test_welcome_modal.py - Welcome flow

### Modal Tests (5 files)
1. test_function_modal.py - Complete function modal testing
2. test_settings_modal.py - Complete settings modal testing
3. test_prompts_modal.py - Complete prompts modal testing
4. test_share_modal.py - Complete sharing modal testing
5. test_welcome_modal.py - Welcome modal testing

### Feature Tests (~26 files)
- All advanced functionality
- Integration tests
- UI component tests
- Behavior tests

### API Integration Tests (4 files in function_calling_api/)
- test_basic.py
- test_multiple.py  
- test_rc4.py
- test_validation.py

This reorganization will result in a cleaner, more maintainable test suite with zero overlaps and complete coverage.