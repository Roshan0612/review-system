# The Brand Store — Review Studio

Complete Next.js App Router / TypeScript website for The Brand Store, Virar. Includes both supplied photos as optimized local WebP assets, mobile layouts, animated selections, transitions, reduced-motion support and keyboard focus styles.

## Compact review flow

The first view shows 10 positive phrases followed by two negative options. Customers can choose up to six (enforced in the UI and API), optionally expand notes, and create a draft in the same card. The shop imagery is a slim header instead of a large hero. There is no shopping-channel question or multi-step form. Shorter screens and enlarged text may still need a little scrolling.

## Animation and feedback

Positive choices turn green and negative choices turn red, with equal selection feedback and animated checkmarks. Creation shows the selected phrases gathering around a writing card while the request runs. A short reveal introduces the editable draft; tapping it skips the reveal immediately. A successful copy has a brief confirmation before Google navigation. Reduced-motion preferences remove decorative motion and artificial delays. Non-AI creation uses the same visual sequence and remains labelled as a basic draft. The hosted preview uses labelled non-AI drafts for its Create review demo; the downloadable project calls the real xAI endpoint.

## Local setup

Install Node.js 22 LTS or newer, then open a terminal inside this folder:

```sh
npm ci
```

Copy `.env.example` to `.env.local` (PowerShell: `Copy-Item .env.example .env.local`). Then:

```sh
npm run dev
```

Visit http://localhost:3000. No key is needed for “Use my selections without AI” or “Write my own review”. The basic composer joins the selected experiences and notes exactly; it does not translate or randomize them. The language selector applies only to AI drafts.

## Vercel deployment

1. Push these extracted contents to GitHub, with package.json at the repository root.
2. Import the repository into Vercel. Choose Next.js and Node 22 or newer.
3. Use `npm run build`; keep the default framework output directory.
4. Add the environment variables below to enable AI, or deploy without them for manual/non-AI drafting.
5. Deploy. Redeploy after changing environment variables.

This is a standard Next.js source project, not a deployed service. No customer/review database is required.

## Enable Grok (xAI, not Groq)

Set these variables in `.env.local` or Vercel:

| Variable | Purpose |
| --- | --- |
| XAI_API_KEY | Your private xAI API key. Never expose with NEXT_PUBLIC. |
| XAI_MODEL | Text model ID available in your xAI account supporting Responses API. |
| UPSTASH_REDIS_REST_URL | REST URL from an Upstash Redis database. |
| UPSTASH_REDIS_REST_TOKEN | Private Redis REST token. |
| RATE_LIMIT_SALT | Long random secret for hashing network identifiers. |
| AI_DAILY_LIMIT | Global daily AI request limit, default 100. |
| AI_PER_IP_DAILY_LIMIT | Daily per-network AI request limit, default 10. |
| NEXT_PUBLIC_GOOGLE_REVIEW_URL | Official Google Business Profile review-request link. |

Generate a salt using `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

AI requests fail closed if Redis is unconfigured/unavailable. This protects spending across serverless instances. Non-AI drafting remains available. Atomic Redis reservations enforce both quotas; keys expire after two days, failed requests also count, and quotas reset by UTC date. Shared shop Wi-Fi may share one per-IP quota. Also set an account spending cap at xAI; request limits do not imply an exact currency budget. If hosting outside Vercel, adapt trusted client-IP extraction for that proxy.

The provider receives selections, notes, language and previous draft; `store:false` is requested. The server has a 45-second timeout and bounded output. Rephrasing varies wording instructions without inventing facts. There is no cross-customer draft corpus or guarantee of unique wording/Google acceptance. Do not use this for fabricated reviews, rating manipulation, or automatic posting.

## Google review navigation

The user's supplied Google search URL is the fallback. Direct composer behavior has not been verified. Before launch, replace it with the owner's Business Profile → Ask for reviews link. Test Android, iPhone, desktop, and signed-out states.

Copy & open copies the final edited text, then navigates in the same tab to avoid popup blockers. Customers still paste the text, choose stars and submit. No automatic posting or Google text prefill. HTTPS/localhost is required for clipboard access. On copying failure, the app provides a manual-copy message and separate Google link.

## File map

- app/page.tsx — single-page customer flow and copy.
- app/globals.css — design, breakpoints, animation and reduced-motion support.
- lib/reviews.ts — option groups, validation, faithful basic drafts.
- app/api/review/route.ts — private xAI integration and error handling.
- lib/limits.ts — durable rate limits.
- public/images — both supplied photographs, optimized locally.
- app/layout.tsx — metadata and noindex (intentional for a review utility).

Typography optionally loads DM Sans/Manrope through Google Fonts with system fallbacks; Georgia is used for editorial headings. No invented ratings or testimonials are included. Positive, mixed and negative experiences get the same Google submission flow.

## Checks

```sh
npm run typecheck
npm test
npm run build
```

Tests cover mixed sentiment, six-selection limits, duplicate and invalid selections, negative-only feedback, required input, note limits, cross-origin protection and missing-key behavior. Browser visual QA and live xAI requests were unavailable during creation. Before public launch, test the flow, text editing, clipboard navigation and keyboard interactions on real devices, then perform a live request with your credentials.

## Privacy

No analytics, customer login, review database or localStorage persistence. Reload clears the draft. AI inputs go to xAI; providers may process technical logs under their policies. Redis stores hashed network identifiers and counts for up to two days. The page includes privacy information. Never put personal contact details in the notes.
