# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Repository Purpose

This is the **iwf-web/.github** repository — the default community health files for the IWF Web Solutions GitHub organization. Files here (SECURITY.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md, etc.) are inherited by all repos in the `iwf-web` org that don't define their own.

## Key Details

- **Default code owner**: @D3strukt0r (see CODEOWNERS)
- **Branch model**: `develop` is the main working branch for new features; bug fixes branch from the oldest affected release line
- **EditorConfig**: 2-space indentation, UTF-8, LF line endings, trailing whitespace trimmed (except in Markdown and `.git/`)

## Tooling

Package manager: **pnpm** (`packageManager` pin in `package.json`). ESLint via the shared `@iwf-web/eslint-coding-standard` preset.

```bash
pnpm install          # install dev deps
pnpm lint             # check
pnpm lint:fix         # auto-fix
pnpm typecheck        # tsc --noEmit
```

The blog-update script is TypeScript (`.github/scripts/update-blog-posts.ts`); CI runs it directly with `node` (Node 24+ strips types natively, no compile step). No test suite, no bundler — the repo only ships community-health Markdown/YAML plus one workflow + its Node/TS script.

## Blog Post Workflow

`profile/README.md` renders as the org landing page at `github.com/iwf-web`. Its "Latest from Our Blog" section is auto-updated by `.github/workflows/blog-post-workflow.yml` (daily at 00:00 UTC, also `workflow_dispatch`).

Pipeline (custom bridge, no RSS):

1. `.github/scripts/update-blog-posts.ts` fetches `https://www.iwf.ch/sitemaps-1-section-blog-1-sitemap.xml` — `iwf.ch` exposes no RSS/Atom, so the sitemap is the source of truth.
2. Top `MAX_POSTS` entries picked by `<lastmod>` desc; each post URL is fetched and its `<title>` scraped, trailing ` - IWF` / ` | IWF Web Solutions` suffix stripped.
3. Markdown list injected between `<!-- BLOG-POST-LIST:START -->` and `<!-- BLOG-POST-LIST:END -->` markers in `profile/README.md`.
4. Workflow commits as `github-actions[bot]` only if the file changed.
5. **Keepalive step** — if the repo's last commit is older than `KEEPALIVE_THRESHOLD_DAYS` (50), push an empty `chore: keepalive` commit. Prevents GitHub's 60-day auto-disable of scheduled workflows. Replaces the `enable_keepalive` / `dummy_commit_message` feature from upstream `blog-post-workflow`; the dedicated `gautamkrishnar/keepalive-workflow` action was disabled by GitHub staff, so we inline the logic.

Config lives in the workflow's step-level `env:` block. The workflow currently sets `SITEMAP_URL` and `README_PATH`; `MAX_POSTS` (5), `MARKER_START`, `MARKER_END`, and `TITLE_SUFFIX_RE` fall back to script defaults. `SITEMAP_URL` has **no** fallback — missing env = runtime crash. Zero npm deps, Node 24 built-in `fetch`.

### Running manually

Three ways, pick one:

1. **GitHub UI** — Actions tab → "Latest blog post workflow" → Run workflow (uses the `env:` block from the YAML).
2. **gh CLI**
   ```bash
   gh workflow run "Latest blog post workflow" --repo iwf-web/.github
   gh run watch --repo iwf-web/.github
   ```
3. **Local** — you must supply `SITEMAP_URL` and `README_PATH` yourself; the script has no defaults for them:
   ```bash
   SITEMAP_URL="https://www.iwf.ch/sitemaps-1-section-blog-1-sitemap.xml" \
   README_PATH="profile/README.md" \
   node .github/scripts/update-blog-posts.ts
   ```
   Optional overrides: `MAX_POSTS`, `MARKER_START`, `MARKER_END`, `TITLE_SUFFIX_RE`.

If the site rebrands, update `TITLE_SUFFIX_RE` in the workflow (not the script) so the fix stays config-only.

### TODO: migrate back to `gautamkrishnar/blog-post-workflow` once iwf.ch ships RSS/Atom

The sitemap-scraping bridge is a workaround for `iwf.ch` having no feed. The moment a real feed exists (e.g. `https://www.iwf.ch/feed` or `/atom.xml`), swap this custom pipeline for the upstream action — it's better maintained and handles templating/dates/dedup for free.

Replacement workflow step:

```yaml
- uses: gautamkrishnar/blog-post-workflow@v1
  with:
    feed_list: "https://www.iwf.ch/<RSS_OR_ATOM_URL>"
    readme_path: "./profile/README.md"
    max_post_count: 5
    commit_message: "chore: update latest blog posts"
    committer_username: "github-actions[bot]"
    committer_email: "41898282+github-actions[bot]@users.noreply.github.com"
    enable_keepalive: false
```

On migration: delete `.github/scripts/update-blog-posts.ts`, drop the `setup-node` step, drop the env block, remove the manual commit step (the action commits itself). Markers in `profile/README.md` stay — the upstream action uses the same `BLOG-POST-LIST:START/END` convention.
