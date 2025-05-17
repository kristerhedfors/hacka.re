# hacka.re Verification Report

## Executive Summary

This report presents the results of a comprehensive verification of the hacka.re project's privacy and security claims.

### Overall Scores

{% if 'static_analysis' in results %}
- **Security (Static Analysis)**: {{ results.static_analysis.summary.security_score }}/100
{% endif %}
{% if 'network_analysis' in results %}
- **Privacy (Network Analysis)**: {{ results.network_analysis.summary.privacy_score }}/100
{% endif %}
{% if 'crypto_audit' in results %}
- **Cryptography**: {{ results.crypto_audit.summary.crypto_score }}/100
{% endif %}
{% if 'storage_analysis' in results %}
- **Storage Security**: {{ results.storage_analysis.summary.storage_score }}/100
{% endif %}
{% if 'dependency_verification' in results %}
- **Dependencies**: {{ results.dependency_verification.summary.dependency_score }}/100
{% endif %}
- **Overall**: {{ overall_score }}/100

### Key Findings

{% for finding in key_findings %}
- {{ finding }}
{% endfor %}

## Top Recommendations

{% for recommendation in top_recommendations %}
- **{{ recommendation.message }}** (Priority: {{ recommendation.priority|capitalize }})
{% endfor %}

{% if 'static_analysis' in results %}
## Static Analysis

- **Files Analyzed**: {{ results.static_analysis.summary.total_files_analyzed }}
- **Lines Analyzed**: {{ results.static_analysis.summary.total_lines_analyzed }}
- **Issues Found**: {{ results.static_analysis.summary.issues_found }}
- **Security Score**: {{ results.static_analysis.summary.security_score }}/100

{% if results.static_analysis.security_issues %}
### Security Issues

{% for issue in results.static_analysis.security_issues %}
#### {{ issue.message }}

- **Severity**: {{ issue.severity|capitalize }}
- **Type**: {{ issue.type }}
{% if issue.details %}
- **Details**: {{ issue.details }}
{% endif %}

{% endfor %}
{% endif %}

{% if results.static_analysis.privacy_issues %}
### Privacy Issues

{% for issue in results.static_analysis.privacy_issues %}
#### {{ issue.message }}

- **Severity**: {{ issue.severity|capitalize }}
- **Type**: {{ issue.type }}
{% if issue.details %}
- **Details**: {{ issue.details }}
{% endif %}

{% endfor %}
{% endif %}

{% if results.static_analysis.recommendations %}
### Recommendations

{% for recommendation in results.static_analysis.recommendations %}
- **{{ recommendation.message }}** (Priority: {{ recommendation.priority|capitalize }})
{% endfor %}
{% endif %}
{% endif %}

{% if 'network_analysis' in results %}
## Network Analysis

- **Total Requests**: {{ results.network_analysis.summary.total_requests }}
- **Allowed Requests**: {{ results.network_analysis.summary.allowed_requests }}
- **Blocked Requests**: {{ results.network_analysis.summary.blocked_requests }}
- **Unknown Requests**: {{ results.network_analysis.summary.unknown_requests }}
- **Privacy Score**: {{ results.network_analysis.summary.privacy_score }}/100

{% if results.network_analysis.privacy_issues %}
### Privacy Issues

{% for issue in results.network_analysis.privacy_issues %}
#### {{ issue.message }}

- **Severity**: {{ issue.severity|capitalize }}
- **Type**: {{ issue.type }}
{% if issue.details %}
- **Details**: {{ issue.details }}
{% endif %}

{% endfor %}
{% endif %}

{% if results.network_analysis.recommendations %}
### Recommendations

{% for recommendation in results.network_analysis.recommendations %}
- **{{ recommendation.message }}** (Priority: {{ recommendation.priority|capitalize }})
{% endfor %}
{% endif %}
{% endif %}

{% if 'crypto_audit' in results %}
## Cryptographic Audit

- **Files Analyzed**: {{ results.crypto_audit.summary.total_files_analyzed }}
- **Crypto Functions Found**: {{ results.crypto_audit.summary.crypto_functions_found }}
- **Crypto Issues Found**: {{ results.crypto_audit.summary.crypto_issues_found }}
- **Crypto Score**: {{ results.crypto_audit.summary.crypto_score }}/100

{% if results.crypto_audit.crypto_issues %}
### Cryptographic Issues

{% for issue in results.crypto_audit.crypto_issues %}
#### {{ issue.message }}

- **Severity**: {{ issue.severity|capitalize }}
- **Type**: {{ issue.type }}
- **File**: {{ issue.file }}
- **Line**: {{ issue.line }}
{% if issue.code %}
- **Code**:
```
{{ issue.code }}
```
{% endif %}

{% endfor %}
{% endif %}

{% if results.crypto_audit.recommendations %}
### Recommendations

{% for recommendation in results.crypto_audit.recommendations %}
- **{{ recommendation.message }}** (Priority: {{ recommendation.priority|capitalize }})
{% endfor %}
{% endif %}
{% endif %}

{% if 'storage_analysis' in results %}
## Storage Analysis

- **Total Storage Items**: {{ results.storage_analysis.summary.total_storage_items }}
- **Encrypted Items**: {{ results.storage_analysis.summary.encrypted_items }}
- **Unencrypted Items**: {{ results.storage_analysis.summary.unencrypted_items }}
- **Storage Score**: {{ results.storage_analysis.summary.storage_score }}/100

{% if results.storage_analysis.storage_issues %}
### Storage Issues

{% for issue in results.storage_analysis.storage_issues %}
#### {{ issue.message }}

- **Severity**: {{ issue.severity|capitalize }}
- **Type**: {{ issue.type }}
{% if issue.details %}
- **Details**: {{ issue.details }}
{% endif %}

{% endfor %}
{% endif %}

{% if results.storage_analysis.recommendations %}
### Recommendations

{% for recommendation in results.storage_analysis.recommendations %}
- **{{ recommendation.message }}** (Priority: {{ recommendation.priority|capitalize }})
{% endfor %}
{% endif %}
{% endif %}

{% if 'dependency_verification' in results %}
## Dependency Verification

- **Total Dependencies**: {{ results.dependency_verification.summary.total_dependencies }}
- **Local Dependencies**: {{ results.dependency_verification.summary.local_dependencies }}
- **External Dependencies**: {{ results.dependency_verification.summary.external_dependencies }}
- **Missing Dependencies**: {{ results.dependency_verification.summary.missing_dependencies }}
- **Vulnerable Dependencies**: {{ results.dependency_verification.summary.vulnerable_dependencies }}
- **Dependency Score**: {{ results.dependency_verification.summary.dependency_score }}/100

{% if results.dependency_verification.dependency_issues %}
### Dependency Issues

{% for issue in results.dependency_verification.dependency_issues %}
#### {{ issue.message }}

- **Severity**: {{ issue.severity|capitalize }}
- **Type**: {{ issue.type }}
{% if issue.details %}
- **Details**: {{ issue.details }}
{% endif %}

{% endfor %}
{% endif %}

{% if results.dependency_verification.recommendations %}
### Recommendations

{% for recommendation in results.dependency_verification.recommendations %}
- **{{ recommendation.message }}** (Priority: {{ recommendation.priority|capitalize }})
{% endfor %}
{% endif %}
{% endif %}

## Conclusion

This report has presented a comprehensive analysis of the hacka.re project's privacy and security claims. The verification process has identified both strengths and areas for improvement in the implementation.

Report generated on {{ timestamp }} by hacka.re Verifier
