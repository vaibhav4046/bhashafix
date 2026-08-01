/**
 * Start a browser worker that BhashaFix can render through remotely.
 *
 * Why this exists: a Vercel function cannot host a full scan. The bundle limit
 * rules out shipping Chromium, and the 60 second execution cap is shorter than
 * a multi-route, multi-locale render matrix. Browser work therefore happens in
 * a worker — either the local CLI, or a Playwright-compatible websocket
 * endpoint that the scanner connects to.
 *
 * This script starts that endpoint locally so the remote path can be exercised
 * without a paid service. Point the scanner at it with:
 *
 *   BHASHAFIX_BROWSER_WS_ENDPOINT=ws://127.0.0.1:3210/ pnpm bhashafix scan --url <url>
 *
 * A hosted Browserless instance is a drop-in replacement for the same variable.
 */
import { chromium } from "@playwright/test";

const port = Number(process.env.BHASHAFIX_WORKER_PORT ?? 3210);
const server = await chromium.launchServer({ port, headless: true });
const endpoint = server.wsEndpoint();

console.log(
  [
    "BhashaFix browser worker running.",
    `  endpoint: ${endpoint}`,
    `  connect:  BHASHAFIX_BROWSER_WS_ENDPOINT=ws://127.0.0.1:${port}/`,
    "",
    "Stop with Ctrl+C.",
  ].join("\n"),
);

const close = async () => {
  await server.close();
  process.exit(0);
};
process.on("SIGINT", close);
process.on("SIGTERM", close);
