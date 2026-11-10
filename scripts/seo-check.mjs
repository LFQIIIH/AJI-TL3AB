#!/usr/bin/env node
// SEO guard for the production build: fails if a change silently breaks
// titles, descriptions, canonicals, indexing, headings, alt text, social tags
// or structured data. Run after `npm run build` (part of `npm run seo:check`).
//
//   npm run build && npm run seo:check
//   node scripts/seo-check.mjs --url https://www.ajitl3ab.com   # check the live site
//
// Every indexable page listed in sitemap.xml is checked against:
//   200 status · <html lang> · one <title> (30–65 chars, unique) · one meta
//   description (110–170 chars, unique) · canonical = its sitemap URL · no
//   noindex · exactly one non-empty <h1> · no skipped heading level · alt on
//   every <img> · og:title/description/url/type/locale/site_name · og:image
//   (absolute, first of the og:image:* tags, loads as an image < 300 KB) with
//   width/height/alt · twitter:card summary_large_image + image · JSON-LD that
//   parses, with the fields Google requires for each type, and a
//   BreadcrumbList on inner pages.
// Site-wide: robots.txt (sitemap line, not blocking everything), llms.txt,
// a real 404 status for unknown URLs.

import { startServer } from "./serve.mjs";

const args = process.argv.slice(2);
const urlArg = args.includes("--url") ? args[args.indexOf("--url") + 1] : undefined;
const SITE = "https://www.ajitl3ab.com";
const UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

const errors = [];
const warnings = [];
const fail = (page, msg) => errors.push(`${page}: ${msg}`);
const warn = (page, msg) => warnings.push(`${page}: ${msg}`);

const decode = (s) =>
  s.replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const all = (html, re) => [...html.matchAll(re)];
const metas = (head) => {
  const out = [];
  for (const [tag] of head.matchAll(/<meta\b[^>]*>/gi)) {
    const key = tag.match(/\s(?:property|name)="([^"]+)"/i)?.[1];
    const content = tag.match(/\scontent="([^"]*)"/i)?.[1];
    if (key && content !== undefined) out.push([key, decode(content)]);
  }
  return out;
};

// ── Structured data: the fields Google requires (or that we always set) ──
const REQUIRED = {
  SportsActivityLocation: ["name", "url", "address", "telephone"],
  WebSite: ["name", "url"],
  FAQPage: ["mainEntity"],
  BreadcrumbList: ["itemListElement"],
  ItemList: ["itemListElement"],
  Product: ["name", "image", "offers"],
  Offer: ["price", "priceCurrency", "availability"],
  Event: ["name", "startDate", "location"],
  SportsEvent: ["name", "startDate", "location"],
};

function checkNode(page, node, path) {
  const type = node["@type"];
  if (!type) return fail(page, `JSON-LD ${path}: missing @type`);
  for (const field of REQUIRED[type] ?? []) {
    if (node[field] === undefined || node[field] === "" || (Array.isArray(node[field]) && !node[field].length)) {
      fail(page, `JSON-LD ${type}: missing "${field}"`);
    }
  }
  if (type === "FAQPage") {
    for (const q of node.mainEntity ?? []) if (!q.name || !q.acceptedAnswer?.text) fail(page, "JSON-LD FAQPage: question without name/answer");
  }
  if (type === "BreadcrumbList") {
    node.itemListElement?.forEach((item, i) => {
      if (item.position !== i + 1 || !item.name || !String(item.item ?? "").startsWith("https://")) fail(page, `JSON-LD BreadcrumbList item ${i + 1} invalid`);
    });
  }
  if ((type === "Event" || type === "SportsEvent") && !node.location?.address) fail(page, `JSON-LD ${type}: location without address`);
  if ((type === "Event" || type === "SportsEvent") && Number.isNaN(Date.parse(node.startDate))) fail(page, `JSON-LD ${type}: invalid startDate`);
  for (const [key, value] of Object.entries(node)) {
    if (key === "image" || key === "url" || key === "logo" || key === "item") {
      for (const v of [value].flat()) if (typeof v === "string" && !v.startsWith("https://")) fail(page, `JSON-LD ${type}.${key} is not an absolute https URL: ${v}`);
    }
    if (value && typeof value === "object") {
      for (const child of [value].flat()) if (child && typeof child === "object" && child["@type"]) checkNode(page, child, `${path}.${key}`);
    }
  }
  if (type === "ItemList") for (const li of node.itemListElement ?? []) if (li.item) checkNode(page, li.item, `${path}.item`);
}

async function main() {
  const server = urlArg ? { base: urlArg.replace(/\/$/, ""), stop: () => {} } : await startServer();
  const base = server.base;
  const local = !urlArg;
  const toBase = (u) => u.replace(SITE, base);
  const get = (path, init = {}) => fetch(base + path, { redirect: "manual", ...init, headers: { "user-agent": UA, ...init.headers } });
  console.log(`SEO check on ${base}${local ? " (local production build)" : ""}\n`);

  // Site-wide files
  const robots = await (await get("/robots.txt")).text();
  if (!robots.includes(`Sitemap: ${SITE}/sitemap.xml`)) fail("/robots.txt", "no absolute Sitemap line");
  if (/^Disallow:\s*\/\s*$/m.test(robots)) fail("/robots.txt", "blocks the whole site (preview build?)");
  const llms = await get("/llms.txt");
  if (llms.status !== 200 || !(await llms.text()).startsWith("# ")) fail("/llms.txt", `missing or not markdown (status ${llms.status})`);
  const notFound = await get(`/seo-check-404-${Date.now()}`);
  if (notFound.status !== 404) fail("404", `unknown URL returns ${notFound.status}, not 404`);

  const sitemap = await (await get("/sitemap.xml")).text();
  const urls = all(sitemap, /<loc>([^<]+)<\/loc>/g).map((m) => m[1]);
  if (!urls.length) fail("/sitemap.xml", "no URLs");

  const titles = new Map();
  const descriptions = new Map();
  for (const url of urls) {
    const path = new URL(url).pathname;
    const page = path;
    const res = await get(path);
    if (res.status !== 200) {
      fail(page, `status ${res.status}`);
      continue;
    }
    if (!local && /noindex/i.test(res.headers.get("x-robots-tag") ?? "")) fail(page, "X-Robots-Tag: noindex on the production host");
    const html = await res.text();
    const [head, body = ""] = html.split(/<body[^>]*>/i);
    const m = metas(head);
    const meta = (k) => m.filter(([key]) => key === k).map(([, v]) => v);

    if (!/<html[^>]*\slang="fr/i.test(html)) fail(page, '<html lang="fr"> missing');

    const t = all(head, /<title>([^<]*)<\/title>/g).map((x) => decode(x[1]));
    if (t.length !== 1) fail(page, `${t.length} <title> tags`);
    else {
      if (t[0].length < 30 || t[0].length > 65) warn(page, `title is ${t[0].length} chars (aim 50–60): "${t[0]}"`);
      if (titles.has(t[0])) fail(page, `duplicate title with ${titles.get(t[0])}`);
      titles.set(t[0], page);
    }
    const d = meta("description");
    if (d.length !== 1) fail(page, `${d.length} meta descriptions`);
    else {
      if (d[0].length < 110 || d[0].length > 170) warn(page, `description is ${d[0].length} chars (aim 140–160)`);
      if (descriptions.has(d[0])) fail(page, `duplicate description with ${descriptions.get(d[0])}`);
      descriptions.set(d[0], page);
    }

    const canon = all(head, /<link rel="canonical" href="([^"]+)"/g).map((x) => x[1]);
    if (canon.length !== 1) fail(page, `${canon.length} canonical tags`);
    else if (canon[0] !== url) fail(page, `canonical ${canon[0]} ≠ sitemap URL ${url}`);
    if (meta("robots").some((v) => /noindex/i.test(v))) fail(page, "meta robots noindex on an indexable page");

    const visible = body.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<dialog[\s\S]*?<\/dialog>/gi, "");
    const headings = all(visible, /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi).map((x) => [Number(x[1]), x[2].replace(/<[^>]+>/g, "").trim()]);
    const h1 = headings.filter(([l]) => l === 1);
    if (h1.length !== 1) fail(page, `${h1.length} <h1> elements`);
    else if (!h1[0][1]) fail(page, "empty <h1>");
    headings.forEach(([l], i) => {
      if (i > 0 && l > headings[i - 1][0] + 1) fail(page, `heading jumps h${headings[i - 1][0]} → h${l} ("${headings[i][1].slice(0, 30)}")`);
    });
    for (const [img] of visible.matchAll(/<img\b[^>]*>/gi)) if (!/\salt="/i.test(img)) fail(page, `<img> without alt: ${img.slice(0, 80)}`);

    // Social tags
    for (const k of ["og:title", "og:description", "og:url", "og:type", "og:locale", "og:site_name", "og:image", "og:image:width", "og:image:height", "og:image:alt", "twitter:card", "twitter:image"]) {
      if (!meta(k).length) fail(page, `missing ${k}`);
    }
    if (meta("og:url")[0] && meta("og:url")[0] !== url) fail(page, `og:url ${meta("og:url")[0]} ≠ ${url}`);
    if (meta("twitter:card")[0] && meta("twitter:card")[0] !== "summary_large_image") fail(page, "twitter:card is not summary_large_image");
    const firstImageTag = m.find(([k]) => k.startsWith("og:image"))?.[0];
    if (firstImageTag && firstImageTag !== "og:image") fail(page, `${firstImageTag} comes before og:image (Facebook then shows no image)`);
    const ogImage = meta("og:image")[0];
    if (ogImage) {
      if (!ogImage.startsWith("https://")) fail(page, `og:image is not absolute https: ${ogImage}`);
      const img = await fetch(toBase(ogImage), { headers: { "user-agent": "facebookexternalhit/1.1" } });
      const bytes = (await img.arrayBuffer()).byteLength;
      if (img.status !== 200 || !(img.headers.get("content-type") ?? "").startsWith("image/")) fail(page, `og:image ${ogImage} → ${img.status} ${img.headers.get("content-type")}`);
      else if (bytes > 300 * 1024) fail(page, `og:image is ${Math.round(bytes / 1024)} KB (max 300 KB)`);
    }

    // Structured data
    const blocks = all(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
    const types = [];
    for (const [, json] of blocks) {
      let data;
      try {
        data = JSON.parse(json);
      } catch {
        fail(page, "JSON-LD does not parse");
        continue;
      }
      for (const node of data["@graph"] ?? [data].flat()) {
        types.push(node["@type"]);
        checkNode(page, node, node["@type"]);
      }
    }
    if (path !== "/" && !types.includes("BreadcrumbList")) fail(page, "no BreadcrumbList");
    console.log(`  ${errors.some((e) => e.startsWith(page + ":")) ? "✗" : "✓"} ${page.padEnd(17)} ${t[0] ?? ""}  [${[...new Set(types)].join(", ")}]`);
  }

  server.stop();
  if (warnings.length) console.log(`\nWarnings (${warnings.length}):\n  ${warnings.join("\n  ")}`);
  console.log(errors.length ? `\n✗ ${errors.length} SEO error(s):\n  ${errors.join("\n  ")}` : `\n✓ SEO check passed (${urls.length} pages)`);
  process.exit(errors.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
