import os from "node:os";
import path from "node:path";

export const PLUGIN_NAME = "lexable";
export const PLUGIN_DISPLAY_NAME = "Lexable Accessibility";
export const PUBLISHER = "Bertoli Studios";

export function defaultSessionPath() {
  return path.join(os.homedir(), ".lexable", "cursor-plugin-session.json");
}

export function loadConfig(env = process.env) {
  const lexableEnv = String(env.LEXABLE_ENV || "")
    .trim()
    .toLowerCase();
  const devFlag = String(env.LEXABLE_DEV_MODE || "").trim() === "true";
  const isProduction = lexableEnv === "production";

  // Mock mode is opt-in and impossible to confuse with production:
  // it requires LEXABLE_ENV=development AND LEXABLE_DEV_MODE=true.
  // LEXABLE_DEV_MODE is ignored when LEXABLE_ENV=production or unset.
  const devMode = !isProduction && lexableEnv === "development" && devFlag;

  return {
    env: lexableEnv || "unset",
    isProduction,
    devMode,
    apiBaseUrl: String(env.LEXABLE_API_BASE_URL || "").replace(/\/+$/, ""),
    clientId: String(env.LEXABLE_CLIENT_ID || "").trim(),
    discoveryPath: String(env.LEXABLE_DISCOVERY_PATH || "/.well-known/lexable-plugin.json"),
    sessionPath: env.LEXABLE_SESSION_PATH || defaultSessionPath(),
  };
}

export function assertDevMode(config) {
  if (!config.devMode) {
    const error = new Error(
      "Development mode is not active. Mock login is disabled. Set LEXABLE_ENV=development and LEXABLE_DEV_MODE=true. This combination is ignored when LEXABLE_ENV=production."
    );
    error.code = "DEV_MODE_REQUIRED";
    throw error;
  }
}
