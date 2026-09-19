#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import { createLexableClient } from "./lexable/index.mjs";
import { LexableBackendUnavailable } from "./lexable/api/client.mjs";
import { auditPaths } from "./audit/local-audit.mjs";
import { formatAudit, formatStatus } from "./format.mjs";

function print(text) {
  process.stdout.write(`${text}\n`);
}

function printJson(value) {
  print(JSON.stringify(value, null, 2));
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const command = args[0] || "help";
  const flags = {};
  const positionals = [];
  for (let i = 1; i < args.length; i += 1) {
    const token = args[i];
    if (token === "--json") {
      flags.json = true;
    } else if (token === "--no-browser") {
      flags.noBrowser = true;
    } else if (token.startsWith("--persona=")) {
      flags.persona = token.slice("--persona=".length);
    } else if (token === "--persona") {
      flags.persona = args[i + 1];
      i += 1;
    } else if (!token.startsWith("-")) {
      positionals.push(token);
    }
  }
  return { command, flags, positionals };
}

function helpText() {
  return `Lexable CLI

Usage:
  node src/cli.mjs <command>

Commands:
  login [--persona free|pro|agency|expired|unauthorized] [--no-browser]
  logout
  status [--json]
  entitlements [--json]
  can <capability>
  audit [path...] [--json]
  remote-scan [--json]
  help

Login never asks for a password in the plugin.
Development mock login requires LEXABLE_ENV=development and LEXABLE_DEV_MODE=true.
`;
}

async function main() {
  const { command, flags, positionals } = parseArgs(process.argv);
  const client = await createLexableClient(process.env);

  try {
    if (command === "help" || command === "--help" || command === "-h") {
      print(helpText());
      return;
    }

    if (command === "login") {
      if (flags.persona && !client.config.devMode) {
        throw new Error("--persona is only available in development mode.");
      }
      const options = {
        persona: flags.persona,
        openBrowser: flags.noBrowser ? null : undefined,
      };
      if (flags.persona && flags.noBrowser) {
        const session = await client.login({ persona: flags.persona });
        if (flags.json) {
          printJson({ ok: true, session: { ...session, tokens: session.tokens ? { mock: true } : null } });
        } else {
          print("Development mock login stored. This is not a real Lexable session.");
          print(formatStatus(await client.getStatus()));
        }
        return;
      }
      if (!client.config.devMode) {
        print("LEXABLE LOGIN");
        print("Opening the Lexable site in your browser. Sign in there. The plugin never asks for a password.");
        await client.login(options);
        print(formatStatus(await client.getStatus()));
        return;
      }
      if (flags.noBrowser && !flags.persona) {
        const { createDevLoginServer } = await import("./lexable/auth/browser-login.mjs");
        const server = await createDevLoginServer(client.config);
        print("LEXABLE LOGIN");
        print("MODE: DEVELOPMENT (mock)");
        print("");
        print("Open this URL in a browser (no password):");
        print(server.loginUrl);
        const snapshot = await server.completed;
        await server.close();
        const { writeSession } = await import("./lexable/session-store.mjs");
        await writeSession(client.config, snapshot);
        print("");
        print(formatStatus(await client.getStatus()));
        return;
      }
      print("LEXABLE LOGIN");
      print("MODE: DEVELOPMENT (mock) — opening browser. No password is requested.");
      await client.login(options);
      print(formatStatus(await client.getStatus()));
      return;
    }

    if (command === "logout") {
      await client.logout();
      if (flags.json) {
        printJson({ ok: true, authenticated: false });
      } else {
        print("Logged out. Local mock/real session cleared.");
      }
      return;
    }

    if (command === "status") {
      const status = await client.getStatus();
      if (flags.json) {
        printJson(status);
      } else {
        print(formatStatus(status));
      }
      return;
    }

    if (command === "entitlements") {
      const entitlements = await client.getEntitlements();
      if (flags.json) {
        printJson(entitlements);
      } else {
        print(entitlements.capabilities.join("\n") || "(none)");
      }
      return;
    }

    if (command === "can") {
      const capability = positionals[0];
      if (!capability) {
        process.exitCode = 2;
        print("Usage: can <capability>");
        return;
      }
      const allowed = await client.can(capability);
      if (flags.json) {
        printJson({ capability, allowed });
      } else {
        print(allowed ? "true" : "false");
      }
      process.exitCode = allowed ? 0 : 1;
      return;
    }

    if (command === "audit") {
      const targets = positionals.length > 0 ? positionals : ["."];
      const result = await auditPaths(targets, { cwd: process.cwd() });
      await client.track("audit");
      if (flags.json) {
        printJson(result);
      } else {
        print(formatAudit(result));
      }
      return;
    }

    if (command === "remote-scan") {
      const result = await client.remoteScan();
      await client.track("remote_scan");
      if (flags.json) {
        printJson(result);
      } else {
        print(result.status);
        print(result.message);
      }
      return;
    }

    process.exitCode = 2;
    print(`Unknown command: ${command}`);
    print(helpText());
  } catch (error) {
    process.exitCode = 1;
    if (error instanceof LexableBackendUnavailable) {
      print("REQUIRES LEXABLE BACKEND");
      print(error.message);
      return;
    }
    print(error.message || String(error));
  }
}

const invoked = process.argv[1] && path.basename(process.argv[1]) === "cli.mjs";
if (invoked || process.argv[1]?.endsWith("/cli.mjs")) {
  await main();
}

export { formatAudit, formatStatus, main };
