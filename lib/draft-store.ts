import postgres from 'postgres';

export const BUSINESS_ID = 'the-brand-store-virar';
const RECENT_DRAFT_LIMIT = 120;

export type StoredDraft = {
  id: string;
  products: string[];
  experiences: string[];
  text: string;
  influences: string[];
  wordRange: readonly [number, number];
  createdAt: string;
};

let database: ReturnType<typeof postgres> | undefined;
let schemaReady: Promise<void> | undefined;

function getDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not configured. Add a PostgreSQL connection string to enable persistent draft checking.');
  database ??= postgres(url, { max: 1, idle_timeout: 20, connect_timeout: 10, prepare: false });
  return database;
}

export async function ensureDraftStore() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const sql = getDatabase();
      await sql`
        CREATE TABLE IF NOT EXISTS review_drafts (
          id text PRIMARY KEY,
          business_id text NOT NULL,
          draft_status text NOT NULL DEFAULT 'generated' CHECK (draft_status = 'generated'),
          selected_products jsonb NOT NULL,
          selected_experiences jsonb NOT NULL,
          generated_text text NOT NULL,
          normalized_text_hash char(64) NOT NULL,
          selected_influences jsonb NOT NULL,
          length_range jsonb NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT review_drafts_business_hash_unique UNIQUE (business_id, normalized_text_hash)
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS review_drafts_business_created_idx
        ON review_drafts (business_id, created_at DESC)
      `;
    })().catch((error) => {
      schemaReady = undefined;
      throw error;
    });
  }
  await schemaReady;
}

export async function loadRecentDrafts(): Promise<StoredDraft[]> {
  const rows = await getDatabase()<{
    id: string;
    selected_products: string[];
    selected_experiences: string[];
    generated_text: string;
    selected_influences: string[];
    length_range: readonly [number, number];
    created_at: Date;
  }[]>`
    SELECT id, selected_products, selected_experiences, generated_text,
           selected_influences, length_range, created_at
    FROM review_drafts
    WHERE business_id = ${BUSINESS_ID}
    ORDER BY created_at DESC
    LIMIT ${RECENT_DRAFT_LIMIT}
  `;
  return rows.map((row) => ({
    id: row.id,
    products: row.selected_products,
    experiences: row.selected_experiences,
    text: row.generated_text,
    influences: row.selected_influences,
    wordRange: row.length_range,
    createdAt: row.created_at.toISOString(),
  }));
}

export async function saveDraft(draft: {
  id: string;
  products: string[];
  experiences: string[];
  text: string;
  normalizedHash: string;
  influences: string[];
  wordRange: readonly [number, number];
}): Promise<boolean> {
  const rows = await getDatabase()<{ id: string }[]>`
    INSERT INTO review_drafts (
      id, business_id, selected_products, selected_experiences,
      generated_text, normalized_text_hash, selected_influences, length_range
    ) VALUES (
      ${draft.id},
      ${BUSINESS_ID},
      ${getDatabase().json(draft.products)},
      ${getDatabase().json(draft.experiences)},
      ${draft.text},
      ${draft.normalizedHash},
      ${getDatabase().json(draft.influences)},
      ${getDatabase().json(draft.wordRange)}
    )
    ON CONFLICT (business_id, normalized_text_hash) DO NOTHING
    RETURNING id
  `;
  return rows.length === 1;
}
