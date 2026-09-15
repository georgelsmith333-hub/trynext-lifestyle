# Trynext Lifestyle — Agent Operating Rules

This file is part of the project handoff. It must be read before making changes.
It applies to the original project and to copies/remixes that include this file.

## Mandatory startup command for every new or Remixed Agent

> **START HERE — do not edit anything yet.** Read `AGENTS.md`,
> `AGENT_HANDOFF.md`, and `replit.md` first. Then inspect the current project
> state and respond with these headings: **Completed**, **Last stopping point**,
> **Remaining work**, **Blockers**, **Plan**, **Existing behavior to preserve**,
> **Verification**, and **Safe parallel work**. Submit the plan before editing.
> Preserve all working features, update related before/after paths together,
> keep the handoff current while working, reconcile and verify parallel work,
> and finish with the exact **Status**, **Last completed**, **Stopped at**,
> **Files/areas changed**, **Remaining work**, **Blocker**, **Next safe action**,
> and **Verification** in `AGENT_HANDOFF.md`. If work stops early, provide the
> same handoff instead of leaving the next Agent to infer anything from chat.

## First priority: understand the project

Before responding with an implementation plan or editing files, every Agent must:

1. Read this file.
2. Read `AGENT_HANDOFF.md`.
3. Read `replit.md`.
4. Inspect the current state of the files and workflows relevant to the request.
5. Check the user's current request and treat it as the highest-priority product instruction.

The project rules in this file and `replit.md` provide context and safety constraints.
They do not override the user's current request, platform safety rules, or a newer
explicit decision made by the project owner.

### Required first response in every new chat

Before any edit, the Agent must clearly state:

- That `AGENTS.md`, `AGENT_HANDOFF.md`, and `replit.md` were read.
- What the current handoff says is completed.
- Where previous work stopped.
- What remains to be done or what is blocked.
- The proposed plan for the current user request.
- Which existing behavior will be preserved.
- What will be checked, and whether any safe parallel work is possible.

The Agent must not claim that work is complete, current, or verified unless the
current files and relevant workflows support that claim.

## Preserve the full history of work

- Do not replace, reset, or rewrite working features just because a new Agent is
  unfamiliar with them.
- Treat existing code, completed work, decisions, plans, and documented gotchas as
  intentional unless current evidence shows otherwise.
- Before changing a shared behavior, search for every consumer and update the
  related code and documentation together.
- When a change affects a "before" and "after" flow, update both sides in the
  same task. Do not leave an old path, fallback, route, client, mobile screen,
  admin screen, or documentation path silently behind.
- Prefer a focused change that fits the existing architecture over an unrelated
  refactor.

## Plan before implementation

Before editing code, the Agent must submit a concise plan in its response or task
proposal. The plan must state:

- What will change
- Which existing behavior must remain intact
- Files or areas likely to be affected
- Dependencies and related "before/after" paths
- How the result will be checked
- Whether any work can safely run in parallel

For multi-step or risky work, stop after presenting the plan until the user
approves it. For a small, clearly scoped fix, the plan may be brief, but it still
must be stated before the first edit.

Before declaring the work complete or handing it to another user, submit a final
completion note containing:

- What changed
- What was preserved
- Verification performed and its result
- Any remaining limitations or follow-up work
- The updates made to `AGENT_HANDOFF.md`

If the work is paused, blocked, handed to another Agent, or the conversation is
ending before completion, submit a handoff note instead. It must explicitly state:

- Last completed step
- Exact point where work stopped
- Files or areas already changed
- Work still required
- Blocker, if any
- Next safe action
- Verification status

Update `AGENT_HANDOFF.md` before that note is submitted. Never leave the next
Agent to infer the stopping point from chat history alone.

## Parallel work

Parallel work is allowed when tasks are independent and have clear boundaries.

- Split work by isolated feature or file group.
- State dependencies before starting parallel work.
- Do not let two Agents edit the same file or shared contract simultaneously.
- Reconcile all parallel results in the main project before completion.
- Resolve conflicts deliberately; never silently choose one branch.
- Re-run the relevant checks after reconciliation.

Parallel work must never be used to bypass the plan, review, security, or
verification requirements.

## Keep the handoff current

After meaningful work, update `AGENT_HANDOFF.md` before finishing. Keep it concise
and useful to the next Agent:

- Record completed work and current open work.
- Record durable architecture decisions and important gotchas.
- Record plans that were approved, rejected, or still pending.
- Record the latest completed checkpoint, exact stopping point, remaining work,
  blockers, next safe action, and verification status.
- Record the next safe recommended prompt.
- Never record passwords, API keys, session tokens, private keys, database URLs,
  personal data, or any other secret value.

If the current task changes an existing decision, update the handoff instead of
creating contradictory notes. If a note is stale, correct or remove it.

## Active approved workstream — six-family PSD/PSB Smart Mockups

The approved strategy is to rebuild genuine editable PSD/PSB masters from the
existing Trynext photos, cutouts, masks, and geometry assets while keeping the
customer Design Studio fully realtime in the browser.

### Inputs

- The six canonical product families: T-shirt, long sleeve, hoodie, mug, cap,
  and white sublimation water bottle.
- The current canonical 188-surface product/color/face contract.
- Reviewed source photos, transparent cutouts, detail masks, print zones, and
  geometry parameters.
- A user's local uploaded artwork, decoded and processed in-browser.

### Outputs

- Genuine PSD/PSB masters with verifiable embedded Smart Object artwork layers.
- A generated manifest with surface IDs, coordinates, warp settings, masks,
  provenance, checksums, and review status.
- Optimized runtime preview derivatives that do not expose editable masters.
- A browser compositor that uses the same manifest for preview, export, and cart
  snapshots.
- Structural, visual, and functional audit reports for the complete 188-surface
  release.

### Staging rule

Build representatives first, then generate the full matrix into quarantine and
run the staged browser/PSD comparison before changing the active resolver.
Production must remain on the current working runtime until all 188 surfaces
pass structural, visual, and functional gates. Promote only reviewed runtime
previews, masks, and manifest data, then run production smoke checks and push
the verified release.

### Required behavior to preserve

- Upload preview must be immediate and local; no paid AI or per-upload server
  rendering is allowed.
- Original uploads must remain available in cart/checkout metadata.
- Product switching must refit artwork to the target print zone and remain
  undoable.
- Curved products must retain their accurate 3D/final-render behavior.
- The white water bottle is not tintable and has only its canonical front/back
  surfaces.
- Existing storefront, admin, auth, payments, storage, and deployment paths
  remain unchanged unless a direct mockup dependency requires a coordinated
  update.

### Fail-closed rules

Never ship a raster layer named as a Smart Object, a missing-face fallback, a
non-canonical bottle color, an unreviewed generated surface, or a source whose
checksum/provenance is absent. Editable masters remain outside `public/`.

### Handoff status format

Use this structure in `AGENT_HANDOFF.md` whenever work is in progress or paused:

```text
Status: <not started | in progress | blocked | ready for review | complete>
Last completed:
Stopped at:
Files/areas changed:
Remaining work:
Blocker:
Next safe action:
Verification:
```

When a task is complete, retain the last completed checkpoint and set remaining
work to `None for the approved scope` unless a real follow-up remains.

## Secrets and access

- Never ask a user to paste a secret into a project file or chat.
- Never copy secret values into `AGENT_HANDOFF.md`, `AGENTS.md`, `replit.md`,
  source code, logs, screenshots, or commits.
- Refer to secret names only when documenting configuration.
- Use the project's secure secret mechanism for secret changes.

## Remix expectations

A Remix/copy should receive these project files and therefore should receive this
operating context. The new Agent must still read them first and verify that the
copied project matches the documented state.

These files do not transfer the original private Agent conversation. They transfer
the durable project context that has been written down. If the copied project
does not contain a detail, the Agent must ask for clarification rather than
inventing history.
