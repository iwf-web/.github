#!/usr/bin/env node
// Fetch IWF blog sitemap, take N newest entries, scrape <title> from each
// page, and inject a markdown list between BLOG-POST-LIST:START/END markers
// in profile/README.md. No external deps; uses Node's built-in fetch.
// Run directly with Node 24+ (native TypeScript type-stripping).

import {readFileSync, writeFileSync} from 'node:fs';

// Config sourced from workflow `env:` block; defaults kept for local runs.
const SITEMAP_URL = process.env.SITEMAP_URL;
const README_PATH = process.env.README_PATH ?? 'README.md';
const MAX_POSTS = Number(process.env.MAX_POSTS ?? 5);
const MARKER_START = process.env.MARKER_START ?? '<!-- BLOG-POST-LIST:START -->';
const MARKER_END = process.env.MARKER_END ?? '<!-- BLOG-POST-LIST:END -->';
// Strip trailing site-name suffix from <title>, e.g. " - IWF" or " | IWF Web Solutions"
const TITLE_SUFFIX_RE = new RegExp(
  process.env.TITLE_SUFFIX_RE ?? '\\s*[|\\-–—]\\s*IWF(\\s+Web\\s+Solutions)?\\s*$',
  'i',
);

interface SitemapEntry {
  url: string;
  lastmod: Date;
}

interface BlogPost extends SitemapEntry {
  title: string;
}

const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': '\'',
  '&apos;': '\'',
  '&nbsp;': ' ',
};

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(Number.parseInt(n, 16)))
    .replace(/&[a-z]+;|&#39;/gi, (m) => HTML_ENTITIES[m] ?? m);
}

function slugToTitle(url: string): string {
  const slug = url.replace(/\/$/, '').split('/').pop() ?? url;
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {'User-Agent': 'iwf-web-github-blog-bot/1.0'},
  });
  if (!res.ok) {
    throw new Error(`${url} → HTTP ${res.status}`);
  }
  return res.text();
}

function parseSitemap(xml: string): SitemapEntry[] {
  const blocks = Array.from(xml.matchAll(/<url>([\s\S]*?)<\/url>/g), (m) => m[1] ?? '');
  const entries: SitemapEntry[] = [];
  for (const block of blocks) {
    const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1]?.trim();
    const lastmod = block.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1]?.trim();
    if (!loc || !lastmod) {
      continue;
    }
    const ts = Date.parse(lastmod);
    if (Number.isNaN(ts)) {
      continue;
    }
    entries.push({url: loc, lastmod: new Date(ts)});
  }
  return entries;
}

async function resolveTitle(url: string): Promise<string> {
  try {
    const html = await fetchText(url);
    const raw = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
    if (!raw) {
      return slugToTitle(url);
    }
    const cleaned = decodeEntities(raw).replace(/\s+/g, ' ').trim();
    return cleaned.replace(TITLE_SUFFIX_RE, '').trim() || slugToTitle(url);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`title fetch failed for ${url}: ${message}`);
    return slugToTitle(url);
  }
}

function renderList(posts: BlogPost[]): string {
  return posts
    .map((p) => {
      const date = p.lastmod.toISOString().slice(0, 10);
      return `- [${p.title}](${p.url}) — ${date}`;
    })
    .join('\n');
}

function injectList(readme: string, list: string): string {
  const re = new RegExp(
    `(${MARKER_START.replace(/[-[\]{}()*+?.\\^$|]/g, '\\$&')})[\\s\\S]*?(${MARKER_END.replace(/[-[\]{}()*+?.\\^$|]/g, '\\$&')})`,
  );
  if (!re.test(readme)) {
    throw new Error(`markers not found in ${README_PATH}`);
  }
  return readme.replace(re, `$1\n${list}\n$2`);
}

async function main(): Promise<void> {
  if (!SITEMAP_URL) {
    console.error('SITEMAP_URL is required');
    process.exit(1);
  }
  const xml = await fetchText(SITEMAP_URL);
  const entries = parseSitemap(xml);
  if (entries.length === 0) {
    throw new Error('no entries in sitemap');
  }
  entries.sort((a, b) => b.lastmod.getTime() - a.lastmod.getTime() || a.url.localeCompare(b.url));
  const top = entries.slice(0, MAX_POSTS);

  const posts: BlogPost[] = await Promise.all(
    top.map(async (e) => ({...e, title: await resolveTitle(e.url)})),
  );

  const readme = readFileSync(README_PATH, 'utf8');
  const updated = injectList(readme, renderList(posts));
  if (updated === readme) {
    console.log('no change');
    return;
  }
  writeFileSync(README_PATH, updated);
  console.log(`updated ${README_PATH} with ${posts.length} posts`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
