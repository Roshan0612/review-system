import test from 'node:test';
import assert from 'node:assert/strict';
import {
  inputSchema,
  googleReviewUrl,
  positiveOptions,
  negativeOptions,
  options,
  productOptions,
} from './reviews';
import {
  countWords,
  chooseStructure,
  chooseWordRange,
  draftSimilarity,
  eligibleWordRanges,
  findExactDraft,
  findSimilarDraft,
  hashDraft,
  isValidSentenceStructure,
  isValidWordCount,
  normalizeDraft,
  sampleInfluences,
  structureSignature,
  wordRangeKey,
  wordRanges,
  writingInfluences,
} from './draft-writing';
import { GroqApiError, requestGroqReview } from './groq';
import { POST } from '../app/api/review/route';
import { NextRequest } from 'next/server';

const valid = {
  products: ['Shirt', 'Wallet'],
  selected: ['Premium quality', "Didn't find my size"],
  notes: '',
  language: 'English',
};

test('preserves the existing twelve experience choices', () => {
  assert.equal(positiveOptions.length, 10);
  assert.equal(negativeOptions.length, 2);
  assert.deepEqual(options.slice(-2), ["Didn't find my size", 'Limited choices']);
});
test('offers optional products without selecting any by default', () => {
  assert.deepEqual(productOptions, ['Shirt', 'T-shirt', 'Pants/Jeans', 'Track pants', 'Belt', 'Wallet', 'Perfume', 'Other']);
  assert.deepEqual(inputSchema.parse({ ...valid, products: [] }).products, []);
  assert.deepEqual(inputSchema.parse({ ...valid, products: ['Shirt', 'Wallet'] }).products, ['Shirt', 'Wallet']);
});
test('links directly to The Brand Store Google review form', () =>
  assert.equal(googleReviewUrl, 'https://search.google.com/local/writereview?placeid=ChIJx9ySLgCr5zsRkc6s6Nbdd2g'));
test('accepts six and rejects seven experience selections', () => {
  assert.equal(inputSchema.safeParse({ ...valid, selected: options.slice(0, 6) }).success, true);
  assert.equal(inputSchema.safeParse({ ...valid, selected: options.slice(0, 7) }).success, false);
});
test('rejects invented or duplicate products and experience selections', () => {
  for (const value of [
    { ...valid, products: ['Shoes'] },
    { ...valid, products: ['Shirt', 'Shirt'] },
    { ...valid, selected: ['Best in India'] },
    { ...valid, selected: ['Premium quality', 'Premium quality'] },
  ]) assert.equal(inputSchema.safeParse(value).success, false);
});
test('requires a selected experience even when products or notes are supplied', () => {
  for (const value of [
    { ...valid, selected: [], products: [], notes: '' },
    { ...valid, selected: [], products: ['Shirt'], notes: '' },
    { ...valid, selected: [], products: [], notes: 'Helpful service.' },
  ]) assert.equal(inputSchema.safeParse(value).success, false);
});
test('preserves negative-only selections and optional notes', () => {
  assert.equal(inputSchema.safeParse({ ...valid, selected: [...negativeOptions] }).success, true);
  assert.equal(inputSchema.safeParse({ ...valid, notes: 'Please improve delivery.' }).success, true);
});
test('limits note length', () =>
  assert.equal(inputSchema.safeParse({ ...valid, notes: 'x'.repeat(501) }).success, false));
test('samples five distinct entries from the complete server-side influence pool', () => {
  const sample = sampleInfluences();
  assert.equal(writingInfluences.length, 37);
  assert.equal(sample.length, 5);
  assert.equal(new Set(sample).size, 5);
  assert.ok(sample.every((influence) => (writingInfluences as readonly string[]).includes(influence)));
});
test('defines exact target ranges and narrows ranges for sparse input', () => {
  assert.deepEqual(wordRanges, [[25, 28], [29, 31], [33, 35], [36, 39], [41, 43], [44, 47], [48, 52], [53, 58], [59, 65]]);
  assert.deepEqual(eligibleWordRanges(1), [[25, 28], [29, 31]]);
  assert.deepEqual(eligibleWordRanges(3), [[25, 28], [29, 31], [33, 35]]);
  assert.deepEqual(eligibleWordRanges(6), [...wordRanges]);
});
test('randomly chooses an eligible range and varies structures between attempts', () => {
  const eligible = eligibleWordRanges(6);
  const firstRange = chooseWordRange(eligible);
  const secondRange = chooseWordRange(eligible, [wordRangeKey(firstRange)]);
  assert.ok(eligible.includes(firstRange));
  assert.ok(eligible.includes(secondRange));
  assert.notDeepEqual(firstRange, secondRange);

  const firstStructure = chooseStructure(['Shirt'], ['Premium quality']);
  const secondStructure = chooseStructure(['Shirt'], ['Premium quality'], [structureSignature(firstStructure)]);
  assert.equal(firstStructure.sentenceCount >= 1 && firstStructure.sentenceCount <= 3, true);
  assert.notEqual(structureSignature(firstStructure), structureSignature(secondStructure));
});
test('validates the global word boundary while allowing shorter accurate drafts', () => {
  const inRange = Array.from({ length: 26 }, (_, index) => `word${index}`).join(' ');
  const outsideTarget = Array.from({ length: 30 }, (_, index) => `word${index}`).join(' ');
  const short = Array.from({ length: 16 }, (_, index) => `word${index}`).join(' ');
  const tooShort = Array.from({ length: 7 }, (_, index) => `word${index}`).join(' ');
  const tooLong = Array.from({ length: 66 }, (_, index) => `word${index}`).join(' ');
  assert.equal(countWords(inRange), 26);
  assert.equal(isValidWordCount(inRange), true);
  assert.equal(isValidWordCount(outsideTarget), true);
  assert.equal(isValidWordCount(short), true);
  assert.equal(isValidWordCount(tooShort), false);
  assert.equal(isValidWordCount(tooLong), false);
});
test('validates one paragraph containing one to three sentences', () => {
  assert.equal(isValidSentenceStructure('Soft fabric felt comfortable.'), true);
  assert.equal(isValidSentenceStructure('Soft fabric felt comfortable. Helpful staff.'), true);
  assert.equal(isValidSentenceStructure('Soft fabric felt comfortable. Helpful staff. Great value.'), true);
  assert.equal(isValidSentenceStructure('Soft fabric felt comfortable. Helpful staff. Great value. More details.'), false);
  assert.equal(isValidSentenceStructure('Soft fabric felt comfortable.\nHelpful staff.'), false);
});
test('normalises punctuation and detects repetitive wording', () => {
  assert.equal(normalizeDraft(' GREAT,   QUALITY!! '), 'great quality');
  assert.equal(hashDraft('Great quality!'), hashDraft(' GREAT, quality. '));
  assert.ok(draftSimilarity('The fit was comfortable and the quality felt premium.', 'The quality felt premium, and the fit was comfortable.') >= 0.78);
  assert.equal(
    findSimilarDraft(
      [{ text: 'The fit was comfortable and the quality felt premium.' }],
      'The quality felt premium, and the fit was comfortable.',
      0.88,
    ),
    undefined,
  );
  const recent = [{ text: 'Great quality!' }, { text: 'Very helpful service.' }];
  assert.equal(findExactDraft(recent, ' GREAT, quality. ')?.text, 'Great quality!');
  assert.equal(findSimilarDraft(recent, 'Great quality!')?.text, 'Great quality!');
  assert.equal(findExactDraft(recent, 'Value for money'), undefined);
});

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
test('API rejects missing experience selections before calling a provider', async () =>
  assert.equal((await POST(request({ ...valid, selected: [], products: ['Shirt'] }))).status, 400));
test('returns configuration errors when no Groq key or persistent database is configured', async () => {
  const previousKey = process.env.GROQ_API_KEY;
  const previousDatabase = process.env.DATABASE_URL;
  delete process.env.GROQ_API_KEY;
  try {
    assert.equal((await POST(request(valid))).status, 503);
    process.env.GROQ_API_KEY = 'test-api-key';
    delete process.env.DATABASE_URL;
    const response = await POST(request(valid));
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /DATABASE_URL/);
  } finally {
    if (previousKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = previousKey;
    if (previousDatabase === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabase;
  }
});
test('surfaces Groq API failures', async () => {
  await assert.rejects(
    requestGroqReview('test-key', [{ role: 'user', content: 'draft' }], async () =>
      new Response(JSON.stringify({
        error: { message: 'The requested model is unavailable.', code: 'model_not_found' },
      }), { status: 404 }),
    ),
    (error: unknown) =>
      error instanceof GroqApiError
      && error.status === 404
      && error.code === 'model_not_found'
      && /model is unavailable/.test(error.message),
  );
});
