import { after } from "next/server";
import { verifyKey } from "@/lib/mcp/keys";
import { TOOLS, ToolError } from "@/lib/mcp/tools";
import * as toolState from "@/lib/mcp/tools";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Kun admin connector for Claude: a Model Context Protocol server (Streamable HTTP,
 * stateless, JSON responses). Add https://www.kunstores.com/api/mcp as a custom connector
 * in Claude with the header  Authorization: Bearer <key>  (keys are made in /admin/claude).
 */
export const runtime = "nodejs";
export const maxDuration = 60;

const VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];
const INSTRUCTIONS = [
  "Kun (كُن, kunstores.com) is a store builder for merchants in Syria. These tools manage every Kun store with admin rights.",
  "Stores are named by their slug. Start with list_stores or get_store. Prices are in each store's currency (USD or SYP); USD stores may show customers Syrian pounds through set_exchange_rate.",
  "All text customers see is in calm, formal Modern Standard Arabic (فصحى): no dialect, no hype, no exclamation marks, no urgency.",
  "For product pictures, call import_image with a public https link first, then use the returned path.",
  "bulk_update_prices is a dry run unless dry_run=false: show the preview to the user before applying.",
  "Deleting a product hides it unless permanent=true. Every call is logged (recent_actions).",
].join("\n");

type Rpc = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: Record<string, unknown> };
const reply = (id: Rpc["id"], result: unknown) => ({ jsonrpc: "2.0", id: id ?? null, result });
const error = (id: Rpc["id"], code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

function bearer(req: Request): string | null {
  const h = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1] : req.headers.get("x-api-key");
}

async function handle(msg: Rpc, keyId: string): Promise<unknown | null> {
  const isNote = msg.id === undefined;
  switch (msg.method) {
    case "initialize": {
      const asked = String(msg.params?.protocolVersion ?? "");
      return reply(msg.id, {
        protocolVersion: VERSIONS.includes(asked) ? asked : VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "kun-admin", title: "Kun Stores (admin)", version: "1.0.0" },
        instructions: INSTRUCTIONS,
      });
    }
    case "ping":
      return reply(msg.id, {});
    case "tools/list":
      return reply(msg.id, {
        tools: TOOLS.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
          annotations: { readOnlyHint: !t.write, destructiveHint: t.name === "delete_product" || t.name === "update_order", openWorldHint: t.name === "import_image" },
        })),
      });
    case "tools/call": {
      const name = String(msg.params?.name ?? "");
      const args = (msg.params?.arguments ?? {}) as Record<string, unknown>;
      const tool = TOOLS.find((t) => t.name === name);
      if (!tool) return error(msg.id, -32602, `Unknown tool: ${name}`);
      let ok = true;
      let message: string | null = null;
      let out: unknown;
      toolState.resetLastStore();
      try {
        out = await tool.run(args);
      } catch (e) {
        ok = false;
        message = e instanceof ToolError ? e.message : `Error: ${e instanceof Error ? e.message : String(e)}`;
        if (!(e instanceof ToolError)) console.error("mcp tool", name, e);
      }
      const storeId = toolState.lastStoreId;
      after(async () => {
        await supabaseAdmin().from("mcp_log").insert({ key_id: keyId, tool: name, store_id: storeId, input: args, ok, error: message });
      });
      return reply(msg.id, {
        content: [{ type: "text", text: ok ? JSON.stringify(out, null, 1) : message }],
        ...(ok && out && typeof out === "object" && !Array.isArray(out) ? { structuredContent: out } : {}),
        isError: !ok,
      });
    }
    default:
      if (isNote) return null; // notifications/initialized and others need no answer
      return error(msg.id, -32601, `Method not found: ${msg.method}`);
  }
}

export async function POST(req: Request) {
  const key = await verifyKey(bearer(req));
  if (!key)
    return Response.json(error(null, -32001, "Unauthorized: add the header Authorization: Bearer <key> (create a key in the Kun admin panel, /admin/claude)."), { status: 401 });
  let body: Rpc | Rpc[];
  try {
    body = await req.json();
  } catch {
    return Response.json(error(null, -32700, "Parse error"), { status: 400 });
  }
  const list = Array.isArray(body) ? body : [body];
  const out: unknown[] = [];
  for (const m of list) {
    if (!m || m.jsonrpc !== "2.0" || typeof m.method !== "string") {
      out.push(error(m?.id, -32600, "Invalid request"));
      continue;
    }
    const r = await handle(m, key.id);
    if (r) out.push(r);
  }
  if (!out.length) return new Response(null, { status: 202 });
  return Response.json(Array.isArray(body) ? out : out[0], { headers: { "Cache-Control": "no-store" } });
}

/** Stateless server: no event stream to open, no session to end. */
export function GET() {
  return new Response("Kun MCP server. Use POST.", { status: 405, headers: { Allow: "POST" } });
}
export function DELETE() {
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}
