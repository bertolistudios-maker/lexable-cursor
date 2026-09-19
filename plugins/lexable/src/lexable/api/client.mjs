export class LexableBackendUnavailable extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "LexableBackendUnavailable";
    this.code = "REQUIRES_LEXABLE_BACKEND";
    this.details = details;
  }
}

export async function fetchDiscovery(config) {
  if (!config.apiBaseUrl) {
    throw new LexableBackendUnavailable(
      "LEXABLE_API_BASE_URL is not set. Real authentication is not available until the Lexable backend publishes plugin discovery. See docs/BACKEND-CONTRACT.md."
    );
  }

  const url = new URL(config.discoveryPath, `${config.apiBaseUrl}/`).toString();

  let response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        "user-agent": "lexable-cursor-plugin/1.0.0",
      },
    });
  } catch (error) {
    throw new LexableBackendUnavailable(
      `Could not reach Lexable plugin discovery at ${url}.`,
      { url, cause: error.message }
    );
  }

  if (!response.ok) {
    throw new LexableBackendUnavailable(
      `Lexable plugin discovery is not available (${response.status} ${response.statusText}) at ${url}.`,
      { url, status: response.status }
    );
  }

  const body = await response.json();
  const required = [
    "authorization_endpoint",
    "token_endpoint",
    "userinfo_endpoint",
    "subscription_endpoint",
    "entitlements_endpoint",
  ];
  const missing = required.filter((key) => typeof body?.[key] !== "string" || body[key].length === 0);
  if (missing.length > 0) {
    throw new LexableBackendUnavailable(
      `Lexable plugin discovery document is missing required fields: ${missing.join(", ")}.`,
      { url, missing }
    );
  }

  return { url, document: body };
}

export async function authorizedGet(url, accessToken) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${accessToken}`,
      "user-agent": "lexable-cursor-plugin/1.0.0",
    },
  });
  if (!response.ok) {
    const error = new Error(`Lexable API request failed (${response.status}) for ${url}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}
