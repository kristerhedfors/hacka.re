/**
 * Code Section for Default Prompts
 * Contains code-related prompts like Function Library and Agent Orchestration
 */

console.log("Loading Code Section prompt...");
window.CodeSectionPrompt = {
    id: 'code-section',
    name: 'Code',
    description: 'Code-related prompts including Function Library and Agent Orchestration examples',
    content: '', // Empty content as this is just a container for sub-prompts
    isSection: true, // Mark this as a section
    items: [
        // These will be populated from the individual prompt files
        // Function Library and Agent Orchestration will be moved here
    ]
};
