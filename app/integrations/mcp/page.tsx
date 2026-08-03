import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "../../product";
import { mcpEvidence } from "../../lib/mcp-evidence";

export const metadata: Metadata = {
  title: "Connect through MCP",
  description:
    "The BhashaFix MCP server: transport, tools, resources, prompts, and a recorded eight-call session with the result payload of every call.",
};

const CONFIG = `{
  "mcpServers": {
    "bhashafix": {
      "command": "node",
      "args": ["packages/mcp/dist/bin.js"]
    }
  }
}`;

const TOOL_PRESENTATION: Record<
  string,
  { scope: "project utility" | "AtlasPay fixture" | "persisted demo evidence"; description: string }
> = {
  bhashafix_create_scan: {
    scope: "AtlasPay fixture",
    description:
      "Create a validated request for the bundled atlaspay-demo target. Arbitrary project targets are not accepted by this MVP tool.",
  },
  bhashafix_run_scan: {
    scope: "AtlasPay fixture",
    description:
      "Execute a previously created AtlasPay fixture request and persist its deterministic evidence.",
  },
  bhashafix_scan_project: {
    scope: "AtlasPay fixture",
    description:
      "Run the canonical AtlasPay fixture matrix. This is not a generic repository scan implementation.",
  },
  bhashafix_get_scan: {
    scope: "persisted demo evidence",
    description:
      "Read a locally persisted scan by explicit ID. The current end-to-end producer is the AtlasPay fixture workflow.",
  },
  bhashafix_list_issues: {
    scope: "persisted demo evidence",
    description:
      "List evidence-backed issues from an explicit persisted scan produced by the fixture workflow.",
  },
  bhashafix_get_issue: {
    scope: "persisted demo evidence",
    description:
      "Read one issue from an explicit persisted fixture scan and scan ID.",
  },
  bhashafix_prepare_repair: {
    scope: "AtlasPay fixture",
    description:
      "Prepare a diff for selected AtlasPay fixture issue IDs. The repair planner is confined to the demo data allowlist.",
  },
  bhashafix_apply_repair: {
    scope: "AtlasPay fixture",
    description:
      "Apply a reviewed AtlasPay fixture diff. Dry run is the default; mutation requires the exact prepared diff hash.",
  },
  bhashafix_verify_repair: {
    scope: "AtlasPay fixture",
    description:
      "Rerun the canonical AtlasPay predicates after a fixture repair and return the recorded verification status.",
  },
  bhashafix_generate_report: {
    scope: "persisted demo evidence",
    description:
      "Generate portable reports for an explicit persisted scan. Current recorded end-to-end evidence is fixture-scoped.",
  },
};

export default function McpSetupPage() {
  const mcp = mcpEvidence();
  return (
    <AppShell className="ls-page">
      <header className="ls-masthead">
        <p className="ls-eyebrow">MODEL CONTEXT PROTOCOL · STDIO · LOCAL PROCESS</p>
        <h1>
          <span className="ls-display-line">Eighteen strict tools.</span>{" "}
          <span className="ls-display-line">
            One local localisation harness for coding agents.
          </span>
        </h1>
        <p className="ls-standfirst">
          The STDIO server runs beside your repository and exposes project
          inspection, locale validation, crawling, extraction, translation
          checks, persisted evidence and reports. The complete scan-to-repair
          loop shipped in this MVP is the canonical AtlasPay fixture workflow;
          arbitrary repository repair is not implemented or implied here.
        </p>
      </header>

      <section className="ls-section" aria-labelledby="setup">
        <h2 id="setup">Setup</h2>
        <pre tabIndex={0} className="ls-command">{`pnpm install
pnpm build:packages`}</pre>
        <p className="ls-note">
          Then register the server with your client. Transport: {mcp.transport}.
          Server entry: <code>{mcp.serverEntry}</code>.
        </p>
        <pre tabIndex={0} className="ls-command">{CONFIG}</pre>
      </section>

      <section className="ls-section" aria-labelledby="surface">
        <h2 id="surface">The surface</h2>
        <p className="ls-note">
          {mcp.tools.length} tools, {mcp.resources.length} resources and{" "}
          {mcp.prompts.length} prompts, listed from the recorded{" "}
          <code>tools/list</code> response.
        </p>
        <p className="ls-caveat">
          <b>Scope is explicit.</b> Project utilities operate on validated input;
          scan creation, deterministic repair and identical-predicate
          verification are fixture-scoped in this release. The labels below
          separate those capabilities.
        </p>
        <div className="ls-scroll" tabIndex={0} role="region">
          <table className="ls-table">
            <caption>Tools</caption>
            <tbody>
              {mcp.tools.map((tool) => {
                const presentation = TOOL_PRESENTATION[tool.name];
                return (
                  <tr key={tool.name}>
                    <th scope="row">
                      <code>{tool.name}</code>
                    </th>
                    <td>
                      <b>{presentation?.scope ?? "project utility"}</b> ·{" "}
                      {presentation?.description ?? tool.description}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="ls-scroll" tabIndex={0} role="region">
          <table className="ls-table">
            <caption>Resources</caption>
            <tbody>
              {mcp.resources.map((resource) => (
                <tr key={resource.uri}>
                  <th scope="row">
                    <code>{resource.uri}</code>
                  </th>
                  <td>
                    {resource.description} · {resource.mimeType}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="ls-scroll" tabIndex={0} role="region">
          <table className="ls-table">
            <caption>Prompts</caption>
            <tbody>
              {mcp.prompts.map((prompt) => (
                <tr key={prompt.name}>
                  <th scope="row">
                    <code>{prompt.name}</code>
                  </th>
                  <td>{prompt.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="ls-section" aria-labelledby="session">
        <h2 id="session">A recorded session</h2>
        <p className="ls-note">
          {mcp.calls.length} calls against a spawned server and the bundled
          <code>atlaspay-demo</code> target, published under{" "}
          <code>/evidence/mcp/</code>. This is fixture evidence, not evidence that
          the repair tools can patch an arbitrary repository. Each file holds
          the result payload that call returned; request arguments that were not
          recorded are not reconstructed below.
        </p>
        <ol className="ls-call-log">
          {mcp.calls.map((call, index) => (
            <li key={call.tool}>
              <div className="ls-call-head">
                <i aria-hidden="true">{String(index + 1).padStart(2, "0")}</i>
                <code>{call.tool}</code>
                <span>{call.label}</span>
              </div>
              {call.recordedParameters.length > 0 && (
                <dl className="ls-definition">
                  <div>
                    <dt>Recorded parameters</dt>
                    <dd>
                      {call.recordedParameters.map((row) => (
                        <span className="ls-pair" key={row.label}>
                          <b>{row.label}</b>
                          {row.value}
                        </span>
                      ))}
                    </dd>
                  </div>
                </dl>
              )}
              <dl className="ls-definition">
                <div>
                  <dt>Result payload</dt>
                  <dd>
                    {call.output.map((row) => (
                      <span className="ls-pair" key={row.label}>
                        <b>{row.label}</b>
                        {row.value}
                      </span>
                    ))}
                  </dd>
                </div>
                {call.issueIds.length > 0 && (
                  <div>
                    <dt>Issue IDs returned</dt>
                    <dd>
                      {call.issueIds.map((issueId) => (
                        <code key={issueId}>{issueId}</code>
                      ))}
                    </dd>
                  </div>
                )}
                {call.artifacts.length > 0 && (
                  <div>
                    <dt>Artifacts touched</dt>
                    <dd>
                      {call.artifacts.map((artifact) => (
                        <code key={artifact}>{artifact}</code>
                      ))}
                    </dd>
                  </div>
                )}
                <div>
                  <dt>Verification status</dt>
                  <dd>
                    {call.verification ?? "this call does not report a verification"}
                  </dd>
                </div>
                <div>
                  <dt>Recorded file</dt>
                  <dd>
                    <a href={call.file}>{call.file}</a>
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ol>
      </section>

      <section className="ls-section ls-limits" aria-labelledby="limits">
        <h2 id="limits">Guardrails</h2>
        <ul>
          <li>
            STDIO is the supported transport. There is no remote MCP endpoint.
          </li>
          <li>
            Scan creation, scan execution, prepare, apply and verify currently
            operate on the bundled AtlasPay fixture and its demo-data allowlist.
            Generic source repair is not supported by this MCP release.
          </li>
          <li>
            Fixture repair still requires an explicit scan ID and issue IDs.
            Dry run is the default, mutation requires the reviewed diff hash,
            and an applied call records a rollback root.
          </li>
          <li>
            Project scripts are never executed without approval — the inspect
            call reports <code>commandsRequireApproval</code> as recorded.
          </li>
          <li>
            Model output never overrides a browser predicate. A verification
            field the run did not measure is published as not measured, not as a
            pass.
          </li>
        </ul>
        <div className="ls-actions">
          <Link className="button" href="/integrations/cli">
            Run BhashaFix locally →
          </Link>
          <Link className="button button-secondary" href="/evidence">
            Inspect a real external scan
          </Link>
          <Link className="button button-secondary" href="/demo">
            See the verified demo
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
