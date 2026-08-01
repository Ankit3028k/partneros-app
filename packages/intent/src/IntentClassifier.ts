import { Result, createLogger } from '@partneros/core';
import type { IntentType, IntentResult } from '@partneros/shared';

const logger = createLogger({ prefix: 'IntentClassifier' });

const GREETING_PATTERNS = [
  /^(hi|hello|hey|hii|hiii|helloo)\b/i,
  /^(namaste|namaskar|pranam)\b/i,
  /^(good\s*(morning|afternoon|evening))\b/i,
  /^(kya\s*(scene|haal|bat|baat))\b/i,
  /\b(hello\s+kese\s+ho|kaise\s+ho|kese\s+ho)\b/i,
  /\b(sab\s*(thik|theek|badhiya|achha))\b/i,
  /\b(kya\s+hal)\b/i,
];

const FAREWELL_PATTERNS = [
  /^(bye|goodbye|see\s+ya|tata|alvida)\b/i,
  /^(phir\s+milenge|phir\s+milte|kal\s+bat|kal\s+bate)\b/i,
  /\b(good\s*night|sweet\s+dreams)\b/i,
];

const IDENTITY_PATTERNS = [
  /\b(tum|aap|tu)\s*kaun\b/i,
  /\b(tum|aap|tu)\s*kis/i,
  /\b(what\s+is\s+your\s+name|who\s+are\s+you|naam\s+kya|kaun\s+ho)\b/i,
  /\b(tum|aap)\s*(kya|kaa)\s*kar\s*(sakte|sakta|sakti|sakte\s*ho|ho)\b/i,
  /\b(apna|tumhara|tera)\s*parichay/i,
  /\b(kaun\s+saa\s+ho|kaun\s+si\s+ho)\b/i,
  /\btell\s+me\s+about\s+yourself\b/i,
];

const HINGLISH_WORDS = ['kya', 'kaun', 'kaha', 'kahan', 'kaise', 'kese', 'kyu', 'kyun', 'ho', 'hai', 'hain', 'hu', 'hoon', 'tum', 'aap', 'tu', 'mera', 'tera', 'apna', 'naam', 'thik', 'theek', 'achha', 'accha', 'badhiya', 'sab', 'kuch', 'nahi', 'haan', 'haha', 'arre', 'arey', 'bole', 'bol', 'bolo', 'bolti', 'rehti', 'rahti', 'rehta', 'rahta', 'sakta', 'sakti', 'sakte', 'bat', 'baat', 'scene', 'chal', 'chalo'];

function detectLanguage(text: string): 'hi' | 'hinglish' | 'en' {
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  const words = text.toLowerCase().split(/\s+/);
  const hinglishCount = words.filter((w) => HINGLISH_WORDS.includes(w)).length;
  if (hinglishCount >= 2) return 'hinglish';
  return 'en';
}

function matchPattern(text: string, patterns: RegExp[]): number {
  let max = 0;
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      max = Math.max(max, (match[0].length / text.length) * (1 - match.index! / text.length));
    }
  }
  return max;
}

export class IntentClassifier {
  async classify(text: string): Promise<Result<IntentResult>> {
    try {
      const lang = detectLanguage(text);
      const lower = text.toLowerCase().trim();

      let type: IntentType = 'UNKNOWN';
      let confidence = 0;

      const greetingScore = matchPattern(lower, GREETING_PATTERNS);
      if (greetingScore > 0.2) { type = 'GREETING'; confidence = greetingScore; }

      const farewellScore = matchPattern(lower, FAREWELL_PATTERNS);
      if (farewellScore > 0.2 && farewellScore > confidence) { type = 'FAREWELL'; confidence = farewellScore; }

      const identityScore = matchPattern(lower, IDENTITY_PATTERNS);
      if (identityScore > 0.2 && identityScore > confidence) { type = 'IDENTITY'; confidence = identityScore; }

      const isQuestion = /\?$/.test(text) || /\b(kya|what|how|why|when|where|kaise|kese|kyu|kyun)\b/i.test(text);
      const isKnowledge = /\b(how\s+to|what\s+is|react|typescript|javascript|hook|function|component|style|navigation|mmkv|sqlite|zustand|git)\b/i.test(text);

      if (isQuestion && isKnowledge) { type = 'KNOWLEDGE_QUERY'; confidence = Math.max(confidence + 0.1, 0.6); }

      if (confidence < 0.3 && isQuestion) { type = 'SEARCH_QUERY'; confidence = 0.3; }

      return Result.ok({ type, confidence: Math.min(confidence, 1), language: lang });
    } catch (error) {
      return Result.err(error as Error);
    }
  }
}

export { detectLanguage, HINGLISH_WORDS };
