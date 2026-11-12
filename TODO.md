# AJI TL3AB · To do

Manual tasks left after the SEO work. Before any code change goes live:
`npm run build && npm run seo:check` (fails if titles, headings, alt text,
share tags, structured data or links break).

## 0. Espace admin (Step 0) — voir docs/ADMIN-SETUP.md
- [x] Run `supabase/migrations/0007_matches_admin.sql` in Supabase (SQL Editor).
- [x] Make yourself admin (SQL in docs/ADMIN-SETUP.md), open /admin.
- [x] /admin → « Importer le Google Sheet » (once). 16 matchs, 8 terrains.
- [x] Vercel env var `MATCHES_SOURCE=supabase` → Redeploy. Site reads the database.
- [ ] Terrains: add address + Google Maps link for each pitch.

## 1. Google Search Console
- [x] Verify the site: Search Console → Add property → **Domain** → `ajitl3ab.com`.
      Copy the `google-site-verification=…` code → Namecheap → Domain List → Manage →
      **Advanced DNS** → Add New Record → **TXT**, Host `@`, Value = the code → save → Verify.
      (Fallback: URL-prefix property + HTML tag → Vercel env var `GOOGLE_SITE_VERIFICATION` → redeploy.)
- [x] Sitemaps → submit `https://www.ajitl3ab.com/sitemap.xml` (expect "Success", 8 pages).
- [x] URL Inspection → **Test live URL** → **Request indexing** for:
      `/`, `/jouer`, `/merch`, `/switch-off`, `/prepa-physique`, `/kids`, `/classement`
      (check: page available, screenshot shows content, user-declared canonical = same URL).
- [ ] Around 13–17 Nov 2026 (3–7 days after submitting): **Page indexing** (8 pages indexed; `/connexion`, `/compte`, `/r/…`,
      `/boutique` excluded is normal) and **Enhancements** (warnings OK, no red errors).
- [ ] Around 8 Dec 2026 (~28 days): **Core Web Vitals** and **HTTPS** reports; **Performance** for search queries.

## 2. Bing Webmaster Tools
- [x] https://www.bing.com/webmasters → **Import from Google Search Console**
      (or meta tag → Vercel env var `BING_SITE_VERIFICATION` → redeploy). Submit the sitemap.

## 3. Google Business Profile
- [x] Profile created: main category "Club de football" (Soccer club), service area Marrakech,
      website, WhatsApp number, description, hours (set to 24h).
- [x] Review link: https://g.page/r/CcMV2YehOOFoEBI/review (not added to the website, by choice).
- [ ] Verification: make sure it's confirmed (Google email / profile shows "Verified").
- [x] Secondary categories (Edit profile → Business category): Club de sport, Entraîneur personnel,
      École de sport, and Magasin de vêtements de sport if the jerseys should show.
- [x] Photos: logo, cover photo (match in action), matches, training, Switch Off, jerseys.
- [x] (ongoing) Share the review link in WhatsApp groups after matches + to regulars. No reward in
      exchange for reviews (not even a draw ticket). Reply to every review.
- [x] (ongoing) Posts: the week's matches / Switch Off weekends, like on Instagram.
- [x] Hours: switch from 24h to real hours if Google flags it or people expect night replies;
      add special hours for Eid / days off. (Then tell Claude, to put the same hours in the site's schema.)

## 4. Backlinks & directories
- [x] Website link in the Instagram bio.
- [x] Website link in the WhatsApp Business profile (Settings → Business tools → Profile → Website).
- [ ] List the business in Moroccan directories (e.g. Kerix, Telecontact) and on a Facebook page.
- [ ] Ask partner pitches to link to the site.
- [ ] Get mentioned in Marrakech sport / expat / tourist groups and guides.

## 5. Share previews & live checks
- [ ] Facebook Sharing Debugger (https://developers.facebook.com/tools/debug) → Debug →
      **Fetch new information / Scrape Again** for: `/`, `/merch`, `/switch-off`,
      `/prepa-physique`, `/kids`, `/classement`, `/confidentialite` (`/jouer` done ✓).
- [ ] WhatsApp: send a link in a new chat (add `?v=2` if the old preview is cached).
- [ ] Open https://www.ajitl3ab.com/jouer/og.png a few times, 10+ minutes apart → image every time.
- [ ] Check the two redirects from your computer (each: one 301/308 to `https://www.ajitl3ab.com/jouer`):
      `curl -sI http://ajitl3ab.com/jouer` and `curl -sI https://ajitl3ab.com/jouer`
- [ ] Check external links (WhatsApp, Instagram, Maps) from your computer:
      `npm run check:links -- --url https://www.ajitl3ab.com`
- [ ] Rich Results Test (https://search.google.com/test/rich-results) on `/jouer` and `/merch`:
      warnings OK, no errors.

## 6. Info to send so the structured data is complete
- [ ] Street address + postal code (or Google Business Profile address), if there is a fixed one.
- [ ] GPS coordinates of the main pitch / meeting point.
- [ ] Opening hours (if any).
- [ ] Jersey delivery cost and return policy.
- [ ] Jersey brands (Nike, Adidas, Puma…), optional.
- [ ] Usual length of a match and of a Training / Switch Off session.
- [ ] Optional: try `display: optional` on the heading font if `/merch` LCP stays above 2.5 s.

## 7. Site
- [ ] Privacy page (/confidentialite): add the business / legal name.
- [ ] Kids page (/kids): confirm the details (ages, activities, price, dates).
- [ ] Optional: "Voir le catalogue WhatsApp" button (https://wa.me/c/212714610279).

## 8. Instagram & WhatsApp
- [ ] Instagram highlight covers.
- [ ] Add a "Switch Off" item to the WhatsApp catalog.

## 9. Admin
- [ ] Decide on Vercel Pro (the Hobby plan is for non-commercial use).
- [ ] CNDP declaration (Moroccan data protection) for the accounts and signups.
- [ ] Keep an eye on Supabase free-plan usage (first limit to hit if traffic grows).
