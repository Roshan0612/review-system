# The Brand Store — Review Studio

Next.js review-drafting demo. Customers can optionally select products, select up to six existing experience statements, add an optional note, and generate an editable draft with Groq. Product names are never treated as opinions. At least one experience statement is required. Customers copy the draft and submit it themselves on Google's direct review form; copying/opening does not confirm that a review was posted.

## Local setup

Add your Groq API key and a PostgreSQL connection string to `.env.local`:

```env
GROQ_API_KEY=your_groq_api_key
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
```

Use a managed PostgreSQL database for deployment. Draft history is stored in PostgreSQL, not server memory or local files. The API creates the `review_drafts` table and its indexes automatically the first time it runs.

Install dependencies and start the site:

```sh
npm ci
npm run dev
```

Open http://localhost:3000. `.env.local` is gitignored; never expose either secret with a `NEXT_PUBLIC_` variable.

## Deploy to Vercel

Import the project as a Next.js app, then add `GROQ_API_KEY` and `DATABASE_URL` to the Vercel project's server-side environment variables and deploy. `DATABASE_URL` must point to a reachable PostgreSQL database; the draft table and indexes are created automatically.

The API uses Groq's OpenAI-compatible chat completions endpoint and the `qwen/qwen3.8-27b` model. Every request samples five distinct server-side writing influences and a detail-appropriate target word range. Generated drafts are stored with the business ID, selections, exact-normalized text hash, influences, range, and timestamp. Exact duplicates are blocked per business, and recent drafts are compared for similar wording, with matching selections ranked first. On a duplicate or highly similar result, the API retries at most twice and supplies up to three matching drafts as wording to avoid. The stored items are generated drafts, not confirmed or published reviews. Randomisation cannot guarantee globally unique wording or Google acceptance.

## Google review page

The Copy & open button copies the final editable text and opens Google's direct Write a review page for The Brand Store. Customers paste and submit the review themselves.

## Checks

```sh
npm run typecheck
npm test
npm run build
```
