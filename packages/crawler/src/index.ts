import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export type UrlPolicy = {
  hosted: boolean;
  allowLocalhost: boolean;
  allowedProtocols?: string[];
};

const LOCAL_HOSTS = new Set(["localhost", "localhost.localdomain"]);
const METADATA_HOSTS = new Set([
  "169.254.169.254",
  "metadata.google.internal",
  "metadata.azure.internal",
]);

export function isPrivateAddress(address: string): boolean {
  const normalized = address.toLowerCase();
  if (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fe80:") ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd")
  ) {
    return true;
  }
  const parts = normalized.split(".").map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return false;
  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

export async function validateTargetUrl(input: string, policy: UrlPolicy) {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("Target must be a valid absolute URL.");
  }
  const allowed = policy.allowedProtocols ?? ["http:", "https:"];
  if (!allowed.includes(url.protocol)) {
    throw new Error(`Protocol ${url.protocol} is not allowed.`);
  }
  if (url.username || url.password) {
    throw new Error("Credentials in target URLs are not allowed.");
  }
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (METADATA_HOSTS.has(hostname)) {
    throw new Error("Cloud metadata destinations are blocked.");
  }
  if (LOCAL_HOSTS.has(hostname) && !(policy.allowLocalhost && !policy.hosted)) {
    throw new Error("Loopback destinations are blocked in hosted scans.");
  }
  const addresses = isIP(hostname)
    ? [{ address: hostname }]
    : await lookup(hostname, { all: true, verbatim: true });
  if (
    addresses.some(({ address }) => isPrivateAddress(address)) &&
    !(policy.allowLocalhost && !policy.hosted)
  ) {
    throw new Error("Private-network destinations are blocked.");
  }
  return url;
}

export async function fetchWithPolicy(
  input: string,
  policy: UrlPolicy & {
    timeoutMs?: number;
    redirectLimit?: number;
    maxBytes?: number;
  },
) {
  const timeoutMs = policy.timeoutMs ?? 12_000;
  const redirectLimit = policy.redirectLimit ?? 5;
  const maxBytes = policy.maxBytes ?? 2_000_000;
  let url = await validateTargetUrl(input, policy);
  for (let redirect = 0; redirect <= redirectLimit; redirect += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetch(url, {
        redirect: "manual",
        signal: controller.signal,
        headers: { "user-agent": "BhashaFix/0.2 (+localisation verification)" },
      });
    } finally {
      clearTimeout(timer);
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Redirect response omitted Location.");
      if (redirect === redirectLimit) throw new Error("Redirect limit exceeded.");
      url = await validateTargetUrl(new URL(location, url).href, policy);
      continue;
    }
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > maxBytes) throw new Error("Response exceeds size limit.");
    const buffer = new Uint8Array(await response.arrayBuffer());
    if (buffer.byteLength > maxBytes) throw new Error("Response exceeds size limit.");
    return {
      url: url.href,
      status: response.status,
      contentType: response.headers.get("content-type") ?? "",
      body: new TextDecoder().decode(buffer),
    };
  }
  throw new Error("Redirect limit exceeded.");
}
