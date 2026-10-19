export type GroqMessage = { role: 'system' | 'user'; content: string };

export class GroqApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
    this.name = 'GroqApiError';
  }
}

export async function requestGroqReview(
  key: string,
  messages: GroqMessage[],
  fetcher: typeof fetch = fetch,
): Promise<string> {
  const result = await fetcher('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen/qwen3.8-27b',
      temperature: 1,
      max_tokens: 300,
      messages,
    }),
    signal: AbortSignal.timeout(45000),
    cache: 'no-store',
  });

  if (!result.ok) {
    const errorBody: { error?: { code?: string; message?: string } } = await result.json();
    throw new GroqApiError(errorBody.error?.message || 'The Groq request failed.', result.status, errorBody.error?.code);
  }

  const data: { choices?: { message?: { content?: string | null } }[] } = await result.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}
