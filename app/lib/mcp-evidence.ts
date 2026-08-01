/**
 * View model for the recorded MCP session under `public/evidence/mcp/`.
 *
 * Each published file holds the *result payload* a tool returned. The recorded
 * session does not store the request arguments separately, so this module never
 * synthesises an "input" block: where a payload happens to echo what was asked
 * for — the locales and routes a scan was created with, the files a repair was
 * limited to — those fields are surfaced as recorded parameters and labelled as
 * read back out of the response.
 */

import evidenceIndex from "../../public/evidence/index.json";
import toolsCall from "../../public/evidence/mcp/00-tools.json";
import inspectCall from "../../public/evidence/mcp/01-inspect-project.json";
import createCall from "../../public/evidence/mcp/02-create-scan.json";
import runCall from "../../public/evidence/mcp/03-run-scan.json";
import listIssuesCall from "../../public/evidence/mcp/04-list-issues.json";
import dryRunCall from "../../public/evidence/mcp/06-repair-dry-run.json";
import applyCall from "../../public/evidence/mcp/07-apply-repair.json";
import verifyCall from "../../public/evidence/mcp/08-verify-repair.json";

export type McpRow = { label: string; value: string };

export type McpCall = {
  tool: string;
  label: string;
  file: string;
  /** Request-shaped values the response itself records. Empty where none. */
  recordedParameters: McpRow[];
  /** Fields read out of the recorded result payload. */
  output: McpRow[];
  issueIds: string[];
  artifacts: string[];
  verification: string | null;
};

export type McpSurface = {
  transport: string;
  serverEntry: string;
  tools: Array<{ name: string; description: string }>;
  resources: Array<{ name: string; uri: string; description: string; mimeType: string }>;
  prompts: Array<{ name: string; description: string }>;
  calls: McpCall[];
};

function list(values: readonly string[]) {
  return values.length ? values.join(" · ") : "none";
}

const PAYLOADS: Record<string, Omit<McpCall, "tool" | "label" | "file">> = {
  "tools/list": {
    recordedParameters: [],
    output: [
      { label: "tools", value: String(toolsCall.tools.length) },
      { label: "resources", value: String(toolsCall.resources.length) },
      { label: "prompts", value: String(toolsCall.prompts.length) },
    ],
    issueIds: [],
    artifacts: [],
    verification: null,
  },
  bhashafix_inspect_project: {
    recordedParameters: [{ label: "projectRoot", value: inspectCall.projectRoot }],
    output: [
      { label: "framework", value: inspectCall.framework },
      { label: "support", value: inspectCall.support },
      {
        label: "scripts discovered",
        value: String(Object.keys(inspectCall.scripts).length),
      },
      {
        label: "commandsRequireApproval",
        value: String(inspectCall.commandsRequireApproval),
      },
    ],
    issueIds: [],
    artifacts: [],
    verification: null,
  },
  bhashafix_create_scan: {
    recordedParameters: [
      { label: "target", value: createCall.target },
      { label: "mode", value: createCall.mode },
      { label: "requestedLocales", value: list(createCall.requestedLocales) },
      { label: "requestedRoutes", value: list(createCall.requestedRoutes) },
    ],
    output: [
      { label: "scanId", value: createCall.scanId },
      { label: "createdAt", value: createCall.createdAt },
      { label: "status", value: createCall.status },
      { label: "executionStarted", value: String(createCall.executionStarted) },
      { label: "coveragePolicy", value: createCall.coveragePolicy },
    ],
    issueIds: [],
    artifacts: [],
    verification: null,
  },
  bhashafix_run_scan: {
    recordedParameters: [{ label: "scanId", value: runCall.scanId }],
    output: [
      { label: "origin", value: runCall.origin },
      { label: "status", value: runCall.status },
      { label: "startedAt → completedAt", value: `${runCall.startedAt} → ${runCall.completedAt}` },
      { label: "routesDiscovered", value: list(runCall.routesDiscovered) },
      { label: "localesTested", value: list(runCall.localesTested) },
      {
        label: "viewports",
        value: runCall.config.viewports
          .map((viewport) => `${viewport.name} ${viewport.width}×${viewport.height}`)
          .join(" · "),
      },
      { label: "themes", value: list(runCall.config.themes) },
      { label: "issues", value: String(runCall.issues.length) },
      { label: "engineVersion", value: runCall.engineVersion },
    ],
    issueIds: runCall.issues.map((issue) => issue.issueId),
    artifacts: [],
    verification: null,
  },
  bhashafix_list_issues: {
    recordedParameters: [],
    output: [
      { label: "issues", value: String(listIssuesCall.issues.length) },
      {
        label: "blocking",
        value: String(
          listIssuesCall.issues.filter((issue) => issue.severity === "blocking").length,
        ),
      },
      {
        label: "rules",
        value: list([...new Set(listIssuesCall.issues.map((issue) => issue.ruleId))]),
      },
    ],
    issueIds: listIssuesCall.issues.map((issue) => issue.issueId),
    artifacts: [],
    verification: null,
  },
  bhashafix_prepare_repair: {
    recordedParameters: [{ label: "files", value: list(dryRunCall.files) }],
    output: [
      { label: "dryRun", value: String(dryRunCall.dryRun) },
      { label: "applied", value: String(dryRunCall.applied) },
      {
        label: "unifiedDiff",
        value: `${dryRunCall.unifiedDiff.split("\n").length} diff lines recorded`,
      },
    ],
    issueIds: [],
    artifacts: dryRunCall.files,
    verification: null,
  },
  bhashafix_apply_repair: {
    recordedParameters: [{ label: "files", value: list(applyCall.files) }],
    output: [
      { label: "dryRun", value: String(applyCall.dryRun) },
      { label: "applied", value: String(applyCall.applied) },
      { label: "rollbackRoot", value: applyCall.rollbackRoot },
      {
        label: "unifiedDiff",
        value: `${applyCall.unifiedDiff.split("\n").length} diff lines recorded`,
      },
    ],
    issueIds: [],
    artifacts: [...applyCall.files, applyCall.rollbackRoot],
    verification: null,
  },
  bhashafix_verify_repair: {
    recordedParameters: [{ label: "scanId", value: verifyCall.scanId }],
    output: [
      { label: "verifiedAt", value: verifyCall.verifiedAt },
      { label: "baselineBlocking", value: String(verifyCall.baselineBlocking) },
      { label: "finalBlocking", value: String(verifyCall.finalBlocking) },
      { label: "sourceLocaleRegression", value: verifyCall.sourceLocaleRegression },
      { label: "newBlockingIssues", value: String(verifyCall.newBlockingIssues) },
      { label: "notMeasured", value: list(verifyCall.notMeasured) },
    ],
    issueIds: [],
    artifacts: [],
    verification: verifyCall.status,
  },
};

export function mcpEvidence(): McpSurface {
  const mcp = evidenceIndex.mcp;
  return {
    transport: mcp.transport,
    serverEntry: mcp.serverEntry,
    tools: toolsCall.tools,
    resources: toolsCall.resources,
    prompts: toolsCall.prompts.map((prompt) => ({
      name: prompt.name,
      description: prompt.description,
    })),
    calls: mcp.calls.map((call) => {
      const payload = PAYLOADS[call.tool];
      if (!payload) {
        throw new Error(
          `public/evidence/index.json records an MCP call for ${call.tool} with no imported payload.`,
        );
      }
      return { tool: call.tool, label: call.label, file: call.file, ...payload };
    }),
  };
}
