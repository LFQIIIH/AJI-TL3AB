#!/usr/bin/env node
// Link checker: crawls the site from the home page and reports
//  - broken internal links, images and #anchors (4xx/5xx, missing ids),
//  - orphan pages (in the sitemap but not linked from any page),
//  - click depth from the home page (should be ≤ 3),
//  - vague anchor texts ("cliquez ici", "en savoir plus"…),
//  - dead external links (report only),
// and prints the internal link map.
//
// Usage:
//   npm run build && npm run check:links           # starts `next start` on a free port
//   npm run check:links -- --url https://www.ajitl3ab.com   # crawl a running site
//   options: --no-external (skip external checks), --map (print the full link map)
// Exit code 1 if anything internal is broken, orphaned or deeper than 3 clicks.

import { startServer } from "./serve.mjs";

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const PROD_HOSTS = new Set(["www.ajitl3ab.com", "ajitl3ab.com"]);
const MAX_DEPTH = 3;
const VAGUE = /^(ici|cliquez ici|clique ici|click here|here|en savoir plus|voir plus|lire la suite|plus|lien|link|→)$/i;

// ── HTML parsing (the site's own markup, so simple patterns are enough) ──────

const decode = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`, "i"));
  return m ? decode(m[1]) : undefined;
};
const text = (html) => decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

function parse(html) {
  const body = html.split(/<body[^>]*>/i)[1] ?? html;
  const visible = body.replace(/<script[\s\S]*?<\/script>/gi, "");
  const links = [...visible.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map(([, attrs, inner]) => ({
    href: attr(`<a ${attrs}>`, "href"),
    text: text(inner) || attr(`<a ${attrs}>`, "aria-label") || (inner.match(/alt="([^"]+)"/)?.[1] ?? ""),
  }));
  const images = [];
  for (const [tag] of visible.matchAll(/<img\b[^>]*>/gi)) {
    const src = attr(tag, "src");
    if (src) images.push(src);
    for (const part of (attr(tag, "srcset") ?? "").split(",")) {
      const url = part.trim().split(/\s+/)[0];
      if (url) images.push(url);
    }
  }
  const head = html.split(/<body/i)[0];
  for (const [tag] of head.matchAll(/<(?:link|meta)\b[^>]*>/gi)) {
    const rel = attr(tag, "rel") ?? "";
    const prop = attr(tag, "property") ?? attr(tag, "name") ?? "";
    if (/icon/.test(rel)) images.push(attr(tag, "href"));
    if (/og:image$|twitter:image$/.test(prop)) images.push(attr(tag, "content"));
  }
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => decode(m[1])));
  return { links, images: images.filter(Boolean), ids };
}

// ── Crawl ────────────────────────────────────────────────────────────────────

async function main() {
  const server = option("--url") ? { base: option("--url").replace(/\/$/, ""), stop: () => {} } : await startServer();
  const base = server.base;
  const baseHost = new URL(base).host;
  console.log(`Crawling ${base}\n`);

  /** Internal URL → path ("/jouer"), or null for external. */
  const toPath = (href, from) => {
    let u;
    try {
      u = new URL(href, base + from);
    } catch {
      return null;
    }
    if (!/^https?:$/.test(u.protocol)) return null;
    if (u.host !== baseHost && !PROD_HOSTS.has(u.host)) return null;
    return { path: u.pathname.replace(/(.)\/$/, "$1") + u.search, hash: decodeURIComponent(u.hash.slice(1)) };
  };

  const pages = new Map(); // path → { status, ids, out: [{path, hash, text}] }
  const depth = new Map([["/", 0]]);
  const assetStatus = new Map();
  const external = new Map(); // url → [pages]
  const problems = { links: [], images: [], anchors: [], vague: [] };

  async function fetchPage(path) {
    const res = await fetch(base + path, { redirect: "manual", headers: { "user-agent": "aji-link-check" } });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      return { status: res.status, redirect: loc, html: "" };
    }
    return { status: res.status, html: res.status === 200 ? await res.text() : "" };
  }

  const queue = ["/"];
  // Seed with sitemap URLs too, so orphans are still checked (but they don't get a depth from it).
  let sitemap = [];
  try {
    const xml = await (await fetch(base + "/sitemap.xml")).text();
    sitemap = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => toPath(m[1], "/")?.path).filter(Boolean);
  } catch {}

  const seen = new Set(queue);
  while (queue.length) {
    const path = queue.shift();
    const page = await fetchPage(path);
    const entry = { status: page.status, redirect: page.redirect, ids: new Set(), out: [] };
    pages.set(path, entry);
    if (page.status !== 200) continue;
    const { links, images, ids } = parse(page.html);
    entry.ids = ids;
    for (const link of links) {
      if (!link.href || /^(mailto|tel|javascript):/i.test(link.href)) continue;
      if (link.href.startsWith("#")) {
        entry.out.push({ path, hash: decodeURIComponent(link.href.slice(1)), text: link.text, self: true });
        continue;
      }
      const target = toPath(link.href, path);
      if (!target) {
        if (!external.has(link.href)) external.set(link.href, new Set());
        external.get(link.href).add(path);
        continue;
      }
      entry.out.push({ ...target, text: link.text });
      if (VAGUE.test(link.text)) problems.vague.push({ page: path, href: link.href, text: link.text });
      if (!link.text) problems.vague.push({ page: path, href: link.href, text: "(empty)" });
      if (!seen.has(target.path)) {
        seen.add(target.path);
        depth.set(target.path, (depth.get(path) ?? 0) + 1);
        queue.push(target.path);
      }
    }
    for (const src of images) {
      const url = new URL(src, base + path);
      const key = PROD_HOSTS.has(url.host) ? base + url.pathname + url.search : url.toString();
      if (!assetStatus.has(key)) {
        try {
          const r = await fetch(key, { method: "GET", headers: { "user-agent": "aji-link-check" } });
          assetStatus.set(key, r.status);
        } catch (e) {
          assetStatus.set(key, `error: ${e.cause?.code ?? e.message}`);
        }
      }
      const st = assetStatus.get(key);
      if (st !== 200) problems.images.push({ page: path, src, status: st });
    }
    // Pages only in the sitemap are crawled after everything reachable.
    if (!queue.length) {
      for (const p of sitemap) {
        if (seen.has(p)) continue;
        seen.add(p);
        queue.push(p);
      }
    }
  }

  // Follow redirects of linked URLs to their final page for the anchor check.
  for (const [path, entry] of pages) {
    for (const link of entry.out) {
      const target = pages.get(link.path);
      if (!target) continue;
      if (target.status >= 400) problems.links.push({ page: path, href: link.path, status: target.status, text: link.text });
      if (link.hash && target.status === 200 && !target.ids.has(link.hash)) {
        problems.anchors.push({ page: path, href: `${link.path}#${link.hash}`, text: link.text });
      }
    }
  }

  // Inbound links (from other pages) and orphans.
  const inbound = new Map([...pages.keys()].map((p) => [p, new Set()]));
  for (const [path, entry] of pages) for (const l of entry.out) if (l.path !== path) inbound.get(l.path)?.add(path);
  const orphans = sitemap.filter((p) => p !== "/" && (inbound.get(p)?.size ?? 0) === 0);
  const tooDeep = sitemap.filter((p) => !depth.has(p) || depth.get(p) > MAX_DEPTH);

  // ── Report ──
  const ok = (pages) => [...pages.entries()].filter(([, e]) => e.status === 200).map(([p]) => p);
  console.log(`Pages crawled: ${pages.size} (${ok(pages).length} × 200)`);
  for (const [p, e] of pages) if (e.status !== 200) console.log(`  ${p} → ${e.status}${e.redirect ? ` → ${e.redirect}` : ""}`);

  console.log(`\nIndexable pages (sitemap): click depth · linked from N pages`);
  for (const p of sitemap) console.log(`  ${p.padEnd(18)} depth ${depth.get(p) ?? "∞"} · ${inbound.get(p)?.size ?? 0} pages`);

  if (flag("--map")) {
    console.log(`\nLink map (page → internal links, with anchor text)`);
    for (const [p, e] of pages) {
      if (e.status !== 200) continue;
      console.log(`  ${p}`);
      const uniq = new Map();
      for (const l of e.out) {
        if (l.self) continue;
        const href = `${l.path}${l.hash ? "#" + l.hash : ""}`;
        if (!uniq.has(href)) uniq.set(href, new Set());
        uniq.get(href).add(l.text);
      }
      for (const [href, t] of uniq) console.log(`      → ${href.padEnd(26)} ${[...t].map((x) => `"${x}"`).join(" · ")}`);
    }
  }

  // The 404 page: real 404 status, and links back to key pages.
  const notFound = await fetch(`${base}/cette-page-n-existe-pas-${Date.now()}`, { redirect: "manual" });
  const notFoundLinks = notFound.status === 404 ? parse(await notFound.text()).links.map((l) => toPath(l.href ?? "", "/")?.path) : [];
  const notFoundOk = notFound.status === 404 && ["/", "/jouer"].every((p) => notFoundLinks.includes(p));
  console.log(`\n404 page: status ${notFound.status}, links to ${[...new Set(notFoundLinks.filter(Boolean))].length} pages ${notFoundOk ? "✓" : "✗"}`);

  const section = (title, list, fmt) => {
    console.log(`\n${title}: ${list.length ? list.length : "none ✓"}`);
    for (const x of list) console.log(`  ${fmt(x)}`);
  };
  section("Orphan pages", orphans, (p) => p);
  section(`Pages deeper than ${MAX_DEPTH} clicks`, tooDeep, (p) => `${p} (depth ${depth.get(p) ?? "unreachable"})`);
  section("Broken internal links", problems.links, (x) => `${x.page} → ${x.href} (${x.status}) "${x.text}"`);
  section("Broken #anchors", problems.anchors, (x) => `${x.page} → ${x.href} "${x.text}"`);
  section("Broken images", problems.images, (x) => `${x.page} → ${x.src} (${x.status})`);
  section("Vague anchor texts", problems.vague, (x) => `${x.page} → ${x.href} "${x.text}"`);

  let deadExternal = [];
  if (!flag("--no-external")) {
    console.log(`\nExternal links: ${external.size}`);
    for (const [url, from] of external) {
      let status;
      try {
        let r = await fetch(url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(10000), headers: { "user-agent": "Mozilla/5.0 (link check)" } });
        if (r.status === 405 || r.status === 403) r = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(10000), headers: { "user-agent": "Mozilla/5.0 (link check)" } });
        status = r.status;
      } catch (e) {
        status = `unreachable (${e.cause?.code ?? e.name})`;
      }
      const dead = typeof status === "number" ? status >= 400 && status !== 429 : false;
      if (dead) deadExternal.push(url);
      console.log(`  ${dead ? "✗" : typeof status === "number" ? "✓" : "?"} ${status}  ${url.length > 90 ? url.slice(0, 90) + "…" : url}  (on ${[...from].join(", ")})`);
    }
  }

  server.stop();
  const failures = (notFoundOk ? 0 : 1) + orphans.length + tooDeep.length + problems.links.length + problems.anchors.length + problems.images.length;
  console.log(
    `\n${failures ? "✗" : "✓"} ${failures} internal problem(s)` +
      (deadExternal.length ? `, ${deadExternal.length} dead external link(s) (not counted as failure)` : ""),
  );
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
