# Technical architecture

```text
Bundled Zariya routes
        │
        ▼
Rendered locale frames (EN / HI / TA / UR)
        │
        ▼
Deterministic predicates
overflow · RTL · raw keys · lang · accessible name
        │
        ▼
Stable issue bundles (BF-*)
        │
        ▼
Three-file repair allowlist
        │
        ▼
Identical predicate rerun + English control
        │
        ▼
Proof report · JSON · unified patch · receipts
```

The deployed app is built with Next-compatible React on vinext and ships as a
Cloudflare Worker through Sites. The live lab measures same-origin rendered
frames in the browser. The repository CLI demonstrates the source mutation
boundary and exports deterministic proof artifacts.

Acceptance is code-controlled. AI diagnosis can enhance explanations, but no
model response changes pass/fail state.
