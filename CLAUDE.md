# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start development server (Next.js)
npm run build      # Production build
npm run start      # Start production server
npm run lint       # Lint with Biome
npm run format     # Format with Biome (writes in place)
npm run typegen    # Regenerate Sanity CMS types from schema
```

No test suite is configured.

## Architecture

This is a **Next.js 16** portfolio site using the App Router with two route groups:

- `app/(portfolio)/` — The public-facing portfolio (single-page layout)
- `app/(sanity)/studio/` — Sanity Studio CMS embedded in the app

**Data flow:** Sanity CMS → server components/actions → `PortfolioContent.tsx` → section components

**Key files:**
- [components/PortfolioContent.tsx](components/PortfolioContent.tsx) — root client component that assembles all portfolio sections
- [components/sections/index.ts](components/sections/index.ts) — barrel export for all section components
- [app/actions/](app/actions/) — Next.js server actions (contact form, draft mode, ChatKit session)
- [sanity/](sanity/) — CMS schema definitions; run `typegen` after schema changes
- [lib/config.ts](lib/config.ts) — OpenAI ChatKit configuration

**UI stack:**
- Tailwind CSS v4 — theme defined in [app/globals.css](app/globals.css) via CSS custom properties (oklch color space), no separate tailwind config file
- shadcn/ui (Radix Nova style) — components in [components/ui/](components/ui/)
- Framer Motion — used for animations in section components
- `cn()` from [lib/utils.ts](lib/utils.ts) — standard Tailwind class merging utility

**External services:**
- Sanity — content management; image URLs use the Sanity CDN (configured in next.config.ts)
- Clerk — authentication
- OpenAI ChatKit — AI chat feature via server action `create-session.ts`
