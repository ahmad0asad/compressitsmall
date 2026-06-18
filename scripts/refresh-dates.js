#!/usr/bin/env node
/**
 * Biweekly date refresher for compressitsmall.co.uk
 * - Walks every .html file in the repo
 * - Inserts (first run) or updates (later runs) a visible "last updated" timestamp
 * - Updates any JSON-LD "dateModified" field it finds
 * - Updates every <lastmod> entry in sitemap.xml
 *
 * Usage: node refresh-dates.js
 * Run from the repo root (or pass a root dir as argv[2]).
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.argv[2] || process.cwd();
const SKIP_DIRS = new Set(['node_modules', '.git', '.github', '.netlify', '.wrangler', 'dist', 'build']);
const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (entry.name.endsWith('.html')) {
      files.push(full);
    }
  }
  return files;
}

function updateHtmlFile(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');
  const original = html;

  // 1. Visible "last updated" stamp
  const stampMarker = /<time id="last-updated-date"[^>]*>[\s\S]*?<\/time>/;
  if (stampMarker.test(html)) {
    html = html.replace(
      stampMarker,
      `<time id="last-updated-date" datetime="${today}">${today}</time>`
    );
  } else if (/<\/body>/i.test(html)) {
    const stamp =
      `\n<p class="last-updated" style="font-size:0.8em;color:#888;margin-top:2rem;">` +
      `Page last updated: <time id="last-updated-date" datetime="${today}">${today}</time></p>\n</body>`;
    html = html.replace(/<\/body>/i, stamp);
  }

  // 2. JSON-LD dateModified (more meaningful signal than the visible stamp)
  html = html.replace(/"dateModified"\s*:\s*"[^"]*"/g, `"dateModified": "${today}"`);

  // 3. Meta tag variant, if present
  html = html.replace(
    /(<meta\s+property=["']article:modified_time["']\s+content=["'])[^"']*(["'])/gi,
    `$1${today}$2`
  );

  if (html !== original) {
    fs.writeFileSync(filePath, html);
    return true;
  }
  return false;
}

function findSitemap() {
  const candidates = ['sitemap.xml', 'public/sitemap.xml', 'dist/sitemap.xml', 'build/sitemap.xml'];
  for (const rel of candidates) {
    const full = path.join(ROOT, rel);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

function updateSitemap() {
  const sitemapPath = findSitemap();
  if (!sitemapPath) {
    console.log('No sitemap.xml found — skipping.');
    return;
  }
  let xml = fs.readFileSync(sitemapPath, 'utf8');
  const updated = xml.replace(/<lastmod>.*?<\/lastmod>/g, `<lastmod>${today}</lastmod>`);
  if (updated !== xml) {
    fs.writeFileSync(sitemapPath, updated);
    console.log(`${sitemapPath} lastmod values updated.`);
  }
}

const htmlFiles = walk(ROOT);
let changed = 0;
for (const file of htmlFiles) {
  if (updateHtmlFile(file)) changed++;
}
updateSitemap();
console.log(`Done. Updated ${changed} of ${htmlFiles.length} HTML file(s) to ${today}.`);
