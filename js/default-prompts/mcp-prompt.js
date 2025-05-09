/**
 * Model Context Protocol (MCP) Default Prompt
 * 
 * NOTE: MCP functionality is currently under development and temporarily disabled.
 * This prompt is kept in place for future implementation.
 */
window.McpPrompt = {
    id: 'mcp-prompt',
    name: 'Model Context Protocol (under development)',
    content: `# ⚠️ MCP FUNCTIONALITY UNDER DEVELOPMENT

> **IMPORTANT NOTICE**: Model Context Protocol (MCP) functionality is currently under development and has been temporarily disabled. This prompt is kept for reference purposes only. Please check back later for updates.

# ✨ MCP Server Primer (leave as‑is)

> *"You are given a catalogue of external MCP servers.  
> When you need a capability, match the intent to a tool.  
> If a tool lives on a remote server, call it by its \\\`name\\\`  
> with the arguments described. For stdio servers, launch the
> \\\`command\\\` once at first use and keep the process alive."*

---

## hacka.re MCP Implementation

**Privacy & Dependency Policy**
- hacka.re is a privacy-focused web client with NO server-side components
- All MCP servers must be run locally by the user
- NO external dependencies or tracking is allowed
- All code and libraries are hosted on the same page
- MCP servers are managed through the hacka.re UI via the MCP button

**Adding MCP Servers in hacka.re**
1. Click the MCP button in the top toolbar
2. Fill out the server form with name, URL, optional command reference, and environment variables
3. Click "Add Server" to register the server
4. Use the start/stop button to control the server connection

**Network-Based MCP Connections**
- As a browser-based application, hacka.re cannot directly execute commands
- MCP servers must be started externally and exposed over HTTP
- The URL field is required to connect to MCP servers over the network
- The command field is for reference only (documentation of how to start the server)

**Using Supergateway for MCP Servers**
- Supergateway can be used to expose MCP servers over HTTP:
  \\\`\\\`\\\`
  npx -y supergateway \\\\
    --stdio "npx -y @modelcontextprotocol/server-filesystem ./my-folder" \\\\
    --port 8000 \\\\
    --baseUrl http://localhost:8000 \\\\
    --ssePath /sse \\\\
    --messagePath /message
  \\\`\\\`\\\`
- Then connect to it in hacka.re using the URL: \\\`http://localhost:8000\\\`

**Testing MCP Functionality**
- Playwright tests are available in \`_tests/playwright/test_mcp.py\`
- Run tests with: \`cd _tests/playwright && pytest test_mcp.py\`
- Tests verify UI elements, server management, and tool integration

**Security Considerations**
- MCP servers run with the same permissions as the user
- Review server code before running to ensure it meets your security requirements
- All server communication stays local and is not sent to external services

---

## 1. Supabase MCP Server
**What it is** – Bridges LLMs to Supabase projects for SQL queries, auth admin, branching & project metadata.  

**Key tools** – \\\`sql_query\\\`, \\\`list_tables\\\`, \\\`create_branch\\\`, \\\`auth_admin\\\`

**Run with hacka.re**
1. Install the server locally: \\\`npm install -g supabase-mcp-server\\\`
2. Add to hacka.re with:
   - Name: \\\`supabase\\\`
   - Command: \\\`supabase-mcp-server\\\`
   - Env: \\\`SUPABASE_PAT=<personal‑access‑token>\\\`

**Dependencies** – Requires Node.js and npm installed locally. No external calls except to your Supabase instance.

**Use‑cases** – Natural‑language data exploration, automated migrations, test‑data seeding.

---

## 2. Redis MCP Server
**What it is** – Natural‑language interface over Redis key–value & search.  

**Key tools** – \\\`redis_set\\\`, \\\`redis_get\\\`, \\\`redis_scan\\\`, \\\`redis_search\\\`

**Run with hacka.re**
1. Install Docker locally
2. Add to hacka.re with:
   - Name: \\\`redis\\\`
   - Command: \\\`docker run --rm -e REDIS_URL=redis://localhost:6379 redis/mcp-redis\\\`
   - Env: (none required in form, included in command)

**Dependencies** – Requires Docker installed locally and a running Redis instance. No external calls except to your local Redis instance.

**Use‑cases** – Session storage, caching layers, vector‑store experiments.

---

## 3. Git MCP Server (local repos)
**What it is** – Exposes Git plumbing—status, diff, commit, branch, grep—for agentic code refactors.

**Run with hacka.re**
1. Install the server locally: \\\`npm install -g mcp-server-git\\\`
2. Add to hacka.re with:
   - Name: \\\`git\\\`
   - Command: \\\`mcp-server-git\\\`
   - Env: \\\`ALLOWED_REPOS=/path/to/your/repos\\\`

**Dependencies** – Requires Node.js, npm, and Git installed locally. No external calls except to local Git repositories.

**Use‑cases** – Auto‑generating PRs, multi‑file refactors, changelog drafting.

---

## 4. GitHub MCP Server (hosted or local)
**What it is** – Official GitHub integration; adds repo search, issue/PR APIs, code‑scanning helpers.

**Run with hacka.re**
1. Install GitHub CLI with MCP support
2. Start the server: \\\`gh mcp serve --listen :7777 --token $GH_TOKEN\\\`
3. Add to hacka.re with:
   - Name: \\\`github\\\`
   - Command: \\\`gh mcp serve --listen :7777 --token $GH_TOKEN\\\`
   - Env: (none required in form, included in command)

**Dependencies** – Requires GitHub CLI installed locally. Makes external calls to GitHub API.

**Tools** – \\\`repo_search\\\`, \\\`open_issue\\\`, \\\`get_me\\\`, \\\`code_scan\\\`

---

## 5. Filesystem MCP Server
**What it is** – Secure sandboxed file I/O (read, write, list, tree, search).

**Run with hacka.re**
1. Install the server locally
2. Add to hacka.re with:
   - Name: \\\`fs\\\`
   - Command: \\\`mcp-filesystem-server /path/to/allowed/directory /path/to/scratch\\\`
   - Env: (none required)

**Dependencies** – No external dependencies or calls. Only accesses local filesystem in specified directories.

**Use‑cases** – Local code‑gen, note‑taking, bulk file edits.

---

## 6. Azure Database for PostgreSQL MCP Server
**What it is** – Preview server that tunnels Chat‑Ops into Azure Postgres.

**Run with hacka.re**
1. Set up Python environment and install dependencies
2. Add to hacka.re with:
   - Name: \\\`azure-postgres\\\`
   - Command: \\\`/path/to/python /path/to/azure_postgresql_mcp.py\\\`
   - Env: 
     \\\`PGHOST=<hostname>
     PGUSER=<user>
     PGPASSWORD=<secret>
     PGDATABASE=<db>\\\`

**Dependencies** – Requires Python installed locally. Makes external calls to your Azure PostgreSQL instance.

**Tools** – \\\`pg_query\\\`, \\\`explain_plan\\\`, \\\`list_indexes\\\`

---

## 7. Brave Search MCP Server
**What it is** – Wraps the Brave Search API for web & local search with smart fallback.

**Run with hacka.re**
1. Install the server locally: \\\`npm install -g @modelcontextprotocol/server-brave-search\\\`
2. Add to hacka.re with:
   - Name: \\\`brave-search\\\`
   - Command: \\\`@modelcontextprotocol/server-brave-search\\\`
   - Env: \\\`BRAVE_API_KEY=<key>\\\`

**Dependencies** – Requires Node.js and npm installed locally. Makes external calls to Brave Search API.

**Tools** – \\\`brave_web_search\\\`, \\\`brave_local_search\\\`  
**Use‑cases** – Real‑time citation, local business lookup, freshness‑critical queries.

---

## 8. CodeM (Minecraft Coder Pack) Server
**What it is** – Specialised for Minecraft modding helpers—decompilation, obfuscation mapping, build scripts.

**Run with hacka.re**
1. Clone and set up the server: \\\`git clone https://github.com/k3d3/CodeM && cd CodeM\\\`
2. Add to hacka.re with:
   - Name: \\\`codem\\\`
   - Command: \\\`/path/to/CodeM/run-mcp.sh\\\`
   - Env: (none required)

**Dependencies** – Requires Git and Java installed locally. No external calls except for downloading Minecraft assets if needed.

**Tools** – \\\`mcp_decompile\\\`, \\\`mcp_remap\\\`, \\\`gradle_build\\\`  
**Use‑cases** – Automated patch generation, mod‑pack auditing.

---

## 9. Make_MCP Generator
**What it is** – Meta‑server that scaffolds brand‑new MCP servers in TypeScript or Go.

**Run with hacka.re**
1. Create a new server: \`npx make_mcp my‑weather‑server\`
2. Navigate to the server directory: \`cd my‑weather‑server\`
3. Add to hacka.re with:
   - Name: \`my-weather-server\`
   - Command: \`npm start\`
   - Env: (as required by your custom server)

**Dependencies** – Requires Node.js and npm installed locally. Custom servers may have their own dependencies.

**Use‑cases** – Generates boiler‑plate, test harness & README in seconds.

---

## 10. SeekChat Desktop (Server bundle)
**What it is** – All‑in‑one AI chat desktop app packing a curated toolchain (file ops, code exec, analytics).

**Run with hacka.re**
1. Install SeekChat Desktop
2. Configure Claude Desktop config: Add \`"seekchat"\` to your \`claude_desktop_config.json\`
3. Add to hacka.re with:
   - Name: \`seekchat\`
   - Command: (as specified in SeekChat documentation)
   - Env: (as required by SeekChat)

**Dependencies** – Requires SeekChat Desktop installed locally. May make external calls depending on configuration.

---

## 11. VS Code Built‑in MCP Support
**What it is** – Project-scoped tooling through VS Code's MCP integration.

**Run with hacka.re**
1. Configure \`.vscode/mcp.json\` in your project
2. Start the servers as specified in the configuration
3. Add each server to hacka.re individually with appropriate commands

**Dependencies** – Varies based on the servers configured. Each server must be added separately to hacka.re.

**Example Configuration**
~~~jsonc
{
  "servers": {
    "brave-search": { "url": "http://localhost:8787/sse" },
    "fs": { "command": "mcp-filesystem-server", "args": ["\\\${workspaceFolder}"] }
  }
}
~~~

---

### 🛠 Prompt‑Usage Tips
* Reference a tool by **exact name** (\`brave_web_search\`) to nudge the agent.  
* For destructive file/db actions, wrap the instruction in triple‑confirm language.  
* Keep stdio servers alive between calls to avoid cold‑start lag.  
* Combine servers (e.g. Git + Supabase) for complex multi‑step plans.
* In hacka.re, use the MCP button to manage servers and view available tools.
* Test MCP functionality with Playwright tests before deploying.

---

### 📚 Additional Resources
* **Intro to MCP and its ecosystem** – search "Model Context Protocol overview"
* **Building a server in C#** – search "MCP server C# example"
* **Semantic‑Kernel integration guide** – search "MCP Semantic Kernel"
* **hacka.re MCP tests** – see \`_tests/playwright/test_mcp.py\`

Copy, paste, hack away!`
};
