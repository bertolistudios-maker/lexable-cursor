#!/usr/bin/env node

import { createLexableClient } from "../lexable/index.mjs";
import { CAPABILITY_CATALOG } from "../lexable/capabilities.mjs";
import { formatAudit, formatStatus } from "../format.mjs";
import { auditPaths } from "../audit/local-audit.mjs";

function writeMessage(message) {
  const json = JSON.stringify(message);
  const header = Buffer.from(`Content-Length: ${Buffer.byteLength(json, "utf8")}\r\n\r\n`, "utf8");
  process.stdout.write(header);
  process.stdout.write(json);
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
    const result = await auditPaths([args?.path || "."], { cwd: process.cwd() });
    return formatAudit(result);
  }
  if (name === "lexable_remote_scan") {
    return JSON.stringify(await client.remoteScan(), null, 2);
  }
  throw new Error(`Unknown tool: ${name}`);
}

async function handle(message) {
  if (message.method === "initialize") {
    return {
      jsonrpc: "2.0",
      id: message.id,
      result: {
        protocolVersion: "2024-11-05",
        serverInfo: { name: "lexable", version: "1.1.0" },
        capabilities: { tools: {} },
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
      return toolResult(message.id, error.message || String(error), true);
    }
  }
  if (message.method === "ping") {
    return { jsonrpc: "2.0", id: message.id, result: {} };
  }
  return {
    jsonrpc: "2.0",
    id: message.id,
    error: { code: -32601, message: `Method not found: ${message.method}` },
  };
}

async function processBuffer(buffer) {
  let remaining = buffer;
  while (true) {
    const headerEnd = remaining.indexOf("\r\n\r\n");
    if (headerEnd === -1) {
      return remaining;
    }
    const header = remaining.slice(0, headerEnd).toString("utf8");
    const match = header.match(/Content-Length:\s*(\d+)/i);
    if (!match) {
      throw new Error("Missing Content-Length header");
    }
    const length = Number(match[1]);
    const bodyStart = headerEnd + 4;
    if (remaining.length < bodyStart + length) {
      return remaining;
    }
    const body = remaining.slice(bodyStart, bodyStart + length).toString("utf8");
    remaining = remaining.slice(bodyStart + length);
    const message = JSON.parse(body);
    const response = await handle(message);
    if (response) {
      writeMessage(response);
    }
  }
}

let stdinBuffer = Buffer.alloc(0);
process.stdin.on("data", async (chunk) => {
  stdinBuffer = Buffer.concat([stdinBuffer, chunk]);
  try {
    stdinBuffer = await processBuffer(stdinBuffer);
  } catch (error) {
    writeMessage({
      jsonrpc: "2.0",
      error: { code: -32700, message: error.message },
    });
  }
});

