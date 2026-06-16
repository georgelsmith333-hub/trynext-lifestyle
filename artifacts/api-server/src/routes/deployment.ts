import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";
import { inArray, eq } from "drizzle-orm";
import { execFile } from "child_process";
import { promisify } from "util";
import { requireAdmin } from "../middlewares/adminAuth";

const execFileAsync = promisify(execFile);
const router: IRouter = Router();

const KEYS = {
  owner: "github_owner",
  repo: "github_repo",
  branch: "github_branch",
  token: "github_token",
  authorName: "github_author_name",
  authorEmail: "github_author_email",
  lastPushAt: "github_last_push_at",
  lastPushSha: "github_last_push_sha",
  lastPushMsg: "github_last_push_message",
  renderDeployHook: "render_deploy_hook",
  renderServiceId: "render_service_id",
  cloudflarePagesHook: "cloudflare_pages_hook",
  lastDeployAllAt: "last_deploy_all_at",
} as const;

const REPO_ROOT = process.env.REPO_ROOT || "/home/runner/workspace";
const TEMP_REMOTE = "trynex-deploy";

const RENDER_API_KEY = process.env.RENDER_API_KEY || "";
const RENDER_SERVICE_ID = process.env.RENDER_SERVICE_ID || "";
const GITHUB_TOKEN_ENV = process.env.GITHUB_PERSONAL_TOKEN || process.env.GITHUB_PERSONAL_ACCESS_TOKEN || process.env.GITHUB_TOKEN || "";
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || "";

const OWNER_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const REPO_RE = /^[A-Za-z0-9_.-]{1,100}$/;
const BRANCH_RE = /^(?!-)[A-Za-z0-9._/-]{1,100}$/;
const NAME_RE = /^[^\x00-\x1f<>"\\\n\r]{1,80}$/;
const EMAIL_RE = /^[^\s<>"@\n\r]{1,80}@[^\s<>"@\n\r]{1,80}$/;
const TOKEN_RE = /^[A-Za-z0-9_]{20,200}$/;
const RENDER_HOOK_RE = /^https:\/\/api\.render\.com\/deploy\/[A-Za-z0-9_?=&.-]{10,300}$/;

function scrubToken(text: string, token: string | undefined): string {
  if (!token) return text;
  return text.split(token).join("***");
}

async function readSettings(keys: string[]): Promise<Record<string, string>> {
  if (keys.length === 0) return {};
  const rows = await db.select().from(settingsTable).where(inArray(settingsTable.key, keys));
  const out: Record<string, string> = {};
  for (const row of rows) if (row.value != null) out[row.key] = row.value;
  return out;
}

async function upsertSetting(key: string, value: string) {
  const existing = await db.select().from(settingsTable).where(eq(settingsTable.key, key)).limit(1);
  if (existing.length > 0) {
    await db.update(settingsTable).set({ value, updatedAt: new Date() }).where(eq(settingsTable.key, key));
  } else {
    await db.insert(settingsTable).values({ key, value });
  }
}

async function isGitRepo(cwd: string): Promise<boolean> {
  try {
    await execFileAsync("git", ["rev-parse", "--is-inside-work-tree"], {
      cwd,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
      timeout: 5000,
    });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// GET /api/admin/deployment/status
// ---------------------------------------------------------------------------
router.get("/admin/deployment/status", requireAdmin, async (req, res) => {
  try {
    const s = await readSettings(Object.values(KEYS));
    res.json({
      configured: Boolean(s[KEYS.owner] && s[KEYS.repo] && s[KEYS.token]),
      owner: s[KEYS.owner] || "",
      repo: s[KEYS.repo] || "",
      branch: s[KEYS.branch] || "main",
      authorName: s[KEYS.authorName] || "TryNex Admin",
      authorEmail: s[KEYS.authorEmail] || "admin@trynex.local",
      tokenMasked: s[KEYS.token] ? `••••${s[KEYS.token].slice(-4)}` : "",
      lastPushAt: s[KEYS.lastPushAt] || null,
      lastPushSha: s[KEYS.lastPushSha] || null,
      lastPushMessage: s[KEYS.lastPushMsg] || null,
      renderDeployHookSet: Boolean(s[KEYS.renderDeployHook]),
      renderServiceId: s[KEYS.renderServiceId] || RENDER_SERVICE_ID,
      renderApiKeySet: Boolean(RENDER_API_KEY),
      cloudflarePagesHookSet: Boolean(s[KEYS.cloudflarePagesHook]),
      lastDeployAllAt: s[KEYS.lastDeployAllAt] || null,
      isGitRepo: await isGitRepo(REPO_ROOT),
    });
  } catch (err) {
    req.log.error({ err }, "deployment status failed");
    res.status(500).json({ error: "internal_error", message: "Failed to load status" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/deployment/config  — read current config (alias for status)
// ---------------------------------------------------------------------------
router.get("/admin/deployment/config", requireAdmin, async (_req, res) => {
  try {
    const s = await readSettings(Object.values(KEYS));
    res.json({
      configured: Boolean(s[KEYS.owner] && s[KEYS.repo] && s[KEYS.token]),
      owner: s[KEYS.owner] || "",
      repo: s[KEYS.repo] || "",
      branch: s[KEYS.branch] || "main",
      authorName: s[KEYS.authorName] || "TryNex Admin",
      authorEmail: s[KEYS.authorEmail] || "admin@trynex.local",
      tokenMasked: s[KEYS.token] ? `••••${s[KEYS.token].slice(-4)}` : "",
      renderDeployHookSet: Boolean(s[KEYS.renderDeployHook]),
      renderServiceId: s[KEYS.renderServiceId] || "",
      cloudflarePagesHookSet: Boolean(s[KEYS.cloudflarePagesHook]),
    });
  } catch (err) {
    _req.log?.error({ err }, "GET /api/admin/deployment/config failed");
    res.status(500).json({ error: "internal_error" });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/admin/deployment/config
// ---------------------------------------------------------------------------
router.put("/admin/deployment/config", requireAdmin, async (req, res) => {
  try {
    const { owner, repo, branch, token, authorName, authorEmail, renderDeployHook, renderServiceId, cloudflarePagesHook } = req.body ?? {};

    const ownerStr = String(owner ?? "").trim();
    const repoStr = String(repo ?? "").trim();
    const branchStr = String(branch ?? "main").trim() || "main";
    const nameStr = String(authorName ?? "TryNex Admin").trim() || "TryNex Admin";
    const emailStr = String(authorEmail ?? "admin@trynex.local").trim() || "admin@trynex.local";

    if (!OWNER_RE.test(ownerStr)) { res.status(400).json({ error: "validation_error", message: "Invalid GitHub owner/org name." }); return; }
    if (!REPO_RE.test(repoStr)) { res.status(400).json({ error: "validation_error", message: "Invalid repository name." }); return; }
    if (!BRANCH_RE.test(branchStr)) { res.status(400).json({ error: "validation_error", message: "Invalid branch name." }); return; }
    if (!NAME_RE.test(nameStr)) { res.status(400).json({ error: "validation_error", message: "Invalid author name." }); return; }
    if (!EMAIL_RE.test(emailStr)) { res.status(400).json({ error: "validation_error", message: "Invalid author email." }); return; }

    await upsertSetting(KEYS.owner, ownerStr);
    await upsertSetting(KEYS.repo, repoStr);
    await upsertSetting(KEYS.branch, branchStr);
    await upsertSetting(KEYS.authorName, nameStr);
    await upsertSetting(KEYS.authorEmail, emailStr);

    if (token && typeof token === "string") {
      const tokenStr = token.trim();
      if (tokenStr && !/^•+/.test(tokenStr)) {
        if (!TOKEN_RE.test(tokenStr)) {
          res.status(400).json({ error: "validation_error", message: "Invalid token format." });
          return;
        }
        await upsertSetting(KEYS.token, tokenStr);
      }
    }

    if (typeof renderDeployHook === "string") {
      const hookStr = renderDeployHook.trim();
      if (hookStr === "") {
        await db.delete(settingsTable).where(eq(settingsTable.key, KEYS.renderDeployHook));
      } else if (!RENDER_HOOK_RE.test(hookStr)) {
        res.status(400).json({ error: "validation_error", message: "Invalid Render deploy hook URL." });
        return;
      } else {
        await upsertSetting(KEYS.renderDeployHook, hookStr);
      }
    }

    if (typeof renderServiceId === "string" && renderServiceId.trim()) {
      await upsertSetting(KEYS.renderServiceId, renderServiceId.trim());
    }

    if (typeof cloudflarePagesHook === "string") {
      const cfHook = cloudflarePagesHook.trim();
      if (cfHook === "") {
        await db.delete(settingsTable).where(eq(settingsTable.key, KEYS.cloudflarePagesHook));
      } else {
        await upsertSetting(KEYS.cloudflarePagesHook, cfHook);
      }
    }

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "deployment config save failed");
    res.status(500).json({ error: "internal_error", message: "Failed to save config" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/deployment/push  — git commit + push to GitHub
// ---------------------------------------------------------------------------
router.post("/admin/deployment/push", requireAdmin, async (req, res) => {
  let activeToken: string | undefined;
  let remoteAdded = false;
  const cwd = REPO_ROOT;
  const env = { ...process.env, GIT_TERMINAL_PROMPT: "0" };

  const runGit = async (args: string[]): Promise<{ stdout: string; stderr: string }> =>
    execFileAsync("git", args, { cwd, env, maxBuffer: 10 * 1024 * 1024 });

  const log: string[] = [];
  const safeRun = async (args: string[], label: string): Promise<string> => {
    try {
      const { stdout, stderr } = await runGit(args);
      const out = (stdout + stderr).trim();
      log.push(`$ git ${label}\n${scrubToken(out, activeToken) || "(ok)"}`);
      return out;
    } catch (e: any) {
      const out = scrubToken(((e.stdout || "") + (e.stderr || "") + (e.message || "")).toString(), activeToken);
      log.push(`$ git ${label}\nERROR: ${out}`);
      throw new Error(`${label} failed: ${out}`);
    }
  };

  try {
    const rawMessage = String(req.body?.message ?? "chore: push from TryNex admin");
    if (/[\x00-\x1f]/.test(rawMessage)) {
      res.status(400).json({ error: "validation_error", message: "Commit message contains invalid characters." });
      return;
    }
    const message = rawMessage.slice(0, 200) || "chore: push from TryNex admin";

    const s = await readSettings(Object.values(KEYS));
    const owner = s[KEYS.owner] || process.env.GITHUB_REPO_OWNER || "";
    const repo = s[KEYS.repo] || process.env.GITHUB_REPO_NAME || "";
    const branch = s[KEYS.branch] || process.env.GITHUB_REPO_BRANCH || "main";
    const token = s[KEYS.token] || GITHUB_TOKEN_ENV;
    const authorName = s[KEYS.authorName] || "TryNex Admin";
    const authorEmail = s[KEYS.authorEmail] || "admin@trynexshop.com";

    if (!owner || !repo || !token) {
      res.status(400).json({ error: "not_configured", message: "GitHub credentials not configured. Save settings first." });
      return;
    }

    if (!OWNER_RE.test(owner) || !REPO_RE.test(repo) || !BRANCH_RE.test(branch) ||
        !NAME_RE.test(authorName) || !EMAIL_RE.test(authorEmail) || !TOKEN_RE.test(token)) {
      res.status(400).json({ error: "validation_error", message: "Stored deployment settings are invalid. Please re-save them." });
      return;
    }

    const inRepo = await isGitRepo(cwd);
    if (!inRepo) {
      res.status(503).json({
        error: "not_a_git_repo",
        message: `Cannot find a git repository at REPO_ROOT (${cwd}). Git push is only available on Replit. In production, use 'Trigger Render Deploy' instead.`,
      });
      return;
    }

    activeToken = token;
    const remoteUrl = `https://x-access-token:${token}@github.com/${owner}/${repo}.git`;

    // Remove stale git lock files that block operations (safe — only stale locks)
    const { unlink } = await import("node:fs/promises");
    for (const lock of ["index.lock", "HEAD.lock", "MERGE_HEAD.lock", "COMMIT_EDITMSG.lock"]) {
      try { await unlink(`${cwd}/.git/${lock}`); log.push(`Removed stale lock: ${lock}`); } catch { /* not present */ }
    }

    await safeRun(["config", "user.name", authorName], "config user.name");
    await safeRun(["config", "user.email", authorEmail], "config user.email");

    try { await runGit(["remote", "remove", TEMP_REMOTE]); } catch { /* ok */ }
    await safeRun(["remote", "add", TEMP_REMOTE, remoteUrl], "remote add");
    remoteAdded = true;

    // ── Credential scrub ────────────────────────────────────────────────────────
    // .replit stores ALL Replit env-var secrets inline, so we must never commit it.
    // Strategy:
    //   1. Fetch the remote HEAD so we know what's already on GitHub.
    //   2. If any local commit between remote HEAD and local HEAD touched .replit,
    //      soft-reset back to remote HEAD (changes land in the index/working tree).
    //   3. Un-stage .replit (and .replit.nix) from the index.
    //   4. Stage everything else, commit, and force-push.
    // ────────────────────────────────────────────────────────────────────────────

    // 1. Get remote HEAD SHA (works without fetching)
    let remoteHead = "";
    try {
      const { stdout: lsRemote } = await execFileAsync(
        "git", ["ls-remote", TEMP_REMOTE, `refs/heads/${branch}`],
        { cwd, env, maxBuffer: 1024 * 1024 }
      );
      remoteHead = lsRemote.trim().split(/\s/)[0] ?? "";
      if (remoteHead) log.push(`Remote HEAD: ${remoteHead.slice(0, 12)}`);
    } catch { /* remote may not have the branch yet */ }

    // 2. If remote HEAD exists and .replit was modified in commits-to-push, soft-reset
    if (remoteHead) {
      try {
        const { stdout: dotReplitLog } = await execFileAsync(
          "git", ["log", "--format=%H", `${remoteHead}..HEAD`, "--", ".replit"],
          { cwd, env, maxBuffer: 1024 * 1024 }
        );
        if (dotReplitLog.trim()) {
          log.push(`Found .replit in commits-to-push — soft-resetting to ${remoteHead.slice(0, 12)} to scrub credentials`);
          // Soft-reset: moves HEAD back, keeps all changes staged
          await safeRun(["reset", "--soft", remoteHead], "reset --soft remote HEAD");
        }
      } catch { /* log check failed — proceed normally */ }
    }

    // 3. Un-track / un-stage .replit (file stays on disk; .gitignore covers it going forward).
    //    We must do this BEFORE `git add -A` so git treats .replit as an ignored path
    //    and doesn't try to re-add it (plain `git add -A` respects .gitignore).
    try { await runGit(["rm", "--cached", ".replit"]); } catch { /* not tracked or already removed */ }
    try { await runGit(["rm", "--cached", ".replit.nix"]); } catch { /* ok */ }

    // 4. Stage everything else.  Plain -A is safe now: .replit is in .gitignore so git skips it.
    await safeRun(["add", "-A"], "add -A");

    let committed = true;
    try {
      await runGit(["diff", "--cached", "--quiet"]);
      committed = false;
      log.push("$ git diff --cached --quiet\n(no staged changes)");
    } catch {
      await safeRun(["commit", "-m", message], "commit");
    }

    // Always force-push when we've rewritten history (soft-reset changes the local SHA)
    const forceFlag = req.body?.force === true || !!remoteHead;
    const pushArgs = ["push", "--force", TEMP_REMOTE, `HEAD:refs/heads/${branch}`];
    await safeRun(pushArgs, `push --force ${branch}`);
    const sha = (await safeRun(["rev-parse", "HEAD"], "rev-parse HEAD")).trim();

    const now = new Date().toISOString();
    await upsertSetting(KEYS.lastPushAt, now);
    await upsertSetting(KEYS.lastPushSha, sha.slice(0, 40));
    await upsertSetting(KEYS.lastPushMsg, message);

    res.json({ success: true, committed, sha: sha.slice(0, 40), shortSha: sha.slice(0, 7), branch, pushedAt: now, message, log: log.join("\n\n") });
  } catch (err: any) {
    const safeMsg = scrubToken(String(err?.message || "Push failed"), activeToken);
    req.log.error({ msg: safeMsg }, "git push failed");
    res.status(500).json({ error: "push_failed", message: safeMsg, log: log.join("\n\n") });
  } finally {
    if (remoteAdded) {
      try { await runGit(["remote", "remove", TEMP_REMOTE]); } catch { /* ignore */ }
    }
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/deployment/trigger  — Render deploy webhook
// ---------------------------------------------------------------------------
router.post("/admin/deployment/trigger", requireAdmin, async (req, res) => {
  try {
    const s = await readSettings([KEYS.renderDeployHook]);
    const hookUrl = s[KEYS.renderDeployHook];
    if (!hookUrl) {
      res.status(400).json({ error: "not_configured", message: "Render deploy hook not configured. Add it in the deployment settings." });
      return;
    }
    const hookRes = await fetch(hookUrl, { method: "POST", headers: { "Content-Type": "application/json" } });
    if (!hookRes.ok) {
      const body = await hookRes.text().catch(() => "");
      req.log.error({ status: hookRes.status, body }, "Render deploy hook returned non-2xx");
      res.status(502).json({ error: "hook_failed", message: `Render deploy hook returned HTTP ${hookRes.status}.` });
      return;
    }
    const data = await hookRes.json().catch(() => ({}));
    const triggeredAt = new Date().toISOString();
    req.log.info({ triggeredAt }, "Render deploy hook triggered");
    res.json({ success: true, triggeredAt, render: data });
  } catch (err: any) {
    req.log.error({ err }, "Render deploy trigger failed");
    res.status(500).json({ error: "internal_error", message: String(err?.message || "Trigger failed") });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/deployment/render-api  — Trigger Render via REST API
// ---------------------------------------------------------------------------
router.post("/admin/deployment/render-api", requireAdmin, async (req, res) => {
  try {
    const s = await readSettings([KEYS.renderServiceId]);
    const serviceId = s[KEYS.renderServiceId] || RENDER_SERVICE_ID;
    const apiKey = RENDER_API_KEY;

    if (!apiKey) {
      res.status(400).json({ error: "not_configured", message: "RENDER_API_KEY env var not set. Add it in Replit Secrets." });
      return;
    }
    if (!serviceId) {
      res.status(400).json({ error: "not_configured", message: "Render service ID not configured." });
      return;
    }

    const clearCache = req.body?.clearCache === true;
    const deployRes = await fetch(`https://api.render.com/v1/services/${serviceId}/deploys`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ clearCache: clearCache ? "clear" : "do_not_clear" }),
    });

    if (!deployRes.ok) {
      const errBody = await deployRes.text().catch(() => "");
      req.log.error({ status: deployRes.status, errBody }, "Render API deploy failed");
      res.status(502).json({ error: "render_api_error", message: `Render API returned HTTP ${deployRes.status}: ${errBody.slice(0, 200)}` });
      return;
    }

    const data: any = await deployRes.json().catch(() => ({}));
    const deploy: any = data.deploy || data;
    const triggeredAt = new Date().toISOString();
    req.log.info({ deployId: deploy.id, triggeredAt }, "Render deploy triggered via API");

    res.json({
      success: true,
      triggeredAt,
      deployId: deploy.id || null,
      status: deploy.status || "pending",
      serviceId,
      serviceUrl: `https://dashboard.render.com/web/${serviceId}`,
    });
  } catch (err: any) {
    req.log.error({ err }, "Render API deploy failed");
    res.status(500).json({ error: "internal_error", message: String(err?.message || "Render API trigger failed") });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/deployment/live-status  — Live status from all platforms
// ---------------------------------------------------------------------------
router.get("/admin/deployment/live-status", requireAdmin, async (req, res) => {
  const s = await readSettings([KEYS.owner, KEYS.repo, KEYS.branch, KEYS.renderServiceId]).catch(() => ({} as Record<string, string>));
  const owner = s[KEYS.owner] || "";
  const repo = s[KEYS.repo] || "";
  const serviceId = s[KEYS.renderServiceId] || RENDER_SERVICE_ID;
  const ghToken = GITHUB_TOKEN_ENV || s[KEYS.token as string] || "";

  const results = await Promise.allSettled([
    // 1. Render — recent deploys
    RENDER_API_KEY && serviceId
      ? fetch(`https://api.render.com/v1/services/${serviceId}/deploys?limit=5`, {
          headers: { "Authorization": `Bearer ${RENDER_API_KEY}`, "Accept": "application/json" },
          signal: AbortSignal.timeout(8000),
        }).then(async r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const items: any[] = (await r.json()) as any[];
          return {
            source: "render",
            deploys: items.map((item: any) => {
              const d = item.deploy || item;
              return {
                id: d.id,
                status: d.status,
                commit: d.commit?.id?.slice(0, 7) || null,
                commitMsg: d.commit?.message?.split("\n")[0]?.slice(0, 80) || null,
                createdAt: d.createdAt,
                finishedAt: d.finishedAt || null,
              };
            }),
          };
        })
      : Promise.resolve({ source: "render", deploys: [], error: "RENDER_API_KEY not set" }),

    // 2. Render — service info
    RENDER_API_KEY && serviceId
      ? fetch(`https://api.render.com/v1/services/${serviceId}`, {
          headers: { "Authorization": `Bearer ${RENDER_API_KEY}`, "Accept": "application/json" },
          signal: AbortSignal.timeout(8000),
        }).then(async r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const d: any = await r.json();
          const svc: any = d.service || d;
          return {
            source: "render_service",
            name: svc.name,
            url: svc.serviceDetails?.url || null,
            status: svc.suspended === "not_suspended" ? "live" : "suspended",
            autoDeploy: svc.autoDeploy,
            branch: svc.repo?.branch || "main",
          };
        })
      : Promise.resolve({ source: "render_service", error: "RENDER_API_KEY not set" }),

    // 3. GitHub — recent commits
    ghToken && owner && repo
      ? fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=5`, {
          headers: {
            "Authorization": `Bearer ${ghToken}`,
            "Accept": "application/vnd.github.v3+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
          signal: AbortSignal.timeout(8000),
        }).then(async r => {
          if (!r.ok) {
            const errBody: any = await r.json().catch(() => ({}));
            throw new Error(errBody.message || `HTTP ${r.status}`);
          }
          const commits: any[] = (await r.json()) as any[];
          return {
            source: "github",
            commits: commits.map((c: any) => ({
              sha: c.sha?.slice(0, 7),
              fullSha: c.sha,
              message: c.commit?.message?.split("\n")[0]?.slice(0, 80),
              author: c.commit?.author?.name,
              date: c.commit?.author?.date,
              url: c.html_url,
            })),
          };
        })
      : Promise.resolve({ source: "github", commits: [], error: !ghToken ? "GITHUB_TOKEN not set" : "GitHub repo not configured" }),

    // 4. Cloudflare — pages project (if token available)
    CLOUDFLARE_API_TOKEN && CLOUDFLARE_ACCOUNT_ID
      ? fetch(`https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects?per_page=10`, {
          headers: { "Authorization": `Bearer ${CLOUDFLARE_API_TOKEN}` },
          signal: AbortSignal.timeout(8000),
        }).then(async r => {
          const d: any = await r.json();
          if (!d.success) return { source: "cloudflare", projects: [], error: d.errors?.[0]?.message || "Auth error" };
          return {
            source: "cloudflare",
            projects: (d.result || []).map((p: any) => ({
              name: p.name,
              subdomain: p.subdomain,
              latestDeployment: p.latest_deployment?.id || null,
              latestStatus: p.latest_deployment?.latest_stage?.status || null,
              deployedAt: p.latest_deployment?.created_on || null,
            })),
          };
        })
      : Promise.resolve({ source: "cloudflare", projects: [], error: "CLOUDFLARE_API_TOKEN not set or insufficient permissions" }),
  ]);

  const out: Record<string, any> = { checkedAt: new Date().toISOString() };
  for (const r of results) {
    if (r.status === "fulfilled") {
      const val = r.value as any;
      out[val.source] = val;
    } else {
      out["error"] = out["error"] || r.reason?.message;
    }
  }

  res.json(out);
});

// ---------------------------------------------------------------------------
// POST /api/admin/deployment/deploy-all  — One-click: push + render + CF
// ---------------------------------------------------------------------------
router.post("/admin/deployment/deploy-all", requireAdmin, async (req, res) => {
  const message = String(req.body?.message || "chore: deploy from TryNex admin").slice(0, 200);
  const steps: Array<{ step: string; status: "ok" | "skipped" | "error"; detail: string }> = [];

  const s = await readSettings(Object.values(KEYS));
  const owner = s[KEYS.owner];
  const repo = s[KEYS.repo];
  const branch = s[KEYS.branch] || "main";
  const token = s[KEYS.token];
  const serviceId = s[KEYS.renderServiceId] || RENDER_SERVICE_ID;
  const cloudflarePagesHook = s[KEYS.cloudflarePagesHook];

  // STEP 1: Git push to GitHub
  const inRepo = await isGitRepo(REPO_ROOT);
  if (inRepo && owner && repo && token) {
    let activeToken: string | undefined = token;
    let remoteAdded = false;
    const cwd = REPO_ROOT;
    const env = { ...process.env, GIT_TERMINAL_PROMPT: "0" };
    const runGit = (args: string[]) => execFileAsync("git", args, { cwd, env, maxBuffer: 10 * 1024 * 1024 });

    try {
      const authorName = s[KEYS.authorName] || "TryNex Admin";
      const authorEmail = s[KEYS.authorEmail] || "admin@trynex.local";
      const remoteUrl = `https://x-access-token:${token}@github.com/${owner}/${repo}.git`;

      await runGit(["config", "user.name", authorName]);
      await runGit(["config", "user.email", authorEmail]);
      try { await runGit(["remote", "remove", TEMP_REMOTE]); } catch { /* ok */ }
      await runGit(["remote", "add", TEMP_REMOTE, remoteUrl]);
      remoteAdded = true;
      // Un-track .replit FIRST (contains secrets), then plain -A respects .gitignore
      try { await runGit(["rm", "--cached", ".replit"]); } catch { /* not tracked or already removed */ }
      try { await runGit(["rm", "--cached", ".replit.nix"]); } catch { /* ok */ }
      await runGit(["add", "-A"]);

      let committed = false;
      try {
        await runGit(["diff", "--cached", "--quiet"]);
      } catch {
        await runGit(["commit", "-m", message]);
        committed = true;
      }

      const { stdout: pushOut, stderr: pushErr } = await runGit(["push", TEMP_REMOTE, `HEAD:refs/heads/${branch}`]);
      const sha = (await runGit(["rev-parse", "HEAD"])).stdout.trim();
      const now = new Date().toISOString();
      await upsertSetting(KEYS.lastPushAt, now);
      await upsertSetting(KEYS.lastPushSha, sha.slice(0, 40));
      await upsertSetting(KEYS.lastPushMsg, message);

      steps.push({
        step: "github_push",
        status: "ok",
        detail: committed
          ? `Committed + pushed to ${owner}/${repo}@${branch} (${sha.slice(0, 7)})`
          : `Already up-to-date at ${sha.slice(0, 7)} — branch synced`,
      });
    } catch (e: any) {
      const msg = scrubToken(String(e?.message || "Push failed"), activeToken);
      steps.push({ step: "github_push", status: "error", detail: msg });
    } finally {
      if (remoteAdded) try { await runGit(["remote", "remove", TEMP_REMOTE]); } catch { /* ignore */ }
    }
  } else if (!inRepo) {
    steps.push({ step: "github_push", status: "skipped", detail: "Not a git repo (running on Render). Use Render API trigger instead." });
  } else {
    steps.push({ step: "github_push", status: "skipped", detail: "GitHub credentials not configured." });
  }

  // STEP 2: Trigger Render via API
  if (RENDER_API_KEY && serviceId) {
    try {
      const deployRes = await fetch(`https://api.render.com/v1/services/${serviceId}/deploys`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${RENDER_API_KEY}`, "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ clearCache: "do_not_clear" }),
        signal: AbortSignal.timeout(12000),
      });
      if (!deployRes.ok) {
        const errBody = await deployRes.text().catch(() => "");
        steps.push({ step: "render_deploy", status: "error", detail: `Render API HTTP ${deployRes.status}: ${errBody.slice(0, 150)}` });
      } else {
        const data: any = await deployRes.json().catch(() => ({}));
        const d: any = data.deploy || data;
        steps.push({ step: "render_deploy", status: "ok", detail: `Deploy triggered: ${d.id || "?"} (status: ${d.status || "pending"})` });
      }
    } catch (e: any) {
      steps.push({ step: "render_deploy", status: "error", detail: String(e?.message || "Render API call failed") });
    }
  } else if (s[KEYS.renderDeployHook]) {
    try {
      const hookRes = await fetch(s[KEYS.renderDeployHook], { method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(10000) });
      if (!hookRes.ok) {
        steps.push({ step: "render_deploy", status: "error", detail: `Deploy hook HTTP ${hookRes.status}` });
      } else {
        steps.push({ step: "render_deploy", status: "ok", detail: "Render deploy hook triggered successfully" });
      }
    } catch (e: any) {
      steps.push({ step: "render_deploy", status: "error", detail: String(e?.message || "Hook failed") });
    }
  } else {
    steps.push({ step: "render_deploy", status: "skipped", detail: "Neither RENDER_API_KEY nor deploy hook configured." });
  }

  // STEP 3: Cloudflare Pages hook (if configured)
  if (cloudflarePagesHook) {
    try {
      const cfRes = await fetch(cloudflarePagesHook, { method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(10000) });
      if (!cfRes.ok) {
        steps.push({ step: "cloudflare_pages", status: "error", detail: `Cloudflare hook HTTP ${cfRes.status}` });
      } else {
        steps.push({ step: "cloudflare_pages", status: "ok", detail: "Cloudflare Pages deploy hook triggered" });
      }
    } catch (e: any) {
      steps.push({ step: "cloudflare_pages", status: "error", detail: String(e?.message || "CF hook failed") });
    }
  } else {
    steps.push({ step: "cloudflare_pages", status: "skipped", detail: "No Cloudflare Pages hook configured. Connect Cloudflare Pages to GitHub for auto-deploy on push." });
  }

  const now = new Date().toISOString();
  await upsertSetting(KEYS.lastDeployAllAt, now).catch(() => {/* ignore */});
  const hasError = steps.some(s => s.status === "error");
  const allSkipped = steps.every(s => s.status === "skipped");

  res.json({
    success: !hasError,
    partial: hasError && steps.some(s => s.status === "ok"),
    allSkipped,
    deployedAt: now,
    steps,
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/admin/deployment/token
// ---------------------------------------------------------------------------
router.delete("/admin/deployment/token", requireAdmin, async (req, res) => {
  try {
    await db.delete(settingsTable).where(eq(settingsTable.key, KEYS.token));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "deployment clear-token failed");
    res.status(500).json({ error: "internal_error", message: "Failed to clear token" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/deployment/platform-info
// Returns generic platform/environment info — no platform-specific env vars.
// Also kept on old path for backward-compat with any cached admin clients.
// ---------------------------------------------------------------------------
function platformInfoHandler(_req: import("express").Request, res: import("express").Response): void {
  const apiPublicUrl = process.env.API_PUBLIC_URL || null;
  const allowedOrigins = process.env.ALLOWED_ORIGINS || null;
  res.json({
    apiPublicUrl,
    allowedOrigins,
    nodeEnv: process.env.NODE_ENV || "development",
    isProduction: process.env.NODE_ENV === "production",
    checkedAt: new Date().toISOString(),
  });
}

router.get("/admin/deployment/platform-info", requireAdmin, platformInfoHandler);
router.get("/admin/deployment/replit-status", requireAdmin, platformInfoHandler);

export default router;
