import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const serverPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../plugins/lexable/src/mcp/server.mjs");

function ndjson(id, method, params) {
  return `${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`;
}

function contentLength(id, method, params) {
  const json = JSON.stringify({ jsonrpc: "2.0", id, method, params });
  return Buffer.concat([Buffer.from(`Content-Length: ${Buffer.byteLength(json)}\r\n\r\n`), Buffer.from(json)]);
}

async function handshake(writePayload) {
  const child = spawn(process.execPath, [serverPath], { stdio: ["pipe", "pipe", "pipe"] });
  const chunks = [];
  const body = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`MCP server timed out: ${Buffer.concat(chunks).toString("utf8")}`));
    }, 5000);
    child.stdout.on("data", (chunk) => {
      chunks.push(chunk);
      const text = Buffer.concat(chunks).toString("utf8");
      if (text.includes("lexable_status") && text.includes("lexable_local_audit")) {
        clearTimeout(timer);
        child.kill();
        resolve(text);
      }
    });
    child.on("error", reject);
  });
  writePayload(child.stdin);
  return body;
}

test("MCP server completes Cursor NDJSON initialize and lists tools", async () => {
  const body = await handshake((stdin) => {
    stdin.write(
      ndjson(1, "initialize", {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "test", version: "1" },
      }) + ndjson(2, "tools/list", {})
    );
  });
  assert.match(body, /lexable_login/);
  assert.match(body, /lexable_remote_scan/);
  assert.doesNotMatch(body, /Content-Length/);
  assert.match(body, /2025-06-18/);
});

test("MCP server still accepts Content-Length framing", async () => {
  const body = await handshake((stdin) => {
    stdin.write(
      Buffer.concat([
        contentLength(1, "initialize", {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "test", version: "1" },
        }),
        contentLength(2, "tools/list", {}),
      ])
    );
  });
  assert.match(body, /lexable_status/);
});
