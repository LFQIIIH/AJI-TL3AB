# AJI TL3AB

Site for AJI TL3AB — football match booking in Marrakech. Next.js (App Router, TypeScript) + Tailwind CSS.

## Dev

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
```

## Structure

- `app/` — pages: `/` (home), `/jouer` (match list + booking), `/kids` (academy), `/merch` (shop)
- `components/` — Navbar, Footer, MatchCard, Modal, icons
- `data/matches.ts`, `data/products.ts` — placeholder content, edit here
- `lib/config.ts` — `WHATSAPP_NUMBER`, Instagram handle, `whatsappLink()` helper
- `tailwind.config.ts` — brand colors (`night`, `chalk`, `accent`) and fonts (`font-display` = Anton, `font-sans` = Inter)

All bookings, sign-ups and orders open WhatsApp with a pre-filled message.
