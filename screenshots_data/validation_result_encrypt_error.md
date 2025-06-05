# Screenshot Debug Info

## Test Information

- **Test File**: test_rc4.py
- **Test Name**: test_rc4_encryption_functions_with_api
- **Screenshot Time**: 2025-06-05 23:59:39

## Page Information

- **URL**: http://localhost:8000/
- **Title**: hacka.re - Free, open, för hackare av hackare

## Debug Information

- **Error**: Locator expected to contain text 'Function validated successfully'
Actual value: Library validated successfully! Found 1 functions, 1 marked as callable. 
Call log:
  - LocatorAssertions.to_contain_text with timeout 5000ms
  - waiting for locator("#function-validation-result")
    9 × locator resolved to <div id="function-validation-result" class="function-validation-result success">Library validated successfully! Found 1 functions…</div>
      - unexpected value "Library validated successfully! Found 1 functions, 1 marked as callable."

- **Component**: Function Validation
- **Status**: Error
- **Function**: rc4_encrypt

