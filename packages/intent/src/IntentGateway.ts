import { Result, createLogger, eventBus } from '@partneros/core';
import type { IntentResult } from '@partneros/shared';
import { IntentClassifier } from './IntentClassifier';
import { ConversationHandler } from './ConversationHandler';

const logger = createLogger({ prefix: 'IntentGateway' });

const SMALL_TALK_PATTERNS = [
  /\b(thanks|thank\s*you|dhanyavaad|shukriya)\b/i,
  /\b(ok|okay|theek|thik|achha|accha)\b/i,
  /\b(mast|maza|maja|mazaa|awesome|nice|wow)\b/i,
  /\b(haan|hmm|ummm|acha|accha)\b/i,
];

export class IntentGateway {
  private classifier: IntentClassifier;
  private conversation: ConversationHandler;

  constructor(classifier?: IntentClassifier, conversation?: ConversationHandler) {
    this.classifier = classifier ?? new IntentClassifier();
    this.conversation = conversation ?? new ConversationHandler();
  }

  setGender(g: 'male' | 'female'): void {
    this.conversation.setGender(g);
  }

  async process(text: string): Promise<Result<{ intent: IntentResult; response: string; handledLocally: boolean }>> {
    const intentResult = await this.classifier.classify(text);
    if (!intentResult.ok) return Result.err(intentResult.error);

    const intent = intentResult.value;

    const isSmallTalk = SMALL_TALK_PATTERNS.some((p) => p.test(text));
    if (isSmallTalk && intent.type === 'UNKNOWN') {
      intent.type = 'SMALL_TALK';
      intent.confidence = 0.4;
    }

    const localTypes: Set<string> = new Set(['GREETING', 'FAREWELL', 'IDENTITY', 'SMALL_TALK']);
    const handledLocally = localTypes.has(intent.type);

    let response = '';
    if (handledLocally) {
      response = await this.conversation.respond(intent);
      logger.info('Local response', { intent: intent.type, response: response.substring(0, 50) });
    }

    await eventBus.emit('intent:processed', { text, intent, handledLocally });

    return Result.ok({ intent, response, handledLocally });
  }
}
