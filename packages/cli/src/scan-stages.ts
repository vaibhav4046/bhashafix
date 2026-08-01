import { stat } from "node:fs/promises";
import type { RenderedRoute } from "@bhashafix/browser";

/**
 * `ok` means the stage ran and produced evidence. `skipped` means it did not
 * run at all. `failed` means it ran and produced nothing usable. Nothing else
 * may be reported, and no stage is ever assumed — every value below is read
 * back off the render results the engine actually returned.
 */
export type StageStatus = "ok" | "skipped" | "failed";

export type ScanStage = {
  name: string;
  status: StageStatus;
  detail: string;
};

export type StageEvidence = {
  /** Routes supplied with `--routes` rather than discovered from the page. */
  routesFromFlag: boolean;
  routes: string[];
  discoveredRoutes: number;
  renders: RenderedRoute[];
  engine: string;
  remote: boolean;
};

export type ScanStages = {
  stages: ScanStage[];
  measuredElements: number;
  axeRenders: number;
  axeViolations: number;
  screenshotsOnDisk: string[];
  screenshotBytes: number;
  consoleErrors: number;
  failedRequests: number;
};

function plural(count: number, singular: string, pluralForm = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/** Screenshot paths the engine reported AND that exist on disk with content. */
async function verifyScreenshots(renders: RenderedRoute[]) {
  const files: string[] = [];
  let bytes = 0;
  for (const render of renders) {
    if (!render.screenshotPath) continue;
    try {
      const info = await stat(render.screenshotPath);
      if (!info.isFile() || info.size === 0) continue;
      files.push(render.screenshotPath);
      bytes += info.size;
    } catch {
      // A path the engine reported but that is not readable is not evidence.
    }
  }
  return { files, bytes };
}

/**
 * Turn what the engine actually did into the stage list the CLI prints.
 *
 * Every tick below is derived from a render result: a missing screenshot, an
 * accessibility pass that never ran, or a page with no measurable elements all
 * report as themselves rather than as a green tick.
 */
export async function deriveScanStages(
  evidence: StageEvidence,
): Promise<ScanStages> {
  const { renders } = evidence;
  const renderCount = renders.length;
  const measuredElements = renders.reduce(
    (total, render) => total + render.measurement.elements.length,
    0,
  );
  const axeRenders = renders.filter(
    (render) => render.request.runAxe === true,
  ).length;
  const axeViolations = renders.reduce(
    (total, render) => total + render.runtime.axeViolations.length,
    0,
  );
  const consoleErrors = renders.reduce(
    (total, render) => total + render.runtime.consoleErrors.length,
    0,
  );
  const failedRequests = renders.reduce(
    (total, render) => total + render.runtime.failedRequests.length,
    0,
  );
  const respondingRenders = renders.filter(
    (render) => render.runtime.status > 0,
  ).length;
  const screenshots = await verifyScreenshots(renders);

  const stages: ScanStage[] = [];

  stages.push(
    evidence.routesFromFlag
      ? {
          name: "Route discovery",
          status: "skipped",
          detail: `${plural(evidence.routes.length, "route")} supplied with --routes`,
        }
      : {
          name: "Route discovery",
          status: evidence.routes.length > 0 ? "ok" : "failed",
          detail:
            evidence.routes.length > 0
              ? `${plural(evidence.routes.length, "route")} scanned of ${evidence.discoveredRoutes} found on the entry page`
              : "no route could be derived from the entry page",
        },
  );

  stages.push({
    name: "Browser rendering",
    status: renderCount > 0 ? "ok" : "failed",
    detail:
      renderCount > 0
        ? `${plural(renderCount, "render")} on ${evidence.engine} (${evidence.remote ? "remote endpoint" : "local install"})`
        : "no page was rendered",
  });

  stages.push({
    name: "DOM measurement",
    status: measuredElements > 0 ? "ok" : "failed",
    detail:
      measuredElements > 0
        ? `${plural(measuredElements, "element")} measured across ${plural(renderCount, "render")}`
        : "no element was measured",
  });

  stages.push({
    name: "Accessibility checks",
    status: axeRenders > 0 ? "ok" : "skipped",
    detail:
      axeRenders === 0
        ? "axe-core did not run on any render"
        : `axe-core ran on ${axeRenders} of ${plural(renderCount, "render")}, ${plural(axeViolations, "violation")}`,
  });

  stages.push({
    name: "Screenshot capture",
    status: screenshots.files.length > 0 ? "ok" : "skipped",
    detail:
      screenshots.files.length > 0
        ? `${plural(screenshots.files.length, "PNG")} written, ${Math.round(screenshots.bytes / 1024)} KB on disk`
        : "no screenshot was written",
  });

  stages.push({
    name: "Runtime inspection",
    status: respondingRenders > 0 ? "ok" : "failed",
    detail:
      respondingRenders > 0
        ? `${plural(respondingRenders, "response")} recorded, ${plural(consoleErrors, "console error")}, ${plural(failedRequests, "failed request")}`
        : "no HTTP response was recorded",
  });

  return {
    stages,
    measuredElements,
    axeRenders,
    axeViolations,
    screenshotsOnDisk: screenshots.files,
    screenshotBytes: screenshots.bytes,
    consoleErrors,
    failedRequests,
  };
}
