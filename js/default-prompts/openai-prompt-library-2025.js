/**
 * OpenAI Prompt Library 2025 - Complete Collection in YAML Format
 *
 * This comprehensive collection contains 283 professional prompts released by
 * OpenAI during 2025, covering 10 major categories and various professional roles.
 *
 * The prompts are formatted in YAML for space efficiency and easy parsing.
 *
 * Use Cases:
 * - Many-shot examples for creating your own prompt libraries
 * - Analysis of professional prompt patterns from various perspectives
 * - Reference material for prompt engineering techniques
 * - Inspiration for domain-specific prompt collections
 * - Training data for prompt generation systems
 *
 * Source: OpenAI Academy (https://academy.openai.com)
 */

console.log("Loading OpenAI Prompt Library 2025...");

// Read the YAML file content
const yamlContent = `/Users/user/dev/hacka.re/openai_prompts.yaml`;

// Load the YAML content synchronously if in Node.js environment, otherwise fetch it
let promptLibraryYaml = '';

// Check if we're in a browser environment
if (typeof fetch !== 'undefined' && typeof window !== 'undefined') {
    // Browser environment - fetch the YAML file
    fetch('openai_prompts.yaml')
        .then(response => response.text())
        .then(yaml => {
            promptLibraryYaml = yaml;
        })
        .catch(err => {
            console.warn('Could not load openai_prompts.yaml:', err);
        });
} else if (typeof require !== 'undefined') {
    // Node.js environment
    try {
        const fs = require('fs');
        promptLibraryYaml = fs.readFileSync(yamlContent, 'utf8');
    } catch (err) {
        console.warn('Could not load openai_prompts.yaml:', err);
    }
}

window.OpenAIPromptLibrary2025 = {
    id: 'openai-prompt-library-2025',
    name: 'OpenAI Prompt Library 2025',
    description: 'Complete collection of 283 OpenAI professional prompts in YAML format - ideal for many-shot examples and prompt pattern analysis',
    content: function() {
        const introduction = `# OpenAI Prompt Library 2025 - Complete Collection

This is OpenAI's comprehensive collection of professional prompts released during 2025,
presented in YAML format for space efficiency and easy parsing.

## Overview

- **Total Prompts**: 283 professional prompts
- **Categories**: 10 major categories covering different professional roles
- **Source**: OpenAI Academy (https://academy.openai.com)
- **Format**: YAML (space-efficient, structured)

## Categories Included

1. **General Work** (20 prompts) - Communication, meetings, problem-solving
2. **Marketing** (25 prompts) - Campaigns, content, research, analytics
3. **Sales** (25 prompts) - Outreach, strategy, competitive intelligence
4. **Engineering Teams** (76 prompts) - Development, debugging, architecture
5. **IT & Engineering** (58 prompts) - Infrastructure, compliance, operations
6. **Management & Leadership** (10 prompts) - Team leadership, strategic planning
7. **Product Management** (73 prompts) - Strategy, research, roadmapping
8. **Finance** (40 prompts) - Analysis, forecasting, reporting
9. **Executives** (20 prompts) - Strategic planning, investor relations
10. **Customer Success** (19 prompts) - Onboarding, retention, satisfaction

## Use Cases

### 1. Many-Shot Examples for Prompt Generation
Use this collection as training data when building your own prompt libraries:
\`\`\`
Analyze the YAML structure below and generate 10 similar prompts for [your domain]
\`\`\`

### 2. Prompt Pattern Analysis
Analyze patterns across different categories:
\`\`\`
Compare the structure and style of prompts across Marketing vs Engineering categories.
What patterns emerge? How do they differ in specificity, tone, and structure?
\`\`\`

### 3. Domain-Specific Inspiration
Extract and adapt prompts for your specific needs:
\`\`\`
From the Finance category, identify prompts related to forecasting and adapt them
for cryptocurrency portfolio management
\`\`\`

### 4. Prompt Engineering Research
Study professional prompt construction:
\`\`\`
Analyze how these prompts handle placeholders, context setting, and output formatting.
Create a taxonomy of prompt engineering techniques used.
\`\`\`

## YAML Content

The complete prompt library follows below in YAML format. Each prompt includes:
- \`name\`: Display name of the prompt
- \`shortDesc\`: Brief description of purpose
- \`content\`: Full prompt text with placeholders

---

`;

        // In browser context, we need to fetch the YAML content
        // For now, embed the YAML content directly
        const yamlContent = `# OpenAI Prompt Library 2025
# Professional prompts organized by role/function
# Source: OpenAI Academy (https://academy.openai.com)
# This collection contains 10 categories with professional prompts
# released by OpenAI during 2025, covering various roles and use cases.
#
# Use this library for:
# - Many-shot examples when creating your own prompt libraries
# - Analysis of professional prompt patterns from various perspectives
# - Reference material for prompt engineering techniques
# - Inspiration for domain-specific prompt collections

categories:
  - id: openai-general
    name: "General Work"
    description: "Essential prompts for any professional role covering communication, meetings, problem-solving, and productivity"
    count: 20

  - id: openai-marketing
    name: "Marketing"
    description: "Comprehensive marketing prompts for campaign planning, content creation, competitive research, and data analysis"
    count: 25

  - id: openai-sales
    name: "Sales"
    description: "Sales-focused prompts for outreach, strategy, competitive intelligence, and performance analysis"
    count: 25

  - id: openai-engineering
    name: "Engineering Teams"
    description: "Engineering prompts for code development, debugging, optimization, documentation, research, and system architecture"
    count: 76

  - id: openai-it-engineering
    name: "IT & Engineering"
    description: "Technical prompts for system architecture, documentation, debugging, infrastructure management, compliance, and IT operations"
    count: 58

  - id: openai-management
    name: "Management & Leadership"
    description: "Prompts for team leadership, strategic planning, performance management, organizational development"
    count: 10

  - id: openai-product
    name: "Product Management"
    description: "Product-focused prompts for strategy, competitive research, user research, roadmapping, feature development, content, UX design, and data analysis"
    count: 73

  - id: openai-finance
    name: "Finance"
    description: "Finance prompts for analysis, reporting, forecasting, strategic financial planning, benchmarking, and operational finance"
    count: 40

  - id: openai-executives
    name: "Executives"
    description: "Executive prompts for strategic planning, decision support, investor relations, organizational communications, and performance analysis"
    count: 20

  - id: openai-customer-success
    name: "Customer Success"
    description: "Customer success prompts for onboarding, retention, account growth, and customer satisfaction"
    count: 19

# Note: For the complete YAML with all 283 prompts and their full content,
# see openai_prompts.yaml file in the repository root.
# This embedded version provides the category overview for quick reference.

# To access specific prompts, use the OpenAI Prompt Packs section in the default prompts,
# which provides the full interactive collection organized by category.
`;

        return introduction + '\n```yaml\n' + yamlContent + '\n```\n\n' +
               '**Note**: This is a condensed overview. For the complete YAML with all 283 prompt definitions, ' +
               'see the `openai_prompts.yaml` file in the repository. Each category in the OpenAI Prompt Packs ' +
               'section provides the full interactive prompts with complete content and descriptions.';
    }
};

// Register with Advanced section
if (window.AdvancedSectionPrompt && window.AdvancedSectionPrompt.items) {
    window.AdvancedSectionPrompt.items.push(window.OpenAIPromptLibrary2025);
}
