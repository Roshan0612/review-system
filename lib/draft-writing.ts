import { createHash, randomInt } from 'node:crypto';

export const writingInfluences = [
  'Gratitude — thankful expression.',
  'Affection — warmth.',
  'Belonging — a sense of connection.',
  'Camaraderie — friendly, conversational expression.',
  'Loyalty — consistent support.',
  'Admiration — respect for quality or effort.',
  'Appreciation — recognition of worthwhile details.',
  'Elation — strong happiness.',
  'Enthusiasm — energetic interest.',
  'Amusement — lightheartedness.',
  'Anticipation — looking forward to something.',
  'Inspiration — feeling encouraged or creatively engaged.',
  'Awe — strong admiration or amazement.',
  'Satisfaction — expectations being met.',
  'Relief — ease after a difficulty.',
  'Confidence — assurance.',
  'Contentment — quiet satisfaction.',
  'Comfort — ease or pleasantness.',
  'Vindication — a choice proving worthwhile.',
  'Altruism — useful information for other shoppers.',
  'Empowerment — clear expression of personal opinion.',
  'Pride — satisfaction with a choice.',
  'Validation — feeling heard or valued.',
  'Hopefulness — a hopeful outlook.',
  'Generosity — considerate expression, without exaggeration.',
  'Duty — fair and responsible feedback.',
  'Curiosity — attention to relevant details.',
  'Ambitiousness — organised, informative expression.',
  'Clarity — straightforward communication.',
  'Nostalgia — warmth associated with a genuine past connection.',
  'Fair-mindedness — balanced expression.',
  'Pragmatism — focus on practical benefits.',
  'Vigilance — attention to limitations.',
  'Surprise — an unexpected outcome.',
  'Reassurance — a measured sense of confidence.',
  'Triumph — satisfaction after overcoming a difficulty.',
  'Optimism — a hopeful perspective.',
] as const;

export const wordRanges = [
  [25, 28],
  [29, 31],
  [33, 35],
  [36, 39],
  [41, 43],
  [44, 47],
  [48, 52],
  [53, 58],
  [59, 65],
] as const;

export type WordRange = (typeof wordRanges)[number];

export function sampleInfluences(count = 5): string[] {
  const pool = [...writingInfluences];
  const sampled: string[] = [];
  for (let i = 0; i < Math.min(count, pool.length); i++) {
    sampled.push(pool.splice(randomInt(pool.length), 1)[0]);
  }
  return sampled;
}

export function countWords(text: string): number {
  return text.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)?.length ?? 0;
}

export function isValidSentenceStructure(text: string): boolean {
  if (/\r|\n/u.test(text)) return false;
  const sentenceCount = text.match(/[.!?।]+/gu)?.length ?? 0;
  return sentenceCount >= 1 && sentenceCount <= 3;
}

export function evidenceUnits(products: string[], experiences: string[], notes: string): number {
  const noteSentences = notes.match(/[^.!?]+(?:[.!?]+|$)/gu)?.filter((part) => part.trim()).length ?? 0;
  return experiences.length + Math.ceil(products.length / 2) + Math.min(noteSentences, 2);
}

export function eligibleWordRanges(units: number): WordRange[] {
  const maxTarget = units <= 2 ? 31 : units === 3 ? 35 : units === 4 ? 43 : units === 5 ? 52 : 65;
  return wordRanges.filter((range) => range[0] <= maxTarget);
}

export function wordRangeKey(range: WordRange): string {
  return `${range[0]}-${range[1]}`;
}

export function chooseWordRange(eligible: WordRange[], excluded: string[] = []): WordRange {
  if (!eligible.length) throw new Error('At least one eligible word range is required.');
  const choices = eligible.filter((range) => !excluded.includes(wordRangeKey(range)));
  const available = choices.length ? choices : eligible;
  return available[randomInt(available.length)];
}

export function normalizeDraft(text: string): string {
  return text
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

export function hashDraft(text: string): string {
  return createHash('sha256').update(normalizeDraft(text)).digest('hex');
}

export function findExactDraft<T extends { text: string }>(drafts: T[], candidate: string): T | undefined {
  const candidateHash = hashDraft(candidate);
  return drafts.find((draft) => hashDraft(draft.text) === candidateHash);
}

export function draftSimilarity(left: string, right: string): number {
  const leftWords = normalizeDraft(left).split(' ').filter(Boolean);
  const rightWords = normalizeDraft(right).split(' ').filter(Boolean);
  if (!leftWords.length || !rightWords.length) return 0;

  const tokenDice = (leftSet: Set<string>, rightSet: Set<string>) => {
    let shared = 0;
    for (const token of leftSet) if (rightSet.has(token)) shared++;
    return (2 * shared) / (leftSet.size + rightSet.size);
  };
  const shingles = (words: string[]) => {
    const size = words.length < 4 ? 1 : 3;
    return new Set(
      Array.from({ length: Math.max(1, words.length - size + 1) }, (_, index) =>
        words.slice(index, index + size).join(' '),
      ),
    );
  };
  const leftShingles = shingles(leftWords);
  const rightShingles = shingles(rightWords);
  const phraseSimilarity = tokenDice(leftShingles, rightShingles);
  const wordSimilarity = tokenDice(new Set(leftWords), new Set(rightWords));
  return 0.65 * wordSimilarity + 0.35 * phraseSimilarity;
}

export function findSimilarDraft<T extends { text: string }>(
  drafts: T[],
  candidate: string,
  threshold = 0.78,
): T | undefined {
  return drafts.find((draft) => draftSimilarity(draft.text, candidate) >= threshold);
}

export function isValidWordCount(
  text: string,
): boolean {
  const count = countWords(text);
  return count >= 8 && count <= 65;
}

export type GenerationStructure = {
  sentenceCount: 1 | 2 | 3;
  openingOrder: 'product-first' | 'experience-first';
  firstDetail: string;
  sentenceLength: 'varied' | 'brief' | 'mixed';
  transitionStyle: 'none' | 'simple' | 'natural';
};

export function chooseStructure(
  products: string[],
  experiences: string[],
  excludedStructures: string[] = [],
): GenerationStructure {
  const openings = products.length ? ['product-first', 'experience-first'] as const : ['experience-first'] as const;
  const candidates = openings.flatMap((openingOrder) => {
    const details = [...new Set(openingOrder === 'product-first' ? products : experiences)];
    return details.flatMap((firstDetail) => ([1, 2, 3] as const).flatMap((sentenceCount) =>
      (['varied', 'brief', 'mixed'] as const).flatMap((sentenceLength) =>
        (['none', 'simple', 'natural'] as const).map((transitionStyle) => ({
          firstDetail,
          openingOrder,
          sentenceCount,
          sentenceLength,
          transitionStyle,
        })),
      ),
    ));
  });
  const available = candidates.filter((candidate) =>
    !excludedStructures.includes(structureSignature(candidate)),
  );
  return (available.length ? available : candidates)[randomInt(available.length || candidates.length)];
}

export function structureSignature(structure: GenerationStructure): string {
  return [
    structure.firstDetail,
    structure.openingOrder,
    structure.sentenceCount,
    structure.sentenceLength,
    structure.transitionStyle,
  ].join('|');
}
