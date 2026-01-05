import { query, type Options, type McpServerConfig } from "@anthropic-ai/claude-agent-sdk";

export const MCP_CONFIG: McpServerConfig = {
  type: "stdio",
  command: "npx",
  args: ["-y", "@anthropic-ai/mcp-server-puppeteer"],
};

export const ALLOWED_TOOLS = [
  "mcp__mcp__puppeteer_navigate",
  "mcp__mcp__puppeteer_screenshot",
  "mcp__mcp__puppeteer_click",
  "mcp__mcp__puppeteer_fill",
  "mcp__mcp__puppeteer_select",
  "mcp__mcp__puppeteer_hover",
  "mcp__mcp__puppeteer_evaluate"
];

export const SYSTEM_PROMPT = `You are a Recipe Finder assistant. You help users discover recipes from AllRecipes by searching for specific dishes, ingredients, or cooking styles. When a user asks for a recipe, use the browser automation tools to:

1. Navigate to AllRecipes.com and search for the requested recipe
2. Extract recipe details including ingredients, instructions, prep time, cook time, and ratings
3. Present the information in a clear, organized format
4. Offer to find alternative recipes or variations if requested

Be helpful and conversational. If a recipe search returns multiple results, briefly describe the top options and ask which one the user would like detailed information about. Always include the source URL so users can view photos and additional details on AllRecipes.`;

export function getOptions(standalone = false): Options {
  return {
    systemPrompt: SYSTEM_PROMPT,
    model: "haiku",
    allowedTools: ALLOWED_TOOLS,
    maxTurns: 50,
    ...(standalone && { mcpServers: { mcp: MCP_CONFIG } }),
  };
}

export async function* streamAgent(prompt: string) {
  for await (const msg of query({ prompt, options: getOptions(true) })) {
    if (msg.type === "assistant") {
      for (const b of (msg as any).message?.content || []) {
        if (b.type === "text") yield { type: "text", text: b.text };
        if (b.type === "tool_use") yield { type: "tool", name: b.name };
      }
    }
    if ((msg as any).message?.usage) {
      const u = (msg as any).message.usage;
      yield { type: "usage", input: u.input_tokens || 0, output: u.output_tokens || 0 };
    }
    if ("result" in msg) yield { type: "result", text: msg.result };
  }
  yield { type: "done" };
}
