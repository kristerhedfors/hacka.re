# Testing MCP Commands

Try these commands in the MCP modal to see which works:

## Option 1: Using current directory
```
npx -y @modelcontextprotocol/server-filesystem /Users/user/dev/hacka.re
```

## Option 2: Using home directory
```
npx -y @modelcontextprotocol/server-filesystem ~
```

## Option 3: Using Desktop
```
npx -y @modelcontextprotocol/server-filesystem /Users/user/Desktop
```

## Option 4: Check if installed globally
First run in terminal:
```bash
npm install -g @modelcontextprotocol/server-filesystem
```

Then use:
```
mcp-server-filesystem /tmp
```

The issue seems to be that the MCP server process starts but doesn't respond to stdin. This usually means:
1. The command path is incorrect
2. The server needs different initialization
3. There's a permission issue

Try the simpler paths first to see if we can get any server working.