import { redactSecrets } from "@bhashafix/extractor";
import { EXIT } from "./exit-codes";

export type Failure = {
  /** One sentence naming what went wrong. */
  message: string;
  /** The command or change that fixes it, when there is a specific one. */
  remedy: string | null;
  exit: number;
};

/** The exit-code mapping this CLI has always used for unclassified errors. */
export function fallbackExit(message: string) {
  return /config|locale|allowlist|issue ID|required/i.test(message)
    ? EXIT.invalidConfig
    : /fetch|target|URL|ENOTFOUND|ECONN/i.test(message)
      ? EXIT.unavailable
      : EXIT.runtime;
}

/**
 * Describe a failure in terms a user can act on.
 *
 * Playwright and Chromium report expected conditions — a browser that was
 * never downloaded, a host that does not resolve — as multi-line diagnostics
 * with stack traces. Those are the common failures, so each one gets a
 * sentence and, where one exists, the command that fixes it.
 */
export function describeFailure(error: unknown): Failure {
  const raw = redactSecrets(
    error instanceof Error ? error.message : String(error),
  );
  const first =
    raw
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !/^at\s/.test(line))[0] ?? raw;

  if (/Executable doesn't exist|playwright install/i.test(raw)) {
    return {
      message: "The Chromium build Playwright needs is not installed here.",
      remedy: 'Run "npx playwright install chromium", then try again.',
      exit: EXIT.runtime,
    };
  }
  if (/Playwright is not installed/i.test(raw)) {
    return {
      message: "Playwright is not installed alongside this CLI.",
      remedy:
        'Run "npm install playwright" and then "npx playwright install chromium".',
      exit: EXIT.runtime,
    };
  }
  if (/ERR_NAME_NOT_RESOLVED|ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(raw)) {
    return {
      message: "The target host could not be resolved.",
      remedy: "Check the spelling of --url and this machine's network access.",
      exit: EXIT.unavailable,
    };
  }
  if (/ERR_CONNECTION_REFUSED|ECONNREFUSED/i.test(raw)) {
    return {
      message: "Nothing accepted a connection at the target address.",
      remedy:
        "Start the site, or point --url at an origin that is already serving.",
      exit: EXIT.unavailable,
    };
  }
  if (/ERR_CERT|ERR_SSL|CERT_HAS_EXPIRED|self.signed certificate/i.test(raw)) {
    return {
      message: "The target rejected the TLS handshake.",
      remedy: "Fix the certificate, or scan the http:// origin instead.",
      exit: EXIT.unavailable,
    };
  }
  if (/Timeout .*exceeded|ERR_TIMED_OUT|ETIMEDOUT/i.test(raw)) {
    return {
      message: "The target did not finish loading before the render timeout.",
      remedy:
        "Confirm the URL responds, then narrow --routes, --locales or --viewports.",
      exit: EXIT.unavailable,
    };
  }
  if (/ERR_ABORTED|ERR_EMPTY_RESPONSE|ERR_CONNECTION_RESET/i.test(raw)) {
    return {
      message: "The target closed the connection while the page was loading.",
      remedy: "Confirm the URL serves HTML, then try again.",
      exit: EXIT.unavailable,
    };
  }
  if (/axe could not be run/i.test(raw)) {
    return {
      message: "The accessibility pass could not run on the rendered page.",
      remedy: 'Install "@axe-core/playwright" alongside the CLI, then rescan.',
      exit: EXIT.runtime,
    };
  }
  return { message: first, remedy: null, exit: fallbackExit(raw) };
}

/** How long a graceful browser close is given before the process leaves. */
const INTERRUPT_GRACE_MS = 3_000;

/**
 * Run browser work with Ctrl+C handled.
 *
 * Playwright installs its own SIGINT and process-exit handlers when it launches
 * a browser, which close and then kill the browser it started. This handler
 * runs first, so the interruption is reported as one line instead of a stack
 * trace, and a grace window is left for that graceful close before leaving.
 * A second Ctrl+C leaves immediately.
 */
export async function withInterruptHandling<T>(
  io: { error(message: string): void },
  work: () => Promise<T>,
): Promise<T> {
  let interrupted = false;
  const onInterrupt = () => {
    if (interrupted) {
      process.exit(130);
    }
    interrupted = true;
    io.error("Interrupted. Closing the browser and exiting.");
    setTimeout(() => process.exit(130), INTERRUPT_GRACE_MS).unref();
  };
  process.on("SIGINT", onInterrupt);
  try {
    return await work();
  } catch (error) {
    // Closing the browser aborts the page that was loading. Report that as the
    // interruption it is rather than blaming the target for the failure.
    if (interrupted) {
      throw new Error(
        "The scan was interrupted before it finished, so no report was written.",
      );
    }
    throw error;
  } finally {
    process.off("SIGINT", onInterrupt);
  }
}
