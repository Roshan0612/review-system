import test from 'node:test';
import assert from 'node:assert/strict';
import { inputSchema, basicDraft, positiveOptions, negativeOptions, options } from './reviews';
import { POST } from '../app/api/review/route';
import { NextRequest } from 'next/server';

const valid = { selected: ['Premium quality', "Didn't find my size"], notes: '', language: 'English' };

test('twelve choices: ten positive and two negative at the end', () => {
  assert.equal(positiveOptions.length, 10);
  assert.equal(negativeOptions.length, 2);
  assert.deepEqual(options.slice(-2), ["Didn't find my size", 'Limited choices']);
});
test('preserves mixed feedback', () =>
  assert.equal(basicDraft(valid.selected, ''), "The quality felt premium. I couldn't find my size."));
test('accepts six and rejects seven selections', () => {
  assert.equal(inputSchema.safeParse({ ...valid, selected: options.slice(0, 6) }).success, true);
  assert.equal(inputSchema.safeParse({ ...valid, selected: options.slice(0, 7) }).success, false);
});
test('rejects duplicate or invented selections', () => {
  for (const selected of [['Best in India'], ['Premium quality', 'Premium quality']]) {
    assert.equal(inputSchema.safeParse({ ...valid, selected }).success, false);
  }
});
test('requires input and accepts notes-only', () => {
  assert.equal(inputSchema.safeParse({ ...valid, selected: [], notes: '  ' }).success, false);
  assert.equal(inputSchema.safeParse({ ...valid, selected: [], notes: 'Please improve delivery.' }).success, true);
});
test('negative-only feedback is accepted', () =>
  assert.equal(inputSchema.safeParse({ ...valid, selected: [...negativeOptions] }).success, true));
test('limits note length', () =>
  assert.equal(inputSchema.safeParse({ ...valid, notes: 'x'.repeat(501) }).success, false));

function request(body: unknown, origin = 'https://shop.example') {
  return new NextRequest('https://shop.example/api/review', {
    method: 'POST',
    headers: { origin, host: 'shop.example', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('rejects cross-origin and malformed origins', async () => {
  for (const origin of ['https://other.example', 'invalid']) {
    assert.equal((await POST(request(valid, origin))).status, 403);
  }
});
test('API rejects over six choices before provider call', async () =>
  assert.equal((await POST(request({ ...valid, selected: options.slice(0, 7) }))).status, 400));
test('returns fallback without a Groq key', async () => {
  const previous = process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY;
  try {
    const res = await POST(request(valid));
    assert.equal(res.status, 503);
    assert.equal((await res.json()).fallback, true);
  } finally {
    if (previous === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = previous;
  }
});
test('sends selected experience and previous draft to Groq', async () => {
  const previousKey = process.env.GROQ_API_KEY;
  const originalFetch = globalThis.fetch;
  try {
    process.env.GROQ_API_KEY = 'test-api-key';
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'https://api.groq.com/openai/v1/chat/completions');
      assert.equal((options?.headers as Record<string, string>).Authorization, 'Bearer test-api-key');
      const body = JSON.parse(String(options?.body));
      assert.equal(body.model, 'qwen/qwen3.8-27b');
      assert.equal(body.messages[1].content.includes('Premium quality'), true);
      assert.equal(body.messages[1].content.includes('The quality felt premium.'), true);
      return new Response(JSON.stringify({
        choices: [{ message: { content: 'The quality felt premium, and I could not find my size.' } }],
      }), { status: 200 });
    };

    const res = await POST(request({ ...valid, previous: 'The quality felt premium.' }));
    assert.equal(res.status, 200);
    assert.equal((await res.json()).review, 'The quality felt premium, and I could not find my size.');
  } finally {
    globalThis.fetch = originalFetch;
    if (previousKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = previousKey;
  }
});
test('returns the Groq provider error message for failed requests', async () => {
  const previousKey = process.env.GROQ_API_KEY;
  const originalFetch = globalThis.fetch;
  try {
    process.env.GROQ_API_KEY = 'test-api-key';
    globalThis.fetch = async () => new Response(JSON.stringify({
      error: { message: 'The requested model is unavailable.', code: 'model_not_found' },
    }), { status: 404 });

    const res = await POST(request(valid));
    assert.equal(res.status, 502);
    assert.match((await res.json()).error, /model is unavailable/);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = previousKey;
  }
});
test('does not return the exact previous draft again', async () => {
  const previousKey = process.env.GROQ_API_KEY;
  const originalFetch = globalThis.fetch;
  try {
    process.env.GROQ_API_KEY = 'test-api-key';
    globalThis.fetch = async () => new Response(JSON.stringify({
      choices: [{ message: { content: 'The quality felt premium.' } }],
    }), { status: 200 });

    const res = await POST(request({ ...valid, previous: 'The quality felt premium.' }));
    assert.equal(res.status, 502);
    assert.equal((await res.json()).fallback, true);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = previousKey;
  }
});
