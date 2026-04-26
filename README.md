# .github

Default community health files for the [IWF Web Solutions](https://github.com/iwf-web) GitHub organization. Every repo in the org that does not define its own picks these up: `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `SECURITY.md`, `SUPPORT.md`, `FEATURE_OR_BUG.md`, issue templates, PR template, `CODEOWNERS`.

The org profile page at [github.com/iwf-web](https://github.com/iwf-web) is rendered from [`profile/README.md`](./profile/README.md).

[![License](https://img.shields.io/github/license/iwf-web/.github)](LICENSE.txt)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.0-4baaaa.svg)](CODE_OF_CONDUCT.md)

## Blog post workflow

[`.github/workflows/blog-post-workflow.yml`](./.github/workflows/blog-post-workflow.yml) runs daily at 00:00 UTC, scrapes the [IWF blog sitemap](https://www.iwf.ch/sitemaps-1-section-blog-1-sitemap.xml), and refreshes the "Latest from Our Blog" section of `profile/README.md` between its `<!-- BLOG-POST-LIST:START -->` / `<!-- BLOG-POST-LIST:END -->` markers. `iwf.ch` exposes no RSS/Atom, so this repo hosts a custom sitemap → `<title>` → Markdown bridge in [`.github/scripts/update-blog-posts.ts`](./.github/scripts/update-blog-posts.ts) (TypeScript, run directly by Node 24's native type-stripping; zero runtime deps).

The workflow also includes a **keepalive** step: if no commit has landed in 50 days, it pushes an empty `chore: keepalive` commit so GitHub does not auto-disable the schedule after 60 days of inactivity.

### Running it manually

Pick one:

**1. GitHub UI** — Actions tab → "Latest blog post workflow" → Run workflow. Uses the `env:` block from the YAML.

**2. `gh` CLI**

```bash
gh workflow run "Latest blog post workflow" --repo iwf-web/.github
gh run watch --repo iwf-web/.github
```

**3. Local** — `SITEMAP_URL` and `README_PATH` have no script-side default, so pass them as env:

```bash
SITEMAP_URL="https://www.iwf.ch/sitemaps-1-section-blog-1-sitemap.xml" \
README_PATH="profile/README.md" \
node .github/scripts/update-blog-posts.ts
```

Optional overrides: `MAX_POSTS` (default `5`), `MARKER_START`, `MARKER_END`, `TITLE_SUFFIX_RE`.

See [`CLAUDE.md`](./CLAUDE.md) for architecture notes and the migration plan for when `iwf.ch` ships a real feed (at which point this bridge gets replaced by [`gautamkrishnar/blog-post-workflow`](https://github.com/gautamkrishnar/blog-post-workflow)).

## Linting

```bash
pnpm install
pnpm lint        # check
pnpm lint:fix    # auto-fix
```

ESLint via the shared [`@iwf-web/eslint-coding-standard`](https://www.npmjs.com/package/@iwf-web/eslint-coding-standard) preset.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

This project uses [Conventional Commits](https://www.conventionalcommits.org/).

## Authors

### Special thanks for all the people who had helped this project so far

- **Manuele** - [D3strukt0r](https://github.com/D3strukt0r)

See also the full list of [contributors][gh-contributors] who participated in this project.

### I would like to join this list. How can I help the project?

We're currently looking for contributions for the following:

- [ ] Bug fixes
- [ ] Translations
- [ ] etc...

For more information, please refer to our [CONTRIBUTING.md](CONTRIBUTING.md) guide.

## License

This project is licensed under the MIT License - see the [LICENSE.txt](LICENSE.txt) file for details.

## Acknowledgments

This project currently uses no third-party libraries or copied code.

[gh-contributors]: https://github.com/iwf-web/.github/contributors
