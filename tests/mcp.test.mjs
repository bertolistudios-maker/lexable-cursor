import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const serverPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../plugins/lexable/src/mcp/server.mjs");

function rpc(id, method, params) {
  const json = JSON.stringify({ jsonrpc: "2.0", id, method, params });
  return Buffer.concat([Buffer.from(`Content-Length: ${Buffer.byteLength(json)}\r\n\r\n`), Buffer.from(json)]);
}

test("MCP server lists Lexable tools", async () => {
  const child = spawn(process.execPath, [serverPath], { stdio: ["pipe", "pipe", "pipe"] });
  const chunks = [];
  child.stdout.on("data", (chunk) => chunks.push(chunk));
  child.stdin.write(rpc(1, "initialize", { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "test", version: "1" } }));
  child.stdin.write(rpc(2, "tools/list", {}));

  const body = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("MCP server timed out"));
    }, 5000);
    child.stdout.on("data", () => {
      const text = Buffer.concat(chunks).toString("utf8");
      if (text.includes("lexable_status") && text.includes("lexable_local_audit")) {
        clearTimeout(timer);
        child.kill();
        resolve(text);
      }
    });
    child.on("error", reject);
  });

  assert.match(body, /lexable_login/);
  assert.match(body, /lexable_remote_scan/);
});
