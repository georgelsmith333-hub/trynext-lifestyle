---
name: Secrets untracked from git
description: .replit and attached_assets/Pasted-*.txt were removed from the git index and are now ignored so raw credentials cannot be committed again.
---

# Untracked secret-bearing files from git

**Rule:** `.replit` and every `attached_assets/Pasted-*.txt` file must stay on disk only — never committed.

**History:** These files contained raw database connection strings, API tokens, JWT secrets, and Cloudflare/Render credentials. They were previously tracked or partially tracked, so a normal `git add` would embed them in commits.

**Fix applied**
- `git rm --cached .replit` — removed `.replit` from the index while keeping the file on disk for Replit.
- `git rm --cached attached_assets/Pasted-*.txt` — removed all pasted text files from the index.
- Updated `.gitignore` with `attached_assets/Pasted-*.txt` to cover all pasted notes, not just files with "Secrets" in the name.

**Why:** Replit injects env vars via `.replit` userenv, so the file is a secret store in the workspace. Pasted notes are user-provided scratchpads that often contain credentials. Git history on the remote still contains older versions; to fully scrub them use `git-filter-repo` or similar, but untracking prevents future exposure.

**How to apply:** Before any commit, run `git status` and confirm `.replit` and `attached_assets/Pasted-*.txt` are not staged. If a new pasted file is added, update `.gitignore` or `git rm --cached` it immediately.
