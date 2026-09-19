#!/usr/bin/env node

import { createLexableClient } from "../lexable/index.mjs";
import { CAPABILITY_CATALOG } from "../lexable/capabilities.mjs";
import { formatAudit, formatStatus, LexableNotEntitled } from "../format.mjs";
import { auditPaths } from "../audit/local-audit.mjs";
import { PLUGIN_VERSION } from "../lexable/config.mjs";

const SUPPORTED_PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

function writeMessage(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function toolResult(id, text, isError = false) {
  return {
    jsonrpc: "2.0",
    id,
    result: {
      content: [{ type: "text", text }],
      isError,
    },
  };
}

const tools = [
  {
    name: "lexable_status",
    description: "Show Lexable authentication, subscription display data, and entitlements. Development mocks are labeled as mocks.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "lexable_login",
    description: "Start Lexable login. Never collect a password. In development mode, opens a local mock authorization page or accepts a persona.",
    inputSchema: {
      type: "object",
      properties: {
        persona: {
          type: "string",
          enum: ["unauthorized", "free", "pro", "agency", "expired"],
          description: "Development-only persona. Ignored unless LEXABLE_DEV_MODE is active.",
        },
      },
    },
  },
  {
    name: "lexable_logout",
    description: "Clear the local Lexable session.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "lexable_entitlements",
    description: "Return capability IDs from the entitlement adapter. Do not infer access from a local plan string.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "lexable_can",
    description: "Check a single capability id such as accessibility.audit or lexable.remote_scan.",
    inputSchema: {
      type: "object",
      properties: {
        capability: { type: "string" },
      },
      required: ["capability"],
    },
  },
  {
    name: "lexable_local_audit",
    description: "Run plugin-local static accessibility analysis on the current workspace. This is not a Lexable cloud scan and does not claim WCAG conformance.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative path to a file or directory. Defaults to the workspace root." },
      },
    },
  },
  {
    name: "lexable_remote_scan",
    description: "Attempt a Lexable remote scan. Returns REQUIRES_LEXABLE_BACKEND until the backend publishes a scan endpoint.",
    inputSchema: { type: "object", properties: {} },
  },
];

async function callTool(name, args) {
  const client = await createLexableClient(process.env);
  if (name === "lexable_status") {
    return formatStatus(await client.getStatus());
  }
  if (name === "lexable_login") {
    await client.login({ persona: args?.persona, openBrowser: args?.persona ? null : undefined });
    return formatStatus(await client.getStatus());
  }
  if (name === "lexable_logout") {
    await client.logout();
    return "Logged out.";
  }
  if (name === "lexable_entitlements") {
    return JSON.stringify(await client.getEntitlements(), null, 2);
  }
  if (name === "lexable_can") {
    const allowed = await client.can(args.capability);
    return JSON.stringify({ capability: args.capability, allowed, catalog: CAPABILITY_CATALOG.map((item) => item.id) }, null, 2);
  }
  if (name === "lexable_local_audit") {
    await client.assertCan("accessibility.audit");
    const result = await auditPaths([args?.path || "."], { cwd: process.cwd() });
    return formatAudit(result);
  }
  if (name === "lexable_remote_scan") {
    return JSON.stringify(await client.remoteScan(), null, 2);
  }
  throw new Error(`Unknown tool: ${name}`);
}

function negotiateProtocolVersion(requested) {
  if (typeof requested === "string" && SUPPORTED_PROTOCOL_VERSIONS.includes(requested)) {
    return requested;
  }
  return "2025-03-26";
}

async function handle(message) {
  if (message.method === "initialize") {
    return {
      jsonrpc: "2.0",
      id: message.id,
      result: {
        protocolVersion: negotiateProtocolVersion(message.params?.protocolVersion),
        serverInfo: { name: "lexable", version: PLUGIN_VERSION },
        capabilities: { tools: { listChanged: false } },
      },
    };
  }
  if (message.method === "notifications/initialized" || message.method === "notifications/cancelled") {
    return null;
  }
  if (message.method === "tools/list") {
    return { jsonrpc: "2.0", id: message.id, result: { tools } };
  }
  if (message.method === "tools/call") {
    try {
      const text = await callTool(message.params.name, message.params.arguments || {});
      return toolResult(message.id, text);
    } catch (error) {
      if (error instanceof LexableNotEntitled) {
        return toolResult(message.id, error.message, true);
      }
      return toolResult(message.id, error.message || String(error), true);
    }
  }
  if (message.method === "ping") {
    return { jsonrpc: "2.0", id: message.id, result: {} };
  }
  if (message.id === undefined) {
    return null;
  }
  return {
    jsonrpc: "2.0",
    id: message.id,
    error: { code: -32601, message: `Method not found: ${message.method}` },
  };
}

function extractMessages(buffer) {
  const messages = [];
  let remaining = buffer;

  while (remaining.length > 0) {
    if (remaining[0] === 0x7b) {
      const newline = remaining.indexOf(0x0a);
      if (newline === -1) {
        break;
      }
      const line = remaining.slice(0, newline).toString("utf8").replace(/\r$/, "");
      remaining = remaining.slice(newline + 1);
      if (line.trim() === "") {
        continue;
      }
      messages.push(JSON.parse(line));
      continue;
    }

    const headerEnd = remaining.indexOf("\r\n\r\n");
    if (headerEnd === -1) {
      break;
    }
    const header = remaining.slice(0, headerEnd).toString("utf8");
    const match = header.match(/Content-Length:\s*(\d+)/i);
    if (!match) {
      const skip = remaining.indexOf(0x0a);
      if (skip === -1) {
        break;
      }
      remaining = remaining.slice(skip + 1);
      continue;
    }
    const length = Number(match[1]);
    const bodyStart = headerEnd + 4;
    if (remaining.length < bodyStart + length) {
      break;
    }
    const body = remaining.slice(bodyStart, bodyStart + length).toString("utf8");
    remaining = remaining.slice(bodyStart + length);
    messages.push(JSON.parse(body));
  }

  return { messages, remaining };
}

let stdinBuffer = Buffer.alloc(0);
let queue = Promise.resolve();

function enqueue(chunk) {
  queue = queue
    .then(async () => {
      stdinBuffer = Buffer.concat([stdinBuffer, chunk]);
      const extracted = extractMessages(stdinBuffer);
      stdinBuffer = extracted.remaining;
      for (const message of extracted.messages) {
        const response = await handle(message);
        if (response) {
          writeMessage(response);
        }
      }
    })
    .catch((error) => {
      process.stderr.write(`lexable MCP: ${error.message || error}\n`);
    });
}

process.stdin.on("data", (chunk) => enqueue(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
process.stdin.on("end", () => {
  queue.finally(() => process.exit(0));
});
process.stdin.resume();
