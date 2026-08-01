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

export default function McpSetupPage() {
  const mcp = mcpEvidence();
  return (
    <AppShell className="ls-page">
      <header className="ls-masthead">
        <p className="ls-eyebrow">MODEL CONTEXT PROTOCOL · STDIO · LOCAL PROCESS</p>
        <h1>
          <span className="ls-display-line">Coding agents can generate translations.</span>{" "}
          <span className="ls-display-line">
            BhashaFix gives them a release gate they cannot talk their way around.
          </span>
        </h1>
        <p className="ls-standfirst">
          The server runs as a local process beside your repository. An agent can
          create a scan, run it, read the verified issues, propose a bounded
          repair and rerun the identical predicates — and every one of those
          steps returns a measurement, not an opinion.
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
        <div className="ls-scroll" tabIndex={0} role="region">
          <table className="ls-table">
            <caption>Tools</caption>
            <tbody>
              {mcp.tools.map((tool) => (
                <tr key={tool.name}>
                  <th scope="row">
                    <code>{tool.name}</code>
                  </th>
                  <td>{tool.description}</td>
                </tr>
              ))}
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
          {mcp.calls.length} calls against a spawned server, published under{" "}
          <code>/evidence/mcp/</code>. Each published file holds the result
          payload that call returned; the session did not record the request
          arguments separately, so nothing below is presented as a request that
          was not written down.
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
            A repair needs an explicit scan ID, explicit issue IDs and an exact
            path allowlist. Dry run is the default, and the applied call records
            a rollback root.
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
