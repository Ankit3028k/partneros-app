import { createLogger } from '@partneros/core';
import type { IntentResult } from '@partneros/shared';

const logger = createLogger({ prefix: 'Conversation' });

const GREETINGS = {
  en: ['Hello! How can I help you?', 'Hi there! What\'s on your mind?', 'Hey! I\'m ready to help.'],
  hi: ['Namaste! Main aapki kaise madad kar sakta hoon?', 'Pranam! Kya poochhna chahenge?'],
  hinglish: ['Hello! Kya help chahiye?', 'Hi! Batao kya scene hai?'],
};

const FAREWELLS = {
  en: ['Goodbye! Have a great day!', 'See you later! Take care.'],
  hi: ['Alvida! Achha din rahe!', 'Phir milenge! Khayal rakhna.'],
  hinglish: ['Bye bye! Apna khayal rakhna!', 'Phir milte hain!'],
};

const IDENTITIES = [
  { male: 'Main PartnerOS hoon — aapka personal AI assistant. Main aapke phone mein rehta hoon aur aapki har cheez mein madad karta hoon.' },
  { female: 'Main PartnerOS hoon — aapki personal AI assistant. Main aapke phone mein rehti hoon aur aapki har cheez mein madad karti hoon.' },
];

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

export class ConversationHandler {
  private userName?: string;
  private aiName = 'PartnerOS';
  private gender: 'male' | 'female' = 'male';

  setGender(g: 'male' | 'female'): void {
    this.gender = g;
  }

  setUserName(name: string): void {
    this.userName = name;
  }

  async respond(intent: IntentResult): Promise<string> {
    const lang = intent.language === 'hinglish' ? 'hinglish' : intent.language === 'hi' ? 'hi' : 'en';

    switch (intent.type) {
      case 'GREETING': {
        return pickRandom(GREETINGS[lang] ?? GREETINGS.en);
      }
      case 'FAREWELL': {
        return pickRandom(FAREWELLS[lang] ?? FAREWELLS.en);
      }
      case 'IDENTITY': {
        const identity = IDENTITIES[0];
        const response = this.gender === 'male' ? identity.male : identity.female;
        const greeting = lang === 'en' ? `I'm ${this.aiName},` : lang === 'hi' ? `Main ${this.aiName} hoon,` : `Main ${this.aiName} hoon,`;
        return `${greeting} ${response}`;
      }
      case 'SMALL_TALK': {
        return pickRandom([
          'Hmm, interesting! Batao aur kya?',
          'I see! Kuch aur poochna chahenge?',
          'Achha! Tell me more.',
        ]);
      }
      default:
        return '';
    }
  }
}
