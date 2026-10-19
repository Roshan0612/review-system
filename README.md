# The Brand Store — Review Studio

Next.js review-drafting demo. Customers select up to six existing options, optionally add a note, and Groq creates an editable draft based only on those details. The existing selection and review UI is unchanged. Customers copy the text themselves; Copy & open takes them to the Google review page, where they paste and submit it. Nothing is posted automatically.

## Run locally

Add your Groq API key to `.env.local`:

```env
GROQ_API_KEY=your_groq_api_key
```

Install dependencies and start the site:

```sh
npm ci
npm run dev
```

Open http://localhost:3000. `.env.local` is gitignored; never expose the key with a `NEXT_PUBLIC_` variable.

## Deploy to Vercel

Import the project as a Next.js app, then add `GROQ_API_KEY` in the Vercel project's environment variables and deploy. No database, Redis, or other service configuration is required.

The API uses Groq's OpenAI-compatible chat completions endpoint and the `qwen/qwen3.8-27b` model. A fresh variation reference is used for each request, and the previous draft is supplied when rephrasing. The API rejects an exact repeat of that immediately previous draft. Without storing draft history, uniqueness across all past reviews cannot be guaranteed.

## Google review page

The Copy & open button copies the final editable text and opens Google's direct Write a review page for The Brand Store. Customers paste and submit the review themselves.

## Checks

```sh
npm run typecheck
npm test
npm run build
```
