import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { runServerlessScan } from "@bhashafix/browser/serverless";
import { validateTargetUrl } from "@bhashafix/crawler";
import { localeProfile } from "@bhashafix/locale-engine";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Hosted quick scan: a real Chromium render inside the function.
 *
 * This is bounded on purpose. The function has a 60 second ceiling and a cold
 * start of several seconds, so it covers one route across at most three
 * locales at one viewport. A full route × locale × viewport matrix, source
 * repair and persisted artifacts belong to the CLI.
 *
 * Nothing is stored: this deployment has no database, so the response is the
 * only copy and `persisted` says so.
 */
const InputSchema = z
  .object({
    url: z.string().url().max(2048),
    sourceLocale: z.string().min(2).max(64).default("en-GB"),
    locales: z.array(z.string().min(2).max(64)).min(1).max(3),
    viewport: z.enum(["mobile", "tablet", "desktop"]).default("mobile"),
  })
  .strict();

const VIEWPORTS = {
  mobile: { name: "mobile", width: 390, height: 844 },
  tablet: { name: "tablet", width: 768, height: 1024 },
  desktop: { name: "desktop", width: 1440, height: 900 },
} as const;

/**
 * Turn a rejected target into something a person can act on.
 *
 * The safety messages from the URL policy are already written for humans and
 * are passed through. A DNS failure arrives as a raw libuv string, which is
 * not.
 */
function describeTargetRejection(error: unknown, url: string): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/getaddrinfo|ENOTFOUND|EAI_AGAIN|EBUSY/i.test(message)) {
    let host = url;
    try {
      host = new URL(url).hostname;
    } catch {
      /* keep the raw input */
    }
    return `${host} could not be resolved. Check the domain and try again.`;
  }
  if (/ECONNREFUSED/i.test(message)) {
    return "The target refused the connection.";
  }
  return message;
}

/** One browser per instance: a second concurrent launch exhausts the memory. */
let active = 0;

export async function POST(request: NextRequest) {
  if (active > 0) {
    return NextResponse.json(
      {
        error:
          "A browser scan is already running on this instance. Hosted scans are single-flight; use the CLI for concurrent work.",
      },
      { status: 429 },
    );
  }

  let input: z.infer<typeof InputSchema>;
  try {
    const parsed = InputSchema.safeParse(await request.json());
    if (!parsed.success) {
      // A caller gets a sentence, not a serialised validation tree.
      const first = parsed.error.issues[0];
      const field = first?.path.join(".") || "request";
      return NextResponse.json(
        {
          error:
            field === "url"
              ? "That is not a valid URL. Include the scheme, for example https://example.com."
              : `${field}: ${first?.message ?? "is not valid"}.`,
        },
        { status: 400 },
      );
    }
    input = parsed.data;
    localeProfile(input.sourceLocale);
    input.locales.forEach(localeProfile);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid scan configuration." },
      { status: 400 },
    );
  }

  let target: URL;
  try {
    target = await validateTargetUrl(input.url, { hosted: true, allowLocalhost: false });
  } catch (error) {
    return NextResponse.json(
      { error: describeTargetRejection(error, input.url) },
      { status: 400 },
    );
  }

  const scanId = `hosted-${randomUUID()}`;
  const startedAt = new Date().toISOString();
  const route = target.pathname || "/";

  active += 1;
  try {
    const result = await runServerlessScan({
      scanId,
      origin: "LIVE_PUBLIC_BROWSER_SCAN",
      target,
      route,
      sourceLocale: input.sourceLocale,
      locales: input.locales,
      viewport: VIEWPORTS[input.viewport],
    });

    return NextResponse.json({
      scanId,
      origin: "LIVE_PUBLIC_BROWSER_SCAN",
      status: result.issues.length > 0 ? "completed_with_warnings" : "completed",
      engine: result.engine,
      startedAt,
      completedAt: new Date().toISOString(),
      target: target.href,
      sourceLocale: input.sourceLocale,
      scope: {
        routes: 1,
        locales: input.locales.length,
        viewports: 1,
        browserRendered: true,
        axeExecuted: result.axeExecuted,
        repositoryAccess: false,
      },
      persisted: false,
      persistenceNote:
        "This deployment has no configured database, so the scan is not stored server-side. The response is the only copy; the CLI persists scans locally.",
      summary: {
        renders: result.renders.length,
        issues: result.issues.length,
        blocking: result.issues.filter((issue) => issue.severity === "blocking").length,
      },
      renders: result.renders,
      issues: result.issues,
      notRun: [
        "routes other than the one submitted",
        "viewports other than the one selected",
        "source repair, which needs repository access",
      ],
      limitations: [
        "The function has a 60 second ceiling, so this covers one route, up to three locales and one viewport.",
        "Run the CLI, or point BHASHAFIX_BROWSER_WS_ENDPOINT at a browser worker, for a full route x locale x viewport matrix with persisted artifacts.",
      ],
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Hosted browser scan failed.",
        // The first frames say which stage failed. A scan that cannot run is
        // more useful with them than without.
        detail:
          error instanceof Error && error.stack
            ? error.stack.split("\n").slice(0, 6).join("\n")
            : null,
        scanId,
        browserRendered: false,
      },
      { status: 422 },
    );
  } finally {
    active -= 1;
  }
}
