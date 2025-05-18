/**
 * Agent Orchestration Example Prompt
 * Demonstrates a pattern for creating multi-agent systems with function calling
 */

window.AgentOrchestrationPrompt = {
    id: 'agent_orchestration',
    name: 'Agent orchestration example',
    content: `# Agent Orchestration Example

This example demonstrates how to implement a multi-agent system using function calling. The implementation uses the JavaScript module pattern to maintain shared state while ensuring each function works correctly with hacka.re's function calling system.

## Implementation

\`\`\`javascript
/**
 * Agent Module - Encapsulates agent definitions and provides handoff functions
 * @callable
 */
const AgentModule = (function() {
  /**
   * @typedef {Object} Agent
   * @property {string} name         – Human-readable identifier
   * @property {string} instructions – System prompt for the LLM
   */

  /** @type {Agent} */
  const triageAgent = {
    name: "Triage Agent",
    instructions:
      "You are TRIAGE. Greet briefly, discover the user's intent, " +
      "then call either transferToSales() or transferToSupport().",
  };

  /** @type {Agent} */
  const salesAgent = {
    name: "Sales Agent",
    instructions:
      "You are SALES. Pitch ACME products concisely. " +
      "Use placeOrder() when the user accepts a price. " +
      "If the topic drifts, call transferBackToTriage().",
  };

  /** @type {Agent} */
  const supportAgent = {
    name: "Support Agent",
    instructions:
      "You are SUPPORT. Diagnose product issues. " +
      "If needs escalate, call issueRefund(). " +
      "Otherwise, propose a fix. For unrelated matters " +
      "call transferBackToTriage().",
  };

  // Return the public API
  return {
    getTriageAgent: function() { return triageAgent; },
    getSalesAgent: function() { return salesAgent; },
    getSupportAgent: function() { return supportAgent; }
  };
})();

/**
 * Generate a pseudo-random order identifier.
 * @internal
 * @returns {string}
 */
function generateOrderId() {
  return "ORD-" + Math.random().toString(36).slice(2, 10).toUpperCase();
}

/* ============================================================
 *  HANDOFF FUNCTIONS  (return an Agent)
 * ============================================================
 */

/**
 * Direct the conversation to the Sales department.
 * @returns {Agent}
 * @callable
 */
function transferToSales() { 
  return AgentModule.getSalesAgent(); 
}

/**
 * Direct the conversation to the Support department.
 * @returns {Agent}
 * @callable
 */
function transferToSupport() { 
  return AgentModule.getSupportAgent(); 
}

/**
 * Return control to the initial triage agent.
 * @returns {Agent}
 * @callable
 */
function transferBackToTriage() { 
  return AgentModule.getTriageAgent(); 
}

/* ============================================================
 *  DOMAIN-LEVEL ACTIONS
 * ============================================================
 */

/**
 * Place an order for a product.
 * @param {string} sku       – Stock-keeping unit
 * @param {number} quantity  – Integer ≥ 1
 * @returns {string}         – Confirmation message
 * @callable
 */
function placeOrder(sku, quantity = 1) {
  const id = generateOrderId();
  return \`Order \${id} for \${quantity} × \${sku} recorded.\`;
}

/**
 * Issue a refund for a previously placed order.
 * @param {string} orderId   – Identifier returned by placeOrder
 * @param {string} reason    – Short user-supplied explanation
 * @returns {string}         – Result status
 * @callable
 */
function issueRefund(orderId, reason) {
  // Business logic would live here
  return \`Refund for \${orderId} processed (reason: \${reason}).\`;
}
\`\`\`

## Architecture & Design Choices

This implementation addresses specific constraints in hacka.re's function calling system:

1. **Module Pattern for Shared State**: 
   - The IIFE (Immediately Invoked Function Expression) creates a closure that encapsulates the agent definitions
   - This pattern maintains private state while exposing only necessary functionality through a public API
   - Each agent definition is kept in one place, avoiding duplication

2. **Function Isolation**:
   - Each function is self-contained and can be executed independently
   - Functions access shared state through the module's public methods
   - This structure works with hacka.re's function execution environment, which evaluates each function separately

3. **Explicit Function Annotations**:
   - The \`@callable\` annotation explicitly marks functions that should be exposed to the LLM
   - The \`@internal\` annotation marks helper functions that shouldn't be directly callable
   - These annotations help the function parser correctly identify which functions to expose

4. **Clean Separation of Concerns**:
   - Agent definitions are separated from the functions that use them
   - Handoff functions are distinct from domain-level actions
   - Internal utilities are clearly marked and separated

5. **Error Prevention**:
   - The design avoids common issues like referencing undefined variables
   - Functions return properly structured objects that match their JSDoc type definitions
   - The code follows best practices for JavaScript in constrained environments

This pattern can be extended to more complex agent systems by adding more agent definitions and corresponding handoff functions.
`
};
