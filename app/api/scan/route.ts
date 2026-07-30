import { NextRequest, NextResponse } from "next/server";
import { runHostedHttpScan } from "@bhashafix/crawler";
import { localeProfile } from "@bhashafix/locale-engine";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const InputSchema = z
  .object({
    url: z.string().url().max(2048),
    sourceLocale: z.string().min(2).max(64),
    locales: z.array(z.string().min(2).max(64)).min(1).max(20),
    maxRoutes: z.number().int().min(1).max(5).optional(),
  })
  .strict();

const requests = new Map<string, { count: number; resetAt: number }>();
let activeScans = 0;
const MAX_CONCURRENT = 2;
const MAX_PER_MINUTE = 5;

function rateLimit(identity: string) {
  const now = Date.now();
  const current = requests.get(identity);
  if (!current || current.resetAt <= now) {
    requests.set(identity, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (current.count >= MAX_PER_MINUTE) return false;
  current.count += 1;
  return true;
}

export async function POST(request: NextRequest) {
  const identity =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  if (!rateLimit(identity)) {
    return NextResponse.json(
      { error: "Hosted scan rate limit exceeded. Try again in one minute." },
      { status: 429 },
    );
  }
  if (activeScans >= MAX_CONCURRENT) {
    return NextResponse.json(
      { error: "Hosted scan concurrency limit reached. Try again shortly." },
      { status: 429 },
    );
  }

  let input: z.infer<typeof InputSchema>;
  try {
    input = InputSchema.parse(await request.json());
    localeProfile(input.sourceLocale);
    input.locales.forEach(localeProfile);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Invalid scan configuration.",
      },
      { status: 400 },
    );
  }

  activeScans += 1;
  try {
    return NextResponse.json(await runHostedHttpScan(input));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Hosted scan runtime failure.",
      },
      { status: 422 },
    );
  } finally {
    activeScans -= 1;
  }
}
