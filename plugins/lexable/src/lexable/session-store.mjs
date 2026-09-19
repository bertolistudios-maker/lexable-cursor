import { promises as fs } from "node:fs";
import path from "node:path";

function emptySession() {
  return {
    version: 1,
    authenticated: false,
    mock: false,
    user: null,
    subscription: null,
    entitlements: { capabilities: [] },
    tokens: null,
    updatedAt: null,
  };
}

export async function readSession(config) {
  try {
    const raw = await fs.readFile(config.sessionPath, "utf8");
    const session = JSON.parse(raw);
    if (!session || typeof session !== "object") {
      return emptySession();
    }

    if (session.mock === true && !config.devMode) {
      return emptySession();
    }

    if (session.tokens && typeof session.tokens === "object") {
      if ("password" in session.tokens || "client_secret" in session.tokens) {
        return emptySession();
      }
    }

    return session;
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return emptySession();
    }
    return emptySession();
  }
}

export async function writeSession(config, session) {
  const dir = path.dirname(config.sessionPath);
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  const payload = {
    ...session,
    version: 1,
    updatedAt: new Date().toISOString(),
  };
  await fs.writeFile(config.sessionPath, `${JSON.stringify(payload, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  return payload;
}

export async function clearSession(config) {
  try {
    await fs.unlink(config.sessionPath);
  } catch (error) {
    if (error && error.code !== "ENOENT") {
      throw error;
    }
  }
}
